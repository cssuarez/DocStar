Base = {
    //SUT window
    h: null,
    valid: 'QAHandler.ashx',
    logout: 'Account/Login',
    qasleep: 'QA/Sleep',
    email: 'QA/EmailReport',
    content: 'Content/',
    //check for valid html in this window	
    openWindowSUT: function (url) {
        //window.open returns the child window an is a window object itself
        // h is the window handle
        Base.h = window.open(url);
    },
    setConfigOptions: function () {
        var prot = $.url.attr("protocol");
        var host = $.url.attr("host");
        var seg0 = $.url.segment(0);
        var seg1 = $.url.segment(1);
        var seg2 = $.url.segment(2);
        var path2 = "../../Account/Logout";
        var path6 = "../../" + Base.valid;
        var path7 = "../../" + "/" + Base.email;
        this.path8 = "../../" + Base.qasleep;
        $('input[name="url"]').val(path2);
		// makes the variable global
        Base.path2 = path2;
        Base.path7 = path7;
        Base.path6 = path6;
    },
    setTimestamp: function () {
        var d = new Date();
        $('#timestamp').text(d.toUTCString());
    },
    setup: function () {
        var url = $('input[name="url"]').val();
        Base.openWindowSUT(url);
		Base.waitForWindowLoad();
    },
    teardown: function () {
        Base.h.close();
    },
    startTesting: function () {
        Base.setup();
        var username = $('input[name="username"]').val();
        var password = $('input[name="password"]').val();
        var url = $('input[name="url"]').val();
        try {
			LoginTests.init(username, password);
			InboxTests.init();
            HomePageTests.init();
            Base.h.$('#retrieve_tab').click();
            RetrievePageTests.init();
            Base.h.$('#capture_tab').click();
            CapturePageTests.init();
			Base.sleep(1);
			Base.h.$('#workflow_tab').click();
			Base.sleep(1);
			WorkflowPageTests.init();
            Base.h.$('#reports_tab').click();
			Base.sleep(3);
			test('Reports page test', function() {
			ok(Base.h.$('#reports_tab').length == 1, 'Reports page exits');
			});
			Base.h.$('#forms_tab').click();
			Base.sleep(5);
			Base.h.$('#admin_tab').click();
            AdminPageTests.init(); // 60000
            Base.sleep(3);
        } catch (exception) {
            alert("in main test harness\nMessage: " + exception.message + "\nfile: " + exception.fileName + "\nline: " + exception.lineNumber); ;
        }
        Base.teardown();
    },
	createCompanies: function () {
	    var url = $('input[name="url"]').val();
        Base.openWindowSUT(url);
		Base.waitForWindowLoad();
        var username = $('input[name="username"]').val();
        var password = $('input[name="password"]').val();
        var url = $('input[name="url"]').val();
        try {
			LoginTests.adminPasswdTest(username, password);
			Base.sleep(3);
            Base.h.$('#admin_tab').click();
            AdminPageTests.createCompany(); // 60000
            Base.sleep(5);
            Base.h.close();
		} catch (exception) {
            alert("in main test harness\nMessage: " + exception.message + "\nfile: " + exception.fileName + "\nline: " + exception.lineNumber); ;
        }
    },	
    jslintOnly: function () {
        var url2 = $('input[name="jslint"]').val();
        Base.openWindowJSLINT(url2);
        Base.sleep(1);
        JavaScriptTests.init();
        Base.sleep(1);
        Base.jslint.close();
    },
    validator: function () {
        var url = $('input[name="url"]').val();
        Base.openWindowSUT(url);
        Base.sleep(3);
        validatorTests.all();
        //Base.sleep(5);
        Base.h.close();
    },
    sendEmailReport: function () {
        $('#config').hide();
        var str = $('body').html();
        $.ajax(this.path7, {
            data: ({ email: str }),
            //dataType: 'text',
            //processData: false,
            type: "POST",
            success: function (result) {
                alert(result);
                $('#config').show();
            },
            error: function (jqxhr, textStatus, errorThrown) {
            }
        });
    },
    sleep: function (seconds) {
        seconds = seconds * 1000;
        $.ajax(this.path8, {
            type: "post",
            async: false,
            data: { "milliseconds": seconds },
            success: function (data) {
            },
            failure: function () {
            }
        });
    },
    //Blocking operation that waits for the current window handle to have finished loading. This will not work for ajax calls or server errors, only page loads.
    waitForWindowLoad: function (timeoutMilliseconds) {
        this.h.onload = undefined;

        if (!timeoutMilliseconds) {
            timeoutMilliseconds = 1000;
        }
        if (!this.h) {
            return;
        }
        else {
            this.h.trigger("load", function () {
                this.sleep(1);
            })
            /*while (!this.h.onload && timeoutMilliseconds > 0) {
                this.sleep(1);
                timeoutMilliseconds -= 1000;
            }*/
        }
    },
	waitForAjaxLoad: function() {
		var urlVar = Base.h.window.location.href;
		$.ajax({
			type: "POST",
			url: urlVar,
			async: false,
			success: function(data, textStatus, jqXHR) {
			},
			error: function(jqXHR, textStatus, errorThrown) {
			}
		});
	},
};