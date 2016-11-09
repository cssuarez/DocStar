/// <reference path="../JSProxy/AdminServiceProxy.js" />
var DialogsUtil = {
    /*
        Initialize a jQuery UI dialog with general jQuery UI dialog options passed in
        If a single option isn't passed in, set defaults or jQuery UI dialog defaults are used for that option
        @diagSel: css selector to create the dialog from
        @options: optional - a JSON object that contains optional jQuery UI dialog options and events
    */
    generalDialog: function (diagSel, options) {
        options = options || {};
        var defOptions = {
            title: options.title || '',
            minWidth: options.minWidth || 300,
            minHeight: options.minHeight || 200,
            maxWidth: options.maxWidth,
            maxHeight: options.maxHeight,
            width: options.width || 'auto',
            height: options.height || 'auto',
            modal: options.modal === false ? false : true,
            autoOpen: options.autoOpen === false ? false : true,
            draggable: options.draggable === false ? false : true,
            resizable: options.resizable === false ? false : true,
            open: options.open,
            beforeClose: options.beforeClose,
            close: options.close,
            resize: options.resize,
            buttons: options.buttons,
            position: options.position,
            closeOnEscape: false,
            closeOnEscapeCustom: true
        };
        options = $.extend(true, defOptions, options);
        var $dlg = $(diagSel);
        if (options.dlgClass) {
            $dlg.addClass(options.dlgClass);
        }
        $dlg.dialog(options);
        return $dlg;
    },
    /*
        Initialize a jQuery UI dialog with a singular Close button
        @diagSel: css selector to create the dialog from
        @options: a JSON object that contains optional jQuery UI dialog options and events
    */
    generalCloseDialog: function (diagSel, options) {
        if (!diagSel) {
            diagSel = $('#generalCloseDialog').clone().removeAttr('id');
        }
        diagSel = $(diagSel);   // Ensure the dialog selector is a jquery object
        options = options || {};
        if (!options.hideButton) {
            var btnLabels = [options.closeText || Constants.c.close];
            // Construct the close button for a jQuery UI dialog
            options.buttons = [{
                text: options.closeText || Constants.c.close,
                click: function () {
                    Utility.executeCallback(options.close);
                    DialogsUtil.cleanupDialog(diagSel, btnLabels);
                }
            }];
        }
        // Initialize the jQuery UI dialog with the created buttons object above
        DialogsUtil.generalDialogWithExtraMarkup(diagSel, options);
        return diagSel;
    },
    /*
        Initialize a jQuery UI dialog with an Ok and Cancel button
        @msg: message to prompt the user with,
        @okFunc: function to perform when user clicks ok (by default the dialog will just close if no @okFunc is passed)
        @cancelFunc: function to perform when user clicks cancel (by default the dialog will just close if no @cancelFunc is passed)
        @options: a JSON object that contains optional jQuery UI dialog options and events as well as optional markup to be added to the dialog
    */
    generalPromptDialog: function (msg, okFunc, cancelFunc, options) {
        options = options || {};
        var diagSel = $('#generalPromptDialog').clone().removeAttr('id');
        options.btnLabels = [options.okText || Constants.c.ok, options.closeText || Constants.c.cancel];
        options.msg = msg;
        var cleanupFull = function (keepOpen) {
            if (keepOpen === undefined) {
                keepOpen = false;
            }
            DialogsUtil.cleanupDialog(diagSel, options.btnLabels, keepOpen);
        };
        // So that clicking the 'X' on the dialog will perform the same action as the cancelFunc
        var closeFunc = function () {
            if (cancelFunc) {
                Utility.executeCallback(cancelFunc, cleanupFull);
            }
            else {
                cleanupFull();
            }
        };
        if (!options.close) {
            var beforeClose = options.beforeClose;
            options.beforeClose = function (event, ui) {
                if (beforeClose) {
                    beforeClose(event, ui);
                }
                closeFunc();
                return false;
            };
        }
        var promptButtons = [{
            text: options.okText || Constants.c.ok,
            click: function () {
                var $buttonPane = $('.ui-dialog ').has(diagSel).find('.ui-dialog-buttonpane');
                $buttonPane.find('.throbber').show();
                Utility.disableButtons(options.btnLabels);
                if (okFunc) {
                    Utility.executeCallback(okFunc, cleanupFull);
                }
                else {
                    cleanupFull();
                }
            }
        }, {
            text: options.closeText || Constants.c.cancel,
            click: closeFunc
        }];
        if (options.buttons) {
            var idx = 0;
            var length = options.buttons.length;
            var click = function (buttonClick) {
                return function () {
                    var $buttonPane = $('.ui-dialog ').has(diagSel).find('.ui-dialog-buttonpane');
                    $buttonPane.find('.throbber').show();
                    Utility.disableButtons(options.btnLabels);
                    Utility.executeCallback(buttonClick, cleanupFull);
                };
            };
            for (idx = 0; idx < length; idx++) {
                var buttonClick = options.buttons[idx].click;
                options.btnLabels.push(options.buttons[idx].text);
                options.buttons[idx].click = click(buttonClick);
            }
            // Prompt buttons are always to the right of the other 
            length = promptButtons.length;
            for (idx = 0; idx < length; idx++) {
                options.buttons.push(promptButtons[idx]);
            }
        }
        else {
            options.buttons = promptButtons;
        }
        // Initialize the jQuery UI dialog with the created buttons object above
        DialogsUtil.generalDialogWithExtraMarkup(diagSel, options);
        return diagSel;
    },
    generalSaveDirtyPromptDialog: function (msg, saveFunc, closeFunc, options) {
        options = options || {};
        var diagSel = $('#generalSaveDirtyPromptDialog');
        options.btnLabels = [options.saveText || Constants.c.save, options.doNotSaveText || Constants.c.doNotSave, options.closeText || Constants.c.cancel];
        options.displayCancelButton = options.displayCancelButton === false ? false : true; // Always display the cancel button unless the caller opts out of displaying it
        options.msg = msg;
        options.width = options.width || 240;
        options.height = options.height || 'auto';
        options.minHeight = options.minHeight || 150;
        var cleanupFull = function () {
            DialogsUtil.cleanupDialog(diagSel, options.btnLabels);
        };
        options.buttons = [{
            text: options.btnLabels[0], // Save
            click: function () {
                var $buttonPane = $('.ui-dialog ').has(diagSel).find('.ui-dialog-buttonpane');
                $buttonPane.find('.throbber').show();
                Utility.disableButtons(options.btnLabels);
                if (saveFunc) {
                    Utility.executeCallback(saveFunc, cleanupFull);
                }
                else {
                    cleanupFull();
                }
            }
        }, {
            text: options.btnLabels[1], // Don't Save
            click: function () {
                var $buttonPane = $('.ui-dialog ').has(diagSel).find('.ui-dialog-buttonpane');
                $buttonPane.find('.throbber').show();
                Utility.disableButtons(options.btnLabels);
                if (closeFunc) {
                    Utility.executeCallback(closeFunc, cleanupFull);
                }
                else {
                    cleanupFull();
                }
            }
        }];
        if (options.displayCancelButton) {
            options.buttons.push({
                text: options.btnLabels[2], // Cancel
                click: function () {
                    var $buttonPane = $('.ui-dialog ').has(diagSel).find('.ui-dialog-buttonpane');
                    $buttonPane.find('.throbber').show();
                    if (closeFunc) {
                        Utility.executeCallback(closeFunc, cleanupFull);
                    }
                    else {
                        cleanupFull();
                    }
                }
            });
        }
        // Initialize the jQuery UI dialog with the created buttons object above
        DialogsUtil.generalDialogWithExtraMarkup(diagSel, options);
        return diagSel;
    },
    generalSaveAsDialog: function (saveFunc, closeFunc, options) {
        options = options || {};
        var defaultOptions = {
            title: Constants.c.saveAs,
            width: 300,
            minWidth: 300,
            minHeight: 150,
            height: 150,
            resizable: false
        };
        options = $.extend(defaultOptions, options);
        var $dialog = $('#saveAsDialog').clone().removeAttr('id');
        var $span = $dialog.find('span');
        $span.text((options.inputLabel || Constants.c.name) + ':');
        options.html = $dialog.html();
        var passedOpen = options.open;
        options.open = function (event, ui) {
            if (passedOpen) {
                passedOpen(event, ui);
            }
            $dialog.find('input[type="hidden"]').remove();   // generalPromptDialog contains a hidden input - remove it for proper saveAs dialog error messaging
            var $input = $dialog.find('input');
            $input.val(options.inputValue || '');
            $input.attr('name', options.inputName || 'Name');
            $input.focus();
            var $textInputs = $input.filter('[type="text"]'); //Calling .select on non-text type inputs in IE 10 throws an exception.
            $textInputs.select();
        };
        options.autoOpen = false;
        $dialog = DialogsUtil.generalPromptDialog('', saveFunc, closeFunc, options);
        $dialog.on('dialogopen.keyup', function () {
            $dialog.on('keyup', 'input', function (ev) {
                if (ev.which === 13) {
                    var button = DialogsUtil.getButtonFromLabel($dialog, options.okText || Constants.c.ok);
                    if (button && button.click) {
                        button.click();
                    }
                }
            });
        });
        $dialog.on('dialogclose.keyup', function () {
            $dialog.off('dialogclose.keyup dialogopen.keyup');
            $dialog.off('keyup', 'input');
        });
        return $dialog;
    },
    generalDialogWithExtraMarkup: function (diagSel, options) {
        options = options || {};
        var msg = options.msg || '';
        var btnLabels = options.btnLabels;
        var passedClose = options.close;

        options.close = function (event, ui) {
            //Click events on buttons do not go through this method, only clicking the X on the dialog will.
            if (passedClose) {
                passedClose(event, ui);
            }
            DialogsUtil.cleanupDialog(diagSel, btnLabels);
        };
        var tmpOpen = options.open;
        options.open = function () {
            diagSel.children().show();
            var $pre = diagSel.find('pre');
            $pre.text(msg);
            if (msg) {
                $pre.show();
            }
            else {
                $pre.hide();
            }

            if (options.html) { // Allow the addition of html elements after the prompt message
                diagSel.find('.extraMarkup').empty();
                diagSel.find('.extraMarkup').append(options.html || '').show();
            }
            // Add a throbber to the dialogs button pane, to be displayed when clicking ok/save buttons or anything that requires a time to complete
            var throbber = document.createElement('span');
            Utility.setElementClass(throbber, 'throbber generalDialogThrobberPos');
            $(throbber).hide();
            var $buttonPane = $('.ui-dialog ').has(diagSel).find('.ui-dialog-buttonpane');
            $buttonPane.find('.ui-dialog-buttonset').prepend($(throbber));
            Utility.executeCallback(tmpOpen);
            var $input = diagSel.find('input').first();
            $input.val(options.inputValue || $input.val() || '');
            $input.focus();
            var $textInputs = $input.filter('[type="text"]'); //Calling .select on non-text type inputs in IE 10 throws an exception.
            $textInputs.select();
        };
        // Initialize the jQuery UI dialog with the created buttons object above
        DialogsUtil.generalDialog(diagSel, options);
        return diagSel;
    },
    cleanupDialog: function (diagSel, btnLabels, keepDialogOpen) {
        if (!btnLabels) {
            btnLabels = DialogsUtil.getButtonLabels(diagSel);
        }
        Utility.enableButtons(btnLabels);
        var $buttonPane = $('.ui-dialog ').has(diagSel).find('.ui-dialog-buttonpane');
        $buttonPane.find('.throbber').hide();
        if (keepDialogOpen) {
            return;
        }
        diagSel.find('.extraMarkup').empty().hide();
        var $pre = diagSel.find('pre');
        if ($pre) {
            $pre.text('');
        }
        // Clear beforeClose otherwise a stack overflow will occur, due to the dialog attempting to be closed infinitely
        if (DialogsUtil.isDialogInstance(diagSel)) {
            diagSel.dialog('option', 'beforeClose', null);
        }
        DialogsUtil.isDialogInstanceClose(diagSel);
        DialogsUtil.isDialogInstanceDestroyDialog(diagSel);
    },

    cleanupThrobber: function (diagSel, btnLabels, keepDialogOpen) {
        if (!btnLabels) {
            btnLabels = DialogsUtil.getButtonLabels(diagSel);
        }
        Utility.enableButtons(btnLabels);
        var $buttonPane = $('.ui-dialog ').has(diagSel).find('.ui-dialog-buttonpane');
        $buttonPane.find('.throbber').hide();
        if (keepDialogOpen) {
            return;
        }
    },

    generalLoadingDialog: function (options) {
        var html = $('<span></span>').addClass('loadingThrobber');
        options.html = html;
        return DialogsUtil.generalCloseDialog(null, options);
    },
    getButtonLabels: function ($dialog) {
        if (!DialogsUtil.isDialogInstance($dialog)) {
            return [];
        }
        var idx = 0;
        var btnLabels = [];
        var buttons = $dialog.dialog('option').buttons;
        var length = buttons.length;
        for (idx = 0; idx < length; idx++) {
            btnLabels.push(buttons[idx].text);
        }
        return btnLabels;
    },
    getButtonFromLabel: function ($dialog, buttonLabelText) {
        if (!DialogsUtil.isDialogInstance($dialog)) {
            return;
        }
        var idx = 0;
        var btnLabels = [];
        var buttons = $dialog.dialog('option').buttons;
        var length = buttons.length;
        for (idx = 0; idx < length; idx++) {
            if (buttonLabelText === buttons[idx].text) {
                return buttons[idx];
            }
        }
    },
    getSelectedContainerPath: function (jstreeSelector, selectedContainer) {
        var foldPath = $(jstreeSelector).jstree('get_path', selectedContainer); // get the path of the selected folder
        if (foldPath[0] === Constants.c.folders) {
            foldPath.splice(0, 1); // get the path beneath the root 'Folders', if the root is 'Folders'
        }
        foldPath = foldPath.join('\\');
        foldPath += '\\';
        return foldPath;
    },
    invalidSelection: function (message) {
        message = message || Constants.c.selectEntity;
        var dlgOpts = {
            title: Constants.c.selection,
            resizable: false,
            width: 'auto',
            maxWidth: $(window).width(),
            height: 140,
            maxHeight: $(window).height(),
            modal: true,
            msg: message
        };
        DialogsUtil.generalCloseDialog(null, dlgOpts);
    },
    // Open folder selection dialog
    folderSelection: function (createNew, createNow, startingFolderId, callback, uiState, options) {
        var foldId;
        var foldTitle;
        var foldPath;
        var folders = [];
        var foldData = { ParentId: startingFolderId, Depth: 1, includeParent: options ? options.includeParent : false };
        var multiSelect = (options && options.multi);
        var data = $('#cf_folder_list').containers('folderList', foldData);
        if (data && data.length > 0) {
            data.bind("select_node.jstree", function (event, data) {
                if (data.rslt.obj.attr("Id") ==='Root' || data.rslt.obj.attr("Id") === 'jstree-' + Constants.c.emptyGuid) {
                    $('#cf_folder_list').jstree('deselect_node', (data.rslt.obj));
                }
                else {
                    if (multiSelect) {
                        folders = DialogsUtil.getSelectedFoldersData('#cf_folder_list');
                    } else {
                        foldPath = DialogsUtil.getSelectedContainerPath('#cf_folder_list', data.rslt.obj);
                        if (data.rslt.obj.attr("Id") !== 'jstree-Root') {
                            foldTitle = data.rslt.obj.attr("Title"); // get the folder title
                            foldId = data.rslt.obj.attr("Id").replace('jstree-', ''); // get the selected folder id
                        } else {
                            $(this).jstree('deselect_all');
                            foldTitle = undefined;
                            foldId = undefined;
                        }
                    }
                }
            });
            data.bind('deselect_node.jstree', function (event, data) {
                folders = DialogsUtil.getSelectedFoldersData('#cf_folder_list');
            });
            var buttons = [
                {
                    text: Constants.c.ok,
                    click: function () {
                        $(this).dialog("close");
                        if (multiSelect) {
                            callback(Constants.c.ok, uiState, folders);
                        } else {
                            callback(Constants.c.ok, uiState, foldId, foldTitle, foldPath);
                        }
                    }
                },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        $(this).dialog("close");
                        callback(Constants.c.cancel, uiState);
                    }
                }];
            if (!options.removeClearBtn) {
                buttons.push({
                    text: Constants.c.clear,
                    click: function () {
                        $(this).dialog("close");
                        callback(Constants.c.clear, uiState);
                    }
                });
            }
            $('#selectFolder').dialog({
                position: options.position,
                minWidth: 200,
                maxWidth: $(window).width(),
                maxHeight: $(window).height(),
                modal: true,
                open: function () {
                    $('#cf_folder_list').unbind('before.jstree').bind('before.jstree', function (event, data) { // Event that gets triggered before any other jstree events            
                        if (options && options.singleSelect && data.func === 'select_node') {  // If selecting a node, deselect all other nodes first (single selection)
                            $(this).jstree('deselect_all');
                        }
                    });
                },
                close: function () {
                    callback();
                },
                buttons: buttons
            });
            $('#selectFolder').dialog('open');
        }
    },
    getSelectedFoldersData: function (jstreeFolderSelector) {
        var selected = $(jstreeFolderSelector).jstree('get_selected');
        var i = 0;
        var length = selected.length;
        var folders = [];
        for (i = 0; i < length; i++) {
            folders.push({
                id: $(selected[i]).attr('id').replace('jstree-', ''),
                title: $(selected[i]).attr('title'),
                path: DialogsUtil.getSelectedContainerPath(jstreeFolderSelector, selected[i])
            });
        }
        return folders;
    },
    enableButtons: function (titles) {
        var i;
        var length = titles.length;
        for (i = 0; i < length; i++) {
            $(".ui-dialog-buttonpane button:contains(" + titles[i] + ")").button("enable");
        }
    },
    disableButtons: function (titles) {
        var i = 0;
        var length = titles.length;
        for (i = 0; i < length; i++) {
            $(".ui-dialog-buttonpane button:contains(" + titles[i] + ")").button("disable");
        }
    },
    //#region Dialog Instance Utility Functions
    isDialogInstance: function ($dialog) {
        return $dialog && $dialog.hasClass('ui-dialog-content');
    },
    isDialogInstanceClose: function ($dialog) {
        if (DialogsUtil.isDialogInstance($dialog)) {
            $dialog.dialog('close');
        }
    },
    isDialogInstanceDestroyDialog: function ($dialog) {
        if (DialogsUtil.isDialogInstance($dialog)) {
            $dialog.dialog('destroy');
        }
    }
    //#endregion Dialog Instance Utility Functions
};


