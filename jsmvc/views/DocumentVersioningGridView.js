var DocumentVersioningGridView = CustomGridView.extend({
    model: undefined, //Model is GetViewableVersionsPackageCPX
    docModel: undefined, //Only available when loaded via the DocumentMetaVersioningView, used as a flag to show comments or not, as well as the ability to unpublish.
    className: 'DocumentVersioningGridView',
    versionSetViews: undefined,
    effPermissions: undefined,
    events: {
    },
    initialize: function (options) {
        options = options || {};
        this.compiledTemplate = doT.template(Templates.get('documentversioninggridviewlayout'));
        this.docModel = options.docModel;
        this.effPermissions = options.effPermissions;
        this.listenTo(this.model, 'sync', this.modelSynced);
        var gridOptions = options.gridOptions || {};
        this.initializeGrid(gridOptions);
        this.versionSetViews = [];
        this.listenTo(Backbone, 'customGlobalEvents:resize', function (options) {
            options = options || {};
            if (options.resizeDocumentView) {
                this.render();
            }
        });
        return this;
    },
    render: function () {
        if (this.model.get('Versions')) {
            var ro = this.getRenderObject();
            this.$el.html(this.compiledTemplate(ro));
            this.renderGrid();
            this.renderSubViews();
        } else {
            this.$el.html('');
        }
        return this;
    },
    close: function () {
        this.closeSubViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var ro = { showComments: !this.docModel };
        return ro;
    },
    renderSubViews: function () {
        this.closeSubViews();
        var $container = this.$el.find('.customGridTable tbody');
        var vers = this.model.get("Versions");
        var i = 0;
        var length = vers.length;
        for (i; i < length; i++) {
            var ver = vers.at(i);
            var view = new DocumentVersioningGridItemView({ model: ver, effPermissions: this.effPermissions, docModel: this.docModel, viewVersPkg: this.model });
            $container.append(view.render().$el);
            this.versionSetViews.push(view);
        }
    },
    closeSubViews: function () {
        var sv = this.versionSetViews.pop();
        while (sv) {
            sv.close();
            sv = null;
            sv = this.versionSetViews.pop();
        }
    },
    modelSynced: function (m, r, options) {
        if (options && options.ignoreSync) {
            return;
        }
        this.render();
    },
    //#region CustomGridView virtual functions
    onRowSelect: function (rowId, $td, ev) {
        if (!rowId || this.model.get('selectedId') === rowId) {
            return;
        }
        if (this.docModel) {
            this.docModel.replaceCachedViewDataVersionId(rowId);
            this.docModel.fetch();
        } else {
            this.$el.find('.selected').removeClass('selected');
            this.model.set('selectedId', rowId);
        }
    },
    onSortGrid: function (metaId) {
        var sortDesc = false;
        var versions = this.model.get('Versions');
        if (versions.sortCol === metaId) {
            sortDesc = !versions.sortDesc;
        }
        versions.sort({ sortCol: metaId, sortDesc: sortDesc });
        this.render();
    }
    //#endregion
});