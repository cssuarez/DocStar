var CustomFieldMetaManagerView = Backbone.View.extend({
    editView: null,
    customFieldsEditView: null,
    groupEditView: null,
    initialize: function (options) {
        var that = this;
        this.editView = new CustomFieldMetaManagerEditView();
        if (window.customFieldMetas === undefined) {
            window.customFieldMetas = new CustomFieldMetas();
        }
        if (window.customLists === undefined) {
            window.customLists = new CustomLists();
        }
        if (window.customFieldMetaGroupPackages === undefined) {
            window.customFieldMetaGroupPackages = new CustomFieldMetaGroupPackages();
        }
        if (window.customFieldMetaGroupPackages === undefined) {
            window.customFieldMetaGroupPackages = new CustomFieldMetaGroupPackages();
        }
        if (window.customFieldCC === undefined) {
            window.customFieldCC = new CustomFieldCC();
        }
        window.customFieldMetas.on("reset", function () {
            that.editView.customFieldsEditView.updateView();
        });
        window.customFieldMetas.on("add", function () {
            that.editView.customFieldsEditView.updateView();
            that.editView.groupEditView.updateView();
        });
        window.customFieldMetas.on("remove", function () {
            that.editView.customFieldsEditView.updateView();
            that.editView.groupEditView.updateView();
        });
        window.customFieldMetaGroupPackages.on("reset", function () {
            that.editView.groupEditView.updateView();
        });
        window.customFieldMetaGroupPackages.on("add", function () {
            that.editView.groupEditView.updateView();
        });
        window.customFieldMetaGroupPackages.on("remove", function () {
            that.editView.groupEditView.updateView();
        });
        this.go(options);
    },

    go: function () {
        var that = this;
        window.customFieldCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminCustomFieldMetaManager/gi)) {
                    that.render();
                    that.updateViews();
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