var WorkflowItemsCPX = SearchResultsCPX.extend({
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
                var excludeGroups = Utility.convertToBool(Utility.GetUserPreference('wfItemsExcludeGroups')) || false;
                // Verify that the user id is actually a user on this instance, otherwise use 'All'
                var user = window.users.get(this.get('queueId'));
                // Verify that the workflow id is actually a workflow on this instance, otherwise use 'All'
                var wf = window.slimWorkflows.get(this.get('wfId'));
                var bulkWorkflowGetPkg = {
                    UserId: user ? this.get('queueId') : undefined,
                    WorkflowId: wf ? this.get('wfId') : undefined,
                    ExcludeGroups: excludeGroups
                };
                bulkWorkflowGetPkg = $.extend({}, bulkWorkflowGetPkg, request);
                this.wfProxy.getWorkflowItems(bulkWorkflowGetPkg, sf, ff, cf);
                break;
            case "update":
                break;
            case "delete":
                break;
        }
    }
});