var LDAPDialogs = {
    browseLDAPImport: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var data = [];
        var i = 0;
        var $dialogClone = $('#browseLDAPContainer').clone();

        var $dialog;
        var diagOpts = {
            html: $dialogClone.html(),
            title: Constants.t('browse'),
            modal: true,
            minWidth: 300,
            minHeight: 400,
            height: 300,
            width: 400,
            autoOpen: false,
            open: function () {
                $dialog.css('overflow', 'auto');
                $dialog.find('.ldapList').show();
                $dialog.find('.ldapList').containers('ldapList', options.ldapData, options.getChildrenData);
            }
        };

        var okFunc = function (cleanup) {
            // obtain selected node data
            var selected = $dialog.find('.ldapList').jstree('get_selected');
            var length = selected.length;
            if (length <= 0) {
                Utility.executeCallback(cleanup);
                return;
            }
            var dn;
            for (i = 0; i < length; i++) {
                var selData = selected.eq(i).attr('data');
                if (selData) {
                    data.push(JSON.parse(selData));
                }
            }
            if (data[0]) {
                dn = data[0].DistinguishedName;
                options.callback(dn, cleanup);
            }else {
                dn =undefined;
                options.callback(dn, cleanup);
            }
        };
        $dialog = DialogsUtil.generalPromptDialog('', okFunc, null, diagOpts);
        $dialog.dialog('open');
    }
};