casper.test.begin('Retrieve Smoke test', function (test) {
    casper.start('https://eaproxy.docstar.com/Proxy/Login', function () {
        //var currentUrl = this.getCurrentUrl();
        //if (currentUrl === 'https://eaproxy.docstar.com/Proxy/Login') {
            //var require = patchRequire(require);
            //var logMeIn = require('../utils/logMeIn.js');

            //logMeIn.logIn(function (func) {
            //    casper.func = func;
            //    casper.func();
            //});
        test.assertExists('form#login_form, #userName, input[type="password"], #loginButton', 'All elements found');
        this.fill('form#login_form', {
                username: 'smoke@doc.com',
                password: 'smoke'
            }, true);
        //this.click('#loginButton');
        //}
    });

    casper.then(function () {
        var currentUrl = this.getCurrentUrl();
        this.echo(currentUrl);
        var isUrl = (currentUrl === 'https://eclipsealpha.docstar.com/EclipseWeb/#Home');
        //test.assertEquals(isUrl, true, 'url is correct');
        //test.assertTitle('eclipse', 'We are logged in');
        casper.waitForSelector('li#retrieve_tab', function () {
            test.assertExists('a#retrieve_link', 'link exsists');
        }, function () {
            var currentUrl = this.getCurrentUrl();
            this.echo(currentUrl);
            var isUrl = (currentUrl === 'https://eclipsealpha.docstar.com/EclipseWeb/#Home');
            test.assertEquals(isUrl, true, 'url is correct');
        }, 15000);
        
        //casper.click('a[href="#retrieve_tab"]');
    });

    //casper.then(function () {
    //    test.assertExists('#field_search_container', 'We are in Retrieve Tab');
    //});

    casper.run(function () {
        test.done();
    });
});


//    test.assertTitle('Jasmine Spec Runner v2.0.0', 'Headlesss.aspx page title is the one expected');
//    test.assertExists('#jas-start', 'Button Found');

//    this.click('#jas-start');
//    this.wait(3000, function () {
//        test.assertEval(function () {
//            return __utils__.findOne('#myResults').textContent === '8 specs, 0 failures';
//        }, '#myResults element contains the text 8 specs, 0 failures');
//    });

//});

//casper.run(function () {
//    test.done();
//});