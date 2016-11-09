var SavedSearch = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    proxy: SearchServiceProxy({ skipStringifyWcf: true }),
    validate: function (attrs) {
        //validate gets called when updating the model too.
        var error;
        if (attrs.Id === undefined) {
            return;
        }
        if (attrs.Name === '') {
            error = Constants.t('nameEmptyWarning');
        }
        if (attrs.Name === Constants.c.newTitle) {
            error = String.format(Constants.c.newNameWarning, Constants.t('newTitle'));
        }
        if (error) {
            return error;
        }
        return;
    },
    isUnique: function (name) {
        var id = this.get('Id');
        var length = window.savedSearches.length;
        var i = 0;
        for (i; i < length; i++) {
            var m = window.savedSearches.at(i);
            if (m.get('Id') !== id) {
                if (m.get('Name').toLowerCase() === name.toLowerCase()) {
                    return false;
                }
            }
        }
        return true;
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
                var attrs = model.toJSON();
                this.proxy.createSavedSearch(attrs, sf, ff, complete);
                break;
            case 'update':
                this.proxy.updateSavedSearch(model.toJSON(), sf, ff, complete);
                break;
            case 'delete':
                var id = model.get('Id');
                this.proxy.deleteSavedSearch(id, sf, ff, complete);
                break;
        }
    },
    createOrUpdate: function (requestModel, name, dialogFunc) {
        if (!this.isUnique(name)) {
            dialogFunc();
            return;
        }
        var attrs = requestModel.toJSON();
        if (this.get('Id') === Constants.c.emptyGuid || this.get('Id') !== attrs.Id) {
            attrs.Id = undefined;
        }
        // Remove resultId from SavedSearch (not from the request) so the server always use the savedSearch's request. Bug 12837
        attrs.ResultId = undefined; 
        attrs.Name = name;
        return this.save(attrs);
    }
});