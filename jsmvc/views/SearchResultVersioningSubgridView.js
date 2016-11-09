var SearchResultVersioningSubgridView = Backbone.View.extend({
    model: undefined, //SearchableEntityCPX
    tagName: 'tr',
    className: 'SearchResultVersioningSubgridView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.numColsToIndent = options.numColsToIndent;
        this.numColsToSpan = options.numColsToSpan;
        this.compiledTemplate = doT.template(Templates.get('subgridviewlayout'));
        this.subviewModel = new GetViewableVersionsPackageCPX({
            Id: this.model.get('Id'),
            IncludeCurrentVersion: true
        });
        this.subviewModel.set('selectedId', this.model.versionId());    // set selectedId before adding the change event listener for it
        this.listenTo(this.subviewModel.get('Versions'), 'remove', this.render);
        this.listenTo(this.subviewModel, 'change:selectedId', this.viewSelectedVersion);
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.numColsToIndent = this.numColsToIndent;
        ro.numColsToSpan = this.numColsToSpan;
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.dvGridView = new DocumentVersioningGridView({
            model: this.subviewModel,
            effPermissions: this.model.get('EffectivePermissions'),
            gridOptions: { makeScrollable: false }
        });
        this.dvGridView.onRowDoubleClick = this.onRowDoubleClick;
        this.$el.find('td.SubgridViewContainer').html(this.dvGridView.render().$el);
        var that = this;
        this.subviewModel.fetch({
            success: function () {
                // Trigger selectedSubgridVersion
                var selectedId = that.subviewModel.get('selectedId');
                if (that.model.versionId() === selectedId) {
                    that.subviewModel.trigger('change:selectedId', that.model, that.model.versionId());
                }
                else {
                    that.subviewModel.set('selectedId', that.model.versionId());
                }
            }
        });
        return this;
    },
    closeChildViews: function () {
        this.dvGridView.close();
    },
    close: function () {
        this.closeChildViews();
        this.unbind();
        this.remove();
    },
    viewSelectedVersion: function (model, value, options) {
        this.model.collection.trigger('change:selectedSubgridVersion', this.model, value, options);
    },
    gceResize: function() {
        if (this.dvGridView) {
            this.dvGridView.gceResize();
        }
    },
    //#region Custom Grid Virtual functions
    onRowDoubleClick: function (rowId, $td) {
        $('body').trigger('ViewDocuments', { versionIds: [rowId], resultId: this.model.get('ResultId') });
    }
    //#endregion
});