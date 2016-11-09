/// <reference path="../../Content/LibsInternal/Utility.js" />
/// <reference path="../../Content/JSProxy/ContentTypeServiceProxy.js" />
// View for editing ContentTypes
// Renders a compiled template using doU.js
var ContentTypeEditView = Backbone.View.extend({
    viewData: {},
    proxy: ContentTypeServiceProxy(),
    ctDefaultsView: {},
    ctFieldView: {},
    ctSecurityView: {},
    events: {
        "click input[name='Name']": "clickName",
        "click input[name='save_ct']": "saveChanges",
        "click input[name='delete_ct']": "kill",
        "change input[name='Name']": "changeText",
        "change select[name='SyncActionId']": "changeText",
        "change input[name='SyncActionPreference']": "changeText",
        "change select[name='DefaultSecurityClassId']": "checkPermissions",
        "change select[name='DefaultWorkflowId']": "changeText",
        "change select[name='DefaultRecordCategoryId']": "changeText",
        "change select[name='DefaultInboxId']": "changeText",
        "change select[name='securityClass']": "changeText",
        "change input[name='DefaultFolderName']": "changeText",
        "change input[name='RelateOn']": "changeText",
        "change #evenPerms div input[type='checkbox']": "changeText",
        "change input.showDCheckbox": "changeText",
        "change input.showRCheckbox": "changeText",
        "change #users select": "changeText",
        "change #groups select": "changeText",
        "mousewheel": "closeAutocomplete"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editcontenttypelayout'));
        return this;
    },
    render: function (syncActionId) {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        // Render Content Type Defaults
        if (this.ctDefaultsView && this.ctDefaultsView.close) {
            this.ctDefaultsView.close();
        }
        this.ctDefaultsView = new ContentTypeDefaultsView({ selected: this.viewData.selected });
        this.$el.find('.contentTypeDTO .adminMetaWidth').append(this.ctDefaultsView.render());
        // Render Content Type Fields
        if (this.ctFieldView && this.ctFieldView.close) {
            this.ctFieldView.close();
        }
        this.ctFieldView = new ContentTypeFieldView({ selected: this.viewData.selected });
        this.$el.find('.contentTypeDTO').append(this.ctFieldView.render());
        // Render Content Type Security
        if (this.ctSecurityView && this.ctSecurityView.close) {
            this.ctSecurityView.close();
        }
        this.ctSecurityView = new ContentTypeSecurityView({ selected: this.viewData.selected });
        this.$el.find('#ct_perm').append(this.ctSecurityView.render());
        this.$el.find('select[name="Name"]').combobox();
        var that = this;
        this.$el.find('.isCombo').autocomplete({
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
        this.$el.find('input[name="Name"]').focus().select();
        if (this.$el.find("input[name='Name']").val() === Constants.c.newTitle) {
            this.$el.find("input[name='delete_ct']").prop("disabled", true);
        } else {
            this.$el.find("input[name='delete_ct']").prop("disabled", false);
        }
        Navigation.onNavigationCallback = undefined;
        Navigation.stopNavigationCallback = true;
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        return this;
    },
    getRenderObject: function () {
        var ro = {};
        var newCT = new ContentType({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle, SyncActionPreference: Constants.sap.SyncAndSave });
        ro.listct = new ContentTypes(window.contentTypes.toJSON()).getNewList(newCT);
        ro.listsc = window.securityClasses;
        ro.selected = this.viewData.selected;
        if (!ro.selected) {
            ro.selected = this.setNewClass(ro.listct);
        }
        return ro;
    },
    setNewClass: function (listct) {
        return this.getNewClass(listct);
    },
    //#region Error Handling / Validation
    // TODO: modify checkPermissions to function properly
    checkPermissions: function () {
        // making save  button visible and clearing errors, just for not to repeate code in if-statements in future
        $('input[name="save_ct"]').removeAttr('disabled');
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);

        var contentTypeId = this.$("select[name='Name']").val();
        //content type is not new, we modify an existing one
        if (contentTypeId !== Constants.c.emptyGuid) {
            //get current user
            var currentUser = $('#currentUser').val();
            var currentId;
            if (currentUser) {
                currentId = JSON.parse(currentUser).Id;
            }
            var securityClassId = $("select[name=DefaultSecurityClassId]").val();
            // get selected security class
            var securityClass = $.grep(window.securityClasses.models, function (e) { return e.id === securityClassId; });
            if (securityClass[0]) {
                //get all permissions
                var permissions = securityClass[0].attributes.Permissions;
                $.each(permissions, function (key, value) {
                    if (currentId === value.UserId) {
                        //if current user dont have permission to modify content types
                        var state = Utility.checkSP(value.PermissionLevel, Constants.sp.Modify);
                        if (!state) {
                            //user cant modify this content type
                            $('input[name="save_ct"]').attr('disabled', 'disabled');
                            ErrorHandler.addErrors({ 'save_ct': Constants.c.noModifyContentType }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                        }
                    }
                });
            }
            this.changeText();
        }
    },
    /*
    * isUnique check the new against the existing.  do not allow same names on two contentTypes
    * if there is an update and the guid is the same then it is considered unique...
    * @return boolean
    */
    isUnique: function (contentType) {
        var unique = true;
        var i = 0;
        var length = this.viewData.listct.length;
        for (i = 0; i < length; i++) {
            var ct = this.viewData.listct.at(i);
            if ($.trim(contentType.Name.toLowerCase()) === $.trim(ct.get('Name').toLowerCase())) {
                if (contentType.Id !== ct.get('Id')) {
                    unique = false;
                    break;
                }
            }
        }
        return unique;
    },
    errorHelper: function (reason) {
        this.$el.find('input[name=save_ct], input[name=delete_ct]').prop('disabled', false);
        this.$el.find('.ui-combobox:has(input[name="Name"])').parent('div.input').addClass('arrar').attr('name', 'Name');
        // Close autocomplete if an error occurred
        var $acInput = this.$el.find('.contentTypeDTO .isCombo');
        if ($acInput.autocomplete('instance')) {
            $acInput.autocomplete('close');
        }
        ErrorHandler.addErrors({ 'Name': reason }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, "div.input.arrar");
    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (model, errors, message) {
        if (!errors) {
            errors = {
                ct_Error: message
            };
        }
        else if (message) {
            errors.ct_Error = message;
        }
        if (errors.Name) {
            this.errorHelper(errors.Name);
            delete errors.Name;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    },
    //#endregion Error Handling / Validation

    //#region Events
    clickName: function () {
        if (this.$el.find("select[name='Id']").val() === Constants.c.emptyGuid) {
            if (this.$el.find("input[name='Name']").val() === Constants.c.newTitle) {
                this.$el.find("input[name='Name']").val("");
            }
        }
    },
    saveChanges: function () {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var attrs = this.ctDefaultsView.getSelectedData();
        attrs.Id = this.$el.find('select[name="Name"] :selected').val();
        attrs.Name = this.$el.find('input[name="Name"]').val();
        attrs.RelateOn = this.$el.find('input[name="RelateOn"]:checked').val();
        attrs.DefaultCustomFields = this.ctFieldView.getDefaultCustomFields();
        attrs.RelatedCustomFields = this.ctFieldView.getRelatedCustomFields();
        attrs.SecurityClassId = this.ctSecurityView.getSecurityClass();
        var perms = this.ctSecurityView.getPermissions();
        attrs.UserPermissions = perms.UserPermissions;
        attrs.RolePermissions = perms.RolePermissions;
        attrs.DefaultFolderId = attrs.DefaultFolderId === Constants.c.emptyGuid || !attrs.DefaultFolderId ? null : attrs.DefaultFolderId;
        attrs.DefaultFolderName = attrs.DefaultFolderName || null;
        attrs.DefaultInboxId = attrs.DefaultInboxId || null;
        attrs.DefaultRecordCategoryId = attrs.DefaultRecordCategoryId || null;
        attrs.DefaultSecurityClassId = attrs.DefaultSecurityClassId || null;
        attrs.DefaultWorkflowId = attrs.DefaultWorkflowId || null;
        attrs.SyncActionId = attrs.SyncActionId || null;
        attrs.DisplayMask = null;   // Always set to null, so a save here doesn't clear the display mask that may already exist for the content type
        var clearAttrs = {
            CreatedOn: undefined
        };
        this.viewData.selected.set(clearAttrs);
        var isNameValid = this.isNameValid(attrs.Name);
        if (isNameValid !== 'true') {
            if (isNameValid === 'isEmpty') {
                this.errorHelper(Constants.c.nameEmptyWarning);
                return false;
            }
            if (isNameValid === 'isNew') {
                this.errorHelper(String.format(Constants.c.newNameWarning, Constants.t('newTitle')));
                return false;
            }
            if (isNameValid === 'tooLong') {
                this.errorHelper(Constants.c.nameTooLong);
                return false;
            }
        }
        else {
            var $saveDeleteButtons = this.$el.find('input[name=save_ct], input[name=delete_ct]');
            $saveDeleteButtons.prop('disabled', true);
            this.viewData.selected.on('invalid', function (model, error) {
                that.handleErrors(model, error);
            });
            this.viewData.selected.save(attrs, {
                success: function (model, result) {
                    model.set('id', result.Id);
                    var isSuccess = that.saveSuccess(model, result, attrs.Id, window.contentTypes, that);
                    if (isSuccess) {
                        that.render();
                    }
                },
                failure: function (message) {
                    that.errorHelper(message);
                },
                complete: function () {
                    $saveDeleteButtons.prop('disabled', false);
                }
            });
        }
    },
    kill: function (e) {
        //do nothing if you try and delete -- New --
        if (this.viewData.selected.get('Id') === Constants.c.emptyGuid) {
            return;
        }
        if (window.contentTypes.length < 2) {
            ErrorHandler.addErrors(Constants.c.contentTypeMinimumError);
            return;
        }
        //clear errors first
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        this.replaceContentType();
    },
    replaceContentType: function () {
        var that = this;
        $('#replace_ct .replace_text').text(this.viewData.selected.get('Name'));
        $('#replace_ct').dialog({
            autoOpen: false,
            width: 500,
            height: 200,
            resizable: false,
            modal: true,
            buttons: [
                {
                    text: Constants.c.ok,
                    click: function () {
                        var dialog = this;
                        var replacementId = $('#replace_ct select option:selected').val();
                        var id = that.$el.find('select[name="Name"]').val();
                        if (id && id !== Constants.c.emptyGuid) {
                            var model = that.viewData.listct.get(id);
                            var enableAndClose = Utility.disableButtons([Constants.c.ok, Constants.c.cancel], dialog);
                            var sf = function (result) {
                                that.viewData.listct.remove(model);
                                window.contentTypes.remove(model, { replacementId: replacementId });
                                $('body').trigger('MassDocumentUpdated');
                            };
                            var ff = function (message) {
                                that.handleErrors(model, undefined, message);
                            };
                            var cf = function () {
                                enableAndClose();
                            };
                            model.destroy({
                                ReplacementId: replacementId,
                                success: sf,
                                failure: ff,
                                complete: cf
                            });
                        }
                        else {
                            ErrorHandler.addErrors(Constants.c.cannotDeleteNew, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
                        }
                    }
                },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        $(this).dialog('close');
                        return;
                    }
                }
            ]
        });
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
    handleKeyPress: function (event) {
        if (event.keyCode === 13) {
            this.saveChanges();
        }
    },
    changeSelection: function (event, selection) {
        var id = $(selection).val();
        if (id === Constants.c.emptyGuid) {
            this.viewData.selected = this.setNewClass(this.viewData.listct);
        }
        else {
            var model = this.viewData.listct.get(id);
            this.viewData.selected = model;
        }
        this.render();
    },
    closeAutocomplete: function () {
        var $acInput = this.$el.find("input.ui-autocomplete-input");
        if ($acInput.autocomplete('instance')) {
            $acInput.autocomplete("close");
        }

    },
    changeText: function () {
        var that = this;
        var attrs = DTO.getDTOCombo(".contentTypeDTO", undefined, false);
        Navigation.stopNavigationCallback = false;
        Navigation.onNavigationCallback = function () {
            if (confirm(Constants.t('confirmSave'))) {
                var isNameValid = that.isNameValid(attrs.Name);
                if (isNameValid !== 'true') {
                    if (isNameValid === 'isEmpty') {
                        ErrorHandler.addErrors(Constants.c.nameEmptyWarning);
                    }
                    if (isNameValid === 'isNew') {
                        ErrorHandler.addErrors(String.format(Constants.c.newNameWarning, Constants.t('newTitle')));
                    }
                    if (isNameValid === 'tooLong') {
                        ErrorHandler.addErrors(Constants.c.nameTooLong);
                    }
                } else {
                    that.saveChanges();
                }
            }
        };
    }
    //#endregion Events
});