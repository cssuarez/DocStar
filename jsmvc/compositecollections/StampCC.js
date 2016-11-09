/// <reference path="../../Content/JSProxy/StampServiceProxy.js" />
var StampCC = Backbone.Collection.extend({
    proxy: StampServiceProxy({ skipStringifyWcf: true }),
    errorMsg: null,
    fetch: function (options) {
        var sf = function (r) {
            window.imgStamps.reset(window.imgStamps.parse(r.ImageStamps), { silent: true });
            window.txtStamps.reset(window.txtStamps.parse(r.TextStamps));
            if (options.success) {
                options.success();
            }
        };
        var ff = function (qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        this.proxy.getAllForUser({ IncludeAdmin: true, IncludeImage: false, IncludeDeleted: false }, sf, ff);
    }
});