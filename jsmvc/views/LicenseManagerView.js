var LicenseManagerView = Backbone.View.extend({
    editView: null,
    initialize: function (options) {
        this.editView = new LicenseEditView();
        if (window.licensesCC === undefined) {
            window.licensesCC = new LicensesCC();
        }
        if (window.licStats === undefined) {
            window.licStats = new LicenseStatistics();
        }
        this.go();
    },
    go: function () {
        var that = this;
        window.licensesCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminLicensing/gi)) {
                    that.render();
                    that.editView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            reset: true
        });
    },
    updateView: function () {
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