var WFNotificationRules = Backbone.Collection.extend({
    model: WFNotificationRuleCPX,
    proxy: WorkflowServiceProxyV2({ skipStringifyWcf: true }),
    sync: function (method, collection, options) {
        options = options || {};
        options.syncMethod = method;
        var that = this;
        var ff = function (jqXHR, textStatus, error) {
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
                this.proxy.getWFNotificationRules(Utility.getCurrentUser().Id, sf, ff, complete);
                break;
        }
    },
    addNewField: function () {
        this.getNewList(new WFNotificationRuleCPX({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle, OwnerId: Utility.getCurrentUser().Id }));
    }
});