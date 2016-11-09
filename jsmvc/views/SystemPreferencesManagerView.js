var SystemPreferencesManagerView = Backbone.View.extend({

    createView: null,

    editView: null,

    initialize: function (options) {
        var that = this;
        this.editView = new SystemPreferencesEditView();
        if (window.systemPreferences === undefined) {
            window.systemPreferences = new SystemPreferences();
        }
        // Bind collection events
        window.systemPreferences.on("reset", function () { that.updateViews(); });
        window.systemPreferences.on("add", function () { that.updateViews(); });
        window.systemPreferences.on("remove", function () { that.updateViews(); });
        this.go();
    },

    go: function () {
        var that = this;
        window.systemPreferences.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminSystemPreferencesManager/gi)) {
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
