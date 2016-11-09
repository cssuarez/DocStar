/// <reference path="../../Content/JSProxy/LDAPServiceProxy.js" />
var LDAPConnection = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    initialize: function (options) {
        if (options !== undefined) {
            // Set this model's id to the Guid returned by the API
            // "Id" must be set on the model to denote existing data
            // if "Id" is unset, a call to model.save() will attempt to insert a new record
            if (options.Connection !== undefined && options.Connection.Id) {
                // "silent" set to true won't send a changed event, so validate won't fire
                this.set({ "Id": options.Connection.Id }, { "silent": true });
            }
        }
    },
    proxy: LDAPServiceProxy({ skipStringifyWcf: true }),
    sync: function (method, model, options) {
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error);
            }
        };
        var complete = function () {
            $.ajax({
                url: Constants.Url_Base + "SystemMaintenance/NotifyProxyChange" + Utility.getCacheBusterStr(),
                type: "GET"
            });
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
                this.proxy.create(model, sf, ff, complete);
                break;
            case 'update':
                this.proxy.update(model, sf, ff, complete);
                break;
            case 'delete':
                this.proxy.deleteConnection(model.get('Connection').Id, sf, ff, complete);
                break;
        }

    }
});