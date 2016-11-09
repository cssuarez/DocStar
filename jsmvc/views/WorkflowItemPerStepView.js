var WorkflowItemPerStepView = Backbone.View.extend({
    tagName: 'tr',
    className: 'WorkflowItemPerStepView',
    model: undefined, // WorkflowItemByWorkflow
    colPreferences: undefined,
    events: {
        'click .subgridExpand': 'toggleSubGrid'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('workflowitemperstepviewlayout'));
        this.colPreferences = options.columnPreference;
        this.listenTo(this.model, 'change:subGridExpanded', this.renderSubGrid);
        this.listenTo(this.model, 'change:isSelected', this.render);
    },
    getRenderObject: function (editMode) {
        var ro = {
            cells: [],
            selected: this.model.isSelected(),
            subGridExpanded: this.model.get('subGridExpanded')
        };
        var cp;
        var values = this.model.toJSON();
        var i = 0;
        for (cp in this.colPreferences) {
            if (this.colPreferences.hasOwnProperty(cp)) {
                var idx = this.colPreferences[cp].order;
                if (idx === undefined) {
                    idx = i++; //If you just resize and don't reorder you will an an undefined order.
                }
                ro.cells[idx] = { value: values[cp], valueId: cp };
            }
        }
        return ro;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.$el.data('rowid', this.model.get('WorkflowId'));
        if (ro.selected) {
            this.$el.addClass('customGridHighlight');
        } else {
            this.$el.removeClass('customGridHighlight');
        }
        return this;
    },
    closeSubGrid: function () {
        if (this.wfItemPerStepSubgridView) {
            this.wfItemPerStepSubgridView.close();
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
            this.wfItemPerStepSubgridView = new WorkflowItemPerStepSubgridView({
                model: this.model
            });
            this.$el.after(this.wfItemPerStepSubgridView.render().$el); // Append subgrid as a new after this row
        }
        else {
            this.$el.find('.subgridExpand').removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-e');
        }
    }
    //#endregion Event Handling
});