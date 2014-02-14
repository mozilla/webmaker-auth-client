# Webmaker auth client

## Install

Webmaker-auth-client has one dependency, `eventEmitter`. This will also be added to your bower.json if you choose to install `webmaker-auth-client`.

```
bower install webmaker-auth-client --save
```

## What's included?

```bash

# Main js file
webmaker-auth-client.js

# Create new user form assets
create-user/
    create-user-form.css
    create-user-form.html

# Minified file (~11kb) packaged with eventEmitter.
dist/
    webmaker-auth-client.min.js
```


## Example

```html
<html>
  <head></head>
  <body>

    <button id="login"></button>
    <button id="logout"></button>
    
     <!--
      If you are using the unminified version, you must also include EventEmitter.js
      It will be automatically installed by bower.
     -->
    <script src="bower_components/webmaker-auth-client/webmaker-auth-client.js"></script>
    <script src="bower_components/eventEmitter/EventEmitter.js"></script>
    <script>
      var loginEl = document.querySelector('#login');
      var logoutEl = document.querySelector('#logout');
      
      var auth = new WebmakerAuthClient();
    
      // Attach event listeners!
      auth.on('login', function(user, debuggingInfo) {
        console.log('login', user, debuggingInfo);
      });
      auth.on('logout', function() {
        console.log('logout');
      });
    
      // Run this function to automatically log-in users with a session set.
      auth.verify();
      
      // Use auth.login and auth.logout to login and out!
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

```js
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

```js
auth.on('event', callback);
auth.off('event', callback);
```

`verify`: When the token is verified.

`login`: When a user logs in or a session is automatically restored.

`error`: Includes error message.

`logout`: When user logs out or is logged out due to an error.

## Session restore and SSO 
### To automatically login users and set up SSO, you must call
```js
auth.verify();
```

## Login/Logout

```js
auth.login();
auth.logout();
```
