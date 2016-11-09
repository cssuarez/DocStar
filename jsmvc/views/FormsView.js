var FormsView = Backbone.View.extend({
    model: null, //FormsDataCPX
    dataFetched: false,
    className: '',
    viewData: {},
    formsTemplateLibView: null,
    formsDesignerView: null,
    catNavView: null,
    formsCC: new FormsCC(),
    events: {
        'click .collapse_arrow': 'collapseNavigationPanel',
        'click .expand_arrow': 'expandNavigationPanel'
    },
    initialize: function (options) {
        this.options = options;
        this.listenTo(window.slimFormTemplates, 'sync', function (collection, resp, options) {
            this.model.get('SlimFormTemplates').reset(collection.toJSON(), options);
        });
        this.listenTo(window.slimFormTemplates, 'add', function (model, collection, options) {
            this.model.get('SlimFormTemplates').add(model.toJSON(), options);
        });
        this.listenTo(window.slimFormTemplates, 'remove', function (model, collection, options) {
            this.model.get('SlimFormTemplates').remove(model, options);
        });
        this.listenTo(this.model.get('SlimFormTemplates'), 'change:editing', function (model, value, options) {
            options = options || {};
            if (value && !options.ignoreChange) {
                this.updateDesignerView(model.get('Category'), model.get('Name'), model.get('FormTemplateId'));
            }
        });
        this.listenTo(this.model, 'change:Category', function (model, value, options) {
            options = options || {};
            if (!options.ignoreChange) {
                this.updateCategoryView(value);
            }
        });
        this.compiledTemplate = doT.template(Templates.get('formslayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        // Obtain selected category name
        ro.selectedCategoryName = this.model.get('Category');
        return ro;
    },
    render: function (cf) {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        if (this.catNavView && this.catNavView.close) {
            this.catNavView.close();
        }
        this.catNavView = new FormsCategoryNavigationView({
            model: this.model
        });
        this.$el.find('.navigationLayout').append(this.catNavView.render(cf).$el);
        ShowHidePanel.setupNavPanelResize(this.$el.find('.navigationLayout'), this.$el.find('.mainLayout'));
        return this;
    },
    closeDesignerView: function () {
        if (this.formsDesignerView && this.formsDesignerView.close) {
            this.formsDesignerView.close();
        }
    },
    closeLibraryView: function () {
        if (this.formsTemplateLibView && this.formsTemplateLibView.close) {
            this.formsTemplateLibView.close();
        }
    },
    closeChildViews: function () {
        this.closeDesignerView();
        this.closeLibraryView();
    },
    renderLoadErrors: function (errors) {
        this.$el.find('.mainLayout').empty();
        ErrorHandler.removeErrorTagsElement(this.$el);
        var idx = 0;
        var length = errors.length;
        for (idx; idx < length; idx++) {
            var div = document.createElement('div');
            div.className = css.warningErrorClass + ' spacingLeftTopBottom';
            div.textContent = errors[idx];
            this.$el.find('.mainLayout').append(div);
        }
    },
    showForms: function (category, templateName, templateId) {
        var currCat = this.model.get('Category');
        var opts = {
            updateHash: true,
            navigationOptions: {
                replace: true
            }
        };
        var sfts = this.model.get('SlimFormTemplates');
        // Navigate to category if the user doesn't have permissions to the designer
        var hasFormDesignerGWP = Utility.hasFlag(window.gatewayPermissions, Constants.gp.FormsDesigner);
        // Determine if there was a form template that was being edited
        var editTemplate = sfts.getTemplateInEdit();
        if ((!templateName || !templateId) && editTemplate) {
            templateName = editTemplate.get('Name');
            templateId = editTemplate.get('FormTemplateId');
            opts.ignoreChange = true;   // prevents call to update designer view from a listenTo binding in this views initialize
        }
        if (hasFormDesignerGWP && templateName && templateId) {
            sfts.clearEditing();
            if (templateId === Constants.c.emptyGuid) {
                this.updateDesignerView(category, templateName, templateId);
            }
            else {
                sfts.get(templateId).set('editing', true, opts);
            }
        }
        else {
            if (!category) {
                this.model.set('Category', Constants.t('categories'), opts);
            }
            else if (currCat === category) {
                this.model.trigger('change:Category', this.model, category, { updateHash: true });
            }
            else {
                this.model.set('Category', category, { updateHash: true });
            }
        }
    },
    updateCategoryView: function (categoryName) {
        // Switch to Library View
        this.model.get('SlimFormTemplates').setSelectedInCategory(categoryName);
        this.closeChildViews();
        this.formsTemplateLibView = new FormsTemplateLibraryView({
            model: this.model,
            collection: this.model.get('SlimFormTemplates'),
            categoryName: this.model.get('Category')
        });
        this.$el.find('.mainLayout').html(this.formsTemplateLibView.render().$el);
    },
    updateDesignerView: function (categoryName, templateName, templateId) {
        var that = this;
        // Update Category to be empty so that the user can click on the category containing the template, otherwise the templates category is seen as being selected
        // ignoreChange: true so that the url isn't followed
        this.model.set('Category', '', { ignoreChange: true });
        var fModel = new FormTemplatePackage();
        var sf = function (result) {
            var ftp = result.at(0).get('FormTemplatePackage');
            if (templateId === Constants.c.emptyGuid) {  // create new form template package
                var ids = Utility.getSequentialGuids(1);
                var template = new FormTemplate({
                    FormProperty: Constants.fp.None
                });
                result = {
                    Id: Constants.c.emptyGuid,
                    Elements: [],
                    ElementGroups: [],
                    ElementGroupMembers: [],
                    Template: template.toJSON(),
                    Parts: [{
                        Id: ids.shift(0),
                        BookmarkLabel: Constants.t('part') + ' - 1',
                        Sequence: 0
                    }]
                };
                result.Template.Category = categoryName || Constants.c.general;
                fModel.set(result, { silent: true });
            }
            else {  // Obtained form template package, returned as a Backbone.Model - Form Template Package
                ftp.Id = templateId;
                fModel.set(ftp, { silent: true });
            }
            that.closeDesignerView();
            that.formsDesignerView = new FormsDesignerView({
                model: fModel,
                formsData: that.model
            });
            that.$el.find('.mainLayout').html(that.formsDesignerView.render().$el);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.addErrors(errorThrown);
        };
        this.formsCC.fetch({
            success: sf,
            failure: ff,
            formId: templateId,
            includeElementMarkup: true
        });
    },
    //#region Event Handling
    collapseNavigationPanel: function (ev) {
        var $navPanel = this.$el.find('.navigationLayout');
        var $collapseTarget = $(ev.currentTarget);
        ShowHidePanel.collapseNavigationPanel($navPanel, $collapseTarget);
    },
    expandNavigationPanel: function (ev) {
        var $navPanel = this.$el.find('.navigationLayout');
        var $expandTarget = $(ev.currentTarget);
        ShowHidePanel.expandNavigationPanel($navPanel, $expandTarget);
    }
    //#endregion Event Handling
});