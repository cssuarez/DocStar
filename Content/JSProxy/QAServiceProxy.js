var QAServiceProxy = function (options) {
    var spc = ServiceProxyCore('/AstriaV2/QA.svc/rest', options);
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        setup: function (args, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Setup', 'POST', args, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        teardown: function (args, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Teardown', 'POST', args, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getConstants: function (args, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetConstants', 'POST', args, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};