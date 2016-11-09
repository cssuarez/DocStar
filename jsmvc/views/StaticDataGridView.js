/*************************************************************************************************************************************************
Very simple grid to display static data (think licenses and datalink results).
Options should contain a render object structure like so:
renderObject: {
    headers: [{
        columnId: 'Title',              //If provided the column will be sortable, this Id will included in the onSortGrid callback.
        value: 'Title'                  //Displayed value in the header
        style: 'width:10%;',            //Any style to be displayed on the column
        }],
    rows: [ {
        rowClass: 'customGridHighlight',//Class on the row, customGridHighlight can be used to highlight the row.
        id: '{Probably Some Guid}',     //If provided the row will be selectable, this Id will be included in the onRowSelect callback.
        values: ['Larry']               //Values displayed in the row, the number of values should match the number of headers.
        }]
}
Options may also include 2 function call backs for sorting and selection
    onRowSelect: function(options) {},  //If provided and the row clicked has an id (see rows above) this callback is invoked.
    onSortGrid: function(options) {}    //If provided and the column has a columnId (see headers above) this callback is invoked.
NOTE: if you implement either onRowSelect or onSortGrid changes will not be seen in the grid until you re-render it (hint: **STATIC**DataGridView)
**************************************************************************************************************************************************/
var StaticDataGridView = CustomGridView.extend({
    className: 'StaticDataGridView',
    sdOptions: undefined,
    events: {},
    initialize: function (sdOptions) {
        this.sdOptions = sdOptions;
        this.compiledTemplate = doT.template(Templates.get('staticdatagridviewlayout'));
        this.initializeGrid(sdOptions);
        return this;
    },
    render: function () {
        this.sdOptions.scrollPos = this.$el.find('.customGridScrollableContainer').scrollTop();
        this.$el.html(this.compiledTemplate(this.sdOptions.renderObject));
        this.renderGrid();
        return this;
    },
    close: function () {
        if (this.sdOptions && this.sdOptions.onRowSelect) {
            this.sdOptions.onRowSelect = undefined;
        }
        if (this.sdOptions && this.sdOptions.onSortGrid) {
            this.sdOptions.onSortGrid = undefined;
        }
        if (this.sdOptions && this.sdOptions.getGridCollection) {
            this.sdOptions.getGridCollection = undefined;
        }
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },

    //#region CustomGridView virtual functions
    onRowSelect: function (rowId, $td, ev) {
        // Obtain current scroll position, before row selection, because it will be reset to 0 due to re-rendering
        var scrollTop = this.$el.find('.customGridScrollableContainer').get(0).scrollTop;
        Utility.executeCallback(this.sdOptions.onRowSelect, { rowId: rowId, $td: $td, ev: ev });
        // After selection reset scroll position to what it was before selection executed
        this.$el.find('.customGridScrollableContainer').scrollTop(scrollTop);
    },
    onSortGrid: function (columnid, $th) {
        Utility.executeCallback(this.sdOptions.onSortGrid, { columnid: columnid, $th: $th });
    },
    selectAllItemsChanged: function (ev) {
        Utility.executeCallback(this.sdOptions.selectAllItemsChanged, { ev: ev });
    },
    getGridCollection: function () {
        if (this.sdOptions && this.sdOptions.getGridCollection) {
            return this.sdOptions.getGridCollection();
        }
    }
    //#endregion
});