/// <reference path="_ServiceProxyCore.js" />
var StampServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Stamp.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getImageStamp: function (id, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetImageStamp', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getAll: function (annoStampGetPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAll', 'POST', annoStampGetPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getAllSlim: function (annoStampGetPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAllSlim', 'POST', annoStampGetPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getAllForUser: function (annoStampGetPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAllForUser', 'POST', annoStampGetPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteImageStamp: function (id, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteImageStamp', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateImageStamp: function (imageStamp, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UpdateImageStamp', 'POST', imageStamp, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        createImageStamp: function (imageStamp, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateImageStamp', 'POST', imageStamp, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteTextStamp: function (id, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteTextStamp', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getTextStamp: function (id, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetTextStamp', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateTextStamp: function (stamp, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UpdateTextStamp', 'POST', stamp, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        createTextStamp: function (stamp, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateTextStamp', 'POST', stamp, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};