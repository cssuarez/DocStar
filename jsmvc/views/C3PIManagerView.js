var C3PIManagerView = Backbone.View.extend({
    masterView: null,
    initialize: function () {
        var that = this;
        this.masterView = new C3PIMasterView();
        if (window.c3pis === undefined) {
            window.c3pis = new DataLinks();
        }
        if (window.c3piQueries === undefined) {
            window.c3piQueries = new DataLinkQueries();
        }
        if (window.c3piCC === undefined) {
            window.c3piCC = new C3PICC();
        }
        window.c3pis.on("add", function (model, options) { that.updateView(model); });
        window.c3pis.on("remove", function (model, options) { that.updateView(); });
        window.c3piQueries.on("add", function (model, options) { that.updateView(); });
        window.c3piQueries.on("remove", function (model, options) { that.updateView(); });
        this.go();
    },
    go: function () {
        var that = this;
        window.c3piCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminThirdPartyIntegrationManager/gi)) {
                    that.render();
                    that.masterView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            reset: true
        });
    },
    updateView: function (newModel) {
        this.masterView.selected = newModel; // may be undefined
        this.masterView.render();
    },
    render: function () {
        $(this.el).html("");
        if (this.masterView !== null) {
            $(this.el).append(this.masterView.el);
        }
    }
});