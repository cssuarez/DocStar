var LDAPGroup = CustomGridItem.extend({
    idAttribute: 'AccountName',
    proxy: LDAPServiceProxy(),
    sync: function (method, model, options) {
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
        switch (method) {
            case 'create':
                // Add a create call
                break;
            case 'update':
                // Add an update call
                break;
            case 'delete':
                // Add a delete call
                break;
        }
    }
});