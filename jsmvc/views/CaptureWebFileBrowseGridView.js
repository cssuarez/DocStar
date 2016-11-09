var CaptureWebFileBrowseGridView = CustomGridView.extend({
    className: 'CaptureWebFileBrowseGridView',
    collection: undefined, //FileSystemEntries
    events: {
        'change input[type="checkbox"]': 'selectOne'
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('capturewebfilebrowsegridviewlayout'));
        this.initializeGrid({});
        this.collection = new FileSystemEntries();
        this.listenTo(this.collection, 'add remove reset sort', this.render);
        this.listenTo(this.collection, 'change:isSelected', function (model, value, options) {
            // If all items are being selected or cleared, don't re-render here, after they have all been selected/cleared a render is called
            if (!options.ignoreSelection) {
                this.render();
            }
            var $selectAllItems = this.$el.find('input.selectAllItems');
            $selectAllItems.prop('checked', this.collection.areAllSelected());
        });

        return this;
    },
    render: function () {
        this.ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.ro));
        this.renderGrid();
        return this;
    },
    getRenderObject: function () {
        var ro = {
            allSelected: this.collection.areAllSelected(),
            rows: []
        };

        var i = 0;
        var length = this.collection.length;
        for (i; i < length; i++) {
            var model = this.collection.at(i);
            var created = '';
            var modified = '';
            // If we can't format created / modified, just an empty string
            try {
                created = new Date(model.get('Created')).format('general');
            } catch (e) {
                created = '';
            }
            try {
                modified = new Date(model.get('Modified')).format('general');
            } catch (ee) {
                modified = '';
            }
            ro.rows.push({
                RowClass: model.isSelected() ? 'customGridHighlight' : '',
                Selected: model.isSelected(),
                Name: model.get('Name'),
                Created: created,
                Modified: modified,
                FileSize: model.get('Length'),
                model: model
            });
        }
        return ro;
    },

    ///<summary>
    /// Override CustomGridView's selectAllItemsChanged event handler
    ///</summary>
    selectAllItemsChanged: function (e) {
        if ($(e.currentTarget).is(':checked')) {
            this.collection.selectAll({ ignoreSelection: true });
        } else {
            this.collection.clearSelected({ ignoreSelection: true });
        }
        this.render();
    },
    selectOne: function (e) {
        var $sel = $(e.currentTarget);
        var isChecked = $sel.is(':checked');
        var id = $sel.data('modelid');
        var m = this.collection.get(id);
        if (m) {
            m.setSelected(isChecked);
        }
    },
    //#region CustomGridView virtual functions
    onRowSelect: function (rowId, $td, ev) {
        this.onGridRowSelect(rowId, $td, ev);
    },
    onSortGrid: function (cellId, $th) {
        this.collection.sortByColumn(cellId);
    },
    getGridCollection: function () {
        return this.collection;
    }
    //#endregion
});