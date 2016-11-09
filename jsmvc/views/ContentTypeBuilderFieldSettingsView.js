var ContentTypeBuilderFieldSettingsView = Backbone.View.extend({
    tagName: 'div',
    viewData: {},
    ctbFieldSettingViews: [],
    regionView: {},
    isDirty: false,
    prevFolder: {},
    disableRenderRegions: false,
    renderRegionView: true,
    $viewPort: undefined,
    events: {
        "change .ctbDisplayFieldsContainer input": "changeFieldsDisplayed",
        "change li input[name='IsDefault']": "changeDefault",
        "click li .additionalSelectedHTML .showEyeIcon, li .additionalSelectedHTML .hideEyeIcon": "changeFieldVisibility",
        "click li .additionalSelectedHTML .linkIcon, li .additionalSelectedHTML .linkDisabledIcon": "changeRelated",
        "click input[name='DefaultFolderName'], .folder_icon": "openSelectFolder",
        "change li .additionalSelectedHTML select, input[type='radio']": "setDirty",
        "change .permissions input, input[name='SyncActionPreference']": "setDirty",  // Sync action preference or user permissions changes
        "click span.ui-icon-pencil": "editField",
        "click .ctbNewFieldContainer span.ui-icon-plus": "addField",
        "keydown input.isCombo": "addFieldKeyInput",
        "click .dashedRectangle": "enterRegionCreation"
    },

    //#region View Rendering
    initialize: function (options) {
        this.options = options || {};
        this.pzr = options.pzr;
        this.renderRegionView = !!this.pzr;
        this.compiledTemplate = doT.template(Templates.get('ctbfieldsettingslayout'));
        this.$viewPort = $();
        if (this.renderRegionView) {
            this.$viewPort = this.pzr.getViewSelector();
            var that = this;
            $('body').off('imageLoadedRegionSelection.ContentTypeBuilderFieldSettingsView').on('imageLoadedRegionSelection.ContentTypeBuilderFieldSettingsView', function () {
                that.renderRegions();
            });
            this.$viewPort.on('click.ContentTypeBuilderFieldSettingsView', '.regionContainer .region', function (ev) {
                var event = new $.Event();
                event.currentTarget = that.$el.find('li#ctb_' + $(ev.currentTarget).attr('fieldId')).find('.dashedRectangle');
                if (!that.editingRegions) {
                    that.enterRegionCreation(event, false);
                }
            });
        }
    },
    getCustomFieldMetas: function (hasFieldPerm) {
        var cfms;
        if (hasFieldPerm) { // Has Gateway permission to Create fields, add new field to collection
            var newField = new CustomFieldMeta({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle });
            cfms = new CustomFieldMetas(window.customFieldMetas.toJSON()).getNewList(newField);
        }
        else {  // Doesn't have Gateway permission to Create fields, don't add a new field to collection
            cfms = new CustomFieldMetas(window.customFieldMetas.toJSON());
        }
        return cfms;
    },
    getRenderObject: function () {
        var ro = {};
        ro.selectedContentType = this.options.selectedContentType;
        ro.renderRegionView = this.renderRegionView;
        if (!ro.selectedContentType) {
            var revET = Utility.reverseMapObject(Constants.et);
            ErrorHandler.addErrors(String.format(Constants.t('t_notfound'), 'et_' + revET[Constants.et.ContentType]));
            return;
        }
        ro.hasFieldPerm = Utility.hasFlag(window.gatewayPermissions, Constants.gp.Custom_Fields);
        ro.customFieldMetas = this.getCustomFieldMetas(ro.hasFieldPerm);
        ro.ctdo = [];
        ro.ctIsDisplayed = {};
        var displayMask = ro.selectedContentType.get('DisplayMask');
        var displayMaskParsed = Utility.tryParseJSON(displayMask, true);
        if (displayMaskParsed) {
            ro.ctdo = displayMaskParsed.DisplayOrder || [];
            ro.ctIsDisplayed = displayMaskParsed.IsDisplayed || {};
        }
        ro.reorderableFields = [];
        // Fields that are always present
        ro.reorderableFields.push({ value: 'ctb_Title', text: Constants.c.title, topOfList: true, displayDefault: false });
        ro.reorderableFields.push({ value: 'ctb_Keywords', text: Constants.c.keywords, topOfList: true, displayDefault: false });
        ro.reorderableFields.push({ value: 'ctb_Created', text: Constants.c.created, topOfList: true, displayDefault: false, hideFieldTooltip: String.format(Constants.c.hideAuditInfoTooltip, Constants.c.created) });
        ro.reorderableFields.push({ value: 'ctb_Modified', text: Constants.c.modified, topOfList: true, displayDefault: false, hideFieldTooltip: String.format(Constants.c.hideAuditInfoTooltip, Constants.c.modified) });
        ro.reorderableFields.push({ value: 'ctb_Accessed', text: Constants.c.accessed, topOfList: true, displayDefault: false, hideFieldTooltip: String.format(Constants.c.hideAuditInfoTooltip, Constants.c.accessed) });
        ro.reorderableFields.push({ value: 'ctb_DueDate', text: Constants.c.dueDate, topOfList: true, displayDefault: false, showFieldTooltip: Constants.c.showDueDateTooltip });
        ro.reorderableFields.push({ value: 'ctb_SecurityClass', text: Constants.c.defaultSecurityClass, topOfList: true, displayDefault: false });
        ro.reorderableFields.push({ value: 'ctb_RecordCategory', text: Constants.c.defaultRecordsCategory, topOfList: true, displayDefault: false });
        ro.reorderableFields.push({ value: 'ctb_Inbox', text: Constants.c.defaultInbox, topOfList: true, displayDefault: false });
        ro.reorderableFields.push({ value: 'ctb_Folder', text: Constants.c.defaultFolder, topOfList: true, displayDefault: false });
        ro.reorderableFields.push({ value: 'ctb_Workflow', text: Constants.c.defaultWorkflow, topOfList: true, displayDefault: false });
        // Determine Related Fields
        ro.relatedCustomFields = ro.selectedContentType.get('RelatedCustomFields') || [];
        var relatedFields = {};
        var ctRelatedIdx = 0;
        var ctRelatedLen = ro.relatedCustomFields ? ro.relatedCustomFields.length : 0;
        for (ctRelatedIdx; ctRelatedIdx < ctRelatedLen; ctRelatedIdx++) {
            var relatedField = ro.relatedCustomFields[ctRelatedIdx];
            relatedFields[relatedField.RelatedCustomFieldId] = relatedField;
        }
        var relateOn = ro.selectedContentType.get('RelateOn');
        var relateAny = relateOn !== undefined ? relateOn === Constants.fro.AnyRelatedField : true;
        ro.anySelected = relateAny ? 'checked="checked"' : '';
        ro.allSelected = relateAny ? '' : 'checked="checked"';
        if (!ro.allSelected) {
            ro.anySelected = 'checked="checked"';
        }
        ro.relatedFieldsDisabled = ctRelatedLen <= 0 ? 'disabled="disabled"' : '';
        // Determine Default Fields
        var ctDefaultFields = ro.selectedContentType.get('DefaultCustomFields');
        this.defaultFields = {};
        var ctDefaultIdx = 0;
        var ctDefaultLen = ctDefaultFields ? ctDefaultFields.length : 0;
        for (ctDefaultIdx; ctDefaultIdx < ctDefaultLen; ctDefaultIdx++) {
            var defaultField = ctDefaultFields[ctDefaultIdx];
            this.defaultFields[defaultField.CustomFieldMetaID] = defaultField;
        }
        var cfLen = ro.customFieldMetas.length;
        for (idx = 0; idx < cfLen; idx++) {
            var cfm = ro.customFieldMetas.at(idx);
            var cfId = cfm.get('Id');
            if (cfId !== Constants.c.emptyGuid) {
                // Select the option if it is a default field
                var selected = false;
                if (this.defaultFields[cfId]) {
                    selected = true;
                }
                // Item is selected and it is a custom field, determine if the content type has the field as a related field
                var isRelatedClass = '';
                if (relatedFields[cfId]) {
                    isRelatedClass = 'isRelated';
                }
                var topOfList = false;
                var fieldId = 'ctb_' + cfId;

                var fieldClassList = 'ctbRelatable ' + isRelatedClass;
                if (ro.hasFieldPerm) {
                    fieldClassList += ' ctbEditable';
                }
                ro.reorderableFields.push({
                    value: fieldId,
                    text: cfm.get('Name'),
                    selected: selected,
                    disabled: false,
                    'class': fieldClassList,
                    topOfList: topOfList,
                    displayDefault: true,
                    displayRegion: this.renderRegionView
                });
            }
        }
        // Order (non-selected) reorderable fields, alphabetically
        ro.reorderableFields = ro.reorderableFields.sort(function (a, b) {
            if (a.topOfList) {
                return -1;
            }
            return Utility.sortByProperty('text', false)(a, b);
        });
        return ro;
    },
    render: function () {
        var that = this;
        this.viewData = this.getRenderObject();
        this.stopListening(this.viewData.selectedContentType, 'change:Name');
        this.listenTo(this.viewData.selectedContentType, 'change:Name', function (model, name) {
            if (that.regionView && that.regionView.viewData && that.regionView.viewData.selectedContentType) {
                that.regionView.viewData.selectedContentType.set('Name', name);
            }
        });
        this.$el.html(this.compiledTemplate(this.viewData));
        var fields = this.viewData.reorderableFields;
        var fieldsLen = fields.length;
        var $selectedUL = this.$el.find('ul');
        var renderFields;
        this.closeFieldViews();
        var recursiveIncrementor = 0;
        renderFields = function (idx) {
            if (idx > fieldsLen - 1) {
                that.renderComplete();
            }
            else {
                var field = fields[idx];
                var showField = that.viewData.ctIsDisplayed[field.value.split('_')[1]];
                field.showField = showField === undefined ? true : showField;
                var ctbFieldSettingView = new ContentTypeBuilderFieldSettingView({
                    selectedContentType: that.viewData.selectedContentType,
                    field: field
                });
                $selectedUL.append(ctbFieldSettingView.render());
                that.ctbFieldSettingViews.push(ctbFieldSettingView);
                setTimeout(function () {
                    renderFields(++recursiveIncrementor);
                }, 5);
            }
        };
        renderFields(recursiveIncrementor);
        return this.$el;
    },
    renderComplete: function () {
        var that = this;
        var $selectedUL = this.$el.find('ul');
        // Initialize sortable
        $selectedUL.sortable({
            items: '> li:visible:not("#' + Constants.c.emptyGuid + '")',
            containment: $selectedUL,
            cursor: 'move',
            change: function (event, ui) {
                that.setDirty();    // Position of a field has changed, set dirty bit
            }
        });
        this.toggleRelatedInputs(this.viewData.relatedCustomFields.length === 0);
        // Reorder fields to match that of the Content Type's Display Mask (or as best it can, eg. fields have been deleted)
        var ctdo = this.viewData.ctdo;
        var ctdoLen = ctdo.length;
        var $selectedItems = $selectedUL.find('li:not("#' + Constants.c.emptyGuid + '")');
        // Don't do anything if there is no display mask
        if (ctdoLen !== 0) {
            var selectedFound = {};
            // Reorder selected fields
            var insertAfterIdx = 0;
            var selectedIdx;
            var selLen = $selectedItems.length;
            var selId;
            // Loop over display mask, appending selected fields according to display mask order.
            for (idx = 0; idx < ctdoLen; idx++) {
                var obj = ctdo[idx];
                //Bug 9978 - http://thedude.docstar.com/b/show_bug.cgi?id=9978
                // If the display mask element doesn't exist maintain where to insert the next display mask item
                // If the display mask element does exist, increment the index for where to insert the next display mask item
                insertAfterIdx = $selectedItems.parent().find('#ctb_' + Object.keys(obj)[0]).length > 0 ? ++insertAfterIdx : insertAfterIdx;
                for (selectedIdx = 0; selectedIdx < selLen; selectedIdx++) {
                    selId = $selectedItems.eq(selectedIdx).attr('id').split('_')[1];
                    if (obj[selId] !== undefined) {
                        selectedFound[selId] = true;
                        var $elemToAppend = $selectedItems.eq(selectedIdx);
                        var $insertAfterElem = $selectedUL.find('li').eq(insertAfterIdx);
                        // Perform the insert after if the insert after element exists and the element to append and the element to insert after are not the same element
                        // Otherwise the element should already be in the correct location
                        if ($elemToAppend.attr('id') !== $insertAfterElem.attr('id')) {
                            if ($insertAfterElem.length > 0) {
                                $elemToAppend.insertAfter($insertAfterElem);
                            }
                            else if (insertAfterIdx >= $selectedUL.find('li').length) {
                                $insertAfterElem = $selectedUL.find('li').last();
                                $elemToAppend.insertAfter($insertAfterElem);
                            }
                        }
                    }
                }
            }
            // Loop over selected fields and append any that have yet to be appended.
            for (selectedIdx = 0; selectedIdx < selLen; selectedIdx++) {
                selId = $selectedItems.eq(selectedIdx).attr('id').split('_')[1];
                if (!selectedFound[selId]) {
                    $selectedItems.eq(selectedIdx).appendTo($selectedUL);
                }
            }
        }
        var ev = new $.Event();
        ev.currentTarget = this.$el.find('.ctbDisplayFieldsContainer input');
        this.changeFieldsDisplayed(ev);
        var syncActionId = that.viewData.selectedContentType.get('SyncActionId');
        this.setupSyncActionForEditing(syncActionId);
    },
    setupSyncActionForEditing: function (syncActionId) {
        var that = this;
        var getActionCallback = function (syncAction) {
            var type = $(syncAction).find('Type').text();
            var actionName = $(syncAction).find('Name').text();
            if (that.renderRegionView) {
                that.regionView = new ContentTypeBuilderFieldRegionView({
                    pzr: that.pzr,
                    selectedContentType: that.viewData.selectedContentType,
                    syncAction: syncAction,
                    endSelectionCallback: function () {
                        that.endSelectionCallback();
                    }
                });
            }
            if ((parseInt(type, 10) === Constants.sap.SyncVerifyAction || Constants.c['wfat_' + type] === Constants.c.wfat_SyncVerifyAction)) {
                // If the sync action is a SyncVerifyAction, disable the region icons and don't attempt to draw any regions
                that.disableSimpleSyncActionEditing(actionName);
                that.disableRenderRegions = true;
            }
            else {
                that.renderRegions();
            }
            that.$el.trigger('ctbFullyRendered');
        };
        if (!syncActionId) {
            var wfActionGetArgs = {
                StepId: Constants.c.emptyGuid,
                Sequence: 0
            };
            WorkflowUtil.getNewActionXml(wfActionGetArgs, function (syncAction) {
                $(syncAction).find('Name').text('{0}');
                $(syncAction).find('Type').text(Constants.wfat.SyncAutoRunAction);
                getActionCallback(syncAction);
            });
        }
        else {
            WorkflowUtil.getSyncActionXml(syncActionId, getActionCallback);
        }
    },
    disableSimpleSyncActionEditing: function (actionName) {
        var $regionIcons = this.$el.find('.dashedRectangle');
        $regionIcons.addClass('disabledIcon');
        $regionIcons.parent().attr('title', String.format(Constants.t('disableCreateRegion'), actionName));

    },
    enableSimpleSyncActionEditing: function (syncActionId) {
        var $regionIcons = this.$el.find('.dashedRectangle');
        $regionIcons.removeClass('disabledIcon');
        $regionIcons.parent().attr('title', Constants.t('createRegion'));
        this.setupSyncActionForEditing(syncActionId);
    },
    setupNewFieldCombo: function () {
        var $ul = this.$el.find('ul');
        var $items = $ul.find('li');
        var $select = this.$el.find('select.ctbNew');
        $select.empty();
        var select = $select.get(0);
        var idx = 0;
        var length = $items.length || 1;
        // First item will be the -- New -- field
        var opt = document.createElement('option');
        opt.value = Constants.c.emptyGuid;
        opt.textContent = Constants.c.newTitle;
        select.appendChild(opt);
        this.$el.find('.ctbNewFieldContainer').find('.isCombo').val(Constants.c.newTitle);
        for (idx; idx < length; idx++) {
            opt = document.createElement('option');
            var $item = $items.eq(idx);
            var $input = $item.find('input[name="IsDefault"]');
            if ($input.length > 0 && !$input.get(0).checked) {
                opt.value = $item.attr('id');
                opt.textContent = $.trim($item.find('.limitLabelWidth').text());
                select.appendChild(opt);
            }
        }
        var that = this;
        $select.combobox({
            onSelect: function (data) {
                var ev = data.event;
                //var ui = data.ui;
                if (ev.which === 13) {
                    return;
                }
                that.addField();
            },
            onChange: function (data) {
                //var ev = data.event;
                //var ui = data.ui;
            }
        });
    },
    closeFieldViews: function () {
        var idx;
        var length = this.ctbFieldSettingViews.length;
        for (idx = 0; idx < length; idx++) {
            var ctbFieldSettingView = this.ctbFieldSettingViews[idx];
            if (ctbFieldSettingView && ctbFieldSettingView.close) {
                ctbFieldSettingView.close();
            }
        }
        this.ctbFieldSettingViews = [];
    },
    close: function () {
        this.closeFieldViews();
        if (this.regionView && this.regionView.close) {
            this.regionView.close();
        }
        $('body').off('imageLoadedRegionSelection.ContentTypeBuilderFieldSettingsView');
        $('.ui-dialog').has(this.$el).off();
        $('body').off('imageLoadedRegionSelection.ContentTypeBuilderFieldSettingsView');
        if (this.renderRegionView) {
            if (this.$viewPort) {
                this.$viewPort.off('.ContentTypeBuilderFieldSettingsView');
            }
            this.getEditMarkContainer().find('.region').remove();   // clear out all .region's
            this.pzr.getViewPort().find('.regionContainer').empty();
        }
        this.$el.off('ctbDisplayFieldsChanged');
        this.unbind();
        this.remove();
    },
    getEditMarkContainer: function () {
        var $viewPort = this.$viewPort;
        return $viewPort.find('.editMarkContainer');
    },
    resize: function (resizeCallback) {
        Utility.executeCallback(resizeCallback);
        var $ul = this.$el.find('ul');
        // Title should never have 'display: none' set; use it for resizing.
        var $li = $ul.find('li#ctb_Title');
        var $additionalHTML = $li.find('.additionalSelectedHTML');
        var preWidth = $li.find('.preAdditionalSelectedHTML').outerWidth(true);
        var postWidth = $additionalHTML.outerWidth(true);
        var liWidth = $li.width();
        var $label = $ul.find('.limitLabelWidth');
        var $select = $ul.find('.defaultFieldHTMLContainer').find('select');
        var $input = $ul.find('.defaultFieldHTMLContainer').find('input');
        var availableWidth = liWidth - preWidth - postWidth;
        var labelWidth = availableWidth * 0.45;
        var defaultHtmlWidth = availableWidth * 0.55;
        $label.width(labelWidth);
        $label.css({
            'max-width': labelWidth,
            'min-width': labelWidth
        });
        $select.width(defaultHtmlWidth);
        $input.width(defaultHtmlWidth - 5);
    },
    //#endregion View Rendering

    //#region Event Handlers
    changeFieldsDisplayed: function (event, $lisNotSelected) {
        var $targ = $(event.currentTarget);
        var $lis = this.$el.find('li');
        var idx = 0;
        var length = $lis.length;
        $lisNotSelected = $lisNotSelected || $();
        if ($lisNotSelected.length === 0) {
            for (idx; idx < length; idx++) {
                var $li = $lis.eq(idx);
                var $cb = $li.find('input[type="checkbox"]');
                if ($cb.length > 0 && !$cb.is(':checked')) {
                    $lisNotSelected = $lisNotSelected.add($li);
                }
            }
        }
        var that = this;
        var hide = false;
        var cf = function () {
            // Make sure the elements are show/hidden properly
            // if they aren't already shown fadeOut won't hide the elements properly
            if (hide) {
                $lisNotSelected.hide();
                var $el = $lisNotSelected.find('.linkIcon');
                if ($el) {
                    $el.attr('title', Constants.c.isNotRelated);
                    $el.removeClass('linkIcon').addClass('linkDisabledIcon');
                    // Disable radio buttons if no field is related
                    var $relateds = that.$el.find('li').has('.linkIcon');
                    if ($relateds.length === 0) {
                        that.toggleRelatedInputs(true);
                    }
                }
            }
            else {
                $lisNotSelected.show();
            }
            that.resize();
            that.setupNewFieldCombo();
            that.$el.trigger('ctbDisplayFieldsChanged');
        };
        if ($targ.is(':checked')) {
            this.displayFields($lisNotSelected, cf);
        }
        else {
            hide = true;
            $lisNotSelected.fadeOut(400, 'linear').promise().done(cf);
        }
    },
    changeDefault: function (event) {
        this.setDirty();
        var ev = new $.Event();
        ev.currentTarget = this.$el.find('.ctbDisplayFieldsContainer input');
        var $field = this.$el.find('li').has($(event.currentTarget));
        var $sortable = this.$el.find('ul');
        // Move the selected Item to the top of the list
        if (event.currentTarget.checked) {
            $field.prependTo($sortable);
        }
        this.changeFieldsDisplayed(ev, $field);
    },
    displayFields: function ($fields, cf) {
        $fields.fadeIn(400, 'linear').promise().done(cf);
    },
    changeRelated: function (event) {
        this.setDirty();
        var $targ = $(event.currentTarget);
        // Switch related to not related and not related to related
        if ($targ.hasClass('linkIcon')) {
            $targ.attr('title', Constants.c.isNotRelated);
            $targ.removeClass('linkIcon').addClass('linkDisabledIcon');
            // Disable radio buttons if no field is related
            var $relateds = this.$el.find('li').has('.linkIcon');
            if ($relateds.length === 0) {
                this.toggleRelatedInputs(true);
            }
        }
        else {
            $targ.attr('title', Constants.c.isRelated);
            $targ.removeClass('linkDisabledIcon').addClass('linkIcon');
            this.toggleRelatedInputs(false);
        }

    },
    changeFieldVisibility: function (event) {
        this.setDirty();
        var $targ = $(event.currentTarget);
        var $li = this.$el.find('li').has($targ);
        var fieldView = this.getFieldSettingView($li.attr('id'));
        if ($targ.hasClass('showEyeIcon')) {
            // Make field appear visible
            $targ.removeClass('showEyeIcon').addClass('hideEyeIcon');
            $targ.attr('title', fieldView && fieldView.getHideFieldTooltip ? fieldView.getHideFieldTooltip() : Constants.c.hideField);
        }
        else {
            // Make field appear hidden
            $targ.removeClass('hideEyeIcon').addClass('showEyeIcon');
            $targ.attr('title', fieldView && fieldView.getShowFieldTooltip ? fieldView.getShowFieldTooltip() : Constants.c.showField);
        }
    },
    getFieldSettingView: function (ctbFieldId) {
        var fieldView;
        var idx;
        var length = this.ctbFieldSettingViews.length;
        for (idx = 0; idx < length; idx++) {
            var reorderableField = this.ctbFieldSettingViews[idx].viewData.field;
            if (reorderableField.value === ctbFieldId) {
                fieldView = this.ctbFieldSettingViews[idx];
                break;
            }
        }
        return fieldView;
    },
    openSelectFolder: function (event) {
        this.setDirty();
        var $defaultFolderId = this.$el.find('input[name="DefaultFolderId"]');
        var defFolderId = $defaultFolderId.val();
        if (defFolderId) {
            this.prevFolder.Id = defFolderId;
        }
        var $selectedFolder = this.$el.find('input[name="DefaultFolderName"]');
        var selectedFolder = $selectedFolder.val();
        if (selectedFolder) {
            this.prevFolder.Title = selectedFolder;
        }
        var that = this;
        var callback = function (btnText, uiState, foldId, foldTitle, foldPath) {
            var $defaultFolderName = that.$el.find('input[name="DefaultFolderName"]');
            var $defaultFolderId = that.$el.find('input[name="DefaultFolderId"]');
            switch (btnText) {
                case Constants.c.ok:
                    if (foldPath) {
                        $defaultFolderName.val(foldPath);
                    }
                    else {
                        $defaultFolderName.val(foldTitle);
                    }
                    $defaultFolderId.val(foldId);
                    break;
                case Constants.c.clear:
                    $defaultFolderName.val('');
                    $defaultFolderId.val(Constants.c.emptyGuid);
                    uiState.prevFolder.Id = null;
                    uiState.prevFolder.Title = null;
                    break;
                case Constants.c.cancel:
                    if (uiState.prevFolder.Id && uiState.prevFolder.Title) {
                        $defaultFolderName.val(uiState.prevFolder.Title);
                        $defaultFolderId.val(uiState.prevFolder.Id);
                    }
                    else {
                        $defaultFolderName.val('');
                        $defaultFolderId.val('');
                    }
                    break;
                default:
                    var defaultFolderId = $defaultFolderId.val();
                    if (defaultFolderId && defaultFolderId !== Constants.c.emptyGuid) {
                        var folder = window.slimFolders.get(defaultFolderId);
                        if (!folder && window.folders) {
                            folder = window.folders.get(defaultFolderId);
                        }
                        if (folder) {
                            $defaultFolderName.val(folder.get('Name'));
                        }
                        else {
                            $defaultFolderId.val(Constants.c.emptyGuid);
                            $defaultFolderName.val('');
                        }
                    }
            }
        };
        // Dialogs util folder selection pass in this to set prevFolder.Id and prevFolder.Title
        var position = { my: 'left top', at: 'right top', of: this.$el.find('input[name="DefaultFolderName"]').parent() };
        DialogsUtil.folderSelection(false, false, '', callback, this, {
            singleSelect: true,
            position: position
        });
    },
    enterRegionCreation: function (event, selectRegion) {
        if (!this.renderRegionView) {
            return;
        }
        this.editingRegions = true;
        var $targ = $(event.currentTarget);
        if ($targ.hasClass('disabledIcon')) {
            return; // Do not allow editing of the region if the icon is disabled
        }
        var $li = this.$el.find('li').has($targ);
        var that = this;
        // Animate the dialog contents to be closed
        var $dialog = $('.ui-dialog').has(this.$el);
        var $dialogContents = $dialog.find('.ui-dialog-content');
        $dialogContents.dialog('option', {
            resizable: false,
            height: 'auto'
        });
        $dialog.find('.ui-dialog-content,  .ui-dialog-buttonpane').slideUp(400, 'easeInOutQuart').promise().done(function () {
            var $caratContainer = $dialog.find('.ui-dialog-titlebar-expand');
            $caratContainer.attr('title', Constants.t('expandContentTypeBuilder'));
            $caratContainer.show();
            $dialogContents.off('dialogclose.regionSelection').on('dialogclose.regionSelection', function () {
                that.regionView.cleanupRegionSelection(function () {
                    that.regionView.dialogClosed = true;
                    DialogsUtil.isDialogInstanceClose(that.regionView.$dialog);
                });
            });
            $('.ui-dialog').has($dialogContents).find('.ui-dialog-titlebar-expand .ui-icon-triangle-1-s').off('click.ContentTypeBuilderFieldSettingsView').on('click.ContentTypeBuilderFieldSettingsView', function () {
                that.regionView.cleanupRegionSelection(function () {
                    that.regionView.dialogClosed = true;
                    DialogsUtil.isDialogInstanceClose(that.regionView.$dialog);
                });
            });
            var fieldData = {
                fieldName: $li.find('.limitLabelWidth > span').text(),
                fieldId: $li.attr('id').split('_')[1]
            };
            if (selectRegion !== false) {
                that.regionView.setupFieldRegionSelection(fieldData);
            }
        });
    },
    highlightFields: function () {
        var $viewport = this.$viewPort;
        var idx = 0;
        var length = window.customFieldMetas.length;
        for (idx; idx < length; idx++) {
            var cf = window.customFieldMetas.at(idx);
            var $fieldRegion = $viewport.find('[fieldId="' + cf.get('Id') + '"]');
            var $li = this.$el.find('li#ctb_' + cf.get('Id'));
            var colorIdx = 0;
            var colorLen = Constants.colorPalette.length;
            for (colorIdx; colorIdx < colorLen; colorIdx++) {
                $li.removeClass('gradient-' + Constants.colorPalette[colorIdx]);
            }
            var color = $fieldRegion.data('color');
            if (color) {
                $li.addClass('gradient-' + color);
            }
        }
    },
    renderRegions: function () {
        if (this.pzr && this.regionView && this.regionView.renderRegions) {
            DialogsUtil.isDialogInstanceClose(this.regionView.$dialog);
            this.getEditMarkContainer().empty();
            this.regionView.renderRegions();
            this.highlightFields();
        }
    },
    endSelectionCallback: function () {
        this.editingRegions = false;
        var $dialog = $('.ui-dialog').has(this.$el);
        var $dialogContents = $dialog.find('.ui-dialog-content');
        var $caratContainer = $dialog.find('.ui-dialog-titlebar-expand');
        $caratContainer.attr('title', Constants.t('expandContentTypeBuilder'));
        $caratContainer.hide();
        var that = this;
        $dialog.find('.ui-dialog-content, .ui-dialog-buttonpane').slideDown(400, 'easeInOutQuart').promise().done(function () {
            $dialogContents.dialog('option', {
                resizable: true,
                height: $dialog.height()
            });
            that.$el.trigger('ctbDisplayFieldsChanged');    // Trigger a resize
            that.renderRegions();
        });
    },
    //#endregion Event Handlers

    //#region Field Editing
    addFieldKeyInput: function (ev) {
        if (ev.which !== 13) {
            return;
        }
        this.addField();
    },
    addField: function (event) {
        // Only create/add a field when 'Enter' is pressed
        var that = this;
        var $comboInput = this.$el.find('.ctbNewFieldContainer').find('.isCombo');
        var $select = this.$el.find('select.ctbNew');
        var $selectedOpt = $select.find('option:selected');
        var fieldId = $selectedOpt.val();
        if (fieldId === Constants.c.emptyGuid) {
            this.createField($comboInput.val());
            that.$el.trigger('ctbDisplayFieldsChanged');
        }
        else {
            var $li = this.$el.find('li#' + fieldId);
            var $isDefault = $li.find('input[name="IsDefault"]');
            $isDefault.prop('checked', true);
            $isDefault.trigger('change');
            var cf = function () {
                var $ctbFieldSettingsContainer = that.$el.find('.ctbFieldSettingsContainer');
                $ctbFieldSettingsContainer.scrollTo($li);
                that.$el.trigger('ctbDisplayFieldsChanged');
                var ev = new $.Event();
                ev.currentTarget = $li.find('.ui-icon-pencil');
                that.setupNewFieldCombo();
            };
            this.displayFields($li, cf);
        }
        return false;
    },
    editField: function (event) {
        var $targ = $(event.currentTarget);
        var $li = this.$el.find('ul > li').has($targ);
        var isDefaultChecked = $li.find('input[name="IsDefault"]').prop('checked');
        var splitId = $li.attr('id').split('_');
        var cfId = splitId.length > 1 ? splitId[1] : splitId[0];
        var cfName = $li.find('.limitLabelWidth span').text();
        var cf = this.viewData.customFieldMetas.get(cfId);
        if (!cf) {
            ErrorHandler.addErrors(String.format(Constants.c.fieldNoLongerExists_T, cfName));
            return;
        }
        var selected = new CustomFieldMeta(cf.toJSON());
        selected.set('Name', cfName, { silent: true });
        var cfView = new CustomFieldMetaEditView({
            singleField: true,
            displayRegEx: false,
            displayButtons: false,
            selected: selected
        });
        var $dialog;
        var that = this;
        // Change the sync actions task output to use the new custom field name
        var taskInfo;
        if (that.regionView && that.regionView.$currentSyncAction) {
            taskInfo = WorkflowUtil.getFieldTaskInfoFromActionXml(that.regionView.$currentSyncAction, cfId, null);
        }

        var $ctbFieldContainerCombo = that.$el.find('.ctbNewFieldContainer .isCombo');
        var okFunc = function (cleanup) {
            var callback = function (result) {
                if (result) {
                    var customFieldSavedCallback = function () {
                        that.setDirty();
                        $ctbFieldContainerCombo.val(Constants.c.newTitle);
                        var fieldView = that.getFieldSettingView($li.attr('id'));
                        var newCTBFieldId = 'ctb_' + result.Id;
                        fieldView.field.value = newCTBFieldId;
                        fieldView.field.text = result.Name;
                        fieldView.field.selected = isDefaultChecked;
                        $li.attr('title', result.Name);
                        $li.attr('id', newCTBFieldId);
                        fieldView.render();
                        if (result.Type === Constants.ty.Object && result.ListName) {
                            var list = window.slimCustomLists.getByNameOrId(result.ListName);
                            var listId = list ? list.get('Id') : undefined;
                            var $ol = $li.find('select[name="OverridableList"]');
                            if (listId) {
                                $ol.find('[value="' + listId + '"]').prop('selected', true);
                            }
                            else {
                                $ol.find('option').first().prop('selected', true);
                            }
                        }
                        that.resize();
                        that.viewData.customFieldMetas = that.getCustomFieldMetas(that.viewData.hasFieldPerm);
                        // Close the dialog
                        DialogsUtil.cleanupDialog($dialog);
                        // Focus the Add Field Combobox input and select the text
                        InputUtil.selectText(that.$el.find('.ctbNewFieldContainer .isCombo'));
                    };
                    if (that.regionView && taskInfo && taskInfo.$task) {
                        that.regionView.updateOutArgNames(taskInfo.$task, cfName, result.Name);
                        that.regionView.saveChanges(customFieldSavedCallback);
                    }
                    else {
                        customFieldSavedCallback();
                    }
                }
            };
            var failureFunc = function () {
                DialogsUtil.cleanupDialog($dialog, [Constants.c.save, Constants.c.cancel], true);
            };
            cfView.saveChanges(null, null, callback, failureFunc);
        };
        var cancelFunc;
        cancelFunc = function (cleanup) {            
            // Check dirty flag of custom field meta edit view
            var saveDirtyPrompt = function (dirtyCleanup) {
                okFunc();
                Utility.executeCallback(dirtyCleanup); //Call regardless of okFunc success or failure
            };
            var noSaveDirtyPrompt = function (dirtyCleanup) {
                if (cfId === Constants.c.emptyGuid) {
                    $li.remove();
                    that.$el.trigger('ctbDisplayFieldsChanged');
                }
                else {
                    $ctbFieldContainerCombo.val(Constants.c.newTitle);
                }
                cfView.clearDirty();
                cfView.close();
                Utility.executeCallback(cleanup);
                Utility.executeCallback(dirtyCleanup);
                // Focus the Add Field Combobox input and select the text
                InputUtil.selectText($ctbFieldContainerCombo);
            };
            if (cfView.isDirty()) {
                var dto = DTO.getDTO(cfView.$el);
                var dirtyOpts = {
                    open: function () {
                        $(this).width('auto');
                        $(this).height('auto');
                    }
                };
                DialogsUtil.generalSaveDirtyPromptDialog(String.format(Constants.c.unsavedChanges, dto.Name), saveDirtyPrompt, noSaveDirtyPrompt, dirtyOpts);
            }
            else {
                noSaveDirtyPrompt();
            }
        };
        var title = String.format(Constants.t('editField'), selected.get('Name') || Constants.c.newTitle);
        var opts = {
            okText: Constants.t('save'),
            title: title,
            resizable: false,
            autoOpen: false,
            position: {
                my: 'left top',
                at: 'right top',
                of: $li
            },
            open: function () {
                cfView.render();
                $dialog.find('input').focus().select();
            },
            html: cfView.$el
        };
        $dialog = DialogsUtil.generalPromptDialog('', okFunc, cancelFunc, opts);
        $dialog.dialog('open');
    },
    createField: function (fieldName) {
        var fieldClassList = 'ctbRelatable';
        if (this.viewData.hasFieldPerm) {
            fieldClassList += ' ctbEditable';
        }
        var field = {
            value: 'ctb_' + Constants.c.emptyGuid,
            text: fieldName || Constants.c.newTitle,
            selected: true,
            disabled: false,
            'class': fieldClassList,
            topOfList: false,
            displayDefault: true,
            showField: true,
            displayRegion: this.renderRegionView
        };
        var ctbFieldSettingView = new ContentTypeBuilderFieldSettingView({
            selectedContentType: this.viewData.selectedContentType,
            field: field
        });
        this.ctbFieldSettingViews.push(ctbFieldSettingView);
        var $ul = this.$el.find('ul');
        var $html = ctbFieldSettingView.render();
        $ul.prepend($html);
        var $ctbFieldSettingsContainer = this.$el.find('.ctbFieldSettingsContainer');
        $ctbFieldSettingsContainer.scrollTo($html);
        var event = new $.Event();
        event.currentTarget = $html.find('.ui-icon-pencil');
        this.resize();
        this.editField(event);
    },
    //#endregion Field Editing

    //#region Dirty Tracking
    getDirty: function () {
        return this.isDirty;
    },
    setDirty: function () {
        this.isDirty = true;
    },
    clearDirty: function () {
        this.isDirty = false;
    },
    //#endregion Dirty Tracking
    toggleRelatedInputs: function (disableInputs) {
        var $radios = this.$el.find('.relatedContainer').find('input[type="radio"]');
        $radios.prop('disabled', disableInputs);
    }
});