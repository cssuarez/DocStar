var JavaScriptTests = {
	init: function() {
		module('JavaScripts Tests');
		var jsfiles = null;
		$.ajax(Base.path4,{
			async: false,
			type: 'POST',
			success: function(data) {
				jsfiles = data;
			}
		});
		//alert(jsfiles.files[0]);
		var length = jsfiles.files.length;
		var i;
		for(i=0; i < length; i++) {
			//test each javascript file 
			var file = jsfiles.files[i];
			JavaScriptTests.parseFileTest(file, Base.path1);
		}
		// jsmvc folder js file test
		var length = jsfiles.jsmvc.length;
		var i;
		for(i=0; i < length; i++) {
			var file = jsfiles.jsmvc[i];
			JavaScriptTests.parseFileTest(file, Base.path9);
		}
		JavaScriptTests.parseString('Constants', jsfiles.constants);
	    //check the constants right here.
	},
	parseFileTest: function(file, directory) {
		var file_contents = JavaScriptTests.fetchFile(file, directory);
		Base.jslint.$('#JSLINT_INPUT').val(file_contents);
		Base.jslint.$('input[name="jslint"]').trigger('click');
		$('input[name="jslint"],[value="JSLint"]').first().click();
		JavaScriptTests.parseString(file, file_contents);
		
	},
	parseString: function(file, file_contents) {
	test('Test: '+file, function() {
			var errors = false;
			var msg = 'Good Code';
			if(Base.jslint.$('#errors').length === 1){
				errors = true;
				//get all errors
				var errorsArr = Base.jslint.$('#errors').find('p');
				var length = errorsArr.length;
				var i;
				msg = '';
				for(i=0; i < length; i++) {
					var error_msg = $(errorsArr[i]).text();
					if (i === 0) {
						if(error_msg.indexOf("Implied global") === 0) {
							errors = false;
						} else {
							errors = true;
						}
					}
					ok(!errors, error_msg);
				}
			} else {
				ok(!errors, msg);
			}
		});
	},
	fetchFile: function(file, directory) {
		var contents = '';
		$.ajax(directory +file, {
			async: false,
			success: function(data) {
				contents = data;
			}
		});
		return contents;
	}
};