/// <reference path="../../../Astria.Server.Web/Scripts/jquery.signalR-2.2.0.min.js" />
var AutomationHubProxy = function (debug) {
    //All vars and functions are privately scoped if not defined within the return object.
    var connection = $.hubConnection(Constants.Server_Url + '/signalr', { useDefaultPath: false, logging: debug });
    var proxy = connection.createHubProxy('AutomationHub');
    var itentionalDisconnect = false;
    //Connection lost, retry operations in effect.
    connection.reconnecting(function () {
        Utility.OutputToConsole("SignalRReconnecting");
    });
    connection.reconnected(function () {
        Utility.OutputToConsole("SignalRReconnected");
    });
    //Above reconnection failed, this will retry a connection to the server every 10 seconds.
    connection.disconnected(function () {
        if (itentionalDisconnect) {
            return;
        }
        setTimeout(function () {
            connection.start();
        }, 10000); // Restart connection after 10 seconds.
        Utility.OutputToConsole("SignalRDisconnected");
    });
    var onServerError = function (exceptionsML) {
        ErrorHandler.addErrors(exceptionsML.Message);
    };
    proxy.on('onServerError', onServerError);
    //Public functions 
    return {
        start: function (callBack) {
            //NOTE: You must subscribe to all on{MethodName} methods before calling start.
            connection.qs = { "ds-token": Page.authToken };
            itentionalDisconnect = false;
            connection.start().done(function () {
                Utility.OutputToConsole('Automation:' + connection.transport.name);
                if (callBack) {
                    callBack();
                }
            });
        },
        stop: function () {
            itentionalDisconnect = true;
            connection.stop();
        },
        onAutomationSvcConnect: function (func) {
            //Notification of a new Automation Connection.
            proxy.on('onAutomationSvcConnect', func);
        },
        onAutomationSvcDisconnect: function (func) {
            proxy.on('onAutomationDisconnectConnect', func);
        }    
    };
};