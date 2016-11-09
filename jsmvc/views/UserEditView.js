// View for editing Users
// Renders a compiled template using doU.js
var UserEditView = Backbone.View.extend({

    viewData: {},
    permissionEditView: {},

    events: {
        "change select[name='userType']": "changeUserList",
        "change select[name='Id']": "changeSelection",
        "change input[name='InstanceAdmin']": "togglePermissionsDisplay",
        "click input[name='save_user']": "saveChanges",
        "click input[name='delete_user']": "kill",
        "click input[name='import_user']": "importLDAPUser",
        "click input[name='EnableIntegrated']": "toggleIntegrated",
        "click input[name='UpdatePassword']": "toggleIndependent",
        "click input[name='down_gradeUser']": "downGradeUser"
    },
    changeUserList: function (e, noRender) {
        this.setNewClass();
        this.render();
    },
    //new class is fetched from the controller
    //first element in the list is an empty user
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(this.viewData.list);
        return this;
    },

    clickName: function () {
        if (this.$("select[name='Id']").val() === this.emptyGuid) {
            if (this.$("input[name='Id']").val() === Constatns.c.emptyGuid) {
                this.$("input[name='Username']").val("");
                this.$('select[name="Active"] option[value="true"]').attr('selected', 'selected');
            }
        }
    },

    changeSelection: function (e, noRender) {
        var id = this.$("select[name='Id']").val();
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
    handleKeyPress: function (event) {

        if (event.keyCode === 13) {
            this.saveChanges();
        }

    },

    downGradeUser: function () {
        if ($.trim($("select[name='Id']").val()) !== Constants.c.emptyGuid) {
            this.saveChanges(true);
        }
    },

    saveChanges: function (downgradeUser) {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var selected = this.viewData.selected;
        var userName = $.trim(this.$("input[name='Username']").val());
        var id = $.trim(this.$("select[name='Id']").val());
        var options = { SetPassword: true };

        this.$el.find('input[name="DirectGatewayPermissions"]').val(this.permissionEditView.getPermissions());
        var attrs = DTO.getDTO(this.el);
        if (attrs.Id === Constants.c.emptyGuid) {
            delete attrs.Id; //This will mark the class as a new class.
            selected = new User(attrs);
        }
        var ldapConnection = $('select[name="LDAPConnection"] option:selected');
        attrs.ConnectionId = ldapConnection.attr('id');
        if (!attrs.ConnectionId) {
            delete attrs.ConnectionId;
        }
        // Valid email check
        if (!Utility.areValidEmailAddresses(userName, 'Username', Constants.c.invalidUserEmailAddress)) {
            return;
        }
        // Check isIndependent / isIntegrated, one has to be checked to allow the user to continue
        if (!this.$el.find('input[name="EnableIntegrated"]').is(':checked') && !this.$el.find('input[name="UpdatePassword"]').is(':checked')) {
            ErrorHandler.addErrors({ 'EnableIntegrated': Constants.c.userLoginTypeError }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            ErrorHandler.addErrors({ 'UpdatePassword': Constants.c.userLoginTypeError }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        // Password Check
        var hasPass = attrs.UpdatePassword;
        var updatePass = (attrs.Password === "");
        var existingPass = selected.get('HasPassword');
        if (hasPass && updatePass && !existingPass) {   // Didn't already have a pass, still has no pass 
            ErrorHandler.addErrors({ 'Password': Constants.c.passwordCannotBeBlank }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        if (hasPass && (attrs.Password !== attrs.password_reenter) && !existingPass) {   // Passwords don't match
            ErrorHandler.addErrors({ 'Password': Constants.c.passwordsMustMatch }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            ErrorHandler.addErrors({ 'password_reenter': Constants.c.passwordsMustMatch }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        if (hasPass && existingPass && updatePass) {  // has a password, no password entered to update, update password was checked => don't update (password needs a value to update)
            options.SetPassword = false;
            attrs.UpdatePassword = false;
            attrs.HasPassword = false;
        } else {
            options.Password = attrs.Password;
        }
        //First Name check
        var firstName = $.trim(attrs.FirstName);
        if (firstName.length > 16) {
            ErrorHandler.addErrors({ 'FirstName': Constants.c.longFirstName }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        //Last Name Check
        var lastName = $.trim(attrs.LastName);
        if (lastName.length > 20) {
            ErrorHandler.addErrors({ 'LastName': Constants.c.longLastName }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        // Is integrated check
        if (this.$el.find('input[name="EnableIntegrated"]').is(':checked') && !(attrs.ConnectionId && attrs.DistinguishedName)) {
            if (!attrs.ConnectionId) {
                ErrorHandler.addErrors({ 'LDAPConnection': Constants.c.domainEmptyWarning }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                return;
            }
            if (!attrs.DistinguishedName) {
                ErrorHandler.addErrors({ 'DistinguishedName': Constants.c.distinguishedNameEmptyWarning }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                return;
            }
        }
        if (downgradeUser === true) {
            attrs.ReadOnlyUser = true;
        }
        options.success = function (model, result) {
            that.toggleButtons(false);
            if (typeof (result) !== 'boolean') {    //On create add to slim 
                model.set({ "id": result.Id }, { "silent": true });
            }
            that.saveSuccess(model, result, attrs.Id, window.users, that, 'usr_Error');
        };
        options.failure = function (message) {
            that.handleErrors(selected, null, message);
        };
        options.error = function (model, errors) {
            that.handleErrors(model, errors);
        };
        var dupeField = this.isDuplicate(attrs);
        if (dupeField) {
            var errorInfo = {};
            errorInfo[dupeField] = Constants.c.duplicateUsername;
            ErrorHandler.addErrors(errorInfo, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
        else {
            if (id !== Constants.c.emptyGuid) {
                attrs.Flags = window.users.get(id).attributes.Flags;
                attrs.SiteUser = window.users.get(id).attributes.SiteUser;
                attrs.HasPassword = hasPass;
            }
            this.toggleButtons(true);
            selected.save(attrs, options);
        }
    },
    toggleButtons: function (disable) {
        this.$el.find('.buttons input[type="button"]').prop('disabled', disable);
    },
    /*
    * isDuplicate check the new username and upn against the existing values of both
    * if there is an update to the contents and the guid is the same then it is considered unique...
    * @return: string, name of field that is duplicated or undefined of neither is a duplicate (i.e. both are unique)
    */
    isDuplicate: function (attrs) {
        var dupeField;
        var lcUsername = attrs.Username.toLowerCase();
        var lcUPN = attrs.UserPrincipalName.toLowerCase();
        this.viewData.list.each(function (item) {
            if (attrs.Id === Constants.c.newGuid || attrs.Id !== item.get('Id')) {
                var itemLcUserName = item.get('Username').toLowerCase();
                var itemLcUPN = item.get('UserPrincipalName') ? item.get('UserPrincipalName').toLowerCase() : null;
                if (lcUsername === itemLcUserName || lcUsername === itemLcUPN) {
                    dupeField = 'Username';
                    return false;
                }
                if (lcUPN && (lcUPN === itemLcUserName || lcUPN === itemLcUPN)) {
                    dupeField = 'UserPrincipalName';
                    return false;
                }
            }
        });
        return dupeField;
    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (model, errors, message) {
        this.toggleButtons(false);
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        if (!errors) {
            errors = {
                user_Error: message
            };
        }
        else if (message) {
            errors.user_Error = message;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    },
    kill: function (e) {
        //clear errors first
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var id = $('select[name="Id"]').val(),
            that = this,
            model = window.users.get(id),
            okText = Constants.c.ok,
            closeText = Constants.c.close;
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
                                window.users.remove(model);
                            };
                            var complete = function () {
                                Utility.enableButtons([okText, closeText]);
                                $(replaceDialog).dialog('close');
                            };
                            var failure = function (message) {
                                that.handleErrors(model, null, message);
                            };
                            id = $('select[name="Id"]').val();
                            model = window.users.get(id);
                            model.destroy({ success: success, failure: failure, complete: complete, ReplacementUserId: replaceId });
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
            new Users(Utility.getUsers(null, window.users, true, true)).each(function (item) {
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
    importLDAPUser: function () {
        this.closeLDAPImport();
        this.importLDAPView = new ImportLDAPUsersView();
        var that = this;
        this.importLDAPView.render();
    },
    toggleIndependent: function () {
        if ($('.enabledIndependent').hasClass('hidden')) {
            $('.enabledIndependent').show();
            $('.enabledIndependent').removeClass('hidden');
        }
        else {
            $('.enabledIndependent').hide();
            $('.enabledIndependent').addClass('hidden');
        }
    },
    toggleIntegrated: function () {
        if ($('.enabledIntegrated').hasClass('hidden')) {
            $('.enabledIntegrated').show();
            $('.enabledIntegrated').removeClass('hidden');
        }
        else {
            $('.enabledIntegrated').hide();
            $('.enabledIntegrated').addClass('hidden');
        }
    },
    togglePermissionsDisplay: function (ev) {
        var $targ = $(ev.currentTarget);
        if ($targ.is(':checked')) {
            // Check all permissions, disable permissiosn and show site admin message
            $('.permissions input').prop('checked', true).prop('disabled', true);
            $('#siteAdminPermissions').fadeIn();
        }
        else {
            // Enable permissions hide site admin message
            $('.permissions input').prop('disabled', false);
            $('#siteAdminPermissions').fadeOut();
        }
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('edituserlayout'));
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
        var that = this;
        $('body').unbind('windowResize.userEditView').bind('windowResize.userEditView', function () {
            that.resizeGroupLayout();
        });
        this.listenTo(window.users, 'add remove reset', this.render);
        return this;
    },
    render: function () {
        var type = this.$("select[name='userType'] option:selected").text() || Constants.c.all;
        var gatewayPermissions = 0;
        // Refresh viewData.list
        var newItem = new User({ Id: Constants.c.emptyGuid, Username: Constants.c.newTitle, FirstName: '', LastName: '', DistinguishedName: '', UserPrincipalName: '' });
        // Clone user collection and add a new model to the collection
        this.viewData.list = new Users(Utility.getUsers(null, window.users, true, true, type)).getNewList(newItem);
        this.viewData.listr = window.slimRoles;
        this.viewData.listldap = window.slimLDAPConnections;
        this.viewData.namedAvailable = window.namedAvailable;
        this.viewData.namedTotal = window.namedTotal;
        this.viewData.concurrentAvailable = window.concurrentAvailable;
        this.viewData.concurrentTotal = window.concurrentTotal;
        this.viewData.gp = window.gatewayPermissions;
        var hasCreateEdit = Utility.checkGP(this.viewData.gp, Constants.gp.Create_Edit_Users);
        var hasDeleteUser = Utility.checkGP(this.viewData.gp, Constants.gp.Delete_Users);
        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }
        if (this.viewData.selected !== undefined && this.viewData.selected.get('DirectGatewayPermissions')) {
            gatewayPermissions = this.viewData.selected.get('DirectGatewayPermissions');
        }

        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);
        if (this.permissionEditView && this.permissionEditView.close) {
            this.permissionEditView.close();
        }
        this.permissionEditView = new PermissionEditView({
            useGatewayPermissions: true
        });
        this.$el.find('.permissions').append(this.permissionEditView.render(gatewayPermissions).$el);
        if ($('#permissions').length === 1 && this.viewData.selected !== undefined) {
            var ev = $.Event();
            ev.currentTarget = this.$el.find('input[name="InstanceAdmin"]');
            this.togglePermissionsDisplay(ev);
        }
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        this.$el.find('input[name="Username"]').focus().select();
        if (!hasCreateEdit) {
            this.changeSelection(null, true);
            // Disable users ability to modify any of the users attributes if they don't have create edit permissions
            $(this.el).find('input:not([type="button"]), select').attr('disabled', 'disabled');
            $(this.el).find('select:first').removeAttr('disabled');
        }
        if (hasDeleteUser) {
            $('#userType,#userToUserSelect').removeAttr('disabled');
        }
        this.resizeGroupLayout();
        this.$("select[name='userType']").val(type);
        return this;
    },
    closeLDAPImport: function () {
        if (this.importLDAPView && this.importLDAPView.close) {
            this.importLDAPView.close();
        }
    },
    close: function () {
        this.closeLDAPImport();
        this.unbind();
        this.remove();
    },
    resizeGroupLayout: function () {
        var groupHeight = this.$el.find('#user_layout').find('fieldset').height();
        this.$el.find('#groupFieldset').height(groupHeight);
    }
});
