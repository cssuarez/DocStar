var FormElementGroupMember = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'FormElementId',
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