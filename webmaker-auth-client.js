(function(window) {

  function webmakerAuthClientDefinition(EventEmitter) {

    return function WebmakerAuthClient(options) {

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
      self.paths.checkUsername = options.paths.checkUsername || '/check-username';
      self.urls = {
        authenticate: self.host + self.paths.authenticate,
        create: self.host + self.paths.create,
        verify: self.host + self.paths.verify,
        logout: self.host + self.paths.logout,
        checkUsername: self.host + self.paths.checkUsername
      };
      self.audience = options.audience || window.location.origin;
      self.prefix = options.prefix || 'webmaker-';
      self.timeout = options.timeout || 10;
      self.localStorageKey = self.prefix + 'login';
      self.csrfToken = options.csrfToken;

      // Create New User Modal
      self.handleNewUserUI = options.handleNewUserUI === false ? false : true;

      // You can override any of these if necessary
      self.modal = {};
      self.modal.element = document.getElementById('webmaker-login-new-user');
      self.modal.dismissSelector = '[data-dismiss]';
      self.modal.createSelector = '.create-user';
      self.modal.createBtnOnClick = function() {};

      self.modal.checkUsernameOnChange = function() {
        var usernameTakenError = self.modal.element.querySelector('.username-taken-error');
        var usernameRequiredError = self.modal.element.querySelector('.username-required-error');
        var usernameGroup = self.modal.element.querySelector('.username-group');
        var username = this.value;
        self.checkUsername(username, function(taken) {
          if (taken) {
            usernameGroup.classList.add('has-error');
            usernameGroup.classList.remove('has-success');
            usernameTakenError.classList.remove('hidden');
          }
          else if (!username) {
            usernameGroup.classList.remove('has-success');
            usernameGroup.classList.add('has-error');
            usernameTakenError.classList.add('hidden');
            usernameRequiredError.classList.remove('hidden');
          }
          else {
            usernameGroup.classList.remove('has-error');
            usernameGroup.classList.add('has-success');
            usernameTakenError.classList.add('hidden');
            usernameRequiredError.classList.add('hidden');
          }
        });
      };

      self.modal.setup = function(assertion, email) {
        var createBtn = self.modal.element.querySelector(self.modal.createSelector);
        var closeBtns = self.modal.element.querySelectorAll(self.modal.dismissSelector);

        var usernameGroup = self.modal.element.querySelector('.username-group');
        var agreeGroup = self.modal.element.querySelector('.agree-group');

        var usernameTakenError = self.modal.element.querySelector('.username-taken-error');
        var usernameRequiredError = self.modal.element.querySelector('.username-required-error');
        var agreeError = self.modal.element.querySelector('.agree-error');

        var usernameInput = self.modal.element.querySelector('[name="username"]');
        var agreeInput = self.modal.element.querySelector('[name="agreeToTerms"]');
        var mailingListInput = self.modal.element.querySelector('[name="mailingList"]');

        createBtn.removeEventListener('click', self.modal.createBtnOnClick, false);
        usernameInput.addEventListener('change', self.modal.checkUsernameOnChange, false);

        self.modal.createBtnOnClick = function() {
          var hasError = false;

          if (!agreeInput.checked) {
            agreeGroup.classList.add('has-error');
            agreeError.classList.remove('hidden');
            hasError = true;
          }

          if (!usernameInput.value) {
            usernameGroup.classList.add('has-error');
            usernameGroup.classList.remove('has-success');
            usernameRequiredError.classList.remove('hidden');
            hasError = true;
          }

          if (hasError) {
            return;
          }

          self.checkUsername(usernameInput.value, function(taken) {
            if (taken) {
              usernameGroup.classList.add('has-error');
              usernameGroup.classList.remove('has-success');
              usernameTakenError.classList.remove('hidden');
            }
            else {
              self.createUser({
                assertion: assertion,
                user: {
                  username: usernameInput.value,
                  mailingList: mailingListInput.checked
                }
              });

              usernameTakenError.classList.add('hidden');
              usernameRequiredError.classList.add('hidden');
              agreeError.classList.add('hidden');

              usernameGroup.classList.remove('has-error');
              usernameGroup.classList.remove('has-success');
              agreeGroup.classList.remove('has-error');

              self.modal.close();
            }
          });

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

      self.checkUsername = function(username, callback) {
        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          username: username
        });

        http.open('POST', self.urls.checkUsername, true);
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function() {
          if (http.readyState == 4 && http.status == 200) {
            var response = JSON.parse(http.responseText);

            // Username exists;
            if (response.exists) {
              callback(true, 'Username taken');
            } else {
              callback(false, 'Username not taken');
            }

          }
          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            callback(false, 'Error checking username');
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.urls.checkUsername + ' is not responding...']);
            callback(false, 'Error checking username');
          }

        };

        http.send(body);

      };

      self.createUser = function(data, callback) {

        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          assertion: data.assertion,
          audience: self.audience,
          user: data.user
        });

        http.open('POST', self.urls.create, true);
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function() {
          if (http.readyState == 4 && http.status == 200) {
            var data = JSON.parse(http.responseText);

            // User creation successful
            if (data.user) {
              self.storage.set(data.user);
              self.emitter.emitEvent('login', [data.user, 'user created']);
            } else {
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

        console.log(http);

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
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);
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

            else {
              self.emitter.emitEvent('verified', false);
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

        if (!window.navigator.id) {
          console.error('No persona found. Did you include include.js?');
        }

        window.navigator.id.get(function(assertion) {
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
          http.setRequestHeader('X-CSRF-Token', self.csrfToken);
          http.onreadystatechange = function() {

            // Clear the timeout
            if (self.timeout && timeoutInstance) {
              clearTimeout(timeoutInstance);
            }

            if (http.readyState == 4 && http.status == 200) {
              var data = JSON.parse(http.responseText);

              // There was an error
              if (data.error) {
                self.emitter.emitEvent('error', [data.error]);
              }

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
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);
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
  };

  // AMD
  if (typeof define === 'function' && define.amd) {
    define(['eventEmitter/EventEmitter'], webmakerAuthClientDefinition);
  }

  // Global
  else {
    window.WebmakerAuthClient = webmakerAuthClientDefinition(window.EventEmitter);
  }

})(window);
