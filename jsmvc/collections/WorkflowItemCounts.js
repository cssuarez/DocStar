var WorkflowItemCounts = CustomGridItems.extend({
    model: WorkflowItemCountCPX,
    proxy: WorkflowServiceProxyV2(),
    sync: function (method, collection, options) {
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
        var sf = function (results) {
            var collection = that.formModel(results);
            that.reset(collection);
            if (options && options.success) {
                options.success(results);
            }
        };
        switch (method) {
            case 'read':
                // Add a getter
                this.proxy.getWorkflowItemCounts(sf, ff, complete);
                break;
        }
    },
    clearSubGridExpanded: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            this.set({ subGridExpanded: false }, { silent: true });
        }
    },
    ///<summary>
    /// Group result by the corresponding assignee and parse into a WorkflowItemCount
    ///<param name="result">Result of this.fetch</param>
    ///</summary>
    formModel: function (results) {
        // Group result by assignee
        var group = {};
        var idx = 0;
        var length = results.length;
        for (idx; idx < length; idx++) {
            var wfItemCount = results[idx];
            var assignee = wfItemCount.AssigneeId;
            if (!group[assignee]) {
                group[assignee] = {};
            }
            if (!group[assignee].AssigneeWorkflows) {
                group[assignee].AssigneeWorkflows = [];
            }
            group[assignee].AssigneeName = wfItemCount.AssigneeName;
            group[assignee].AssigneeWorkflows.push({
                WorkflowId: wfItemCount.WorkflowId,
                WorkflowName: wfItemCount.WorkflowName,
                WorkflowCount: wfItemCount.Count
            });
        }
        // Parse grouping above to form a WorkflowItemCount model
        var collection = [];
        var item;
        for (item in group) {
            if (group.hasOwnProperty(item)) {
                var totWfs = 0;
                idx = 0;
                length = group[item].AssigneeWorkflows.length;
                for (idx; idx < length; idx++) {
                    totWfs += group[item].AssigneeWorkflows[idx].WorkflowCount;
                }
                collection.push({
                    AssigneeId: item,
                    AssigneeName: group[item].AssigneeName,
                    AssigneeWorkflows: group[item].AssigneeWorkflows,
                    TotalWorkflows: totWfs
                });
            }
        }
        return collection;
    }
});