var WorkflowItemsPerAssigneeView = CustomGridView.extend({
    className: 'WorkflowItemsPerAssigneeView',
    collection: undefined, // WorkflowItemCounts
    resultViews: [],
    resizeOnDocumentViewResize: true,
    events: {
        'click .refreshGrid': 'refresh'
    },
    resizeMe:true,
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('workflowitemsperassigneeviewlayout'));
        this.initializeGrid();
        this.onResizeGrid = options.onResizeGrid;
        this.listenTo(this.collection, 'sync', this.modelSync);
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        return ro;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.renderGrid();
        this.renderResultViews(ro);
        this.delegateEvents();
        return this;
    },
    renderResultViews: function (ro) {
        var results = this.collection;
        if (!results) {
            return;
        }
        var $container = this.$el.find('.customGridTable tbody');
        var idx = 0;
        var length = results.length;
        for (idx; idx < length; idx++) {
            var wfItemPerAssigneeView = new WorkflowItemPerAssigneeView({
                model: results.at(idx)
            });
            $container.append(wfItemPerAssigneeView.render().$el);
            this.resultViews.push(wfItemPerAssigneeView);
        }
        //Append an empty row to the end of the list, this will be used to fill the remaining space.
        var tr = document.createElement('tr');
        tr.setAttribute('class', 'emptyGridRow');
        var td = document.createElement('td');
        td.setAttribute('colspan', 2);
        tr.appendChild(td);
        $container.append(tr);
    },
    closeResultViews: function () {
        var rv = this.resultViews.pop();
        while (rv) {
            rv.close();
            rv = undefined;
            rv = this.resultViews.pop();
        }
    },
    closeChildViews: function () {
        this.closeResultViews();
    },
    close: function () {
        this.closeChildViews();
        this.unbind();
        this.remove();
    },
    //#region CustomGridView virtual functions
    onRowSelect: function (rowId, $td, ev) {
        // Only change selection if the row being clicked is a parent grid row
        if (this.$el.find('.WorkflowItemPerAssigneeView').find($td).length > 0) {
            this.onGridRowSelect(rowId, $td, ev);
        }
    },
    onRowDoubleClick: function (rowId, $td) {
        if (this.$el.find('.WorkflowItemPerAssigneeSubgridView').find($td).length > 0) {
            this.collection.trigger('viewGroupByWorkflow', this.collection, { workflowId: rowId });
        }
    },
    //#endregion CustomGridView virtual functions
    //#region Event Handling
    modelSync: function () {
        //Cleanup Last Selection
        this.lastClick = undefined;
        //Then re-render.
        this.render();
    },
    refresh: function () {
        this.collection.fetch();
    },
    getGridCollection: function () {
        return this.collection;
    }
    //#endregion Event Handling
});