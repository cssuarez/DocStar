/// <reference path="_ServiceProxyCore.js" />
// For performing direct calls to server using the Document Service
var DocumentServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Document.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        get: function (documentId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Get', 'POST', documentId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getPackage: function (documentGetArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetPackage', 'POST', documentGetArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getByVersion: function (versionId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetByVersion', 'POST', versionId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getDeleted: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetDeleted', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        softDelete: function (documentIds, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SoftDelete', 'POST', documentIds, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        hardDelete: function (documentIds, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('HardDelete', 'POST', documentIds, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        restoreDeleted: function (documentIds, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('RestoreDeleted', 'POST', documentIds, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        // Add slim update (for when only metadata has changed)
        updateManySlim: function (documentSlimUpdateArr, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('UpdateManySlim', 'POST', documentSlimUpdateArr, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        // Add slim update (for when only metadata has changed) and renaming containers
        updateManySlimRename: function (documentSlimUpdateRenamePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('UpdateManySlimRename', 'POST', documentSlimUpdateRenamePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        // Add Full update (for when page is dirty)
        update: function (documentUpdatePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Update', 'POST', documentUpdatePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        moveTo: function (documentMoveToPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('MoveTo', 'POST', documentMoveToPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        moveToFolders: function (documentMoveToPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('MoveToFolders', 'POST', documentMoveToPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getSecurityInformation: function (documentId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetSecurityInformation', 'POST', documentId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        setSecurityInformation: function (entitySecurityInformation, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SetSecurityInformation', 'POST', entitySecurityInformation, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        setCurrentUserApproval: function (setCurrentUserApproval, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SetCurrentUserApproval', 'POST', setCurrentUserApproval, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        requestApproval: function (requestApprovalPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('RequestApproval', 'POST', requestApprovalPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getCurrentUserApprovalRequests: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetCurrentUserApprovalRequests', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        setApprovalsRequired: function (approvalSet, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SetApprovalsRequired', 'POST', approvalSet, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getViewableVersions: function (getViewableVersionsArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetViewableVersions', 'POST', getViewableVersionsArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        checkOut: function (documentCheckOutArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('CheckOut', 'POST', documentCheckOutArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        checkIn: function (documentCheckInArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('CheckIn', 'POST', documentCheckInArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        promoteVersion: function (promoteVersionArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('PromoteVersion', 'POST', promoteVersionArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        deleteVersion: function (deleteVersionArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DeleteVersion', 'POST', deleteVersionArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        changeVersionLock: function (changeVersionLockArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('ChangeVersionLock', 'POST', changeVersionLockArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        addVersionComment: function (versionCommentArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('AddVersionComment', 'POST', versionCommentArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        deleteVersionComment: function (versionCommentDeleteArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DeleteVersionComment', 'POST', versionCommentDeleteArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        unpublish: function (unpublishArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Unpublish', 'POST', unpublishArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        prepForEdit: function (prepForEditArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('PrepForEdit', 'POST', prepForEditArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        prepForSend: function (prepForSendPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('PrepForSend', 'POST', prepForSendPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        mergeDocuments: function (mergeDocumentsPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('MergeDocuments', 'POST', mergeDocumentsPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        queueDocumentForImaging: function (versionId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('QueueForImaging', 'POST', versionId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getCustomFieldValues: function (GetCustomFieldValuesArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetCustomFieldValues', 'POST', GetCustomFieldValuesArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        updateCustomFieldGroupValues: function (updateCustomFieldGroupValuesPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('UpdateCustomFieldGroupValues', 'POST', updateCustomFieldGroupValuesPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        burstContentItem: function (burstContentItemPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('BurstContentItem', 'POST', burstContentItemPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        splitDocument: function (splitDocumentPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SplitDocument', 'POST', splitDocumentPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        burstAndDelete: function (docPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('BurstAndDelete', 'POST', docPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getRecognitionOptions: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetRecognitionOptions', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        deleteMessage: function (deleteMessageArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DeleteMessage', 'POST', deleteMessageArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        submitTemporaryDocument: function (submitTemporaryDocumentArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SubmitTemporaryDocument', 'POST', submitTemporaryDocumentArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        }
    };
};
