var CustomFieldMetaManagerEditView = Backbone.View.extend({
    viewData: {},
    events: {},
    customFieldsEditView: null,
    groupEditView: null,
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('customfieldmetamanagerlayout'));
        this.customFieldsEditView = new CustomFieldMetaEditView();
        this.groupEditView = new CustomFieldMetaGroupEditView();
        return this;
    },
    render: function () {
        $(this.el).html(this.compiledTemplate(this.viewData));
        this.customFieldsEditView.selected = undefined;
        this.groupEditView.selected = undefined;
        this.$el.find('#customfields_layout').append(this.customFieldsEditView.render().$el);
        this.$el.find('#customfieldsgroup_layout').append(this.groupEditView.render().$el);
        this.groupEditView.setupSlapbox();
        this.delegateEvents(this.events);
        return this;
    }
});
