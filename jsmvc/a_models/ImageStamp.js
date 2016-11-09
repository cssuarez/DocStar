/// <reference path="../../Content/JSProxy/StampServiceProxy.js" />
/// Model for AnnoImageStamp.cs
var ImageStamp = CustomGridItem.extend({
    dateTimeFields: { ModifiedOn: true },
    idAttribute: 'Id',
    proxy: StampServiceProxy({ skipStringifyWcf: true }),
    validate: function (attrs) {
        //validate gets called when updating the model too.  
        if (attrs.Id === undefined) {
            return;
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
                ff(null, null, { Message: 'Invalid Operation: Create for image stamps must go through iframe post' });
                break;
            case 'update':
                this.proxy.updateImageStamp(model.toJSON(), sf, ff, complete);
                break;
            case 'delete':
                this.proxy.deleteImageStamp(model.get('Id'), sf, ff, complete);
                break;
        }
    }
});