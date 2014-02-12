# Webmaker auth client

## Install

```bash
bower install git://github.com:k88hudson/webmaker-auth-client.git
```
TODO
```bash
bower install webmaker-auth-client
```


## Setup

```
var auth = new WebmakerAuthClient();
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
