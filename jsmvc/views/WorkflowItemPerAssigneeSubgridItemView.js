var WorkflowItemPerAssigneeSubgridItemView = CustomGridView.extend({
    model: undefined, // AssigneeWorkflow
    tagName: 'tr',
    className: 'WorkflowItemPerAssigneeSubgridItemView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.wfCurrentStepItems = options.wfCurrentStepItems;
        this.compiledTemplate = doT.template(Templates.get('workflowitemperassigneesubgriditemviewlayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {
            cells: []
        };
        // Create columns from wfCounts
        ro.cells[0] = { value: this.model.get('WorkflowName') };
        ro.cells[1] = { value: this.model.get('WorkflowCount') };
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.data('rowid', this.model.get('WorkflowId'));
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