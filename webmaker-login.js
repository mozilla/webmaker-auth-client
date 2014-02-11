var express = require('express');
var hyperquest = require('hyperquest');

var expressPersona = require('express-persona');
var url = require('url');

module.exports = function(options) {

  options = options || {};

  var self = this;

  self.loginURL = options.loginURL || 'http://testuser:password@login.mofostaging.org';

  self.maxAge = options.maxAge || 2678400000; // 31 days. Persona saves session data for 1 month
  self.forceSSL = options.forceSSL || false;
  self.secretKey = options.secretKey || 'BOBSYOURUNCLE';
  self.cookieName = options.cookieName || 'webmakerlogin.sid';

  // No user-defined login URL
  if (!options.loginURL) {
    console.error('WARNING (webmaker-loginapi): loginURL was not passed into configuration. Defaulting to http://testuser:password@login.mofostaging.org.');
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

  function authenticateCallback( err, req, res, json ) {
    if ( err ) {
      return res.json(500, {
        error: err
      });
    }
    if ( !json ) {
      return res.json(500, {
        error: "The Login server sent an invalid response"
      });
    }
    if ( json.email && json.user ) {
      req.session.user = json.user;
      req.session.email = json.email;
      res.json(200, {
        user: json.user,
        email: json.email
      });
    } else {
      res.json(200, {
        error: "No user for email address",
        email: json.email
      });
    }
  }

  self.handlers = {
    authenticate: function(req, res) {

      var hReq = hyperquest.post(self.loginURL + "/api/user/authenticate")
      hReq.on("error", authenticateCallback);
      hReq.on("response", function(resp) {
        if (resp.statusCode !== 200) {
          return res.json(500, {
            error: "There was an error on the login server"
          });
        }

        var bodyParts = []
        var bytes = 0;
        resp.on("data", function (c) {
          bodyParts.push(c);
          bytes += c.length;
        });
        resp.on("end", function() {
          var body = Buffer.concat(bodyParts, bytes).toString("utf8");
          var json;

          try {
            json = JSON.parse(body);
          } catch (ex) {
            return authenticateCallback(ex);
          }

          authenticateCallback(null, req, res, json);
        });
      });
      hReq.end(JSON.stringify({
        assertion: req.body.assertion,
        audience: req.body.audience
      }), "utf8" );
    },
    verify: function(req, res) {
      if (!req.body.email) {
        return res.send(200, {
          error: "You must send an email to verify"
        });
      }
      if (!req.session.email && !req.session.user) {
        return res.send(200, {
          error: "No Session"
        });
      }
      if (req.session.email !== req.body.email) {
        res.send(200, {
          error: "Session set, email mismatch",
          user: req.session.user
        });
      } else {
        res.send(200, {
          user: req.session.user
        });
      }
    },
    create: function(req, res) {
      var hReq = hyperquest.post(self.loginURL + "/api/user/create");
      hReq.on("error", authenticateCallback);
      hReq.on("response", function(resp) {
        if (resp.statusCode !== 200) {
          return res.json(500, {
            error: "There was an error on the login server"
          });
        }

        var bodyParts = []
        var bytes = 0;
        resp.on("data", function (c) {
          bodyParts.push(c);
          bytes += c.length;
        });
        resp.on("end", function() {
          var body = Buffer.concat(bodyParts, bytes).toString("utf8");
          var json;

          try {
            json = JSON.parse(body);
          } catch (ex) {
            return res.json(500, {
              error: "There was an error parsing the response from the Login Server"
            });
          }

          req.session.user = json.user;
          req.session.email = json.email;
          res.json(200, {
            user: json.user,
            email: json.email
          });
        });
      });
      hReq.end(JSON.stringify({
        user: req.body.user
      }), "utf8");
    }
  };
};