//Extend jquery dialogs title set method
$.widget("ui.dialog", $.extend({}, $.ui.dialog.prototype, {
    _title: function (title) {
        if (!this.options.title) {
            title.html("&#160;");
        } else {
            title.html(this.options.title);
        }
    }
}));


if ($.ui && $.ui.dialog && $.ui.dialog.prototype && $.ui.dialog.prototype._init) {
    var _init = $.ui.dialog.prototype._init;
    $.ui.dialog.prototype._init = function () {
        var self = this;
        // Logic for showing / hiding the native viewer on a dialog open / close is contained within ShowHideUtil.toggleNativeViewer
        // It contains the check to see if there are any other dialogs open upon a dialog close.
        self.uiDialog.off('dialogopen.initial').on('dialogopen.initial', function () {
            if (ShowHideUtil && ShowHideUtil.toggleNativeViewer) {
                ShowHideUtil.toggleNativeViewer(true, true);
            }
            else {
                Utility.OutputToConsole("ShowHideUtil is not included in javascript files");
            }
            $(this).css({ 'min-width': self.options.minWidth });
        });

        self.element.off('dialogclose.initial').on('dialogclose.initial', function () {
            if (ShowHideUtil && ShowHideUtil.toggleNativeViewer) {
                ShowHideUtil.toggleNativeViewer(false, true);
            }
            else {
                Utility.OutputToConsole("ShowHideUtil is not included in javascript files");
            }
        });
        _init.apply(this, arguments);   // Opens the dialog, above dialogopen event needs to be bound before the dialog opens   
    };
}