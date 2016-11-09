var CustomListManagerView = Backbone.View.extend({

    editView: null,
    initialize: function (options) {
        var that = this;
        this.editView = new CustomListEditView();
        if (window.customLists === undefined) {
            window.customLists = new CustomLists();
        }
        // Bind collection events
        window.customLists.on("add", function () { that.updateViewStay(); });
        window.customLists.on("remove", function () { that.updateViews(); });
        this.go();
    },
    go: function () {
        var that = this;
        window.customLists.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminCustomListManager/gi)) {
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