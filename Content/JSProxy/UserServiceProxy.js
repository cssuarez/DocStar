/// <reference path="_ServiceProxyCore.js" />
var UserServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/HostingV2/User.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        Get: function (id, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Get', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        GetAll: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAll', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        GetCurrent: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetCurrent', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        Create: function (userPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Create', 'POST', userPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        Update: function (userPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Update', 'POST', userPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        Delete: function (deleteUserPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Delete', 'POST', deleteUserPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        SetPassword: function (passwordResetPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SetPassword', 'POST', passwordResetPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        LogIn: function (authenticationPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('LogIn', 'POST', authenticationPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        LogOut: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('LogOut', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        DeleteAllPreferences: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteAllPreferences', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        CreateReadOnlyUsers: function (readOnlyUsersPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateReadOnlyUsers', 'POST', readOnlyUsersPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        CreatePasswordManagementSetting: function (pwdManagementPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreatePasswordManagementSetting', 'POST', pwdManagementPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        UpdatePasswordManagementSetting: function (pwdManagementPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UpdatePasswordManagementSetting', 'POST', pwdManagementPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        GetPasswordManagementSetting: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetPasswordManagementSetting', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        ResetLockoutUsers: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ResetLockoutUsers', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        setUserPreferences: function (userPreferences, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SetPreferences', 'POST', userPreferences, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};