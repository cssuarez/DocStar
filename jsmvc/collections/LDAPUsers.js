var LDAPUsers = CustomGridItems.extend({
    model: LDAPUser,
    proxy: LDAPServiceProxy(),
    sync: function (method, collection, options) {
        options = options || {};
        options.syncMethod = method;
        var ff = function (jqXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            } else {
                ErrorHandler.popUpMessage(error);
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
                    Subtree: options.subtree === undefined ? true : options.subtree
                };
                this.proxy.getUsers(ldapGetQuery, sf, ff, complete);
                break;
        }
    }
});