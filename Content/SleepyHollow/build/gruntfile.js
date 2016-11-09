module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		/*uglify: {
			build: {
				src: '../js/app.js',
				dest: '../out/app.min.js'
			}
		},
		jasmine: {
			src: '../js/*.js',
			options: {
				specs: '../tests/spec/*.js'
			}
		},*/
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
	
	//grunt.loadNpmTasks('grunt-contrib-uglify');
	//grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-casper');
	
	grunt.registerTask('default', [/*'jasmine', */'casper:tests'/*, 'uglify'*/]);
};