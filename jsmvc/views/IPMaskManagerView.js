var IPMaskManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {

        var that = this;
        this.editView = new IPMaskEditView();

        if (window.ipMasks === undefined) {
            window.ipMasks = new IPMasks();
        }

        window.ipMasks.on("add", function () { that.updateViews(); });
        window.ipMasks.on("reset", function () { that.updateViews(); });
        window.ipMasks.on("remove", function () { that.updateViews(); });

        this.go();
    },

    go: function () {
        var that = this;
        window.ipMasks.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminIpRestrictionsManager/gi)) {
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

    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});