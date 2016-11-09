/// <reference path="../LibsInternal/ClientService.js" />
/// <reference path="../../../Astria.Server.Web/Scripts/jquery.signalR-2.2.0.min.js" />
(function (CompanyInstanceHubProxy, $) {
    // Obtain JSProxy classes in the public init function
    var svcProxy;
    var connected = false;
    var preConnectedFunctionCalls = [];

    //#region Hub Connection
    var debug = false;  // have debugging turned on/off for the signalR connection
    var connection = $.hubConnection(Constants.Server_Url + '/signalr', { useDefaultPath: false, logging: debug });
    var proxy = connection.createHubProxy('companyInstanceHub');
    var reconnectingNotificationTimeout;
    //Connection lost, retry operations in effect.
    connection.reconnecting(function () {
        if (!reconnectingNotificationTimeout) {
            reconnectingNotificationTimeout = setTimeout(function () { ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.Reconnecting); }, 3000);
        }
        Utility.OutputToConsole("SignalRReconnecting");
    });
    connection.reconnected(function () {
        //NOTE: Unlike when we are disconnected, we should not have to reacquire systray connections on a reconnect. SignalR will hold the messages for us until we are disconnected.
        clearTimeout(reconnectingNotificationTimeout);
        reconnectingNotificationTimeout = undefined;
        if (ClientService.currentStatus === ClientService.connectionStatus.Reconnecting) {
            ClientService.updateSystrayConnectionStatus(ClientService.lastStatus);
        }
        Utility.OutputToConsole("SignalRReconnected");
    });
    //Above reconnection failed, this will retry a connection to the server every 10 seconds.
    connection.disconnected(function () {
        clearTimeout(reconnectingNotificationTimeout);
        reconnectingNotificationTimeout = undefined;
        ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.LostServerConnection);
        setTimeout(function () {
            connection.start().done(ClientService.refreshSystrayConnections);
        }, 10000); // Restart connection after 10 seconds.
        Utility.OutputToConsole("SignalRDisconnected");
    });
    //#endregion Hub Connection

    //NOTE: Success callbacks must bind to 'signalRSuccessCallback_' + method enum (eg. 'signalRSuccessCallback_1' for Print)
    var onSuccess = function (mIR) {
        var result = {};
        if (mIR && mIR.Result) {
            result = mIR.Result;
        }
        $('body').trigger('signalRSuccessCallback_' + mIR.Method + '_' + mIR.TransactionId, [result]);
        $('body').off('signalRSuccessCallback_' + mIR.Method + '_' + mIR.TransactionId + ' signalRErrorCallback_' + mIR.method + '_' + mIR.TransactionId);
    };
    //NOTE: Error callbacks must bind to 'signalRErrorCallback_' + method enum (eg. 'signalRErrorCallback_1' for Print)
    var onError = function (mIR) {
        var handledError = Utility.triggerCustomEvent('signalRErrorCallback_' + mIR.Method + '_' + mIR.TransactionId, 'body', mIR);
        $('body').off('signalRSuccessCallback_' + mIR.Method + '_' + mIR.TransactionId + ' signalRErrorCallback_' + mIR.method + '_' + mIR.TransactionId);
        if (!handledError) {
            ErrorHandler.addErrors(mIR.Exception.Message);
        }
        ClientService.hideProgress();   // Hide any progress bars when an error occurs
    };

    var loadMessage = function (messageId, cb) {
        var sf = function (result) {
            cb(JSON.parse(result));
        };
        svcProxy.getMessage(messageId, sf);
    };
    var createMessage = function (message, cb) {
        var sf = function (result) {
            cb(result);
        };
        svcProxy.createMessage(message || '[]', sf);
    };

    //#region Callback Handling
    var callbacks = {
        onSendFileAcquiredCB: [],
        onServerErrorCB: [],
        browserSystrayConnectedCB: [],
        onSendProgressMessageCB: [],
        onSystrayConnectCB: [],
        onMobileFileBrowseDataChangeCB: [],
        onRenderCompleteCB: [],
        onSendDQNotificationCB: [],
        onSendProgressCB: [],
        onSendResultCB: []
    };
    var executeCallbacks = function (callbacks, args) {
        var idx = 0;
        var length = callbacks.length;
        for (idx; idx < length; idx++) {
            var cb = callbacks[idx];
            if (cb && typeof (cb) === 'function') {
                cb.apply(null, args);
            }
        }
    };
    // callbacks: required- array,  of callbacks for the event (event listeners)
    // callback: required - function, callback that has been or is to be defined for the event (listen to event)
    // isUnsubscribing: optional - boolean, whether or not to remove the callback from the event (stop listening)
    var updateCallbacks = function (callbacks, callback, isUnsubscribing) {
        if (!callback) {
            Utility.OutputToConsole("Can not update callbacks when passed in callback is undefined");
        }
        else {
            var idx = 0;
            var length = callbacks.length;
            var found = false;
            for (idx; idx < length; idx++) {
                var cb = callbacks[idx];
                if (cb === callback) {
                    found = true;
                    if (isUnsubscribing) {
                        callbacks.splice(idx, 1);
                    }
                    break;
                }
            }
            if (!found && !isUnsubscribing) {
                callbacks.push(callback);
            }
        }
    };
    //#endregion Callback Handling

    proxy.on('onSendFileAcquired', function (simpleDoc) {
        if (callbacks.onSendFileAcquiredCB.length > 0) {
            if (simpleDoc.MessageId) {
                loadMessage(simpleDoc.MessageId, function (resultObj) {
                    executeCallbacks(callbacks.onSendFileAcquiredCB, [resultObj]);
                });
            }
            else {
                //arguments: simpleDoc
                executeCallbacks(callbacks.onSendFileAcquiredCB, arguments);
            }
        }
    });
    proxy.on('onServerError', function (exceptionsML) {
        if (callbacks.onServerErrorCB.length === 0) {
            ErrorHandler.addErrors(Constants.c.signalR + ': ' + exceptionsML.Message);
        }
        else {
            // arguments: exceptionsML
            executeCallbacks(callbacks.onServerErrorCB, arguments);
        }
    });
    proxy.on('onSystrayDisconnectConnect', function (connectionId) {
        var currentSystrayConnId = ClientService.browserConnectPackage ? ClientService.browserConnectPackage.ConnectionId : '';
        if (currentSystrayConnId === connectionId) {
            ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.Disconnected);
        }
        ClientService.removeSystrayConnection(connectionId);
    });
    // Uses events bound to the body for onSuccess and onError
    proxy.on('onSendMethodInvocationResult', function (mIR) {
        if (mIR.Exception) {
            onError(mIR);
        }
        else {
            if (mIR.MessageId) {
                loadMessage(mIR.MessageId, function (resultObj) {
                    mIR.Result = resultObj;
                    onSuccess(mIR);
                });
            }
            else {
                onSuccess(mIR);
            }
        }
    });
    proxy.on('onBrowserSystrayConnected', function () {
        //arguments: bcP, browser connection package
        executeCallbacks(callbacks.browserSystrayConnectedCB, arguments);
    });
    proxy.on('onSendProgressMessage', function () {
        //arguments: actionResult, apiEvent
        executeCallbacks(callbacks.onSendProgressMessageCB, arguments);
    });
    proxy.on('onSystrayConnect', function () {
        //arguments: systrayConnection
        executeCallbacks(callbacks.onSystrayConnectCB, arguments);
    });
    proxy.on('onMobileFileBrowseDataChange', function () {
        //arguments: webBrowseAccessSettings
        executeCallbacks(callbacks.onMobileFileBrowseDataChangeCB, arguments);
    });
    proxy.on('onRenderComplete', function () {
        //arguments: pageIds
        executeCallbacks(callbacks.onRenderCompleteCB, arguments);
    });
    proxy.on('onSendDQNotification', function () {
        //arguments: DQNotificationEventArgs
        executeCallbacks(callbacks.onSendDQNotificationCB, arguments);
    });
    proxy.on('onSendProgress', function () {
        //arguments: string methodName , int percentDone
        executeCallbacks(callbacks.onSendProgressCB, arguments);
    });
    proxy.on('onSendResult', function () {
        //arguments: JsonActionResult
        executeCallbacks(callbacks.onSendResultCB, arguments);
    });

    //#region Public
    CompanyInstanceHubProxy.connection = connection;
    CompanyInstanceHubProxy.start = function (callBack) {
        //NOTE: You must subscribe to all on{MethodName} methods before calling start.
        connection.qs = { "ds-token": Page.authToken };
        connection.start().done(function () {
            connected = true;
            Utility.OutputToConsole(connection.transport.name);
            Utility.executeCallback(callBack);
            var length = preConnectedFunctionCalls.length;
            var i = 0;
            for (i; i < length; i++) {
                if (preConnectedFunctionCalls[i]) {
                    preConnectedFunctionCalls[i]();
                }
            }
        });
    };
    CompanyInstanceHubProxy.init = function () {
        svcProxy = SignalRServiceProxy();
    };
    CompanyInstanceHubProxy.setupInvokeMethod = function (invokeMethod, args, successCallback, errorCallback) {

        var iMP = {
            DestinationId: ClientService.browserConnectPackage.ConnectionId,
            Method: invokeMethod,
            Arguments: args,
            TransactionId: toRadix(Math.round((Math.pow(36, 32 + 1) - Math.random() * Math.pow(36, 32))), 36).slice(1)
        };
        $('body').on('signalRSuccessCallback_' + invokeMethod + '_' + iMP.TransactionId, function (ev, data) {
            Utility.executeCallback(successCallback, data);
        });
        $('body').on('signalRErrorCallback_' + invokeMethod + '_' + iMP.TransactionId, function (ev, data) {
            Utility.executeCallback(errorCallback, data);
            if (errorCallback) {
                return true;
            }
        });
        return iMP;
    };
    toRadix = function (N, radix) {
        var HexN = "", Q = Math.floor(Math.abs(N)), R;
        while (true) {
            R = Q % radix;
            HexN = "0123456789abcdefghijklmnopqrstuvwxyz".charAt(R)
                 + HexN;
            Q = (Q - R) / radix;
            if (Q === 0) { break; }
        }
        return ((N < 0) ? "-" + HexN : HexN);
    };
    CompanyInstanceHubProxy.onServerError = function (func) {
        //Takes one parameter that is an ExceptionsML
        onServerErrorCB = func;
    };
    CompanyInstanceHubProxy.browserConnectSystray = function (systrayConnectionId) {
        //Used to initiate a connection to the systray.
        try {
            proxy.invoke('browserConnectSystray', { ConnectionId: systrayConnectionId });
        } catch (e) {
            Utility.OutputToConsole(e);
        }
    };
    CompanyInstanceHubProxy.onBrowserSystrayConnected = function (func, isUnsubscribing) {
        //used as a call back from browserConnectSystray method. Takes one parameter that is a BrowserConnectPackage
        updateCallbacks(callbacks.browserSystrayConnectedCB, func, !!isUnsubscribing);
    };
    CompanyInstanceHubProxy.invokeMethod = function (invokeMethodPackage) {
        //Used to call methods in systray.
        try {
            var json = JSON.stringify(invokeMethodPackage.Arguments || {});
            if (json.length > Constants.UtilityConstants.MAX_SIGNALR_MESSAGE) {
                createMessage(json, function (messageId) {
                    invokeMethodPackage.Arguments = null;
                    invokeMethodPackage.MessageId = messageId;
                    proxy.invoke('invokeMethod', invokeMethodPackage);
                });
            }
            else {
                proxy.invoke('invokeMethod', invokeMethodPackage);
            }
        } catch (e) {
            Utility.OutputToConsole(e);
        }
    };
    CompanyInstanceHubProxy.onSendProgressMessage = function (func, isUnsubscribing) {
        //used for progress events in JS. Takes one parameter that is an ActionResult.
        updateCallbacks(callbacks.onSendProgressMessageCB, func, !!isUnsubscribing);
    };
    CompanyInstanceHubProxy.onSystrayConnect = function (func, isUnsubscribing) {
        //Notification of a new Systray, this systray may not be for you so you must check. Takes one parameter that is an SystrayConnection.
        updateCallbacks(callbacks.onSystrayConnectCB, func, !!isUnsubscribing);
    };
    CompanyInstanceHubProxy.onSendFileAcquired = function (func, isUnsubscribing) {
        // Notification of new file selection, represented as a SimpleDocument
        updateCallbacks(callbacks.onSendFileAcquiredCB, func, !!isUnsubscribing);
    };
    CompanyInstanceHubProxy.onMobileFileBrowseDataChange = function (func, isUnsubscribing) {
        // Notification of new mobile file browse data, represented as WebBrowseAccessSettings
        updateCallbacks(callbacks.onMobileFileBrowseDataChangeCB, func, !!isUnsubscribing);
    };
    CompanyInstanceHubProxy.onRenderComplete = function (func, isUnsubscribing) {
        updateCallbacks(callbacks.onRenderCompleteCB, func, !!isUnsubscribing);
    };
    CompanyInstanceHubProxy.onSendDQNotification = function (func, isUnsubscribing) {
        updateCallbacks(callbacks.onSendDQNotificationCB, func, !!isUnsubscribing);
    };
    CompanyInstanceHubProxy.onSendProgress = function (func, isUnsubscribing) {
        updateCallbacks(callbacks.onSendProgressCB, func, !!isUnsubscribing);
    };
    CompanyInstanceHubProxy.onSendResult = function (func, isUnsubscribing) {
        updateCallbacks(callbacks.onSendResultCB, func, !!isUnsubscribing);
    };
    // Groups:
    CompanyInstanceHubProxy.joinGroup = function (groupName) {
        if (!groupName) {
            return;
        }
        if (!connected) {
            var f = function () {
                CompanyInstanceHubProxy.joinGroup(groupName);
            };
            preConnectedFunctionCalls.push(f);
            return;
        }
        try {
            Utility.OutputToConsole('Joining Group ' + groupName);
            proxy.invoke('joinGroup', groupName);
        }
        catch (e) {
            Utility.OutputToConsole(e);
        }
    };
    CompanyInstanceHubProxy.leaveGroup = function (groupName) {
        try {
            Utility.OutputToConsole('Leaving Group ' + groupName);
            proxy.invoke('leaveGroup', groupName);
        }
        catch (e) {
            Utility.OutputToConsole(e);
        }
    };
    //#endregion Public

}(window.CompanyInstanceHubProxy = window.CompanyInstanceHubProxy || {}, jQuery));