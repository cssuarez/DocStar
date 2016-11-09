var RetentionManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {

        var that = this;
        this.editView = new RetentionEditView();
        if (window.securityClasses === undefined) {
            window.securityClasses = new SecurityClasses();
        }
        if (window.customFieldMetas === undefined) {
            window.customFieldMetas = new CustomFieldMetas();
        }
        if (window.recordcategories === undefined) {
            window.recordcategories = new RecordCategories();
        }
        if (window.recordcategoriesCC === undefined) {
            window.recordcategoriesCC = new RecordCategoriesCC();
        }
        if (window.recordfreezes === undefined) {
            window.recordfreezes = new RecordFreezes();
        }
        // Bind collection events
        window.recordcategories.on("reset", function () { that.updateViews(); });
        window.recordcategories.on("add", function () { that.updateViews(); });
        window.recordcategories.on("remove", function () { that.updateViews(); });
        this.go();
    },

    go: function () {
        var that = this;
        window.recordcategoriesCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminRecordsRetention/gi)) {
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
