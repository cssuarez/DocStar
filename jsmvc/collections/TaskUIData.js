var TaskUIData = Backbone.Collection.extend({
    model: TaskUIDatum,
    comparator: Backbone.Collection.prototype.defaultComparator,
    /// <summary>
    /// Checks if the collection has a single task and that task is a user approval task.
    /// </summary>
    IsUserApprovalOnlyInput: function () {
        return this.length === 1 && !!this.at(0) && this.at(0).get('UIKey') === 'UserApprovalTask';//Note 10229 -- comma separated list of runtime keys not supported
    }
});