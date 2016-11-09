var LDAPContainers = Backbone.Collection.extend({
    model: LDAPContainer,
    proxy: LDAPServiceProxy(),
    sync: function (method, collection, options) {
        options = options || {};
        options.syncMethod = method;
        var ff = function (jqXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.wait = false;
                options.success(result);
            }
        };
        switch (method) {
            case 'read':
                var ldapGetQuery = {
                    ConnectionId: options.connectionId,
                    Node: options.node,
                    Subtree: options.subtree
                };
                this.proxy.getContainers(ldapGetQuery, sf, ff, complete);
                break;
        }
    },
    JSTreeFormat: function () {
        var idx = 0;
        var length = this.length;
        var jsTreeDataChildren = [];
        for (idx; idx < length; idx++) {
            var ldapContainer = this.at(idx);
            var jsTreeDatum = {
                data: ldapContainer.get('AccountName'),
                attr: {
                    Id: ldapContainer.get('DistinguishedName'),
                    Depth: 0,
                    Data: JSON.stringify(ldapContainer.toJSON()),
                    Title: ldapContainer.get('AccountName')
                },
                state: 'closed',
                children: []
            };
            jsTreeDataChildren.push(jsTreeDatum);
        }
        var jsTreeData = {
            data: 'LDAP',
            attr: {
                Id: 'Root',
                Title: 'LDAP',
                Depth: 1
            },
            state: 'open',
            children: jsTreeDataChildren
        };
        return jsTreeData;
    }
});