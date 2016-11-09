/// <reference path="../../Content/LibsInternal/DialogsUtil.js" />
// View for editing Roles
// Renders a compiled template using doU.js
var RoleEditView = Backbone.View.extend({
    viewData: {},
    permissionEditView: {},

    events: {
        "change select[name='Id']": "changeSelection",
        "click input[name='save_role']": "saveChanges",
        "click input[name='delete_role']": "kill",
        "click input[name='import_role']": "importLDAPGroup",
        "click input[name='EnableIntegrated']": "toggleIntegrated"
    },

    //new class is fetched from the controller
    //first element in the list is an empty user
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(window.roles);
        return this;
    },

    changeSelection: function (e, noRender) {
        var id = this.$("select[name='Id']").val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        } else {
            var model = window.roles.get(id);
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
    saveChanges: function () {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);

        this.$el.find('input[name="GatewayPermissions"]').val(this.permissionEditView.getPermissions());
        var attrs = DTO.getDTO(this.el);
        var ldapConnection = $('select[name="LDAPConnection"] option:selected');
        attrs.ConnectionId = ldapConnection.attr('id');
        var role = {
            Id: attrs.Id === Constants.c.emptyGuid ? undefined : attrs.Id,
            Name: attrs.Name,
            GatewayPermissions: attrs.GatewayPermissions,
            ConnectionId: attrs.EnableIntegrated ? (attrs.ConnectionId || null) : null,
            DistinguishedName: attrs.EnableIntegrated ? ($.trim(attrs.DistinguishedName) || null) : null,
            RoleMemberships: attrs.RoleMemberships,
            Description: attrs.Description === "" ? null : attrs.Description,
            CreatedOn : new Date() //This is not the date to be used a CreatedOn date.
        };
        var newClass = new Role(role);
        if (newClass.get('Id') === Constants.c.emptyGuid) { // In order for Create to be called model must not have an 'id'
            newClass.unset('Id', { silent: true });
        }
        var e = newClass.validate(role);
        $('input[name="save_role"], input[name="delete_role"], input[name="import_role"]').prop('disabled', true);
        if (e) {
            this.handleErrors(newClass, e);
            return;
        }
        newClass.on("invalid", function (model, error) { that.handleErrors(model, error); });
        if (this.isUnique(role) === true) {
            newClass.save(role, {
                success: function (model, result) {
                    $('input[name="save_role"], input[name="delete_role"], input[name="import_role"]').prop('disabled', false);
                    if (typeof result !== 'boolean') {
                        model.set({ id: result.Id }, { silent: true });
                    }
                    that.saveSuccess(model, result, role.Id, window.slimRoles, that);
                    that.saveSuccess(model, result, role.Id, window.roles, that);                    
                },
                failure: function (message) {
                    that.handleErrors(newClass, message);
                }
            });
        } else {
            that.handleErrors(newClass, { 'Name': Constants.c.duplicateNameError });
        }
    },

    /*
    * isUnique check the new against the existing.  
    * if there is an update to the contents and the guid is the same then it is considered unique...
    * @param attrs which contains the Id and Title
    * @return boolean
    */
    isUnique: function (attrs) {
        var unique = true;
        window.roles.each(function (item) {
            if (attrs.Name.toLowerCase() === item.get('Name').toLowerCase()) {
                if (attrs.Id === Constants.c.newGuid && attrs.Id !== item.get('Id')) {
                    unique = false;
                }
            }
        });
        return unique;
    },

    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages.
    */
    handleErrors: function (model, errors) {
        $('input[name="save_role"], input[name="delete_role"], input[name="import_role"]').prop('disabled', false);
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass, '');
    },

    kill: function (e) {
        //clear errors first
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var id = $('select[name="Id"]').val();
        var that = this,
            model = window.roles.get(id);
        var okText = Constants.c.ok;
        var closeText = Constants.c.close;
        if (id !== Constants.c.emptyGuid) {
            $('#replace_r').dialog({
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
                        $("#replace_r select:visible").each(function () {
                            replaceItem = $(this);
                        });
                        if (!replaceItem.hasClass('#groupType')) {
                            replaceId = replaceItem.val();
                        }
                        if (replaceId !== null) {
                            var success = function () {
                                window.slimRoles.remove(model);
                                window.roles.remove(model);
                            };
                            var complete = function () {
                                $('body').trigger('MassDocumentUpdated');
                                Utility.enableButtons([okText, closeText]);
                                $(replaceDialog).dialog('close');
                            };
                            var failure = function (message) {
                                that.handleErrors(model, message);
                            };
                            id = $('select[name="Id"]').val();
                            model = window.roles.get(id);
                            model.destroy({ success: success, failure: failure, complete: complete, ReplacementRoleId: replaceId });
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
            $('#replace_r').dialog('open');
        } else {
            ErrorHandler.addErrors({ 'Id': Constants.c.cannotDeleteNew }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
        }
    },
    redrawReplacements: function () {
        var itemId = $('.unstyledList').find('select[name="Id"]').val();
        if (itemId !== Constants.c.emptyGuid) {
            $('#groupToGroupSelect option').remove();
            $('#groupToUserSelect option').remove();
            var itemName = $('.unstyledList').find('select[name="Id"] option:selected').text();
            $('#replace_r .replaceDescription').text(String.format(Constants.c.replaceUserOrRole, itemName));
            window.roles.each(function (item) {
                var scId = item.get('Id');
                var scName = item.get('Name');
                if (scId === Constants.c.emptyGuid || scId === itemId) {
                    return;
                }
                $('#groupToGroupSelect').append($('<option/>').val(scId).text(scName));
            });
            new Users(Utility.getUsers(null, window.users, true, true)).each(function (item) {
                //skip selected and -- New -- (emptyGuid);
                var scId = item.get('Id');
                var scName = item.get('Username');
                if (scId === Constants.c.emptyGuid || scId === itemId) {
                    return;
                }
                $('#groupToUserSelect').append($('<option/>').val(scId).text(scName));
            });
            $('#roleType').off('change').on('change', function (e) {
                if (e.target.value === 'group') {
                    $('#groupToGroupSelect').show();
                    $('#groupToUserSelect').hide();
                } else {
                    $('#groupToUserSelect').show();
                    $('#groupToGroupSelect').hide();
                }
            });
        }
    },
    importLDAPGroup: function () {
        this.closeLDAPImport();
        this.importLDAPView = new ImportLDAPGroupsView();
        var that = this;
        this.importLDAPView.render();
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
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editrolelayout'));
        this.listenTo(window.slimRoles, 'add remove reset', this.render);
        return this;
    },
    render: function () {
        // Refresh viewData.list
        var newItem = new Role({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle });
        this.viewData.list = window.roles.getNewList(newItem);
        this.viewData.listu = new Users(Utility.getUsers(null, window.users, true, true));
        this.viewData.listldap = window.slimLDAPConnections;
        this.viewData.gp = window.gatewayPermissions;
        var hasCreateEdit = Utility.checkGP(this.viewData.gp, Constants.gp.Create_Edit_Groups);
        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }
        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);

        if (this.permissionEditView && this.permissionEditView.close) {
            this.permissionEditView.close();
        }
        this.permissionEditView = new PermissionEditView({
            useGatewayPermissions: true
        });
        this.$el.find('.permissions').append(this.permissionEditView.render(this.viewData.selected.get('GatewayPermissions')).$el);
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        this.$el.find('input[name="Name"]').focus().select();
        if (!hasCreateEdit) {
            this.changeSelection(null, true);
            // Disable users ability to modify any of the groups attributes if they don't have create edit permissions
            $(this.el).find('input:not([type="button"]), select').attr('disabled', 'disabled');
            $(this.el).find('select:first').removeAttr('disabled');
        }
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
    }
});
