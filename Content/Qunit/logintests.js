var LoginTests = {
	//constants
	username: 'username',
	password: 'password',
	//d is the jquery handle on the child window
	init: function(username, password, d) {
		module('Login Tests');
		//does the username field exist
		//console.log($(d).find('#Username'));
		QUnit.log(function( details ) {
		console.log( "Log: ", details.result, details.message );
		});
		test(' Username input exists ', function() {
			ok(Base.h.$('input[name="' + LoginTests.username + '"]').length === 1, 'found username input');
		});
		//console.log("testing")
		//does the password field exist
		//does the login button exist
		test(' Password input exists ', function() {
			ok(Base.h.$('input[name="' + LoginTests.password + '"]').length === 1, 'found password input');
		});
		test(' LogonButton input exists ', function() {
			ok(Base.h.$('input[value="Login"]').length === 1, 'found Logon Button input');
		});
		//does the remember me checkbox exist
		test(' Remember me checkbox exists ', function() {
			ok(Base.h.$('input[name="remember_me"]').length ===1, 'found Checkbox input');
		});
		//check and uncheck box to test for correct values
		test(' Remember me checkbox on ', function() {
			ok(Base.h.$('input[name="remember_me"]').click(), "Checked box");
			var chkbValue = Base.h.$('input:checkbox:checked').val();
		});
		//alert('This is the value of the checkbox checked  =   ' + chkbValue);
		//Base.sleep(3);
		test(' Remember me checkbox off ', function() {
			ok(Base.h.$('input[name="remember_me"]').click(), "Unchecked box");
			var chkbValue = Base.h.$('input:checkbox:checked').val();
		});

	
		//Test that the login fails/succeeds
		LoginTests.blankUserPswdTest();
		LoginTests.blankPasswdTest();
		LoginTests.blankUserIDTest();
		LoginTests.invalidUserPswdTest();		
		LoginTests.adminPasswdTest(username, password);
		//this is how we submit the login form to use the submit binded function
		//Base.h.$('input[type="button"]').attr('onclick')();
	},

	blankUserPswdTest: function() {
		var usr = "";
		var psd = "";
		var originalURL = Base.h.window.location.href;
		Base.h.$('input[name="username"]').val(usr);
		Base.h.$('input[name="password"]').val(psd);
		Base.h.$('input[id="loginButton"]').click();
		Base.waitForAjaxLoad();
		test('Empty Username and password fields', function() {
		ok(Base.h.$('#authMessage').text() === "Username and or Password is incorrect", " Incorrect credentials message ");
		});
		Base.h.window.location.href=Base.h.window.location.href;
		Base.waitForWindowLoad();
	},
	blankPasswdTest: function() {
		var usr = "admin";
		var psd = "";
		var originalURL = Base.h.window.location.href;
		Base.h.$('input[name="username"]').val(usr);
		Base.h.$('input[name="password"]').val(psd);
		Base.h.$('input[id="loginButton"]').click();
		Base.waitForAjaxLoad();
		test(' Empty password field ', function() {
		ok(Base.h.$('#authMessage').text() === "Username and or Password is incorrect", " Incorrect credentials message ");
		});
		Base.h.window.location.href=Base.h.window.location.href;
		Base.waitForWindowLoad();
	},
	blankUserIDTest: function() {
		var usr = "";
		var psd = "testing!";
		var originalURL = Base.h.window.location.href;
		Base.h.$('input[name="username"]').val(usr);
		Base.h.$('input[name="password"]').val(psd);
		Base.h.$('input[id="loginButton"]').click();
		Base.waitForAjaxLoad();
		test(' Empty Username field ', function() {
		ok(Base.h.$('#authMessage').text() === "Username and or Password is incorrect", " Incorrect credentials message ");
		});
		Base.h.window.location.href=Base.h.window.location.href;
		Base.waitForWindowLoad();
	},
	invalidUserPswdTest: function() {
		var usr = "NotHere";
		var psd = "Password";
		var originalURL = Base.h.window.location.href;
		Base.h.$('input[name="username"]').val(usr);
		Base.h.$('input[name="password"]').val(psd);
		Base.h.$('input[id="loginButton"]').click();
		Base.waitForAjaxLoad();
		test(' Username and password does not exist ', function() {
		ok(Base.h.$($.trim($('#authMessage').text()) === "Username and or Password is incorrect"), " Incorrect credentials message ");
		});
		Base.h.window.location.href=Base.h.window.location.href;
		Base.waitForWindowLoad();
	},
		// test that the login succeeds
	adminPasswdTest: function(username, password) {
		var originalURL = Base.h.window.location.href;
		//Base.sleep(4); // needed when running Validator Test separately
		Base.h.$('input[name="username"]').val(username);
		Base.h.$('input[name="password"]').val(password);
		Base.h.$('input[id="loginButton"]').click();
		//Base.waitForWindowLoad();
		Base.sleep(12);
		var newURL = Base.h.window.location.href;
		test('Home page', function() {
			notEqual(originalURL, newURL, 'Home page is open'); //alert(originalURL);	alert(newURL);
		});
	},
};
