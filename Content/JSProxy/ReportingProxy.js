/// <reference path="_ServiceProxyCore.js" />
var ReportingProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Reporting.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getAll: function (getAllPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetAll', 'POST', getAllPkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getAllSettings: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetAllSettings', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        setSettings: function (dbSyncSettings, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('SetSettings', 'POST', dbSyncSettings, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        deleteSettings: function (instanceId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DeleteSettings', 'POST', instanceId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getReportSchedule: function (scheduleId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetReportSchedule', 'POST', scheduleId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getSchedulesForReport: function (reportId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetSchedulesForReport', 'POST', reportId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        createReportSchedule: function (reportSchedulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('CreateReportSchedule', 'POST', reportSchedulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        updateReportSchedule: function (reportSchedulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('UpdateReportSchedule', 'POST', reportSchedulePkg, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        deleteReportSchedule: function (scheduleId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('DeleteReportSchedule', 'POST', scheduleId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        }
    };
};