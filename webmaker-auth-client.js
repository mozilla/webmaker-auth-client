window.WebmakerAuthClient = function(options) {
  var self = this;

  self.endpoint = options.endpoint || 'http://webmaker-events-service.herokuapp.com';
  self.url = options.url || self.location + '/auth';
  self.audience = options.audience || window.location.origin;
  self.prefix = options.prefix || 'webmaker-';
  self.seamless = options.seamless === false ? false : true;
  self.timeout = options.timeout || 10;

  self.localStorageKey = self.prefix + 'user';

  if (!window.navigator.id) {
    console.log('No persona found. Did you include include.js?');
  }

  if (!window.localStorage) {
    console.log('Local storage must be supported.');
  }

  self.utils = {
    // Encode form data for POST
    encode: function(data) {
      var result = '';
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          result += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
        }
      }
      return result;
    }
  };

  self.emitter = new EventEmitter();

  self.on = function(event, cb) {
    self.emitter.addListener(event, cb);
  };

  self.off = function(event, cb) {
    self.emitter.removeListener(event, cb);
  };

  self.login = function() {
    navigator.id.request();
  };

  self.logout = function() {
    navigator.id.logout();
  };

  self.storage = {
    get: function(key) {
      var data = JSON.parse(localStorage.getItem(self.localStorageKey));
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


  self.init = function() {

    if (self.seamless && self.storage.get()) {
      self.emitter.emitEvent('login', [self.storage.get()]);
      self.emitter.emitEvent('restored', [self.storage.get()]);
    }

    navigator.id.watch({
      loggedInUser: null,
      onlogin: function(assertion) {

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
        var body = self.utils.encode({
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
        http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        http.onreadystatechange = function() {

          if (self.timeout) {
            clearTimeout(timeoutInstance);
          }

          if (http.readyState == 4 && http.status == 200) {
            var data = JSON.parse(http.responseText);
            self.storage.set(data);
            self.emitter.emitEvent('login', [data]);
            self.emitter.emitEvent('verified', [data]);
          } else if (http.readyState === 4 && http.status && ( http.status >= 400 || http.status < 200 )) {
            navigator.id.logout();
            self.emitter.emitEvent('error', [http.responseText]);
            self.storage.clear();
          } else if (http.readyState === 4) {
            self.emitter.emitEvent('error', ['Looks like ' + self.location + ' is not responding...']);
          }

        };

        http.send(body);

      },
      onlogout: function() {
        self.emitter.emitEvent('logout');
        self.storage.clear();
      }
    });

  };

};
