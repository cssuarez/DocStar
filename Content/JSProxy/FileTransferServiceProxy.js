var FileTransferServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/FileTransfer.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        createPublicImage: function (publicImage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('CreatePublicImage', 'POST', publicImage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getPublicImage: function (publicImageId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetPublicImage', 'POST', publicImageId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        updatePublicImage: function (publicImage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('UpdatePublicImage', 'POST', publicImage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        deletePublicImage: function (publicImageId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DeletePublicImage', 'POST', publicImageId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        }
    };
};