var ImportLDAPUsersPackageCPX = ImportLDAPPackageCPX.extend({
    idAttribute: 'ConnectionId',
    defaults: { Users: [] },
    proxy: LDAPServiceProxy(),
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.Users) {
            if (this.get('Users') instanceof Backbone.Collection) {
                this.get('Users').reset(attrs.Users, options);
                delete attrs.Users;
            }
            else {
                attrs.Users = new LDAPUsers(attrs.Users, options);
                this.bindSubModelEvents(attrs.Users, 'Users');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        options = options || {};
        options.syncMethod = method;
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error ? error.Message: null); //In case of overrideable message dialog close, error is undefined
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            var users = Utility.getUsers(null, new Users(result), true, true);
            window.users.reset(window.users.parse(users));
            $.ajax({
                url: Constants.Url_Base + "SystemMaintenance/NotifyProxyChange" + Utility.getCacheBusterStr(),
                type: "GET"
            });
            if (options && options.success) {
                options.success(result);
            }
        };
        switch (method) {
            case 'update':
                var pkg = {
                    ConnectionId: this.get('ConnectionId'),
                    Users: this.getSelectedUsers()
                };
                this.proxy.importUsers(pkg, sf, ff, complete);
                break;
        }
    },
    ///<summary>
    /// Obtain every selected LDAP User
    ///</summary>
    getSelectedUsers: function () {
        return this.get('Users').getSelected();
    }

});