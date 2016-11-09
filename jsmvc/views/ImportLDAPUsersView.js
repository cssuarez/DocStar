var ImportLDAPUsersView = ImportLDAPView.extend({
    model: undefined, // ImportLDAPUsersPackageCPX
    gvOptions: {},  // Options for StaticDataGridView
    gridView: undefined, // set in ImportLDAPView as ImportLDAPGridView
    events: {
        'click .getAll': 'getUsers'
    },
    initialize: function (options) {
        var that = this;
        options = options || {};
        this.isUser = true;
        this.dialogOptions = {
            title: Constants.t('ldapImportUsers'),
            resize: function () {
                Backbone.trigger('customGlobalEvents:resizing');
            },
            resizeStop: function () {
                that.gridView.gceResize();
            }
        };
        this.model = new ImportLDAPUsersPackageCPX();
        this.collection = this.model.get('Users');
        this.listenTo(this.model, 'change:distinguishedName', function (model, value, options) {
            options = options || {};
            this.getUsers(null, { cleanup: options.cleanup });
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
        var style = 'width: ' + (100 / 5) + '%';
        this.gvOptions.renderObject.headers = [
            { colId: 'AccountName', value: Constants.c.name, order: 1, style: style },
            { colId: 'FullName', value: Constants.c.fullName, order: 2, style: style },
            { colId: 'EmailAddress', value: Constants.c.emailAddress, order: 3, style: style },
            { colId: 'DistinguishedName', value: Constants.c.distinguishedName, order: 4, style :style},
            { colId: 'UserPrincipalName', value: Constants.c.userPrincipalName, order: 5, style: style }
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
                if (errMessage) {
                    ErrorHandler.addErrors(errMessage);
                }
                Utility.executeCallback(failure);
            }
        });
    },
    //#region Event Handling
    getUsers: function (ev, options) {
        var fetchOpts = $.extend({}, options, {
            connectionId: this.model.get('ConnectionId'),
            node: !ev ? this.model.get('distinguishedName') : undefined,
            subtree: true,
            reset: true
        });
        this.model.get('Users').fetch(fetchOpts);
    }
    //#endregion Event Handling
});