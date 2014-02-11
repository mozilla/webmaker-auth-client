var express = require('express');
var Habitat = require('habitat');
var WebmakerLogin = require('../webmaker-login');

Habitat.load();

var env = new Habitat();
var app = express();
var login = new WebmakerLogin({
  loginURL: env.get('LOGIN_URL'),
  audience: env.get('AUDIENCE'),
  secretKey: env.get('SECRET_KEY'),
  forceSSL: env.get('FORCE_SSL'),
  maxAge: 2678400000
});

app.use(express.logger('dev'));
app.use(express.compress());
app.use(express.json());
app.use(express.urlencoded());

app.use(login.cookieParser());
app.use(login.cookieSession());

app.get('/user', login.handlers.get);
app.post('/user', login.handlers.create);

app.listen(env.get('PORT'), function() {
  console.log('App listening on ' + env.get('PORT'));
});
