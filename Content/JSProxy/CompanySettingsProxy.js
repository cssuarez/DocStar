/// <reference path="_ServiceProxyCore.js" />
var CompanySettingsProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/HostingV2/Company.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        GetCompanySystemNotification: function (companyId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetCompanySystemNotification', 'POST', companyId, successFunc, failureFunc, completeFunc, cancellationToken);
        }       
    };
};