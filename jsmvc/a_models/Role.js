// Role model
var Role = Backbone.Model.extend({
    dateTimeFields: { CreatedOn: true },
    idAttribute: 'Id',
    proxy: SecurityServiceProxy({ skipStringifyWcf: true }),
    validate: function (attrs) {
        //validate gets called when updating the model too.
        var errors = {};
        if (attrs === undefined) {
            return;
        }
        if (attrs.Name === '') {
            errors.Name = Constants.t('nameEmptyWarning');
        }
        if (attrs.Name === Constants.c.newTitle) {
            errors.Name = String.format(Constants.c.newNameWarning, Constants.t('newTitle'));
        }
        if (attrs.EnableIntegrated && !(attrs.ConnectionId && attrs.DistinguishedName)) {
            if (!attrs.ConnectionId) {
                errors.LDAPConnection = Constants.c.domainEmptyWarning;
            }
            if (!attrs.DistinguishedName) {
                errors.DistinguishedName = Constants.c.distinguishedNameEmptyWarning;
            }
        }
        if (attrs.Name.length > 256) {
            errors.Name = Constants.c.nameTooLong;
        }
        if (!$.isEmptyObject(errors)) {
            return errors;
        }
        return;
    },
    sync: function (method, model, options) {
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure && error) {
                options.failure(error && error.Message);
            }
            else if (qXHR && qXHR.responseText) {
                options.failure(qXHR.responseText);
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
                this.proxy.createRole(model.toJSON(), sf, ff, complete);
                break;
            case 'update':
                this.proxy.updateRole(model.toJSON(), sf, ff, complete);
                break;
            case 'delete':
                var delObj = { RoleId: model.get('Id') };
                if (options && options.ReplacementRoleId && options.ReplacementRoleId !== Constants.c.emptyGuid) {
                    delObj.ReplacementRoleId = options.ReplacementRoleId;
                }
                var success = function (result) {
                    if (window.roles) {
                        window.roles.reset(window.roles.parse(result));
                    }
                    if (window.slimRoles) {
                        window.slimRoles.reset(window.slimRoles.parse(result));
                    }
                    sf(result);
                };
                this.proxy.deleteRole(delObj, success, ff, complete);
                break;
        }
    }
});