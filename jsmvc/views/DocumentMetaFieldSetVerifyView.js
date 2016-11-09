var DocumentMetaFieldSetVerifyView = Backbone.View.extend({
    cells: [],   // array containing row data
    className: 'DocumentMetaFieldSetVerifyView',
    tagName: 'tr',
    setId: undefined,
    rowNumber: undefined,
    columnPreference: undefined,
    templateLookup: undefined,
    augmentedCFMs: undefined,
    events: {
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentmetafieldsetviewverifylayout'));
        this.setId = options.setId;
        this.rowNumber = options.rowNumber;
        this.cells = options.cells || [];
        this.$el.data('rowid', this.setId);
        this.$el.attr('data-setid', this.setId);
        return this;
    },
    render: function (editMode) {
        var ro = this.getRenderObject(editMode);
        this.$el.html(this.compiledTemplate(ro));
        return this;
    },
    getRenderObject: function (editMode) {
        var ro = {
            cells: this.cells,
            rowNumber: this.rowNumber
        };
        return ro;
    }
});