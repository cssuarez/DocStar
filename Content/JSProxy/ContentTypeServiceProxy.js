/// <reference path="_ServiceProxyCore.js" />
// sync = true for synchronous call, if you really need to
var ContentTypeServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/ContentType.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        create: function (contentTypePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Create', 'POST', contentTypePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        get: function (contentTypeId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Get', 'POST', contentTypeId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        update: function (ContentTypePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Update', 'POST', ContentTypePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteContentType: function (contentTypeDeletePackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Delete', 'POST', contentTypeDeletePackage, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};