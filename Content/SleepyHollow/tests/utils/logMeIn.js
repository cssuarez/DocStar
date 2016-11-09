

exports.logIn = function (callback) {
    var func = function() {
        test.assertExists('#userName, input[type="password"], #loginButton', 'All elements found');
        this.fillSelectors('#addForm', {
            '#userName': 'smoke@d.com',
            'input[type="password"]': 'smoke'
        }, false);
        this.click('#loginButton');
    }

    return callback(func);
}