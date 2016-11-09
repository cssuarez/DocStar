var ApprovalRequestItemsView = Backbone.View.extend({
    model: undefined, // ApprovalRequestItemsCPX
    SearchResultsGridView: undefined, // SearchResultsGridView
    className: 'ApprovalRequestItemsView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('approvalrequestitemslayout'));
        var menuViewOpts = {
            deleteOptionLabel: Constants.c.deleteDocument,
            showAllWorkflowOptions: false,
            showAssignWorkflowOption: false,
            showDueDateOption: false,
            showExcludeGroups: true,
            excludeGroupsChecked: Utility.convertToBool(Utility.GetUserPreference('arItemsExcludeGroups')) || false,
            userPrefexcludeGroupsKey: 'arItemsExcludeGroups'
        };
        this.SearchResultsGridView = new SearchResultsGridView({
            model: this.model,
            prefKeyPrefix: 'arItems',
            menuViewOptions: menuViewOpts,
            hideNonGridColumnChooser: true,
            triggerRefreshOnMaxRowsChange: true,
            showGridRefresh: true,
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
                kvPairs.push({ Key: 'ARMaxItems', Value: newMax });
            }
            // Set Sort preferences
            var newSortBy = this.model.getDotted('Request.SortBy');
            if (newSortBy) {
                kvPairs.push({ Key: 'ARSearchOrderBy', Value: newSortBy });
            }
            var newSortOrder = this.model.getDotted('Request.SortOrder');
            if (newSortOrder) {
                kvPairs.push({ Key: 'ARSearchOrder', Value: newSortOrder });
            }
            Utility.setUserPreferenceWithCheck(kvPairs);
            if (!options.doNotSetHash) {
                this.lastHash = this.setHash({ grid: 'arItems' });
            }
        });
        this.listenTo(this.model.get('Request'), 'change:MaxRows', function (model, value, options) {
            options = options || {};
            if (!options.doNotSetHash) {
                this.lastHash = this.setHash({ grid: 'arItems' });
            }
        });
        this.listenTo(this.model.get('Request'), 'change:SortBy', function (model, value, options) {
            Utility.setSingleUserPreferenceWithCheck('ARSearchOrderBy', value);
        });
        this.listenTo(this.model.get('Request'), 'change:SortOrder', function (model, value, options) {
            Utility.setSingleUserPreferenceWithCheck('ARSearchOrder', value);
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.approvalReqsClosed = Utility.GetUserPreference('approval_requests') || 'open';
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.find('.SearchResultsGridViewContainer').append(this.SearchResultsGridView.render().$el);
        return this;
    },
    closeChildViews: function () {
        this.SearchResultsGridView.close();
    },
    close: function () {
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
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});