var DataLinksCC = Backbone.Collection.extend({
    proxy: BulkDataServiceProxy({ skipStringifyWcf: true }),
    model: DataLink,
    parse: function (r) {
        window.automationConnections = r.AutomationConnections;
        window.dataLinkQueries.reset(window.dataLinkQueries.parse(r.DataLinkQueries), { silent: true });
        window.dataLinks.reset(window.dataLinks.parse(r.DataLinkConnections));
        return [];
    },
    fetch: function (options) {
        var that = this;
        var sf = function (r) {
            that.parse(r);
            if (options.success) {
                options.success();
            }
        };
        var ff = function (qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        this.proxy.getDataLinkData(sf, ff);
    }
});