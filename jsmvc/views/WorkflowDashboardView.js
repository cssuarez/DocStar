var WorkflowDashboardView = Backbone.View.extend({
    className: 'WorkflowDashboardView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('workflowdashboardlayout'));
        this.dashboardView = new DashboardView({ wfItemCounts: options.wfItemCounts, wfItemsByWf: options.wfItemsByWf, onResizeGrid: this.options.onResizeGrid });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.dashboardClosed = Utility.GetUserPreference('dashboard') || 'open';
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.find('.accordion').append(this.dashboardView.render().$el);
        return this;
    },
    closeChildViews: function () {
        this.dashboardView.close();
    },
    close: function () {
        this.closeChildViews();
        this.unbind();
        this.remove();
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});