/// <reference path="../../Content/LibsInternal/Utility.js" />
var ContentTypeBuilderEditView = Backbone.View.extend({
    model: undefined,   // Content Type
    bulkViewerDataPkg: undefined, // BulkViewerDataPackageCPX, most often this will be undefined
    firstTimeRendering: true,
    isDirty: false, // Keep track of changes made to content type
    $dialog: undefined, // Dialog Selector in which the this was rendered
    $dirtyDialog: undefined, // Dialog to prompt for unsaved changes
    displayInDialog: true,
    renderRegions: true,
    viewData: {},
    pzr: undefined, // PanZoomRotate instance, function to obtain it is passed in the initialize options
    className: 'ContentTypeBuilderEditView ctbContentTypeData contentTypeDTO',
    events: {
        "click #contentTypeBuilderTab": "changeTabs",
        "change select[name='SecurityClassId'], select[name='securityClass']": "changeSecurityClass",
        "change select[name='SyncActionId']": "changeSyncAction",
        "change input[name='SyncActionPreference']": "changeSyncActionPreference",
        "change input[name='Name']": "changeContentTypeName",
        "click span.ui-icon.ui-icon-close": "kill"
    },
    ctbFieldSettingsView: {},
    relatedFields: {},
    defaultFields: {},
    prevFolder: {},

    //#region View Rendering
    initialize: function (options) {
        options = options || {};
        this.options = options;
        this.bulkViewerDataPkg = options.bulkViewerDataPkg;
        this.hideDelete = options.hideDelete === undefined ? false : options.hideDelete;
        this.pzr = null;
        var that = this;
        if (this.bulkViewerDataPkg) {
            var opts = {
                pzr: undefined
            };
            this.bulkViewerDataPkg.trigger('enterCTB', this.bulkViewerDataPkg, opts);
            this.pzr = opts.pzr;
        }
        this.renderRegions = !!this.pzr;
        this.displayInDialog = options.displayInDialog === false ? false : true;     // Default to true
        this.dialogOptions = $.extend({}, { height: 750, minHeight: 750 }, this.options.dialogOptions);
        this.dialogCallbacks = $.extend({
            getDialogMaxHeight: function () {
                return $(window).height();
            }
        }, this.options.dialogCallbacks);
        this.compiledTemplate = doT.template(Templates.get('contenttypebuilderlayout'));
        this.$el.on('ctbFullyRendered', function () {
            var $opt = that.$el.find('select[name="Name"] option:selected');
            var selectedCTId = $opt.val();
            that.toggleCTBButtons(selectedCTId);
            if (that.$el.find('#contentTypeBuilderTab').hasClass('ui-state-active')) {
                that.resize();
            }
        });
        this.$el.on('ctbDisplayFieldsChanged', function () {
            that.resize();
        });
        this.$el.on('ctbTabsChanged', function () {
            that.resize();
        });
        this.listenTo(window.contentTypes, 'remove', function (model, collection, options) {
            this.model = undefined;
            this.render();
        });
        return this;
    },
    getRenderObject: function () {
        var ro = {};
        var newCT = new ContentType({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle, SyncActionPreference: Constants.sap.SyncAndSave });
        ro.canCreateCT = Utility.checkGP(window.gatewayPermissions, Constants.gp.ContentType_Edit_Basic) || Utility.checkGP(window.gatewayPermissions, Constants.gp.ContentType_Edit_Advanced);

        ro.selectedContentType = this.model;
        ro.listct = window.contentTypes.getViewable(ro.selectedContentType && ro.selectedContentType.get('Id'));
        ro.listsc = new SecurityClasses(window.slimSecurityClasses.toJSON());
        if (ro.canCreateCT) {
            newCT.set('EffectivePermissions', Constants.sp.Full);
            ro.listct = ro.listct.getNewList(newCT);
        }
        if (!ro.selectedContentType) {
            ro.selectedContentType = this.model = this.setNewClass(ro.listct);
        }
        ro.canView = Utility.hasFlag(ro.selectedContentType.get('EffectivePermissions'), Constants.sp.View);
        ro.canViewAdvanced = ro.canView && Utility.hasFlag(window.gatewayPermissions, Constants.gp.ContentType_Edit_Advanced);
        ro.displayDelete = !this.hideDelete && this.model.hasDeletePermissions();
        ro.insufficientPermissionsMessage = '';
        if (!ro.canView) {
            var spRMO = Utility.reverseMapObject(Constants.sp);
            ro.insufficientPermissionsMessage = String.format(Constants.t("insufficientPermissionsRight"), spRMO[Constants.sp.View]);
        }
        return ro;
    },
    render: function () {
        var that = this;
        if (!window.contentTypesCC) {
            window.contentTypesCC = new ContentTypeCC();
        }
        var complete = function () {
            that.viewData = that.getRenderObject();
            that.$el.html(that.compiledTemplate(that.viewData));
            that.$el.find('> div').addClass('visibilityHidden');
            that.$el.find('#contentTypeBuilderTabs').tabs();
            that.$el.find('.throbber').css('display', 'block');
            // Append Content Type Security and Sync Action Editor
            that.renderAdvancedTab();
            that.renderCTBFields();
            if (that.model) {
                that.listenTo(that.model, 'change:SyncActionId', that.renderAdvancedTab);
            }
            if (that.displayInDialog) {
                if (!that.$dialog) {
                    that.renderDialog();
                }
                else {
                    that.$dialog.dialog('open');
                }
            }
            that.setupCombobox();
        };
        var fetchContentTypes = function () {
            if (that.firstTimeRendering) {
                window.contentTypesCC.fetch({
                    success: function (result) {
                        if (!that.model || (that.model.get('Id') === Constants.c.emptyGuid && that.options.contentTypeId)) {
                            that.model = window.contentTypes.get(that.options.contentTypeId);
                        }
                        else {
                            that.model = window.contentTypes.get(that.model.get('Id'));
                        }
                        complete();
                    },
                    failure: function (jqXHR, textStatus, errorThrown) {
                        ErrorHandler.addErrors(errorThrown.Message.toString());
                    }
                });
                that.firstTimeRendering = false;
            }
            else {
                complete();
            }
        };
        fetchContentTypes();
        return this.$el;
    },
    renderDialog: function () {
        var that = this;
        this.$el.show();
        var saveCallback = this.dialogCallbacks.saveCallback;
        var okFunc = function (cleanup) {
            var saveChangesCallback = function () {
                var saveCleanup = function () {
                    that.exit();
                    Utility.executeCallback(cleanup);
                };
                Utility.executeCallback(saveCallback, saveCleanup, saveCleanup);
            };
            var failureCallback = function (errors) {
                ErrorHandler.removeErrorTagsElement(that.$dialog);
                ErrorHandler.addErrors(errors, null, null, null, null, null, that.$dialog);
                var btnLabels = DialogsUtil.getButtonLabels(that.$dialog);
                DialogsUtil.cleanupDialog(that.$dialog, btnLabels, true);
                if (that.$dirtyDialog) {
                    btnLabels = DialogsUtil.getButtonLabels(that.$dirtyDialog);
                    DialogsUtil.cleanupDialog(that.$dirtyDialog, btnLabels, false);
                }
            };
            that.saveChanges(saveChangesCallback, failureCallback);
        };
        var cancelFunc = function (cleanup) {
            var saveFunc = function (cleanupDirtyPrompt) {
                Utility.executeCallback(okFunc, function () {
                    that.exit();
                    Utility.executeCallback(cleanup);
                    Utility.executeCallback(cleanupDirtyPrompt);
                });
            };
            var closeFunc = function (cleanupDirtyPrompt) {
                that.exit();
                Utility.executeCallback(cleanup);
                Utility.executeCallback(cleanupDirtyPrompt);
            };
            if (that.getDirty()) {
                var opts = {
                    resizable: false
                };
                var saveArgs = that.getContentTypeSaveArgs();
                that.$dirtyDialog = DialogsUtil.generalSaveDirtyPromptDialog(String.format(Constants.c.unsavedChanges, saveArgs.Name), saveFunc, closeFunc, opts);
            }
            else {
                closeFunc();
            }
        };
        var diagOpts = {
            title: Constants.c.contentTypeBuilder + '<a style="display: none;" class="ui-dialog-titlebar-expand ui-corner-all"><span class="ui-icon ui-icon-triangle-1-s"></span></a>',
            okText: Constants.c.save,
            maxWidth: 600,
            minWidth: 425,
            width: 425,
            height: 600,
            maxHeight: this.dialogCallbacks.getDialogMaxHeight(),
            minHeight: 600,
            autoOpen: false,
            html: this.$el,
            buttons: [{
                text: Constants.c.saveAs,
                click: function (cleanup) {
                    var saveChangesAsCallback = function () {
                        Utility.executeCallback(saveCallback, cleanup);
                    };
                    that.saveChangesAs(saveChangesAsCallback);
                }
            }],
            beforeClose: function (event, ui) {
                if (that.getDirty()) {
                    cancelFunc(function () {
                        DialogsUtil.cleanupDialog(that.$dialog);
                    });
                    return false;
                }
            },
            close: function (cleanup) {
                that.exit();
            },
            resize: function (event, ui) {
                that.resize(event, ui);
            },
            open: function () {
                that.$el.bind('ctbFullyRendered', function () {
                    var $opt = that.$el.find('select[name="Name"] option:selected');
                    var selectedCTId = $opt.val();
                    that.toggleCTBButtons(selectedCTId);
                });
                // Make the document image appear over the modal overlay
                var zIndex = $('.ui-dialog').has(that.$dialog).css('z-index');
                var intZIndex = parseInt(zIndex, 10);
                $('.ui-dialog').has(that.$dialog).css('z-index', (isNaN(intZIndex) ? zIndex : intZIndex) + 1);
                if (that.pzr) {
                    var model = that.pzr.getModel();
                    if (model) {
                        model.set('imageZIndex', zIndex);
                    }
                }
            }
        };
        diagOpts = $.extend(diagOpts, this.dialogOptions);
        this.$dialog = DialogsUtil.generalPromptDialog('', okFunc, cancelFunc, diagOpts);
        this.$dialog.dialog('open');
    },
    exit: function () {
        if (this.pzr) {
            var model = this.pzr.getModel();
            if (model) {
                model.set('imageZIndex', 'auto');
            }
        }
        if (this.bulkViewerDataPkg) {
            this.bulkViewerDataPkg.trigger('exitCTB', this.bulkViewerDataPkg);
        }
        this.clearDirty();
        this.close();
    },
    renderAdvancedTab: function () {
        if (this.ctbSyncActionEditView && this.ctbSyncActionEditView.close) {
            this.ctbSyncActionEditView.close();
        }
        if (this.ctbSecurityView && this.ctbSecurityView.close) {
            this.ctbSecurityView.close();
        }
        this.ctbSyncActionEditView = new SyncActionEditView({ selectedContentType: this.model });
        this.ctbSecurityView = new ContentTypeSecurityView({ selected: this.model });
        var $ctbSyncActionViewEL = this.ctbSyncActionEditView.render();
        var $ctbSecurityViewEL = this.ctbSecurityView.render();
        if (this.viewData.canViewAdvanced) {
            this.$el.find('#contentTypeBuilderTabs_ContentTypeBuilderAdvanced').append($ctbSyncActionViewEL);
            this.$el.find('#contentTypeBuilderTabs_ContentTypeBuilderAdvanced').append($ctbSecurityViewEL);
        }
    },
    close: function () {
        if (this.ctbFieldSettingsView && this.ctbFieldSettingsView.close) {
            this.ctbFieldSettingsView.$el.unbind('ctbFullyRendered');
            this.ctbFieldSettingsView.close();
        }
        if (this.ctbSecurityView && this.ctbSecurityView.close) {
            this.ctbSecurityView.close();
        }
        if (this.ctbSyncActionEditView && this.ctbSyncActionEditView.close) {
            this.ctbSyncActionEditView.close();
        }

        DialogsUtil.isDialogInstanceClose(this.$dirtyDialog);
        DialogsUtil.isDialogInstanceDestroyDialog(this.$dirtyDialog);
        // Remove the before close definition for the dialog before attempting to close. - Bug 13305: http://pedro.docstar.com/b/show_bug.cgi?id=13305
        // Otherwise the dirty prompt dialog will display intermittently, and will cause the count for ShowHideUtil.toggleNativeViewer, to be incorrect
        // This would then cause the native viewer to be hidden after the dialog is properly closed.
        if (DialogsUtil.isDialogInstance(this.$dialog)) {
            this.$dialog.dialog('option', 'beforeClose', null);
        }
        DialogsUtil.isDialogInstanceClose(this.$dialog);
        DialogsUtil.isDialogInstanceDestroyDialog(this.$dialog);

        this.$el.unbind('ctbTabsChanged');
        this.$el.unbind('ctbFullyRendered');
        this.$el.unbind('ctbDisplayFieldsChanged');
        this.unbind();
        this.remove();
    },
    setupCombobox: function () {
        var that = this;
        that.$el.find('select[name="Name"]').combobox();
        that.$el.find('.isCombo').autocomplete({
            select: function (event, ui) {
                that.changeSelection(event, ui.item.option);
            },
            change: function (event, ui) {
                if (!ui.item) {
                    var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex($(this).val()) + "$", "i"),
                        valid = false;
                    that.$el.find('select[name="Name"]').children("option").each(function () {
                        if ($(this).text().match(matcher)) {
                            this.selected = valid = true;
                            that.changeSelection(event, this);
                            return false;
                        }
                    });
                }
            }
        });
        that.$el.find('input[name="Name"]').focus().select();
    },
    renderCTBFields: function () {
        var that = this;
        if (this.ctbFieldSettingsView && this.ctbFieldSettingsView.close) {
            this.ctbFieldSettingsView.$el.unbind('ctbFullyRendered');
            this.ctbFieldSettingsView.close();
        }
        this.ctbFieldSettingsView = new ContentTypeBuilderFieldSettingsView({
            pzr: this.pzr,
            selectedContentType: this.model
        });
        var canView = this.model.hasViewPermissions();
        var $html = that.ctbFieldSettingsView.render();
        $html.bind('ctbFullyRendered', function () {
            if (canView) {
                that.$el.find('.ctbFieldsContainer').append($html);
                that.ctbFieldSettingsView.renderRegions();
                that.disableSimpleSyncActionEditing(window.syncActions.get(that.model.get('SyncActionId')));
            }
            that.$el.find('.throbber').hide();
            that.$el.find('> div').removeClass('visibilityHidden');
            if (that.$el.find('#contentTypeBuilderTab').hasClass('ui-state-active')) {
                that.resize();
            }
            that.$el.trigger('ctbFullyRendered');
        });
    },
    setNewClass: function (listct) {
        return this.getNewClass(listct);
    },
    resize: function (event, ui) {
        if (!DialogsUtil.isDialogInstance(this.$dialog)) {
            return;
        }
        dialogMaxHeight = this.dialogCallbacks.getDialogMaxHeight();
        var $ctbFieldsContainer = this.$dialog.find('.ctbFieldsContainer');
        var ctbFieldsContainerMargin = parseFloat($ctbFieldsContainer.css('margin-top') || 0);
        var $ul = this.$dialog.find('.ctbFieldSettingsContainer ul');
        var $ctbFieldSettingsContainer = this.$dialog.find('.ctbFieldSettingsContainer');
        var ctbFieldSettingsMargin = parseFloat($ctbFieldSettingsContainer.css('margin-top') || 0) + parseFloat($ctbFieldSettingsContainer.css('margin-bottom') || 0);
        var $tabsContainer = this.$dialog.find('#contentTypeBuilderTabs');
        var $tabPanel = $tabsContainer.find('.ui-tabs-panel');
        // Get heights of elements in dialog
        var ctComboHeight = this.$dialog.find('.contentTypeContainer').outerHeight(true);
        var relatedHeight = this.$dialog.find('.relatedContainer').outerHeight(true);
        var displayFieldsHeight = this.$dialog.find('.ctbDisplayFieldsContainer').outerHeight(true);
        var newFieldContainerHeight = this.$dialog.find('.ctbNewFieldContainer').outerHeight(true);
        var tabsContainerPadding = parseFloat($tabsContainer.css('padding-top') || 0) + parseFloat($tabsContainer.css('padding-bottom') || 0);
        var tabsHeight = $tabsContainer.find('> ul').outerHeight(true);
        var tabsPadding = parseFloat($tabPanel.css('padding-top') || 0) + parseFloat($tabPanel.css('padding-bottom') || 0);

        var nonULHeight = ctComboHeight + relatedHeight + displayFieldsHeight + newFieldContainerHeight + tabsHeight + tabsPadding + tabsContainerPadding + ctbFieldsContainerMargin + ctbFieldSettingsMargin;
        var maxHeight = this.$dialog.outerHeight(true) - nonULHeight;
        // Get dialog padding and element heights (title bar and button pane)
        var dialogPadding = parseFloat(this.$dialog.css('padding-top') || 0) + parseFloat(this.$dialog.css('padding-bottom') || 0);
        var dialogHeights = dialogPadding + this.$dialog.parent().find('.ui-dialog-buttonpane').outerHeight(true) + this.$dialog.parent().find('.ui-dialog-titlebar').outerHeight(true);
        if ((ui && ui.size.height > dialogMaxHeight) || this.$dialog.height() > dialogMaxHeight) {
            this.$dialog.dialog('option', 'height', dialogMaxHeight);
        }
        if (!ui) {
            var newDialogHeight = $ul.outerHeight(true) + dialogHeights + nonULHeight + 15;
            this.$dialog.dialog('option', 'height', Math.min(newDialogHeight, dialogMaxHeight));
            maxHeight = this.$dialog.outerHeight(true) - nonULHeight;
        }
        $ctbFieldSettingsContainer.height(maxHeight);
        $ctbFieldSettingsContainer.css('max-height', maxHeight);
        this.ctbFieldSettingsView.resize();
    },
    toggleCTBButtons: function (ctId) {
        var ct = window.contentTypes.get(ctId);
        // Obtain dialog buttons and find the corresponding buttons to change
        var $buttons = $('.ui-dialog').has(this.$dialog).find('.ui-dialog-buttonpane button');
        var idx = 0;
        var $saveButton;
        var $saveAsButton;
        var length = $buttons.length;
        for (idx; idx < length; idx++) {
            if ($buttons.eq(idx).text() === Constants.c.save) {
                $saveButton = $buttons.eq(idx);
            }
            if ($buttons.eq(idx).text() === Constants.c.saveAs) {
                $saveAsButton = $buttons.eq(idx);
            }
        }
        // Can create content types
        var canCreateCT = Utility.checkGP(window.gatewayPermissions, Constants.gp.ContentType_Edit_Basic) || Utility.checkGP(window.gatewayPermissions, Constants.gp.ContentType_Edit_Advanced);
        var rmoGP = Utility.reverseMapObject(Constants.gp);
        var createCTTitle = String.format(Constants.c.insufficientPermissionsRight, Constants.t('gp_' + rmoGP[Constants.gp.ContentType_Edit_Basic]));
        // Modify currently selected content type
        var enableSave = 'disable';
        var rmoSP = Utility.reverseMapObject(Constants.sp);
        var saveTitle = String.format(Constants.c.insufficientPermissionsRight, Constants.t('sp_' + rmoSP[Constants.sp.Modify]));
        var isNewCT = ctId === Constants.c.emptyGuid;
        // Can Modify
        if (isNewCT || ct.hasModifyPermissions()) {
            enableSave = 'enable';
            saveTitle = '';
        }
        // Attempting to create a new CT from -- New --, but user doesn't have permissions
        if (!canCreateCT && isNewCT) {
            enableSave = 'disable';
            saveTitle = createCTTitle;
        }
        // Attempting to create a new CT from any CT
        var enableSaveAs = 'disable';
        if (canCreateCT) {
            enableSaveAs = 'enable';
            createCTTitle = '';
        }
        $saveButton.attr('title', saveTitle);
        $saveButton.button(enableSave);
        $saveAsButton.attr('title', createCTTitle);
        $saveAsButton.button(enableSaveAs);
    },
    //#endregion View Rendering

    //#region Content Type Modification
    getContentTypeSaveArgs: function () {
        //Obtain the CTB field items
        var $elems = this.$el.find('.ctbFieldSettingsContainer ul li:not("#' + Constants.c.emptyGuid + '")');
        var i = 0;
        var length = $elems.length;
        var displayOrder = [];
        var relatedFields = [];
        var defaultFields = [];
        var isDisplayed = {};
        var ctdo = {};
        var key;
        for (i = 0; i < length; i++) {
            var $elem = $elems.eq(i);
            var splitKey = $elem.attr('id').split('_');
            key = splitKey.length > 1 ? splitKey[1] : splitKey[0];
            if (key && !ctdo[key]) {
                var order = {};
                order[key] = i;
                isDisplayed[key] = $elem.find('.showEyeIcon').length > 0 && $elem.is(':visible');
                displayOrder.push(order);
                var isDefaultInput = $elem.find('input[name="IsDefault"]').get(0);
                if (window.customFieldMetas.get(key) && isDefaultInput.checked && !isDefaultInput.disabled) {  // If the field is a custom field, add it to the Content Type's DefaultCustomFields property
                    var $listName = $elem.find('select[name="OverridableList"] optgroup[label="' + Constants.c.listName + '"] option:selected');
                    var $taDataLink = $elem.find('select[name="OverridableList"] optgroup[label="' + Constants.c.typeAheadQueries + '"] option:selected');
                    var $ddDataLink = $elem.find('select[name="OverridableList"] optgroup[label="' + Constants.c.dropdownQueries + '"] option:selected');
                    defaultFields.push({
                        ContentTypeID: this.model.get('Id'),
                        CustomFieldMetaID: key,
                        DefaultValue: null,
                        DropDownDataLinkId: $ddDataLink.length > 0 ? $ddDataLink.val() : null,
                        ListName: $listName.length > 0 ? $listName.text() : '',
                        TypeAheadDataLinkId: $taDataLink.length > 0 ? $taDataLink.val() : null
                    });
                }
            }
        }
        // Loop over every field that is related (contains the link icon, otherwise if it is not related it has the linkDisabledIcon)
        var $relatedFields = this.$el.find('.ctbFieldSettingsContainer ul li').has('.linkIcon');
        length = $relatedFields.length;
        for (i = 0; i < length; i++) {
            var $relatedField = $relatedFields.eq(i);
            key = $relatedField.attr('id').split('_')[1];
            relatedFields.push({ RelatedCustomFieldId: key });
        }
        var displayMask = {
            IsDisplayed: isDisplayed,
            DisplayOrder: displayOrder
        };
        var dto = DTO.getDTOCombo(this.$el);
        var perms = this.ctbSecurityView.getPermissions();
        var savePkg = {
            Id: dto.Id,
            Name: dto.Name,
            DisplayMask: displayMask,
            SecurityClassId: dto.SecurityClassId,
            RelatedCustomFields: relatedFields,
            DefaultCustomFields: defaultFields,
            DefaultSecurityClassId: dto.DefaultSecurityClassId,
            DefaultWorkflowId: dto.DefaultWorkflowId || null,
            DefaultRecordCategoryId: dto.DefaultRecordCategoryId || null,
            DefaultInboxId: dto.DefaultInboxId || null,
            DefaultFolderId: (dto.DefaultFolderId === Constants.c.emptyGuid ? null : dto.DefaultFolderId) || null,
            DefaultFolderName: dto.DefaultFolderName || null,
            RelateOn: DTO.getDTO(this.$el.find('.relatedContainer')).RelateOn,
            SyncActionId: dto.SyncActionId || null,
            SyncActionPreference: dto.SyncActionPreference,
            UserPermissions: perms.UserPermissions,
            RolePermissions: perms.RolePermissions
        };
        return savePkg;
    },
    saveChanges: function (callback, failureCallback, saveData) {
        saveData = saveData || {};
        // extend the passed in saveData, so they are not changed, in case of a failure and a re-save occurs
        var attrs = $.extend({}, saveData.saveArgs || this.getContentTypeSaveArgs());
        attrs.DisplayMask = JSON.stringify(attrs.DisplayMask);
        attrs.CreatedOn = undefined;
        attrs.CreatedBy = attrs.CreatedBy || Constants.c.emptyGuid;
        this.model.set(attrs, { silent: true });
        var that = this;
        var sf = function (model, result) {
            that.clearDirty();
            Utility.executeCallback(callback);
        };
        var ff = function (message) {
            if (message) {
                ErrorHandler.addErrors(message);
            }
            Utility.executeCallback(failureCallback);
        };
        if (attrs.Id === Constants.c.emptyGuid) {
            this.model.unset('id'); //This will mark the class as a new class.
            this.model.unset('Id');
        }
        this.model.on("invalid", function (model, error) {
            if (failureCallback) {
                Utility.executeCallback(failureCallback, error);
            }
            else {
                ErrorHandler.removeErrorTagsElement(that.$el);
                ErrorHandler.addErrors(errors, null, null, null, null, null, that.$el);
            }
        });
        this.model.save(null, {
            success: function (model, result) {
                sf(model, result);
            },
            failure: function (message) {
                ff(message);
            }
        });
    },
    saveChangesAs: function (callback) {
        var attrs = this.getContentTypeSaveArgs();
        var that = this;
        var $dialog;
        var okFunc = function (cleanup) {
            attrs.Name = $dialog.find('input').val();
            attrs.Id = Constants.c.emptyGuid;
            var successCallback = function () {
                Utility.executeCallback(callback);
                Utility.executeCallback(cleanup);
            };
            var failureCallback = function (errors) {
                ErrorHandler.removeErrorTagsElement($dialog);
                ErrorHandler.addErrors(errors, null, null, null, null, null, $dialog);
                var btnLabels = DialogsUtil.getButtonLabels($dialog);
                DialogsUtil.cleanupDialog($dialog, btnLabels, true);
            };
            that.saveChanges(successCallback, failureCallback, { saveArgs: attrs });
        };
        var cancelFunc = function (cleanup) {
            Utility.executeCallback(cleanup);
            DialogsUtil.cleanupDialog(that.$dialog, null, true);
        };
        $dialog = DialogsUtil.generalSaveAsDialog(okFunc, cancelFunc);
        $dialog.dialog('open');
    },
    //#endregion Content Type Modification

    //#region Event Handling
    changeSelection: function (event, selection) {
        var that = this;
        var callback = function (cleanup) {
            var id = $(selection).val();
            if (id === Constants.c.emptyGuid) {
                that.model = that.setNewClass(that.viewData.listct);
            }
            else {
                that.model = that.viewData.listct.get(id);
            }
            that.render();
            Utility.executeCallback(cleanup);
        };
        if (that.getDirty()) {
            var $dialog;
            var saveArgs = that.getContentTypeSaveArgs();
            var opts = {
                resizable: false
            };
            var okFunc = function (cleanup) {
                var saveCallback = function () {
                    callback(cleanup);
                };
                var failureCallback = function (errors) {
                    // Reset selected name to what was attempting to be saved
                    that.$el.find('input.isCombo[name="Name"]').val(saveArgs.Name);
                    ErrorHandler.removeErrorTagsElement(that.$el);
                    ErrorHandler.addErrors(errors, null, null, null, null, null, that.$el);
                    var btnLabels = DialogsUtil.getButtonLabels($dialog);
                    DialogsUtil.cleanupDialog($dialog, btnLabels, false);
                };
                that.saveChanges(saveCallback, failureCallback, { saveArgs: saveArgs });
            };
            var cancelFunc = function (cleanup) {
                that.clearDirty();
                callback(cleanup);
            };
            $dialog = DialogsUtil.generalSaveDirtyPromptDialog(String.format(Constants.c.unsavedChanges, saveArgs.Name), okFunc, cancelFunc, opts);
        }
        else {
            callback();
        }
    },
    changeTabs: function (event) {
        this.$el.trigger('ctbTabsChanged');
    },
    changeSecurityClass: function (event) {
        var $targ = $(event.currentTarget);
        this.$el.find('select[name="SecurityClassId"]').val($targ.val());
        this.$el.find('select[name="securityClass"]').val($targ.val());
        this.setDirty();
    },
    disableSimpleSyncActionEditing: function (syncAction) {
        var $sa = this.$el.find('select[name="SyncActionId"]');
        if (this.ctbFieldSettingsView && this.ctbFieldSettingsView.disableSimpleSyncActionEditing) {
            var selectedSAP = parseInt(this.$el.find('input[name="SyncActionPreference"]:checked').val(), 10);
            if ((syncAction && syncAction.get('Type') === Constants.wfat.SyncVerifyAction) || WorkflowUtil.mapSAPToWFAT(selectedSAP) === Constants.wfat.SyncVerifyAction) {
                this.ctbFieldSettingsView.disableSimpleSyncActionEditing(syncAction ? syncAction.get('Name') : $sa.find(':selected').text() || '');
                return true;
            }
        }
        return false;
    },
    changeSyncAction: function (ev) {
        var $targ = $(ev.currentTarget);
        var id = $targ.val();
        var sa = window.syncActions.get(id);
        if (this.ctbFieldSettingsView && this.ctbFieldSettingsView.disableSimpleSyncActionEditing) {
            if (!this.disableSimpleSyncActionEditing(sa)) {
                this.ctbFieldSettingsView.enableSimpleSyncActionEditing(id);
            }
        }
        this.setDirty();
    },
    changeSyncActionPreference: function (ev) {
        var $sa = this.$el.find('select[name="SyncActionId"]');
        var event = new $.Event();
        event.currentTarget = $sa;
        this.changeSyncAction(event);
    },
    changeContentTypeName: function (ev) {
        var ctName = $(ev.currentTarget).val();
        if (this.ctbFieldSettingsView && this.ctbFieldSettingsView.viewData && this.ctbFieldSettingsView.viewData.selectedContentType) {
            this.ctbFieldSettingsView.viewData.selectedContentType.set('Name', ctName);
        }
    },
    kill: function (ev) {
        ErrorHandler.removeErrorTagsElement(this.$el);
        var cannotDeleteMsg = String.format(Constants.t('cannotDeleteContentType'), this.model.get('Name'));
        if (!this.model.hasDeletePermissions()) {
            ErrorHandler.addErrors(String.concat(cannotDeleteMsg, '\r\n', String.format(Constants.t('insufficientPermissionsRight'), Constants.t('sp_Delete'))));
            return;
        }
        if (this.model.get('Id') === Constants.c.emptyGuid) {
            ErrorHandler.addErrors({ Name: Constants.c.cannotDeleteNew }, null, null, null, null, null, this.$el);
            return;
        }
        if (window.contentTypes.length < 2) {
            ErrorHandler.addErrors(String.concat(cannotDeleteMsg, '\r\n', Constants.c.contentTypeMinimumError));
            return;
        }
        this.model.replace(ContentTypeDialogs.replace);
    },

    replaceContentType: function () {

        this.redrawReplacements();
        $('#replace_ct select option').attr('selected', false);
        $('#replace_ct').dialog('open');
    },
    redrawReplacements: function () {
        $('#replace_ct select option').remove();
        var selectedId = this.viewData.selected.get('Id');
        window.contentTypes.each(function (item) {
            //skip selected and -- New -- (emptyGuid);
            var id = item.get("Id");
            if (id === Constants.c.emptyGuid || id === selectedId) {
                return;
            }
            $('#replace_ct select').append($('<option/>').attr('value', id).text(item.get('Name')));
        });
    },
    //#endregion Event Handling

    //#region Dirty Tracking 
    getDirty: function () {
        if (this.$el.find('.throbber').is(':visible')) {
            return false;
        }
        return this.ctbFieldSettingsView.getDirty() || this.isDirty;
    },
    setDirty: function (event) {
        this.isDirty = true;
    },
    clearDirty: function () {
        this.isDirty = false;
    }
    //#endregion Dirty Tracking
});