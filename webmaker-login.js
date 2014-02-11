var express = require('express');
var hyperquest = require('hyperquest');
var expressPersona = require('express-persona');
var url = require('url');

module.exports = function(options) {

  options = options || {};

  var self = this;

  self.loginURL = options.loginURL || 'http://testuser:password@login.mofostaging.org';
  self.audience = options.audience;

  self.maxAge = options.maxAge || 2678400000; // 31 days. Persona saves session data for 1 month
  self.forceSSL = options.forceSSL || false;
  self.secretKey = options.secretKey || 'BOBSYOURUNCLE';
  self.cookieName = options.cookieName || 'webmakerlogin.sid';

  // No user-defined login URL
  if (!options.loginURL) {
    console.error('WARNING (webmaker-loginapi): loginURL was not passed into configuration. Defaulting to http://testuser:password@login.mofostaging.org.');
  }

  // No audience
  if (!options.audience) {
    throw new Error('webmaker-loginapi: You need to supply an audience parameter in options. This is the domain of wherever your app is running.');
  }

  self.cookieParser = function() {
    return express.cookieParser();
  };

  self.cookieSession = function() {
    return express.cookieSession({
      key: self.cookieName,
      secret: self.secretKey,
      cookie: {
        maxAge: self.maxAge,
        secure: self.forceSSL
      },
      proxy: true
    });
  };

  self.handlers = {
    get: function(req, res) {
      res.send('USER DATA LOLS');
    },
    create: function(req, res) {
      res.send('CREATE USER LOLS');
    }
  };

  self.utils = {
    getUser: function(id, cb) {
      // get a user
    },
    isAdmin: function(id, cb) {
      // check if is admin
    }
  };

};
