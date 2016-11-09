// BuzzSpaces model
var BuzzSpaces = Backbone.Model.extend({
    url: Constants.Url_Base + "AdminApiBuzz/BuzzSpaces",
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
    },
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};
        if (attrs.Title !== undefined) {
            if (attrs.Title.length === 0) {
                msg.buzz_title = Constants.c.titleEmptyWarning;
            }
            if ($.trim(attrs.Title) === Constants.c.newTitle) {
                msg.buzz_title = Constants.c.titleNewWarning;
            }
        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    }
});