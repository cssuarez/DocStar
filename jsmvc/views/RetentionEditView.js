/// Do not use this view as a template for future views, there are no admin pages that do it 100% correct at this point but this one does it 100% incorrect.
/// TODO: Direct to server calls for models, move logic into models, save and delete operation should work on the model itself not a new instantiation of the model.
var RetentionEditView = Backbone.View.extend({
    viewData: {},
    prevFolder: {},
    events: {
        "change select[name='Id']": "changeSelection",
        "click input[name='save_rc']": "saveChanges",
        "click input[name='delete_rc']": "kill",
        "click input[name='dt']": "updateFolder",
        "click input[name='d_folder']": "openSelectFolder",
        "change select[name='DispositionType']": "changeDispositionType",
        "focus input[name='Name']": "changeNameToolTip",
        "focusout input[name='Name']": "changeBackNameToolTip"
    },
    changeNameToolTip: function () {
        if (this.$el.find("input[name='Name']").val() === Constants.c.newTitle) {
            this.$el.find("input[name='Name']").val('');
        }
    },
    changeBackNameToolTip: function () {
        if (this.$el.find("input[name='Name']").val() === '') {
            this.$el.find("input[name='Name']").val(Constants.c.newTitle);
        }
    },
    changeDispositionType: function () {
        if (this.$el.find("select[name = 'DispositionType']").val() === "0") {
            $('#time_datefield').show();
        } else {
            $('#time_datefield').hide();
        }
    },
    openSelectFolder: function () {
        this.prevFolder.Id = this.$el.find('input[name="DispositionFolderId"]').val();
        this.prevFolder.Title = this.$el.find('input[name="d_folder"]').val();
        // Dialogs util folder selection pass in this to set prevFolder.Id and prevFolder.Title
        DialogsUtil.folderSelection(false, false, '', this.openFolderCallback, this, { singleSelect: true });
    },
    openFolderCallback: function (btnText, uiState, foldId, foldTitle, foldPath) {
        var df = 'input[name="d_folder"]';
        var dfid = 'input[name="DispositionFolderId"]';
        switch (btnText) {
            case Constants.c.ok:
                if (foldId !== 'Root') {
                    $(df).val(foldTitle);
                    $(dfid).val(foldId);
                }
                break;
            case Constants.c.clear:
                $(df).val('');
                $(dfid).val(Constants.c.emptyGuid);
                uiState.prevFolder.Id = null;
                uiState.prevFolder.Title = null;
                break;
            case Constants.c.cancel:
                if (uiState.prevFolder.Id && uiState.prevFolder.Title) {
                    $(df).val(uiState.prevFolder.Title);
                    $(dfid).val(uiState.prevFolder.Id);
                }
                else {
                    $(df).val('');
                    $(dfid).val(Constants.c.emptyGuid);
                }
                break;
            default:
        }
    },
    updateFolder: function () {
        if ($('input[name="dt"]:checked').val() === 'delete') {
            $('#disposition_folder').hide();
        } else {
            $('#disposition_folder').show();
        }
    },
    //new class is fetched from the controller
    //first element in the list is an empty user
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(window.recordcategories);
        return this;
    },

    changeSelection: function () {
        var id = this.$("select[name='Id']").val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        }
        else {
            this.viewData.selected = window.recordcategories.get(id);
        }
        this.render();
    },
    isValidEmailAddress: function (emailAddress) {
        var pattern = new RegExp(/^(("[\w-+\s]+")|([\w-+]+(?:\.[\w-+]+)*)|("[\w-+\s]+")([\w-+]+(?:\.[\w-+]+)*))(@((?:[\w-+]+\.)*\w[\w-+]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][\d]\.|1[\d]{2}\.|[\d]{1,2}\.))((25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\.){2}(25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\]?$)/i);
        return pattern.test(emailAddress);
    },
    handleKeyPress: function (event) {

        if (event.keyCode === 13) {
            this.saveChanges();
        }

    },
    saveChanges: function () {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        $('#retention_errors').text('');
        //if delete is selected clear out the DispositionFolderId and d_folder
        if ($('input[name="dt"]:checked').val() === 'delete') {
            $('input[name="d_folder"],input[name="DispositionFolderId"]').val('');
        }
        var newClass = new RecordCategory();
        var attrs = DTO.getDTO(this.el);
        if (attrs.Id === Constants.c.emptyGuid) {
            delete attrs.Id;
        }
        var e = newClass.validate(attrs);
        if (e) {
            this.handleErrors(e);
            return;
        }
        if (this.isUnique(attrs)) {
            $('input[name="save_rc"],input[name="delete_rc"]').attr('disabled', 'disabled');
            newClass.save(attrs, {
                success: function (result, response) {
                    if (response.status === 'ok') {
                        $('input[name="save_rc"], input[name="delete_rc"]').removeAttr('disabled');
                        that.saveSuccess(result, response, attrs.Id, window.recordcategories, that, '#ui_message_exception');
                        if (that.isNew(attrs.Id)) {
                            window.slimRecordCategories.add({ Id: result.get('Id'), Name: result.get('Name'), EffectivePermissions: 0 });
                        } else {
                            window.slimRecordCategories.get(result.get('Id')).attributes.Name = result.get('Name');
                        }
                        $('body').trigger('MassDocumentUpdated');
                    } else {
                        that.handleErrors(response.message);
                        $('input[name="save_rc"], input[name="delete_rc"]').removeAttr('disabled');
                    }
                },
                error: function (model, error) {
                    $('input[name="save_rc"], input[name="delete_rc"]').removeAttr('disabled');
                    that.handleErrors(error);
                }
            });
        } else {
            ErrorHandler.addErrors({ 'Name': Constants.c.duplicateNameError }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
    },
    /*
    * isUnique check the new against the existing.  
    * if there is an update to the contents and the guid is the same then it is considered unique...
    * @param attrs which contains the Id and Title
    * @return boolean
    */
    isUnique: function (attrs) {
        var unique = true;
        window.recordcategories.each(function (item) {
            if (attrs.Name.toLowerCase() === item.get('Name').toLowerCase()) {
                if (attrs.Id === Constants.c.newGuid && attrs.Id !== item.get('Id')) {
                    unique = false;
                }
            }
        });
        return unique;
    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (error) {
        ErrorHandler.addErrors(error, css.warningErrorClass, "div", css.inputErrorClass, '');
    },
    kill: function (e) {
        //clear errors first
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var id = $('select[name="Id"]').val();
        if (id !== Constants.c.emptyGuid) {

            var model = window.recordcategories.get(id);
            $('input[name="save_rc"],input[name="delete_rc"]').attr('disabled', 'disabled');
            //$('input[name="delete_c"]').attr('disabled', 'disabled');

            // HttpDelete won't send an Id to our Api method (on some browsers?)
            // so make a post to a delete method
            $.ajax({
                url: Constants.Url_Base + 'RecordsManagement/DeleteRecordCategory',
                data: { "Id": id },
                type: "post",
                success: function (response) {
                    $('input[name="save_rc"],input[name="delete_rc"]').removeAttr('disabled');
                    //$('input[name="delete_rc"]').removeAttr('disabled');
                    if (response.status === 'ok') {
                        window.recordcategories.remove(model);
                        window.slimRecordCategories.remove(id);
                        $('body').trigger('MassDocumentUpdated');
                    } else {
                        ErrorHandler.addErrors({ 'delete_rc': response.message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    }
                }
            });
        } else {
            var obj = {
                'Id': Constants.t('cannotDeleteNew')
            };
            ErrorHandler.addErrors(obj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
        }
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editretentioncategories'));
        $('#ui_message_exception').dialog({
            autoOpen: false,
            resizable: false,
            modal: true,
            title: Constants.c.recordsRetentionFreezes,
            width: 'auto',
            buttons: [{
                text: Constants.c.close,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
        return this;
    },
    render: function () {

        // Refresh viewData.list
        this.viewData.listcc = window.recordcategoriesCC;
        this.viewData.listrcs = window.recordcategories;
        this.viewData.listsc = window.securityClasses;
        this.viewData.listcf = window.customFieldMetas;

        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }

        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);

        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        //$('input[name="Username"]').focus().select();
        $('input[name="RetentionMonths"]').numeric({ decimal: false, negative: false });
        return this;
    }
});
