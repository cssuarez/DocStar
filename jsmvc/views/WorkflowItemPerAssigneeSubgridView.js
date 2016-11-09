var WorkflowItemPerAssigneeSubgridView = CustomGridView.extend({
    model: undefined, // WorkflowItemCountCPX
    tagName: 'tr',
    className: 'WorkflowItemPerAssigneeSubgridView',
    resultViews: [],
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('workflowitemperassigneesubgridviewlayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        // Static headers - added in template
        return ro;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.renderItemViews(ro);
        return this;
    },
    renderItemViews: function (ro) {
        var results = this.model.get('AssigneeWorkflows');
        if (!results) {
            return;
        }
        var $container = this.$el.find('.customGridTable tbody');
        var idx = 0;
        var length = results.length;
        for (idx; idx < length; idx++) {
            var wfItemPerAssigneeSubgridItemView = new WorkflowItemPerAssigneeSubgridItemView({
                model: results.at(idx)
            });
            $container.append(wfItemPerAssigneeSubgridItemView.render().$el);
            this.resultViews.push(wfItemPerAssigneeSubgridItemView);
        }
        //Append an empty row to the end of the list, this will be used to fill the remaining space.
        var tr = document.createElement('tr');
        tr.setAttribute('class', 'emptyGridRow');
        var td = document.createElement('td');
        td.setAttribute('colspan', 2);
        tr.appendChild(td);
        $container.append(tr);
    },
    close: function () {
        this.unbind();
        this.remove();
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});