var WorkflowItemsPerStepView = CustomGridView.extend({
    className: 'WorkflowItemsPerStepView',
    collection: undefined, // WorkflowItemsByWorkflow
    resultViews: [],
    resizeOnDocumentViewResize: true,
    resizeMe: true,
    events: {
        'click .refreshGrid': 'refresh'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('workflowitemsperstepviewlayout'));
        this.initializeGrid();
        this.onResizeGrid = options.onResizeGrid;
        this.listenTo(this.collection, 'sync', this.modelSync);
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {
            headers: []
        };

        var defColPrefs = this.defaultColumnPreferences();
        if (!this.colPreferences) {
            this.colPreferences = this.defaultColumnPreferences();
        }
        var cp;
        for (cp in this.colPreferences) {
            if (this.colPreferences.hasOwnProperty(cp)) {
                var idx = this.colPreferences[cp].order;
                if (idx === undefined) {
                    idx = i; //If you just resize and don't reorder you will an an undefined order.
                }
                var w = this.getWidthFromPreference(cp, this.colPreferences, defColPrefs);
                ro.headers[idx] = { style: 'width: ' + w };
            }
        }
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
            var wfItemPerStepView = new WorkflowItemPerStepView({
                model: results.at(idx),
                columnPreference: this.colPreferences
            });
            $container.append(wfItemPerStepView.render().$el);
            this.resultViews.push(wfItemPerStepView);
        }
        //Append an empty row to the end of the list, this will be used to fill the remaining space.
        var tr = document.createElement('tr');
        tr.setAttribute('class', 'emptyGridRow');
        var td = document.createElement('td');
        td.setAttribute('colspan', 2);
        tr.appendChild(td);
        $container.append(tr);
    },
    defaultColumnPreferences: function () {
        return {
            WorkflowName: { order: 0, width: 75 },
            WorkflowCount: { order: 1, width: 25 }
        };
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
        if (this.$el.find('.WorkflowItemPerStepView').find($td).length > 0) {
            this.onGridRowSelect(rowId, $td, ev);
        }
    },
    onRowDoubleClick: function (rowId, $td) {
        if (this.$el.find('.WorkflowItemPerStepSubgridView').find($td).length > 0) {
            this.collection.trigger('viewGroupByAssignee', this.collection, { assigneeId: rowId });
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
    //#endregion Event Handling
    getGridCollection: function () {
        return this.collection;
    }
});