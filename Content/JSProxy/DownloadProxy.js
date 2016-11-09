/// <reference path="_ControllerProxyCore.js" />
var DownloadProxy = function () {
    //All vars and functions are privately scoped if not defined within the return object.
    var cpc = ControllerProxyCore('Download');
    // Public Functions
    return {
        setCacheDuration: function (timeToCache) {
            cpc.setCacheDuration(timeToCache);
        },
        CreateDownloadLink: function (documentIds, emailOptions, sendOptions, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { documentIds: documentIds, emailOptions: emailOptions, sendOptions: sendOptions };
            cpc.queueAjaxCall('CreateDownloadLink', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};