var StampManagerView = Backbone.View.extend({
    editView: null,
    initialize: function () {
        this.editView = new StampEditView();
        if (window.stampCC === undefined) {
            window.stampCC = new StampCC();
        }
        if (window.imgStamps === undefined) {
            window.imgStamps = new ImageStamps();
        }
        if (window.txtStamps === undefined) {
            window.txtStamps = new TextStamps();
        }
        this.go();
    },
    go: function () {
        var that = this;
        window.stampCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminStampManager/gi)) {
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