var ContentTypeCC = Backbone.Collection.extend({
    model: ContentType,
    errorMsg: null,
    proxy: BulkDataServiceProxy({ skipStringifyWcf: true }),
    sync: function (method, collection, options) {
        var that = this;
        var ff = function (jqXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.wait = false;
                options.success(result);
                that.parse(result);
            }
        };
        switch (method) {
            case 'read':
                this.proxy.getBulkContentTypeData(sf, ff, complete, null, options.headers);
                break;
        }
    },
    parse: function (result) {
        if (window.contentTypes === undefined) {
            window.contentTypes = new ContentTypes();
        }
        if (window.slimSecurityClasses === undefined) {
            window.slimSecurityClasses = new SlimEntities();
        }
        if (window.slimUsers === undefined) {
            window.slimUsers = new SlimEntities();
        }
        if (window.slimRoles === undefined) {
            window.slimRoles = new SlimEntities();
        }
        if (window.slimInboxes === undefined) {
            window.slimInboxes = new SlimEntities();
        }
        if (window.slimFolders === undefined) {
            window.slimFolders = new SlimEntities();
        }
        if (window.slimWorkflows === undefined) {
            window.slimWorkflows = new SlimEntities();
        }
        if (window.slimRecordcategories === undefined) {
            window.slimRecordcategories = new SlimEntities();
        }
        if (window.slimCustomLists === undefined) {
            window.slimCustomLists = new SlimEntities();
        }
        if (window.syncActions === undefined) {
            window.syncActions = new SyncActions();
        }
        window.slimSecurityClasses.reset(window.slimSecurityClasses.parse(result.SecurityClasses), { silent: true });
        window.slimUsers.reset(window.slimUsers.parse(result.Users), { silent: true });
        window.slimRoles.reset(window.slimRoles.parse(result.Roles), { silent: true });
        window.slimWorkflows.reset(window.slimWorkflows.parse(result.Workflows), { silent: true });
        window.slimRecordcategories.reset(window.slimRecordcategories.parse(result.RecordCategories), { silent: true });
        window.slimCustomLists.reset(window.slimCustomLists.parse(result.CustomLists), { silent: true });
        window.typeAheadQueries = result.DatalinkTypeAheadQueries;
        window.dropdownQueries = result.DatalinkDropDownQueries;
        window.syncActions.reset(window.syncActions.parse(result.ActionLibrary), { silent: true });
        window.slimInboxes.reset(window.slimInboxes.parse(result.Inboxes), { silent: true });
        window.contentTypes.reset(window.contentTypes.parse(result.ContentTypes), { silent: true });
        window.slimFolders.reset(window.slimFolders.parse(result.Folders));
    }
});