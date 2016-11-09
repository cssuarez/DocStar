/// <reference path="_ServiceProxyCore.js" />
var SignalRServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/HostingV2/SignalR.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        createMessage: function (message, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateMessage', 'POST', message, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getMessage: function (messageId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetMessage', 'POST', messageId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getSystrayConnections: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetSystrayConnections', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};