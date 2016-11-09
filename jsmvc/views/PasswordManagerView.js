var PasswordManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {
        this.editView = new PasswordView();
        this.go();
    },

    go: function () {
        this.editView.render();
        this.render();
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
