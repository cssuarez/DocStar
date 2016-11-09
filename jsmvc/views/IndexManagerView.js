var IndexManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {
        var that = this;
        this.editView = new IndexView();

        if (window.indexStats === undefined) {
            window.indexStats = new IndexStats();
        }
        window.indexStats.on("change", function () { that.updateView(); });
        this.go();
    },

    go: function () {
        var that = this;
        window.indexStats.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminIndexManager/gi)) {
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