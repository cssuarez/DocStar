/// <reference path="../../Content/JSProxy/AutomationHubProxy.js" />
/// <reference path="~/Content/LibsInternal/ClientService.js" />
var ClientSelectorView = Backbone.View.extend({
    automationHub: AutomationHubProxy(false),
    hubStarted: false,
    events: {
        "change select[name='clientOrServer']": "changeType",
        "change select[name='MachineId']": "clientChange"
    },
    machineId: null,
    initialize: function (options) {
        that = this;
        this.machineId = options && options.machineId;
        this.label = options && options.label; // if set, a label with this text is included
        this.compiledTemplate = doT.template(Templates.get('clientselector'));
        this.automationHub.onAutomationSvcConnect(function (newConn) { that.onAutomationSvcConnect(newConn, that); });
        this.automationHub.onAutomationSvcDisconnect(function (connId) { that.onAutomationSvcDisconnect(connId, that); });
        return this;
    },
    onAutomationSvcConnect: function (newConnection, that) {
        Utility.OutputToConsole('onAutomationSvcConnect');
        var length = window.automationConnections.length;
        var exists = false;
        var i = 0;
        for (i; i < length; i++) {
            if (window.automationConnections[i].ConnectionId === newConnection.ConnectionId) {
                window.automationConnections[i] = newConnection;
                exists = true;
                break;
            }
            else if (window.automationConnections[i].MachineId === newConnection.MachineId) {
                window.automationConnections[i] = newConnection;
                exists = true;
                break;
            }
        }
        if (!exists) {
            window.automationConnections.push(newConnection);
        }
        window.automationConnections.sort(function (a, b) {
            return a.MachineName < b.MachineName ? 1 : -1;
        });
        that.render();
    },
    onAutomationSvcDisconnect: function (connectionId, that) {
        Utility.OutputToConsole('onAutomationSvcDisconnect');
        var length = window.automationConnections.length;
        var exists = false;
        var i = 0;
        for (i; i < length; i++) {
            if (window.automationConnections[i].ConnectionId === connectionId) {
                window.automationConnections.splice(i, 1);
                exists = true;
                break;
            }
        }
        if (exists) {
            that.render();
        }
    },
    onNavigateAway: function (that) {
        if (that.hubStarted) {
            that.hubStarted = false;
            that.automationHub.stop();
            Utility.OutputToConsole('Automation hub stopped');
        }
        Navigation.onNavigationCallback = null;
    },
    render: function () {
        var that = this;
        if (!that.hubStarted) {
            that.hubStarted = true;
            that.automationHub.start();
            Utility.OutputToConsole('Automation hub started');
        }
        Navigation.onNavigationCallback = function () { that.onNavigateAway(that); };
        var clientOptionSelected = !!this.machineId; // non-null/non-empty means that a client is selected or users wishes to select one (-1 indicates not available or none selected yet)
        var clientNotFound = false;
        var indicatorClass = 'connectionIndicator';
        if (clientOptionSelected && this.machineId !== '-1') {
            clientNotFound = true;
            var length = window.automationConnections.length;
            var i = 0;
            for (i = 0; i < length; i++) {
                var ac = window.automationConnections[i];
                if (ac.MachineId === this.machineId) {
                    clientNotFound = false;
                    break;
                }
            }
        }
        if (clientNotFound) {
            indicatorClass = 'connectionIndicator ui-icon ui-icon-alert';
        }
        var renderObject =
            {
                allowServer: Utility.isSuperAdmin(), // TODO this to become permission-based
                clientIsSelected: clientOptionSelected,
                serverSelected: clientOptionSelected ? '' : 'selected="selected"',
                clientSelected: clientOptionSelected ? 'selected="selected"' : '',
                machineId: this.machineId,
                automationConnections: window.automationConnections,
                clientNotFound: clientNotFound,
                indicatorClass: indicatorClass,
                label: this.label
            };
        this.$el.html(this.compiledTemplate(renderObject));
        return this;
    },
    changeType: function (e) {
        this.machineId = e.currentTarget.value === 'client' ? '-1' : null;
        var that = this;
        setTimeout(function () {
            that.render();
        }, 3); // can't just do this.render() there--doing so inside this event causes parent's event handler to stop working
    },
    clientChange: function (e) {
        this.machineId = e.currentTarget.value;
    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (model, error) {
        var errors = {};
        if (error.statusText === undefined) {
            errors = error;
        }
        else {
            errors = error.statusText;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    }
});