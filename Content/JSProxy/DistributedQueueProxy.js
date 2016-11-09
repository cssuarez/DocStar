var DistributedQueueProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/HostingV2/DistributedQueue.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getAllData: function (distributedQueueGetAllDataArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAllData', 'POST', distributedQueueGetAllDataArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        clearOldDQP: function (instanceId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ClearOldDQP', 'POST', instanceId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteDQ: function (id, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Delete', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        disableProcessor: function (disableProcessorArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DisableProcessor', 'POST', disableProcessorArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        setProcessor: function (dqProcessorPkg, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SetProcessor', 'POST', dqProcessorPkg, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};