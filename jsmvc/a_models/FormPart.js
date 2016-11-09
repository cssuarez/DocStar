var FormPart = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    defaults: {
        Sequence: 0,
        ResetsApprovals: true,
        BookmarkLabel: ''
    },
    proxy: FormsServiceProxy({ skipStringifyWcf: true }),
    // Perform client side validation for models here
    validate: function (attrs) {
        // This function executes when you call model.save()
        // It will return an object with each validation error that may have occurred
        var msg = {};
        // Add validation here for attrs
        // Any error msg should be added to the msg object with a key that matches the name attribute of an html element
        // eg. msg.Name = 'error message', where an html element has a name attribute of 'Name'
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    sync: function (method, model, options) {
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
                sf();
                break;
            case 'update':
                // Add an update call
                sf();
                break;
            case 'delete':
                // Add a delete call
                sf();
                break;
        }
    }
});