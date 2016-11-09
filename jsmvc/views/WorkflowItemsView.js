var WorkflowItemsView = Backbone.View.extend({
    model: undefined, // WorkflowItemsCPX
    SearchResultsGridView: undefined, // SearchResultsGridView
    className: 'WorkflowItemsView',
    events: {
        'change .queueFilter': 'changeQueueFilter',
        'change .workflowFilter': 'changeWorkflowFilter'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('workflowitemslayout'));
        var menuViewOptions = {
            deleteOptionLabel: Constants.c.deleteDocument,
            showAllWorkflowOptions: true,
            showWatchOption: true,
            showPriorityOption: true,
            showExcludeGroups: true,
            excludeGroupsChecked:Utility.convertToBool( Utility.GetUserPreference('wfItemsExcludeGroups')) || false,
            userPrefexcludeGroupsKey: 'wfItemsExcludeGroups'

        };
        // Default Columns - title, workflow, step, owner, assignee, priority, due date, approvals
        this.SearchResultsGridView = new SearchResultsGridView({
            model: this.model,
            prefKeyPrefix: 'wfItems',
            showGridRefresh: true,
            menuViewOptions: menuViewOptions,
            hideNonGridColumnChooser: true,
            triggerRefreshOnMaxRowsChange: true,
            defaultColumns: {
                title: { order: 0, width: 14 },
                DFWfId: { order: 1, width: 14 },
                DFWfStep: { order: 2, width: 12 },
                DFWfOwnerId: { order: 3, width: 14 },
                DFWfAssigneeId: { order: 4, width: 14 },
                DFPriority: { order: 5, width: 8 },
                dueDate: { order: 6, width: 8 },
                appDisplay: { order: 7, width: 16 }
            }
        });
        this.SearchResultsGridView.onResizeGrid = this.options.onResizeGrid;
        this.listenTo(this.model, 'sync', function (modelOrCollection, resp, options) {
            options = options || {};
            var kvPairs = [];
            // Set Max Workflow Items user preference
            var newMax = parseInt(this.model.getDotted('Request.MaxRows'), 10);
            if (newMax) {
                kvPairs.push({ Key: 'WFMaxItems', Value: newMax });
            }
            // Set User Filter and Workflow Filter user preferences
            var userId = this.model.get('queueId') || Constants.c.emptyGuid;
            var workflowId = this.model.get('wfId') || undefined;
            var wfFilters = {
                userId: userId,
                workflowId: workflowId
            };
            kvPairs.push({ Key: 'wf_filters', Value: JSON.stringify(wfFilters) });
            // Set Sort preferences
            var newSortBy = this.model.getDotted('Request.SortBy');
            if (newSortBy) {
                kvPairs.push({ Key: 'WFSearchOrderBy', Value: newSortBy });
            }
            var newSortOrder = this.model.getDotted('Request.SortOrder');
            if (newSortOrder) {
                kvPairs.push({ Key: 'WFSearchOrder', Value: newSortOrder });
            }
            Utility.setUserPreferenceWithCheck(kvPairs);
            this.$el.find('.PawnsViewContainer').append(this.pawnsInlineView.render().$el);
            if (!options.doNotSetHash) {
                this.lastHash = this.setHash({ grid: 'wfItems' });
            }
        });
        var req = this.model.get('Request');
        this.listenTo(req, 'change:MaxRows', function (model, value, options) {
            options = options || {};
            if (!options.doNotSetHash) {
                this.lastHash = this.setHash({ grid: 'wfItems' });
            }
        });
        this.listenTo(req, 'change:SortBy', function (model, value, options) {
            Utility.setSingleUserPreferenceWithCheck('WFSearchOrderBy', value);
        });
        this.listenTo(req, 'change:SortOrder', function (model, value, options) {
            Utility.setSingleUserPreferenceWithCheck('WFSearchOrder', value);
        });
        this.listenTo(req, 'change:wfId', this.criteriaChanged);
        this.listenTo(req, 'change:queueId', this.criteriaChanged);
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.listwf = window.slimWorkflows.toJSON();
        ro.workItemsClosed = Utility.GetUserPreference('work_items') || 'open';
        var filterIds = Utility.tryParseJSON(Utility.GetUserPreference('wf_filters'), true) || {};
        ro.wfFilterId = filterIds.workflowId;
        ro.qFilterId = filterIds.userId;
        var currentUser = Utility.getCurrentUser();
        ro.currUserId = currentUser.Id;
        ro.isAdmin = Utility.convertToBool($('#isSuperAdmin').val());
        ro.isWfAdmin = Utility.hasFlag(window.gatewayPermissions, Constants.gp.WFAdmin);
        ro.listuq = window.users.getFilteredUserQueues();
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.model.set({ wfId: viewData.wfFilterId });
        if (viewData.qFilterId === Constants.c.emptyGuid) {
            this.model.unset('queueId');
        } else {
            this.model.set({ queueId: viewData.qFilterId || viewData.currUserId });
        }

        this.$el.html(this.compiledTemplate(viewData));
        this.$el.find('.SearchResultsGridViewContainer').append(this.SearchResultsGridView.render().$el);
        this.closePawnsView();
        this.pawnsInlineView = new PawnsInlineView();
        return this;
    },
    closePawnsView: function () {
        if (this.pawnsInlineView) {
            this.pawnsInlineView.close();
        }
    },
    closeChildViews: function () {
        this.closePawnsView();
        this.SearchResultsGridView.close();
    },
    close: function () {
        this.closeChildViews();
        this.unbind();
        this.remove();
    },
    ///<summary>
    /// Set the hash for the workflow tabs search results
    /// </summary>
    setHash: function (hashData, navOpts) {
        hashData = hashData || {};
        navOpts = navOpts || {};
        var lastHash = window.location.hash;
        if (lastHash === '#Workflow') {
            navOpts.replace = true;
        }
        var url = 'Workflow/queues/{0}/{1}';
        var req = this.model.get('Request');
        var page = this.model.getPageFromRequest();
        url = String.format(url, page, req.get('MaxRows'));
        var sortName = req.get('SortBy');
        var sortOrder = req.get('SortOrder');
        if (sortName && sortOrder) {
            url += '/' + sortName;
            url += '/' + sortOrder;
        }
        if (hashData.grid) {
            url += '/' + hashData.grid;
        }
        Utility.navigate(url, Page.routers.Workflow, navOpts.trigger, navOpts.replace);
        return url;
    },
    //#region Event Handling
    changeQueueFilter: function (ev) {
        var $targ = $(ev.currentTarget);
        var queueId = $targ.val();
        if (queueId === Constants.c.emptyGuid) {
            this.model.unset('queueId');
        }
        else {
            this.model.set('queueId', $targ.val());
        }
        this.model.fetch();
    },
    changeWorkflowFilter: function (ev) {
        var $targ = $(ev.currentTarget);
        var wfId = $targ.val();
        if (wfId === Constants.c.emptyGuid) {
            this.model.unset('wfId');
        }
        else {
            this.model.set('wfId', $targ.val());
        }
        this.model.fetch();
    },
    criteriaChanged: function (ev) {
        var wfId = $('.workflowFilter').val();
        var qId = $('.queueFilter').val();
        var cWfId = this.model.get('wfId');
        var cQId = this.model.get('queueId');
        if (wfId !== cWfId && cWfId) {
            $('.workflowFilter').val(cWfId);
        }
        if (qId !== cQId && cQId) {
            $('.queueFilter').val(cQId);
        }        
    }
    //#endregion Event Handling
});