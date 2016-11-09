/// <reference path="../../Content/JSProxy/WorkflowServiceProxyV2.js" />
var WorkflowsCC = Backbone.Collection.extend({
    proxy: BulkDataServiceProxy({ skipStringifyWcf: true }),
    errorMsg: null,
    parse: function (response) {
        WorkflowUtil.lastApprovalItems = response.ApprovalRequestItems;
        WorkflowUtil.lastWorkflowItems = response.WorkflowItems;
        return [];
    },
    fetch: function (options) {
        options = options || {};
        var that = this;
        var bulkWorkflowGetPackage = {};
        var filterData = Utility.GetUserPreference("wf_filters");
        if (filterData) {
            filterData = JSON.parse(filterData);
        }
        var currUser = $('#currentUser').val();
        if (currUser) {
            currUser = JSON.parse(currUser);
        }

        // Is user a wfAdmin, if not make filterDataUserId always currUser.Id
        var isWFAdmin = Utility.checkGP(window.gatewayPermissions, Constants.gp.WFAdmin);
        var filterDataUserId;
        var userId;
        if (!isWFAdmin) {
            userId = currUser.Id;
        }
        else {
            filterDataUserId = (filterData && filterData.userId) ? filterData.userId : undefined;
            // If userId is undefined will get all records in user queues the current user can see
            userId = (filterDataUserId === Constants.c.emptyGuid) ? undefined : (filterDataUserId || currUser.Id || undefined);
        }
        // If workflowId is undefined will get all records for all workflows the current user can see
        var filterDataWorkflowId = (filterData && filterData.workflowId) ? filterData.workflowId : undefined;
        var maxRows = options.maxRows || 25;
        var start = options.page ? (options.page - 1) * maxRows : 0;// Start is 0-based, while page is 1-based
        start = start < 0 ? 0 : start;  // ensure that the minimum for the start is 0
        bulkWorkflowGetPackage = {
            UserId: userId,
            WorkflowId: filterDataWorkflowId,
            Start: start,
            MaxRows: maxRows,
            sidx: options.sortName || null,
            sord: options.sortOrder || null
        };
        var sf = function (r) {
            that.parse(r);
            if (bulkWorkflowGetPackage) {
                WorkflowUtil.setDropDownText(bulkWorkflowGetPackage.WorkflowId || undefined, 'wf');
                WorkflowUtil.setDropDownText(bulkWorkflowGetPackage.UserId || currUser.Id, 'queue');
            }
            if (options.success) {
                options.success();
            }
        };
        var ff = function (qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        var cf = function () {
            // Make sure the filter for user queues and workflow queues is set in user preferences
            if ((userId && filterDataUserId !== userId) && filterDataWorkflowId) {
                Utility.SetSingleUserPreference("wf_filters", JSON.stringify({ userId: userId, workflowId: filterDataWorkflowId }));
            }
        };
        var sortOrder = Utility.GetUserPreference('searchOrder') || null;
        bulkWorkflowGetPackage = SearchUtil.setSearchOrderPostData(bulkWorkflowGetPackage, sortOrder);
        this.proxy.getBulkWorkflowData(bulkWorkflowGetPackage, sf, ff, cf);
    }
});