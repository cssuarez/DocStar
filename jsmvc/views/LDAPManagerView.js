var LDAPManagerView = Backbone.View.extend  ({
    editView: null,
    initialize: function (options) {        
        this.editView = new LDAPEditView();
        
        if (window.ldapConnections === undefined) {
            window.ldapConnections = new LDAPConnections();
        }
        if (window.companyInstances === undefined) {
            window.companyInstances = new CompanyInstances();
        }
        if (window.ldapConnectionsCC === undefined) {
            window.ldapConnectionsCC = new LDAPConnectionsCC();
        }
        if (window.ldapProxies === undefined) {
            window.ldapProxies = new SlimEntities();
        }
        this.go();
    },
    go: function () {
        var that = this;
        window.ldapConnectionsCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminLDAPManager/ig)) {
                    that.render();
                    that.editView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            reset: true
        });
    },
    updateViews: function () {        
        this.editView.render();
    },
    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});