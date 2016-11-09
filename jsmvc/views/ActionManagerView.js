var ActionManagerView = Backbone.View.extend({
    editView: null,
    initialize: function () {        
        this.editView = new ActionEditView();
        this.go();
    },
    go: function () {
        this.render();
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