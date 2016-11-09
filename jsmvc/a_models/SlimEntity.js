var SlimEntity = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    sync: function (method, model, options) {
        //Sync must exist even though it does nothing, otherwise backbone will attempt to save on destroy and other calls.
        switch (method) {
            case "create":
                break;
            case "read":
                break;
            case "update":
                break;
            case "delete":
                break;
        }
    }
});