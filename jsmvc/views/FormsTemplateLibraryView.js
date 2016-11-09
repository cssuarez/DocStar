var FormsTemplateLibraryView = Backbone.View.extend({
    model: null, // FormsDataCPX
    collection: null, // SlimFormTemplates
    className: 'FormsTemplateLibraryView no_text_select',
    viewData: {},
    categoryViews: [],
    events: {
        'click .createFormTemplate': 'createFormTemplate'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formtemplateslayout'));
        var ftlv = this;
        this.listenTo(this.collection, 'change:editing', function (model, value) {
            if (value) {    // ensure only one template has 'editing' true
                ftlv.collection.clearEditing(model.get('FormTemplateId'));
            }
        });
        this.listenTo(this.collection, 'change:selected', this.render);
        this.listenTo(this.collection, 'sync', this.render);
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.selectedCategoryName = this.options.categoryName || 'Categories';
        ro.selected = this.collection.getSelected(true);
        ro.hasFormDesignerGWP = Utility.hasFlag(window.gatewayPermissions, Constants.gp.FormsDesigner);
        return ro;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        this.cleanupCategoryViews();
        var idx = 0;
        var length = this.viewData.selected.length;
        for (idx; idx < length; idx++) {
            var formTemplate = this.viewData.selected[idx];
            var canView = Utility.hasFlag(formTemplate.get('EffectiveContentTypePermissions'), Constants.sp.View);
            var isNew = formTemplate.get('FormTemplateId') === Constants.t('emptyGuid');
            if (canView || (isNew && this.viewData.hasFormDesignerGWP)) {
                if (this.viewData.selectedCategoryName !== 'Categories' && isNew ) {
                    formTemplate.set('Category', this.viewData.selectedCategoryName);
                }
                var cv = new FormTemplateCategoryView({ model: formTemplate });
                this.$el.find('ul').append(cv.render().$el);
            }
        }
        return this;
    },
    close: function () {
        this.cleanupCategoryViews();
        this.unbind();
        this.remove();
    },
    cleanupCategoryViews: function () {
        var cv = this.categoryViews.pop();
        while (cv) {
            cv.close();
            cv = undefined;
            cv = this.categoryViews.pop();
        }
    },
    createFormTemplate: function () {
        var categoryName = this.viewData.selectedCategoryName;
        if (categoryName === Constants.c.categories) {
            categoryName = '';
        }
        var url = '#Forms/designer' + (categoryName ? '/' + categoryName : '') + '/New';
        var finalURL = '#Forms/designer' + (categoryName ? '/' + encodeURIComponent(categoryName) : '') + '/New';
        var testURL = encodeURIComponent(url);
        if (testURL !== encodeURIComponent(window.location.hash)) {
            Utility.navigate(finalURL, Page.routers.Forms, true, false);
        }
    }
});