/// <reference path="_ServiceProxyCore.js" />
var SystemMaintenanceServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/HostingV2/SystemMaintenance.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getResourceInfo: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetResourceInfo', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        testSignalRConnection: function (connectionId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('TestSignalRConnection', 'POST', connectionId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getSequentialGuid: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetSequentialGuid', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getSequentialGuids: function (guidsGetArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetSequentialGuids', 'POST', guidsGetArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};