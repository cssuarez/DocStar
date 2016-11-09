var Folder = Backbone.Model.extend({
    dateTimeFields: { CreatedOn: true, AccessedOn: true, ModifiedOn: true },
    idAttribute: 'Id',
    getType: function () {
        return 'folder';
    },
    validate: function (attrs) {

        // This function executes when you call model.save()

        var msg = {};
        var name = attrs.Title;
        if (name !== undefined) {
            if (name.length === 0) {
                msg.Name = Constants.c.nameEmptyWarning;
            }
            if (name === Constants.c.newTitle) {
                msg.Name = String.format(Constants.c.newNameWarning, Constants.t('newTitle'));
            }
            if (name.length > 256) {
                msg.Name = Constants.c.nameTooLong;
            }
        }

        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    }

});