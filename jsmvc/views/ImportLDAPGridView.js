var ImportLDAPGridView = CustomGridView.extend({
    collection: undefined, // provided by parent class (LDAPUsers or LDAPGroups)
    className: 'ImportLDAPGridView',
    resultViews: [],    // array of grid item views
    events: {
    },
    initialize: function (options) {
        this.renderObject = options.renderObject;
        this.compiledTemplate = doT.template(Templates.get('importldapgridviewlayout'));
        this.initializeGrid();
        this.listenTo(this.collection, 'reset', function (collection, options) {
            this.render();
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = $.extend({}, this.renderObject);
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.renderGrid();
        // Render grid view items
        this.renderGridViewItems(viewData);
        return this;
    },
    closeResultViews: function () {
        var rv = this.resultViews.pop();
        while (rv) {
            rv.close();
            rv = undefined;
            rv = this.resultViews.pop();
        }
    },
    close: function () {
        this.closeResultViews();
        this.unbind();
        this.remove();
    },
    renderGridViewItems: function (viewData) {
        var $container = this.$el.find('.customGridTable tbody');
        var idx = 0;
        var length = this.collection.length;
        for (idx; idx < length; idx++) {
            var gridItemView = new ImportLDAPGridItemView({
                model: this.collection.at(idx),
                colPreferences: viewData.headers
            });
            this.resultViews.push(gridItemView);
            $container.append(gridItemView.render().$el);
        }
    },
    //#region CustomGridView virtual functions
    onRowSelect: function (rowId, $td, ev) {
        this.onGridRowSelect(rowId, $td, ev);
    },
    getGridCollection: function () {
        return this.collection;
    }
    //#endregion
});