/// <reference path="_ServiceProxyCore.js" />
var SearchResultServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/SearchResult.svc/rest', options);
    //Public functions 
    return {
        'delete': function (deleteSearchResultArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Delete', 'POST', deleteSearchResultArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        'remove': function (removeSearchResultArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Remove', 'POST', removeSearchResultArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        }
    };
};