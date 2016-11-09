/// <reference path="_AjaxCore.js" />
var ServiceProxyCore = function (serviceUrl, options) {
    options = options || {};
    var ac = AjaxCore(options);
    //All vars and functions are privately scoped if not defined within the return object.
    function getUrl(methodName) {
        var url = Constants.Server_Url + serviceUrl;
        var ssl = Utility.convertToBool($('#useSSL').val());
        if (ssl) {
            url += 'ssl';
        }
        url += '/' + methodName;
        return url;
    }
    function ajaxSuccess(result, textStatus, jqXHR, method, sf, ff, ajaxObject) {
        if (result.Error) {             //V2 Method
            if (result.Error.Type && result.Error.Type === 'Astria.Framework.DataContracts.LoginRequiredException') {
                window.location.href = Constants.Login_Url + "?message=" + result.Error.Data;
                return;
            }

            if (!options.raiseOverridableException && result.Error.Type && result.Error.Type === 'Astria.Framework.DataContracts.OverridableException') {
                var dontClose;
                ErrorHandler.displayOverridableDialogErrorPopup(result.Error.Message,
                    function (cleanup) {
                        ajaxObject.headers = { "ds-options": Constants.sro.OverrideErrors };
                        $.ajax(ajaxObject);
                        dontClose = true;
                        cleanup();
                    },
                    {
                        modal: true,
                        width: 'auto',
                        height: 'auto',
                        minWidth: 400,
                        close: function () { if (ff && !dontClose) { ff(jqXHR, textStatus); } } // no errorThrown, so no dialog displayed; just end 'busy'
                    });
                return;
            }
            if (ff) {
                ff(jqXHR, textStatus, result.Error);
            }
            return false;
        }
        if (result.businessException) { //V1 Method
            if (ff) {
                ff(jqXHR, textStatus, result.businessException);
            }
            return false;
        }
        if (sf) {
            if (result.hasOwnProperty('Result')) {        //V2 Method
                sf(result.Result);
            }
            else {
                sf(result[method + 'Result']);  //V1 Method
            }
        }
        return true;
    }
    function ajaxFailure(jqXHR, textStatus, errorThrown, ff) {
        if (ff && errorThrown !== 'abort') {
            ff(jqXHR, textStatus, { Message: errorThrown });
        }
    }
    //Public functions 
    return {
        queueAjaxCall: function (method, type, data, sf, ff, cf, cancellationToken, headers) {
            var success = function (result, textStatus, jqXHR, method, ajaxObject) {
                return ajaxSuccess(result, textStatus, jqXHR, method, sf, ff, ajaxObject);
            };
            var failure = function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.readyState === 0 && !jqXHR.responseText) {
                    Utility.OutputToConsole(jqXHR, textStatus, errorThrown);
                }
                else {
                    ajaxFailure(jqXHR, textStatus, errorThrown, ff);
                }
            };
            ac.queueAjaxCall(getUrl(method), method, type, data, success, failure, cf, cancellationToken, headers);
        },
        setCacheDuration: function (timeToCache) {
            ac.setCacheDuration(timeToCache);
        }
    };
};