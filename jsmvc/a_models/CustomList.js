// CustomList model
var CustomList = Backbone.Model.extend({
    dateTimeFields: { CreatedOn: true, ModifiedOn: true },
    idAttribute: 'Id',
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};
        if (attrs.Name !== undefined) {
            if (attrs.Name.length === 0) {
                msg.listName = Constants.c.titleEmptyWarning;
            } else if (attrs.Name === Constants.c.newTitle) {
                msg.listName = Constants.c.titleNewWarning;
            } else {
                var y = window.customLists.find(function (e) {
                    if ($.trim(attrs.Name).toLowerCase() === $.trim(e.get('Name')).toLowerCase() && (attrs.Id !== e.get('Id'))) {
                        return true;
                    }
                });
                if (y) {
                    msg.listName = Constants.c.duplicateNameError;
                }
            }
        }

        var validListItems = true;
        var validList = false;
        if (attrs.Name.match(/([<])([^\>]{1,})*([\>])/i) !== null) {
            msg.listName = Constants.c.invalidNameError;
        }

        for (j = 0; j < attrs.Items.length; j++) {
            if (attrs.Items[j].match(/([<])([^\>]{1,})*([\>])/i) !== null) {
                msg['List Items'] = Constants.c.invalidListItemsError;
                break;
            }
        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    sync: function (method, model, options) {
        var proxy = AdminServiceProxy({ skipStringifyWcf: true });
        options.method = method;
        var sf = function (result) {
            options.success(result); //This success is pass in by backbone to the sync function.
        };
        var ff = function (xhr, status, err) {
            if (options.failure) {
                options.failure(xhr, status, err);
            } else {
                ErrorHandler.addErrors(err);
            }
        };
        switch (method) {
            case "read":
                proxy.getCustomListById(model.get('Id'), sf, ff, options.complete);
                break;
            case "create":
            case "update":
                proxy.setCustomList(model.toJSON(), sf, ff, options.complete);
                break;
            case "delete":
                proxy.deleteCustomList(model.get('Name'), sf, ff, options.complete);
                break;
        }
    }
});