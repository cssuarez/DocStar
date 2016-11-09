/// <reference path="_ServiceProxyCore.js" />
var InboxServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Inbox.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getInbox: function (inboxId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Get', 'POST', inboxId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        createInbox: function (inboxCreatePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Create', 'POST', inboxCreatePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateInbox: function (inboxUpdatePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Update', 'POST', inboxUpdatePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        renameInbox: function (inboxRenamePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Rename', 'POST', inboxRenamePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteInbox: function (inboxDeletePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Delete', 'POST', inboxDeletePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        addDocumentsTo: function (containerArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('AddDocumentsTo', 'POST', containerArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        removeDocumentsFrom: function (containerArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('RemoveDocumentsFrom', 'POST', containerArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getSecurityInformation: function (inboxId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetSecurityInformation', 'POST', inboxId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        setSecurityInformation: function (entitySecurityInformation, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SetSecurityInformation', 'POST', entitySecurityInformation, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};