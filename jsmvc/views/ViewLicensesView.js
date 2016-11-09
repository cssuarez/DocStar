var ViewLicensesView = Backbone.View.extend({
    editView: null,
    initialize: function (options) {
        this.editView = new ViewLicensesEditView();
        if (window.slimLDAPConnections === undefined) {
            window.slimLDAPConnections = new SlimEntities();
        }
        if (window.usersCC === undefined) {
            window.usersCC = new UsersCC();
        }

        this.go();
    },
     go: function () {
        var that = this;
        window.usersCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminViewLicenses/gi)) {
                    that.render();
                    that.editView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            reset: true
        });
    },
    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});