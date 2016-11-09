var ContentTypeManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {

        var that = this;
        this.editView = new ContentTypeEditView();

        if (window.contentTypesCC === undefined) {
            window.contentTypesCC = new ContentTypeCC();
        }
        window.contentTypes.on("reset", function (models) {
            if (models) {
                that.updateViews();
            }
        });
        window.contentTypes.on("remove", function () { that.updateViews(); });
        window.contentTypes.on("add", function (model) {
            if (model.get('Id') !== Constants.c.emptyGuid) {
                that.updateViews();
            }
        });

        this.go();
    },

    go: function () {
        var that = this;
        window.contentTypesCC.fetch({
            success: function (result) {
                if (window.location.hash.match(/#AdminContentTypeManager/gi)) {
                    that.render();
                    that.editView.viewData = {};
                    that.editView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            failure: function (jqXHR, textStatus, errorThrown) {
                that.renderError(errorThrown.Message.toString());
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
    },
    renderError: function (errorMsg) {
        $(this.el).html("");
        ErrorHandler.addErrors(errorMsg);
    }
});