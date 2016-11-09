var RoleManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {

        var that = this;
        this.editView = new RoleEditView();
        if (window.users === undefined) {
            window.users = new Users();
        }
        if (window.roles === undefined) {
            window.roles = new Roles();
        }
        if (window.slimLDAPConnections === undefined) {
            window.slimLDAPConnections = new SlimEntities();
        }
        if (window.rolesCC === undefined) {
            window.rolesCC = new RolesCC();
        }

        // Bind collection events
        window.roles.on("reset", function () { that.updateViews(); });
        window.roles.on("add", function () { that.updateViewStay(); });
        window.roles.on("remove", function () { that.updateViews(); });
        this.go();
    },

    go: function () {
        var that = this;
        window.rolesCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminGroupManager/gi)) {
                    that.render();
                    that.editView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            reset: true
        });
    },

    updateViews: function () {
        this.editView.viewData.selected = undefined;
        this.editView.render();

    },
    updateViewStay: function () {

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
