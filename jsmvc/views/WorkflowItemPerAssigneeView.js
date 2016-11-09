var WorkflowItemPerAssigneeView = Backbone.View.extend({
    tagName: 'tr',
    className: 'WorkflowItemPerAssigneeView',
    model: undefined, // WorkflowItemCountCPX
    events: {
        'click .subgridExpand': 'toggleSubGrid'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('workflowitemperassigneeviewlayout'));
        this.listenTo(this.model, 'change:subGridExpanded', this.renderSubGrid);
        this.listenTo(this.model, 'change:isSelected', this.render);
    },
    getRenderObject: function (editMode) {
        var ro = {
            cells: [],
            selected: this.model.isSelected(),
            subGridExpanded: this.model.get('subGridExpanded')
        };
        ro.cells[0] = { value: this.model.get('AssigneeName') };
        ro.cells[1] = { value: this.model.get('TotalWorkflows') };
        return ro;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.$el.data('rowid', this.model.get('AssigneeId'));
        if (ro.selected) {
            this.$el.addClass('customGridHighlight');
        } else {
            this.$el.removeClass('customGridHighlight');
        }
        return this;
    },
    closeSubGrid: function () {
        if (this.wfItemPerAssigneeSubgridView) {
            this.wfItemPerAssigneeSubgridView.close();
        }
    },
    close: function () {
        this.closeSubGrid();
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    toggleSubGrid: function (ev) {
        var isExpanded = this.model.get('subGridExpanded');
        this.model.set('subGridExpanded', !isExpanded);
    },
    renderSubGrid: function (model, value, options) {
        this.closeSubGrid();
        if (value) {    // Re-create the subgrid
            this.$el.find('.subgridExpand').removeClass('ui-icon-triangle-1-e').addClass('ui-icon-triangle-1-s');
            this.wfItemPerAssigneeSubgridView = new WorkflowItemPerAssigneeSubgridView({
                model: this.model
            });
            this.$el.after(this.wfItemPerAssigneeSubgridView.render().$el); // Append subgrid as a new row after this row
        }
        else {
            this.$el.find('.subgridExpand').removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-e');
        }
    }
    //#endregion Event Handling
});