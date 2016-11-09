var SearchResultDialogs = {
    deleteOrRemove: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var documentIds = options.documentIds;
        var inboxIds = options.inboxIds;
        var folderIds = options.folderIds;
        var justRemove = options.justRemove;
        var $dlg;
        var docWarningMsg = (documentIds.length > 0 ? Constants.c.removeDocuments + '\n\n' : '');
        var message = "";
        var title = '';
        var numSelected = documentIds.length + inboxIds.length + folderIds.length;
        if (justRemove) {
            message = docWarningMsg + Constants.c.removeItemsMessage;
            title = Constants.c.remove;
        }
        else {
            if (inboxIds.length > 0 || folderIds.length > 0) {
                message = Constants.c.deleteDocInboxFolderMessage;
                message = message.replace('{0}', documentIds.length);
                message = inboxIds.length > 0 ? message.replace('{1}', Constants.c.inboxCount.replace('{0}', inboxIds.length)) : message.replace('{1}', '');
                message = folderIds.length > 0 ? message.replace('{2}', Constants.c.folderCount.replace('{0}', folderIds.length)) : message.replace('{2}', '');
                message += '\n' + Constants.c.deleteDocConfirmation;
            } else {
                message = Constants.c.deleteDocsMessage + '\n' + Constants.c.deleteDocConfirmation;
            }
            title = Constants.c['delete'];
        }
        message = options.message || message.replace('{0}', numSelected);
        if (!justRemove && numSelected < 1) {
            ErrorHandler.displayGeneralDialogErrorPopup(Constants.c.multiSelectEntities, null, Constants.c['delete']);
            return;
        }
        if (justRemove && numSelected < 1) {
            ErrorHandler.displayGeneralDialogErrorPopup(Constants.c.multiSelectionContainers, null, Constants.c.remove);
            return;
        }
        // Prompt user to select at least one folder or inbox when performing a remove
        // Include document warning if documents are selected.
        if (justRemove && folderIds.length === 0 && inboxIds.length === 0) {
            ErrorHandler.displayGeneralDialogErrorPopup(docWarningMsg + Constants.c.multiSelectionContainers, null, Constants.c.remove);
            return;
        }
        var diagOpts = {
            resizable: false,
            width: 'auto',
            height: 140,
            title: title,
            autoOpen: false
        };
        var okFunc = function (cleanup) {
            options.callback(cleanup);
        };
        $dlg = DialogsUtil.generalPromptDialog(message, okFunc, null, diagOpts);
        $dlg.dialog('open');

    },
    mergeResults: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ documentIds: [], destinationDocTitle: '' }, options);
        var documentIds = options.documentIds;
        var destinationDocId = documentIds.splice(0, 1)[0];
        var sourceDocIds = documentIds;
        var itemCount = sourceDocIds.length;
        var message = String.format(Constants.c.mergeMessage, itemCount + 1, options.destinationDocTitle);
        if (itemCount < 1) {
            $("#merge-invalid").dialog({
                resizable: false,
                width: 'auto',
                height: 140,
                modal: true,
                title: Constants.c.resultActionsMerge,
                buttons: [{
                    text: Constants.c.close,
                    click: function () {
                        $(this).dialog('close');
                    }
                }]
            });
        }
        else {
            var args = { DestinationDocumentId: destinationDocId, SourceDocumentIds: sourceDocIds };
            var dlgOpts = {
                resizable: false,
                width: 'auto',
                height: 140,
                modal: true,
                title: Constants.c.resultActionsMerge
            };
            var okFunc = function (cleanup) {
                options.callback(args, cleanup);
            };
            DialogsUtil.generalPromptDialog(message, okFunc, null, dlgOpts);
        }
    },
    changeSecurity: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ documentIds: [], inboxIds: [], folderIds: [], showSecurityClass: true }, options);
        var docIds = options.documentIds;
        var inboxIds = options.inboxIds;
        var folderIds = options.folderIds;
        var numIds = docIds.length + inboxIds.length + folderIds.length;

        if (numIds !== 1) {
            DialogsUtil.invalidSelection(Constants.c.singleSelection);
            return false;
        }
        SecurityUtil.toggleDialogSecClassDropdown($('#container_security'), options.showSecurityClass);
        if (docIds.length === 1) {
            SecurityUtil.getSecPermData(docIds[0], 'Document', null, options.callback);
        }
        else if (inboxIds.length === 1) {
            SecurityUtil.getSecPermData(inboxIds[0], 'Inbox', null, options.callback);
        }
        else if (folderIds.length === 1) {
            SecurityUtil.getSecPermData(folderIds[0], 'Folder', null, options.callback);
        }
    },
    exportToCSV: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ itemCount: 0 }, options);
        if (options.itemCount > 0) {
            var $dlg = $('#exportImportProgress');
            $dlg.dialog();
            $dlg.find('.exportInProgress').show();
            $dlg.find('.exportComplete').hide();
            var sf = function (result) {
                var $anchor = $dlg.find('a');
                $anchor.attr('href', Constants.Server_Url + '/GetFile.ashx?functionName=DownloadResult&exportResult=DownloadTemp/' + result);
                $anchor.one('click', function () { $dlg.dialog('close'); });
                $dlg.find('.exportInProgress').hide();
                $dlg.find('.exportComplete').show();
            };
            var ff = function (jqXHR, textStatus, errorThrown) {
                $dlg.dialog('close');
                ErrorHandler.popUpMessage(errorThrown);
            };
            options.callback(sf, ff);
        }
        else {
            ErrorHandler.addErrors(Constants.c.noRecordsToExport);
        }
    },
    removeFromInbox: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ containerArgs: [], itemCount: 0 }, options);
        var containerArgs = options.containerArgs;

        var argsLength = containerArgs.length;
        if (argsLength === 0) {
            DialogsUtil.invalidSelection(Constants.c.selectDocumentInInbox);
            return;
        }
        for (i = 0; i < argsLength; i++) {
            if (containerArgs[i].ContainerId === Constants.c.valueSetNotFound) {
                DialogsUtil.invalidSelection();
                return;
            }
        }
        if (containerArgs.length === 0) {
            DialogsUtil.invalidSelection();
            return;
        }
        var message = String.format(Constants.c.removeDocsFromInbox, options.itemCount);
        var okFunc = function (cleanup) {
            options.callback(cleanup);
        };
        var dlgOpts = {
            resizable: false,
            width: 'auto',
            height: 140,
            modal: true,
            title: Constants.c.removeFromInbox
        };
        DialogsUtil.generalPromptDialog(message, okFunc, null, dlgOpts);
    },
    removeFromFolder: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ containerArgs: [], itemCount: 0 }, options);

        var containerArgs = options.containerArgs;
        var argsLength = containerArgs.length;
        if (argsLength === 0) {
            DialogsUtil.invalidSelection(Constants.c.selectDocumentInFolder);
            return;
        }
        for (i = 0; i < argsLength; i++) {
            if (containerArgs[i].ContainerId === Constants.c.valueSetNotFound) {
                DialogsUtil.invalidSelection();
                return;
            }
        }
        var message = String.format(Constants.c.removeDocsFromFolder, options.itemCount);
        var okFunc = function (cleanup) {
            options.callback(cleanup);
        };
        var dlgOpts = {
            resizable: false,
            width: 'auto',
            height: 140,
            modal: true,
            title: Constants.c.removeFromFolder
        };
        DialogsUtil.generalPromptDialog(message, okFunc, null, dlgOpts);
    },
    setDueDate: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ itemCount: 0, dueDate: '' }, options);
        if (options.itemCount === 0) {
            ErrorHandler.displayGeneralDialogErrorPopup(Constants.c.mustSelectOneDoc);
            return;
        }
        var $dlg;
        var okFunc = function (cleanup) {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            var cleanupFunc = function () {
                $("#divDueDate").show();
                $("#meta_DueDate").val(dueDate);
                Utility.executeCallback(cleanup);
            };
            var dueDate = $dlg.find('input[name="dueDate"]').val();
            var check = true;
            if (dueDate) {
                check = DateUtil.isDate(dueDate);
            }
            if (!check) {
                ErrorHandler.addErrors({ 'dueDate': Constants.c.invalidDateSelection }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                Utility.executeCallback(cleanup, true);
            }
            else {
                options.callback(dueDate, cleanupFunc);
            }
        };
        var cancelFunc = function (cleanup) {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            Utility.executeCallback(cleanup);
        };
        var dlgOpts = {
            html: $('#dueDateDialog').html(),
            title: Constants.c.setDueDate,
            resizable: false,
            width: 300,
            height: 120,
            modal: true,
            autoOpen: false,
            open: function () {
                $dlg.parent().find('.ui-dialog-titlebar').off('click').on('click', function () {
                    $dlg.find('.hasDatepicker').blur();
                });
                var $dueDateInput = $dlg.find('input[name="dueDate"]');
                if (options.itemCount === 1) {
                    $dueDateInput.val(options.dueDate);
                }
                else {
                    $dueDateInput.val("");
                }
                $dueDateInput.attr('disablePastDate', true);
                Utility.addDatePicker($dueDateInput, { type: 'datetime', disablePastDate: true, displayClearButton: true });
            }
        };
        $dlg = DialogsUtil.generalPromptDialog('', okFunc, cancelFunc, dlgOpts);
        $dlg.dialog('open');
    },
    moveTo: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ documentIds: [], foldersData: [] }, options);
        if (options.foldersData.length === 0 && options.documentIds.length === 0) { // Something has to be selected
            DialogsUtil.invalidSelection(Constants.c.multiSelectFolderOrDocument);
            return;
        }
        var i = 0;
        var j = 0;
        var opts = { "ui": { select_multiple_modifier: false, select_range_modifier: false } }; // disable multiselect

        var docIds = options.documentIds;
        var foldersData = options.foldersData;
        var hasAddToPerms;
        var hasRemoveFromPerms;
        // display dialog to select container to move to
        $('#retrieve_layout_inbox_list').jstree('refresh');
        $('#retrieve_layout_folder_list').jstree('refresh');
        $('#retrieve_layout_inbox_list').containers('inboxList', null, opts).unbind('select_node.jstree').bind("select_node.jstree", function (event, data) {
            // Unable to add documents to Root inbox, upon selection of root, root becomes deselected
            if ($(data.rslt.obj).attr('Id') === 'Root') {
                $('#retrieve_layout_inbox_list').jstree('deselect_node', (data.rslt.obj));
            }
            $('#retrieve_layout_folder_list').jstree('deselect_all');
        });

        // Change title depending on if folders are in the selection of items to be moved
        var title = Constants.c.selectFolder;
        // Allow selection of multiple folders, as long as there isn't a folder that is selected
        // Only allowed to select a single folder if a folder has been selected to be moved
        if (foldersData.length === 0) {
            opts = null;
            title = Constants.c.selectInboxFolder;
        }
        $('#retrieve_layout_folder_list').containers('folderList', null, opts).unbind('select_node.jstree').bind("select_node.jstree", function (event, data) {
            // Unable to add documents to Root folder, upon selection of root, root becomes deselected
            if ($(data.rslt.obj).attr('Id') === 'Root') {
                $('#retrieve_layout_folder_list').jstree('deselect_node', (data.rslt.obj));
            }
            $('#retrieve_layout_inbox_list').jstree('deselect_all');
        });

        // Display dialog with folder/inbox picker
        $('#retrieve_layout_selectContainer').dialog({
            autoOpen: false,
            minHeight: 250,
            maxHeight: $(window).height(),
            minWidth: 200,
            modal: true,
            title: title,
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    Utility.disableButtons([Constants.c.ok, Constants.c.cancel]);
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    // upon ok in dialog (before close check to see if user has add_to perms on that folder)
                    var selectedFolds = $('#retrieve_layout_folder_list').jstree('get_selected');   // max length of 1
                    var selectedInboxes = $('#retrieve_layout_inbox_list').jstree('get_selected');  // max length of 1
                    var addTo = [];
                    var multiFolderId = [];
                    var entityIds = [];
                    var length = selectedFolds.length;
                    for (i = 0; i < length; i++) {
                        var foldId = $(selectedFolds[i]).attr('id').replace('jstree-', '');
                        addTo.push({
                            foldId: foldId,
                            foldName: $(selectedFolds[i]).attr('title')
                        });
                        entityIds.push({ id: foldId, permissions: $(selectedFolds[i]).data('EffectivePermissions') });
                        multiFolderId.push(foldId);
                    }
                    length = selectedInboxes.length;
                    for (i = 0; i < length; i++) {
                        var inboxId = $(selectedInboxes[i]).attr('id').replace('jstree-', '');
                        addTo.push({
                            inboxId: inboxId,
                            inboxName: $(selectedInboxes[i]).attr('title')
                        });
                        entityIds.push({ id: inboxId, permissions: $(selectedInboxes[i]).data('EffectivePermissions') });
                    }
                    var entityType;
                    var gridEntityType;
                    if (selectedFolds.length > 0) {
                        entityType = Constants.et.Folder;
                        gridEntityType = Constants.UtilityConstants.DF_FOLDERID;
                    }
                    else if (selectedInboxes.length > 0) {
                        entityType = Constants.et.Inbox;
                        gridEntityType = Constants.UtilityConstants.DF_INBOXID;
                    }
                    // Check permissions
                    length = entityIds.length;
                    var cleanup = function () {
                        Utility.enableButtons([Constants.c.ok, Constants.c.cancel]);
                        $('#retrieve_layout_selectContainer').dialog('close');
                    };
                    if (length > 0) {
                        for (i = 0; i < length; i++) {
                            hasAddToPerms = Utility.checkSP(entityIds[i].permissions, Constants.sp.Add_To);
                            hasRemoveFromPerms = Utility.checkSP(entityIds[i].permissions, Constants.sp.Remove_From);
                            if (hasAddToPerms === false || hasRemoveFromPerms === false) {
                                break;
                            }
                        }
                    }
                    else {
                        cleanup();
                        return;
                    }
                    // check user perm to add to folder
                    if (!hasAddToPerms) {
                        // Insufficient Permissions
                        Utility.enableButtons([Constants.c.ok, Constants.c.cancel]);
                        ErrorHandler.addErrors(Constants.c.insufficientPermissions, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    }
                    else {
                        // Call to move the currently selected document(s) and/or folder(s) to the selected destination
                        // should only be one destination
                        var docFolderMovementPkg;
                        var docMovementPkg;
                        var dest = entityIds[0];
                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                        if (multiFolderId.length > 0) {
                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                            docFolderMovementPkg = {
                                DestinationId: multiFolderId,
                                Type: entityType,
                                DocumentIds: docIds
                            };
                        }
                        else {
                            docMovementPkg = {
                                DestinationId: dest.id,
                                Type: entityType,
                                DocumentIds: docIds
                            };
                        }
                        // Move folders one by one
                        var folderMovementPkgs = [];
                        for (j = 0; j < foldersData.length; j++) {
                            folderMovementPkgs.push({
                                Id: foldersData[j].entityId,
                                NewRootId: dest.id,
                                Title: foldersData[j].title
                            });
                        }
                        options.callback({
                            docFolderMovementPkg: docFolderMovementPkg,
                            docMovementPkg: docMovementPkg,
                            folderMovementPkgs: folderMovementPkgs,
                            gridEntityType: gridEntityType
                        }, cleanup);
                    }
                }
            }, {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    $(this).dialog("close");
                }
            }],
            open: function (event, ui) {
                // Hide native viewer so the dialog will be visible
                $('#nativeViewer').addClass('hideNative');
            },
            close: function () {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                $('#retrieve_layout_inbox_list, #retrieve_layout_folder_list').jstree('deselect_all');
                $('#retrieve_layout_inbox_list, #retrieve_layout_folder_list').hide();
                $('#retrieve_layout_selectContainer').attr('title', Constants.c.selectInboxFolder);
                // Check to see if native viewer, if it is re-show the native viewer
                if (!$('#nativeViewer').hasClass('hideNative') && !$('#entityViewer .view_viewer').is(':visible')) {
                    $('#nativeViewer').removeClass('hideNative');
                }
            }
        });
        if (foldersData.length === 0) {// show inboxes only if we are not moving folders
            $('#retrieve_layout_inbox_list').show();
        }
        $('#retrieve_layout_folder_list').show();
        $('#retrieve_layout_selectContainer').dialog('open');
        var parent = $('#retrieve_layout_selectContainer').parent();
        $('#retrieve_layout_selectContainer').css('height', parent.height() - parent.find('.ui-dialog-buttonpane').height() + 'px');
        $('#retrieve_layout_selectContainer').css("overflow", "auto");
    },
    setPriority: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ documentIds: [], priority: Constants.pl.Normal }, options);
        var docIds = options.documentIds;
        var length = docIds.length;
        if (length === 0) {
            DialogsUtil.invalidSelection();
            return;
        }
        $('#priorityDialog select').find('option[value=' + options.priority + ']').attr('selected', 'selected');
        $('#priorityDialog').dialog({
            resizable: false,
            width: 'auto',
            height: 100,
            modal: true,
            title: Constants.c.setPriority,
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    Utility.disableButtons([Constants.c.ok, Constants.c.cancel]);
                    var priority = $(this).find('select').val();
                    var cleanup = function (keepOpen) {
                        Utility.enableButtons([Constants.c.ok, Constants.c.cancel]);
                        if (!keepOpen) {
                            $('#priorityDialog').dialog('close');
                        }
                    };
                    options.callback(priority, cleanup);
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
    },
    deleteOrRemoveDialog: function (options) {
        var $diag = $("#action-confirm");
        var length;
        $diag.dialog({
            resizable: false,
            width: 'auto',
            height: 140,
            modal: true,
            title: options.title,
            open: function () {
                $('#actionConfirmThrobber').hide();
            },
            buttons: [{
                text: Constants.c.ok,
                click: function () {                    
                    $('#actionConfirmThrobber').show();
                    DialogsUtil.disableButtons([Constants.c.ok, Constants.c.cancel]);
                    var cleanup = function () {
                        $diag.dialog('close');
                    };
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    options.callback(cleanup);
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    $diag.dialog("close");
                }
            }]
        });
    },
    changeWatches: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var $dialog;
        var watchLibView = new WatchLibraryView({ collection: options.watches });
        var ok = function (cleanup) {
            var cb = function () {
                Utility.executeCallback(cleanup);
                watchLibView.close(watchLibView);
            };
            options.callback(cb);
        };
        var cancel = function (cleanup) {
            Utility.executeCallback(cleanup);
            watchLibView.close(watchLibView);
        };

        var diagOpts = {
            title: Constants.c.modifyWatches,
            autoOpen: false,
            minHeight: 280,
            height: 280,
            width: 630,
            maxWidth: 630,
            minWidth: 630,
            html: watchLibView.$el,
            open: function () {
                watchLibView.render();
            },
            close: function () {
                watchLibView.close(watchLibView);
            }
        };
        $dialog = DialogsUtil.generalPromptDialog('', ok, cancel, diagOpts);
        $dialog.dialog('open');
    }
};