var ImportLDAPView = Backbone.View.extend({
    className: 'ImportLDAPView',
    importEvents: {
        'click .browseConn': 'getContainers',
        'change select[name="LDAPConnection"]': 'changeConnection'
    },
    initializeLDAPImport: function (options) {
        var that = this;
        options = options || {};
        this.isUser = !!options.isUser;
        this.ldapContainers = new LDAPContainers();
        this.displayInDialog = options.displayInDialog === false ? false : true;
        this.dialogOptions = $.extend({
            modal: true,
            height: 400,
            width: 650,
            minWidth: 650,
            minHeight: 400,
            okText: Constants.t('generalImport'),
            open: function () {
                that.toggleImportBtn();
            },
            close: function (cleanup) {
                that.close();
                Utility.executeCallback(cleanup);
            }
        }, options.dialogOptions);
        this.dialogCallbacks = $.extend({}, options.dialogCallbacks);
        this.compiledTemplate = doT.template(Templates.get('importldaplayout'));
        this.listenTo(this.ldapContainers, 'reset', function (collection, options) {
            this.model.set('browseData', this.ldapContainers.JSTreeFormat());
            if (!this.model.hasChanged()) {
                this.model.trigger('change:browseData', this.model);
            }
        });
        this.listenTo(this.model, 'change:browseData', function (model, value, options) {
            this.browseLDAPImport();
        });
        this.listenTo(this.collection, 'change:isSelected', function (model, value, options) {
            this.toggleImportBtn();
        });
        _.extend(this.events, this.importEvents); //Copy this events into parents events.
    },
    // Overridden by view that inherits this view
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.connections = window.slimLDAPConnections.toJSON();
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        if (this.gridView && this.gridView.close) {
            this.gridView.close();
        }
        this.initGrid();    // declared in view extending this one
        this.gridView = new ImportLDAPGridView(this.gvOptions);
        this.$el.append(this.gridView.render().$el);
        if (this.displayInDialog) {
            this.dialogOptions = $.extend(this.dialogOptions, viewData);
            this.renderDialog();
        }
        var connId = viewData.connections[0] ? viewData.connections[0].Id : '';
        this.model.set('ConnectionId', connId);
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    toggleImportBtn: function () {
        var len = this.collection.getSelected().length;
        if (this.displayInDialog) {
            if (len > 0) {
                Utility.changeButtonState([Constants.c.generalImport], 'enable', this.$dialog.parent());
            }
            else {
                Utility.changeButtonState([Constants.c.generalImport], 'disable', this.$dialog.parent());
            }
        }
    },
    browseLDAPImport: function () {
        this.model.browseLDAPImport(LDAPDialogs.browseLDAPImport, this.isUser);
    },
    //#region Event Handling
    getContainers: function (ev) {
        if (!this.model.get('ConnectionId')) {
            return;
        }
        this.ldapContainers.fetch({
            connectionId: this.model.get('ConnectionId'),
            node: '',
            subtree: false,
            reset: true
        });
    },
    changeConnection: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('ConnectionId', $targ.val());
    }
    //#endregion Event Handling
});