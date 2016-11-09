/// <reference path="../../../Astria.Server.Web/Scripts/jquery.signalR-2.2.0.min.js" />
var MonitorHubProxy = function (debug) {
    //All vars and functions are privately scoped if not defined within the return object.
    var connection = $.hubConnection(Constants.Server_Url + '/signalr', { useDefaultPath: false, logging: debug });
    var proxy = connection.createHubProxy('monitorHub');
    //Public functions 
    return {
        start: function (callBack) {
            //NOTE: You must subscribe to all on methods before calling start.
            connection.start().done(callBack);
        },
        onServerError: function (func) {
            proxy.on('onServerError', func);
        },
        onNewEventData: function (func) {
            proxy.on('onNewEventData', func);
        },

        sendMessage: function (message) {
            proxy.invoke('sendMessage', message);
        }
    };
};