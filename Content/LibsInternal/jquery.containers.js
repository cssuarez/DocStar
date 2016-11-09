/// <reference path="DialogsUtil.js" />
// Function for inbox and folders
/// <reference path="SecurityUtil.js" />
/// <reference path="Utility.js" />
/// <reference path="ErrorHandler.js" />
/// <reference path="~/Content/LibsExternal/perfect-scrollbar.js" />
(function ($) {
    var folderSvc = null;
    var inboxSvc = null;
    var sortAlphaNumeric = function (aElem, bElem) {
        var a = this.get_text(aElem).toUpperCase();
        var b = this.get_text(bElem).toUpperCase();

        return Sort.alphaNumeric(a, b);
    };
    var methods = {
        idPrefix: 'jstree-',
        init: function (args) {
            $.extend(true, methods, args);
        },
        inboxList: function (data, opts) {
            opts = opts || {};
            var options = methods.getjstreeoptions(data, "Container/GetAllInboxes");
            $.extend(true, options, opts);
            var returnValue = this.jstree(options);
            return returnValue;
        },
        folderList: function (data, opts) {
            opts = opts || {};
            if (data && !data.children) {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                var parId = data.ParentId;
                if (parId) {
                    parId = parId.replace(methods.idPrefix, '');
                }
                $.ajax({
                    url: Constants.Url_Base + "Container/GetFolderChildren",
                    data: { ParentId: parId, Depth: 1, includeParent: data.includeParent },
                    async: false, /*Made synchronous because folders need to be fetched before displaying to user*/
                    type: "GET",
                    success: function (result) {
                        if (result.status === 'ok') {
                            data = result.result;
                            if (!data.attr.Id.match(methods.idPrefix) && data.attr.Id !== 'Root') {
                                data.attr.Id = methods.idPrefix + data.attr.Id;
                            }
                        }
                        else {
                            data = $();
                            ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
                        }
                    }
                });
            }
            if (data && data.length <= 0) {    // If an error occurred return empty jquery object (for chaining purposes)
                data = $();
                return data;
            }
            var options = methods.getjstreeoptions(data, "Container/GetFolderChildren");
            options.plugins.push('dnd');
            options.plugins.push('crrm');
            options.crrm = {
                "move": {
                    "check_move": function (m) {
                        var newRootId = m.np.attr('id');
                        if (newRootId === 'folder_list' || newRootId === 'cf_folder_list' || newRootId === 'retrieve_layout_folder_list'
                            || m.op.attr('id') === newRootId) {
                            return false;
                        }
                        return true;
                    }
                }
            };
            $.extend(true, options, opts);
            var returnValue = this.jstree(options);
            return returnValue;
        },
        ldapList: function (data, getChildrenData) {
            if (data && (typeof data === 'string')) {
                data = Utility.tryParseJSON(data);
            }
            var options = methods.getjstreeoptions(data, '');
            options = {
                "plugins": ["json_data", "themes", "ui", "crrm", "sort"],
                "ui": { select_multiple_modifier: false },
                sort: sortAlphaNumeric,
                themes: {
                    theme: "default",
                    url: Constants.Url_Base + "Content/themes/default/style.css"
                },
                "json_data": {
                    "data": data,
                    "ajax": {
                        "url": Constants.Url_Base + 'Container/GetLDAPContainers',
                        "data": function (n) {
                            return {
                                idStr: getChildrenData.id,
                                node: n.attr ? n.attr('id') : '',
                                subtree: false,
                                username: getChildrenData.username,
                                password: getChildrenData.password
                            };
                        },
                        success: function (result) {
                            if (result.status === "ok") {
                                var data = result.result;
                                return data.length === 0 ? "" : data; //If we return an empty array to jstree it will throw an error.
                            }
                            ErrorHandler.addErrors(result.message);
                            return;
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            var msg = Constants.c.generalErrorMessage.replace("{0}", "\n\n" + errorThrown + "\n\n");
                            ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                        }
                    }
                }
            };
            returnValue = this.jstree(options);
            return returnValue;
        },
        categoryList: function (data) {
            var options = {
                "plugins": ["json_data", "themes", "ui", "crrm", "sort"],
                "ui": { select_multiple_modifier: false },
                sort: sortAlphaNumeric,
                themes: {
                    theme: "default",
                    url: Constants.Url_Base + "Content/themes/default/style.css"
                },
                "json_data": {
                    "data": data
                }
            };
            return this.jstree(options);
        },
        reportsDashboardList: function (data) {
            var options = {
                "plugins": ["json_data", "themes", "ui", "crrm", "sort"],
                "ui": { select_multiple_modifier: false },
                sort: sortAlphaNumeric,
                themes: {
                    theme: "default",
                    url: Constants.Url_Base + "Content/themes/default/style.css"
                },
                "json_data": {
                    "data": data
                }
            };
            return this.jstree(options);
        },
        getjstreeoptions: function (data, url) {
            if (!folderSvc) {
                folderSvc = FolderServiceProxy();
            }
            if (!inboxSvc) {
                inboxSvc = InboxServiceProxy();
            }
            function customMenu(node) {
                var items = {};
                // Hide contextmenu for selecting a folder/inbox to search on
                // Disallow context menu in dialogs for: the search inbox/folder selector dialog, and currently the workflow designer folder selector
                var isRetrieveContainerSelector = $('#retrieve_layout_inbox_list').length > 0 && $('#retrieve_layout_inbox_list').css('display') !== 'none';
                if (isRetrieveContainerSelector || $('#selectFolder.wfDesignerSelector').is(':visible')) {
                    return items;
                }
                var hasCreateInboxPermissions = false;
                var hasCreatePrimaryFoldersPermissions = false;
                var hasAddToPermissions = false;
                var hasDeletePermissions = false;
                var hasModifyPermissions = false;
                var hasSecurityClassPermissions = false;
                var hasApprovePermissions = false;
                if ($('#inbox_contextmenu').data('inboxSecClassCreated') === undefined) {
                    $('#inbox_contextmenu').data('inboxSecClassCreated', false);
                }
                if ($('#folder_contextmenu').data('folderSecClassCreated') === undefined) {
                    $('#folder_contextmenu').data('folderSecClassCreated', false);
                }
                var emptyId = Constants.c.emptyGuid;
                var entityId = node[0].id;
                var parentId = '';
                var containerType = '';
                var i = 0;
                var sp = Constants.sp;
                if (entityId === 'Root') {
                    entityId = emptyId;
                }
                if (node.parent().parent().parent().parent().attr('id') === 'inbox_list' || node.parent().parent().attr('id') === 'inbox_list') {
                    containerType = 'Inbox';
                }
                else {
                    containerType = 'Folder';
                }
                var effPerm = $(node).data().EffectivePermissions;
                var gatePerm = window.gatewayPermissions;
                hasCreatePrimaryFoldersPermissions = Utility.checkGP(gatePerm, Constants.gp.Create_Primary_Folders);
                hasCreateInboxPermissions = Utility.checkGP(gatePerm, Constants.gp.Create_Inboxes);
                hasAddToPermissions = Utility.checkSP(effPerm, sp.Add_To);
                hasModifyPermissions = Utility.checkSP(effPerm, sp.Modify);
                hasDeletePermissions = Utility.checkSP(effPerm, sp.Delete);
                hasSecurityClassPermissions = Utility.checkSP(effPerm, sp.Classify);
                hasApprovePermissions = Utility.checkSP(effPerm, Constants.c.Approve);
                if ($('#inbox_contextmenu').data('inboxSecClassCreated') === false) {
                    var secResult = window.slimSecurityClasses;
                    $('#inbox_contextmenu .children')[0].innerHTML = "";
                    $('#folder_contextmenu .children')[0].innerHTML = "";
                    $('#inbox_contextmenu .children').append($('<li></li>').append($('<span></span>').addClass('anchor').attr('title', '').attr('name', '')));
                    $('#folder_contextmenu .children').append($('<li></li>').append($('<span></span>').addClass('anchor').attr('title', '').attr('name', '')));
                    for (i = 0; i < secResult.length; i++) {
                        var name = secResult.at(i).get('Name');
                        var id = secResult.at(i).get('Id');
                        $('#inbox_contextmenu .children').append($('<li></li>').append(
                            $('<span></span>').addClass('anchor')
                                .attr('title', name)
                                .attr('name', id)
                                .text(name)
                            )
                        );
                        $('#folder_contextmenu .children').append($('<li></li>').append(
                            $('<span></span>').addClass('anchor')
                                .attr('title', name)
                                .attr('name', id)
                                .text(name)
                            )
                        );
                    }
                    $('#inbox_contextmenu').data('inboxSecClassCreated', true);
                }
                if (node.attr('id') !== 'Root') {
                    parentId = node.attr('id');
                }
                else {
                    parentId = emptyId;
                }
                // Inbox context menu
                if (containerType === 'Inbox') {
                    // The default set of all items
                    items = {
                        createItem: {
                            label: Constants.c.createInbox,
                            action: function (inboxNode) {
                                $('#inbox_contextmenu').dialog({
                                    width: 350,
                                    height: 'auto',
                                    minHeight: 200,
                                    modal: true,
                                    resizable: false,
                                    open: function () {
                                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                                        $('#inbox_contextmenu .inbox_create_secclass_dropdown').val('');
                                        $(this).parent('.ui-dialog').css('overflow', 'visible');
                                    },
                                    close: function () {
                                        $('#inbox_contextmenu .inbox_create_secclass_dropdown').text('');
                                    },
                                    buttons: [{
                                        text: Constants.c.create,
                                        click: function () {
                                            methods.createInbox(inboxNode, this);
                                        }
                                    }, {
                                        text: Constants.c.close,
                                        click: function () {
                                            $('#new_inbox_name').val('');
                                            $('#inbox_contextmenu .inbox_create_secclass_dropdown').text('');
                                            if ($('#inbox_contextmenu .dropdown').data('show') === undefined) {
                                                $('#inbox_contextmenu .dropdown').data('show', false);
                                            }
                                            $('#inbox_contextmenu .dropdown').data('show', false);
                                            $('#inbox_contextmenu .children').hide();
                                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                                            $(this).dialog('close');
                                        }
                                    }]
                                });
                            }
                        },
                        securityItem: {
                            label: Constants.c.changeSecurity,
                            action: function (obj) {
                                $('#container_name').val($.trim($(obj).text()));
                                var id = obj.attr('id').toString().replace(methods.idPrefix, '');
                                SecurityUtil.toggleDialogSecClassDropdown($('#container_security'), true);
                                SecurityUtil.getSecPermData(id, 'Inbox');
                            }
                        },
                        renameItem: {
                            label: Constants.c.renameInbox,
                            action: function (inboxNode) {
                                var that = this;
                                this.rename(inboxNode);
                                if ($('#inbox_list').data('rename') === undefined) {
                                    $('#inbox_list').data('rename', false);
                                }
                                if ($('#inbox_list').data('rename') === false) {
                                    $('#inbox_list').bind('rename.jstree', function (e, data) {
                                        methods.renameInbox(data, that);
                                    });
                                }
                                $('#inbox_list').data('rename', true);
                            }
                        },
                        deleteItem: {
                            label: Constants.c.deleteInbox,
                            action: function (inboxNode) {
                                methods.removeInbox(this, inboxNode);
                            }
                        }
                    };
                    if (hasCreateInboxPermissions === false) {
                        items.createItem._disabled = true;
                    }
                    if (hasDeletePermissions === false || parentId === emptyId || node.attr('title') === 'Default') {
                        items.deleteItem._disabled = true;
                    }
                    if (hasModifyPermissions === false || parentId === emptyId || node.attr('title') === 'Default') {
                        items.renameItem._disabled = true;
                    }
                    if (hasSecurityClassPermissions === false || parentId === emptyId) {
                        items.securityItem._disabled = true;
                    }
                }
                    // Folder context menu
                else {
                    // The default set of all items
                    items = {
                        createItem: {
                            label: Constants.c.createFolder,
                            action: function (folderNode) {
                                var parentId = folderNode.attr('id');
                                var folderSelectors = $('#folder_list, #cf_folder_list:visible, #retrieve_layout_folder_list:visible');
                                var i = 0;
                                var length = folderSelectors.length;
                                for (i = 0; i < length; i++) {
                                    $(folderSelectors[i]).jstree('open_node', $('#' + parentId, $(folderSelectors[i])));
                                }

                                $('#folder_contextmenu').dialog({
                                    width: 350,
                                    height: 200,
                                    minHeight: 200,
                                    modal: true,
                                    resizable: false,
                                    open: function () {
                                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                                        $(this).parent('.ui-dialog').css('overflow', 'visible');
                                    },
                                    close: function () {
                                        $('#new_folder_name').val('');
                                        $('#folder_contextmenu .folder_create_secclass_dropdown').text('');
                                        if ($('#folder_contextmenu .dropdown').data('show') === undefined) {
                                            $('#folder_contextmenu .dropdown').data('show', false);
                                        }
                                        $('#folder_contextmenu .dropdown').data('show', false);
                                        $('#folder_contextmenu .children').hide();
                                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                                    },
                                    buttons: [{
                                        text: Constants.c.create,
                                        click: function () {
                                            methods.createFolder(folderNode, this);
                                        }
                                    }, {
                                        text: Constants.c.close,
                                        click: function () {
                                            $('#new_folder_name').val('');
                                            $('#folder_contextmenu .folder_create_secclass_dropdown').text('');
                                            if ($('#folder_contextmenu .dropdown').data('show') === undefined) {
                                                $('#folder_contextmenu .dropdown').data('show', false);
                                            }
                                            $('#folder_contextmenu .dropdown').data('show', false);
                                            $('#folder_contextmenu .children').hide();
                                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                                            $(this).dialog('close');
                                        }
                                    }]
                                });
                                $('#folder_contextmenu').dialog('open');
                            }
                        },
                        securityItem: {
                            label: Constants.c.changeSecurity,
                            action: function (obj) {
                                // $(obj).text() contains the names of the current folder and all sub folders
                                // $(obj).attr('title') contains just the current folders name
                                var currFolderName = $(obj).attr('title');
                                $('#container_name').val(currFolderName);
                                var id = obj.attr('id').toString().replace(methods.idPrefix, '');
                                SecurityUtil.toggleDialogSecClassDropdown($('#container_security'), true);
                                SecurityUtil.getSecPermData(id, 'Folder');
                            }
                        },
                        renameItem: {
                            label: Constants.c.renameFolder,
                            action: function (obj) {
                                var that = this;
                                this.rename(obj);
                                $('#folder_list').unbind('rename.jstree').bind('rename.jstree', function (e, data, node) {
                                    methods.renameFolder('#folder_list', data, that);
                                });
                                $('#cf_folder_list').unbind('rename.jstree').bind('rename.jstree', function (e, data, node) {
                                    methods.renameFolder('#cf_folder_list', data, that);
                                });
                                $('#retrieve_layout_folder_list').unbind('rename.jstree').bind('rename.jstree', function (e, data, node) {
                                    methods.renameFolder('#retrieve_layout_folder_list', data, that);
                                });
                            }
                        },
                        deleteItem: {
                            label: Constants.c.deleteFolder,
                            action: function (folderNode) {
                                methods.removeFolder(this, folderNode);
                            }
                        }
                    };
                    if (hasCreatePrimaryFoldersPermissions === false) {
                        items.createItem._disabled = true;
                    }
                    if (hasAddToPermissions === false && !((parentId === emptyId || parentId !== 'Root') && hasCreatePrimaryFoldersPermissions)) {
                        items.createItem._disabled = true;
                    }
                    if (hasDeletePermissions === false || parentId === emptyId || parentId === 'Root') {
                        items.deleteItem._disabled = true;
                    }
                    if (hasModifyPermissions === false || parentId === emptyId || parentId === 'Root') {
                        items.renameItem._disabled = true;
                    }
                    if (hasSecurityClassPermissions === false || parentId === emptyId || parentId === 'Root') {
                        items.securityItem._disabled = true;
                    }
                }
                return items;
            }
            var options = {
                "plugins": ["json_data", "themes", "ui", "crrm", "contextmenu", "sort"],
                contextmenu: { items: customMenu },
                //sort: sortAlphaNumeric, // It already comes sorted from the database
                themes: {
                    theme: "default",
                    url: Constants.Url_Base + "Content/themes/default/style.css"
                },
                "json_data": {
                    "data": data,
                    "ajax": {
                        "url": Constants.Url_Base + url,
                        "data": function (n) {
                            return { ParentId: n.attr ? n.attr("Id").replace(methods.idPrefix, '') : "", Depth: n.attr ? n.attr("Depth") : 1 };
                        },
                        success: function (result) {
                            if (result.status === "ok") {
                                return result.result.length === 0 ? "" : result.result; //If we return an empty array to jstree it will throw an error.
                            }
                            ErrorHandler.addErrors(result.message);
                            return;
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            var msg = Constants.c.generalErrorMessage.replace("{0}", "\n\n" + errorThrown + "\n\n");
                            ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                        }
                    }
                }
            };
            if (data === undefined || data === '' || $.isEmptyObject(data)) {
                delete options.json_data.data;
            }
            if ($('#inbox_contextmenu').data('applyEvents') === undefined) {
                $('#inbox_contextmenu').data('applyEvents', false);
            }
            if ($('#inbox_contextmenu').data('applyEvents') === false) {
                methods.applyEventHandler();
                $('#inbox_contextmenu').data('applyEvents', true);
            }
            return options;
        },
        disableButtons: function (that) {
            $(".ui-dialog-buttonpane button:contains('Create')").button("disable");
            $(".ui-dialog-buttonpane button:contains('Save')").button("disable");
            $(".ui-dialog-buttonpane button:contains('Close')").button("disable");
            $(".ui-dialog-buttonpane button:contains('Cancel')").button("disable");
            var func = function (dialogError) {
                $(".ui-dialog-buttonpane button:contains('Create')").button("enable");
                $(".ui-dialog-buttonpane button:contains('Save')").button("enable");
                $(".ui-dialog-buttonpane button:contains('Close')").button("enable");
                $(".ui-dialog-buttonpane button:contains('Cancel')").button("enable");
                if (!dialogError) {
                    $(that).dialog('close');
                }
            };
            return func;
        },
        // Inbox context menu CRUD
        createInbox: function (inboxNode, that) {
            var name = $.trim($('#new_inbox_name').val());
            if (!name) {
                //Error markup for no inbox name input
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                ErrorHandler.addErrors({ 'inbox_folder_contextmenu_error': Constants.c.enterInboxName }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                return;
            }
            var secId = $('#inbox_contextmenu .inbox_create_secclass_dropdown').val();
            if (!secId) {
                secId = null;
            }
            var func = methods.disableButtons(that);
            //Create a node inside of Root directory, assigning values to those of retrieved inbox,
            //sorting after insertion of inbox
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            var success = function (result) {
                var inboxId = result[0].Id;
                var id = methods.idPrefix + result[0].Id;
                var inboxAttr = {
                    attr: {
                        id: id,
                        depth: 0,
                        title: name
                    },
                    data: name,
                    metadata: {
                        EffectivePermissions: result[0].EffectivePermissions
                    }
                };
                $('#inbox_list #' + id).data('EffectivePermissions', Constants.sp.Full);
                $('#inbox_list').jstree('create', $('#Root'), 'first', inboxAttr, function () { }, true);
                if (window.slimInboxes) {
                    window.slimInboxes.add(new SlimEntity({
                        Id: inboxId,
                        Name: name,
                        EffectivePermissions: result[0].EffectivePermissions
                    }));
                    if (WorkflowUtil.refreshView) {
                        WorkflowUtil.refreshView(null, null, null, true);
                    }
                }
                $('#new_inbox_name').val('');
                $('#inbox_contextmenu .inbox_create_secclass_dropdown').text('');
                if ($('#inbox_contextmenu .dropdown').data('show') === undefined) {
                    $('#inbox_contextmenu .dropdown').data('show', false);
                }
                $('#inbox_contextmenu .dropdown').data('show', false);
                $('#inbox_contextmenu .children').hide();
                $('#inbox_contextmenu .success_message').show();
                $('#inbox_contextmenu .success_message').fadeOut(2000, func);
                $('#inbox_list_scroll').perfectScrollbar('update');
                $('body').trigger('MassDocumentUpdated');
            };
            var failure = function (jqXHR, textStatus, errorThrown) {
                func(true);
                //var msg = Constants.c.generalErrorMessage.replace("{0}", "\n\n" + errorThrown + "\n\n");
                ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            var createPkg = {
                Inboxes: [{
                    Id: Constants.c.emptyGuid,
                    Name: name,
                    CreatedBy: Constants.c.emptyGuid,
                    SecurityClassId: secId
                }]
            };
            inboxSvc.createInbox(createPkg, success, failure, null);
        },
        renameInbox: function (data, that) {
            var id = data.rslt.obj.attr('id');
            var inboxId = id.replace(methods.idPrefix, '');
            var newName = $.trim(data.rslt.new_name);
            var oldName = $.trim(data.rslt.old_name);
            // If the names are equivalent don't rename
            // If the target to rename is the root Inbox don't rename (shouldn't  already be disabled)
            if ((newName === oldName) || (id === 'Root')) {
                return;
            }
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            var scroll = function () {
                $('#inbox_list').scrollTo(id);
            };
            var success = function () {
                setTimeout(scroll, 1);
                var renameObj = $('#' + id, '#inbox_list');
                renameObj.attr('title', $.trim(newName));
                if (window.slimInboxes) {
                    var model = window.slimInboxes.get(inboxId),
                        searchinp = $(".folder_criteria");

                    if ($('.folder_criteria').data('containerid') === inboxId) {
                        $(".folder_criteria").val(newTitle);
                    }
                    model.set('Name', newName);
                    if (WorkflowUtil.refreshView) {
                        WorkflowUtil.refreshView(null, null, null, true);
                    }
                }
                $('body').trigger('MassDocumentUpdated');
            };
            var failure = function (jqXHR, textStatus, errorThrown) {
                var renameObj = data.rslt.obj;
                var resetRename = $(renameObj).children('a').html().slice(0, $(renameObj).children('a').html().lastIndexOf('>') + 1);
                resetRename = resetRename + oldName;
                $(renameObj).children('a').empty();
                $(renameObj).children('a').append(resetRename);
                that.rename(renameObj);
                setTimeout(scroll, 1);
                ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            var renamePkg = {
                Id: inboxId,
                NewName: newName
            };
            inboxSvc.renameInbox(renamePkg, success, failure, null);
        },
        removeInbox: function (that, inboxNode) {
            var id = inboxNode.attr('id');
            that.selectedInboxId = id.replace(methods.idPrefix, '');
            that.badResponse = function (errorMessage) {
                ErrorHandler.addErrors(errorMessage, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            var sf = function (response) {
                if (response.status === 'ok') {
                    var dialogButtons,
                        diagSelector;
                    var cancelButton = {
                        text: Constants.c.cancel,
                        click: function () {
                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                            $(diagSelector).dialog('close');
                        }
                    };
                    var removeInbox = function (deleteDocuments) {
                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                        var success = function () {
                            that.remove(inboxNode);
                            if (window.inboxes) {
                                window.inboxes.remove(model);
                            }
                            if (window.slimInboxes) {
                                var model = window.slimInboxes.get(that.selectedInboxId);
                                window.slimInboxes.remove(model); // remove from slim inboxes
                                if (WorkflowUtil.refreshView) {
                                    WorkflowUtil.refreshView(null, null, null, true);
                                }
                            }
                            $('#inbox_list').height($('#inbox_list').height() - 18);
                            $('body').trigger('MassDocumentUpdated');
                        };
                        var failure = function (jqXHR, textStatus, errorThrown) {
                            if (!errorThrown) {
                                return;
                            }
                            if (errorThrown.Type && errorThrown.Type.match('OverridableException')) {
                                var message = errorThrown.Message + '\n' + Constants.c.continueYesNo;
                                var okFunc = function () {
                                    inboxSvc.deleteInbox(deletePkg, success, failure, complete, null, { "ds-options": Constants.sro.OverrideErrors });
                                };
                                var options = {
                                    closeText: Constants.c.cancel,
                                    closeDialog: true,
                                    close: function () {
                                        $(diagSelector).dialog('close');
                                    }
                                };
                                ErrorHandler.displayOverridableDialogErrorPopup(message, okFunc, options);
                            }
                            else {
                                ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                            }
                        };
                        var complete = function () {
                            $(diagSelector).dialog('close');
                        };
                        var deletePkg = {
                            InboxIds: [that.selectedInboxId],
                            DeleteDocuments: deleteDocuments
                        };
                        inboxSvc.deleteInbox(deletePkg, success, failure, complete);
                    };
                    var getRemoveInboxButton = function (text, deleteDocuments) {
                        return { text: text, click: function () { removeInbox(deleteDocuments); } };
                    };
                    if (response.result) { //inbox is empty
                        dialogButtons = [getRemoveInboxButton(Constants.c.yes, false), cancelButton];
                        diagSelector = '#inbox_remove';
                    } else {
                        dialogButtons = [getRemoveInboxButton(Constants.c.yes, true), getRemoveInboxButton(Constants.c.no, false), cancelButton];
                        diagSelector = '#inbox_delete';
                    }
                    $(diagSelector).dialog({
                        height: 150,
                        width: 500,
                        modal: true,
                        resizable: false,
                        buttons: dialogButtons
                    });
                }
                if (response.status === 'bad') {
                    that.badResponse(response.message);
                }
            };
            var ff = function (jqXHR, textStatus, error) {
                that.badResponse(error.Message);
            };
            $.ajax(Constants.Url_Base + 'Container/InboxIsEmpty', {
                data: { inboxId: that.selectedInboxId },
                success: sf,
                error: ff,
                type: "GET"
            });
            $('#inbox_list_scroll').perfectScrollbar('update');
        },
        // Folder context menu CRUD
        createFolder: function (folderNode, that) {
            var parentId = folderNode.attr('id');
            if (parentId === 'Root' || parentId === methods.idPrefix + 'Root' || parentId === methods.idPrefix + Constants.c.emptyGuid) {
                parentId = null;
            }
            var folderParentId = null;
            if (parentId) {
                folderParentId = parentId.replace(methods.idPrefix, '');
            }
            var folderDepth = parseInt(folderNode.attr('depth'), 10) + 1;
            var name = $.trim($('#new_folder_name').val());
            if (!name) {
                //Error markup for no folder name input
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                ErrorHandler.addErrors({ 'inbox_folder_contextmenu_error': Constants.c.enterFolderName }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                return;
            }
            // Determine selected security classes id
            var secId = $('#folder_contextmenu .folder_create_secclass_dropdown').val();
            if (!secId) {
                secId = null;
            }
            var func = methods.disableButtons(that);
            var success = function (result) {
                var folder = result[0];
                var parentDomId = parentId || 'Root';
                var folderAttr = {
                    attr: {
                        id: methods.idPrefix + folder.Id,
                        depth: folderDepth,
                        title: name
                    },
                    data: name,
                    metadata: {
                        EffectivePermissions: folder.EffectivePermissions
                    }
                };
                // Create the folder for each of the folder trees that exist
                var selector = '#' + parentDomId;
                $('#folder_list ' + selector).data('EffectivePermissions', Constants.sp.Full);
                $('#folder_list').jstree('create', $(selector, '#folder_list'), 'first', folderAttr, function () { }, true);

                var cfSelector = selector === '#Root' ? '#' + methods.idPrefix + 'Root' : selector;
                $('#cf_folder_list ' + cfSelector).data('EffectivePermissions', Constants.sp.Full);
                $('#cf_folder_list').jstree('create', $(cfSelector, '#cf_folder_list'), 'first', folderAttr, function () { }, true);

                $('#retrieve_layout_folder_list ' + selector).data('EffectivePermissions', Constants.sp.Full);
                $('#retrieve_layout_folder_list').jstree('create', $(selector, '#retrieve_layout_folder_list'), 'first', folderAttr, function () { }, true);

                $('#new_folder_name').val('');
                $('#folder_contextmenu .folder_create_secclass_dropdown').text('');
                $('#folder_contextmenu .success_message').show();
                $('#folder_contextmenu .success_message').fadeOut(2000, func);
                if (!window.folders) {
                    window.folders = new Folders();
                }
                if (!window.slimFolders) {
                    window.slimFolders = new SlimEntities();
                }
                window.folders.add(folder);
                window.slimFolders.add(new SlimEntity({
                    Id: folder.Id,
                    Name: name,
                    EffectivePermissions: folder.EffectivePermissions
                }));

                //#7015 : Reset the selected value after successful folder creation
                $('#folder_contextmenu .folder_create_secclass_dropdown').val('');
            };
            var failure = function (jqXHR, textStatus, errorThrown) {
                // true prevents the dialog from closing due to an error being present
                func(true);
                //var msg = Constants.c.generalErrorMessage.replace("{0}", "\n\n" + errorThrown.Message + "\n\n");
                ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            var createPackage = {
                Folders: [{
                    Id: Constants.c.emptyGuid,
                    Title: name,
                    Parent: folderParentId,
                    CreatedBy: Constants.c.emptyGuid,
                    SecurityClassId: secId
                }]
            };
            folderSvc.createFolder(createPackage, success, failure, null);
        },
        renameFolder: function (selector, data, that) {
            var folderSelectors = $('#folder_list');
            var cfFolderSelectors = $('#cf_folder_list');
            var retrieveFolderSelectors = $('#retrieve_layout_folder_list');
            // Rename a folder based on folder trees selector and the obj to be renamed
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            var id = data.rslt.obj.attr('id');
            var effectivePermissions = $('#' + id).data('EffectivePermissions');
            var folderId = id.replace(methods.idPrefix, '');
            var newTitle = $.trim(data.rslt.new_name);
            var oldTitle = $.trim(data.rslt.old_name);
            if (newTitle === oldTitle) {    // Don't need to rename if the titles are equivalent
                return;
            }
            var parentNode = $(selector).data('parentNode').replace(methods.idPrefix, '');
            if (parentNode === 'Root') {
                parentNode = null;
            }
            var renamePkg = {
                Id: folderId,
                NewTitle: newTitle,
                Parent: parentNode
            };
            var renameInCollections = function () {
                var folder;
                if (window.folders && window.folders.get) {
                    folder = window.folders.get(folderId);
                    if (folder && folder.set) {
                        folder.set('Name', newTitle);
                    }
                    else {
                        window.folders.add(
                            new Folder({
                                Id: folderId,
                                Name: newTitle,
                                EffectivePermissions: effectivePermissions
                            })
                        );
                    }
                }
                if (window.slimFolders && window.slimFolders.get) {
                    folder = window.slimFolders.get(folderId);
                    if (folder && folder.set) {
                        folder.set('Name', newTitle);
                    }
                    else {
                        window.slimFolders.add(
                            new SlimEntity({
                                Id: folderId,
                                Name: newTitle,
                                EffectivePermissions: effectivePermissions
                            })
                        );
                    }

                }
            };
            var renameInFields = function () {
                if ($('#meta_folders').length > 0) {
                    if ($('#meta_folders').jqGrid('getRowData', folderId + '_folds').length > 0) {
                        $('#meta_folders').jqGrid('setRowData', folderId + '_folds', { foldName: $('#meta_folders').jqGrid('getRowData', folderId + '_folds').foldName.replace(oldTitle, newTitle) });
                    }
                }

            };
            var rename = function (sel, title) {
                var renameObj = '#' + id;
                $(sel).jstree('rename_node', $(renameObj, sel), $.trim(title));

                var renameObjTitle = $('#' + id, sel.selector);
                renameObjTitle.attr('title', $.trim(title));

                setTimeout(function () { $(sel).scrollTo($(renameObj, sel)); }, 1);
            };
            var success = function (result) {
                if ($('.folder_criteria').data('FolderId') === folderId) {
                    $(".folder_criteria").val(newTitle);
                }

                rename(folderSelectors, newTitle);
                rename(cfFolderSelectors, newTitle);
                rename(retrieveFolderSelectors, newTitle);
                renameInCollections();
                renameInFields();
                $('body').trigger('MassDocumentUpdated');
            };
            var failure = function (jqXHR, textStatus, errorThrown) {
                rename(selector, oldTitle);
                ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            folderSvc.renameFolder(renamePkg, success, failure, null);
        },
        removeFolder: function (that, folderNode) {
            var folderSelectors = $('#folder_list, #cf_folder_list, #retrieve_layout_folder_list');
            that.folderNodeId = folderNode.attr('id');
            that.selectedFolderId = that.folderNodeId.replace(methods.idPrefix, '');
            that.badResponse = function (errorMessage) {
                ErrorHandler.addErrors(errorMessage, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            var sf = function (response) {
                if (response.status === 'ok') {
                    var dialogButtons,
                        diagSelector;
                    var removeFolder = function (withDocuments) {
                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                        if ($('#view_layout.hideNative').length === 0) {
                            var nowDocOpenId = $('#view_layout #docId').val();
                        }
                        var deletePkg = {
                            FolderIds: [that.selectedFolderId],
                            DeleteDocuments: withDocuments,
                            NowOpenDocId: nowDocOpenId
                        };
                        var success = function (result) {
                            folderSelectors.find('#' + that.folderNodeId).remove();
                            that.remove(folderNode);
                            var model;
                            if (window.folders) {
                                model = window.folders.get(that.selectedFolderId);
                                if (model) {
                                    window.folders.remove(model);
                                }
                            }
                            if (window.slimFolders) {
                                model = window.slimFolders.get(that.selectedFolderId);
                                if (model) {
                                    window.slimFolders.remove(model);
                                }
                            }
                            $('body').trigger('MassDocumentUpdated');
                            if ($('#folder_list').height('100%').height() > parseInt($('#folder_list_scroll').css('max-height'), 10)) {
                                $('#folder_list').height(parseInt($('#folder_list_scroll').css('max-height'), 10));
                            }
                        };
                        var failure = function (jqXHR, textStatus, errorThrown) {
                            if (!errorThrown) {
                                return;
                            }
                            if (errorThrown.Type && errorThrown.Type.match('OverridableException')) {
                                var message = errorThrown.Message + '\n' + Constants.c.continueYesNo;
                                var okFunc = function () {
                                    folderSvc.deleteFolder(deletePkg, success, failure, complete, null, { "ds-options": Constants.sro.OverrideErrors });
                                };
                                var options = {
                                    closeText: Constants.c.cancel,
                                    closeDialog: true,
                                    close: function () {
                                        $(diagSelector).dialog('close');
                                    }
                                };
                                ErrorHandler.displayOverridableDialogErrorPopup(message, okFunc, options);
                            }
                            else {
                                ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                            }
                        };
                        var complete = function () {
                            $(diagSelector).dialog('close');
                        };
                        folderSvc.deleteFolder(deletePkg, success, failure, complete);
                    };
                    var cancelButton =
                    {
                        text: Constants.c.cancel,
                        click: function () {
                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                            $(this).dialog('close');
                        }
                    };
                    var getRemoveFolderButton = function (text, deleteDocuments) {
                        return { text: text, click: function () { removeFolder(deleteDocuments); } };
                    };
                    if (response.result) { //folder is empty
                        dialogButtons = [getRemoveFolderButton(Constants.c.yes, false), cancelButton];
                        diagSelector = '#folder_remove';
                    } else {
                        dialogButtons = [getRemoveFolderButton(Constants.c.yes, true), getRemoveFolderButton(Constants.c.no, false), cancelButton];
                        diagSelector = '#folder_delete';
                    }
                    $(diagSelector).dialog({
                        height: 150,
                        width: 500,
                        modal: true,
                        resizable: false,
                        buttons: dialogButtons
                    });
                }
                if (response.status === 'bad') {
                    that.badResponse(response.message);
                }
            };
            var ff = function (jqXHR, textStatus, error) {
                that.badResponse(error.Message);
            };
            $.ajax(Constants.Url_Base + 'Container/FolderIsEmpty', {
                data: { folderId: that.selectedFolderId },
                success: sf,
                error: ff,
                type: "GET"
            });
        },
        moveFolder: function (id, pathId, title, object, event) {
            var reset = function () {
                $(event.currentTarget).jstree('move_node', $(object.rslt.o), $(object.rslt.op));
            };
            var cancelFunc = function (cleanup) {
                methods.withoutEventMoveNode = true;
                reset();
                methods.withoutEventMoveNode = false;
                Utility.executeCallback(cleanup);
            };
            var okFunc = function (cleanup) {
                var folderSelectors = '#folder_list';
                var cfFolderSelectors = '#cf_folder_list';
                var retrieveFolderSelectors = '#retrieve_layout_folder_list';
                var movePkg = {
                    Id: id,
                    NewRootId: pathId === "" || pathId === "Root" ? null : pathId,
                    Title: title
                };
                var moveAnother = function () {
                    var move = function (sel) {
                        //TODO move another folder containers. Commented solution will duplicate folders and not stable. Because first it opens node, before it adds already existed node.
                        /*if ($(event.currentTarget).attr('id') !== $(sel).attr('id')) {
                            var howMove = $('#' + object.rslt.o.attr('id'), sel);
                            var path = $('#' + object.rslt.np.attr('id'), sel);
                            $(sel).jstree('move_node',
                                howMove,
                                path
                            );
                        }*/
                    };
                    // so this function, moveAnother, doesn't do anything?
                    move(folderSelectors);
                    move(cfFolderSelectors);
                    move(retrieveFolderSelectors);
                };
                var success = function (result) {
                    methods.withoutEventMoveNode = true;
                    moveAnother(); // why?
                };
                var failure = function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.displayGeneralDialogErrorPopup(errorThrown.Message);
                    methods.withoutEventMoveNode = true;
                    reset();
                };
                var complete = function () {
                    methods.withoutEventMoveNode = false;
                    Utility.executeCallback(cleanup);
                };
                folderSvc.moveFolder(movePkg, success, failure, complete);
            };
            DialogsUtil.generalPromptDialog(Constants.c.moveFolderConfirmation, okFunc, cancelFunc);
        },
        withoutEventMoveNode: false,
        setSelectedDropdownText: function (event) {
            ShowHideUtil.setDropdownTextGeneric(event);
        },
        showHideDropdownMenu: function (event) {
            // Initialize passed in event data               
            var dropdown = event.data.dropdownSelector;
            var parent = event.data.parentSelector;
            var childHover = event.data.childHoverSelector;
            var childShowHide = event.data.childShowHideSelector;
            // Initialize data values            
            if ($(dropdown).data('show') === undefined) {
                $(dropdown).data('show', false);
            }
            // Check to see if its been clicked if so, show, if not hide on alternate clicks
            if ($(dropdown).data('show') === false) {
                $(parent + ' ' + childHover).addClass('hover');
                //display the submenu
                $(parent + ' ' + childShowHide).show();
                $(dropdown).data('show', true);
            }
            else if ($(dropdown).data('show') === true) {
                $(parent + ' ' + childHover).removeClass('hover');
                //display the submenu
                $(parent + ' ' + childShowHide).hide();
                $(dropdown).data('show', false);
            }
        },
        applyEventHandler: function () {
            $('#inbox_contextmenu').delegate('.dropdown', 'click',
                {
                    dropdownSelector: '#inbox_contextmenu .dropdown',
                    parentSelector: '#inbox_contextmenu',
                    childHoverSelector: '.inbox_security_class li span.parent',
                    childShowHideSelector: '.inbox_security_class ul.children'
                }, methods.showHideDropdownMenu);
            $('#folder_contextmenu').delegate('.dropdown', 'click',
                {
                    dropdownSelector: '#folder_contextmenu .dropdown',
                    parentSelector: '#folder_contextmenu',
                    childHoverSelector: '.fold_security_class li span.parent',
                    childShowHideSelector: '.fold_security_class ul.children'
                }, methods.showHideDropdownMenu);
            $('#container_security').delegate('.dropdown', 'click', {
                dropdownSelector: '#container_security .dropdown',
                parentSelector: '#container_security',
                childHoverSelector: '.container_security_class li span.parent',
                childShowHideSelector: '.container_security_class ul.children'
            }, methods.showHideDropdownMenu);
            $('#container_security').delegate('.dropdown li span.anchor', 'click', {
                dropdownSelector: '#container_security .dropdown',
                containerSelector: '#container_security',
                dropdownFieldTextSelector: '.dropdown .container_secclass_dropdown'
            }, methods.setSelectedDropdownText);
            $('#inbox_contextmenu').delegate('.dropdown li span.anchor', 'click',
            {
                dropdownSelector: '#inbox_contextmenu .dropdown',
                containerSelector: '#inbox_contextmenu',
                dropdownFieldTextSelector: '.dropdown .inbox_create_secclass_dropdown'
            }, methods.setSelectedDropdownText);
            $('#folder_contextmenu').delegate('.dropdown li span.anchor', 'click',
            {
                dropdownSelector: '#folder_contextmenu .dropdown',
                containerSelector: '#folder_contextmenu',
                dropdownFieldTextSelector: '.dropdown .folder_create_secclass_dropdown'
            }, methods.setSelectedDropdownText);
            $('#inbox_list').delegate('a', 'contextmenu', function (event) {
                if ($('#vakata-contextmenu li').hasClass('jstree-contextmenu-disabled') === true &&
                        $('#vakata-contextmenu li a[rel="createItem"]').text() === 'Create Inbox') {
                    $('#vakata-contextmenu a[rel="createItem"]').attr('title', Constants.c.insufficientPermissions);

                }
                if ($('#vakata-contextmenu li').hasClass('jstree-contextmenu-disabled') === true &&
                        $('#vakata-contextmenu li a[rel="deleteItem"]').text() === 'Delete') {
                    $('#vakata-contextmenu a[rel="deleteItem"]').attr('title', Constants.c.insufficientPermissions);
                }
                if ($('#vakata-contextmenu li').hasClass('jstree-contextmenu-disabled') === true &&
                        $('#vakata-contextmenu li a[rel="renameItem"]').text() === 'Rename') {
                    $('#vakata-contextmenu a[rel="renameItem"]').attr('title', Constants.c.insufficientPermissions);
                }
            });
            var folderSelectors = $('#folder_list, #cf_folder_list, #retrieve_layout_folder_list');
            folderSelectors.delegate('a', 'contextmenu', function (event) {
                // Gets parentnode of right clicked node (for determining if folder has the same name as another folder)
                folderSelectors.data('parentNode', $(event.currentTarget.parentNode.parentNode.parentNode).attr('id'));
                if ($('#vakata-contextmenu li').hasClass('jstree-contextmenu-disabled') === true &&
                        $('#vakata-contextmenu li a[rel="createItem"]').text() === 'Create Inbox') {
                    $('#vakata-contextmenu a[rel="createItem"]').attr('title', Constants.c.insufficientPermissions);
                }
                if ($('#vakata-contextmenu li').hasClass('jstree-contextmenu-disabled') === true &&
                        $('#vakata-contextmenu li a[rel="deleteItem"]').text() === 'Delete') {
                    $('#vakata-contextmenu a[rel="deleteItem"]').attr('title', Constants.c.insufficientPermissions);
                }
                if ($('#vakata-contextmenu li').hasClass('jstree-contextmenu-disabled') === true &&
                        $('#vakata-contextmenu li a[rel="renameItem"]').text() === 'Rename') {
                    $('#vakata-contextmenu a[rel="renameItem"]').attr('title', Constants.c.insufficientPermissions);
                }
            });
            folderSelectors.unbind('move_node.jstree').bind('move_node.jstree', function (e, b) {
                if (!methods.withoutEventMoveNode) {
                    var preflen = methods.idPrefix.length;
                    var getId = function (objname) {
                        return b.rslt[objname].attr('id').substr(preflen);
                    };
                    methods.moveFolder(getId('o'), getId('np'), $.trim($(b.rslt.o).children('a').text()), b, e);
                }
            });
        }
    };
    $.fn.containers = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        $.error('Method ' + method + ' does not exist on jQuery.containers');
    };
}(jQuery));