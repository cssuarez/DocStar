// Model for CompanySetting.cs
var SystemPreference = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    url: Constants.Url_Base + "Preferences/SetSystemPreferences",
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};
        if (attrs.Name !== undefined) {
            if (attrs.Name.length === 0) {
                msg.Name = "Name cannot be empty";
            }
        }
        if (!$.isEmptyObject(msg)) {
            return msg;
        }
        return;
    }
});
