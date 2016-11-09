/// <reference path="../../Content/JSProxy/AutomationHubProxy.js" />
/// <reference path="~/Content/LibsInternal/ClientService.js" />
var C3PIMasterView = Backbone.View.extend({
    initialize: function () {
        this.compiledTemplate = doT.template(Templates.get('c3pimasterlayout'));
        return this;
    },
    render: function () {
        if (this.selected === undefined && window.c3pis.models.length > 0) {
            this.setSelected(window.c3pis.models[0]);
        }
        var renderObject = { errorMsg: window.c3piCC.errorMsg, models: window.c3pis.models, selected: this.selected };
        this.$el.html(this.compiledTemplate(renderObject));
        var subView = new C3PIEditView({ model: this.selected });
        var that = this;
        // the subView doesn't have to have a select[name="connection"), but it probably does, and if it does, it must behave like the one in eConnect.
        this.$el.find('select[name="connection"]').combobox({
            onSelect: function (data) {
                var i = parseInt(data.ui.item.option.value, 10);
                if (i >= 0) {
                    that.setSelected(window.c3pis.models[i]);
                } else {
                    that.setSelected(null); // null represents selection of '--new--'; distinct from undefined, which represents "ain't been here before"
                }
                that.render();
            },
            onChange: function (data) {
                subView.name = data.event.currentTarget.value;
                subView.isDirty();
            }
        });
        var vel = subView.render().el;
        this.$el.append(vel);
        subView.name = this.$el.find("select[name='connection'] option[selected]").text();
        this.$el.find(".throbber").hide();
        return this;
    },
    setSelected: function (model) {
        this.selected = model;
        if (model) {
            this.listenTo(this.selected, "change:Name", function (model, options) {
                this.$el.find("select[name='connection'] option[selected]").text(model.get("Name"));
            });
            this.listenTo(this.selected, 'change:loading', function (model, value, options) {
                if (!!this.selected.get('loading')) {
                    this.$el.find(".throbber").show();
                } else {
                    this.$el.find(".throbber").hide();
                }
            });
        }
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