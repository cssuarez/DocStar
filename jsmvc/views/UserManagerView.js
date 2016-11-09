var UserManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {

        var that = this;
        this.editView = new UserEditView();
        if (window.users === undefined) {
            window.users = new Users();
        }
        if (window.slimLDAPConnections === undefined) {
            window.slimLDAPConnections = new SlimEntities();
        }
        if (window.usersCC === undefined) {
            window.usersCC = new UsersCC();
        }

        // Bind collection events
        window.users.on("reset", function () { that.updateViews(); }, this);
        window.users.on("add", function () { that.updateViewStay(); }, this);
        window.users.on("remove", function () { that.updateViews(); }, this);

        this.go();
    },

    go: function () {
        var that = this;
        window.usersCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminUserManager/gi)) {
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
