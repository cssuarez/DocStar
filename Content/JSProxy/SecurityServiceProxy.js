/// <reference path="_ServiceProxyCore.js" />
var SecurityServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Security.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        // Security Classes
        getAllSecurityClasses: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAllSecurityClasses', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        createSecurityClass: function (securityClassPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateSecurityClass', 'POST', securityClassPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateSecurityClass: function (securityClassPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UpdateSecurityClass', 'POST', securityClassPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteSecurityClass: function (deleteSecurityClassPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteSecurityClass', 'POST', deleteSecurityClassPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        // Roles
        getAllRoles: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAllRoles', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        createRole: function (role, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateRole', 'POST', role, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateRole: function (role, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UpdateRole', 'POST', role, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteRole: function (deleteRolePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteRole', 'POST', deleteRolePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        createProxyRequest: function (proxyAuthRequest, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateProxyRequest', 'POST', proxyAuthRequest, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};