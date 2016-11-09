/// <reference path="_ServiceProxyCore.js" />
var SearchServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Search.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        search: function (searchRequest, successFunc, failureFunc, completeFunc, cancellationToken) {
            if (!isNaN(searchRequest.Start)) {
                spc.queueAjaxCall('Search', 'POST', searchRequest, successFunc, failureFunc, completeFunc, cancellationToken);
            }
        },
        getSearchCount: function (searchRequest, successFunc, failureFunc, completeFunc, cancellationToken) {
            if (!isNaN(searchRequest.Start)) {
                spc.queueAjaxCall('GetSearchCount', 'POST', searchRequest, successFunc, failureFunc, completeFunc, cancellationToken);
            }
        },
        searchRelatedDocuments: function (docId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SearchRelatedDocuments', 'POST', docId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        searchPredefined: function (searchPredefinedPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SearchPredefined', 'POST', searchPredefinedPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        createSavedSearch: function (searchRequest, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('CreateSavedSearch', 'POST', searchRequest, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateSavedSearch: function (updateSavedSearchPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UpdateSavedSearch', 'POST', updateSavedSearchPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteSavedSearch: function (savedSearchId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteSavedSearch', 'POST', savedSearchId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getHitLocations: function (getHitLocationsPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetHitLocations', 'POST', getHitLocationsPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getDocumentHits: function (getHitLocationsPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetDocumentHits', 'POST', getHitLocationsPackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        vocabulary: function (vocabularyPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Vocabulary', 'POST', vocabularyPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getFields: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetFields', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getCustomFields: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetCustomFields', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getWFFields: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetWFFields', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getCachedViewData: function (id, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetCachedViewData', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        setCachedViewData: function (data, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SetCachedViewData', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getImportableFields: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetImportableFields', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getIndexInfo: function (optimize, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetIndexInfo', 'POST', optimize, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        reIndex: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ReIndex', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteReIndex: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteReIndex', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        updateCachedViewData: function (updateCachedViewDataArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('UpdateCachedViewData', 'POST', updateCachedViewDataArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};