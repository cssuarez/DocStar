var ActionEditView = Backbone.View.extend({
    viewData: {},
    events: {},
    initialize: function () {
        //this.compiledTemplate = doT.template($("#buzz_spaces_edit_html4_en").html());
        this.compiledTemplate = doT.template(Templates.get('actionlayout'));
        return this;
    },
    render: function () {
        // Refresh viewData.list               
        $(this.el).html(this.compiledTemplate(this.viewData));
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        return this;
    },
    saveChanges: function () {
    },
    kill: function () {
    },
    isUnique: function () {
    }
});