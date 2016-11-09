/// <reference path="_ServiceProxyCore.js" />
var WorkflowServiceProxyV2 = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Workflow.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getXmlById: function (id, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetXML', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        saveWorkflowXml: function (xml, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SaveXml', 'POST', xml, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        saveAsWorkflowXml: function (xml, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SaveAsXml', 'POST', xml, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        saveNewWorkflowXml: function (xml, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SaveNewXml', 'POST', xml, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getAlertCounts: function (getAlertCountsPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetAlertCounts', 'POST', getAlertCountsPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getWorkflowItems: function (bulkWorkflowGetPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetWorkflowItems', 'POST', bulkWorkflowGetPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getApprovalRequestItems: function (bulkWorkflowGetPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetApprovalRequestItems', 'POST', bulkWorkflowGetPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        addToChat: function (workflowChatPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('AddToChat', 'POST', workflowChatPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getFormattedChat: function (workflowChatPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetFormattedChat', 'POST', workflowChatPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        resolveException: function (resolveExceptionPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('ResolveException', 'POST', resolveExceptionPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        processWorkflowDocumentUI: function (updateWFDocumentUI, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('ProcessWorkflowDocumentUI', 'POST', updateWFDocumentUI, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        changeAssignee: function (changeAssigneePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('ChangeAssignee', 'POST', changeAssigneePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getWorkflowItemCounts: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetWorkflowItemCounts', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getWorkflowItemsByWorkflow: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetWorkflowItemsByWorkflow', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getWorkflowItemsByStep: function (workflowId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetWorkflowItemsByStep', 'POST', workflowId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        assignWorkflow: function (assignWorkflowPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('AssignWorkflow', 'POST', assignWorkflowPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        resetWorkflow: function (resetWorkflowPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('ResetWorkflows', 'POST', resetWorkflowPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        terminateWorkflow: function (removePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('TerminateWorkflow', 'POST', removePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        removeDocumentFromWorkflow: function (removePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('RemoveDocumentFromWorkflow', 'POST', removePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        executeSyncAction: function (executeSyncActionArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('ExecuteSyncAction', 'POST', executeSyncActionArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getSyncActionLibrary: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetSyncActionLibrarySlim', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        selectBranch: function (selectBranchPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SelectBranch', 'POST', selectBranchPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        documentBackSteps: function (wfDocumentBackStepPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DocumentBackSteps', 'POST', wfDocumentBackStepPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        copyActionToLibrary: function (copyActionLibraryItemPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('CopyActionToLibrary', 'POST', copyActionLibraryItemPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getNewTaskXml: function (wfTaskGetArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetNewTaskXml', 'POST', wfTaskGetArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getNewActionXml: function (wfActionGetArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetNewActionXml', 'POST', wfActionGetArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getActionLibraryItemXml: function (getActionLibraryItemXmlPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetActionLibraryItemXml', 'POST', getActionLibraryItemXmlPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        saveActionLibraryItem: function (saveActionLibraryItemPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SaveActionLibraryItem', 'POST', saveActionLibraryItemPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        createWFNotificationRule: function (wfNotificationRulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('CreateWFNotificationRule', 'POST', wfNotificationRulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        updateWFNotificationRule: function (wfNotificationRulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('UpdateWFNotificationRule', 'POST', wfNotificationRulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getWFNotificationRules: function (userId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetWFNotificationRules', 'POST', userId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        deleteRule: function (RuleId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DeleteRule', 'POST', RuleId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        runNowNotificationRule: function (wfNotificationRulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('RunNowNotificationRule', 'POST', wfNotificationRulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        testTask: function (xml, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('TestTask', 'POST', xml, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        }
    };
};