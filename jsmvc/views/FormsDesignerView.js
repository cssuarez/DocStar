var FormsDesignerView = Backbone.View.extend({
    model: null, // Form Template Package
    formsData: null, // FormsDataCPX
    className: 'FormsDesignerView',
    formElementControlsView: null,
    formTemplateSettingsView: null,
    canvasView: null,
    renderTimeout: undefined,
    events: {
        "click .createFormFromTemplate:not('.disabled')": "createFormDocument",
        "click .saveFormTemplate:not('.disabled')": "saveChanges",
        "click .saveAsFormTemplate:not('.disabled')": "saveChangesAs",
        "click .deleteFormTemplate:not('.disabled')": "kill",
        "change select[name='DefaultContentTypeId']": "changeContentType",
        "click .addAFieldMessage": "openAddFields"
    },
    initialize: function (options) {
        var that = this;
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formsdesignerlayout'));
        this.formsData = this.options.formsData;
        this.formTemplateDataView = new FormsDesignerTemplateDataView({ model: this.model });
        this.formPartView = new FormsDesignerFormPartView({ model: this.model });
        this.listenTo(this.model, 'change:editingFormulas', function (model, value, options) {
            this.$el.find('.editingFormulasOverlay').toggle(!!value);
        });
        this.listenTo(this.model.get('Elements'), 'change:selected', function (model, value, options) {
            if (value) {
                that.model.set('selected', false);
                model.collection.clearSelected(model.get('Id'));
                that.openFieldSettings(true);
            }
        });
        this.listenTo(this.model.get('Elements'), 'remove', function (model, collection, options) {
            model.destroy({ silent: true });
            var selected = collection.getSelected();
            if (!collection || collection.length === 0 || (selected && selected.length === 0)) {
                that.openFieldSettings(false);
            }
        });
        this.listenTo(window.contentTypes, 'change:Name', function (model, value, options) {
            that.renderContentTypes();
        });
        this.listenTo(window.contentTypes, 'add reset', function (model, collection, options) {
            that.renderContentTypes();
            that.formElementControlsView.render();
        });
        this.listenTo(window.contentTypes, 'remove', function (model, collection, options) {
            if (this.model.getDotted('Template.DefaultContentTypeId') === model.get('Id')) {
                this.model.setDotted('Template.DefaultContentTypeId', options.replacementId, { ignoreChange: true });
            }
            that.renderContentTypes();
            that.formElementControlsView.render();
        });
        this.listenTo(this.model.get('Template'), 'change:DefaultContentTypeId', function (model, collection, options) {
            if (this.formElementControlsView) {
                this.formElementControlsView.render();
            }
            var ctId = this.model.getDotted('Template.DefaultContentTypeId');
            if (this.inlineCTBView) {
                this.inlineCTBView.setContentTypeId(ctId);
            }
            this.$el.find('select[name="DefaultContentTypeId"]').val(ctId);
        });

        this.listenTo(this.model.get('Template'), 'change:CSSLayout', function (model, value, options) {
            options = options || {};
            if (!options.ignoreChange) {
                this.updateCSSLayout();
            }
        });
        this.listenTo(this.model, 'change:selected', function (model, value) {
            if (value) {
                that.selectFormSettings();
            }
        });
        this.listenTo(this.model, 'change:executing', function (model, value, options) {
            var $btnsContainer = that.$el.find('.formTemplateButtonPanel');
            var $buttons = $btnsContainer.find('.custom_button');
            if (value) {
                $buttons.addClass('disabled');
            }
            else {
                $buttons.removeClass('disabled');
            }
            var $btn;
            var btnText = '';
            switch (options.syncMethod) {
                case 'create':  // Intentional fall through
                case 'update':
                    $btn = $btnsContainer.find('.saveFormTemplate');
                    btnText = Constants.t('save');
                    break;
                case 'delete':
                    $btn = $btnsContainer.find('.deleteFormTemplate');
                    btnText = Constants.t('delete');
                    break;
                default:

            }
            that.executingChanged($btn, btnText);
        });
        this.listenTo(this.model, 'change', function (model, options) {
            options = options || {};
            Navigation.stopNavigationCallback = false;

            var $btnsContainer = that.$el.find('.formTemplateButtonPanel');
            var $buttons = $btnsContainer.find('.saveFormTemplate');

            if (that.model.get('isDirty')) {
                $buttons.removeClass('disabled');
            }
            else {
                $buttons.addClass('disabled');
            }
            this.navigationCallback = Navigation.onNavigationCallback = function () {
                if (that.model.get('isDirty')) {
                    var isNew = that.model.getDotted('Template.Id') === Constants.c.emptyGuid;
                    if (isNew && that.model.get('Elements').length > 0) {
                        that.saveChangesAs(null, { updateHash: false });
                    }
                    else if (!isNew) {
                        var dirtyDiagOpts = {
                            displayCancelButton: false
                        };
                        that.saveDirtyPrompt(null, { updateHash: false }, dirtyDiagOpts);
                    }
                }
                that.clearNavigationCallback();
            };
        });
        this.listenTo(this.model, 'sync', function (model, resp, options) {
            if (options.syncMethod === 'update' || options.syncMethod === 'create') {
                this.formsData.get('SlimFormTemplates').fetch({ editingFormTemplateId: this.model.get("Id") });
            }
        });
        this.listenTo(this.model, 'invalid', function (model, resp, options) {
            options = options || {};
            ErrorHandler.removeErrorTagsElement(this.$el);
            var msg = '';
            var errLen = Utility.getObjectLength(model.validationError);
            var isOnlyNameError = errLen === 1 && model.validationError.Name;
            var $errContainer = this.$el;
            if (options.isSaveAs && isOnlyNameError) {
                $errContainer = this.$saveAsDialog;
                ErrorHandler.removeErrorTagsElement($errContainer);
                DialogsUtil.cleanupDialog($errContainer, null, true);
            }
            else if (isOnlyNameError) {
                this.openFormSettings();
            }
            else {
                var item;
                var allVisibleElements = true;
                for (item in resp) {
                    if (resp.hasOwnProperty(item)) {
                        msg += "<br/>" + resp[item];
                    }
                }
            }
            if (msg) {
                if (options.failure) {
                    options.failure(msg);
                } else {
                    ErrorHandler.addErrors(msg);
                }
            }
            else {
                ErrorHandler.addErrors(model.validationError, null, null, null, null, null, $errContainer);
            }
        });
        this.listenTo(Backbone.history, 'route', function (router, route, params) {
            if (route !== 'formsPanel') {
                this.$style = that.$el.find('style').detach();
            }
            else {
                this.$el.prepend(this.$style);
                this.$style = undefined;
            }
        });
        $('body').bind('formsDesignerViewRenderedInit', function () {
            clearTimeout(that.renderTimeout);
            if (that.$el.is(':visible')) {
                that.renderChildViews();
                $('body').unbind('formsDesignerViewRenderedInit');
                that.$el.css('visibility', 'inherit');
            }
            else {
                that.renderTimeout = setTimeout(function () {
                    $('body').trigger('formsDesignerViewRenderedInit');
                }, 10);
            }
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        var template = this.model.get('Template');
        ro.Template = template.toJSON();
        ro.contentTypes = window.contentTypes.toJSON();
        ro.isNew = ro.Template.Id === Constants.c.emptyGuid;
        ro.canCreateForm = Utility.hasFlag(this.model.getDotted('Template.EffectiveContentTypePermissions'), Constants.sp.Add_To);
        var rmoSP = Utility.reverseMapObject(Constants.sp);
        ro.canNotCreateFormTooltip = String.format(Constants.t('insufficientPermissionsRight'), Constants.t('sp_' + rmoSP[Constants.sp.Add_To]));
        return ro;
    },
    render: function () {
        var that = this;
        var viewData = this.getRenderObject();
        this.$el.css('visibility', 'hidden');
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.find('.settingsPanel').tabs({
            activate: function (event, ui) {
                var $templateData = that.$el.find('.templateDataContainer');
                var panelId = ui.newPanel.attr('id');
                if (panelId === 'formsDesignerFormSettings') {
                    $templateData.addClass('selected');
                }
                else {
                    $templateData.removeClass('selected');
                    if (panelId === 'formsDesignerFieldSettings') {
                        var fes = that.model.get('Elements');
                        if (!fes || fes.length === 0) {
                            that.openFieldSettings();
                        }
                        else {
                            fes.setSelectedIfNoSelected();
                        }
                    }
                }
            }
        });
        $('body').trigger('formsDesignerViewRenderedInit');
        if (this.$style) {
            this.$el.prepend(this.$style);
        }
        return this;
    },
    renderChildViews: function () {
        var that = this;
        // Render Form Elements in the canvas
        var sf = function () {
            that.$el.find('.designerCanvasContainer').append(that.formPartView.render().$el);
        };
        this.model.setDotted('Template.DefaultContentTypeId', this.$el.find("select[name='DefaultContentTypeId']").val(), { ignoreChange: true });
        if (this.formElementControlsView && this.formElementControlsView.close) {
            this.formElementControlsView.close();
        }
        this.formElementControlsView = new FormElementControlsView({ model: this.model });
        this.$el.find('#formsDesignerAddField').append(this.formElementControlsView.renderElements({ complete: sf }).$el);

        if (this.formTemplateSettingsView && this.formTemplateSettingsView.close) {
            this.formTemplateSettingsView.close();
        }

        this.formTemplateSettingsView = new FormTemplateSettingsView({ model: this.model.get('Template'), elements: this.model.get('Elements') });

        this.$el.find('#formsDesignerFormSettings').append(this.formTemplateSettingsView.render().$el);

        this.$el.find('.templateDataContainer').append(this.formTemplateDataView.render().$el);
        this.renderCTB();
        this.updateCSSLayout();
    },
    renderCTB: function () {
        if (this.inlineCTBView && this.inlineCTBView.close) {
            this.inlineCTBView.close();
        }
        var that = this;
        var currentCTId = this.model.getDotted('Template.DefaultContentTypeId');
        this.inlineCTBView = new ContentTypeBuilderInlineView({
            model: window.contentTypes.get(that.model.getDotted('Template.DefaultContentTypeId')),
            isSmall: true,
            dialogOptions: {
            },
            dialogCallbacks: {
                saveCallback: function (cleanup) {
                    var newCt = that.inlineCTBView.getCT();
                    if (currentCTId !== newCt.get('Id')) {
                        that.model.setDotted('Template.DefaultContentTypeId', newCt.get('Id'));
                    }
                    that.model.get('Template').trigger('change:DefaultContentTypeId', that.model);
                    Utility.executeCallback(cleanup);
                }
            },
            getDialogMaxHeight: function () {
                return that.$el.height() - 10;
            }
        });
        this.$el.find('.defaultContentTypeContainer').append(this.inlineCTBView.render().$el);
    },
    updateCSSLayout: function () {
        var $style = this.$el.find('> style');
        var cssLayout = this.model.get('Template').getCSSLayout(false);
        $style.html(cssLayout);
    },
    renderContentTypes: function () {
        var $sel = this.$el.find("select[name='DefaultContentTypeId']");
        $sel.empty();
        var idx = 0;
        var length = window.contentTypes.length;
        for (idx; idx < length; idx++) {
            var ct = window.contentTypes.at(idx);
            var ctId = ct.get('Id');
            var opt = document.createElement('option');
            opt.textContent = ct.get('Name');
            opt.value = ctId;
            if (this.model.getDotted('Template.DefaultContentTypeId') === ctId) {
                opt.selected = true;
            }
            $sel.append(opt);
        }
    },
    cleanupChildViews: function () {
        if (this.formElementControlsView && this.formElementControlsView.close) {
            this.formElementControlsView.close();
        }
        if (this.formElementSettingsView && this.formElementSettingsView.close) {
            this.formElementSettingsView.close();
        }
        if (this.formPartView && this.formPartView.close) {
            this.formPartView.close();
        }
        if (this.inlineCTBView && this.inlineCTBView.close) {
            this.inlineCTBView.close();
        }
    },
    cleanupStyle: function () {
        if (this.$style) {
            this.$style.remove();
            this.$style = undefined;
        }
    },
    close: function () {
        this.clearNavigationCallback();
        this.cleanupChildViews();
        this.cleanupStyle();
        this.unbind();
        this.remove();
    },
    clearNavigationCallback: function () {
        if (this.navigationCallback === Navigation.onNavigationCallback) {
            this.navigationCallback = null;
            Navigation.onNavigationCallback = null;
            Navigation.stopNavigationCallback = true;
        }
    },
    openAddFields: function (ev) {
        this.$el.find('.settingsPanel').tabs({ active: 0 });
    },
    openFieldSettings: function (activateTab) {
        if (this.formElementSettingsView && this.formElementSettingsView.close) {
            this.formElementSettingsView.close();
        }
        this.formElementSettingsView = new FormElementSettingsView({
            model: this.model
        });
        this.$el.find('#formsDesignerFieldSettings').append(this.formElementSettingsView.render().$el);
        if (activateTab) {
            this.$el.find('.settingsPanel').tabs({ active: 1 });
            if (!this.$el.find('.editBackingStore').is(':visible')) {
                this.$el.find('select[name="BackingStoreId"]').addClass('fieldBackingStoreWithoutIcon');
            }
        }
    },
    openFormSettings: function () {
        this.$el.find('.settingsPanel').tabs({ active: 2 });
    },
    //#region Event Handling
    saveDirtyPrompt: function (callback, options, diagOpts) {
        if (this.model.get('isDirty')) {
            diagOpts = $.extend({
                title: Constants.t('saveFormTemplateChanges'),
                resizable: false
            }, diagOpts);
            var that = this;
            var okFunc = function (cleanup) {
                that.model.save(null, $.extend({
                    success: function (results) {
                        Utility.executeCallback(callback);
                        Utility.executeCallback(cleanup);
                    },
                    failure: function (msg) {
                        ErrorHandler.addErrors(msg);
                        Utility.executeCallback(cleanup);
                    }
                }, options));
            };
            var closeFunc = function (cleanup) {
                that.clearNavigationCallback();
                Utility.executeCallback(callback);
                Utility.executeCallback(cleanup);
            };
            var msg = String.format(Constants.t('unsavedChanges'), this.model.getDotted('Template.Name'));
            DialogsUtil.generalSaveDirtyPromptDialog(msg, okFunc, closeFunc, diagOpts);
        }
        else {
            Utility.executeCallback(callback);
        }
    },
    createFormDocument: function () {
        // Check if dirty, prompt for save before document creation
        var ftId = this.model.getDotted('Template.Id');
        if (ftId !== Constants.c.emptyGuid) {
            var createDoc = function () {
                var slimFormTemplate = window.slimFormTemplates.get(ftId);
                var canView = Utility.hasFlag(slimFormTemplate.get('EffectivePermissions'), Constants.sp.View);
                slimFormTemplate.createFormDocument(FormDialogs.createDocument, canView);
            };
            this.saveDirtyPrompt(createDoc);
        }
    },
    selectFormSettings: function () {
        this.$el.find('.settingsPanel').tabs({ active: 2 });
    },
    saveChanges: function (ev, options) {
        var templateId = this.model.get('Id');
        var isNew = false;
        if (templateId === Constants.c.emptyGuid) {
            isNew = true;
            this.model.unset('Id', { silent: true });
        }
        this.model.save(null, $.extend({
            failure: function (message) {
                ErrorHandler.addErrors(message);
            }
        }, options));
    },
    ///<summary>
    /// Prompt to save the changes of the form template with a different name
    ///<param name="ev">event that triggered this handler, can be null, since it isn't used</param>
    ///</summary>
    saveChangesAs: function (ev, options) {
        var that = this;
        var okFunc = function (cleanup) {
            that.model.saveAs(that.$saveAsDialog.find('input').val(), $.extend({
                success: function () {
                    Utility.executeCallback(cleanup);
                },
                failure: function (message) {
                    ErrorHandler.removeErrorTagsElement(that.$saveAsDialog);
                    ErrorHandler.addErrors(message);
                    Utility.executeCallback(cleanup, true);
                }
            }, options));
        };
        var templateName = that.model.getDotted('Template.Name');
        var diagOpts = {
            title: Constants.t('saveFormTemplateAs'),
            autoOpen: false,
            inputValue: templateName
        };
        this.$saveAsDialog = DialogsUtil.generalSaveAsDialog(okFunc, null, diagOpts);
        ErrorHandler.removeErrorTagsElement(that.$saveAsDialog);
        this.$saveAsDialog.dialog('open');
    },
    kill: function (ev) {
        var that = this;
        var okFunc = function (cleanup) {
            that.model.destroy({
                success: function () {
                    Utility.executeCallback(cleanup);
                }
            });

        };
        var options = {
            title: Constants.c['delete'],
            height: 150
        };
        DialogsUtil.generalPromptDialog(String.format(Constants.c.deleteFormTemplatePrompt, this.model.getDotted('Template.Name')), okFunc, null, options);
    },
    changeContentType: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.setDotted('Template.DefaultContentTypeId', $targ.val());
    },
    executingChanged: function ($btn, btnText) {
        var executing = this.model.get('executing');
        if (executing) {
            $btn.text('');
            var throbber = document.createElement('span');
            Utility.setElementClass(throbber, 'throbber');
            $btn.append(throbber);
            $btn.addClass('disabled');
        } else {
            $btn.removeClass('disabled');
            $btn.empty();
            $btn.text(btnText);
        }
    }
    //#endregion Event Handling
});