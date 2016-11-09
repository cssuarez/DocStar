/// <reference path="_ServiceProxyCore.js" />
var AdminServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Administration.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        GetCustomList: function (name, successFunc, failureFunc, completeFunc, cancellationToken) {            
            var data = { name: name, cacheBustingToken: Utility.getCacheBusterStr() };
            spc.queueAjaxCall('GetCustomList', 'GET', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getCustomListById: function (cusomListId, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { Id: cusomListId, cacheBustingToken: Utility.getCacheBusterStr() };
            spc.queueAjaxCall('GetCustomListById', 'GET', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        //#region Scan Settings
        createScanSettings: function (scanSettings, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateScanSettings', 'POST', scanSettings, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateScanSettings: function (scanSettings, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UpdateScanSettings', 'POST', scanSettings, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteScanSettings: function (settingsIds, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteScanSettings', 'POST', settingsIds, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        //#endregion Scan Settings
        emailMessage: function (emailPkg, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('EmailMessage', 'POST', emailPkg, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        emailWorkflowDesignerMessage: function (emailPkg, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('WorkflowDesignerMessage', 'POST', emailPkg, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getSystrayConnections: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetSystrayConnections', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        //#region Audit
        searchAudit: function (auditSearchCriteria, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SearchAudit', 'POST', auditSearchCriteria, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getAuditsForEntity: function (entityId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAuditsForEntity', 'POST', entityId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        clearAudit: function (clearAuditPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ClearAudit', 'POST', clearAuditPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        //#endregion Audit
        getDataUsage: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetDataUsage', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getFreeze: function (freezeId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetFreeze', 'POST', freezeId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        createFreeze: function (freeze, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateFreeze', 'POST', freeze, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateFreeze: function (freeze, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UpdateFreeze', 'POST', freeze, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        releaseFreeze: function (freezeId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ReleaseFreeze', 'POST', freezeId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        freezeDocuments: function (freezeDocumentPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('FreezeDocuments', 'POST', freezeDocumentPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        unFreezeDocuments: function (freezeDocumentPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UnFreezeDocuments', 'POST', freezeDocumentPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getFreezesForDocs: function (docIds, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetFreezesForDocs', 'POST', docIds, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        setCustomList: function (customListItem, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SetCustomList', 'POST', customListItem, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteCustomList: function (customListName, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteCustomList', 'POST', customListName, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};