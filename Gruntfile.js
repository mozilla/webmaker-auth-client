module.exports = function (grunt) {

  grunt.initConfig({
    uglify: {
      main: {
        files: {
          'dist/webmaker-auth-client.min.js' : ['bower_components/eventEmitter/eventEmitter.js', 'webmaker-auth-client.js']
        }
      }
    },
    watch: {
      node: {
        files: ['example/**/*.js'],
        tasks: ['shell:fakeApp', 'shell:fakeApp2']
      },
      client: {
        files: ['webmaker-auth-client.js'],
        tasks: ['uglify']
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
      all: ['webmaker-auth-client.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    jsbeautifier: {
      modify: {
        src: ['webmaker-auth-client.js'],
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
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['shell:fakeApp',  'shell:fakeApp2', 'watch']);

  // Clean code before a commit
  grunt.registerTask('clean', ['jsbeautifier:modify', 'jshint']);

  // Validate code (read only)
  grunt.registerTask('validate', ['jsbeautifier:validate', 'jshint']);

  // Build
  grunt.registerTask('build', ['uglify']);

};
