/// <reference path="../../Content/JSProxy/AutomationHubProxy.js" />
/// <reference path="~/Content/LibsInternal/ClientService.js" />
var C3PI_eConnectView = Backbone.View.extend({
    events: {
    },
    settings: null,
    machineId: null,
    initialize: function (options) {
        this.settings = options && options.settings;        
        this.machineId = options && options.machineId;
        this.isDirtyCallback = options && options.isDirtyCallback;
        this.compiledTemplate = doT.template(Templates.get('c3pi_eConnect'));
        return this;
    },
    render: function () {
        this.$el.html(this.compiledTemplate(this.settings));

        this.clientSelector = new ClientSelectorView({
            tagName: 'li',
            label: Constants.c.source + ':',
            machineId: this.machineId
        }); 
        var vel = this.clientSelector.render().el;
        this.$el.find(".unstyledList").prepend(vel);

        this.fieldMapper = new C3PIFieldMapperView({
            mappings: this.settings.Mappings,
            isDirtyCallback: this.isDirtyCallback
        });
        vel = this.fieldMapper.render().el;
        this.$el.find('fieldset').after(vel);

        return this;
    },
    validate: function (definition) {
        return true;
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