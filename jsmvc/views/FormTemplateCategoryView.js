var FormTemplateCategoryView = Backbone.View.extend({
    model: null, // Slim Form Template
    className: 'FormTemplateCategoryView',
    tagName: 'li',
    viewData: {},
    events: {
        'click .createForm:not(".disabled")': 'createFormDocument',
        'click .editFormTemplate:not(".disabled")': 'editFormTemplate',
        'click .deleteFormTemplate:not(".disabled")': 'deleteFormTemplate',
        'dblclick': 'createFormDocument',
        'click .createPublicLink': 'createPublicLink'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formtemplatecategorylayout'));
        this.className = this.options.className || '';
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = this.model.toJSON();
        ro.isNew = this.model.get('FormTemplateId') === Constants.c.emptyGuid;
        ro.hasFormDesignerGWP = Utility.hasFlag(window.gatewayPermissions, Constants.gp.FormsDesigner);
        ro.canCreateForm = !ro.isNew && (Utility.hasFlag(this.model.get('EffectiveContentTypePermissions'), Constants.sp.Add_To));
        ro.canEditForm = Utility.hasFlag(this.model.get('EffectivePermissions'), Constants.sp.Modify);
        ro.canDeleteForm = !ro.isNew && Utility.hasFlag(this.model.get('EffectivePermissions'), Constants.sp.Delete);
        var contentGen = Utility.hasFlag(this.model.get('EffectivePermissions'), Constants.sp.ContentGeneration);
        ro.canCreateLink = window.publishFormsLicensed && !ro.isNew && ro.canCreateForm && contentGen;
        var rmoSP = Utility.reverseMapObject(Constants.sp);
        ro.canNotCreateFormTooltip = String.format(Constants.t('insufficientPermissionsRight'), Constants.t('sp_' + rmoSP[Constants.sp.Add_To]));
        var rmoGP = Utility.reverseMapObject(Constants.gp);
        ro.isDisabled = ro.hasFormDesignerGWP;
        ro.tooltip = '';
        if (ro.isDisabled) {
            ro.tooltip = String.format(Constants.t('insufficientPermissionsRight'), Constants.t('gp_' + rmoGP[Constants.gp.FormsDesigner]));
        }
        return ro;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        if (this.viewData.isDisabled) {
            this.$el.addClass('disabled');
        }
        this.$el.attr('id', this.model.get('Id'));
        return this;
    },
    createFormDocument: function (ev) {
        // Don't create a form if a button is double clicked
        var isButton = this.$el.find('.buttonContainer').has(ev.currentTarget).length > 0;
        if (ev.type === 'dblclick' && isButton) {
            return;
        }
        var canCreate = this.viewData.canCreateForm;
        var canView = Utility.hasFlag(this.model.get('EffectivePermissions'), Constants.sp.View);
        if (canCreate) {
            this.model.createFormDocument(FormDialogs.createDocument, canView);
        }
    },
    editFormTemplate: function (ev) {
        this.model.set('editing', true, { updateHash: true });
    },
    deleteFormTemplate: function () {
        var that = this;
        var okFunc = function (cleanup) {
            var formTemplateId = that.model.get('FormTemplateId');
            var ftPkg = new FormTemplatePackage({ Id: formTemplateId });
            ftPkg.destroy({
                success: function () {
                    Utility.executeCallback(cleanup);
                }
            });
        };
        var options = {
            title: Constants.c['delete'],
            height: 150
        };
        DialogsUtil.generalPromptDialog(String.format(Constants.c.deleteFormTemplatePrompt, this.model.get('Name')), okFunc, null, options);
    },
    createPublicLink: function (ev) {
        var model = new FormTemplate({ Id: this.model.get('FormTemplateId') });
        model.createPublicLink(FormDialogs.createPublicLink);
    }
});