/// <reference path="../../Content/LibsInternal/ErrorHandler.js" />
/// <reference path="../../Content/JSProxy/CustomFieldProxy.js" />
/// <reference path="../../Content/LibsInternal/DialogsUtil.js" />
// View for editing a CustomFieldMeta
// Renders a compiled template using doU.js
var CustomFieldMetaEditView = Backbone.View.extend({
    className: 'customFieldMetaEditView',
    viewData: {},
    $dialog: undefined, // Used to display the view inside of a dialog
    $testDialog: undefined,
    saveButtonSelector: 'input[name="save_cf"]',
    buttonsSelector: 'input[name="save_cf"], input[name="delete_cf"]',
    dirty: false,
    displayInDialog: false,
    dialogOptions: {},
    dialogCallbacks: {},
    fieldTag: {},
    events: {
        "change select[name='Id']": "changeSelection",
        "change select[name='Type']": "changeCFType",
        "change input[name='Name']": "changeText",
        "change select[name='ListName']": "changeText",
        "change input[name='RegExRequirement']": "changeText",
        "change input[name='RegExFailureMessage']": "changeText",
        "click input[name='NonIndexed']": "changeText",
        "change input.isCombo": "changeText",
        "click input[name='save_cf']": "saveChanges",
        "click input[name='delete_cf']": "kill",
        "click input[name='test_cf']": "testAdvancedSettings",
        "click input[name='Name']": "clickName"
    },
    initialize: function (options) {
        var that = this;
        this.setOptions(options);
        this.compiledTemplate = doT.template(Templates.get('editcustomfieldmetalayout'));
        this.listenTo(window.customFieldMetas, 'add reset', function () {
            that.updateView();
        });
        this.listenTo(window.customFieldMetas, 'remove', function (model) {
            that.removeFieldFromGroupTemplates(model);
            that.updateView();
        });
        return this;
    },
    setOptions: function (options) {
        this.options = options || {};
        this.options.dialogCallbacks = this.options.dialogCallbacks || {};
        this.$dialog = undefined;
        this.augmentedFields = this.options.augmentedFields;
        var allowedTypes = this.options.allowedTypes;
        this.allowedTypes = allowedTypes && !$.isEmptyObject(allowedTypes) ? allowedTypes : Constants.ty;   // Default to allowing every type
        this.displayInDialog = this.options.displayInDialog === undefined ? this.displayInDialog : this.options.displayInDialog;
        this.dialogOptions = $.extend(this.dialogOptions, this.options.dialogOptions);
        this.dialogCallbacks = $.extend(this.dialogCallbacks, this.options.dialogCallbacks);
        this.fieldTag = this.options.fieldTag;
    },
    render: function () {
        // Refresh viewData.list
        var that = this;
        this.viewData = this.getRenderObject();
        var fieldScrollTop = this.$el.find("[name=Id]").scrollTop();
        this.$el.html(this.compiledTemplate(this.viewData));
        this.$el.find("[name=Id]").scrollTop(fieldScrollTop);
        Navigation.stopNavigationCallback = true;
        Navigation.onNavigationCallback = undefined;
        this.delegateEvents(this.events);
        if (this.displayInDialog) {// If displaying as a dialog, create the dialog once
            this.dialogOptions.title = String.format(this.dialogOptions.title || Constants.t('editField'), this.viewData.selected.get('Name'));
            var opts = {
                resizable: false
            };
            if (!this.viewData.hasFieldPerm) {
                opts.okText = Constants.t('ok');
            }
            this.dialogOptions = $.extend(opts, this.dialogOptions);
            if (DialogsUtil.isDialogInstance(this.$dialog)) {
                this.$dialog.dialog('option', 'title', this.dialogOptions.title);
            }
            else {
                this.renderDialog();
            }
        }
        this.setupCombobox();
        this.toggleSaveButtons();
        this.$el.delegate('input[name="Name"],input[name="RegExRequirement"],input[name="RegExFailureMessage"],input.isCombo', 'keyup', function (ev) {
            that.changeText();
        });
        // If just the list type was selected, then on initial render the select containing all of the lists wouldn't be displayed.
        this.toggleListNameDropDown();
        return this;
    },
    toggleListNameDropDown: function () {
        var type = parseInt(this.$el.find('select[name="Type"]').find(':selected').val(), 10);
        if (type === Constants.ty.Object) {
            this.$el.find('.cfs_lists').show();
        }
        else {
            this.$el.find('.cfs_lists').hide();
        }
    },
    getRenderObject: function () {
        var ro = {};
        ro.selected = this.options.selected || this.viewData.selected || undefined;

        var isReadOnlyList;
        // Work around #13032
        // Added check to validate if field tag belongs to DropDown or ComboBox, select readonly list for DropDown and !readonly for ComboBox.     
        if (this.fieldTag && (this.fieldTag === Constants.ft.Select || this.fieldTag === Constants.ft.ComboBox)) {
            isReadOnlyList = this.fieldTag === Constants.ft.Select;
            // This code is only executed when called from Forms so window.customLists is already loaded here.
            ro.custLists = window.customLists.getCustomListsCollectionByReadOnly(isReadOnlyList);
        } else {
            // window.customLists may be undefined when open from ContentTypeBuilder, in that case use slimCustomLists
            ro.custLists = window.customLists || window.slimCustomLists;
        }
        var newField = new CustomFieldMeta({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle });
        var cfms;
        if (this.augmentedFields) {
            cfms = new CustomFieldMetas(this.augmentedFields).filterByTypes(this.allowedTypes, isReadOnlyList);
        }
        else {
            cfms = window.customFieldMetas.filterByTypes(this.allowedTypes, isReadOnlyList);
        }
        ro.hasFieldPerm = Utility.hasFlag(window.gatewayPermissions, Constants.gp.Custom_Fields);
        if (!ro.hasFieldPerm) {
            var rmoGP = Utility.reverseMapObject(Constants.gp);
            ro.list = new CustomFieldMetas(cfms);
            ro.list.errorMsg = String.format(Constants.c.insufficientPermissionsRight, Constants.t('gp_' + rmoGP[Constants.gp.Custom_Fields]));
        } else {
            ro.list = new CustomFieldMetas(cfms).getNewList(newField);
        }
        if (ro.selected) {
            if (!ro.list.get(ro.selected.get('Id'))) {
                ro.list.add(ro.selected, { silent: true });
            }
        }

        ro.displayRegEx = this.options.displayRegEx === false ? 'display: none;' : 'display: block;';
        ro.formElementView = this.options.formElementView || false;
        ro.singleField = this.options.singleField;
        ro.displayButtons = this.options.displayButtons === false ? false : true;
        this.options.selected = undefined;
        if (ro.selected === undefined) {
            ro.selected = this.setNewClass(ro.list);
        }
        ro.typeSelected = ro.selected.get('Type') || Constants.ty.String;
        ro.availTypes = [];
        var typeSelectedAdded = false;
        var type;
        var types = this.allowedTypes;
        for (type in types) {
            if (types.hasOwnProperty(type)) {
                var text = Constants.c['ty_' + type];
                if (text) {
                    if (ro.typeSelected === Constants.ty.Double) {
                        ro.typeSelected = Constants.ty.Decimal;
                    }
                    var numOfType = Constants.ty[type];
                    var isSelected = ro.typeSelected === numOfType;
                    if (isSelected) {
                        typeSelectedAdded = true;
                    }
                    ro.availTypes.push({ num: numOfType, text: text, selected: isSelected });
                }
            }
        }
        if (!typeSelectedAdded && ro.selected.get('Id') !== Constants.c.emptyGuid) {
            var rmoTY = Utility.reverseMapObject(Constants.ty);
            ro.availTypes.push({ num: ro.typeSelected, text: Constants.c['ty_' + rmoTY[ro.typeSelected]], selected: true });
        }
        ro.disableDisplayFormat = (ro.typeSelected === Constants.ty.Boolean || ro.typeSelected === Constants.ty.Object || ro.typeSelected === Constants.ty.String);
        ro.availTypes.sort(function (a, b) {
            return Sort.alphaNumeric(a.text, b.text);
        });
        return ro;
    },
    setupCombobox: function (clearValue) {
        var $select = this.$el.find('select.combobox');
        var dto = DTO.getDTO(this.$el);
        var type = parseInt(dto.Type, 10);
        var source;
        var trans = Constants.c;
        var autocompleteMinWidth = 200;
        var that = this;
        switch (type) {
            case Constants.ty.Date:
            case Constants.ty.DateTime:
                source = [
                    { title: trans.shortdate_df_title, label: trans.shortdate_df_label, value: trans.shortdate_df },
                    { title: trans.longdate_df_title, label: trans.longdate_df_label, value: trans.longdate_df },
                    { title: trans.fulldate_shorttime_df_title, label: trans.fulldate_shorttime_df_label, value: trans.fulldate_shorttime_df },
                    { title: trans.fulldate_time_df_title, label: trans.fulldate_time_df_label, value: trans.fulldate_time_df },
                    { title: trans.generaldate_shorttime_df_title, label: trans.generaldate_shorttime_df_label, value: trans.generaldate_shorttime_df },
                    { title: trans.generaldate_longtime_df_title, label: trans.generaldate_longtime_df_label, value: trans.generaldate_longtime_df },
                    { title: trans.month_day_df_title, label: trans.month_day_df_label, value: trans.month_day_df },
                    { title: trans.shorttime_df_title, label: trans.shorttime_df_label, value: trans.shorttime_df },
                    { title: trans.longtime_df_title, label: trans.longtime_df_label, value: trans.longtime_df },
                    { title: trans.month_year_df_title, label: trans.month_year_df_label, value: trans.month_year_df }
                ];
                break;
            case Constants.ty.Decimal:
                source = [
                    { title: trans.currency_df_title, label: trans.currency_df_label, value: trans.currency_df },
                    { title: trans.exponential_df_title, label: trans.exponential_df_label, value: trans.exponential_df },
                    { title: trans.fixedpoint_df_title, label: trans.fixedpoint_df_label, value: trans.fixedpoint_df },
                    { title: trans.numeric_df_title, label: trans.numeric_df_label, value: trans.numeric_df },
                    { title: trans.percent_df_title, label: trans.percent_df_label, value: trans.percent_df }
                ];
                autocompleteMinWidth = 220;
                break;
            case Constants.ty.Int32:
            case Constants.ty.Int64:
            case Constants.ty.Double:
                source = [
                    { title: trans.currency_df_title, label: trans.currency_df_label, value: trans.currency_df },
                    { title: trans.decimal_df_title, label: trans.decimal_df_label, value: trans.decimal_df },
                    { title: trans.exponential_df_title, label: trans.exponential_df_label, value: trans.exponential_df },
                    { title: trans.fixedpoint_df_title, label: trans.fixedpoint_df_label, value: trans.fixedpoint_df },
                    { title: trans.numeric_df_title, label: trans.numeric_df_label, value: trans.numeric_df },
                    { title: trans.percent_df_title, label: trans.percent_df_label, value: trans.percent_df }
                ];
                autocompleteMinWidth = 220;
                break;
        }
        if ($select.combobox('instance')) {
            $select.combobox('destroy');
        }
        $select.combobox({
            source: source,
            autocompleteMinWidth: autocompleteMinWidth,
            classes: 'usingSource',
            onSelect: function () {
                that.changeText();
            },
            onChange: function () {
                that.changeText();
            }
        });
        var $combo = $select.parent().find('.isCombo');
        var df = clearValue ? '' : this.viewData.selected.get('DisplayFormat');
        $combo.val(df);
        this.toggleComboEnabled(type);
    },
    toggleComboEnabled: function (type) {
        var $displayFormat = this.$el.find('.cfs_DisplayFormat');
        var $displayFormatInput = $displayFormat.find('input.isCombo');
        // Disable the display format combbbox when the type is boolean, list, string, or hasNoPermission
        if (type === Constants.ty.Boolean || type === Constants.ty.Object || type === Constants.ty.String || !this.viewData.hasFieldPerm) {
            $displayFormatInput.prop('disabled', true);
            $displayFormat.find('.ui-combobox a').hide();
        }
    },
    testAdvancedSettings: function () {
        var that = this;
        Navigation.stopNavigationCallback = false;
        Navigation.onNavigationCallback = function () {
            that.$testDialog.dialog('close');
        };
        if (!this.$testDialog) {
            that.$testDialog = $(this.$el.find('.testDialog')).dialog({
                autoOpen: true,
                title: Constants.c.test,
                minWidth: 315,
                minHeight: 265,
                width: 315,
                height: 265,
                resizable: false
            });
            var $testButton = that.$testDialog.find('input[name="test_dlg"]');
            $testButton.on('click', function () {
                var $result = that.$testDialog.find('textarea[name="testResult"]');
                var text = that.$testDialog.find('input[name="testValue"]').val();
                var proxy = CustomFieldProxy();
                var sf = function (result) {
                    $result.text(result);
                };
                var ff = function (jqxhr, textStatus, error) {
                    $result.text(error.Message);
                };
                var cf = function () {
                    $testButton.prop('disabled', false);
                };
                $result.text(Constants.c.testing + '...');
                $testButton.prop('disabled', true);
                var attrs = DTO.getDTO(that.el);
                attrs.ListName = decodeURI(attrs.ListName);
                $.trim(attrs.Name);
                if (!attrs.DisplayFormat && !attrs.RegExRequirement) {
                    $result.text(Constants.c.customfieldNothingToTest);
                    cf();
                    return;
                }
                proxy.testCustomFieldValue({ CustomFieldMeta: attrs, TestValue: text }, sf, ff, cf);
            });
        }
        else {
            this.$testDialog.find('textarea[name="testResult"]').text('');
            this.$testDialog.find('input[name="testValue"]').val('');
            this.$testDialog.dialog('open');
        }
    },
    setNewClass: function (list) {
        var newClass = this.getNewClass(list);
        this.viewData.selected = newClass;
        return newClass;
    },
    clickName: function () {
        if (this.$("select[name='Id']").val() === Constants.c.emptyGuid) {
            if (this.$("input[name='Name']").val() === Constants.c.newTitle) {
                this.$("input[name='Name']").val("");
            }
        }
    },
    changeSelection: function () {
        var id = this.$("select[name='Id']").val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass(this.viewData.list);
        }
        else {
            var model = window.customFieldMetas.get(id);
            this.viewData.selected = model;
        }
        this.clearDirty();
        this.render();
    },
    changeCFType: function (e) {
        this.toggleListNameDropDown();
        this.changeText();
        // Clear the display format when changing types
        this.setupCombobox(true);
    },
    handleKeyPress: function (event) {
        if (event.keyCode === 13) {
            this.saveChanges();
        }
    },
    saveChanges: function (ev, headers, successCallback, failureCallback) {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        Utility.toggleInputButtons(this.buttonsSelector, false);

        var attrs = DTO.getDTO(this.el);
        if (attrs.Id === Constants.c.emptyGuid) {
            delete attrs.Id;
        }
        attrs.ListName = decodeURI(attrs.ListName);
        $.trim(attrs.Name);
        if (!this.isNameValidHandling(attrs.Name, 'Name')) {
            Utility.toggleInputButtons(this.buttonsSelector, true);
            Utility.executeCallback(failureCallback);
            return false;
        }
        var customFieldMeta = new CustomFieldMeta(attrs);
        // If there is no gateway permissions directly call successCallback. No need to update field
        if (!this.viewData.hasFieldPerm) {
            Utility.executeCallback(successCallback, customFieldMeta);
            return;
        }
        customFieldMeta.on("invalid", function (model, error) {
            that.handleErrors(model, error);
            Utility.toggleInputButtons(this.buttonsSelector, true);
            Utility.executeCallback(failureCallback);
        });
        if (this.isUnique(attrs) === true) {
            if (this.notSpecWord(attrs)) {
                if (attrs.Type !== '1') {
                    attrs.ListName = '';
                }

                var options = {
                    success: function (model, result) {
                        if (!attrs.Id) {
                            attrs.Id = Constants.c.emptyGuid;
                        }
                        model = new CustomFieldMeta(result);
                        if (!that.saveSuccess(model, result, attrs.Id, window.customFieldMetas, that)) {
                            var tempErrorText = $("." + css.warningErrorClass).text();
                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                            ErrorHandler.addErrors({ 'Name': tempErrorText }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                        }
                        else {
                            var id = model.get('Id');
                            var modelName = model.get('Name');
                            var modelType = model.get('Type');
                            var newDbField = {
                                Id: id,
                                DisplayName: modelName,
                                ActualName: modelName,
                                FieldType: modelType,
                                Type: Utility.reverseMapObject(Constants.ty)[modelType],
                                EntityList: false,
                                SystemField: null,
                                NonIndexed: model.get('NonIndexed')
                            };
                            // Update window.databasefields
                            if (window.databaseFields.get(id)) {
                                window.databaseFields.get(id).set(newDbField);
                            }
                            else {
                                window.databaseFields.add(newDbField);
                            }
                            Utility.executeCallback(successCallback, result);
                        }
                        Utility.toggleInputButtons(this.buttonsSelector, true);
                        that.clearDirty();
                        that.toggleSaveButtons();
                    },
                    failure: function (jqXHR, textStatus, errorThrown) {
                        if (errorThrown && errorThrown.Type && errorThrown.Type.match('OverridableException')) {
                            var overrideOpts = {
                                close: function (cleanup) {
                                    Utility.toggleInputButtons(that.buttonsSelector, true);
                                    Utility.executeCallback(cleanup);
                                }
                            };
                            DialogsUtil.generalPromptDialog(errorThrown.Message, function (cleanup) {
                                var headers = { "ds-options": Constants.sro.OverrideErrors };
                                that.saveChanges(ev, headers, function (result) {
                                    Utility.executeCallback(cleanup);
                                    Utility.executeCallback(successCallback, result);
                                });
                            }, overrideOpts.close, overrideOpts);
                        }
                        else {
                            that.handleErrors(null, errorThrown.Message);
                        }
                        Utility.executeCallback(failureCallback);
                    },
                    headers: headers,
                    raiseOverridableException: true
                };
                customFieldMeta.save(attrs, options);
            } else {
                that.handleErrors(null, { 'Name': Constants.c.specialNameTitle });
                Utility.executeCallback(failureCallback);
            }
        } else {
            that.handleErrors(null, { 'Name': Constants.c.duplicateTitle });
            Utility.executeCallback(failureCallback);
        }
    },
    /*
    * isUnique check the new against the existing.  do not allow same names on two contentTypes
    * if there is an update and the guid is the same then it is considered unique...
    * @return boolean
    */
    isUnique: function (attrs) {
        var unique = true;
        window.customFieldMetas.each(function (item) {
            if (attrs.Name.toLowerCase() === item.get('Name').toLowerCase()) {
                if (attrs.Id !== item.get('Id')) {
                    unique = false;
                }
            }
        });
        return unique;
    },
    notSpecWord: function (attrs) {
        var result = true;
        _.each(window.specialNames, function (item) {
            if (attrs.Name.toLowerCase() === item.toLowerCase()) {
                result = false;
            }
        });
        return result;
    },
    handleErrors: function (model, error) {
        var errors = {};
        model = model || {};
        if (error && error.statusText === undefined) {
            errors = error;
        } else {
            errors.errors_cf = error.statusText;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, null, null, this.$el);
        Utility.toggleInputButtons(this.buttonsSelector, true);
    },
    kill: function (e, override, cleanup) {
        var that = this,
            id = this.$("select[name='Id']").val(),
            model = window.customFieldMetas.get(id);
        var headers = override ? { "ds-options": Constants.sro.OverrideErrors } : undefined;
        if (id !== Constants.c.emptyGuid) {
            var sf = function (result) {
                window.databaseFields.remove(model.get('Id'));
                that.clearDirty();
                window.customFieldMetas.remove(model);
                Utility.executeCallback(cleanup);
            };
            var ff = function (jqXHR, textStatus, errorThrown) {
                if (errorThrown && errorThrown.Type && errorThrown.Type.match('OverridableException')) {
                    var searchIds = [];
                    if (errorThrown.Data) {
                        var errData = errorThrown.Data;
                        errData = errData.split('\r\n');
                        var dataLen = errData.length;
                        var j;
                        for (j = 0; j < dataLen; j++) {
                            var datum = errData[j].split(':'); // searchId and name are separated by a ':'
                            var id = datum[0];  // Obtain searchId
                            if (id) {
                                searchIds.push(id);
                            }
                        }
                    }
                    DialogsUtil.generalPromptDialog(errorThrown.Message + '\n\n' + Constants.c.continueYesNo, function (cleanup) {
                        id = model.get('Id');
                        var i;
                        var length = searchIds.length;
                        var savedSearches = [];
                        for (i = 0; i < length; i++) {
                            var savedSearch = window.savedSearches.get(searchIds[i]);
                            if (savedSearch) {
                                savedSearches.push(savedSearch);
                            }
                        }
                        var cf = function () {
                            // Update corresponding content type related/default fields
                            var idx = 0;
                            var ctLen = window.contentTypes.length;
                            for (idx; idx < ctLen; idx++) {
                                var ct = window.contentTypes.at(idx);
                                var cfIdx = 0;
                                var rcfs = ct.get('RelatedCustomFields');
                                var cfLen = rcfs ? rcfs.length : 0;
                                for (cfIdx; cfIdx < cfLen; cfIdx++) {
                                    var rf = rcfs[cfIdx];
                                    if (rf.CustomFieldMetaID === id) {
                                        rcfs.splice(cfIdx, 1);
                                        break;
                                    }
                                }
                                var dcfs = ct.get('DefaultCustomFields');
                                cfLen = dcfs ? dcfs.length : 0;
                                for (cfIdx = 0; cfIdx < cfLen; cfIdx++) {
                                    var df = dcfs[cfIdx];
                                    if (df.CustomFieldMetaID === id) {
                                        dcfs.splice(cfIdx, 1);
                                        break;
                                    }
                                }
                            }
                            // Update saved searches, using exception data
                            var length = savedSearches.length;
                            var silent = true;
                            for (i = 0; i < length; i++) {
                                if (i === length - 1) {
                                    silent = false;
                                }
                                window.savedSearches.remove(savedSearches[i], { silent: silent });
                            }
                            cleanup();
                        };
                        that.kill(e, true, cf);
                    }, null, { okText: Constants.c.yes, closeText: Constants.c.no });
                }
                else {
                    if (errorThrown && errorThrown.Message !== "") {
                        that.handleErrors(model, errorThrown.Message);
                    }
                    Utility.executeCallback(cleanup);
                }
            };
            model.destroy({ success: sf, failure: ff, headers: headers, wait: true, raiseOverridableException: true });
        }
        else {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            ErrorHandler.addErrors({ errors_cf: Constants.c.cf_deleteNew }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
    },
    updateView: function () {
        this.viewData.selected = undefined;
        this.render();
    },
    removeFieldFromGroupTemplates: function (model) {
        var cfmId = model.get("Id");
        var listcfgs = window.customFieldMetaGroupPackages;
        var idx = 0;
        var length = listcfgs.length;
        for (idx; idx < length; idx++) {
            var cfgPkg = listcfgs.at(idx);
            if (cfgPkg) {
                var cfg = cfgPkg.get('CustomFieldGroupTemplates');
                var i = 0;
                var cflength = cfg.length;
                for (i; i < cflength; i++) {
                    if (cfg[i].CustomFieldMetaId === cfmId) {
                        cfg.splice(i, 1);
                        break;
                    }
                }
            }
        }
    },
    validateName: function (name) {
        if (!$.trim(name)) {
            return 'isEmpty';
        }
        if ($.trim(name) === Constants.c.newTitle) {
            return 'isNew';
        }
        if (name.length > 256) {
            return 'tooLong';
        }
        return 'true';
    },
    changeText: function () {
        var that = this;
        Navigation.stopNavigationCallback = false;
        Navigation.onNavigationCallback = function () {
            if (that.isDirty()) {
                if (confirm(Constants.t('confirmSave'))) {
                    var name = that.$("input[name='Name']").val();
                    var isNameValid = that.validateName(name);
                    if (isNameValid === 'true') {
                        that.saveChanges();
                    } else {
                        if (isNameValid === 'isEmpty') {
                            ErrorHandler.addErrors(Constants.c.nameEmptyWarning);
                        }
                        if (isNameValid === 'isNew') {
                            ErrorHandler.addErrors(String.format(Constants.c.newNameWarning, Constants.t('newTitle')));
                        }
                        if (isNameValid === 'tooLong') {
                            ErrorHandler.addErrors(Constants.c.nameTooLong);
                        }

                    }
                }
            }
        };
        this.setDirty();
        this.toggleSaveButtons();
    },
    close: function () {
        DialogsUtil.isDialogInstanceDestroyDialog(this.$dialog);
        this.unbind();
        this.remove();
    },
    setDirty: function () {
        this.dirty = true;
    },
    clearDirty: function () {
        this.dirty = false;
    },
    isDirty: function () {
        return this.dirty;
    },
    toggleSaveButtons: function () {
        if (this.isDirty()) {
            Utility.toggleInputButtons(this.saveButtonSelector, true);

        } else {
            Utility.toggleInputButtons(this.saveButtonSelector, false);
        }
    }
});
