var ImportLDAPPackageCPX = Backbone.Model.extend({
    ///<summary>
    /// Allow user to browse for and select Users or Groups for import
    /// <param name="dialogFunc">Should always be LDAPDialogs.browseLDAPImport, exception in unit tests where a UI will not be presented.</param>
    /// <param name="isUser">Whether or not to browse for Users or Groups</param>
    browseLDAPImport: function (dialogFunc, isUser) {
        var that = this;
        dialogFunc({
            ldapData: this.get('browseData'),
            getChildrenData: {
                id: this.get('ConnectionId'),
                isUser: !!isUser
            },
            callback: function (dn, cleanup) {
                that.set('distinguishedName', dn, { cleanup: cleanup });
                if (!that.hasChanged()) {
                    that.trigger('change:distinguishedName', that,dn, { cleanup: cleanup });
                }
            }
        });
    }
});