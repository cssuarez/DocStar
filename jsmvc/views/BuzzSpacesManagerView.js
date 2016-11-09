var BuzzSpacesManagerView = Backbone.View.extend({

    editView: null,
    initialize: function (options) {
        this.editView = new BuzzSpacesEditView();
        this.go();
    },
    go: function () {
        this.render();
        this.editView.render();
        ShowHidePanel.toggleAdminScrollbar();
    },
    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});