/// <reference path="../../Content/JSProxy/BulkDataServiceProxy.js" />
var UsersCC = Backbone.Collection.extend({
    proxy: BulkDataServiceProxy({ skipStringifyWcf: true }),
    model: User,
    errorMsg: null,
    parse: function (r) {
        window.slimLDAPConnections.reset(window.slimLDAPConnections.parse(r.LDAPConnections), { silent: true });
        // named available
        window.namedAvailable = r.NamedAvailable;
        // named total
        window.namedTotal = r.NamedTotal;
        // concurrent available
        window.concurrentAvailable = r.ConcurrentAvailable;
        // concurrent total
        window.concurrentTotal = r.ConcurrentTotal;
        //users data
        window.users.reset(window.users.parse(r.Users), { silent: true });
        //var filteredUsers = Utility.getUsers(null, window.users, true, true);
        //window.users.reset(window.users.parse(filteredUsers));
        return [];
    },
    fetch: function (options) {
        var that = this;
        var sf = function(r) {
            that.parse(r);
            if (options.success) {
                options.success();
            }
        };
        var ff = function(qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        this.proxy.getUserData(sf, ff);
    }
});