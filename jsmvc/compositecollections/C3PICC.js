var C3PICC = Backbone.Collection.extend({
    proxy: BulkDataServiceProxy(),
    model: DataLink,
    parse: function (r) {
        window.automationConnections = r.AutomationConnections; 
        window.c3piQueries.reset(window.c3piQueries.parse(r.DataLinkQueries), { silent: true });
        window.c3pis.reset(window.c3pis.parse(r.DataLinkConnections));
        window.c3piLicenses = r.Licenses;
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
        this.proxy.getBulkIntegrationData(sf, ff);
    }
});