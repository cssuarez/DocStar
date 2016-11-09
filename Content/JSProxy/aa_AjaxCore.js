/// <reference path="../LibsInternal/Utility.js" />
/// <reference path="../LibsExternal/md5.js" />
/// <reference path="../LibsInternal/ErrorHandler.js" />
var AjaxCore = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    options = options || {};
    var pendingOperation = false;
    var cacheDuration;
    var queue = [];
    var async = !options.sync;
    function getKey(method, data) {
        if (data && data.cacheKey) {
            return data.cacheKey;
        }
        if (!data) {
            return method;
        }
        var jsonString = JSON.stringify(data);
        var crc = md5(jsonString);
        return method + crc;
    }
    function makeAjaxCall() {
        if (pendingOperation || queue.length === 0) {
            return;
        }
        pendingOperation = true;
        var ajaxSettings = queue.pop();
        ajaxSettings.headers=ajaxSettings.headers === "" ? null : ajaxSettings.headers;
        var xhr;
        if (cacheDuration) {
            var key = getKey(ajaxSettings.serverMethod, ajaxSettings.originalData);
            var cachedResult = Utility.GetCachedItem(key);
            if (cachedResult && cachedResult.result) {
                ajaxSettings.success(cachedResult.result, cachedResult.textStatus, cachedResult.jqXHR, ajaxSettings);
                ajaxSettings.complete(cachedResult.jqXHR, cachedResult.textStatus);
                return;
            }
        }

        xhr = $.ajax(ajaxSettings);
        ajaxSettings.cancellationToken.cancel = function () {
            pendingOperation = false;
            xhr.abort();
        };
    }
    function ajaxSuccess(result, textStatus, jqXHR, method, sf, ff, ajaxObject) {
        try {
            var isSuccess = sf(result, textStatus, jqXHR, method, ajaxObject);
            if (isSuccess && cacheDuration) {
                var key = getKey(method, ajaxObject.originalData);
                var cacheEntry = { result: result, textStatus: textStatus, jqXHR: jqXHR, method: method };
                Utility.AddCacheItem(key, cacheEntry, cacheDuration);
            }
        }
        catch (ex) {
            try {
                Utility.OutputToConsole(ex);
                ff(jqXHR, textStatus, ex);
            }
            catch (ex2) {
                Utility.OutputToConsole(ex2);
                ErrorHandler.displayGeneralDialogErrorPopup(JSON.stringify({ OuterError: ex.message, InnerError: ex2.message }), undefined, 'AJAX CORE Exception (Success Function)');
            }
        }
    }
    function ajaxFailure(jqXHR, textStatus, errorThrown, ff) {
        try {
            if (textStatus.toLowerCase() === 'error') {
                ajaxComplete(jqXHR, textStatus, null, {});
            }
            if (ff) {
                ff(jqXHR, textStatus, errorThrown);
            }
        }
        catch (ex) {
            Utility.OutputToConsole(ex);
            ErrorHandler.displayGeneralDialogErrorPopup(ex.message, undefined, 'AJAX CORE Exception (Failure Function)');
        }
    }
    function ajaxComplete(jqXHR, status, cf, cancellationToken, method) {
        pendingOperation = false;
        cancellationToken.cancel = undefined;
        try {
            if (cf) {
                cf(jqXHR, status);
            }
            $('body').trigger(method + '.qunit');
        }
        catch (ex) {
            Utility.OutputToConsole(ex);
            ErrorHandler.displayGeneralDialogErrorPopup(ex.message, undefined, 'AJAX CORE Exception (Failure Function)');
        }
        makeAjaxCall();
    }
    function getAjaxObject(url, method, type, data, sf, ff, cf, cancellationToken, headers) {
        if (!cancellationToken) {
            cancellationToken = {};
        }
        var jsonData;
        var skipStringifyWcf = !!options.skipStringifyWcf;
        if (type === "GET") {
            jsonData = data;
        } else if (skipStringifyWcf) {
            jsonData = JSON.stringify(data);
        } else {
            jsonData = JSON.stringifyWcf(data);
        }
        var o;
        o = {
            url: url,
            data: jsonData,
            headers: headers,
            type: type,
            async: async,
            contentType: "application/json; charset=utf-8",
            success: function (result, textStatus, jqXHR) { ajaxSuccess(result, textStatus, jqXHR, method, sf, ff, o); },
            complete: function (jqXHR, status) { ajaxComplete(jqXHR, status, cf, cancellationToken, method); },
            error: function (jqXHR, textStatus, errorThrown) { ajaxFailure(jqXHR, textStatus, errorThrown, ff); },
            cancellationToken: cancellationToken,
            serverMethod: method,
            originalData: data
        };
        return o;
    }
    function qAjaxCall(url, method, type, data, sf, ff, cf, cancellationToken, headers) {
        var ajaxObj = getAjaxObject(url, method, type, data, sf, ff, cf, cancellationToken, headers);
        queue.push(ajaxObj);
        ajaxObj.cancellationToken.cancel = function () {
            queue.splice(queue.indexOf(ajaxObj, 1));
        };
        makeAjaxCall();
    }
    //Public functions 
    return {
        queueAjaxCall: function (url, method, type, data, sf, ff, cf, cancellationToken, headers) {
            qAjaxCall(url, method, type, data, sf, ff, cf, cancellationToken, headers);
        },
        setCacheDuration: function (timeToCache) {
            cacheDuration = timeToCache;
        }
    };
};