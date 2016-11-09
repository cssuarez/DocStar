var ContentTypeSecurityView = Backbone.View.extend({
    className: 'contentTypeSecurityView',
    viewData: {},
    events: {
        "change select[name='ct_users']": "changeUserRights",
        "change select[name='ct_roles']": "changeRoleRights"
    },
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('contenttypesecuritylayout'));
        this.viewData.selectedContentType = options.selected;
        return this;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        if (this.permissionEditView && this.permissionEditView.close) {
            this.permissionEditView.close();
        }
        this.permissionEditView = new PermissionEditView();
        this.$el.find('.permissions').append(this.permissionEditView.render().$el);
        this.preloadRights();
        this.$el.find('#ct_userGroupTab').tabs();
        return this.$el;
    },
    getRenderObject: function () {
        var ro = {};
        ro.selectedContentType = this.viewData.selectedContentType;
        ro.listsc = window.slimSecurityClasses;
        ro.listu = new Users(Utility.getUsers(null, window.users, true, true)); // used for displaying user permissions, should only display site users
        ro.listr = window.slimRoles;
        return ro;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    preloadRights: function () {
        var userRights = this.viewData.selectedContentType.get("UserPermissions");
        var roleRights = this.viewData.selectedContentType.get("RolePermissions");
        var ctId = this.viewData.selectedContentType.get("Id");
        var idx = 0;
        var length = userRights ? userRights.length || 0 : 0;
        var item;
        for (idx = 0; idx < length; idx++) {
            item = userRights[idx];
            this.permissionEditView.changedRights.push(this.generateDisplayRight(ctId, item.RoleOrUserId, true, item.PermissionLevel));
        }
        length = roleRights ? roleRights.length || 0 : 0;
        for (idx = 0; idx < length; idx++) {
            item = roleRights[idx];
            this.permissionEditView.changedRights.push(this.generateDisplayRight(ctId, item.RoleOrUserId, false, item.PermissionLevel));
        }
    },
    generateDisplayRight: function (entityId, userRoleId, isUser, permission) {
        var displayRight = {};
        displayRight.EntityId = entityId;
        displayRight.EntityType = "ContentType";
        displayRight.UserRoleId = userRoleId;
        displayRight.User = isUser;
        displayRight.Permission = permission;
        return displayRight;
    },
    getSecurityClass: function () {
        return this.$el.find('select[name="securityClass"] :selected').val();
    },
    getPermissions: function () {
        var rights = this.permissionEditView.getTrackablePermissions();
        var perms = {};
        var ups = [];
        var rps = [];
        var i = 0;
        var length = rights.length;
        for (i = 0; i < length; i++) {
            var perm = rights[i];
            var p = {
                EntityId: perm.EntityId,
                RoleOrUserId: perm.UserRoleId,
                PermissionLevel: perm.Permission
            };
            if (rights[i].User) {
                ups.push(p);
            }
            else {
                rps.push(p);
            }
        }
        perms.UserPermissions = ups;
        perms.RolePermissions = rps;
        return perms;
    },
    //#region Events
    changeUserRights: function () {
        var id = this.$el.find("select[name='ct_users']").val();
        if (id === undefined) {
            return;
        }
        this.$el.find("select[name='ct_roles']").attr('selectedIndex', '-1').children("option:selected").removeAttr("selected");
        this.changeRights(true, id);
    },
    changeRoleRights: function () {
        var id = this.$el.find("select[name='ct_roles']").val();
        if (id === undefined) {
            return;
        }
        this.$el.find("select[name='ct_users']").attr('selectedIndex', '-1').children("option:selected").removeAttr("selected");
        this.changeRights(false, id);
    },
    changeRights: function (isUser, newSelectionId) {
        var displayRight = this.permissionEditView.getCachedPermission(newSelectionId);
        if (displayRight === undefined) {
            displayRight = this.generateDisplayRight(this.viewData.selectedContentType.get('Id'), newSelectionId, isUser, 0);
            this.permissionEditView.setTrackablePermissions(displayRight, false);
        }
        else {
            this.permissionEditView.setTrackablePermissions(displayRight, false);
        }
    }
    //#endregion Events
});