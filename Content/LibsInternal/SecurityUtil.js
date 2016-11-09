var SecurityUtil = {
    // Get security data for the passed in entity
    viewData: {},
    userSelection: '#container_security select[name="userSelection"]',
    groupSelection: '#container_security select[name="groupSelection"]',
    removedUserRoleIds: [],
    serviceProxy: undefined,
    init: function () {
        if (SecurityUtil.permissionEditView && SecurityUtil.permissionEditView.close) {
            SecurityUtil.permissionEditView.close();
        }
        this.permissionEditView = new PermissionEditView({
            useGatewayPermissions: false //either false or omitted if you want to use standard permissions.
        });
        // Replace html with throbber, until data is fully obtained        
        $('#container_security .container_sec_class_container').hide();
        $('#container_security').append($('<img id="cont_sec_load" />').attr('src', Constants.Url_Base + 'Content/themes/default/throbber.gif'));
        $('#container_security').dialog({
            autoOpen: false,
            height: 575,
            width: 400,
            modal: true,
            resizable: false,
            open: function () {
                SecurityUtil.toggleRemoveButton(true, 'remove_user_one_off');
                SecurityUtil.toggleRemoveButton(true, 'remove_role_one_off');
            },
            close: function () {
                $('#container_security .cont_sec_perm>span').html(Constants.c.permissions);
            },
            buttons: [{
                text: Constants.c.save,
                click: function () {
                    if (!$.trim($('#container_name').val())) {
                        ErrorHandler.addErrors(Constants.c.nameEmptyWarning, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                        return;
                    }
                    // Get security class title
                    var secId = $('#container_security .container_secclass_dropdown').val();
                    var permissions = SecurityUtil.permissionEditView.getTrackablePermissions();
                    if (!secId) {
                        secId = undefined;
                    }
                    var func = SecurityUtil.disableButtons(this);
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    SecurityUtil.entity.SecurityClassId = secId;
                    SecurityUtil.entity.UserPermissions = [];
                    SecurityUtil.entity.RolePermissions = [];
                    var length = permissions.length;
                    var i = 0;
                    for (i = 0; i < length; i++) {
                        if (permissions[i] && permissions[i].Permission !== 0) {
                            var ep = { EntityId: SecurityUtil.entity.Id, RoleOrUserId: permissions[i].UserRoleId, PermissionLevel: permissions[i].Permission };
                            if (permissions[i].User) {
                                SecurityUtil.entity.UserPermissions.push(ep);
                            }
                            else {
                                SecurityUtil.entity.RolePermissions.push(ep);
                            }
                        }
                    }
                    var success = function (result) {
                        $('#container_security .success_message').show();
                        $('#container_security .success_message').fadeOut(2000, func);

                        if (SecurityUtil.changeSuccessCallback) {
                            SecurityUtil.changeSuccessCallback(result);
                        }
                        setTimeout(function () {
                            $('body').trigger('MassDocumentUpdated', { ids: [SecurityUtil.entity.Id] });
                        }, 500);
                    };
                    var failure = function (jqXHR, textStatus, error) {
                        func(true);
                        ErrorHandler.addErrors({ 'inbox_folder_contextmenu_error': error.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    };
                    SecurityUtil.serviceProxy.setSecurityInformation(SecurityUtil.entity, success, failure);
                }
            },
            {
                text: Constants.c.close,
                click: function () {
                    SecurityUtil.closeDialog();
                }
            }]
        });
        $('#container_security').dialog('open');
    },
    closeDialog: function () {
        $('#container_name').val('');
        $('#container_security .inbox_create_secclass_dropdown').text('');
        if ($('#container_security .dropdown').data('show') === undefined) {
            $('#container_security .dropdown').data('show', false);
        }
        $('#container_security .dropdown').data('show', false);
        $('#container_security .children').hide();
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        $('#container_security').dialog('close');
    },
    getSecPermData: function (entityId, type, isGridChange, successCallback) {
        SecurityUtil.changeSuccessCallback = successCallback;
        this.type = type;
        SecurityUtil.init();
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        if (type === 'Document') {
            this.serviceProxy = DocumentServiceProxy();
        }
        else if (type === 'Inbox') {
            this.serviceProxy = InboxServiceProxy();
        }
        else if (type === 'Folder') {
            this.serviceProxy = FolderServiceProxy();
        }
        else {
            ErrorHandler.addErrors(Constants.c.notSupported + type);
            SecurityUtil.closeDialog();
            return;
        }
        var success = function (r) {
            var message;
            r.ModifiedOn = null; //No need to send up to server, ModifiedTicks is used.
            SecurityUtil.permissionEditView.changedRights = [];
            SecurityUtil.entity = r;
            if (!SecurityUtil.entity) {
                ErrorHandler.addErrors(Constants.c.documentSecurityNotFound);
                SecurityUtil.closeDialog();
                return;
            }
            message = SecurityUtil.setSecClasses();
            if (!message) {
                message = SecurityUtil.setUsers();
            }
            if (!message) {
                message = SecurityUtil.setRoles();
            }
            if (message) {
                ErrorHandler.addErrors(message);
                SecurityUtil.closeDialog();
                return;
            }
            $('#container_name').val(SecurityUtil.entity.Title);
            SecurityUtil.viewData.selected = $(SecurityUtil.userSelection).first();
            $('#perms').html('');
            $('#perms').append(SecurityUtil.permissionEditView.render(0, true).$el);
            $('#container_security .container_sec_class_container').show();
        };
        var failure = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        };
        var complete = function () {
            $('#cont_sec_load').remove();
        };
        this.serviceProxy.getSecurityInformation(entityId, success, failure, complete);
    },
    setUsers: function () {
        $(this.userSelection).empty();
        var ups = SecurityUtil.entity.UserPermissions;
        var length = ups.length;
        if (length === 0) {
            return;
        }
        var i;
        for (i = 0; i < length; i++) {
            var up = ups[i];
            var user = window.users.get(up.RoleOrUserId);
            if (!user) {
                return Constants.c.securityInformationOutOfDate;
            }
            $(this.userSelection).append('<option value="' + user.get('Id') + '">' + user.get('Username') + '</option>');
            var displayRight = {};
            displayRight.EntityId = SecurityUtil.entity.Id;
            displayRight.UserRoleId = user.get('Id');
            displayRight.User = true;
            displayRight.Permission = up.PermissionLevel;
            this.permissionEditView.changedRights.push(displayRight);
        }
    },
    setRoles: function () {
        $(this.groupSelection).empty();
        var rps = SecurityUtil.entity.RolePermissions;
        var length = rps.length;
        if (length === 0) {
            return;
        }
        var i;
        for (i = 0; i < length; i++) {
            var rp = rps[i];
            var role = window.slimRoles.get(rp.RoleOrUserId);
            if (role === null) {
                return Constants.c.securityInformationOutOfDate;
            }
            $(this.groupSelection).append('<option value="' + role.get('Id') + '">' + role.get('Name') + '</option>');
            var displayRight = {};
            displayRight.EntityId = SecurityUtil.entity.Id;
            displayRight.UserRoleId = role.get('Id');
            displayRight.User = false;
            displayRight.Permission = rp.PermissionLevel;
            this.permissionEditView.changedRights.push(displayRight);
        }
    },
    setSecClasses: function () {
        var found = false;
        $('#container_security .dropdown .container_secclass_dropdown').val('');
        $('#container_security .dropdown .container_secclass_dropdown').text('');
        $('#container_security .children').empty();
        $('#container_security .children').append($('<li></li>')
            .append($('<span></span>')
                .addClass('anchor')
                .attr('title', '')
                .attr('name', '')
                .html('')
            )
        );
        var length = window.slimSecurityClasses.length;
        var i;
        for (i = 0; i < length; i++) {
            var name = window.slimSecurityClasses.at(i).get('Name');
            var id = window.slimSecurityClasses.at(i).get('Id');
            $('#container_security .children').append($('<li></li>')
                    .append($('<span class="securityLi"></span>')
                        .addClass('anchor')
                        .attr('title', name)
                        .attr('name', id)
                        .html(name)
                    )
                );

            if (id === SecurityUtil.entity.SecurityClassId) {
                found = true;
                $('#container_security .dropdown .container_secclass_dropdown').val(id);
                $('#container_security .dropdown .container_secclass_dropdown').text(name);
                $('#container_security .dropdown .container_secclass_dropdown').prop('title', name);//#7000 : setting tooltip of selected security class
            }
        }

        //#7000 : setting tooltip of selected security class
        $(".securityLi").click(function () {
            $('#container_security .dropdown .container_secclass_dropdown').prop('title', $(this).attr('title'));
        });


        if (!found && SecurityUtil.entity.SecurityClassId) {
            return Constants.c.securityInformationOutOfDate;
        }
    },
    addUser: function () {
        $('#cont_sec_selectUser').dialog({
            autoOpen: false,
            height: 200,
            width: 300,
            modal: true,
            buttons: [{
                text: Constants.c.select,
                click: function () {
                    SecurityUtil.userAdded(this);
                }
            },
            {
                text: Constants.c.close,
                click: function () {
                    $(this).dialog("close");
                }
            }]
        });
        $('#cont_sec_selectUser select').empty();
        // using the window.users collection for displaying users, only display site users
        var users = new Users(Utility.getUsers(null, window.users, true, true));
        var userList = _.toArray($('#container_security select[name="userSelection"]').children().get());
        var userModel;
        var func = function (u) {
            return $(u).val() === userModel.get('Id');
        };
        users.each(function (user) {
            userModel = user;
            var du = _.detect(userList, func);
            if ($.isEmptyObject(du)) {
                $('#cont_sec_potentialUsers').append('<option value="' + user.get('Id') + '">' + user.get('Username') + '</option>');
            }
        });
        if ($('#cont_sec_potentialUsers').children().length === 0) {
            alert(Constants.c.allUsersSelected);
            return;
        }
        $('#cont_sec_selectUser').dialog('open');
    },
    userAdded: function (dialog) {
        $(dialog).dialog("close");
        this.clearSelection("groupSelection");
        this.clearSelection("userSelection");
        var $users = $('#cont_sec_potentialUsers option:selected');
        $users.appendTo($(SecurityUtil.userSelection));
        var disabled = !($users && $users.length > 0);
        this.toggleRemoveButton(disabled, 'remove_user_one_off');
        this.toggleRemoveButton(true, 'remove_role_one_off');
        this.securitySelectionChanged();
    },
    removeUser: function () {
        var ids = $(SecurityUtil.userSelection).val();
        var i = 0;
        var that = this;
        if (!ids || ids.length === 0) {
            return;
        }
        _.each(ids, function (id) {
            var name = $(SecurityUtil.userSelection + ' option:selected').text();
            $(SecurityUtil.userSelection).find('[value="' + id + '"]').remove();
            $("#cont_sec_potentialUsers").append('<option value="' + id + '">' + name + '</option>');
            for (i = 0; i < that.permissionEditView.changedRights.length; ++i) {
                if (that.permissionEditView.changedRights[i].UserRoleId === id) {
                    that.permissionEditView.changedRights.splice(i, 1);
                    that.permissionEditView.multiSelectUserIds.pop(id);
                    break;
                }
            }
            that.removedUserRoleIds.push(id);
        });
        if ($(SecurityUtil.userSelection).find(':selected').length === 0) {
            this.toggleRemoveButton(true, 'remove_user_one_off');
        }
        this.userSelectionChanged();
    },
    addRole: function () {
        $('#cont_sec_selectRole').dialog({
            autoOpen: false,
            height: 200,
            width: 300,
            modal: true,
            buttons: [{
                text: Constants.c.select,
                click: function () {
                    SecurityUtil.roleAdded(this);
                }
            },
            {
                text: Constants.c.close,
                click: function () {
                    $(this).dialog("close");
                }
            }]
        });
        $('#cont_sec_selectRole option').remove();
        // using the window.slimRoles collection for displaying roles
        var roles = window.slimRoles;
        var roleList = _.toArray($('#container_security select[name="groupSelection"]').children().get());
        roles.each(function (role) {
            var func = function (r) {
                return $(r).val() === role.get('Id');
            };
            var du = _.detect(roleList, func);
            if ($.isEmptyObject(du)) {
                $('#cont_sec_potentialRoles')
                .append('<option value="' + role.get('Id') + '">' + role.get('Name') + '</option>');
            }
        });
        if (window.slimRoles.length === 0) {
            alert(Constants.c.noGroupAvailable);
            return;
        }
        if ($('#cont_sec_potentialRoles').children().length === 0) {
            alert(Constants.c.allGroupsSelected);
            return;
        }
        $('#cont_sec_selectRole').dialog('open');
    },
    roleAdded: function (dialog) {
        $(dialog).dialog("close");
        this.clearSelection("groupSelection");
        this.clearSelection("userSelection");
        var $roles = $('#cont_sec_potentialRoles option:selected');
        $roles.appendTo($(SecurityUtil.groupSelection));
        this.toggleRemoveButton(true, 'remove_user_one_off');
        var disabled = !($roles && $roles.length > 0);
        this.toggleRemoveButton(disabled, 'remove_role_one_off');
        // TODO it would be nice to scroll to the selected item now/here; and in userAdded()
        this.securitySelectionChanged();
    },
    removeRole: function () {
        var ids = $(SecurityUtil.groupSelection).val();
        var i = 0;
        var that = this;
        if (!ids || ids.length === 0) {
            return;
        }
        var func = function (r) { return (r === that.permissionEditView.changedRights[i].UserRoleId); };
        _.each(ids, function (id) {
            var name = $(SecurityUtil.groupSelection + ' option:selected').text();
            $(SecurityUtil.groupSelection).find('[value="' + id + '"]').remove();
            $("#cont_sec_selectRole").append('<option value="' + id + '">' + name + '</option>');
            for (i = 0; i < that.permissionEditView.changedRights.length; ++i) {
                id = _.find(ids, func);
                if (id) {
                    that.permissionEditView.changedRights.splice(i, 1);
                    that.permissionEditView.multiSelectRoleIds.pop(id);
                    break;
                }
            }
            that.removedUserRoleIds.push(id);
        });
        if ($(SecurityUtil.groupSelection).find(':selected').length === 0) {
            this.toggleRemoveButton(true, 'remove_role_one_off');
        }
        this.groupSelectionChanged();
    },
    clearSelection: function (selectName) {
        $("#container_security select[name='" + selectName + "']").attr('selectedIndex', '-1').children("option:selected").removeAttr("selected");
    },
    toggleRemoveButton: function (disable, removeName) {
        $("#container_security input[name='" + removeName + "']").prop('disabled', disable);
    },
    userSelectionChanged: function () {
        var $userSel = $(this.userSelection);
        var $selectedUsers = $userSel.find('option:selected');
        if ($selectedUsers.length === 0) {
            this.toggleRemoveButton(false, 'remove_user_one_off');
        }
        this.clearSelection("groupSelection");
        this.toggleRemoveButton(true, 'remove_role_one_off');
        this.securitySelectionChanged();
    },
    groupSelectionChanged: function () {
        var $groupSel = $(this.groupSelection);
        var $selectedRoles = $groupSel.find('option:selected');
        if ($selectedRoles.length === 0) {
            this.toggleRemoveButton(false, 'remove_role_one_off');
        }
        this.clearSelection("userSelection");
        this.toggleRemoveButton(true, 'remove_user_one_off');
        this.securitySelectionChanged();
    },
    changeRights: function (isUser, id, selectedUsers, selectedRoles) {
        var userIds = [];
        var roleIds = [];
        var user;
        var role;
        var that = this;
        var i;
        _.each(selectedUsers, function (u) {
            for (i = 0; i < that.removedUserRoleIds.length; ++i) {
                if (that.removedUserRoleIds[i] === u.value) {
                    that.removedUserRoleIds.splice(i, 1);
                    break;
                }
            }
            userIds.push(u.value);
        });
        _.each(selectedRoles, function (r) {
            for (i = 0; i < that.removedUserRoleIds.length; ++i) {
                if (that.removedUserRoleIds[i] === r.value) {
                    that.removedUserRoleIds.splice(i, 1);
                    break;
                }
            }
            roleIds.push(r.value);
        });
        var displayRight = this.permissionEditView.getCachedPermission(id);
        if (displayRight === undefined) {
            displayRight = {};
            displayRight.EntityId = SecurityUtil.entity.Id;
            displayRight.EntityType = SecurityUtil.type;
            displayRight.UserRoleId = id;
            displayRight.User = isUser;
            if (isUser) {
                for (user in SecurityUtil.entityUserPerm) {
                    if (SecurityUtil.entityUserPerm.hasOwnProperty(user)) {
                        if (SecurityUtil.entityUserPerm[user].RoleOrUserId === id) {
                            displayRight.Permission = SecurityUtil.entityUserPerm[user].PermissionLevel;
                            break;
                        }
                    }
                }
            }
            else {
                for (role in SecurityUtil.entityRolePerm) {
                    if (SecurityUtil.entityRolePerm.hasOwnProperty(role)) {
                        if (SecurityUtil.entityRolePerm[role].RoleOrUserId === id) {
                            displayRight.Permission = SecurityUtil.entityRolePerm[role].PermissionLevel;
                            break;
                        }
                    }
                }
            }
            this.permissionEditView.setTrackablePermissions(displayRight, false, userIds, roleIds);
        }
        else {
            this.permissionEditView.setTrackablePermissions(displayRight, false, userIds, roleIds);
        }
    },
    securitySelectionChanged: function () {
        var selectedUsers = $(this.userSelection + ' option:selected');
        var selectedRoles = $(this.groupSelection + ' option:selected');
        var name;
        var id;
        var isUser = true;
        if (selectedUsers.length === 0 && selectedRoles.length === 0) {
            $('#container_security .cont_sec_perm>span').html(Constants.c.selectuserorrole);
            SecurityUtil.permissionEditView.setPermissions(0); // clear permissions                        
            return;
        }

        if (selectedUsers.length === 1) {
            name = _.first(selectedUsers).text;
        }
        else if (selectedRoles.length === 1) {
            name = _.first(selectedRoles).text;
        }

        if (name === undefined) {
            $('#container_security .cont_sec_perm>span').html(Constants.c.permissionsforMulti);
        }
        else {
            $('#container_security .cont_sec_perm>span').html(Constants.c.permissionsfor + name);
        }

        if (selectedUsers.length > 0) {
            id = _.first(selectedUsers).value;
        }
        else {
            id = _.first(selectedRoles).value;
            isUser = false;
        }
        this.changeRights(isUser, id, selectedUsers, selectedRoles);
    },
    applyEventHandler: function () {
        $('#container_security').delegate('input[name="add_user_one_off"]', 'click', function () {
            SecurityUtil.addUser();
        });
        $('#container_security').delegate('input[name="remove_user_one_off"]', 'click', function () {
            SecurityUtil.removeUser();
        });
        $('#container_security').delegate('input[name="add_role_one_off"]', 'click', function () {
            SecurityUtil.addRole();
        });
        $('#container_security').delegate('input[name="remove_role_one_off"]', 'click', function () {
            SecurityUtil.removeRole();
        });
        $('#container_security').delegate('select[name="userSelection"]', 'change', function (event) {
            var $targ = $(event.currentTarget);
            var disabled = $targ.find(':selected').length === 0;
            SecurityUtil.toggleRemoveButton(disabled, 'remove_user_one_off');
            SecurityUtil.userSelectionChanged();
        });
        $('#container_security').delegate('select[name="groupSelection"]', 'change', function (event) {
            var $targ = $(event.currentTarget);
            var disabled = $targ.find(':selected').length === 0;
            SecurityUtil.toggleRemoveButton(disabled, 'remove_role_one_off');
            SecurityUtil.groupSelectionChanged();
        });
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
    toggleDialogSecClassDropdown: function ($diagSel, showDropdown) {
        if (showDropdown) {
            $diagSel.find('.cont_sec_sec').height(70);
            $diagSel.find('.container_secclass_title').show();
            $diagSel.find('.container_security_class.dropdown').show();
        }
        else {
            $diagSel.find('.container_secclass_title').hide();
            $diagSel.find('.container_security_class.dropdown').hide();
            $diagSel.find('.cont_sec_sec').height(30);
        }
    }
};