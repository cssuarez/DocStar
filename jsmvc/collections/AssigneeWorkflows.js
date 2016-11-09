var AssigneeWorkflows = Backbone.Collection.extend({
    model: AssigneeWorkflow,
    errorMsg: null,
    sync: function (method, collection, options) {
        switch (method) {
            case 'read':
                // Add a getter
                break;
        }
    }
});