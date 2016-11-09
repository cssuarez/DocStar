/// <reference path="_ServiceProxyCore.js" />
var ImportExportServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/ImportExport.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getImportJob: function (id, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetImportJob', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        GetImportJobsMachineNames: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetImportJobsMachineNames', 'POST',undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        GetImportJobsFiltered: function (pkg, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetImportJobsFiltered', 'POST', pkg, successFunc, failureFunc, completeFunc, cancellationToken);
        },       
        SendImportJobDetails: function (filterdata, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('SendImportJobDetails', 'POST', body, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        ExportToCSV: function (searchRequest, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ExportToCSV', 'POST', searchRequest, successFunc, failureFunc, completeFunc, cancellationToken);
        }

    };
};