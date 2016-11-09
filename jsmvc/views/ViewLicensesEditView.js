var ViewLicensesEditView = Backbone.View.extend({
    viewData: {},
    proxy: UserServiceProxy(),
    bulkdataproxy: BulkDataServiceProxy(),
    events: {
        "click #create_guest_user": "showdialog",
        "click input[name='save_user']": "saveChanges",
        "click input[name='delete_user']": "deleteUser",
        "click input[name='upgrade_user']": "upgradeUser",
        "change select[name='Id']": "changeSelection"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('viewlicenseslayout'));
        $('#ui_message_exception').dialog({
            title: Constants.c.user,
            width: 'auto',
            autoOpen: false,
            resizable: false,
            modal: true,
            buttons: [{
                text: Constants.c.close,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
        this.listenTo(window.users, 'remove', this.render);
        return this;
    },
    render: function () {
        var newItem = new User({ Id: Constants.c.emptyGuid, Username: Constants.c.newTitle, FirstName: '', LastName: '', DistinguishedName: '' });
        this.viewData.list = new Users(Utility.getReadOnlyUsers(null, window.users, true, true)).getNewList(newItem);
        this.viewData.listr = window.slimRoles;
        this.viewData.gp = window.gatewayPermissions;
        if (!this.viewData.selected) {
            this.setNewClass();
        }
        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html("");
        $(this.el).html(html_data);
        this.delegateEvents(this.events);
        return this;
    },
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(this.viewData.list);
        return this;
    },
    showdialog: function () {
        var that = this;
        $('#readOnlyUserMain').dialog({
            resizable: false,
            title: Constants.c.createReadOnlyUser,
            width: 500,
            maxWidth: $(window).width(),
            height: 'auto',
            maxHeight: $(window).height(),
            modal: true,
            open: function () {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            },
            buttons: [
                   {
                       text: Constants.c.save,
                       click: function () {
                           that.create(this);
                       }
                   },
                {
                    text: Constants.c.close,
                    click: function () {
                        $(this).dialog('close');
                    }
                }]
        });

    },
    create: function (dialog) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var attrs = DTO.getDTO($(dialog).find("#readOnlyUser_layout"));
        var readOnlyUserAttrs = [];
        var users = this.splitUsers($(dialog).find('#readOnlyUsersName'));
        var i = 0;
        var length = users.length;
        if (length === 0) {
            ErrorHandler.addErrors({ 'ReadOnlyUsersName': Constants.c.blankUserName }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        var readOnlyUserAttr;
        var roleMembershipReadOnly = $(dialog).find('[name=RoleMembershipReadOnly]').val();
        for (i; i < length ; i++) {
            var userName = $.trim(users[i]);
            if (userName !== "") {
                if (!Utility.areValidEmailAddresses(userName, 'ReadOnlyUsersName', Constants.c.invalidUserEmailAddress)) {
                    return;
                }
                readOnlyUserAttr = { Active: true, RoleMembership: roleMembershipReadOnly, Username: userName, ReadOnlyUser: true, DirectGatewayPermissions: 0 };
                readOnlyUserAttrs.push(readOnlyUserAttr);
            }
        }
        if (readOnlyUserAttrs.length > 0) {
            var that = this;
            var readOnlyUsersPackage = { Users: readOnlyUserAttrs, SetPassword: true, RequireNewPassword: attrs.RequireNewPassword, SendEmail: attrs.SendEmail, Subject: attrs.Subject, Body: attrs.Body };
            var success = function (result) {
                var createdUsers = result.CreatedUsers;
                var numUsersNotCreated = readOnlyUserAttrs.length - createdUsers.length;
                var idx = 0;
                var usersNotCreated = [];
                var length = readOnlyUserAttrs.length;
                var cuLen = createdUsers.length;
                // Determine users that weren't created
                for (idx = 0; idx < length; idx++) {
                    if (cuLen === 0) {
                        usersNotCreated.push(readOnlyUserAttrs[idx].Username);
                    }
                    else {
                        for (cuIdx = 0; cuIdx < cuLen; cuIdx++) {
                            if (createdUsers[cuIdx].Username !== readOnlyUserAttrs[idx].Username) {
                                usersNotCreated.push(readOnlyUserAttrs[idx].Username);
                                break;
                            }
                        }
                    }
                }
                var closeDialog = true;
                var usersNotCreatedStr = usersNotCreated.join(', ');
                var errMsg = '';
                // Create error messages for when not all users were created.
                if (numUsersNotCreated !== 0 || result.ErrorMessages.length > 0) {
                    errMsg += String.format(Constants.c.notAllUsersCreated, createdUsers.length, readOnlyUserAttrs.length) + '<br><br>';
                }
                if (numUsersNotCreated !== 0) {
                    errMsg += String.format(Constants.c.usersNotCreated, usersNotCreatedStr) + '<br><br>';
                }
                length = result.ErrorMessages.length;
                // Create error messages for when errors outside of creating users occurred, such as failing to send the email
                for (idx = 0; idx < length; idx++) {
                    errMsg += result.ErrorMessages[idx] + '<br>';
                }
                if (errMsg) {
                    closeDialog = false;
                    that.handleErrors(null, { createReadOnlyUserError: errMsg });
                }
                // Refresh the users list and re-render
                that.enableButtons();
                window.users.add(createdUsers);
                if (closeDialog) {
                    $(dialog).dialog('close');
                    DialogsUtil.isDialogInstanceDestroyDialog($(dialog));
                }
                that.viewData.selected = null;
                that.render();
            };
            var failure = function (jqXHR, textStatus, errorThrown) {
                that.handleErrors(null, { createReadOnlyUserError: errorThrown.Message });
            };
            var complete = function () {
                Utility.enableButtons([Constants.c.save, Constants.c.close, Constants.c.save]);
            };
            this.disableButtons();
            Utility.disableButtons([Constants.c.save, Constants.c.close]);
            this.proxy.CreateReadOnlyUsers(readOnlyUsersPackage, success, failure, complete);
        }
    },
    saveChanges: function (ev, upgradeUser) {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var selected = this.viewData.selected;
        var userName = $.trim(this.$el.find("input[name='Username']").val());
        var id = $.trim(this.$el.find("select[name='Id']").val());
        if (id === "" || id === undefined) {
            ErrorHandler.addErrors({ 'Username': Constants.c.passwordCannotBeBlank }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        var options = { SetPassword: true };
        var attrs = DTO.getDTO(this.el);
        // Validate a user doesn't already exist with the Username
        var isNotValid = selected.validate(attrs);
        if (isNotValid && isNotValid.Username) {
            that.handleErrors(null, null, String.format(Constants.c.userNotCreated, userName));
            return;
        }
        attrs.UpdatePassword = true;
        // Valid email check
        if (!Utility.areValidEmailAddresses(userName, 'Username', Constants.c.invalidUserEmailAddress)) {
            return;
        }
        // Password Check
        var hasPass = selected.get('HasPassword');
        if ((!hasPass || attrs.Id === Constants.c.emptyGuid) && !attrs.Password && attrs.UpdatePassword) {   // Didn't already have a pass, still has no pass, and update pass is checked => pass is blank (don't allow for blank passwords)
            ErrorHandler.addErrors({ 'Password': Constants.c.passwordCannotBeBlank }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        if (attrs.Password !== attrs.password_reenter) {   // Passwords don't match
            ErrorHandler.addErrors({ 'Password': Constants.c.passwordsMustMatch }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            ErrorHandler.addErrors({ 'password_reenter': Constants.c.passwordsMustMatch }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        //TODO: Add Password Question and Answer for self service password reset. Business logic already supports this.
        if (hasPass && !attrs.Password) {  // has a password, no password entered to update, update password was checked => don't update (password needs a value to update)
            options.SetPassword = false;
            attrs.UpdatePassword = false; //bypass validation of password.
        }
        else if (attrs.Password) {
            options.Password = attrs.Password;
        }
        if (attrs.Id === Constants.c.emptyGuid) {
            delete attrs.Id; //This will mark the class as a new class.
            selected = new User();
        }
        if (upgradeUser) {
            attrs.ReadOnlyUser = false;
        }
        else {
            attrs.ReadOnlyUser = true;
        }
        attrs.Active = true;
        options.success = function (model, result) {
            var existingUser = window.users.get(result.Id);
            if (existingUser) {
                that.handleErrors(null, null, String.format(Constants.c.userNotCreated, existingUser.get('Username')));
            }
            else {
                that.enableButtons();
                if (typeof (result) !== 'boolean') {
                    model.set({ "id": result.Id }, { "silent": true });
                }
                that.saveSuccess(model, result, result.Id, window.users, that, 'user_Error');
                model = that.viewData.list.get(Constants.c.emptyGuid);
                that.viewData.selected = model;
                that.render();
            }
        };
        options.failure = function (message) {
            that.handleErrors(selected, null, message);
        };
        options.error = function (model, errors) {
            that.handleErrors(model, errors);
        };
        if (id !== Constants.c.emptyGuid) {
            attrs.HasPassword = window.users.get(id).attributes.HasPassword;
        }
        this.disableButtons();
        selected.save(attrs, options);
    },
    upgradeUser: function () {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        if ($.trim(this.$el.find("select[name='Id']").val()) !== Constants.c.emptyGuid) {
            this.saveChanges(null, true);
        } else {
            ErrorHandler.addErrors({ 'Id': Constants.c.cannotUpgradeNew }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        }
    },
    deleteUser: function (e) {
        var that = this;
        //clear errors first        
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var id = $.trim(that.$el.find("select[name='Id']").val());
        var okText = Constants.c.ok;
        var closeText = Constants.c.close;
        if (id !== Constants.c.emptyGuid) {
            $('#replace_u').dialog({
                autoOpen: false,
                title: Constants.c.selectReplacement,
                width: 440,
                minWidth: 400,
                maxWidth: $(window).width(),
                height: 150,
                minHeight: 150,
                maxHeight: $(window).height(),
                modal: true,
                buttons: [{
                    text: okText,
                    click: function () {
                        var id = $.trim(that.$el.find("select[name='Id']").val());
                        var model = window.users.get(id);
                        var DeleteUserPackage = { UserId: id };
                        Utility.disableButtons([okText, closeText]);
                        var replaceDialog = this,
                            replaceItem,
                            replaceId;
                        $("#replace_u select:visible").each(function () {
                            replaceItem = $(this);
                        });
                        if (replaceItem.val() !== 'terminate') {
                            replaceId = replaceItem.val();
                        }
                        if (replaceId !== null) {
                            var success = function () {
                                $('body').trigger('MassDocumentUpdated');
                                that.viewData.list.remove(model);
                                that.viewData.selected = undefined;
                                window.users.remove(model);
                            };
                            var complete = function () {
                                Utility.enableButtons([okText, closeText]);
                                $(replaceDialog).dialog('close');
                            };
                            var failure = function (message) {
                                that.handleErrors(model, null, message);
                            };
                            DeleteUserPackage.ReplacementUserId = replaceId;
                            that.proxy.Delete(DeleteUserPackage, success, failure, complete);
                        } else {
                            Utility.enableButtons([okText, closeText]);
                        }
                    }
                },
                {
                    text: closeText,
                    click: function () {
                        $(this).dialog('close');
                    }
                }]
            });
            that.redrawReplacements();
            $('#replace_u').dialog('open');
        } else {
            var obj = {
                'Id': Constants.c.cannotDeleteNewUser
            };
            ErrorHandler.addErrors(obj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
        }
    },
    redrawReplacements: function () {
        var itemId = $('.unstyledList').find('select[name="Id"]').val();
        if (itemId !== Constants.c.emptyGuid) {
            $('#userToGroupSelect option').remove();
            $('#userToUserSelect option').remove();
            var itemName = $('.unstyledList').find('select[name="Id"] option:selected').text();
            $('#replace_u .replaceDescription').text(String.format(Constants.c.replaceUserOrRole, itemName));
            window.slimRoles.each(function (item) {
                var scId = item.get('Id');
                var scName = item.get('Name');
                if (scId === Constants.c.emptyGuid || scId === itemId) {
                    return;
                }
                $('#userToGroupSelect').append($('<option/>').val(scId).text(scName));
            });
            window.users.each(function (item) {
                var scId = item.get('Id');
                var scName = item.get('Username');
                if (scId === Constants.c.emptyGuid || scId === itemId) {
                    return;
                }
                $('#userToUserSelect').append($('<option/>').val(scId).text(scName));
            });
            $('#userType').off('change').on('change', function (e) {
                if (e.target.value === 'group') {
                    $('#userToGroupSelect').show();
                    $('#userToUserSelect').hide();
                } else {
                    $('#userToUserSelect').show();
                    $('#userToGroupSelect').hide();
                }
            });
        }
    },

    changeSelection: function (e, noRender) {
        var id = this.$el.find("select[name='Id']").val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        }
        else {
            var model = this.viewData.list.get(id);
            this.viewData.selected = model;
        }
        if (!noRender) {
            this.render();
        }

    },
    splitUsers: function ($userNameSelector) {
        var users = [];
        var userSplitedWithComma = $userNameSelector.val().split(",");
        var i = 0;
        var length = userSplitedWithComma.length;
        var userSplitedWithSemiColon = [];
        var usersName;
        for (i; i < length; i++) {
            usersName = $.trim(userSplitedWithComma[i]);
            if (usersName !== "") {
                userSplitedWithSemiColon.push.apply(userSplitedWithSemiColon, usersName.split(";"));
            }
        }
        i = 0;
        length = userSplitedWithSemiColon.length;
        for (i; i < length; i++) {
            usersName = $.trim(userSplitedWithSemiColon[i]);
            if (usersName !== "") {
                users.push.apply(users, usersName.split("\n"));
            }
        }
        return users;
    },
    disableButtons: function () {
        this.$el.find('input[name="save_user"]').prop('disabled', true);
        this.$el.find('input[name="delete_user"]').prop('disabled', true);
        this.$el.find('input[name="create_guest_user"]').prop('disabled', true);
        this.$el.find('input[name="upgrade_user"]').prop('disabled', true);
    },
    enableButtons: function () {
        this.$el.find('input[name="save_user"]').prop('disabled', false);
        this.$el.find('input[name="delete_user"]').prop('disabled', false);
        this.$el.find('input[name="create_guest_user"]').prop('disabled', false);
        this.$el.find('input[name="upgrade_user"]').prop('disabled', false);
    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (model, errors, message) {
        this.enableButtons();
        if (!errors) {
            errors = {
                user_Error: message
            };
        }
        else if (message) {
            errors.user_Error = message;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    }
});