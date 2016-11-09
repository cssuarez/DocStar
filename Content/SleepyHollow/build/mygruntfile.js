module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			build: {
			    src: ['../../LibsExternal/jquery.js', '../../*.js', '../../LibsExternal/*.js', '../../LibsExternal/**/*.js', '../../LibsExternal/**/**/**/*.js', '../../LibsInternal/*.js', '../../JSProxy/*.js', '../../../jsmvc/*.js', '../../../jsmvc/**/*.js'],
				dest: '../out/jsmvc.min.js'
			}
		},
		jasmine: {
		    src: ['../../LibsExternal/jquery.js', '../../*.js', '../../JSProxy/*.js', '../../../jsmvc/*.js', '../../../jsmvc/**/*.js'],
			options: {
				specs: '../test/spec/UserSpec.js'
			}
		},
		casper: {
			tests: {
				options: {
					test: true
				},
				files: {
					'out/casper-results.xml': ['../tests/functional/myTest.js']
				}
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-casper');
	
	grunt.registerTask('default', ['jasmine', 'casper:tests', 'uglify']);
};