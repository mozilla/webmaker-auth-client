window.WebmakerAuthClient = function(options) {
  var self = this;

  options = options || {};

  self.host = options.host || '';
  self.urls = options.urls || {
    autheticate: self.host + '/authenticate',
    create: self.host + '/create',
    verify: self.host + '/verify',
    logout: self.host + '/logout'
  };
  self.audience = options.audience || window.location.origin;
  self.prefix = options.prefix || 'webmaker-';
  self.timeout = options.timeout || 10;

  self.localStorageKey = self.prefix + 'login';

  if (!window.navigator.id) {
    console.error('No persona found. Did you include include.js?');
  }

  if (!window.localStorage) {
    console.error('Local storage must be supported for instant login.');
  }

  self.emitter = new EventEmitter();

  self.on = function(event, cb) {
    self.emitter.addListener(event, cb);
  };

  self.off = function(event, cb) {
    self.emitter.removeListener(event, cb);
  };

  self.verify = function(email) {

    var http = new XMLHttpRequest();
    var body = JSON.stringify({
      email: self.storage.get('email')
    });

    http.open('POST', self.urls.verify, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function() {
      if (http.readyState == 4 && http.status == 200) {
        var data = JSON.parse(http.responseText);
        var storedUserData = self.storage.get();

        // Email is the same as response.
        if (data.email === self.storage.get('email')) {
          self.emitter.emitEvent('login', [storedUserData]);
          self.emitter.emitEvent('verified', [storedUserData]);
        }

        // No session
        else if (data.user) {
          self.storage.set(data.user);
          self.emitter.emitEvent('login', [data.user]);
        }

        // Email is not the same, but there is user data
        else if (data.error) {
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

  function authenticate(assertion) {
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

    http.open('POST', self.url, true);
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
          self.emitter.emitEvent('login', [data.user]);
          self.emitter.emitEvent('verified', [data.user]);
        }

        // Email valid, user does not exist
        if (data.email && !data.user) {
          // TODO: SHOW UI FOR CREATE!!!!
          console.log('Need to create user');
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

  }

  self.login = function() {

    // Restore login state from local storage!
    // First, check if login exists.
    if (self.storage.get()) {
      self.emitter.emitEvent('login', [self.storage.get()]);
      self.emitter.emitEvent('restored', [self.storage.get()]);
    }

    // If it does not exist, we need to -actually- log in.
    else {
      navigator.id.get(authenticate);
    }

  };

  self.logout = function() {
    self.emitter.emitEvent('logout');
    self.storage.clear();
  };

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
