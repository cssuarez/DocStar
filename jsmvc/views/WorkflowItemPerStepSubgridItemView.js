var WorkflowItemPerStepSubgridItemView = CustomGridView.extend({
    wfCurrentStepItems: [], // passed in from parent view
    tagName: 'tr',
    className: 'WorkflowItemPerStepSubgridItemView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.wfCurrentStepItems = options.wfCurrentStepItems;
        this.compiledTemplate = doT.template(Templates.get('workflowitemperstepsubgriditemviewlayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {
            cells: []
        };
        // Create columns from collection
        var wfCurrStepItems = this.wfCurrentStepItems;
        // Skip wfCurrStepItems[0], it is the assignee id, and it is not needed for the grid
        // Setup first column - always 1st index in wfCurrStepItems
        ro.cells[0] = { value: wfCurrStepItems[1] };
        // Setup dynamic number of columns
        var idx = 2;
        var length = wfCurrStepItems.length;
        for (idx; idx < length; idx++) {
            ro.cells[idx - 1] = { value: wfCurrStepItems[idx] };
        }
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.data('rowid', this.wfCurrentStepItems[0]); // assignee id
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});