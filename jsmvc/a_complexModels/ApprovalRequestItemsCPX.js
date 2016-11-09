var ApprovalRequestItemsCPX = SearchResultsCPX.extend({
    wfProxy: WorkflowServiceProxyV2(),
    sync: function (method, model, options) {
        var that = this;
        options.syncMethod = method;
        this.cancelCalls();
        switch (method) {
            case "create":
                break;
            case "read":
                var sf = function (result) {
                    that.set(result, options);
                    options.success(result); //This success is pass in by backbone to the sync function. This triggers the sync event.
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.popUpMessage(errorThrown);
                };
                var cf = function () {
                    Utility.executeCallback(options.complete);
                };
                var request = this.get('Request').toJSON();
                var excludeGroups = Utility.convertToBool(Utility.GetUserPreference('arItemsExcludeGroups')) || false;
                bulkWorkflowGetPkg = $.extend({}, request);
                bulkWorkflowGetPkg.ExcludeGroups = excludeGroups;
                this.wfProxy.getApprovalRequestItems(bulkWorkflowGetPkg, sf, ff, cf);
                break;
            case "update":
                break;
            case "delete":
                break;
        }
    }
});