window.WebmakerAuthClient = function(options) {

  if (!window.navigator.id) {
    console.error('No persona found. Did you include include.js?');
  }

  if (!window.localStorage) {
    console.error('Local storage must be supported for instant login.');
  }

  var self = this;

  options = options || {};
  options.paths = options.paths || {};

  // For handling events
  self.emitter = new EventEmitter();

  // Config
  self.host = options.host || '';
  self.paths = options.paths || {};
  self.paths.authenticate = options.paths.authenticate || '/authenticate';
  self.paths.create = options.paths.create || '/create';
  self.paths.verify = options.paths.verify || '/verify';
  self.paths.logout = options.paths.logout || '/logout';
  self.urls = {
    authenticate: self.host + self.paths.authenticate,
    create: self.host + self.paths.create,
    verify: self.host + self.paths.verify,
    logout: self.host + self.paths.logout
  };
  self.audience = options.audience || window.location.origin;
  self.prefix = options.prefix || 'webmaker-';
  self.timeout = options.timeout || 10;
  self.localStorageKey = self.prefix + 'login';

  // Create New User Modal
  self.handleNewUserUI = options.handleNewUserUI === false ? false : true;

  // You can override any of these if necessary
  self.modal = {};
  self.modal.element = document.getElementById('webmaker-login-new-user');
  self.modal.dismissSelector = '[data-dismiss]';
  self.modal.createSelector = '.create-user';
  self.modal.createBtnOnClick = function(){};

  self.modal.setup = function(assertion, email) {
    var createBtn = self.modal.element.querySelector(self.modal.createSelector);
    var closeBtns = self.modal.element.querySelectorAll(self.modal.dismissSelector);
    createBtn.removeEventListener('click', self.modal.createBtnOnClick, false);
    self.modal.createBtnOnClick = function() {
      self.createUser({
        assertion: assertion,
        user: {
          username: self.modal.element.querySelector('[name="username"]').value,
          mailingList: self.modal.element.querySelector('[name="mailingList"]').value
        }
      });
      self.modal.close();
    };

    for (var i = 0; i < closeBtns.length; i++) {
      closeBtns[i].removeEventListener('click', self.modal.close, false);
      closeBtns[i].addEventListener('click', self.modal.close, false);
    }
    createBtn.addEventListener('click', self.modal.createBtnOnClick, false);
  };

  self.modal.open = function() {
    self.modal.element.classList.add('in');
    self.modal.element.style.display = 'block';
    self.modal.element.setAttribute('aria-hidden', false)
  };

  self.modal.close = function() {
    self.modal.element.classList.remove('in');
    self.modal.element.style.display = 'none';
    self.modal.element.setAttribute('aria-hidden', true);
  };

  self.on = function(event, cb) {
    self.emitter.addListener(event, cb);
  };

  self.off = function(event, cb) {
    self.emitter.removeListener(event, cb);
  };

  self.createUser = function(data, callback) {

    var http = new XMLHttpRequest();
    var body = JSON.stringify({
      assertion: data.assertion,
      user: data.user
    });

    http.open('POST', self.urls.create, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function() {
      if (http.readyState == 4 && http.status == 200) {
        var data = JSON.parse(http.responseText);

        // User creation successful
        if (data.user) {
          self.storage.set(data.user);
          self.emitter.emitEvent('login', [data.user, 'user created']);
        }

        else {
          self.emitter.emitEvent('error', [http.responseText]);
        }

      }

      // Some other error
      else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
        self.emitter.emitEvent('error', [http.responseText]);
      }

      // No response
      else if (http.readyState === 4) {
        self.emitter.emitEvent('error', ['Looks like ' + self.urls.create + ' is not responding...']);
      }

    };

    http.send(body);

  };

  self.verify = function() {

    if (self.storage.get()) {
      self.emitter.emitEvent('login', [self.storage.get(), 'restored']);
    }

    var email = self.storage.get('email');

    var http = new XMLHttpRequest();
    var body = JSON.stringify({
      email: email
    });

    http.open('POST', self.urls.verify, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function() {
      if (http.readyState == 4 && http.status == 200) {
        var data = JSON.parse(http.responseText);
        var storedUserData = self.storage.get();

        // Email is the same as response.
        if (email && data.email === email) {
          self.emitter.emitEvent('verified', [storedUserData]);
        }

        // Email is not the same, but is a cookie
        else if (data.user) {
          self.storage.set(data.user);
          self.emitter.emitEvent('login', [data.user, 'email mismatch']);
        }

        // No cookie
        else if (email && !data.user) {
          self.logout();
        }

      }

      // Some other error
      else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
        self.emitter.emitEvent('error', [http.responseText]);
      }

      // No response
      else if (http.readyState === 4) {
        self.emitter.emitEvent('error', ['Looks like ' + self.urls.verify + ' is not responding...']);
      }

    };

    http.send(body);

  }

  self.login = function() {
    navigator.id.get(function(assertion) {
      var data = {
        audience: self.audience,
        assertion: assertion
      };

      if (!assertion) {
        self.emitter.emitEvent('error', [
          'No assertion was received'
        ]);
      }

      var http = new XMLHttpRequest();
      var body = JSON.stringify({
        audience: self.audience,
        assertion: assertion
      });

      if (self.timeout) {
        var timeoutInstance = setTimeout(function() {
          self.emitter.emitEvent('error', [
            'The request for a token timed out after ' + self.timeout + ' seconds'
          ]);
        }, self.timeout * 1000);
      }

      http.open('POST', self.urls.authenticate, true);
      http.setRequestHeader('Content-type', 'application/json');
      http.onreadystatechange = function() {

        // Clear the timeout
        if (self.timeout && timeoutInstance) {
          clearTimeout(timeoutInstance);
        }

        if (http.readyState == 4 && http.status == 200) {
          var data = JSON.parse(http.responseText);

          // User exists
          if (data.user) {
            self.storage.set(data.user);
            self.emitter.emitEvent('login', [data.user, 'authenticate']);
          }

          // Email valid, user does not exist
          if (data.email && !data.user) {
            self.emitter.emitEvent('newuser', [assertion, data.email]);

            // If handleNewUserUI is true, show the modal with correct data
            if (self.handleNewUserUI) {
              self.modal.setup(assertion, data.email);
              self.modal.open();
            }
          }

          if (data.err) {
            self.emitter.emitEvent('error', [data.err]);
          }

        }

        // Some other error
        else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
          self.emitter.emitEvent('error', [http.responseText]);
        }

        // No response
        else if (http.readyState === 4) {
          self.emitter.emitEvent('error', ['Looks like ' + self.urls.authenticate + ' is not responding...']);
        }

      };

      http.send(body);

    });

  };

  self.logout = function() {
    var http = new XMLHttpRequest();
    http.open('POST', self.urls.logout, true);
    http.send(null);

    self.emitter.emitEvent('logout');
    self.storage.clear();
  };

  // Utilities for accessing local storage
  self.storage = {
    get: function(key) {
      var data = JSON.parse(localStorage.getItem(self.localStorageKey));
      if (!data) {
        return;
      }
      if (key) {
        return data[key];
      } else {
        return data;
      }
    },
    set: function(data) {
      var userObj = JSON.parse(localStorage.getItem(self.localStorageKey)) || {};
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          userObj[key] = data[key];
        }
      }
      localStorage.setItem(self.localStorageKey, JSON.stringify(userObj));
    },
    clear: function() {
      delete localStorage[self.localStorageKey];
    }
  };

};
