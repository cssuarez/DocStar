var DBSyncSettings = Backbone.Collection.extend({
    model: DBSyncSetting,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    proxy: ReportingProxy({ skipStringifyWcf: true }),
    sync: function (method, collection, options) {
        var ff = function (jqXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.wait = false;
                options.success(result);
            }
        };
        switch (method) {
            case 'read':
                this.proxy.getAllSettings(sf, ff, complete, null, options.headers);
                break;
        }
    }
});