var Habitat = require('habitat');

Habitat.load();

var env = new Habitat();
var config = {
  LOGIN_URL: env.get('LOGIN_URL'),
  AUTH_LOGIN_URL: env.get('AUTH_LOGIN_URL'),
  SECRET_KEY: env.get('SECRET_KEY')
};

var server = require('./server')(config);

server.listen(env.get('PORT'), function() {
  console.log('Example server now listening on http://localhost:%d', env.get('PORT'));
});
