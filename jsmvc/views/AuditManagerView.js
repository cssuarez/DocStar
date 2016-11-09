var AuditManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {
        this.editView = new AuditView();
        this.go();
    },

    go: function () {
        this.editView.render();
        this.render();
        
    },

    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});
