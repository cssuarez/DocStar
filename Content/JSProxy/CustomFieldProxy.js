/// <reference path="_ServiceProxyCore.js" />
var CustomFieldProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/CustomField.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getCustomFieldsWithNew: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetCustomFieldsWithNew', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        deleteCustomField: function (customFieldId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DeleteCustomField', 'POST', customFieldId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        updateCustomField: function (customFieldMeta, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SetCustomField', 'POST', customFieldMeta, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        createCustomField: function (customFieldMeta, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SetCustomField', 'POST', customFieldMeta, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        createFieldsAndGroup: function (cfgArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('CreateFieldsAndGroup', 'POST', cfgArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        createGroup: function (customFieldGroupPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('CreateGroup', 'POST', customFieldGroupPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        updateGroup: function (customFieldGroupPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('UpdateGroup', 'POST', customFieldGroupPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        deleteGroup: function (customFieldGroupId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DeleteGroup', 'POST', customFieldGroupId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getDisplayValue: function (customFieldValue, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetDisplayValue', 'POST', customFieldValue, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        testCustomFieldValue: function (testCustomFieldArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('TestCustomFieldValue', 'POST', testCustomFieldArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getGroups: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetGroups', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        }
    };
};