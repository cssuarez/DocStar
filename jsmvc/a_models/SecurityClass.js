/// <reference path="../../Content/JSProxy/SecurityServiceProxy.js" />
// SecurityClass model
var SecurityClass = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    proxy: SecurityServiceProxy({ skipStringifyWcf: true }),
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};
        if (attrs.Name !== undefined) {
            if (attrs.Name.length === 0) {
                msg.Name = "Name cannot be empty";
            }
        } else {
            var y = window.securityClasses.find(function (e) {
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
    },
    sync: function (method, model, options) {
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
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
                this.proxy.createSecurityClass(model.toJSON(), sf, ff, complete);
                break;
            case 'update':
                this.proxy.updateSecurityClass(model.toJSON(), sf, ff, complete);
                break;
            case 'delete':
                var delObj = { SecurityClassId: model.get('Id') };
                if (options && options.ReplacementSecurityClassId && options.ReplacementSecurityClassId !== Constants.c.emptyGuid) {
                    delObj.ReplacementSecurityClassId = options.ReplacementSecurityClassId;
                }
                this.proxy.deleteSecurityClass(delObj, sf, ff, complete);
                break;
        }
    }
});
