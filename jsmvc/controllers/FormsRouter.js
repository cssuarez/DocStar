var FormsRouter = Backbone.Router.extend({
    formsView: null,
    lastHash: undefined,
    routes: {
        'Forms': 'formsPanel',
        'Forms/category/:categoryName': 'selectCategory',
        'Forms/designer/:categoryName/:templateName/:templateId': 'selectTemplate',
        'Forms/designer/:categoryName/New': 'newTemplate',
        'Forms/designer/New': 'newTemplate'
    },
    initialize: function () {
        if (this.formsView === null) {
            this.formsView = new FormsView({
                model: new FormsDataCPX({
                    Category: '',
                    SlimFormTemplates:window.slimFormTemplates.toJSON()
                })
            });
            $('#forms_tab_panel').html(this.formsView.render().$el);
        }
    },
    afterRoute: function () {
        ShowHidePanel.resize();
    },
    formsPanel: function () {
        this.onNavigate('forms');
        this.formsView.showForms();
    },
    selectCategory: function (categoryName) {
        this.onNavigate('selectCategory');
        this.formsView.showForms(categoryName);
    },
    selectTemplate: function (categoryName, templateName, templateId) {
        this.onNavigate('selectFormTemplate');
        this.formsView.showForms(categoryName, templateName, templateId);
    },
    newTemplate: function (categoryName) {
        this.onNavigate('newFormTemplate');
        this.formsView.showForms(categoryName, Constants.c.newTitle, Constants.c.emptyGuid);
    }
});