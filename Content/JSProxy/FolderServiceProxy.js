/// <reference path="_ServiceProxyCore.js" />
var FolderServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Folder.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getFolder: function (folderId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Get', 'POST', folderId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getFolders: function (folderGetArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetFolders', 'POST', folderGetArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getPath: function (folderId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetPath', 'POST', folderId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getByPath: function (getFoldByPathPkg, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetByPath', 'POST', getFoldByPathPkg, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getChildren: function (folderRecursionArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetChildren', 'POST', folderRecursionArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        moveFolder: function (foldersArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('MoveFolder', 'POST', foldersArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getSlimFolders: function (folderIds, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetSlimFolders', 'POST', folderIds, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        createFolder: function (folderCreatePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Create', 'POST', folderCreatePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateFolder: function (folderUpdatePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Update', 'POST', folderUpdatePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        renameFolder: function (folderRenamePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Rename', 'POST', folderRenamePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteFolder: function (folderDeletePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Delete', 'POST', folderDeletePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        addDocumentsTo: function (containerArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('AddDocumentsTo', 'POST', containerArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        removeDocumentsFrom: function (containerArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('RemoveDocumentsFrom', 'POST', containerArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getSecurityInformation: function (folderId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetSecurityInformation', 'POST', folderId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        setSecurityInformation: function (entitySecurityInformation, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SetSecurityInformation', 'POST', entitySecurityInformation, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};