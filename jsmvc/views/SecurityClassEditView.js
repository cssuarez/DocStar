// View for editing a SecurityClass
// Renders a compiled template using doU.js
/// <reference path="../../Content/LibsInternal/Utility.js" />
var SecurityClassEditView = Backbone.View.extend({
    viewData: {},
    permissionEditView: {},
    removedUserRoleIds: [],
    events: {
        "change select[name='Id']": "changeSelection",
        "change select[name='userSelection']": "userSelectionChanged",
        "change select[name='groupSelection']": "groupSelectionChanged",
        "click input[name='save_sc']": "saveChanges",
        "click input[name='delete_sc']": "kill",
        "click input[name='add_user']": "addUser",
        "click input[name='remove_user']": "removeUser",
        "click input[name='add_role']": "addRole",
        "click input[name='remove_role']": "RemoveRole",
        "click input[name='Name']": "clickName"
    },

    setNewClass: function () {
        this.viewData.selected = this.getNewClass(window.securityClasses);
        return this;
    },

    clickName: function () {
        if (this.$("select[name='Id']").val() === Constants.c.emptyGuid) {
            if (this.$("input[name='Name']").val() === Constants.c.newTitle) {
                this.$("input[name='Name']").val("");
            }
        }
    },
    addUser: function () {
        var users = $('#potentialUsers').children().length;
        var selUsers = this.$('[name="userSelection"] > option').length;
        if (users === 0) {
            ErrorHandler.addErrors(selUsers === 0 ? Constants.c.noUsersAvailable : Constants.c.allUsersSelected);
            return;
        }
        $("#selectUser").dialog("open");
    },
    userAdded: function (dialog) {
        $(dialog).dialog("close");
        this.clearSelection("groupSelection");
        this.clearSelection("userSelection");
        var potentialUsers = $('#potentialUsers option:selected');
        $('#potentialUsers option:selected').appendTo("select[name='userSelection']");
        var i = 0;
        var length = potentialUsers.length;
        var addedUsers = "";
        for (i; i < length; i++) {
            if (addedUsers === "") {
                addedUsers = potentialUsers[i].value;
            }
            else {
                addedUsers = addedUsers + "," + potentialUsers[i].value;
            }
        }
        var addedUsersArray = addedUsers.split(',');
        this.$("select[name='userSelection']").val(addedUsersArray);
        this.securitySelectionChanged();
    },
    removeUser: function () {
        var ids = this.$("select[name='userSelection']").val();
        var i = 0;
        var that = this;
        if (!ids || ids.length === 0) {
            return;
        }
        _.each(ids, function (id) {
            var name = that.$("select[name='userSelection'] option[value='" + id + "']:selected").text();
            that.$("select[name='userSelection']").find('[value="' + id + '"]').remove();
            var added = false;
            var option = '<option value="' + id + '">' + name + '</option>';
            $("#potentialUsers option").each(function () {
                if ($(this).text().toLowerCase() > name.toLowerCase()) {
                    $(this).before(option);
                    added = true;
                    return false;
                }
            });
            if (!added) {
                $("#potentialUsers").append(option);
            }
            for (i = 0; i < that.permissionEditView.changedRights.length; ++i) {
                if (that.permissionEditView.changedRights[i].UserRoleId === id) {
                    that.permissionEditView.changedRights.splice(i, 1);
                    break;
                }
            }
            that.removedUserRoleIds.push(id);
        });
        this.userSelectionChanged();
    },
    addRole: function () {
        if ($('#potentialRoles').children().length === 0) {
            if ($('select[name="groupSelection"]').children().length === 0) {
                alert(Constants.c.noGroupAvailable);
            } else {
                alert(Constants.c.allGroupsSelected);
            }
            return;
        }
        $("#selectRole").dialog("open");
    },
    roleAdded: function (dialog) {
        $(dialog).dialog("close");
        this.clearSelection("groupSelection");
        this.clearSelection("userSelection");
        var potentialRoles = $('#potentialRoles option:selected');
        $('#potentialRoles option:selected').appendTo("select[name='groupSelection']");
        var i = 0;
        var length = potentialRoles.length;
        var addedRoles = "";
        for (i; i < length; i++) {
            if (addedRoles === "") {
                addedRoles = potentialRoles[i].value;
            }
            else {
                addedRoles = addedRoles + "," + potentialRoles[i].value;
            }
        }
        var addedRolesArray = addedRoles.split(',');
        this.$("select[name='groupSelection']").val(addedRolesArray);
        // TODO it would be nice to scroll to the selected item now/here; and in userAdded()
        this.securitySelectionChanged();
    },
    RemoveRole: function () {
        var ids = this.$("select[name='groupSelection']").val();
        var i = 0;
        var that = this;
        if (!ids || ids.length === 0) {
            return;
        }
        var func = function (r) { return (r === that.permissionEditView.changedRights[i].UserRoleId); };
        _.each(ids, function (id) {
            var name = that.$("select[name='groupSelection'] option[value='" + id + "']:selected").text();
            that.$("select[name='groupSelection']").find('[value="' + id + '"]').remove();
            var added = false;
            var option = '<option value="' + id + '">' + name + '</option>';
            $("#potentialRoles option").each(function () {
                if ($(this).text().toLowerCase() > name.toLowerCase()) {
                    $(this).before(option);
                    added = true;
                    return false;
                }
            });
            if (!added) {
                $("#potentialRoles").append('<option value="' + id + '">' + name + '</option>');
            }
            for (i = 0; i < that.permissionEditView.changedRights.length; ++i) {
                id = _.find(ids, func);
                if (id) {
                    that.permissionEditView.changedRights.splice(i, 1);
                    break;
                }
            }
            that.removedUserRoleIds.push(id);
        });
        this.groupSelectionChanged();
    },
    clearSelection: function (selectName) {
        $("select[name='" + selectName + "']").attr('selectedIndex', '-1').children("option:selected").removeAttr("selected");
    },
    userSelectionChanged: function () {
        this.clearSelection("groupSelection");
        this.securitySelectionChanged();
    },
    groupSelectionChanged: function () {
        this.clearSelection("userSelection");
        this.securitySelectionChanged();
    },
    securitySelectionChanged: function () {
        var selectedUsers = this.$("select[name='userSelection'] option:selected");
        var selectedRoles = this.$("select[name='groupSelection'] option:selected");
        var name;
        var id;
        var isUser = true;
        var that = this;
        if (selectedUsers.length === 0 && selectedRoles.length === 0) {
            $('#permissionsLegend').html(Constants.c.selectuserorrole);
            that.permissionEditView.setPermissions(0); // clear permissions
            return;
        }

        if (selectedUsers.length === 1) {
            name = _.first(selectedUsers).text;
        }
        else if (selectedRoles.length === 1) {
            name = _.first(selectedRoles).text;
        }

        if (name === undefined) {
            $('#permissionsLegend').html(Constants.c.permissionsforMulti);
        }
        else {
            $('#permissionsLegend').html(Constants.c.permissionsfor + name);
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
    changeRights: function (isUser, id, selectedUsers, selectedRoles) {
        var userIds = [];
        var roleIds = [];
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
            displayRight.EntityId = this.viewData.selected.get("Id");
            displayRight.EntityType = "SecurityClass";
            displayRight.UserRoleId = id;
            displayRight.User = isUser;
            displayRight.Permission = 0;
            this.permissionEditView.setTrackablePermissions(displayRight, false, userIds, roleIds);
        }
        else {
            this.permissionEditView.setTrackablePermissions(displayRight, false, userIds, roleIds);
        }
    },
    changeSelection: function () {
        var id = this.$("select[name='Id']").val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        }
        else {
            var model = window.securityClasses.get(id);
            this.viewData.selected = model;
        }
        this.render();
    },
    handleKeyPress: function (event) {
        if (event.keyCode === 13) {
            this.saveChanges();
        }
    },
    updateSecurityClassList: function () {
        var secResult = window.slimSecurityClasses;
        $('#inbox_contextmenu .children')[0].innerHTML = "";
        $('#inbox_contextmenu .children').append($('<li></li>').append($('<span></span>').addClass('anchor').attr('title', '').attr('name', '')));
        $('#folder_contextmenu .children')[0].innerHTML = "";
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
        $('#folder_contextmenu').data('folderSecClassCreated', true);
    },
    saveChanges: function () {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var rights = this.permissionEditView.getTrackablePermissions();
        var length = rights.length;
        var i = 0;
        var attrs = DTO.getDTO("#securityClassDTO");
        attrs.UserPermissions = [];
        attrs.RolePermissions = [];
        for (i; i < length; i++) {
            // Only add Permissions if they aren't 0, they are removed server side from the DB.
            // If Permission is not 0 then the role/user permission is added back into the DB, 
            // otherwise the permission entry remains removed from the DB.
            if (rights[i].Permission !== 0) {
                var rightsObj = {
                    EntityId: rights[i].EntityId,
                    PermissionLevel: rights[i].Permission,
                    RoleOrUserId: rights[i].UserRoleId
                };
                if (rights[i].User) {
                    attrs.UserPermissions.push(rightsObj);
                }
                else {
                    attrs.RolePermissions.push(rightsObj);
                }
            }
        }
        if (attrs.Id === Constants.c.emptyGuid) {
            delete attrs.Id; //This will mark the class as a new class.
        }
        var newClass = new SecurityClass(attrs);
        if (!this.isNameValidHandling(attrs.Name, 'Name')) {
            $('#save_buzz').attr('disabled', false);
            $('#del_buzz').attr('disabled', false);
            return false;
        }
        newClass.on("invalid", function (model, error) { that.handleErrors(model, error); });
        if (this.isUnique(attrs) === true) {
            $('input[name="save_sc"]').attr('disabled', 'disabled');
            $('input[name="delete_sc"]').attr('disabled', 'disabled');
            newClass.save(attrs, {
                success: function (model, result) {
                    that.removedUserRoleIds = [];
                    $('input[name="save_sc"]').removeAttr('disabled');
                    $('input[name="delete_sc"]').removeAttr('disabled');

                    if (typeof (result) !== 'boolean') {    //On create update the id of the model and add to slim security classes.
                        model.set({ "id": result.Id }, { "silent": true });
                        window.slimSecurityClasses.add({ Id: result.Id, Name: result.Name, EffectivePermissions: 0 /*No Effective permissions on Security Classes*/ });
                    }
                    else if (window.slimSecurityClasses) {  //On update update the slim security classes.
                        var se = window.slimSecurityClasses.get(attrs.Id);
                        if (se) {
                            se.set({ Name: attrs.Name });
                        } else {
                            window.slimSecurityClasses.add({ Id: attrs.Id, Name: attrs.Name, EffectivePermissions: 0 });
                        }
                    }
                    that.saveSuccess(model, result, attrs.Id, window.securityClasses, that);
                    that.updateSecurityClassList();
                },
                failure: function (message) {
                    that.handleErrors(newClass, message);
                }
            });
        } else {
            ErrorHandler.addErrors({ 'Name': Constants.c.duplicateNameError }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
    },
    /*
    * isUnique check the new against the existing.  do not allow same names on two contentTypes
    * if there is an update and the guid is the same then it is considered unique...
    * @return boolean
    */
    isUnique: function (attrs) {
        var unique = true;
        window.securityClasses.each(function (item) {
            if (attrs.Name.toLowerCase() === item.get('Name').toLowerCase()) {
                if (attrs.Id !== item.get('Id')) {
                    unique = false;
                }
            }
        });
        return unique;
    },

    handleErrors: function (model, error) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var errors = {};
        if (error.statusText === undefined) {
            errors.errors_sc = error;
        }
        else {
            errors.errors_sc = error.statusText;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    },

    kill: function (e) {
        var that = this;
        var id = this.$("select[name='Id']").val();
        if (id !== Constants.c.emptyGuid) {
            var model = window.securityClasses.get(id);
            if (window.securityClasses.length <= 2) {
                that.handleErrors(model, Constants.c.securityClassMinimumError);
                return;
            }
            Utility.toggleInputButtons('input[name="save_sc"], input[name="delete_sc"]', false);
            // Prompt for a replacement security class
            var $diagSelector = $('#replace_sc');
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            Utility.enableButtons([Constants.c.ok, Constants.c.close]);
            $diagSelector.dialog({
                title: Constants.c.selectSecurityClass,
                width: 440,
                minWidth: 400,
                maxWidth: $(window).width(),
                height: 150,
                minHeight: 150,
                maxHeight: $(window).height(),
                modal: true,
                buttons: [{
                    text: Constants.c.ok,
                    click: function () {
                        Utility.disableButtons([Constants.c.ok], $diagSelector);
                        var replaceDialog = this;
                        var replaceId = $(this).find('select option:selected').val();
                        var success = function () {
                            window.securityClasses.remove(model);
                            if (window.slimSecurityClasses) {
                                var sModel = window.slimSecurityClasses.get(id);
                                window.slimSecurityClasses.remove(sModel);
                            }
                            that.updateSecurityClassList();
                        };
                        var complete = function () {
                            Utility.enableButtons([Constants.c.ok, Constants.c.close]);
                            Utility.toggleInputButtons('input[name="save_sc"], input[name="delete_sc"]', true);
                            $(replaceDialog).dialog('close');
                            $('body').trigger('MassDocumentUpdated');
                        };
                        var failure = function (message) {
                            that.handleErrors(model, message);
                            Utility.toggleInputButtons('input[name="save_sc"], input[name="delete_sc"]', true);
                        };
                        if (!replaceId || replaceId === Constants.c.emptyGuid) {
                            Utility.toggleInputButtons('input[name="save_sc"], input[name="delete_sc"]', true);
                            Utility.enableButtons([Constants.c.ok, Constants.c.close]);
                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                            ErrorHandler.addErrors({ replacementId: Constants.c.securityClassReplacementRequired }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '#replace_sc select');
                        }
                        else {
                            model.destroy({ success: success, failure: failure, complete: complete, ReplacementSecurityClassId: replaceId, wait: true });
                        }
                    }
                },
                {
                    text: Constants.c.close,
                    click: function () {
                        $(this).dialog('close');
                    }
                }],
                open: function (event, ui) {
                    // Fill out replacement security class list (excluded one being replaced, add a no replacement option)
                    that.redrawReplacements();
                },
                close: function (event, ui) {
                    Utility.toggleInputButtons('input[name="save_sc"], input[name="delete_sc"]', true);
                }
            });
        }
        else {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            ErrorHandler.addErrors({ errors_sc: Constants.c.cannotDeleteNew }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
    },
    redrawReplacements: function () {
        $('#replace_sc select option').remove();
        $('#replace_sc .replace_text').text($('#securityClassDTO').find('select[name="Id"] option:selected').text());
        window.securityClasses.each(function (item) {
            //skip selected and -- New -- (emptyGuid);
            var scId = item.get('Id');
            var scName = item.get('Name');
            if (scId === Constants.c.emptyGuid || scId === $('#securityClassDTO').find('select[name="Id"]').val()) {
                return;
            }
            $('#replace_sc select').append($('<option/>').val(scId).text(scName));
        });
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editsecurityclasslayout'));
        return this;
    },

    render: function () {
        var that = this;
        //Fix for jqueryUI.Dialog creating duplicate node ids in the DOM. Looks funny I know but it works.
        $('#selectUser').remove();
        $('#selectRole').remove();
        // Refresh viewData.list

        var newItem = new SecurityClass({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle });
        this.viewData.list = window.securityClasses.getNewList(newItem);

        this.viewData.listu = new Users(Utility.getUsers(null, window.users, true, true));  // Used for adding users to security classes, display only site users

        this.viewData.listr = window.slimRoles;

        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }
        $(this.el).html(this.compiledTemplate(this.viewData));
        this.delegateEvents(this.events);
        if (this.permissionEditView && this.permissionEditView.close) {
            this.permissionEditView.close();
        }
        this.permissionEditView = new PermissionEditView();
        this.$el.find('.permissions').append(this.permissionEditView.render().$el);
        this.preloadRights();
        $('#selectUser').dialog({
            title: Constants.c.selectUser,
            autoOpen: false,
            height: 200,
            width: 300,
            modal: true,
            buttons: {
                'Select': function () { that.userAdded(this); },
                Close: function () {
                    $(this).dialog("close");
                }
            }
        });
        $('#selectRole').dialog({
            title: Constants.c.selectGroup,
            autoOpen: false,
            height: 200,
            width: 300,
            modal: true,
            buttons: {
                "Select": function () { that.roleAdded(this); },
                Close: function () {
                    $(this).dialog("close");
                }
            }
        });
        return this;
    },
    preloadRights: function () {
        var that = this;
        var userrights = this.viewData.selected.get("UserPermissions");
        var rolerights = this.viewData.selected.get("RolePermissions");
        var classId = this.viewData.selected.get("Id");
        _.each(userrights, function (item) {
            that.permissionEditView.changedRights.push(that.generateDisplayRight(classId, item.RoleOrUserId, true, item.PermissionLevel));
        });
        _.each(rolerights, function (item) {
            that.permissionEditView.changedRights.push(that.generateDisplayRight(classId, item.RoleOrUserId, false, item.PermissionLevel));
        });
    },
    generateDisplayRight: function (classId, userRoleId, isUser, permission) {
        var displayRight = {};
        displayRight.EntityId = classId;
        displayRight.EntityType = "SecurityClass";
        displayRight.UserRoleId = userRoleId;
        displayRight.User = isUser;
        displayRight.Permission = permission;
        return displayRight;
    }

});
