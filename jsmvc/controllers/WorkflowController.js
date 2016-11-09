// Provide navigation for Workflow
var WorkflowRouter = Backbone.Router.extend({
    workflowView: null,
    /*
    * Routes for workflow
    */
    initialize: function () {
        if (this.workflowView === null) {
            this.workflowView = new WorkflowView();
            $('#workflow_tab_panel').html(this.workflowView.render().$el);
        }
    },
    routes: {
        'Workflow': 'workflowPanel',
        'Workflow/queues/:page/:rows': 'workflowSearch',
        'Workflow/queues/:page/:rows/:sortname/:sortorder': 'workflowSearch',
        'Workflow/queues/:page/:rows/:sortname/:sortorder/:grid': 'workflowSearch',
        'Workflow/queues/:page/:rows/:sortname/:sortorder/:grid/:workFlowId': 'workflowFilter',
        'Workflow/queues/:page/:rows/:sortname/:sortorder/:grid/:workFlowId/:queueId': 'workflowFilter'
    },
    workflowPanel: function () {
        this.onNavigate('workflow');
        this.workflowView.showWorkflow();
        window.loadedWorkflowOnce = true;
    },
    workflowSearch: function (qPage, qRows, sortName, sortOrder, grid) {
        this.onNavigate('workflow');
        this.workflowView.showExistingResults(qPage, qRows, sortName, sortOrder, grid);
        window.loadedWorkflowOnce = true;
    },
    workflowFilter: function (qPage, qRows, sortName, sortOrder, grid, wfId, queueId) {
        this.onNavigate('workflow');
        this.workflowView.showExistingResults(qPage, qRows, sortName, sortOrder, grid, wfId, queueId);
        window.loadedWorkflowOnce = true;
    }
});
