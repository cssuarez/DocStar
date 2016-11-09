var DashboardView = Backbone.View.extend({
    className: 'DashboardView',
    wfItemCounts: undefined, // WorkflowItemCounts
    wfItemsByWf: undefined, // WorkflowItemsByWorkflow
    switchViewsCallback: undefined,
    events: {
        "click .groupByAssignee": "viewGroupByAssignee",
        "click .groupByWorkflow": "viewGroupByWorkflow"
    },
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('dashboardlayout'));
        this.wfItemCounts = options.wfItemCounts;
        this.wfItemsByWf = options.wfItemsByWf;
        var that = this;
        this.wfItemCountsView = new WorkflowItemsPerAssigneeView({
            collection: this.wfItemCounts,
            onResizeGrid: function () {
                if (that.options.onResizeGrid) {
                    that.options.onResizeGrid();
                }
            }
        });
        this.wfItemsPerStepView = new WorkflowItemsPerStepView({
            collection: this.wfItemsByWf,
            onResizeGrid: function () {
                if (that.options.onResizeGrid) {
                    that.options.onResizeGrid();
                }
            }
        });

        this.listenTo(this.wfItemsByWf, 'viewGroupByAssignee', function (collection, options) {
            var that = this;
            this.switchViewsCallback = function () {
                that.wfItemCounts.setSelected([options.assigneeId]);
                var wfItemCount = that.wfItemCounts.get(options.assigneeId);
                if (wfItemCount) {
                    wfItemCount.set('subGridExpanded', true, { scrollTo: true });
                }
            };
            this.viewGroupByAssignee();
        });
        this.listenTo(this.wfItemCounts, 'viewGroupByWorkflow', function (collection, options) {
            var that = this;
            this.switchViewsCallback = function () {
                that.wfItemsByWf.setSelected([options.workflowId]);
                var wfItemByWf = that.wfItemsByWf.get(options.workflowId);
                if (wfItemByWf) {
                    wfItemByWf.set('subGridExpanded', true, { scrollTo: true });
                }
            };
            this.viewGroupByWorkflow();
        });
    },
    getRenderObject: function () {
        var ro = {};
        ro.groupByWorkflow = !!$.cookie('groupByWorkflow');
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        var htmlData = this.compiledTemplate(viewData);
        this.$el.html(htmlData);
        var that = this;
        var cf = function () {
            Utility.executeCallback(that.switchViewsCallback);
            that.switchViewsCallback = undefined;
        };
        if (!viewData.groupByWorkflow) {
            this.$el.find('.WorkflowItemsPerAssigneeContainer').append(this.wfItemCountsView.render().$el);
            this.wfItemCounts.fetch({
                complete: cf
            });
        }
        else {
            this.$el.find('.WorkflowItemsPerStepContainer').append(this.wfItemsPerStepView.render().$el);
            this.wfItemsByWf.fetch({
                complete: cf
            });
        }
        return this;
    },
    closeChildViews: function () {
        this.wfItemsPerStepView.close();
        this.wfItemCountsView.close();
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    switchToView: function (viewer) {
        if (this.currentViewer === viewer) {
            return;
        }
        this.currentViewer = viewer;
        this.wfItemCounts.clearSubGridExpanded();
        this.wfItemsByWf.clearSubGridExpanded();
        this.render();
    },
    viewGroupByAssignee: function (ev) {
        this.$el.find('.db_tabs .selected').removeClass('selected');
        this.$el.find('.groupByAssignee').addClass('selected');
        $.cookie('groupByWorkflow', null);
        this.switchToView(this.wfItemCountsView);
    },
    viewGroupByWorkflow: function (ev) {
        this.$el.find('.db_tabs .selected').removeClass('selected');
        this.$el.find('.groupByWorkflow').addClass('selected');
        $.cookie('groupByWorkflow', 'dbGrouping');
        this.switchToView(this.wfItemsPerStepView);
    },

    getWfPerAssignee: function (e, callback) {
        var targ = $(e.currentTarget);
        $.cookie('groupByWorkflow', null);
        if (!targ.hasClass('selected')) {
            $('#dashboard .header_item').removeClass('selected');
            targ.addClass('selected');
        }
        this.groupBy(false, callback);
    },
    getAssigneePerWf: function (e, callback) {
        var targ = $(e.currentTarget);
        $.cookie('groupByWorkflow', 'dbGrouping');
        if (!targ.hasClass('selected')) {
            $('#dashboard .header_item').removeClass('selected');
            targ.addClass('selected');
        }
        this.groupBy(true, callback);
    },
    groupBy: function (groupByWorkflow, callback) {
        var id;
        var groupBy = this.getGroupBy();
        groupByWorkflow = groupBy.gbwf;
        id = groupBy.id;
        if (groupByWorkflow) {
            $('#wfIPA').hide();
            $('#wfIPS').show();
        }
        else {
            $('#wfIPS').hide();
            $('#wfIPA').show();
        }
        this.render();
    },
    getGroupBy: function () {
        // Determine the state of the group by workflow cookie
        // return the id that corresponds to the grouping along with a bool determining what to group by
        var groupBy = {};
        if ($.cookie('groupByWorkflow')) {
            groupBy = {
                gbwf: true,
                id: 'gbWf'
            };
        }
        else {
            groupBy = {
                gbwf: false,
                id: 'gbA'
            };
        }
        return groupBy;
    }
});