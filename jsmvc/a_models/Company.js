var Company = Backbone.Model.extend({
    dateTimeFields: { LastRequest: true, LastResponse: true },
    url: Constants.Url_Base + "Company/Company",
    initialize: function (options) {
        if (options !== undefined) {

            // Set this model's id to the Guid returned by the API
            // "id" must be set on the model to denote existing data
            // if "id" is unset, a call to model.save() will attempt to insert a new record
            if (options.Id !== undefined) {
                // "silent" set to true won't send a changed event, so validate won't fire
                this.set({ "id": options.Id }, { "silent": true });
            }

        }
        this.unbind("change");
    },
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};
        if (attrs.Name !== undefined) {
            if (attrs.Name.length === 0) {
                msg.company_name = Constants.c.nameEmptyWarning;
            }
            if ($.trim(attrs.Name) === Constants.c.newName) {
                msg.company_name = String.format(Constants.c.newNameWarning, Constants.t('newTitle'));
            }
        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    }
});