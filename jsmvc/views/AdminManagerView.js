var AdminManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {
        var that = this;
        this.editView = new AdminEditView();
        if (window.adminCC === undefined) {
            window.adminCC = new AdminCC();
        }
        if (window.users === undefined) {
            window.users = new Users();
        }
        if (window.roles === undefined) {
            window.roles = new Roles();
        }
        if (window.databaseFields === undefined) {
            window.databaseFields = new DatabaseFields();
        }
        if (window.securityClasses === undefined) {
            window.securityClasses = new SecurityClasses();
        }
        if (window.contentTypes === undefined) {
            window.contentTypes = new ContentTypes();
        }
        if (window.customFieldMetas === undefined) {
            window.customFieldMetas = new CustomFieldMetas();
        }
        if (window.systemPreferences === undefined) {
            window.systemPreferences = new SystemPreferencesCollection();
        }
        if (window.folders === undefined) {
            window.folders = new Folders();
        }
        if (window.inboxes === undefined) {
            window.inboxes = new Inboxes();
        }
        window.inboxes.on("reset", function () { that.updateViews(); });
        this.go();
    },

    go: function () {
        window.adminCC.fetch({ reset: true });
        this.render();
    },

    updateViews: function () {
        this.editView.viewData.selected = undefined;
        this.editView.render();
    },

    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});