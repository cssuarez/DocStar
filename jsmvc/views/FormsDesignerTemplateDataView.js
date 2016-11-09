var FormsDesignerTemplateDataView = Backbone.View.extend({
    model: null, // Form Template Package
    className: 'FormsDesignerTemplateDataView',
    events: {
        'click': 'selectFormSettings'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formsdesignertemplatedatalayout'));
        this.listenTo(this.model.get('Template'), 'change', this.render);
        var dataView = this;
        this.listenTo(this.model, 'change:selected', function (model, value) {
            if (value) {
                dataView.model.get('Elements').clearSelected();
                dataView.$el.addClass('selected');
            }
            else {
                dataView.$el.removeClass('selected');
            }
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.Template = this.model.get('Template').toJSON();
        ro.DisplayName = ro.Template.Category + ': ' + ro.Template.Name;
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    selectFormSettings: function (ev) {
        this.model.set('selected', true);
    }
    //#endregion Event Handling
});