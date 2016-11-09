casper.test.begin('User test', 3, function (test) {
    casper.start('https://dev.docstar.com/Fusion/Content/SleepyHollow/test/Headless.aspx', function () {
        test.assertTitle('Jasmine Spec Runner v2.0.0', 'Headlesss.aspx page title is the one expected');
        test.assertExists('#jas-start', 'Button Found');
        
        this.click('#jas-start');
        this.wait(3000, function () {
            test.assertEval(function () {
                return __utils__.findOne('#myResults').textContent === '8 specs, 0 failures';
            }, '#myResults element contains the text 8 specs, 0 failures');
        });
        
    });

    casper.run(function () {
        test.done();
    });
});