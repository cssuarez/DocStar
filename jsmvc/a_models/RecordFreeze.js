// Model for Freeze.cs
var RecordFreeze = Backbone.Model.extend({
    dateTimeFields: { EffectiveDate: true },
    adminProxy: AdminServiceProxy({ skipStringifyWcf: true }),
    idAttribute: 'Id',
    defaults: {
        Name: '',
        Reason: '',
        EffectiveDate: new Date(),
        Active: true
    },
    validate: function (attrs) {
        //validate gets called when updating the model too.  
        var errors = {};
        if (attrs.Name === '') {
            errors.Name = Constants.t('nameEmptyWarning');
        }
        if (attrs.Name === Constants.c.newTitle) {
            errors.Name = String.format(Constants.c.newNameWarning, Constants.t('newTitle'));
        }
        if (attrs.Reason === '') {
            errors.Reason = Constants.t('reasonEmptyWarning');
        }
        if (window.slimFreezes) {
            var length = window.slimFreezes.length;
            var i = 0;
            for (i; i < length; i++) {
                var ef = window.slimFreezes.at(i);
                if (ef.get('Id') !== attrs.Id && attrs.Name.toLowerCase() === ef.get('Name').toLowerCase()) {
                    errors.Name = Constants.c.duplicateNameError;
                    break;
                }
            }
        }
        if (!$.isEmptyObject(errors)) {
            return errors;
        }
        return;
    },
    sync: function (method, model, options) {
        var that = this;
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
            else {
                ErrorHandler.popUpMessage(error);
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
            that.updateSlimCollection();
        };
        switch (method) {
            case '"read':
                this.adminProxy.getFreeze(model.get('Id'), sf, ff, complete);
                break;
            case 'create':
                this.adminProxy.createFreeze(model.toJSON(), sf, ff, complete);
                break;
            case 'update':
                this.adminProxy.updateFreeze(model.toJSON(), sf, ff, complete);
                break;
            case 'delete':
                this.adminProxy.releaseFreeze(model.get('Id'), sf, ff, complete);
                break;
        }
    },
    updateSlimCollection: function () {
        if (window.slimFreezes) {
            var id = this.get('Id');
            var name = this.get('Name');
            var ef = window.slimFreezes.get(id);
            if (ef) {
                ef.set('Name', name);
            }
            else {
                window.slimFreezes.add({ Id: id, Name: name });
            }
        }
    }
});