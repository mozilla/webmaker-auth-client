# Webmaker auth client

## Install

```
bower install webmaker-auth-client
```

## What's included?

```
webmaker-auth-client.js

\create-user
    create-user-form.css
    create-user-form.html
\dist
    webmaker-auth-client.min.js
```



## Example

```html
<html>
  <head></head>
  <body>

    <button id="login"></button>
    <button id="logout"></button>

    <script src="bower_components/webmaker-auth-client/dist/webmaker-auth-client.min.js"></script>
    <script src="bower_components/eventEmitter/EventEmitter.js"></script>
    <script>
      var auth = new WebmakerAuthClient();

      var loginEl = document.querySelector('#login');
      var logoutEl = document.querySelector('#logout');

      auth.on('login', function(user, message) {
        console.log('login', user, message);
      });

      auth.on('logout', function() {
        console.log('logout');
      });

      auth.on('verified', function(user) {
        console.log('verified', user);
      });

      auth.on('error', function(err) {
        console.log(err);
      });

      auth.verify();

      loginEl.addEventListener('click', auth.login, false);
      logoutEl.addEventListener('click', auth.logout, false);
    </script>
  </body>
</html>
```

### Require-js

```js
requirejs.config({
  paths: {
    'eventEmitter': '/bower/eventEmitter',
    'webmaker-auth-client': '/bower/webmaker-auth-client'
  }
});

define(['webmaker-auth-client/webmaker-auth-client'],
  function(WebmakerAuthClient) {
    var auth = new WebmakerAuthClient();
    ...
  });
```


## Configure

```
var auth = new WebmakerAuthClient({
  host: '',
  paths: {
    authenticate: '/authenticate',
    create: '/create',
    verify: '/verify',
    logout: '/logout'
  },
  csrfToken: 'YOURCSRFTOKEN',
  audience: window.location.origin,
  prefix: 'webmaker-', // for local storage
  timeout: 10,
  handleNewUserUI: true // Do you want to auto-open/close the new user UI?
});
```

## Listen to events

```
auth.on('event', callback);
auth.off('event', callback);
```

`verify`: When the token is verified.

`login`: When a user logs in or a session is automatically restored.

`error`: Includes error message.

`logout`: When user logs out or is logged out due to an error.

## To automatically login users, and set up SSO, you must call
```
auth.verify();
```

## Call login and logout

```
auth.login();
auth.logout();
```

### TODO:

* require.js + minification
* tests
* publish to bower
