var DBSyncManagerView = Backbone.View.extend({
    editView: null,
    initialize: function (options) {
        this.editView = new DBSyncEditView();
        if (window.dbSyncSettings === undefined) {
            window.dbSyncSettings = new DBSyncSettings();
        }
        // bind to collection events here
        var that = this;
        window.dbSyncSettings.on('reset', function (models) {
            that.updateViews();
        });
        window.dbSyncSettings.on('add', function (model) {
            that.updateViews();
        });
        window.dbSyncSettings.on('remove', function () {
            that.updateViews();
        });
        this.go();
    },
    go: function () {
        var that = this;
        window.dbSyncSettings.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminDBSyncManager/ig)) {
                    that.render();
                    that.editView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            failure: function (jqXHR, textStatus, errorThrown) {
                ErrorHandler.addErrors(errorThrown.Message.toString());
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
