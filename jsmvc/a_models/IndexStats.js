var IndexStats = Backbone.Model.extend({
    proxy: SearchServiceProxy({ skipStringifyWcf: true }),
    parse: function (response) {
        var i = 0;
        var length = response.length;
        var indexStats = {};
        for (i; i < length; i++) {
            indexStats[response[i].Key] = response[i].Value;
        }
        window.indexStats = new IndexStats(indexStats);
    },
    fetch: function (options) {
        var that = this;
        var sf = function (r) {
            // r is an array of objects, form that array into a single object with each value in r as a KEY VALUE pair
            that.parse(r);
            if (options.success) {
                options.success();
            }
        };
        var ff = function (qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        this.proxy.getIndexInfo(false, sf, ff);
    }
});