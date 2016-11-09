var ContentTypeDialogs = {
    replace: function (options) {
        options = options || {};
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var that = this;
        var ct = options.model;
        var name = ct.get('Name');
        var $dialog;
        var ctReplacementView = new ContentTypeReplacementView({ model: ct });
        var okFunc = function (cleanup) {
            var cleanupFunc = function () {
                Utility.executeCallback(cleanup);
                ctReplacementView.close();
            };
            var replacementId = $dialog.find('select').val();
            options.callback(replacementId, cleanupFunc);
        };
        var cancelFunc = function (cleanup) {
            ctReplacementView.close();
            Utility.executeCallback(cleanup);
        };
        var diagOpts = {
            html: ctReplacementView.render().$el,
            title: Constants.t('selectContentType'),
            autoOpen: false,
            width: 500,
            height: 200,
            resizable: false,
            modal: true
        };
        $dialog = DialogsUtil.generalPromptDialog('', okFunc, cancelFunc, diagOpts);
        $dialog.dialog('open');
    }
};