# Webmaker auth client

## Install

`bower install webmaker-auth`


## Configure

```
var auth = new WebmakerAuthClient({
  endpoint: 'https://login.webmaker.org
});
```

## Listen to events

```
auth.on('event', callback);
auth.off('event', callback);
```

`restore`: When user data is restored from local storage. Fires instantly.

`verify`: When the token is verified.

`login`: Short form for both `restore` and `verify`.

`error`: Includes error message.

`logout`: When user logs out or is logged out due to an error.

## Ready to go?
```
auth.init();
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
