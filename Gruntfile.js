module.exports = function (grunt) {

  grunt.initConfig({
    less: {
      development: {
        files: {
          'app/compiled/app.min.css': 'app/less/app.less'
        }
      }
    },
    watch: {
      js: {
        files: ['example/**/*.js', 'webmaker-login.js'],
        tasks: ['shell:fakeLogin', 'shell:fakeApp', 'shell:fakeApp2']
      }
    },
    shell: {
      fakeLogin: {
        options: {
          async: true
        },
        command: 'node example/loginforthelols.js'
      },
      fakeApp: {
        options: {
          async: true
        },
        command: 'node example/server.js'
      },
      fakeApp2: {
        options: {
          async: true
        },
        command: 'node example/server-2.js'
      }
    },
    jshint: {
      all: ['Gruntfile.js', 'webmaker-login.js', 'example/webmaker-auth-client.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    jsbeautifier: {
      modify: {
        src: ['Gruntfile.js', 'webmaker-login.js', 'example/webmaker-auth-client.js'],
        options: {
          config: '.jsbeautifyrc'
        }
      },
      validate: {
        src: ['Gruntfile.js', 'webmaker-login.js', 'example/webmaker-auth-client.js'],
        options: {
          mode: 'VERIFY_ONLY',
          config: '.jsbeautifyrc'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-shell-spawn');
  grunt.loadNpmTasks('grunt-jsbeautifier');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', [ 'shell:fakeLogin', 'shell:fakeApp',  'shell:fakeApp2', 'watch']);

  // Clean code before a commit
  grunt.registerTask('clean', ['jsbeautifier:modify', 'jshint']);

  // Validate code (read only)
  grunt.registerTask('validate', ['jsbeautifier:validate', 'jshint']);

};
