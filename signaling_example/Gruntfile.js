module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: ['public/js/**/*.js', '!public/js/external/*.js', '!public/js/dist/*.js'],
        dest: 'public/dist/speez.js',
      },
    },

    uglify: {
      options: {
        sourceMap: true,
      },
      my_target: {
        files: {
          'public/dist/speez.min.js': [
            'public/dist/speez.js'
          ]
        }
      }
    },

    copy: {
      main: {
        files: [
          // includes files within path
          {expand: true, cwd: 'public/', src: ['**', '!dist/**'], dest: '../client/www'},
        ],
      }
    },

    clean: {
      build: {
        src: ["../client/www"],
      }
    },

    watch: {
      scripts: {
        files: ['public/**', '!public/dist/**', 'Gruntfile.js'],
        tasks: ['concat', 'uglify', 'force:on', 'clean', 'force:restore', 'copy'],
        options: {
          spawn: false,
        },
      },
    },

  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');

  var previous_force_state = grunt.option("force");
  grunt.registerTask("force", function(set){
      if (set === "on") {
          grunt.option("force",true);
      }
      else if (set === "off") {
          grunt.option("force",false);
      }
      else if (set === "restore") {
          grunt.option("force",previous_force_state);
      }
  });

  grunt.registerTask('doit', ['concat', 'uglify', 'force:on', 'clean', 'force:restore', 'copy', 'watch']);
  grunt.registerTask('default', ['concat', 'uglify', 'watch']);
}