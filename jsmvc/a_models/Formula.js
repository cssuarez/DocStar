var Formula = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    defaults: {
        Value: '',
        DisplayValue: ''
    },
    initialize: function () {
        this.listenTo(this, 'change:Value', function (model, value, options) {
            options = options || {};
            if (options.changesReverted) {
                return;
            }
            this.setDirty(true);
        });
        this.listenTo(this, 'change:editing', function (model, value, options) {
            if (!value) {
                this.setDirty(false);   // clear dirty bit on entry or exit of edit mode
                this.set('operation', false);   // exit editing operation
            }
        });
    },
    sync: function (method, model, options) {
        //Sync must exist even though it does nothing, otherwise backbone will attempt to save on destroy and other calls.
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
        switch (method) {
            case "create":
                sf();
                break;
            case "update":
                sf();
                break;
            case "delete":
                sf();
                break;
        }
    },
    setDirty: function (isDirty) {
        this.set('isDirty', isDirty);
    }
});