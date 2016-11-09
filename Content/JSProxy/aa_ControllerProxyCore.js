/// <reference path="_AjaxCore.js" />
var ControllerProxyCore = function (controllerUrl) {
    //All vars and functions are privately scoped if not defined within the return object.
    var ac = AjaxCore();
    function getUrl(methodName) {
        return Constants.Url_Base + controllerUrl + '/' + methodName;
    }
    function ajaxSuccess(result, textStatus, jqXHR, method, sf, ff) {
        if (result.fullEx) {
            if (ff) {
                ff(jqXHR, textStatus, result.message);
            }
            return false;
        }
        if (sf) {
            sf(result.result);
        }
        return true;
    }
    function ajaxFailure(jqXHR, textStatus, errorThrown, ff) {
        if (ff && errorThrown !== 'abort') {
            ff(jqXHR, textStatus, errorThrown);
        }
    }
    //Public functions 
    return {
        queueAjaxCall: function (method, type, data, sf, ff, cf, cancellationToken) {
            var success = function (result, textStatus, jqXHR, method) {
                return ajaxSuccess(result, textStatus, jqXHR, method, sf, ff);
            };
            var failure = function (jqXHR, textStatus, errorThrown) {
                ajaxFailure(jqXHR, textStatus, errorThrown, ff);
            };
            ac.queueAjaxCall(getUrl(method), method, type, data, success, failure, cf, cancellationToken);
        },
        setCacheDuration: function (timeToCache) {
            ac.setCacheDuration(timeToCache);
        }
    };
};