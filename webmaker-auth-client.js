/*global localStorage, location, define*/

(function (window) {
  var usernameRegex = /^[abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\-]{1,20}$/;

  function webmakerAuthClientDefinition(EventEmitter, cookiejs, analytics) {

    return function WebmakerAuthClient(options) {

      if (!window.localStorage) {
        console.error('Local storage must be supported for instant login.');
      }

      var self = this;

      var referralCookieSettings = {
        // grab only the first two parts of the hostname
        domain: location.hostname.split('.').slice(-2).join('.'),
        path: '/',
        // secure cookie if connection uses TLS
        secure: location.protocol === 'https:',
        // expire in one week
        expires: new Date((Date.now() + 60 * 1000 * 60 * 24 * 7))
      };
      var refValue = /ref=((?:\w|-)+)/.exec(window.location.search);
      var cookieRefValue = cookiejs.parse(document.cookie).webmakerReferral;

      if (refValue) {
        refValue = refValue[1];
      }

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
      self.paths.request = options.paths.request || '/auth/v2/request';
      self.paths.uidExists = options.paths.uidExists || '/auth/v2/uid-exists';
      self.paths.createUser = options.paths.createUser || '/auth/v2/create';
      self.paths.authenticateToken = options.paths.authenticateToken || '/auth/v2/authenticateToken';
      self.paths.verifyPassword = options.paths.verifyPassword || '/auth/v2/verify-password';
      self.paths.requestResetCode = options.paths.requestResetCode || '/auth/v2/request-reset-code';
      self.paths.removePassword = options.paths.removePassword || '/auth/v2/remove-password';
      self.paths.enablePasswords = options.paths.enablePasswords || '/auth/v2/enable-passwords';
      self.paths.resetPassword = options.paths.resetPassword || '/auth/v2/reset-password';
      self.urls = {
        request: self.host + self.paths.request,
        authenticateToken: self.host + self.paths.authenticateToken,
        authenticate: self.host + self.paths.authenticate,
        create: self.host + self.paths.create,
        createUser: self.host + self.paths.createUser,
        verify: self.host + self.paths.verify,
        logout: self.host + self.paths.logout,
        uidExists: self.host + self.paths.uidExists,
        checkUsername: self.host + self.paths.checkUsername,
        verifyPassword: self.host + self.paths.verifyPassword,
        requestResetCode: self.host + self.paths.requestResetCode,
        removePassword: self.host + self.paths.removePassword,
        enablePasswords: self.host + self.paths.enablePasswords,
        resetPassword: self.host + self.paths.resetPassword,
      };
      self.audience = options.audience || (window.location.protocol + '//' + window.location.host);
      self.prefix = options.prefix || 'webmaker-';
      self.timeout = options.timeout || 10;
      self.localStorageKey = self.prefix + 'login';
      self.csrfToken = options.csrfToken;
      // Needed when cookie-issuing server is on a different port than the client
      self.withCredentials = options.withCredentials === false ? false : true;

      // save referrer value
      if (refValue) {
        if (cookieRefValue !== refValue) {
          document.cookie = cookiejs.serialize('webmakerReferral', refValue, referralCookieSettings);
          cookieRefValue = refValue;
        }
      }

      // remove the cookie after the referrer value has been saved
      self.clearReferrerCookie = function () {
        var expireReferralCookieSettings = referralCookieSettings;
        // set this to a past date so that it is removed
        expireReferralCookieSettings.expires = new Date((Date.now() - 10000));
        document.cookie = cookiejs.serialize('webmakerReferral', 'expire', expireReferralCookieSettings);
      };

      // Create New User Modal
      self.handleNewUserUI = options.handleNewUserUI === false ? false : true;

      // This is a separate function because Angular apps use their own modal
      self.analytics = {};
      self.analytics.webmakerNewUserCancelled = function () {
        analytics.event('Webmaker New User Cancelled');
      };

      // You can override any of these if necessary
      self.modal = {};
      self.modal.element = document.getElementById('webmaker-login-new-user');
      self.modal.dismissSelector = '[data-dismiss]';
      self.modal.createSelector = '.create-user';
      self.modal.createBtnOnClick = function () {};

      self.modal.checkUsernameOnChange = function () {
        var usernameTakenError = self.modal.element.querySelector('.username-taken-error');
        var usernameInvalidError = self.modal.element.querySelector('.username-invalid-error');
        var usernameRequiredError = self.modal.element.querySelector('.username-required-error');
        var usernameGroup = self.modal.element.querySelector('.username-group');
        var username = this.value;
        if (!username) {
          usernameGroup.classList.remove('has-success');
          usernameGroup.classList.add('has-error');
          usernameTakenError.classList.add('hidden');
          usernameRequiredError.classList.remove('hidden');
          usernameInvalidError.classList.add('hidden');
          return;
        }
        self.checkUsername(username, function (error, message) {
          if (error && message === 'Username taken') {
            usernameGroup.classList.add('has-error');
            usernameGroup.classList.remove('has-success');
            usernameTakenError.classList.remove('hidden');
            usernameRequiredError.classList.add('hidden');
            usernameInvalidError.classList.add('hidden');
          } else if (error && message === 'Username invalid') {
            usernameGroup.classList.add('has-error');
            usernameGroup.classList.remove('has-success');
            usernameInvalidError.classList.remove('hidden');
            usernameTakenError.classList.add('hidden');
            usernameRequiredError.classList.add('hidden');
          } else {
            usernameGroup.classList.remove('has-error');
            usernameGroup.classList.add('has-success');
            usernameTakenError.classList.add('hidden');
            usernameRequiredError.classList.add('hidden');
            usernameInvalidError.classList.add('hidden');
          }
        });
      };

      self.modal.setup = function (assertion, email) {
        var createBtn = self.modal.element.querySelector(self.modal.createSelector);
        var closeBtns = self.modal.element.querySelectorAll(self.modal.dismissSelector);

        var usernameGroup = self.modal.element.querySelector('.username-group');
        var agreeGroup = self.modal.element.querySelector('.agree-group');

        var usernameTakenError = self.modal.element.querySelector('.username-taken-error');
        var usernameRequiredError = self.modal.element.querySelector('.username-required-error');
        var usernameInvalidError = self.modal.element.querySelector('.username-invalid-error');
        var agreeError = self.modal.element.querySelector('.agree-error');

        var usernameInput = self.modal.element.querySelector('[name="username"]');
        var agreeInput = self.modal.element.querySelector('[name="agreeToTerms"]');
        var mailingListInput = self.modal.element.querySelector('[name="mailingList"]');
        var languagePreference = self.modal.element.querySelector('[name=supportedLocales]');

        createBtn.removeEventListener('click', self.modal.createBtnOnClick, false);
        usernameInput.addEventListener('change', self.modal.checkUsernameOnChange, false);

        self.modal.createBtnOnClick = function () {
          var hasError = false;

          if (!agreeInput.checked) {
            agreeGroup.classList.add('has-error');
            agreeError.classList.remove('hidden');
            hasError = true;
          }

          if (!usernameInput.value) {
            usernameGroup.classList.remove('has-success');
            usernameGroup.classList.add('has-error');
            usernameTakenError.classList.add('hidden');
            usernameRequiredError.classList.remove('hidden');
            usernameInvalidError.classList.add('hidden');
            hasError = true;
          }

          if (hasError) {
            return;
          }

          self.checkUsername(usernameInput.value, function (error, message) {
            if (error && message === 'Username taken') {
              usernameGroup.classList.add('has-error');
              usernameGroup.classList.remove('has-success');
              usernameTakenError.classList.remove('hidden');
              usernameRequiredError.classList.add('hidden');
              usernameInvalidError.classList.add('hidden');
            } else if (error && message === 'Username invalid') {
              usernameGroup.classList.add('has-error');
              usernameGroup.classList.remove('has-success');
              usernameInvalidError.classList.remove('hidden');
              usernameTakenError.classList.add('hidden');
              usernameRequiredError.classList.add('hidden');
            } else {
              self.createUser({
                assertion: assertion,
                user: {
                  username: usernameInput.value,
                  mailingList: mailingListInput.checked,
                  prefLocale: languagePreference.value
                }
              }, function (err) {
                if (err) {
                  console.error(err);
                  return;
                }

                usernameTakenError.classList.add('hidden');
                usernameRequiredError.classList.add('hidden');
                usernameInvalidError.classList.add('hidden');
                agreeError.classList.add('hidden');

                usernameGroup.classList.remove('has-error');
                usernameGroup.classList.remove('has-success');
                agreeGroup.classList.remove('has-error');

                self.modal.close();
              });
            }
          });

        };

        for (var i = 0; i < closeBtns.length; i++) {
          closeBtns[i].removeEventListener('click', self.modal.close, false);
          closeBtns[i].addEventListener('click', self.modal.close, false);
        }
        createBtn.addEventListener('click', self.modal.createBtnOnClick, false);
      };

      self.modal.open = function () {
        self.modal.element.classList.add('in');
        self.modal.element.style.display = 'block';
        self.modal.element.setAttribute('aria-hidden', false);
      };

      self.modal.close = function (event) {
        // If close is called by the user via addEventListener we'll get the event object
        if (event) {
          self.analytics.webmakerNewUserCancelled();
        }

        self.modal.element.classList.remove('in');
        self.modal.element.style.display = 'none';
        self.modal.element.setAttribute('aria-hidden', true);
      };

      self.on = function (event, cb) {
        self.emitter.addListener(event, cb);
      };

      self.off = function (event, cb) {
        self.emitter.removeListener(event, cb);
      };

      self.uidExists = function (uid, callback) {
        var http = new XMLHttpRequest();

        var body = JSON.stringify({
          uid: uid
        });

        http.open('POST', self.urls.uidExists, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
            try {
              var response = JSON.parse(http.responseText);
              callback(null, response);
            } catch (ex) {
              self.emitter.emitEvent('error', ['could not parse response']);
              callback('error-checking-email');
            }
          }
          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            callback('error-checking-email');
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.urls.checkEmail + ' is not responding...']);
            callback('error-checking-email');
          }
        };

        http.send(body);
      };

      self.checkUsername = function (username, callback) {
        if (!usernameRegex.test(username)) {
          return callback(true, 'Username invalid');
        }
        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          username: username
        });

        http.open('POST', self.urls.checkUsername, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
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
            self.emitter.emit('error', http.responseText);
            callback(false, 'Error checking username');
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emit('error', 'Looks like ' + self.urls.checkUsername + ' is not responding...');
            callback(false, 'Error checking username');
          }

        };

        http.send(body);

      };

      self.createNewUser = function (data, callback) {

        // capture the referrer ID if it exists
        data.user.referrer = cookieRefValue;

        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          audience: self.audience,
          user: data.user
        });
        callback = callback || function () {};

        http.open('POST', self.urls.createUser, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);

            // User creation successful
            if (data.user) {
              self.storage.set(data.user);
              self.emitter.emitEvent('login', [data.user, 'user created']);
              analytics.event('Webmaker New User Created', {
                nonInteraction: true
              });
              analytics.conversionGoal('WebmakerNewUserCreated');
              self.clearReferrerCookie();
              callback(null, data.user);
            } else {
              self.emitter.emitEvent('error', [http.responseText]);
              callback(http.responseText);
            }

          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            callback(http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.urls.create + ' is not responding...']);
            callback(http.responseText);
          }

        };

        http.send(body);

      };

      self.createUser = function (data, callback) {

        // capture the referrer ID if it exists
        data.user.referrer = cookieRefValue;

        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          assertion: data.assertion,
          audience: self.audience,
          user: data.user
        });
        callback = callback || function () {};

        http.open('POST', self.urls.create, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);

            // User creation successful
            if (data.user) {
              self.storage.set(data.user);
              self.emitter.emit('login', data.user, 'user created');
              analytics.event('Webmaker New User Created', {
                nonInteraction: true
              });
              analytics.conversionGoal('WebmakerNewUserCreated');
              self.clearReferrerCookie();
              callback(null, data.user);
            } else {
              self.emitter.emit('error', http.responseText);
              callback(http.responseText);
            }

          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emit('error', http.responseText);
            callback(http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emit('error', 'Looks like ' + self.urls.create + ' is not responding...');
            callback(http.responseText);
          }

        };

        http.send(body);

      };

      self.verify = function () {

        if (self.storage.get()) {
          self.emitter.emit('login', self.storage.get(), 'restored');
        }

        var email = self.storage.get('email');

        var http = new XMLHttpRequest();

        http.open('POST', self.urls.verify, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);
        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);

            // Email is the same as response.
            if (email && data.email === email) {
              self.emitter.emit('login', data.user, 'verified');
              self.storage.set(data.user);
            }

            // Email is not the same, but is a cookie
            else if (data.user) {
              self.emitter.emit('login', data.user, 'email mismatch');
              self.storage.set(data.user);
            }

            // No cookie
            else {
              self.emitter.emit('logout');
              self.storage.clear();
            }

          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emit('error', http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emit('error', 'Looks like ' + self.urls.verify + ' is not responding...');
          }

        };

        http.send();

      };

      self.request = function (uid, callback) {

        analytics.event('Webmaker Request Token Clicked');

        window.removeEventListener('focus', self.verify, false);

        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          uid: uid
        });

        if (self.timeout) {
          var timeoutInstance = setTimeout(function () {
            http.abort();
            self.emitter.emitEvent('error', [
              'The request for a token timed out after ' + self.timeout + ' seconds'
            ]);
          }, self.timeout * 1000);
        }

        http.open('POST', self.urls.request, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);
        http.onreadystatechange = function () {

          // Clear the timeout
          if (self.timeout && timeoutInstance) {
            clearTimeout(timeoutInstance);
          }

          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);

            // There was an error
            if (data.error || data.err) {
              self.emitter.emitEvent('error', [(data.error || data.err)]);
              return callback(data.error || data.err);
            }

            // User exists
            if (data.status) {
              self.emitter.emitEvent('tokenrequested', [data.status]);
              analytics.event('Webmaker Login Token Requested');
              return callback(null, data.status);
            }

          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            return callback(http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.urls.request + ' is not responding...']);
            return callback('no response');
          }

        };

        http.send(body);

      };

      self.authenticateToken = function (uid, token, validFor, callback) {

        if (!uid || !token) {
          self.emitter.emitEvent('error', ['missing token or uid']);
          return;
        }

        callback = callback || Function.prototype;

        analytics.event('Webmaker Authenticate Token Clicked');

        window.removeEventListener('focus', self.verify, false);

        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          uid: uid,
          token: token,
          validFor: validFor
        });

        var notResponding = 'Looks like ' + self.urls.authenticateToken + ' is not responding...';
        var requestTimedOut = 'The login request timed out after ' + self.timeout + ' seconds';
        var timeoutInstance;

        if (self.timeout) {
          timeoutInstance = setTimeout(function () {
            http.abort();
            self.emitter.emitEvent('error', [requestTimedOut]);
            callback(requestTimedOut);
          }, self.timeout * 1000);
        }

        http.open('POST', self.urls.authenticateToken, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);
        http.onreadystatechange = function () {

          // Clear the timeout
          if (self.timeout && timeoutInstance) {
            clearTimeout(timeoutInstance);
          }

          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);

            // There was an error
            if (data.error || data.err) {
              self.emitter.emitEvent('error', [data.error || data.err]);
              return callback(data.error || data.err);
            }

            if (data.user) {
              self.emitter.emitEvent('tokenlogin', [data.user]);
              analytics.event('Webmaker Token Login Succeeded');
              window.addEventListener('focus', self.verify, false);
              return callback(null, data.user);
            }
          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            return callback(http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', [notResponding]);
            callback(notResponding);
          }

        };

        http.send(body);

      };

      self.login = function () {

        if (!window.navigator.id) {
          console.error('No persona found. Did you include include.js?');
          return;
        }

        analytics.event('Webmaker Login Clicked');

        window.removeEventListener('focus', self.verify, false);

        window.navigator.id.get(function (assertion) {

          if (!assertion) {
            self.emitter.emit('error', 'No assertion was received');

            analytics.event('Persona Login Cancelled');

            return;
          }

          analytics.event('Persona Login Succeeded');

          // capture the referrer ID if it exists, using the 'user' value
          // for consistency with self.createUser
          var user = {
            referrer: cookieRefValue
          };

          var http = new XMLHttpRequest();
          var body = JSON.stringify({
            audience: self.audience,
            assertion: assertion,
            user: user
          });

          if (self.timeout) {
            var timeoutInstance = setTimeout(function () {
              http.abort();
              self.emitter.emit('error', 'The request for a token timed out after ' + self.timeout + ' seconds');
            }, self.timeout * 1000);
          }

          http.open('POST', self.urls.authenticate, true);
          http.withCredentials = self.withCredentials;
          http.setRequestHeader('Content-type', 'application/json');
          http.setRequestHeader('X-CSRF-Token', self.csrfToken);
          http.onreadystatechange = function () {

            // Clear the timeout
            if (self.timeout && timeoutInstance) {
              clearTimeout(timeoutInstance);
            }

            if (http.readyState === 4 && http.status === 200) {
              var data = JSON.parse(http.responseText);

              // There was an error
              if (data.error) {
                self.emitter.emit('error', data.error);
              }

              // User exists
              if (data.user) {
                self.storage.set(data.user);
                self.emitter.emit('login', data.user);
                analytics.event('Webmaker Login Succeeded');
                self.clearReferrerCookie();
                window.addEventListener('focus', self.verify, false);
              }

              // Email valid, user does not exist
              if (data.email && !data.user) {
                self.emitter.emit('newuser', assertion, data.email);
                analytics.event('Webmaker New User Started');

                // If handleNewUserUI is true, show the modal with correct data
                if (self.handleNewUserUI) {
                  self.modal.setup(assertion, data.email);
                  self.modal.open();
                }
              }

              if (data.err) {
                self.emitter.emit('error', data.err);
              }

            }

            // Some other error
            else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
              self.emitter.emit('error', http.responseText);
            }

            // No response
            else if (http.readyState === 4) {
              self.emitter.emit('error', 'Looks like ' + self.urls.authenticate + ' is not responding...');
            }

          };

          http.send(body);

        }, {
          backgroundColor: '#E3EAEE',
          privacyPolicy: 'https://webmaker.org/privacy',
          siteLogo: 'https://stuff.webmaker.org/persona-assets/logo-webmaker.png',
          siteName: 'Mozilla Webmaker',
          termsOfService: 'https://webmaker.org/terms'
        });

      };

      self.logout = function () {

        analytics.event('Webmaker Logout Clicked');

        window.removeEventListener('focus', self.verify, false);

        var http = new XMLHttpRequest();
        http.open('POST', self.urls.logout, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);
        http.onreadystatechange = function () {

          if (http.readyState === 4 && http.status === 200) {
            self.emitter.emit('logout');
            self.storage.clear();
            window.addEventListener('focus', self.verify, false);
          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emit('error', http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emit('error', 'Looks like ' + self.urls.logout + ' is not responding...');
          }
        };
        http.send(null);
      };

      self.verifyPassword = function (uid, password, callback) {
        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          uid: uid,
          password: password
        });

        http.open('POST', self.urls.verifyPassword, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);
            if (data.user) {
              self.emitter.emitEvent('passwordlogin', [data.user]);
              analytics.event('Webmaker User Password Login', {
                nonInteraction: true
              });
              callback(null, true);
            } else {
              self.emitter.emitEvent('error', [http.responseText]);
              callback(http.responseText);
            }

          } else if (http.readyState === 4 && http.status && http.status === 401) {
            self.emitter.emitEvent('error', ['unauthorized']);
            callback(null, false);
          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            callback(http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.urls.setFirstPassword + ' is not responding...']);
            callback(http.responseText);
          }

        };

        http.send(body);
      };

      self.requestResetCode = function (uid, callback) {
        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          uid: uid
        });

        http.open('POST', self.urls.requestResetCode, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);

            if (data.status) {
              self.emitter.emitEvent('resetrequestgenerated');
              analytics.event('Webmaker User Reset Password', {
                nonInteraction: true
              });
              callback(null);
            } else {
              self.emitter.emitEvent('error', [http.responseText]);
              callback(http.responseText);
            }

          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            callback(http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.urls.requestReset + ' is not responding...']);
            callback(http.responseText);
          }

        };

        http.send(body);
      };

      self.resetPassword = function (uid, resetCode, newPassword, callback) {
        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          uid: uid,
          resetCode: resetCode,
          newPassword: newPassword
        });

        http.open('POST', self.urls.resetPassword, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);

            if (data.status) {
              self.emitter.emitEvent('passwordreset');
              analytics.event('Webmaker User Reset Password', {
                nonInteraction: true
              });
              callback(null);
            } else {
              self.emitter.emitEvent('error', [http.responseText]);
              callback(http.responseText);
            }

          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            callback(http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.urls.resetPassword + ' is not responding...']);
            callback(http.responseText);
          }

        };

        http.send(body);
      };

      self.enablePasswords = function (password, callback) {
        var http = new XMLHttpRequest();
        var body = JSON.stringify({
          password: password
        });

        http.open('POST', self.urls.enablePasswords, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);

            if (data.user) {
              self.emitter.emitEvent('passwords-enabled');
              analytics.event('Webmaker User Enabled Passwords', {
                nonInteraction: true
              });
              callback(null);
            } else {
              self.emitter.emitEvent('error', [http.responseText]);
              callback(http.responseText);
            }

          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            callback(http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.urls.requestReset + ' is not responding...']);
            callback(http.responseText);
          }

        };

        http.send(body);
      };

      self.removePassword = function (callback) {
        var http = new XMLHttpRequest();

        http.open('POST', self.urls.removePassword, true);
        http.withCredentials = self.withCredentials;
        http.setRequestHeader('Content-type', 'application/json');
        http.setRequestHeader('X-CSRF-Token', self.csrfToken);

        http.onreadystatechange = function () {
          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);

            if (data.user) {
              self.emitter.emitEvent('passwords-disabled');
              analytics.event('Webmaker User Disabled Passwords', {
                nonInteraction: true
              });
              callback(null);
            } else {
              self.emitter.emitEvent('error', [http.responseText]);
              callback(http.responseText);
            }

          }

          // Some other error
          else if (http.readyState === 4 && http.status && (http.status >= 400 || http.status < 200)) {
            self.emitter.emitEvent('error', [http.responseText]);
            callback(http.responseText);
          }

          // No response
          else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.urls.requestReset + ' is not responding...']);
            callback(http.responseText);
          }

        };

        http.send();
      };

      // Utilities for accessing local storage
      self.storage = {
        get: function (key) {
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
        set: function (data) {
          var userObj = JSON.parse(localStorage.getItem(self.localStorageKey)) || {};
          for (var key in data) {
            if (data.hasOwnProperty(key)) {
              userObj[key] = data[key];
            }
          }
          localStorage.setItem(self.localStorageKey, JSON.stringify(userObj));
        },
        clear: function () {
          delete localStorage[self.localStorageKey];
        }
      };

    };
  }

  // AMD
  if (typeof define === 'function' && define.amd) {
    define(['eventEmitter/EventEmitter', 'cookie-js/cookie', 'analytics'], webmakerAuthClientDefinition);
  }

  // CommonJS
  else if (typeof module === 'object' && module.exports) {
    var cookiejs = require('cookie');
    var EventEmitter = require('events').EventEmitter;
    var analytics = require('webmaker-analytics');
    module.exports = webmakerAuthClientDefinition(EventEmitter, cookiejs, analytics);
  }

  // Global
  else {
    window.WebmakerAuthClient = webmakerAuthClientDefinition(window.EventEmitter, window.cookiejs, window.analytics);
  }

})(window);
