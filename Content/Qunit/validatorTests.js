var validatorTests = {
	init: function() {
		module('Validator Tests');
		validatorTests.post(validatorTests.getdata());
		},
		getdata: function() {
			var dname = Base.h.document.doctype.name;
			var dPubId = Base.h.document.doctype.publicId;
			var dSysId = Base.h.document.doctype.systemId;
			var dtag1 = '<!DOCTYPE ';
			var dtag2 = ' PUBLIC ';
			var dtag3 = '<html xmlns="http://www.w3.org/1999/xhtml"> '
			var dtag4 = ' </html>';
			var body = Base.h.document.getElementsByTagName('html')[0].innerHTML;
			var doc = (dtag1 + dname + dtag2 + '"' + dPubId + '" ' + '"' + dSysId + '"> ' + dtag3 + body + dtag4);
			return doc;
		},
		post: function(html) {
		html = encodeURI(html);
		$.ajax({
			url: Base.path6,
			data: html,
			type: "POST",
			contentType: 'text',
			//contentType: "application/json; charset=utf-8",
			success: function(data) {
				//var sXML = new XMLSerializer().serializeToString(data); 
				//var sXML = $.parseXML(data); 
				var errors = $(data).find('li[class="msg_err"]');
				$.map(errors, function(el){
					var line = $(el).find('em').text();
					var msg = $(el).find('span[class="msg"]').text();
					if(line.length !== 0) {
						validatorTests.testresults(line, msg);
						//console.log(line, msg);
					}
				});
				//alert('Post & Response successful');
			},
			error: function(data, textStatus, jqXHR) {
				alert(jqXHR);
				alert('Error: ' + jqXHR);
			}
		});
		},
		testresults: function(line, msg, url) {
			//var url = document.location.href;
			test('Web document test', function() {
				if(line.length !== 0){
							var url = Base.h.document.location.href;
							}
						ok(!line, line + ", " + "URL: " + url + ", - -  Error Message: " + msg);
				});
		},
		all: function() {
			// validatorTests.init(); // will not validate login page before admin is logged in
			// Base.sleep(9);
			LoginTests.adminPasswdTest();
			Base.sleep(5);
			validatorTests.init();  // validate Home page
			Base.sleep(9);
			Base.h.$('#retrieve_tab').click();
			Base.sleep(5);
			validatorTests.init(); // validate Retrieve page
			Base.sleep(9);
			Base.h.$('#capture_tab').click();
			Base.sleep(5);
			validatorTests.init(); // validate Capture page
			Base.sleep(9);
			Base.h.$('#workflow_tab').click();
			Base.sleep(5);
			validatorTests.init(); // validate Workflow page
			Base.sleep(9);
			Base.h.$('#admin_tab').click();
			Base.sleep(5);
			validatorTests.init(); // validate Admin page
			Base.sleep(9);
		},
};