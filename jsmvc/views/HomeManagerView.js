var HomeManagerView = Backbone.View.extend({

    editView: null,
    initialize: function (options) {
        this.editView = new HomeEditView();
        this.go();
    },
    go: function () {
        this.render();
        this.editView.render();
    },
    render: function () {
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});
