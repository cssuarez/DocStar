var WorkflowItemsByWorkflow = CustomGridItems.extend({
    model: WorkflowItemByWorkflow,
    proxy: WorkflowServiceProxyV2(),
    sync: function (method, collection, options) {
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
                this.proxy.getWorkflowItemsByWorkflow(sf, ff, complete);
                break;
        }
    },
    clearSubGridExpanded: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            this.set({ subGridExpanded: false }, { silent: true });
        }
    }
});