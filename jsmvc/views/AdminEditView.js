// View for editing Admin page
// Renders a compiled template using doU.js
var AdminEditView = Backbone.View.extend({
    //TODO: scain do we need this View?
    viewData: {},
    events: {

    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('adminlayout'));
        return this;
    },

    render: function () {
        // Refresh viewData.list
        this.viewData.list = window.adminCC;
        this.viewData.listdbf = window.databaseFields;
        this.viewData.listct = window.contentTypes;
        this.viewData.listsc = window.securityClasses;
        this.viewData.listi = window.inboxes;
        this.viewData.listcf = window.customFieldMetas;
        this.viewData.listu = window.users;
        this.viewData.listr = window.roles;
        this.viewData.listsysPref = window.systemPreferences;

        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);
        this.delegateEvents(this.events);
        return this;
    }

});