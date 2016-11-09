/// <reference path="_ControllerProxyCore.js" />
var WorkflowProxy = function () {
    //All vars and functions are privately scoped if not defined within the return object.
    var cpc = ControllerProxyCore('Workflow');
    // Public Functions
    return {
        setCacheDuration: function (timeToCache) {
            cpc.setCacheDuration(timeToCache);
        },
        GetAlertCounts: function (lastChecked, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { lastChecked: lastChecked, cacheBustingToken: Utility.getCacheBusterStr() };
            cpc.queueAjaxCall('GetAlertCounts', 'GET', data, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};