var DocumentMetaRelatedItemsView = CustomGridView.extend({
    model: null, // BulkViewerDataPackageCPX
    relatedSearchResults: null, // SearchResultsCPX
    className: 'DocumentMetaRelatedItemsView',
    events: {
        "click .navigation_start": "firstPage"
    },
    initialize: function (options) {
        this.relatedSearchResults = new SearchResultsCPX();
        this.compiledTemplate = doT.template(Templates.get('documentmetarelateditemsviewlayout'));
        this.listenTo(this.relatedSearchResults, 'sync', function (model, value, options) {
            if (options.relatedDocumentId) {
                this.render();
            } else {
                this.searchRelatedItems();
            }
         
        });
        this.listenTo(window.userPreferences, 'reset', function (model, value, options) {
            this.render();
        });
        this.listenTo(window.userPreferences, 'add', function (model, collection, options) {
            var key = model.get('Key');
            if (key === 'relatedDocumentAlignmentOption') {
                this.render();
            }
        });
        this.listenTo(window.userPreferences, 'change add', function (model, value, options) {
            var key = model.get('Key');
            if (key === 'relatedDocumentAlignmentOption') {
                this.render();
            }
        });
        this.initializeGrid();
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.renderGrid();
        return this;
    },
    searchRelatedItems: function () {
        this.relatedSearchResults.fetch({
            relatedDocumentId: this.model.documentId()
        });
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var ro = {
            rows: []
        };
        var idx = 0;
        var results = this.relatedSearchResults.get('Results') || [];
        var length = results.length;
        for (idx; idx < length; idx++) {
            var result = results.at(idx);
            ro.rows[idx] = {
                    id: result.get('Id'),
                    typeClass: result.getTypeClass(),
                    versionId: result.versionId(),
                    title: result.get('Title')
                };
        }
        // default to right aligned as per Bug 12603 - http://pedro.docstar.com/b/show_bug.cgi?id=12603
        ro.align = 'text-align: right;';
        var relatedDocumentAlignmentOption = Utility.GetUserPreference('relatedDocumentAlignmentOption');
        if (relatedDocumentAlignmentOption) {
            ro.align = 'text-align: ' + relatedDocumentAlignmentOption + ';';
        }
        return ro;
    }
});