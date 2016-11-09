var SecurityClasses = Backbone.Collection.extend({
    proxy: SecurityServiceProxy({ skipStringifyWcf: true }),
    model: SecurityClass,
    comparator: Backbone.Collection.prototype.defaultComparator,
    errorMsg: null,
    fetch: function (options) {
        var that = this;
        var sf = function (r) {
            that.reset(r);
            if (options.success) {
                options.success();
            }
        };
        var ff = function (qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        this.proxy.getAllSecurityClasses(sf, ff);
    }
});