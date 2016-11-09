var DataLinkManagerView = Backbone.View.extend({
    editView: null,
    initialize: function () {
        var that = this;
        this.editView = new DataLinkEditView();
        if (window.dataLinks === undefined) {
            window.dataLinks = new DataLinks();
        }
        if (window.dataLinkQueries === undefined) {
            window.dataLinkQueries = new DataLinkQueries();
        }
        if (window.dataLinksCC === undefined) {
            window.dataLinksCC = new DataLinksCC();
        }
        window.dataLinks.on("add", function () { that.updateView(); });
        //window.dataLinks.bind("reset", function () { that.updateView(); }); //2 call to editview.render() on page reload. I think we don't need it.
        window.dataLinks.on("remove", function () { that.updateView(); });
        window.dataLinkQueries.on("add", function () { that.updateQueryView(); });
        window.dataLinkQueries.on("reset", function () { that.updateQueryView(); });
        window.dataLinkQueries.on("remove", function () { that.updateQueryView(); });
        this.go();
    },
    go: function () {
        var that = this;
        window.dataLinksCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminDataLinkManager/gi)) {
                    that.render();
                    that.editView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            reset: true
        });
    },
    updateView: function () {
        this.editView.viewData.selected = undefined;
        this.editView.viewData.selectedQuery = undefined;
        this.editView.render();
    },
    updateQueryView: function () {
        this.editView.viewData.selectedQuery = undefined;
        this.editView.render();
    },
    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
    }
});