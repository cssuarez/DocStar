var ImportLDAPGroupsPackageCPX = ImportLDAPPackageCPX.extend({
    idAttribute: 'ConnectionId',
    defaults: { Groups: [] },
    proxy: LDAPServiceProxy(),
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.Groups) {
            if (this.get('Groups') instanceof Backbone.Collection) {
                this.get('Groups').reset(attrs.Groups, options);
                delete attrs.Groups;
            }
            else {
                attrs.Groups = new LDAPGroups(attrs.Groups, options);
                this.bindSubModelEvents(attrs.Groups, 'Groups');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        options = options || {};
        options.syncMethod = method;
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            window.roles.reset(window.roles.parse(result));
            window.slimRoles.reset(window.slimRoles.parse(result));
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
                    Groups: this.getSelectedGroups()
                };
                this.proxy.importGroups(pkg, sf, ff, complete);
                break;
        }
    },
    ///<summary>
    /// Obtain every selected LDAP Group
    ///</summary>
    getSelectedGroups: function () {
        return this.get('Groups').getSelected();
    }
});