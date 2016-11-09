// Render the settings of a form element
var FormElementSettingsView = Backbone.View.extend({
    model: null, // FormTemplatePackageCPX
    className: 'FormElementSettingsView',
    events: {
        'input textarea[name="Label"]': 'changeLabel',
        'change select[name="BackingStoreId"]': "changeBackingStore",
        'change input[name="RenderAsSpan"]': 'changeRenderAsSpan',
        'input input[name="CSSLabelKeywords"]': 'changeCSSLabelKeywords',
        'input input[name="CSSInputKeywords"]': 'changeCSSInputKeywords',
        'input input[name="CSSContainerKeywords"]': 'changeCSSContainerKeywords',
        'click .editBackingStore': 'addEditBackingStore',
        'click .deleteFormElement': 'kill'
    },
    initialize: function (options) {
        this.options = options;
        this.formElementGroups = this.options.formElementGroups;
        this.compiledTemplate = doT.template(Templates.get('formtemplatefieldsettingslayout'));
        this.groupSettingsView = new FormElementGroupSettingsView({ formTemplatePkg: this.model });
        this.cfView = new CustomFieldMetaEditView();
        this.labelTextSetting = new TextSetting();
        this.labelTextSettingsView = new TextSettingsView({ model: this.labelTextSetting, displayLabels: true });
        var feSettingsView = this;
        // Re-render if the content type changes at all, this will make it so the custom fields allowed for selection as field maps are updated/filtered properly
        this.listenTo(window.contentTypes, 'add remove reset change', function () {
            this.render();
        });
        // Re-render if custom field metas change at all, this will make it so the custom fields allowed for selection as field maps are updated/filtered properly
        this.listenTo(window.customFieldMetas, 'add remove reset change', function () {
            this.render();
        });
        this.listenTo(this.labelTextSetting, 'change', function (model, options) {
            var selected = feSettingsView.model.get('Elements').getSelected();
            var idx = 0;
            var length = selected.length;
            for (idx; idx < length; idx++) {
                selected[idx].replaceLabelAttributeValues({ style: model.changedAttributes() });
            }
        });
        this.listenTo(this.model.get('Template'), 'change:Properties', function (model, value, options) {
            var layoutModeChanged = model.layoutModeChanged();
            if (layoutModeChanged) {
                this.render();
            }
        });
        this.listenTo(window.publicImages, 'add remove reset change', function () {
            if (this.model.get('Elements')) {
                var selectedFormElement = this.model.get('Elements').getSelected()[0];
                if (selectedFormElement && selectedFormElement.get('Tag') === Constants.ft.Image) {
                    this.render();
                }
            }
        });
        this.listenTo(this.model.get('Elements'), 'change:BackingStoreId', function (model, value, options) {
            feSettingsView.groupSettingsView.render();
            if (feSettingsView.labelTextSettingsView) {
                feSettingsView.labelTextSettingsView.setupColorPicker();
            }
        });
        this.listenTo(this.model.get('Elements'), 'change:selected', function (model, value, options) {
            var fes = this.model.get('Elements').getSelected();
            if (!fes || fes.length === 0) { // display no field selected, when no fields are selected
                this.render();
            }
        });
        this.listenTo(this.model, 'change:editingFormulas', function (model, value, options) {
            var $formulaAcc = this.$el.find('[data-accid="formElementFormulaAccState"]');
            $formulaAcc.css('z-index', !!value ? 1001 : 'auto');

            var position = $formulaAcc.find('div.accordion_title').position();
            this.$el.find('.fieldSettingsContainer').scrollTop(position.top + 35);
        });
        this.listenTo(this.model, 'change:editingOperation', function (model, value, options) {
            if (this.formula) {
                this.formula.set('operation', value);
            }
        });
        this.listenTo(this.model.get('Elements'), 'change:Formula', function (model, value, options) {
            options = options || {};
            if (this.formula) {
                this.formula.set('DisplayValue', this.model.getFormulaForDisplay(model.get('Id'), true));
                this.formula.set('Value', model.getFormula(), options);
            }
        });
        this.listenTo(this.model.get('Elements'), 'validate:Formula', function (model, response, options) {
            if (this.formula) {
                response.ParsedCharsForDisplay = this.model.getFormulaPartForDisplay(response.ParsedChars);
                response.RemainingCharsForDisplay = this.model.getFormulaPartForDisplay(response.RemainingChars);
                this.formula.trigger('validate:Value', this.formula, response, options);
                var idx = 0;
                var elems = this.model.get('Elements');
                var length = elems.length;
                for (idx; idx < length; idx++) {
                    elems.at(idx).set('formulaSelection', Utility.hasFlag(response.Expected, Constants.fe.Element));
                }
            }
        });
    },
    getDefaultRenderObject: function () {
        var def = {};
        def.displayBackingStore = true;
        // Display label text settings
        def.displayLabelTextSettings = true;
        // Display value text settings
        def.displayValueTextSettings = true;
        // Display Options 
        def.displayOptions = true;
        def.formElements = this.model.get('Elements');
        def.selectedFormElements = this.model.get('Elements') ? this.model.get('Elements').getSelected() : [];
        def.selectedFormElement = undefined;
        def.deleteButtonLabel = Constants.t('delete');
        def.fieldMapLabel = Constants.t('fieldMap');
        return def;
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = this.getDefaultRenderObject();
        ro.hasModifyPerms = this.model.hasModifyPermissions();
        ro.formElementLabelAccState = Utility.GetUserPreference('formElementLabelAccState') || 'open';
        ro.formElementValueAccState = Utility.GetUserPreference('formElementValueAccState') || 'open';
        ro.formElementFormulaAccState = Utility.GetUserPreference('formElementFormulaAccState') || 'open';
        ro.fieldOptionsAdvancedAccState = Utility.GetUserPreference('fieldOptionsAdvancedAccState') || 'open';
        if (ro.selectedFormElements.length === 1) {
            ro.selectedFormElement = ro.selectedFormElements[0];
            $.extend(ro, ro.selectedFormElement.toJSON());
        }
        else {
            //TODO: SCAIN determine common settings between form elements and only display those
            var commonSettingsOnlyDisplay = true;
        }
        var idx = 0;
        var length = ro.selectedFormElements.length;
        for (idx; idx < length; idx++) {
            var fe = ro.selectedFormElements[idx];
            ro.displayOptions = ro.displayOptions && fe.allowRenderAsText();
            ro.displayValueTextSettings = fe.displayValueSetting();
        }
        ro.imgBackingStores = [];
        ro.cfBackingStores = [];
        ro.constantBackingStores = [];
        if (ro.selectedFormElement) {
            ro.CSSInputKeywords = ro.selectedFormElement.getClasses();
            ro.CSSLabelKeywords = ro.selectedFormElement.getLabelClasses();
            ro.CSSContainerKeywords = ro.selectedFormElement.getContainerClasses();
            // Determine if Backing Store should be displayed
            ro.displayBackingStore = ro.selectedFormElement.requiresBackingStore();
            ro.selectedGroupMember = this.model.getGroupMember(ro.selectedFormElement.get('Id'));
            ro.isFormElementGroup = !!ro.selectedGroupMember;
            if (ro.isFormElementGroup) {
                ro.deleteButtonLabel = Constants.t('deleteGroup');
            }
            var bsId = ro.selectedFormElement.get('BackingStoreId');
            if (bsId === Constants.UtilityConstants.FIELD_ID_CREATED) {
                ro.displayValueTextSettings = true;
            }
            // Determine which backing stores should be displayed for the selected element(s)
            if (ro.displayBackingStore) {
                if (ro.selectedFormElement.get('Tag') === Constants.ft.Image) {
                    ro.imgBackingStores = this.getImageBackingStores(bsId);
                    ro.fieldMapLabel = Constants.t('image');
                }
                else {
                    switch (bsId) {
                        case Constants.UtilityConstants.FIELD_ID_CREATED:
                            ro.constantBackingStores = [{
                                Name: Constants.c.created,
                                Id: Constants.UtilityConstants.FIELD_ID_CREATED
                            }];
                            break;
                        case Constants.UtilityConstants.FIELD_ID_TITLE:
                            ro.constantBackingStores = [{
                                Name: Constants.c.title,
                                Id: Constants.UtilityConstants.FIELD_ID_TITLE
                            }];
                            break;
                        case Constants.UtilityConstants.FIELD_ID_KEYWORDS:
                            ro.constantBackingStores = [{
                                Name: Constants.c.keywords,
                                Id: Constants.UtilityConstants.FIELD_ID_KEYWORDS
                            }];
                            break;
                        default:
                            // Filter the displayed fields based upon the tag type, and the content type overrides
                            var ctId = this.model.getDotted('Template.DefaultContentTypeId');
                            var ct = window.contentTypes.get(ctId);
                            var augCfms = ct.getAugmentedMetas();
                            var cfms = new CustomFieldMetas(augCfms);
                            var found = false;
                            var isReadOnlyList;
                            var fieldTag = ro.selectedFormElement.get('Tag');
                            if (fieldTag && (fieldTag === Constants.ft.Select || fieldTag === Constants.ft.ComboBox)) {
                                isReadOnlyList = fieldTag === Constants.ft.Select;
                            }
                            var filteredCfms = cfms.filterByTypes(ro.selectedFormElement.getTypesFromTagMapping(), isReadOnlyList);
                            length = filteredCfms.length;
                            for (idx = 0; idx < length; idx++) {
                                var filterCfm = filteredCfms[idx];
                                if (bsId === filterCfm.Id) {
                                    found = true;
                                }
                                ro.cfBackingStores.push({
                                    Name: filterCfm.Name,
                                    Id: filterCfm.Id
                                });
                            }
                            if (!found && bsId) {
                                var bsIdCfm = cfms.get(bsId);
                                ro.cfBackingStores.push({
                                    Name: bsIdCfm.get('Name'),
                                    Id: bsId
                                });
                            }
                            break;
                    }
                }
            }
        }
        else {
            ro.displayBackingStore = false;
        }
        return ro;
    },
    getImageBackingStores: function (bsId) {
        var imgBackingStores = [];
        var pubImg = window.publicImages.get(bsId);
        if (!pubImg) {
            imgBackingStores.push({ Name: Constants.t('publicImageNoLongerExists'), Id: bsId });
        }
        var length = window.publicImages.length;
        for (idx = 0 ; idx < length; idx++) {
            pubImg = window.publicImages.at(idx);
            imgBackingStores.push({
                Name: pubImg.get('Name'),
                Id: pubImg.get('Id')
            });
        }
        return imgBackingStores;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        if (viewData.selectedFormElements.length > 0) {
            if (viewData.displayLabelTextSettings) {
                this.labelTextSettingsView.model.set(viewData.selectedFormElement.getLabelAttributesAsTextSettingJSON(), { silent: true });
                this.$el.find('.labelTextSettingsContainer').append(this.labelTextSettingsView.render().$el);
            }
            if (viewData.displayValueTextSettings) {
                this.cleanupValueView();
                this.valueView = new FormElementValueView({ model: viewData.selectedFormElement, formElements: this.model.get('Elements') });
                this.$el.find('.formElementValueContainer').append(this.valueView.render().$el);
            }
            // Render the formula builder if the selected field is Numeric.
            // If the selected field is not numeric, a message will display stating that only Number type inputs can have a formula
            if (viewData.selectedFormElement.isNumeric()) {
                this.cleanupFormulaBuilderView();
                this.formula = new Formula({ Value: viewData.selectedFormElement.getFormula(), DisplayValue: this.model.getFormulaForDisplay(viewData.selectedFormElement.get('Id'), true) });
                this.listenTo(this.formula, 'sync', function (model, resp, options) {
                    viewData.selectedFormElement.set('Formula', model.get('Value'));
                    viewData.selectedFormElement.validateFormula(options);
                });
                this.listenTo(this.formula, 'change:Value', function (model, value, options) {
                    options = options || {};
                    viewData.selectedFormElement.set('Formula', model.get('Value'));
                    if (!options.doNotValidate) {
                        viewData.selectedFormElement.validateFormula(options);
                    }
                    if (options.deletedValues) {
                        var guids = options.deletedValues.match(new RegExp(Constants.UtilityConstants.GUID_REGEX, 'ig'));
                        var idx = 0;
                        var length = guids ? guids.length : 0;
                        for (idx; idx < length; idx++) {
                            this.model.get('FormulaElements').remove(guids[idx]);
                        }
                    }
                });
                this.listenTo(this.formula, 'change:operation', function (model, value, options) {
                    this.model.set('editingOperation', value);
                    if (!value) {
                        // Manually triggering change below, to ensure the event is triggered, that is why silent: true is used
                        this.model.set('editingFormulas', this.formula.get('editing'), { silent: true });
                        this.model.trigger('change:editingFormulas', this.model, this.formula.get('editing'));  // Place back in Formula Edit Mode
                    }
                });
                this.formulaBuilderView = new FormulaBuilderView({ model: this.formula, canSum: !this.model.isInGroup(viewData.selectedFormElement.get('Id')) });
                // Add event handler after formula builder view is instantiated, so that its event handler for change:editing triggers first
                this.listenTo(this.formula, 'change:editing', function (model, value, options) {
                    this.model.set('editingFormulas', value);
                    var key = viewData.selectedFormElement.get('Id');
                    if (options.clearStoredValues) {
                        // Clear any stored values
                        viewData.selectedFormElement.originalValues = undefined;
                        this.model.originalFormulaElements[key] = undefined;
                    }
                    if (value) {
                        // Store any values in case of possible cancellation by user
                        if (!this.model.originalFormulaElements[key]) {
                            this.model.storeOriginalFormElementFormulaElements(key);
                        }
                        if (!viewData.selectedFormElement.originalValues) {
                            viewData.selectedFormElement.storeOriginalValues();
                        }
                        viewData.selectedFormElement.validateFormula(options); // Validate the formula upon entry, so that the user can be displayed with what is expected next
                    }
                    else {
                        // Restore the deleted Formula Elements before restoring the formula
                        if (this.model.originalFormulaElements[key]) {
                            this.model.revertFormElementFormulaElements(key);
                        }
                        if (viewData.selectedFormElement.originalValues) {
                            viewData.selectedFormElement.revertChanges({ changesReverted: true, doNotValidate: true });
                        }
                    }
                });
                this.$el.find('.formElementFormulaBuilderContainer').append(this.formulaBuilderView.render().$el);
            }
            else {
                //TODO: scain format this to look more like the warning for not having form element selected at all
                this.$el.find('.formElementFormulaBuilderContainer').text(Constants.c.nonNumericFormulaMessage);
            }
        }
        if (viewData.selectedGroupMember) {
            this.groupSettingsView.model = this.model.get('ElementGroups').get(viewData.selectedGroupMember.get('FormElementGroupId'));
            this.$el.find('.formElementGroupSettingsContainer').empty().append(this.groupSettingsView.render().$el);
            this.$el.find('select[name="BackingStoreId"]').prop('disabled', true);
            this.$el.find('.editBackingStore').hide();
        }
        var hasFieldPerm = Utility.hasFlag(window.gatewayPermissions, Constants.gp.Custom_Fields);
        if (!hasFieldPerm) {
            this.$el.find('.editBackingStore').hide();
        }
        return this;
    },
    cleanupValueView: function () {
        if (this.valueView) {
            this.valueView.close();
        }
    },
    cleanupPublicImageView: function () {
        if (this.publicImageView) {
            this.publicImageView.close();
        }
    },
    cleanupCustomFieldView: function () {
        if (this.cfView) {
            this.cfView.close();
        }
    },
    cleanupFormulaBuilderView: function () {
        if (this.formulaBuilderView) {
            this.formulaBuilderView.close();
        }
        if (this.formula) {
            this.stopListening(this.formula);
        }
        if (this.formula) {
            this.formula = null;
        }
    },
    close: function () {
        this.cleanupFormulaBuilderView();
        this.cleanupPublicImageView();
        this.cleanupCustomFieldView();
        this.cleanupValueView();
        this.groupSettingsView.close();
        this.labelTextSettingsView.close();
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    changeLabel: function (ev) {
        var that = this;
        if (this.inputTimeout) {
            clearTimeout(this.inputTimeout);
        }
        this.inputTimeout = setTimeout(function () {
            var $targ = $(ev.currentTarget);
            var selected = that.model.get('Elements').getSelected();
            var idx = 0;
            var length = selected.length;
            for (idx; idx < length; idx++) {
                selected[idx].set('Label', $targ.val());
            }
        }, Constants.TypeAheadDelay);
    },
    changeBackingStore: function (ev) {
        var $targ = $(ev.currentTarget);
        var bsId = $targ.find(':selected').val();
        var selected = this.model.get('Elements').getSelected(true);
        if (selected && selected.length === 1) {
            selected[0].set('BackingStoreId', bsId);
        }
    },
    changeRenderAsSpan: function (ev) {
        var $targ = $(ev.currentTarget);
        var selected = this.model.get('Elements').getSelected();
        var idx = 0;
        var length = selected.length;
        for (idx; idx < length; idx++) {
            selected[idx].set('RenderAsSpan', $targ.is(':checked'));
        }
    },
    changeCSSKeywords: function (ev, cb) {
        var that = this;
        if (this.inputTimeout) {
            clearTimeout(this.inputTimeout);
        }
        this.inputTimeout = setTimeout(function () {
            var $targ = $(ev.currentTarget);
            var selected = that.model.get('Elements').getSelected();
            var idx = 0;
            var length = selected.length;
            for (idx; idx < length; idx++) {
                var classNames = $targ.val();
                classNames = classNames.split(/\s+/);
                cb(classNames, selected[idx]);
            }
        }, Constants.TypeAheadDelay);
    },
    changeCSSLabelKeywords: function (ev) {
        var cb = function (classNames, item) {
            item.replaceLabelAttributeValues({ classNames: classNames });
        };
        this.changeCSSKeywords(ev, cb);
    },
    changeCSSInputKeywords: function (ev) {
        var cb = function (classNames, item) {
            item.replaceAttributeValues({ classNames: classNames });
        };
        this.changeCSSKeywords(ev, cb);
    },
    changeCSSContainerKeywords: function (ev) {
        var cb = function (classNames, item) {
            item.replaceContainerAttributeValues({ classNames: classNames });
        };
        this.changeCSSKeywords(ev, cb);
    },
    addEditBackingStore: function (ev) {
        var $backingStore = this.$el.find('select[name="BackingStoreId"]');
        var selectedFormElement = this.model.get('Elements').getSelected()[0];
        var that = this;
        var position = {
            my: 'left top',
            at: 'right top',
            of: $backingStore
        };
        // Render Public Image View
        if (selectedFormElement.get('Tag') === Constants.ft.Image) {
            var dialogCallbacks = {
                saveCallback: function (result) {
                    selectedFormElement.set({
                        'BackingStoreId': result.Id
                    });
                    // Re-rendered with a listenTo window.publicImages - add, remove, and reset
                    selectedFormElement.set('cacheBusterString', Utility.getCacheBusterStr('&'));   // Refetch the image.
                    that.cleanupPublicImageView();
                },
                cancelCallback: function () {
                    that.cleanupPublicImageView();
                }
            };
            var collection = new PublicImages(window.publicImages.toJSON());
            this.publicImageView = new PublicImageView({
                model: collection.get(selectedFormElement.get('BackingStoreId')),
                collection: collection,
                displayInDialog: true,
                dialogOptions: {
                    position: position,
                    title: Constants.t('newPublicImage')
                },
                dialogCallbacks: dialogCallbacks
            });
            this.publicImageView.render();
        }
            // Render Custom Field Meta view
        else {
            var isAdd = ev.currentTarget.className.indexOf('ui-icon-plus') > -1;
            var selectedCFM;
            if (isAdd) {
                selectedCFM = new CustomFieldMeta({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle });
            } else {
                selectedCFM = window.customFieldMetas.get(selectedFormElement.get('BackingStoreId')) || '';
            }
            var ctId = this.model.getDotted('Template.DefaultContentTypeId');
            var ct = window.contentTypes.get(ctId);
            var augCfms = ct.getAugmentedMetas();
            this.cfView.setOptions({
                augmentedFields: augCfms,
                allowedTypes: selectedFormElement.getTypesFromTagMapping(),
                displayRegEx: false,
                displayButtons: false,
                displayInDialog: true,
                dialogOptions: { title: null, position: position, dlgClass: null },
                selected: selectedCFM,
                singleField: true,
                dialogCallbacks: {
                    saveCallback: function (result) {
                        if (result) {
                            selectedFormElement.set({ 'BackingStoreId': result.Id });
                            that.render();
                            that.cleanupCustomFieldView();
                        }
                    },
                    cancelCallback: null
                },
                fieldTag: selectedFormElement.get('Tag')
            });
            this.cfView.render();
        }
    },
    kill: function (ev) {
        var that = this;
        var elements = this.model.get('Elements');
        elements.clearErrors();
        var selected = elements.getSelected();
        var isInFormula = false;
        var isInGroup = false;
        var idx = 0;
        var length = selected.length;
        for (idx = 0; idx < length; idx++) {
            var groupMember = this.model.getGroupMember(selected[idx].get('Id'));
            isInGroup = !!groupMember;
            if (isInGroup) {
                break;
            }
        }
        var okFunc = function (cleanup) {
            var inFormulas = that.model.deletedFormElementsInFormulas();
            var inFormulasFieldGroup = that.model.deletedElementsInGroupHavingFormulaElement();
            // Create an error message that should be concatenated and displayed in an error message dialog if need be
            var msg = '';
            if (inFormulas) {
                msg += String.format(Constants.c.formElementContainedInFormula, '\n\r');
            }
            if (inFormulasFieldGroup) {
                if (msg) {
                    msg += '\n\r';
                }
                msg += String.format(Constants.c.formElementGroupHasFormulaReferences, '\n\r');
            }
            if (msg) {
                ErrorHandler.addErrors(msg);
            }
            // Re-get selected items, because the validation methods above remove items from selection if they don't validate properly, so they won't be deleted
            // Don't perform the delete if nothing is selected
            selected = elements.getSelected();
            if (selected.length) {
                that.model.deleteFormElementsAndFormElementGroups({ success: cleanup });
            }
            else {
                Utility.executeCallback(cleanup);
            }
        };
        var options = {
            title: Constants.t('delete'),
            height: 150
        };
        var msg;
        if (isInGroup) {
            msg = Constants.t('deleteFormElementGroupPrompt');
        }
        else {
            msg = Constants.t('deleteFormElementPrompt');
        }
        DialogsUtil.generalPromptDialog(msg, okFunc, null, options);
    }
    //#endregion Event Handling
});