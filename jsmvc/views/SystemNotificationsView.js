﻿var SystemNotificationsView = Backbone.View.extend({
    editView: null,
    initialize: function (options) {
        this.editView = new SystemNotificationsEditView();
        this.go();
    },
    go: function () {
        this.render();
    },
    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
            this.editView.render();
            ShowHidePanel.toggleAdminScrollbar();
        }
        return this;
    }
});