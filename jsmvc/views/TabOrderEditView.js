/// <reference path="../../Content/LibsInternal/Utility.js" />
var TabOrderEditView = Backbone.View.extend({
    model: undefined,   // Content Type
    firstTimeRendering: true,
    isDirty: false, // Keep track of changes made to content type
    $dialog: undefined, // Dialog Selector in which the this was rendered
    viewData: {},
    className: 'ContentTypeBuilderEditView ctbContentTypeData contentTypeDTO',
    events: {},
    ctbFieldSettingsView: {},

    //#region View Rendering
    initialize: function (options) {
        options = options || {};
        this.options = options;
        var that = this;
        this.dialogOptions = $.extend({}, { height: 550, minHeight: 550 }, this.options.dialogOptions);
        this.dialogCallbacks = $.extend({
            getDialogMaxHeight: function () {
                return $(window).height();
            }
        }, this.options.dialogCallbacks);
        this.compiledTemplate = doT.template(Templates.get('taborderlayout'));
        this.$el.on('ctbFullyRendered', function () {
            if (that.$el.find('#contentTypeBuilderTab').hasClass('ui-state-active')) {
                that.resize();
            }
        });
        this.$el.on('ctbDisplayFieldsChanged', function () {
            that.resize();
        });
        return this;
    },
    getRenderObject: function () {
        var ro = {};
        ro.canView = true;
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
            that.renderCTBFields();
            if (!that.$dialog) {
                that.renderDialog();
            }
            else {
                that.$dialog.dialog('open');
            }
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
            that.updateTabIndex();
            var saveCleanup = function () {
                that.exit();
                Utility.executeCallback(cleanup);
            };
            Utility.executeCallback(saveCallback, saveCleanup, saveCleanup);
        };
        var cancelFunc = function (cleanup) {
            var closeFunc = function (cleanupDirtyPrompt) {
                that.exit();
                Utility.executeCallback(cleanup);
                Utility.executeCallback(cleanupDirtyPrompt);
            };
            if (that.getDirty()) {
                var opts = {
                    resizable: false
                };
                DialogsUtil.generalPromptDialog(Constants.c.unsavedChangesAlert, closeFunc);
            }
            else {
                closeFunc();
            }
        };
        var diagOpts = {
            title: Constants.c.tabOrderEditor + '<a style="display: none;" class="ui-dialog-titlebar-expand ui-corner-all"><span class="ui-icon ui-icon-triangle-1-s"></span></a>',
            okText: Constants.c.ok,
            maxWidth: 600,
            minWidth: 425,
            width: 425,
            height: 500,
            maxHeight: this.dialogCallbacks.getDialogMaxHeight(),
            minHeight: 400,
            autoOpen: false,
            html: this.$el,
            buttons: [{
                text: Constants.c.reset,
                click: function (cleanup) {
                    var resetCallback = function () {
                        Utility.executeCallback(saveCallback, cleanup);
                    };
                    that.reset(resetCallback);
                    DialogsUtil.cleanupThrobber(that.$dialog);
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
                // Make the document image appear over the modal overlay
                var zIndex = $('.ui-dialog').has(that.$dialog).css('z-index');
                var intZIndex = parseInt(zIndex, 10);
                $('.ui-dialog').has(that.$dialog).css('z-index', (isNaN(intZIndex) ? zIndex : intZIndex) + 1);
            }
        };
        diagOpts = $.extend(diagOpts, this.dialogOptions);
        this.$dialog = DialogsUtil.generalPromptDialog('', okFunc, cancelFunc, diagOpts);
        this.$dialog.dialog('open');
    },
    exit: function () {
        this.clearDirty();
        this.close();
    },
    close: function () {
        if (this.ctbFieldSettingsView && this.ctbFieldSettingsView.close) {
            this.ctbFieldSettingsView.$el.unbind('ctbFullyRendered');
            this.ctbFieldSettingsView.close();
        }
        // Remove the before close definition for the dialog before attempting to close. - Bug 13305: http://pedro.docstar.com/b/show_bug.cgi?id=13305
        // Otherwise the dirty prompt dialog will display intermittently, and will cause the count for ShowHideUtil.toggleNativeViewer, to be incorrect
        // This would then cause the native viewer to be hidden after the dialog is properly closed.
        if (DialogsUtil.isDialogInstance(this.$dialog)) {
            this.$dialog.dialog('option', 'beforeClose', null);
        }
        DialogsUtil.isDialogInstanceClose(this.$dialog);
        DialogsUtil.isDialogInstanceDestroyDialog(this.$dialog);

        this.$el.unbind('ctbFullyRendered');
        this.$el.unbind('ctbDisplayFieldsChanged');
        this.unbind();
        this.remove();
    },
    renderCTBFields: function () {
        var that = this;
        if (this.ctbFieldSettingsView && this.ctbFieldSettingsView.close) {
            this.ctbFieldSettingsView.$el.unbind('ctbFullyRendered');
            this.ctbFieldSettingsView.close();
        }
        this.ctbFieldSettingsView = new TabOrderFieldSettingsView({elements: this.options.elements});
        var $html = that.ctbFieldSettingsView.render();
        $html.bind('ctbFullyRendered', function () {
            that.$el.find('.ctbFieldsContainer').append($html);
            that.$el.find('.throbber').hide();
            that.$el.find('> div').removeClass('visibilityHidden');
            if (that.$el.find('#contentTypeBuilderTab').hasClass('ui-state-active')) {
                that.resize();
            }
            that.$el.trigger('ctbFullyRendered');
        });
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
        $ctbFieldSettingsContainer.height(maxHeight+140);
        $ctbFieldSettingsContainer.css('max-height', maxHeight+140);
        this.ctbFieldSettingsView.resize();
    },
    updateTabIndex: function () {
        var that = this;
        var formElements = that.options.elements;
        var liDomElements = $(this.$el.find('ul')[1]).find('li:not("#' + Constants.c.emptyGuid + '")');

        var liLen = liDomElements.length;
        var cont = 100;
        var firstElement = true;

        for (idx = 0; idx < liLen; idx++) {
            var objLI = $(liDomElements[idx]);
            var objLIId = objLI.attr('id');
            var elem = formElements.get(objLIId);

            if (objLI.find('.showEyeIcon').length) {
                if (firstElement) {
                    elem.replaceAttributeValues({ autofocus: "autofocus" });
                    firstElement = false;
                }
                elem.replaceAttributeValues({ tabindex: cont });
                cont++;
            } else {
                elem.replaceAttributeValues({ tabindex: -1 });
            }
        }
    },

    reset: function (callback) {
        var reorderableFields = this.ctbFieldSettingsView.viewData.reorderableFields;
        var formElements = this.options.elements;
        //var len = formElements.length;
        var len = reorderableFields.length;

        for (idx = 0; idx < len; idx++) {
            //var element = formElements.at(idx);
            var element = formElements.get(reorderableFields[idx].value);
            element.replaceAttributeValues({ tabindex: '' });
        }
        Utility.executeCallback(callback);
        this.render();
    },
    //#endregion View Rendering

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