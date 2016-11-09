var RetentionFreezeManagerView = Backbone.View.extend({
    editView: null,
    initialize: function (options) {
        var that = this;
        this.editView = new RetentionFreezeEditView();
        if (window.recordfreezes === undefined) {
            window.recordfreezes = new RecordFreezes();
        }
        window.recordfreezes.on('add', function () {
            that.updateViewStay();
        });
        window.recordfreezes.on('remove', function () {
            that.updateViews();
        });
        window.recordfreezes.on('reset', function () {
            that.updateViews();
        });
        this.go();
    },
    go: function () {
        var that = this;
        window.recordfreezes.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminRecordsRetentionFreezes/gi)) {
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
