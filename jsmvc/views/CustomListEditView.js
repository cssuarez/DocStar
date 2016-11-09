/// <reference path="../../Content/LibsExternal/a_jquery.js" />
// View for editing BuzzSpaces
// Renders a compiled template using doU.js
var CustomListEditView = Backbone.View.extend({
    viewData: {},
    dirty: false,
    buttonSelectors: '#save_cl',
    events: {
        "change select[name='customLists']": "changeSelection",
        "click input[name='listName']": "clickName",
        "click input[name='save_cl']": "saveChanges",
        "click input[name='delete_cl']": "kill",
        "change input[name='listName']": "changeText",
        "keyup input[name='listName']": "changeText",
        "click input[type='checkbox']": "clickCheckbox",
        "change #clist_txtarea": "changeText",
        "keyup #clist_txtarea": "changeText"
    },
    //new class is fetched from the controller
    //first element in the list is an empty buzz space
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(window.customLists);
        return this;
    },
    clickName: function () {
        if ($("select[name='customLists']").val() === Constants.c.emptyGuid) {
            if ($("input[name='listName']").val().toLowerCase() === Constants.c.newTitle.toLowerCase()) {
                $("input[name='listName']").val("");
            }
        }
        else {
            this.$("input[name='listName']").focus().select();
        }
    },
    clickCheckbox:function(){
        var id = this.$("select[name='customLists']").val();
        if (id !== Constants.c.emptyGuid) {
            this.changeText();
        }
    },
    changeSelection: function () {
        var id = this.$("select[name='customLists']").val();

        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        }
        else {
            var model = window.customLists.get(id);
            this.viewData.selected = model;
        }
        this.clearDirty();
        this.render();
    },
    getByName: function (name) {
        return window.customLists.find(function (cl) { return cl.get("Name") === name; });
    },
    handleKeyPress: function (event) {
        if (event.keyCode === 13) {
            this.saveChanges();
        }
    },
    fillAttrs: function () {
        var attrs = {};
        attrs.Name = $.trim($('input[name="listName"]').val());
        attrs.ReadOnly = $('input[name="readOnly"]').is(':checked');
        attrs.SortList = $('input[name="sortList"]').is(':checked');
        attrs.Items = $('textarea[name="items"]').val().split('\n');
        attrs.Id = $("select[name='customLists']").val();
        var i;
        for (i = 0; i < attrs.Items.length; i++) {
            if ($.trim(attrs.Items[i]) === "") {
                attrs.Items[i] = "&nbsp;";
            }
        }
        return attrs;
    },
    changeText: function () {
        if ($.trim($('input[name="listName"]').val()) === Constants.c.newTitle) {
            return;
        }
        var that = this;
        Navigation.stopNavigationCallback = false;
        Navigation.onNavigationCallback = function () {
            if (that.isDirty()) {
                if (confirm(Constants.t('confirmSave'))) {
                    that.saveChanges();
                }
            }
        };
        this.setDirty();
        this.toggleSaveButtons();
    },
    saveChanges: function () {
        var that = this;
        var buttonSelectors = this.buttonSelectors;
        //clear errors ErrorHandler
        this.toggleSaveButtons();
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var errorHandler = this.handleErrors;
        var newClass = new CustomList();
        var attrs = this.fillAttrs();
        var options = {
            success: function (model) {
                that.saveSuccess(model, { status: 'ok' }, attrs.Id, window.customLists, that, undefined);
                that.$("select[name='customLists']").val(Constants.c.emptyGuid);
                that.toggleSaveButtons();
                that.changeSelection();
                //Bug 9125, Triggering search when no prior results were in place, this was due Bug 5974 which as later reverted.
                //$('body').trigger('MassDocumentUpdated');
                $('body').trigger('refreshMeta'); 
                that.clearDirty();
            },
            failure: function (xhr, status, err) {
                ErrorHandler.addErrors({ 'errors_cl': err.Message });
            },
            silent: true
        };

        if (!newClass.save(attrs, options)) {
            Utility.toggleInputButtons(buttonSelectors, true);
            ErrorHandler.addErrors(newClass.validationError);
        }

    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (model, error) {
        ErrorHandler.addErrors(error, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        this.dirty = false;
        Utility.toggleInputButtons(this.buttonsSelector, true);        
    },
    kill: function (e) {
        //clear errors first
        var buttonSelectors = '#delete_cl';
        var that = this;
        Utility.toggleInputButtons(buttonSelectors, false);
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var id = $('select[name="customLists"]').val(),
            okText = Constants.c.ok,
            closeText = Constants.c.close,
            deleteListDialog;
        if (id !== Constants.c.emptyGuid) {
            var model = window.customLists.get(id);
            $('#delete_list').dialog({
                autoOpen: false,
                title: Constants.c.deleteList,
                width: 440,
                minWidth: 400,
                maxWidth: $(window).width(),
                height: 150,
                minHeight: 150,
                maxHeight: $(window).height(),
                modal: true,
                close: function () {
                    Utility.toggleInputButtons(buttonSelectors, true);
                },
                buttons: [{
                    text: okText,
                    click: function () {
                        deleteListDialog = this;
                        Utility.disableButtons([okText, closeText]);
                        var name = model.get('Name');
                        var success = function (result) {                          
                            var customFieldsMetas = window.customFieldMetas.where({ ListName: name });
                            if (customFieldsMetas !== undefined && customFieldsMetas.length > 0) {
                                var cfLength = customFieldsMetas.length;
                                var i = 0;
                                for (i; i < cfLength; i++) {
                                    var cfm = customFieldsMetas[0];
                                    cfmId = cfm.get("Id");
                                    cfm.set({ "Type": Constants.ty.String, ListName: null }, { "silent": true });
                                }
                            }
                            // Remove custom list references from content type models (already done so server side when deleting the custom list)
                            var ctlength = window.contentTypes.length;
                            var j = 0;
                            for (j; j < ctlength; j++) {
                                var ctModel = window.contentTypes.at(j);
                                var dcfs = [];
                                if (ctModel.has("DefaultCustomFields")) {
                                    var dcf = ctModel.get("DefaultCustomFields");
                                    var dcfLength = dcf.length;
                                    var k = 0;
                                    for (k; k < dcfLength; k++) {
                                        if (dcf[k].ListName === name) {
                                            dcf[k].ListName = null;
                                        }
                                        dcfs.push(dcf[k]);
                                    }
                                    ctModel.set({ "DefaultCustomFields": dcfs });
                                }
                            }
                            that.clearDirty();
                            that.toggleSaveButtons();
                        };
                        var failure = function (xhr, status, err) {
                            var obj = { 'errors_cl': err.Message };
                            ErrorHandler.addErrors(obj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                        };
                        var complete = function () {
                            Utility.enableButtons([okText, closeText]);
                            var $dlg = $(deleteListDialog);
                            var btnLabels = DialogsUtil.getButtonLabels($dlg);
                            DialogsUtil.cleanupDialog($dlg, btnLabels, false);
                        };
                        model.destroy({ success: success, failure: failure, complete: complete });
                    }
                },
                {
                    text: closeText,
                    click: function () {                                                
                        $(this).dialog('close');
                    }
                }]
            });
            $('#delete_list').dialog('open');
        }
        else {
            var obj = {
                'errors_cl': Constants.c.cannotDeleteNewCustomList
            };
            Utility.toggleInputButtons(buttonSelectors, true);
            ErrorHandler.addErrors(obj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('customlistlayout'));
        return this;
    },

    render: function () {
        // Refresh viewData.list
        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }
        var newClass = window.customLists.get(Constants.c.emptyGuid);
        if (!newClass) {
            newClass = new CustomList({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle, Item: [], ReadOnly: true });
            window.customLists.add(window.customLists.parse(newClass), { silent: true });
        }
        this.viewData.list = window.customLists;
        var listScrollTop = $(this.el).find("[name=customLists]").scrollTop();
        $(this.el).html(this.compiledTemplate(this.viewData));
        $(this.el).find("[name=customLists]").scrollTop(listScrollTop);
        Navigation.stopNavigationCallback = true;
        Navigation.onNavigationCallback = undefined;
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);

        return this;
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
            Utility.toggleInputButtons(this.buttonSelectors, true);

        } else {
            Utility.toggleInputButtons(this.buttonSelectors, false);
        }
    }
});
