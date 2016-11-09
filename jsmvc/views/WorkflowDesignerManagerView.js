var WorkflowDesignerManagerView = Backbone.View.extend({

    editView: null,
    initialize: function (options) {
        this.editView = new WorkflowDesignerEditView();
        this.go();
    },
    go: function () {
        var that = this;
        that.render();
        that.editView.render();
        ShowHidePanel.toggleAdminScrollbar();        
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
            setTimeout(function () {
                var height = parseInt($('#admin_action').css('height'), 10);
                var width = parseInt($('#admin_action').css('width'), 10);
                $('#admin_action iframe').css('height', height);
                $('#admin_action iframe').css('width', width);
            }, 50); //after insertion
        }
        return this;
    }
});
