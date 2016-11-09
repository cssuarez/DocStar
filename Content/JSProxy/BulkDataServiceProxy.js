/// <reference path="_ServiceProxyCore.js" />
// sync = true for synchronous call, if you really need to
var BulkDataServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/BulkData.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },

        //#region CompanyBulkData
        get: function (workflowLastChecked, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Get', 'POST', workflowLastChecked, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getBulkContentTypeData: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetContentTypeData', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getBulkWorkflowData: function (bulkWorkflowGetPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetBulkWorkflowData', 'POST', bulkWorkflowGetPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getDataLinkData: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetBulkDataLinkData', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getBulkIntegrationData: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetBulkIntegrationData', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getViewerDataWithCache: function (bulkViewerDataArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetViewerDataWithCache', 'POST', bulkViewerDataArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getBulkFormsData: function (bulkFormsDataArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetBulkFormsData', 'POST', bulkFormsDataArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        //#endregion CompanyBulkData

        //#region HostingBulkData
        getUserData: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetUserData', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getLDAPData: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetLDAPData', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        }
        //#endregion HostingBulkData
    };
};