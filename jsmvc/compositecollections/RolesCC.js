var RolesCC = Backbone.Collection.extend({
    model: Role,
    url: Constants.Url_Base + "Role/GetAllRoleData",
    parse: function (response) {
        if (response.status === "ok") {
            // ldap connection data
            var listconn = {};
            listconn.status = response.status;
            listconn.result = response.result.l;
            window.slimLDAPConnections.reset(window.slimLDAPConnections.parse(listconn), { silent: true });
            //role data
            var listr = {};
            listr.status = response.status;
            listr.result = response.result.r;
            window.roles.reset(window.roles.parse(listr), { silent: true });
        } else {
            ErrorHandler.addErrors(response.message);
        }
        return [];
    }
});