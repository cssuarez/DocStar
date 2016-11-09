var ImportLDAPGroupsView = ImportLDAPView.extend({
    model: undefined, // ImportLDAPGroupsPackageCPX
    gvOptions: {},  // Options for StaticDataGridView
    gridView: undefined, // set in ImportLDAPView as ImportLDAPGridView
    events: {
        'click .getAll': 'getGroups'
    },
    initialize: function (options) {
        var that = this;
        options = options || {};
        this.isUser = false;
        this.dialogOptions = {
            title: Constants.t('ldapImportGroups'),
            resize: function () {
                Backbone.trigger('customGlobalEvents:resizing');
            },
            resizeStop: function () {
                that.gridView.gceResize();
            }
        };
        this.model = new ImportLDAPGroupsPackageCPX();
        this.collection = this.model.get('Groups');
        this.listenTo(this.model, 'change:distinguishedName', function (model, value, options) {
            options = options || {};
            this.getGroups(null, { cleanup: options.cleanup });
        });
        this.listenTo(this.collection, 'reset', function (collection, options) {
            Utility.executeCallback(options.cleanup);
        });
        this.initializeLDAPImport({ dialogOptions: this.dialogOptions });
    },
    initGrid: function () {
        var that = this;
        this.gvOptions.collection = this.collection;
        this.gvOptions.renderObject = {};
        //Not sortable at this time, could be easily by removing the commented out columnId below and adding a onSortGrid to the gvOptions.
        var style = 'width: ' + (100 / 4) + '%';
        this.gvOptions.renderObject.headers = [
            { colId: 'AccountName', value: Constants.c.name, style: style },
            { colId: 'FullName', value: Constants.c.fullName, style: style },
            { colId: 'EmailAddress', value: Constants.c.emailAddress, style: style },
            { colId: 'DistinguishedName', value: Constants.c.distinguishedName, style: style }
        ];
    },
    executeDialogSave: function (success, failure) {
        this.saveChanges(success, failure);
    },
    saveChanges: function (success, failure) {
        var that = this;
        this.model.save(null, {
            success: function () {
                Utility.executeCallback(success);
                that.close();
            },
            failure: function (errMessage) {
                ErrorHandler.addErrors(errMessage);
                Utility.executeCallback(failure);
            }
        });
    },
    //#region Event Handling
    getGroups: function (ev, options) {
        var fetchOpts = $.extend({}, options, {
            connectionId: this.model.get('ConnectionId'),
            node: !ev ? this.model.get('distinguishedName') : undefined,
            subtree: true,
            reset: true
        });
        this.model.get('Groups').fetch(fetchOpts);
    }
    //#endregion Event Handling
});