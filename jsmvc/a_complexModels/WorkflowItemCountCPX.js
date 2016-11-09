var WorkflowItemCountCPX = CustomGridItem.extend({
    idAttribute: 'AssigneeId',
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.AssigneeWorkflows) {
            attr = attrs.AssigneeWorkflows;
            if (this.get('AssigneeWorkflows') instanceof Backbone.Collection) {
                this.get('AssigneeWorkflows').set(attr, options);
                delete attrs.AssigneeWorkflows;
            }
            else {
                attrs.AssigneeWorkflows = new AssigneeWorkflows();
                attrs.AssigneeWorkflows.set(attr, options);
                this.bindSubModelEvents(attrs.AssigneeWorkflows, 'AssigneeWorkflows');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    toJSON: function () {
        return this.toJSONComplex();
    },
    sync: function (method, model, options) {
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