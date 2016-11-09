var DocumentMetaDialogs = {
    addTo: function (options) {
        $('#retrieve_layout_folder_list').containers('folderList').unbind('select_node.jstree').bind("select_node.jstree", function (event, data) {
            // Unable to add documents to Root folder, upon selection of root, root becomes deselected
            if ($(data.rslt.obj).attr('Id') === 'Root') {
                $('#retrieve_layout_folder_list').jstree('deselect_node', (data.rslt.obj));
            }
        });
        var parent = $('#retrieve_layout_selectContainer').parent();
        $('#retrieve_layout_selectContainer').attr('title', Constants.c.selectFolder);
        $('#retrieve_layout_selectContainer').dialog({
            autoOpen: false,
            minHeight: 250,
            minWidth: 200,
            maxHeight: 300,
            modal: true,
            title: Constants.c.selectFolder,
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    ErrorHandler.removeErrorTagsElement(parent, css.warningErrorClass, css.inputErrorClass);
                    // upon ok in dialog (before close check to see if user has add_to perms on that folder)
                    var selected = $('#retrieve_layout_folder_list').jstree('get_selected'),
                        addTo = [],
                        length = selected.length,
                        foldPath,
                        foldId,
                        hasAddTo = true;
                    for (i = 0; i < length; i++) {
                        foldPath = $('#retrieve_layout_folder_list').jstree('get_path', $(selected[i]));
                        foldPath.splice(0, 1);
                        foldPath = foldPath.join('\\');
                        foldPath += '\\';
                        hasAddTo = hasAddTo & Utility.checkSP($(selected[i]).data().EffectivePermissions, Constants.sp.Add_To);
                        foldId = $(selected[i]).attr('id').replace('jstree-', '');
                        addTo.push({
                            Id: foldId,
                            Name: foldPath,
                            EffectivePermissions: $(selected[i]).data().EffectivePermissions
                        });
                    }
                    // check user perm to add to folder
                    if (!hasAddTo) {
                        // Insufficient Permissions                        
                        ErrorHandler.addErrors(Constants.c.insufficientPermissions, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    }
                    else {
                        var dlgThat = this;
                        var cleanup = function () {
                            $(dlgThat).dialog('close');
                        };
                        options.callback({ addTo: addTo }, cleanup);
                    }
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTagsElement(parent, css.warningErrorClass, css.inputErrorClass);
                    $(this).dialog("close");
                }
            }],
            resize: function () {
                $('#retrieve_layout_selectContainer').css('max-height', parent.height() - parent.find('.ui-dialog-buttonpane').height() + 'px');
            },
            close: function () {
                ErrorHandler.removeErrorTagsElement(parent, css.warningErrorClass, css.inputErrorClass);
                $('#retrieve_layout_folder_list').hide();
                $('#retrieve_layout_selectContainer').attr('title', Constants.c.selectInboxFolder);
            }
        });
        $('#retrieve_layout_folder_list').show();
        $('#retrieve_layout_selectContainer').dialog('open');
    },
    moveTo: function (options) {
        var opts = { "ui": { select_multiple_modifier: false, select_range_modifier: false } }; // disable multiselect
        $('#retrieve_layout_inbox_list').jstree('refresh');
        $('#retrieve_layout_folder_list').jstree('refresh');
        $('#retrieve_layout_inbox_list').containers('inboxList', null, opts).unbind('select_node.jstree').bind("select_node.jstree", function (event, data) {
            // Unable to add documents to Root inbox, upon selection of root, root becomes deselected
            if ($(data.rslt.obj).attr('Id') === 'Root') {
                $('#retrieve_layout_inbox_list').jstree('deselect_node', (data.rslt.obj));
            }
            $('#retrieve_layout_folder_list').jstree('deselect_all');
        });
        // Allow multiple selection of folders here, since no folders can be selected for moving.
        // This should always allow multiselection, unlike the search results 
        $('#retrieve_layout_folder_list').containers('folderList', null, null).unbind('select_node.jstree').bind("select_node.jstree", function (event, data) {
            // Unable to add documents to Root folder, upon selection of root, root becomes deselected
            if ($(data.rslt.obj).attr('Id') === 'Root') {
                $('#retrieve_layout_folder_list').jstree('deselect_node', (data.rslt.obj));
            }
            $('#retrieve_layout_inbox_list').jstree('deselect_all');
        });
        var parent = $('#retrieve_layout_selectContainer').parent();
        $('#retrieve_layout_selectContainer').attr('title', Constants.c.selectFolder);
        $('#retrieve_layout_selectContainer').dialog({
            autoOpen: false,
            minHeight: 250,
            minWidth: 200,
            maxHeight: 300,
            modal: true,
            title: Constants.c.selectInboxFolder,
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    ErrorHandler.removeErrorTagsElement(parent, css.warningErrorClass, css.inputErrorClass);
                    // upon ok in dialog (before close check to see if user has add_to perms on that folder)
                    var selectedFolds = $('#retrieve_layout_folder_list').jstree('get_selected');   // max length of 1
                    var selectedInboxes = $('#retrieve_layout_inbox_list').jstree('get_selected');  // max length of 1
                    var addTo = [];
                    var hasAddTo = true;
                    var foldLength = selectedFolds.length;
                    for (i = 0; i < foldLength; i++) {
                        var foldId = $(selectedFolds[i]).attr('id').replace('jstree-', '');
                        hasAddTo = hasAddTo & Utility.checkSP($(selectedFolds[i]).data('EffectivePermissions'), Constants.sp.Add_To);

                        var foldPath = $('#retrieve_layout_folder_list').jstree('get_path', $(selectedFolds[i]));
                        foldPath.splice(0, 1);
                        foldPath = foldPath.join('\\');
                        foldPath += '\\';
                        addTo.push({
                            Id: foldId,
                            Name: foldPath,
                            EffectivePermissions: $(selectedFolds[i]).data('EffectivePermissions')
                        });
                    }
                    var inboxLength = selectedInboxes.length;
                    for (i = 0; i < inboxLength; i++) {
                        var inboxId = $(selectedInboxes[i]).attr('id').replace('jstree-', '');
                        hasAddTo = hasAddTo & Utility.checkSP($(selectedInboxes[i]).data('EffectivePermissions'), Constants.sp.Add_To);
                        addTo.push({
                            Id: inboxId,
                            Name: $(selectedInboxes[i]).attr('title'),
                            EffectivePermissions: $(selectedInboxes[i]).data('EffectivePermissions')
                        });
                    }
                    // check user perm to add to folder
                    if (!hasAddTo) {
                        // Insufficient Permissions                        
                        ErrorHandler.addErrors(Constants.c.insufficientPermissions, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    }
                    else {
                        var dlgThat = this;
                        var cleanup = function () {
                            $(dlgThat).dialog('close');
                        };
                        options.callback({ addTo: addTo, folderLength: foldLength, inboxLength: inboxLength }, cleanup);
                    }
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTagsElement(parent, css.warningErrorClass, css.inputErrorClass);
                    $(this).dialog("close");
                }
            }],
            resize: function () {
                $('#retrieve_layout_selectContainer').css('max-height', parent.height() - parent.find('.ui-dialog-buttonpane').height() + 'px');
            },
            close: function () {
                ErrorHandler.removeErrorTagsElement(parent, css.warningErrorClass, css.inputErrorClass);
                $('#retrieve_layout_inbox_list, #retrieve_layout_folder_list').jstree('deselect_all');
                $('#retrieve_layout_inbox_list, #retrieve_layout_folder_list').hide();
                $('#retrieve_layout_selectContainer').attr('title', Constants.c.selectInboxFolder);
            }
        });
        $('#retrieve_layout_inbox_list').show();
        $('#retrieve_layout_folder_list').show();
        $('#retrieve_layout_selectContainer').dialog('open');
    },
    viewAuditTrail: function (options) {
        options = options || {};
        var wWidth = $(window).width();
        var dWidth = wWidth * 0.9;
        var $dlg;
        var auditTrailGridView = new AuditTrailGridView({ entityId: options.entityId });
        var diagOpts = {
            html: auditTrailGridView.render().$el,
            width: dWidth,
            height: 450,
            title: Constants.c.auditTrail,
            autoOpen: true
        };
        DialogsUtil.generalCloseDialog(null, diagOpts);
    }
};