/// <reference path="../../Content/JSProxy/BulkDataServiceProxy.js" />
var LDAPConnectionsCC = Backbone.Collection.extend({
    proxy: BulkDataServiceProxy({ skipStringifyWcf: true }),
    model: LDAPConnection,
    errorMsg: null,
    parse: function (r) {
        window.ldapConnections.reset(window.ldapConnections.parse(r.LDAPConnections), { silent: true });
        window.ldapProxies.reset(window.ldapProxies.parse(r.LDAPProxies), { silent: true });
        window.companyInstances.reset(window.companyInstances.parse(r.CompanyInstances));
        window.InstanceId = r.InstanceId;
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
        this.proxy.getLDAPData(sf, ff);
    }
});