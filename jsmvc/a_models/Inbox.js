var Inbox = Backbone.Model.extend({
    dateTimeFields: { CreatedOn: true, ModifiedOn: true },
    idAttribute: 'Id',
    getType: function () {
        return 'inbox';
    },
    validate: function (attrs) {

        // This function executes when you call model.save()

        var msg = {};

        if (attrs.Name !== undefined) {
            if (attrs.Name.length === 0) {
                msg.Name = Constants.c.nameEmptyWarning;
            }
        } else {
            var y = window.slimInboxes.find(function (e) {
                if ($.trim(attrs.Name) === $.trim(e.get('Name')) && (attrs.Id !== e.get('Id'))) {
                    return true;
                }
            });
            if (y) {
                msg.Name = Constants.c.duplicateNameError;
            }
        }

        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    }
});