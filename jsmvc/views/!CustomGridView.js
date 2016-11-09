/* Custom Grid View - Adds editable functionality to views with a grid within them. Instructions on use:
1) Create a view that extends CustomGridView instead of Backbone.View
2) The view must call initializeGrid in its initialize function. Options may be passed in to customize grid behavior:
    a) options.singleClickEdit: When true a click on a cell will call onEditRow instead of onRowSelect.
    b) options.slowClickEdit: When true a click on a cell will call onRowSelect, if another click occurs on the same rowid onEditRow will be called.
        NOTE: Double clicks are fired as their own event.
3) The view must call renderGrid after the el has been set.
4) Create a table in this view as follows (classes required):
<table class="customGridTable">
    <thead>                                                                             @*Headers*@
        <tr> 
            <th class="customGridHeader customGridSortable" data-columnid="=COLUMN ID"> @*customGridSortable is optional, only add it if you want the column to be sortable*@
                HEADER TEXT HERE                
            </th>
        </tr>                                                                           @*Repeated for as many headers as needed*@
    </thead>
    <tbody>                                                                             @*Body - A row per item to be represented, typically this will be another view*@
        <tr data-rowid="ROWIDENTIFIER">                                                 @*Since typically we use a subview to represent a row this should be set in the initialize function of the subview*@
            <td class="customGridDataCell">
                CELL VALUE HERE (STRING)
            </td>
        <tr>                                                                            @*Repeated for as many headers as needed*@
    </tbody>
    <tfoot>                                                                             @*Footers*@
        <tr>                                                                            @*Optional Summary Footers*@
            <td class="customGridDataCell">
                ROW SUMMARY / TOTAL HERE                                        
            </td>
        </tr>
        <tr class="customGridPager">                                                    @*Grid Footer Controls (Pager, column selector, all optional)*@        
            <td colspan="=number of headers">
                <div class="fleft customGridPagerButton">                               @*Example of custom add control - Event bount in parent view*@
                    <span class="columnSelector ui-icon ui-icon-calculator"></span>
                </div>
                <div class="fleft customGridPagerButton">                               @*Example of custom add control - Event bount in parent view*@
                    <span class="addGroupSet ui-icon ui-icon-plus"></span>
                </div>
            </td>
        </tr>
    </tfoot>
</table>

5) Parent view should implement the following functions, if they are not implemented then no action is taken:
    a) getGridCollection: Obtain the collection to be used by the grid for selection - must be provided for any row selection to work, including checkbox selection
    b) onColumnsChanged(preference): When a column is resized or reordered this method is invoked passing a preference object as follows:
        { 
            columnId: {
                width: width of the column in percentage relative to the width of other columns with the data-columnid attribute.
                order: index where the column should be located (0-based)
            }
        }
    c) onEdit(rowId, $td): When entering edit mode this method is invoked.
    d) onExitEdit(rowId): When exiting edit mode this method is invoked.
    e) onSortGrid(cellId, $th): When a header is clicked.
    f) onRowDoubleClick(rowId, $td): When a a row is double clicked.
*/
var CustomGridView = Backbone.View.extend({
    options: undefined,
    editRowId: undefined,
    lastClick: undefined,
    enterEditTimeout: undefined,
    ttTimeoutId: undefined,
    ttTimeoutClose: undefined,
    ttElement: undefined,
    resizeMe: false, //Overriden by grids that are in containers with calculated heights (instead of a height based on the grid contents).
    /* 
        dragData = { 
            table: jquery table element, 
            handle: jquery handle used for resiziing, 
            element: jquery th element that is to be resized, 
            originalPosition: starting position of element,
            pageX: mouse position when resize started
        }
    */
    dragData: undefined,
    gridEvents: {
        'click .customGridSortable': 'sortColumn',
        'click .customGridDataCell': 'cellClick',
        'mousedown  div.customGridColumnResizeContainer:first div.customGridColumnResizeHandle': 'startResize',
        'touchstart  div.customGridColumnResizeContainer:first div.customGridColumnResizeHandle': 'startResize',
        'change table > thead:first-child input.selectAllItems': 'selectAllItemsChanged',
        'mouseover tbody, thead': 'onHover',
        'mouseout tbody, thead': 'onHoverOut',
        'click .columnEdit': 'columnEdit'
    },
    initializeGrid: function (options) {
        this.options = options || {};
        this.lastScrollTop = 0; // determine scroll direction
        this.makeScrollable = this.options.makeScrollable === undefined ? true : this.options.makeScrollable;
        this.makeColumnsResizable = this.options.makeColumnsResizable === undefined ? true : this.options.makeColumnsResizable;
        _.extend(this.events, this.gridEvents); //Copy grid events into parents events.
        return this;
    },
    renderGrid: function () {
        this.$table = this.$el.find('table.customGridTable').first();
        var that = this;
        this.setupEventHandlers();
        this.setupGridScrolling();
        //Set Timeout needed, cannot setup column resizing until the table is in the DOM.
        //Set Timeout needed, cannot set header width until grid is filled out        
        setTimeout(function () {
            that.setupScrollPosition();
            that.setupResize();
            that.$el.find('.customGridScrollableContainer').scroll(function (ev) {
                that.repositionHeader(ev);
            });
            that.setupContextMenu();
            that.resizeGrid();
            if (that.isVisible()) {
                that.stopResize();
            }
            that.setHeaderWidth();
        }, 3);
    },
    resizeGrid: function () {
        if (!this.$el.is(':visible')) {
            return;
        }
        if (!this.resizeMe) {
            return;
        }
        var that = this;
        if (that.onResizeGrid) {
            that.onResizeGrid();
        }
        else {
            // Find a parent that has a height
            var $parents = that.$el.parents();
            var idx = 0;
            var length = $parents.length;
            for (idx; idx < length; idx++) {
                var $parent = $parents.eq(idx);
                that.$el.height(0);
                if ($parent.height()) {
                    that.$el.height($parent.height());
                    break;
                }
            }
        }
    },
    setupScrollPosition: function () {
        if (this.options.scrollPos) {
            this.$el.find('.customGridScrollableContainer').scrollTop(this.options.scrollPos);
        }
    },
    cleanupEventHandlers: function () {
        if (this.getGridCollection) {
            var collection = this.getGridCollection();
            if (collection) {
                this.stopListening(collection, 'change:isSelected', this.collectionSelectionChanged);
            }
        }

        this.$el.find('.customGridScrollableContainer').off('scroll', this.repositionHeader);
    },
    setupEventHandlers: function () {
        if (this.getGridCollection) {
            this.cleanupEventHandlers();
            var collection = this.getGridCollection();
            if (collection) {
                this.listenTo(collection, 'change:isSelected', this.collectionSelectionChanged);
                this.listenTo(collection, 'selectAll', function () {
                    var $trs = this.$table.find('tr:not(.emptyGridRow)');
                    var $selectedItemCBs = this.$table.find('.selectedItem');
                    $trs.addClass('customGridHighlight');
                    $selectedItemCBs.prop('checked', true);
                });

                this.listenTo(collection, 'clearAll', function () {
                    var $trs = this.$table.find('tr:not(.emptyGridRow)');
                    var $selectedItemCBs = this.$table.find('.selectedItem');
                    $trs.removeClass('customGridHighlight');
                    $selectedItemCBs.prop('checked', false);
                });
            }
        }
    },
    //#region Resize grid column handling
    addResizeHandles: function () {
        var $colResCont = this.$el.find('.customGridColumnResizeContainer').first();
        $colResCont.remove();
        var $headers = this.$header.find('.customGridHeader');
        // Create resize handles for each header (that is resizable)
        var div = document.createElement('div');
        div.className = 'customGridColumnResizeContainer';
        var idx = 0;
        var length = $headers.length;
        // Do not add a handle for the last column
        for (idx; idx < length      ; idx++) {
            var $header = $headers.eq(idx);
            var colId = $header.data('columnid');
            if (colId) {
                var handle = document.createElement('div');
                handle.className = 'customGridColumnResizeHandle';
                handle.style.left = this.getHandlePosition($header);
                handle.setAttribute('data-columnid', $header.data('columnid'));
                div.appendChild(handle);
            }
        }
        this.$header.parent('table').before(div);
    },
    repositionResizeHandles: function () {
        var $headers = this.$header.find('.customGridHeader');
        var idx = 0;
        var length = $headers.length;
        for (idx; idx < length; idx++) {
            var $header = $headers.eq(idx);
            var $handleContainer = this.$el.find('.customGridColumnResizeContainer').first();
            var $handle = $handleContainer.find('.customGridColumnResizeHandle[data-columnid="' + $header.data('columnid') + '"]');
            $handle.css('left', this.getHandlePosition($header));
        }
    },
    getHandlePosition: function ($header) {
        // Determine if it is the last header, if so the offset is the width of the handle
        var $headers = this.$header.find('.customGridHeader');
        var offset = -3;
        if ($headers.index($header) === $headers.length - 1) {  // index is 0-based
            offset = -7;    // offset is the width of the handle
        }
        return ($header.position().left + $header.width() + offset) + 'px';   // -3 so it is centered around the header's right side border
    },
    addResizeHelper: function () {
        if (!this.dragData) {
            return;
        }
        var handle = this.dragData.handle.get(0);
        var helper = document.createElement('div');
        helper.className = 'customGridResizeHelper';
        var $thead = this.dragData.table.find('thead');
        var hHeight = $thead.height();
        var tbHeight = this.dragData.table.find('tbody').height();
        helper.style.height = hHeight + tbHeight + 'px';
        handle.appendChild(helper);
    },
    removeResizeHelper: function () {
        if (!this.dragData) {
            return;
        }
        var $handle = this.dragData.handle;
        var $helper = $handle.find('.customGridResizeHelper');
        $helper.remove();
    },
    setupResize: function () {
        // Obtain header for resizing
        this.$header = this.$table.find('thead').first();
        var that = this;
        this.listenTo(Backbone, 'customGlobalEvents:accordionToggle', this.gceResize);
        this.listenTo(Backbone, 'customGlobalEvents:resizing', this.hideHeader);
        this.listenTo(Backbone, 'customGlobalEvents:resize', function (options) {
            options = options || {};
            if (options.windowResize || (that.resizeOnDocumentViewResize && options.resizeDocumentView)) {
                that.gceResize();
            } else {
                that.showHeader(); //customGlobalEvents:resizing always hides all headers, 
            }
        });
        if (!this.makeColumnsResizable) {
            return;
        }
        this.addResizeHandles();
    },
    isVisible: function () {
        return this.$el.is(':visible') && this.$el.css('visibility') !== 'hidden';
    },
    gceResize: function () {
        var that = this;
        clearTimeout(that.windowResizeTimeout);
        that.setHeaderVisibility(false);
        that.windowResizeTimeout = setTimeout(function () {
            if (!that.isVisible()) {
                return;
            }
            that.resizeGrid();
            that.setHeaderVisibility(true);
            that.stopResize();
            that.showHeader();
            that.setHeaderWidth();
        }, 4);
    },
    setHeaderVisibility: function (visible) {
        var $header = this.$el.find('.customGridHeaderContainer').first();
        $header.css('visibility', visible ? 'inherit' : 'hidden');
    },
    hideHeader: function () {
        var $header = this.$el.find('.customGridHeaderContainer').first();
        $header.hide();
        this.setHeaderVisibility(false);
    },
    showHeader: function () {
        var $header = this.$el.find('.customGridHeaderContainer').first();
        $header.show();
        this.setHeaderVisibility(true);
    },
    setupContextMenu: function () {
        var that = this;
        var $headers = this.$el.find('table.customGridTable .customGridHeader');
        var menu = {
            onContextMenu: function (e) {
                var colId = $(e.currentTarget).data('columnid');
                var colPreferences = Utility.tryParseJSON(Utility.GetUserPreference(that.prefKeyPrefix + 'col_Pref')) || {};
                if (colPreferences && colPreferences[colId]) {
                    if (colPreferences[colId].width !== undefined && colPreferences[colId].changed) {
                        return true;
                    }
                }
                return false;
            },
            alias: "removeOptionsCMRoot" + this.cid,
            width: 200,
            items: [
                {
                    text: Constants.c.removePredefinedWidth,
                    icon: "",
                    alias: "RCWD",
                    action: function (t) {
                        that.removeColumnWidth(t);
                    }
                },
                {
                    text: Constants.c.removeAllPredefinedWidth,
                    icon: "",
                    alias: "RCWDA",
                    action: function () {
                        that.removeAllColumnWidth();
                    }
                }
            ]
        };
        $headers.contextmenu(menu);
    },
    removeColumnWidth: function (t) {
        var id = $(t).data('columnid');
        var preference = Utility.tryParseJSON(Utility.GetUserPreference(this.prefKeyPrefix + 'col_Pref'));
        // 100 is default width to make columns visible (column added from column chooser will have always 100px width)
        preference[id].width = 100;
        preference[id].changed = false;
        this.resetColumnUserPreference(preference);
    },
    removeAllColumnWidth: function () {
        var preference = Utility.tryParseJSON(Utility.GetUserPreference(this.prefKeyPrefix + 'col_Pref'));
        var id;
        for (id in preference) {
            if (preference.hasOwnProperty(id)) {
                // 100 is default width to make columns visible (column added from column chooser will have always 100px width)
                preference[id].width = 100;
                preference[id].changed = false;
            }
        }
        this.resetColumnUserPreference(preference);
    },
    resetColumnUserPreference: function (preference) {
        Utility.SetSingleUserPreference(this.prefKeyPrefix + 'col_Pref', JSON.stringify(preference));
        this.colPreferences = preference;
        this.render();
    },
    startResize: function (ev) {
        var $targ = $(ev.currentTarget);
        if (ev.which === 1) {
            var that = this;
            var oe = ev.originalEvent.touches;           //touch or mouse event?
            var $table = this.$table;
            this.dragData = {
                table: $table,
                handle: $targ,
                element: $table.find('th[data-columnid="' + $targ.data('columnid') + '"]'),
                originalPosition: $targ.position(),
                pageX: oe ? oe[0].pageX : ev.pageX
            };
            this.addResizeHelper();
            $(document).on('touchmove.customGridResize.' + this.cid + ', mousemove.customGridResize.' + this.cid + ', touchstart.customGridResize.' + this.cid + ', mousedown.customGridResize.' + this.cid, function (event) {
                that.onHandleDrag(event);
                return false;   // prevent text selection
            }).on('touchend.customGridResize.' + this.cid + ', mouseup.customGridResize.' + this.cid, function (event) {
                that.$el.find('[data-percentwidth]').attr('data-percentwidth', '');// clear percent width on all columns when resizing columns
                that.stopResize();
            });
        }
    },
    stopResize: function (ev) {
        // Remove events for moving the handle and for ending the resize
        $(document).off('.customGridResize.' + this.cid);
        this.applyColumnWidths();
        this.onResize();
        this.repositionResizeHandles();
        this.removeResizeHelper();
        this.dragData = undefined;
    },
    onHandleDrag: function (ev) {
        if (!this.dragData) {
            return;
        }
        var oe = ev.originalEvent.touches;
        var ox = oe ? oe[0].pageX : ev.pageX;    //original position (touch or mouse)
        var x = ox - this.dragData.pageX + this.dragData.originalPosition.left;
        var $handle = this.dragData.handle;
        var $elem = this.dragData.element;
        var $prev = $elem.prev('th');
        var minWidth = 20;
        var min = $prev.length > 0 ? $prev.position().left + $prev.width() + minWidth : 20;
        x = Math.max(min, x);
        this.dragData.x = x;
        $handle.css('left', x + 'px');
    },
    applyColumnWidths: function () {
        if (!this.dragData) {
            return;
        }
        var $elem = this.dragData.element;
        var inc = this.dragData.x - this.dragData.originalPosition.left;
        // Added additional to check increment isNAN. 
        var w = $elem.outerWidth(true) + (isNaN(inc) ? 0 : inc);
        var $thead = this.$header;
        var totWidth = $thead.outerWidth(true);
        var wPercent = w / totWidth * 100;
        this.dragData.elemWidth = w;
        $elem.width(w);
    },
    onResize: function () {
        var $table = this.$table;
        if (this.dragData) {
            $table = this.dragData.table;
            // Only update those that are actually changing
            var colWidths = 0;
            if (this.onColumnsChanged) {
                var result = {};
                var $thead = $table.find('thead').first();
                var columns = $thead.find('th');
                var $elem = this.dragData.element;
                var ranges = [], total = $thead.outerWidth(true), i = 0, length = columns.length - 1, w, numNonResizeCols = 0;
                var elemColId = $elem.data('columnid');
                for (i = 0; i < length; i++) {
                    var $col = columns.eq(i);
                    colWidths += $col.width();
                    var colId = $col.data('columnid');
                    if (!colId) {
                        numNonResizeCols++;
                    }
                    else if (colId && colId !== elemColId) {
                        w = $col.width();
                        ranges.push({ colId: colId, width: w, order: $col.index() });
                    }
                    $col.attr('data-percentwidth', '');  // remove the stored percentage width, so it won't be used for calculations when resizeColumns is called
                }
                if (elemColId) {
                    result[elemColId] = { width: this.dragData.elemWidth, order: $elem.index() - numNonResizeCols, changed: true };
                }
                length = ranges.length;
                for (i = 0; i < length; i++) {
                    result[ranges[i].colId] = { width: ranges[i].width, order: ranges[i].order - numNonResizeCols };
                }
                this.onColumnsChanged(result);
                this.setHeaderFillerColumnWidth(columns, colWidths);
            }
            else {
                this.resizeColumns($table);
            }
        }
        else {
            this.resizeColumns($table);
        }
    },
    resizeColumns: function ($table) {
        // Obtain the correct header
        // The header may be part of the 'scrollable' containers or it may be just the child of the passed in $table
        var $hthead;
        var $customGridTableContainer = this.$el.find('.customGridTableContainer').has($table);
        if ($customGridTableContainer.length) {
            var $headerTable = $customGridTableContainer.find('.customGridHeaderContainer table');
            $hthead = $headerTable.find('thead').first();
        }
        else {
            $hthead = $table.find('thead').first();
        }
        var $hcols = $hthead.find('th');
        var $thcols = $table.find('thead').first().find('th:not(.fillHeader)');
        // Add the 'percentwidth' attribute to columns that have % widths, but only once to reduce work that is done
        var setPercentWidth = $table.data('setpercentwidth');
        var totTableWidth = this.getTotalTableWidth($table);
        var i, length;
        if (!setPercentWidth) {
            length = $thcols.length;
            for (i = 0; i < length; i++) {
                var $thcol = $thcols.eq(i);
                var cssWidth = Utility.getCSSWidth($thcol);
                // If for any reason any column is determined to be the same width as the table initially (IE9 and IE10 when no widths are set for any column) - UGH IE, really!?, yes really...
                // set its width to a proportional width of the total, because the other columns are determined to have the same proportional width (100 / length)
                if ($thcol.outerWidth() === totTableWidth) {
                    cssWidth = 100 / length + '%';
                    $thcol.css('width', cssWidth);
                }
                if (cssWidth && cssWidth.toString().match('%')) {
                    $thcol.attr('data-percentwidth', (parseFloat(cssWidth) / 100));
                }
            }
            $table.data('setpercentwidth', true);
        }
        var staticColData = this.getStaticColData($table);
        length = $hcols.length;
        for (i = 0; i < length; i++) {
            var $hcol = $hcols.eq(i);
            var hColId = $hcol.data('columnid');
            if (hColId) {
                var $tableCol = $table.find("[data-columnid='" + hColId + "']");
                var hw = $tableCol.width(); // translates any % widths to 'px' widths
                // The table has border-collapse: collapse, which causes the columns borders to overlay each other
                // Without adding 1/2 the width of the borders (below) for each column the grid content would shrink by 1px every time this function was executed
                var borderWidth = $tableCol.outerWidth() - $tableCol.width();
                hw += borderWidth / 2;
                var percentWidth = $tableCol.attr('data-percentwidth');
                var colCSSWidth = Utility.getCSSWidth($hcol);
                // obtain the cssWidth again to make sure it is still %
                if (percentWidth || (colCSSWidth && colCSSWidth.toString().match('%'))) {
                    percentWidth = percentWidth || (parseFloat(colCSSWidth) / 100);
                    var reduceWidth = borderWidth;//staticColData.numCols <= 0 ? 0 : (1 + 1 / staticColData.numCols);
                    hw = (totTableWidth - staticColData.width) * percentWidth - reduceWidth;  // Need to have a total of 1 less width amongst all of the columns changing widths
                }
                if (hw < 20) {
                    hw = 20;    // minimum width
                }
                // Reset the columns width to the translated width.
                // This ensures any '%' based widths are properly reset to px widths 
                // This also ensures both headers, the one for dispay and the one for resize, have equivalent widths for their columns.
                $tableCol.width(hw);
                if (percentWidth) {
                    $tableCol.attr('data-percentwidth', percentWidth);
                }
                if (hColId && hw) {
                    $hcol.width(hw);
                }
            }
        }
    },
    ///<summary>
    /// Get the width of the viewable area of the table. Excludes the width of the table that is overflowed.
    ///</summary>
    getTotalTableWidth: function ($table) {
        var $tableCont;
        var $customGridTableContainer = this.$el.find('.customGridTableContainer').has($table);
        if ($customGridTableContainer.length) {
            $tableCont = $customGridTableContainer.find('.customGridScrollableContainer').has($table);
        }
        else {
            $tableCont = $table.closest('tr');  // find closest ancestor that is a tr tag
        }
        if (!$tableCont.length) {
            $tableCont = $table.parent();
        }
        var totWidth = $tableCont.outerWidth(true);
        var hasVerticalScrollbar = Utility.hasVerticalScrollbar($tableCont);
        var hasHorizontalScrollbar = Utility.hasHorizontalScrollbar($tableCont);    // For IE9, because the presence of a horizontal scrollbar means there is a vertical scrollbar
        if (hasVerticalScrollbar) {
            var sbWidth = Utility.getScrollbarWidth();
            totWidth -= sbWidth;
        }
        return totWidth;    // Viewable table width (without overflow width)
    },
    ///<summary>
    /// Obtain widths of columns that are static (one's without column id's)
    ///</summary>
    getStaticColData: function ($table) {
        var $ths = $table.find('thead').first().find('th');
        var staticColWidth = 0;
        var idx = 0;
        var length = $ths.length;
        var numCols = 0;
        for (idx; idx < length; idx++) {
            var $th = $ths.eq(idx);
            var thColId = $th.data('columnid');
            if ((!$th.attr('data-percentwidth') || !thColId) && !$th.hasClass('fillHeader')) {
                staticColWidth += $th.outerWidth(true);
                numCols++;
            }
        }
        if (numCols === length) {
            staticColWidth = 0;
        }
        return { width: staticColWidth, numCols: numCols };
    },
    setHeaderFillerColumnWidth: function (columns, colWidths) {
        var $lastCol = columns.last();
        if ($lastCol.hasClass('fillHeader')) {
            var $scrollContainer = this.$el.find('.customGridScrollableContainer');
            var totWidth = $scrollContainer.width();
            var offsetWidth = totWidth - colWidths;
            if (offsetWidth < 0) {
                offsetWidth = 0;
            }
            $lastCol.width(offsetWidth);
        }
    },
    //#endregion Resize grid column handling

    //#region Grid Scrolling
    ///<summary>
    /// Reposition the header and resize handles depending on scroll position
    ///</summary>
    repositionHeader: function (ev) {
        var $targ = $(ev.target);
        var st = $targ.scrollTop();
        var $resizeContainer = this.$el.find('.customGridColumnResizeContainer').first();
        if (st !== this.lastScrollTop) {    // scrolling in the y-direction
            this.lastScrollTop = st;
            $resizeContainer.css('top', st + 'px');
            return;
        }
        // Only if scrolling in the x-direction
        var $headerToMove = this.$el.find('.customGridHeaderContainer');
        var $headerThatMoved = $targ.find('.customGridTable');
        var offsetLeft = $headerThatMoved.offset().left;
        var parentOffsetLeft = this.$el.offset().left;
        $headerToMove.css('left', (offsetLeft - parentOffsetLeft) + 'px');
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        var that = this;
        this.scrollTimeout = setTimeout(function () {
            that.repositionResizeHandles();
            $resizeContainer.css('top', st + 'px');
        }, 200);
    },
    ///<summary>
    /// Set the width of the header table (changes depending on scrollbar existence / width)
    ///</summary>
    setHeaderWidth: function () {
        if (!this.makeScrollable) {
            return;
        }
        var $header = this.$el.find('.customGridHeaderContainer').first();
        var $headerTable = $header.find('table');
        // Determine if there is a scrollbar, if so reduce width by scrollbar width
        var $scrollContainer = this.$el.find('.customGridScrollableContainer');
        var hasVerticalScrollbar = Utility.hasVerticalScrollbar($scrollContainer);
        var sbWidth = Utility.getScrollbarWidth();
        if (hasVerticalScrollbar) {
            $header.css('right', sbWidth);
        }
        else {
            $header.css('left', 0);
            $header.css('right', 0);
        }
    },
    setupGridScrolling: function () {
        if (!this.makeScrollable) {
            return;
        }
        var $header = this.$table.find('thead').first();
        // Ensure each column has a specified width - otherwise column resize won't work nicely
        var $ths = $header.find('th');
        var idx = 0;
        var length = $ths.length;
        var numCols = $ths.length;
        for (idx; idx < length; idx++) {
            var noWidth = false;
            var $th = $ths.eq(idx);
            var isSelectCol = $th.find('.selectAllItems').length > 0;
            if (isSelectCol) {
                noWidth = true;
                width = 20;
                --numCols;
            }
            else if (!$th.width() && !$th.hasClass('nonResizable')) {
                noWidth = true;
                width = 100 / numCols + '%';
            }
            if (noWidth) {
                $th.width(width);
            }
        }
        // Add in filler header column, only allow one filler header column
        // has to be added to the original header, before the absolutely positioned header is created via createHeader
        if (!$header.find('.fillHeader').length) {
            var fillHeader = document.createElement('th');
            fillHeader.className = 'fillHeader';
            $header.find('tr').append(fillHeader);
        }
        // Wrap the table in a relatively positioned div
        var customGridTableContainer = document.createElement('div');
        customGridTableContainer.className = 'customGridTableContainer';
        this.$table.wrap(customGridTableContainer);
        this.createHeader();
        this.hasFooter = this.$table.find('tfoot') && this.$table.find('tfoot').length > 0;
        if (this.hasFooter) {
            this.createFooter();
        }
        // Make the table scrollable last, so the header and footer are properly positioned outside the tables wrapper
        this.createTable();
    },
    createHeader: function () {
        // Re-obtain header for resizing
        this.$header = this.$table.find('thead').first().clone();
        // Don't do anything if there is no header
        if (!this.$header || this.$header.length === 0) {
            return;
        }
        // Prepend the cloned header before the table
        var headerContainer = document.createElement('div');
        headerContainer.className = 'customGridHeaderContainer';
        var headerContainerTable = document.createElement('table');
        headerContainerTable.className = 'customGridTable';
        headerContainerTable.appendChild(this.$header.get(0));
        headerContainer.appendChild(headerContainerTable);
        this.$table.before(headerContainer);
    },
    createTable: function () {
        // Wrap the table in a div that has has overflow and is positioned absolutely
        var scrollableDiv = document.createElement('div');
        scrollableDiv.className = 'customGridScrollableContainer';
        var bottom = '0px';
        if (this.hasFooter) {
            bottom = '21px';
        }
        scrollableDiv.style.bottom = bottom;
        this.$table.wrap(scrollableDiv);
    },
    createFooter: function () {
        this.$footer = this.$table.find('tfoot').first();
        if (!this.$footer || this.$footer.length === 0) {
            return;
        }
        // Prepend the cloned footer before the table
        var footerContainer = document.createElement('div');
        footerContainer.className = 'customGridFooterContainer';
        var footerContainerTable = document.createElement('table');
        footerContainerTable.className = 'customGridTable';
        footerContainerTable.appendChild(this.$footer.get(0));
        footerContainer.appendChild(footerContainerTable);
        this.$table.after(footerContainer);
    },
    //#endregion Grid Scrolling

    sortColumn: function (ev) {
        var $sel = $(ev.currentTarget);
        var colId = $sel.data('columnid');
        if (colId && this.onSortGrid) {
            this.onSortGrid(colId, $sel);
        }
    },
    columnEdit: function (ev) {
        var $sel = $(ev.currentTarget);
        var colId = $sel.parent().parent().data('columnid');
        if (colId && this.onColumnEdit) {
            this.onColumnEdit(colId, $sel);
        }
        ev.stopPropagation(); //Don't propegate the event to the TH above which is also listening for a click event to sort.
        return false;
    },
    cellClick: function (ev, clickAndEdit) {
        var $ct = $(ev.currentTarget);
        var that = this;
        var cellId = $(ev.currentTarget).data('cellid');
        var validateMethod = function (e) {
            var actualName = "";
            var type = "";
            var df = window.databaseFields.get(cellId);
            if (df) {
                actualName = df.get('ActualName');
                type = df.get('Type');
            }
            that.validateInput({
                input: e.currentTarget,
                index: actualName,
                value: $(e.currentTarget).val(),
                type: type,
                onError: function (message) {
                    Utility.disableButtons([Constants.c.ok]);
                    ErrorHandler.addErrors({ 'error': message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'div', 'id');
                },
                onSuccess: function () {
                    Utility.enableButtons([Constants.c.ok]);
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                }
            });
        };
        var isSelectedItemCB = $ct.hasClass('selectedItem') || $ct.find('.selectedItem').length > 0;
        // If clicking a subgrid expander, don't enter edit mode
        if (!isSelectedItemCB &&
            ((ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.target.tagName === 'OPTION'))
            || $ct.find('.subgridExpand').length > 0 || $(ev.target).parents(".ui-combobox").length > 0)) {
            $(ev.currentTarget).off('keyup change', 'input, textarea').on('keyup change', 'input, textarea', validateMethod);
            return; //Already in edit mode. Ignore click events.
        }
        if (!isSelectedItemCB && this.options.singleClickEdit) {
            this.enterEditMode(ev);
        } else {
            var rowId = $ct.parent().data('rowid');
            var selected = $ct.parent().find('input.selectedItem').is(':checked');
            //Check to see if we should fire the onRowSelect event.
            if (this.onRowSelect && (!this.lastClick || this.lastClick.rowId !== rowId || !selected)) {
                this.exitEditMode();    // Exit edit mode first, so the row can be saved or cancelled accordingly
                this.onRowSelect(rowId, $ct, ev);
            }
            //Do not fire double click or enter edit when shift or ctrl modifiers are pressed.
            if (!ev.ctrlKey && !ev.shiftKey) {
                //Check to see if we should fire the double click event or the edit mode event
                if (!clickAndEdit && (this.onRowDoubleClick || this.onEdit) && this.lastClick && this.lastClick.rowId === rowId) {
                    var currMS = new Date().getTime();
                    var ms = currMS - this.lastClick.ms;
                    if (ms < 500) { //500ms is the default double click interval in windows. this may become a user preference if needed.
                        clearTimeout(this.enterEditTimeout);
                        if (this.onRowDoubleClick) { //If onRowDoubleClick is not implemented then assume we just want to enter edit mode.
                            this.exitEditMode();    // Exit edit mode before proceeding with double click event (eg. viewing a document)
                            this.onRowDoubleClick(rowId, $ct);
                        } else {
                            this.enterEditMode(ev);
                        }
                    }
                        //Finally check to see if we are entering edit mode.
                    else if (ms >= 500) {
                        this.enterEditTimeout = setTimeout(function () { that.enterEditMode(ev); }, 500); //Delay for the click, preview, then double click to view.
                    }
                }
                else if (clickAndEdit) { //Special invocation of this method to say row select and edit.
                    this.enterEditMode(ev);
                }
            }
            this.lastClick = { rowId: rowId, ms: new Date().getTime() };
        }
        this.$el.find("[data-cellid='" + cellId + "']").off('keyup change', 'input, textarea').on('keyup change', 'input, textarea', validateMethod);
    },
    enterEditMode: function (ev) {
        if (this.onEdit) {
            var $ct = $(ev.currentTarget);
            var rowId = $ct.parent().data('rowid');
            this.exitEditMode();
            this.editRowId = rowId;
            this.onEdit(rowId, $ct);
        }
    },
    exitEditMode: function () {
        if (this.editRowId && this.onExitEdit) {
            this.onExitEdit(this.editRowId, this.editRowId);
        }
        this.editRowId = null;
    },
    focusElement: function (cellId, $trContainer) {
        if (!cellId) {
            return;
        }
        var $tds = $trContainer.find('td');
        var i = 0;
        var length = $tds.length;
        for (i; i < length; i++) {
            var $td = $tds.eq(i);
            if ($td.data('cellid') === cellId) {
                var $editEl = $td.find('input, select');
                $editEl.focus();
                $editEl.select();
                break;
            }
        }
    },
    ///<summary>
    /// Obtain the width from passed in preferences
    ///<param name="key">The preference name to obtain a width from
    ///<param name="colPrefs">column preferences to obtain a possible width from</param>
    ///<param name="defColPrefs">default column preferences to obtain a width froms if one is not obtained from the provided colPrefs</param>
    ///</summary>
    getWidthFromPreference: function (key, colPrefs, defColPrefs) {
        key = key || undefined;
        colPrefs = colPrefs || {};
        defColPrefs = defColPrefs || {};
        var width = colPrefs[key] ? colPrefs[key].width : undefined;
        var w = width + 'px;';
        var tmpWidth = 0;
        var defColPref = defColPrefs[key];
        if (defColPref && defColPref.width && defColPref.width === width) {
            return defColPref.width + '%';
        }
        if (!width) {
            w = '100%';
        }
        return w;
    },
    //#region Selection Handling
    ///<summary>
    /// Call for any grid that wishes to have multiple selection as well as ctrl and shift key row selection support, meant to centralize selection
    /// If getGridCollection is not provided onRowSelect will do nothing
    ///<param name="rowId">the id of the row being selected</param>
    ///<param name="$td">the td element that was clicked</param>
    ///<param name="ev">event that triggered this event handler</param>
    ///</summary>
    onGridRowSelect: function (rowId, $td, ev) {
        if (!this.getGridCollection) {
            return;
        }
        var collection = this.getGridCollection();
        var ids = [rowId];
        var isRowSelected = $td.parent().hasClass('customGridHighlight');
        if (ev.ctrlKey) {
            ids = this.getGridSelectedIds ? this.getGridSelectedIds() : collection.getSelectedIds();
        } else if (ev.shiftKey) {
            ids = this.getGridSelectedIds ? this.getGridSelectedIds() : collection.getSelectedIds();
            if (ids.length > 0) {
                var firstResult = collection.get(ids[0]);
                var fIdx = collection.indexOf(firstResult);
                var selResult = collection.get(rowId);
                var sIdx = collection.indexOf(selResult);
                ids = [];
                var start = fIdx >= sIdx ? sIdx : fIdx;
                var end = fIdx >= sIdx ? fIdx : sIdx;
                while (start <= end) {
                    var idAttr = collection.getIdAttribute(collection.at(start));
                    if (fIdx < sIdx) {
                        ids.push(collection.at(start).get(idAttr));
                    } else {
                        ids.unshift(collection.at(start).get(idAttr));
                    }
                    start++;
                }
                Utility.clearAllSelectedText(); //Shift click hightlights text, this will clear that.
            }
        }
        if (ev.ctrlKey || ev.shiftKey) {
            if (!isRowSelected) { //add id only if row is not selected
                ids.push(rowId); //Item is added to the end
            }
                //remove id if row already selected
            else if (isRowSelected && ids.length > 0 && ids.indexOf(rowId) > -1) {
                ids.splice(ids.indexOf(rowId), 1); //remove item from selection
            }
        }
        collection.setSelected(ids);
    },
    ///<summary>
    /// Change selection of all items or no items
    /// Can be overridden by child views
    ///<param name="ev">Event belonging to the checkbox changing state</param>
    ///</summary>
    selectAllItemsChanged: function (ev) {
        if (this.getGridCollection) {
            var collection = this.getGridCollection();
            var $currTarg = $(ev.currentTarget);
            var selected = $currTarg.is(':checked');
            var $trs = this.$table.find('tr:not(.emptyGridRow)');
            var $selectedItemCBs = this.$table.find('.selectedItem');
            if (selected) {
                collection.selectAll();
            } else {
                collection.clearSelected();
            }
        }
    },
    ///<summary>
    /// Event handler for the isSelected state changing for items in the collection
    /// Can be overridden by child views
    ///<param name="model">backbone model in the collection that has changed</param>
    ///<param name="value">the value of the property of the model that changed</param>
    ///<param name="options">backbone options, as well as any custom options</param>
    ///</summary>
    collectionSelectionChanged: function (model, value, options) {
        if (this.getGridCollection) {
            var collection = this.getGridCollection();
            var $selectAllItems = this.$el.find('input.selectAllItems');
            $selectAllItems.prop('checked', collection.areAllSelected());
        }
    },
    //#endregion Selection Handling

    onHover: function (ev) {
        var that = this;
        //Check if we should add a tooltip:
        //Must be a span
        if (ev.target.nodeName !== 'SPAN') {
            return;
        }
        //Must have a value
        var $targ = $(ev.target);
        var value = $targ.html().trim();
        if (!value) {
            return;
        }
        //Must not have a tooltip property. (Approvals have tooltips on the parent TD)
        if ($targ.prop('title') || $targ.parent().prop('title')) {
            return;
        }

        if (this.ttTimeoutId) {
            clearTimeout(this.ttTimeoutId);
        }
        this.ttTimeoutId = setTimeout(function () {
            that.ttElement = ev.target;
            var $ttEl = $(that.ttElement);
            $ttEl.tooltip({ content: value, items: 'span' });
            $ttEl.tooltip('open');
            that.ttTimeoutClose = setTimeout(function () {
                that.ttTimeoutClose = undefined;
                that.onHoverOut(ev);
            }, 10000);
            that.ttTimeoutId = undefined;
            $targ.off("remove.CustomGridTempEvent").on("remove.CustomGridTempEvent", function () {
                that.ttTimeoutClose = undefined;
                that.onHoverOut(ev);
            });
        }, 200);
    },
    onHoverOut: function (ev) {
        if (this.ttTimeoutClose) {
            clearTimeout(this.ttTimeoutClose);
            this.ttTimeoutClose = undefined;
        }
        if (this.ttTimeoutId) {
            clearTimeout(this.ttTimeoutId);
            this.ttTimeoutId = undefined;
        }
        if (this.ttElement) {
            if ($(this.ttElement).tooltip("instance")) {
                $(this.ttElement).tooltip('destroy');
            }
            this.ttElement = undefined;
        }
    },
    validateInput: function (options) {
        var result = {},
            input = $(options.input),
            index = options.index,
            value = options.value,
            type = options.type,
            onError = options.onError,
            onSuccess = options.onSuccess,
            errorContainer = options.errorContainer,
            removeErrorSpan = function () {
                $(input).removeClass(css.inputErrorClass);
                if (!errorContainer) {
                    $(input).parent().find('br').remove();
                    $('.' + css.warningErrorClass, $(input).parent()).remove();
                } else {
                    $('.' + css.warningErrorClass, errorContainer).remove();
                }
                Utility.enableButtons([Constants.c.ok]);
                var row = $(input).parent().parent().parent();
                if (row && row.length > 0) {
                    var errorCell = row.find('.' + css.warningErrorClass);
                    if (errorCell && errorCell.length > 0) {
                        $(input).parent().parent().parent().find('.saveRow').hide();
                        $(input).parents('.DocumentMetaFieldGroupView').find('.saveChanges').addClass('disabledIcon');
                    }
                    else {
                        $(input).parent().parent().parent().find('.saveRow').show();
                        $(input).parents('.DocumentMetaFieldGroupView').find('.saveChanges').removeClass('disabledIcon');
                    }
                }

            },
            addError = function (errorText) {
                result.success = false;
                result.errors[index] = errorText;
                removeErrorSpan();
                var errorMsg = '</br><' + css.warningErrorClassTag + ' class="' + css.warningErrorClass + '">' + errorText + '</' + css.warningErrorClassTag + '>';
                if (!errorContainer) {
                    $(input).after(errorMsg);
                } else {
                    $(errorContainer).append(errorMsg);
                }
                $(input).addClass(css.inputErrorClass);
                Utility.disableButtons([Constants.c.ok]);
                $(input).parent().parent().parent().find('.saveRow').hide();
                $(input).parents('.DocumentMetaFieldGroupView').find('.saveChanges').addClass('disabledIcon');
            },
            addMessage = function (msgText) {
                addError(msgText);
                result.success = true;
                $(input).removeClass(css.inputErrorClass);
            };
        var validateInputInt = function (value, minValue, maxValue) {
            var tmpValue = [];
            if (value instanceof Array) {
                tmpValue = value;
            }
            else {
                tmpValue.push(value);
            }
            var idx = 0;
            var length = tmpValue.length;
            for (idx; idx < length; idx++) {
                var val = parseInt(tmpValue[idx], 10);
                if (val && !isNaN(val)) {
                    if (val < parseInt(minValue, 10)) {
                        addError(Constants.c.valueTooSmall);
                    }
                    else if (val > parseInt(maxValue, 10)) {
                        addError(Constants.c.valueTooLarge);
                    }
                }
            }
        };
        var validateInputDecimal = function (val) {
            if (!!val) {
                val = val.toString();
                type = Constants.ty.Decimal;
                // we allow a total of 19 characters, up to 14 before and 5 after decimal
                var splitVal = val.split('.');
                var beforeDec = splitVal[0];
                var afterDec = splitVal[1];
                var beforeDecLen = beforeDec.length;
                var afterDecLen = afterDec ? afterDec.length : 0;
                var maxLen = 19;
                var maxRight = 5;
                var maxLeft = maxLen - maxRight;
                if (beforeDec.startsWith('-')) {
                    beforeDecLen -= 1;
                }
                var valLen = beforeDecLen + afterDecLen;
                if (valLen > maxLen || beforeDecLen > maxLeft || afterDecLen > maxRight) {
                    addError(String.format(Constants.c.invalidValue, Constants.c.ty_Decimal));
                }
            }
        };
        result.success = true;
        result.errors = {};
        removeErrorSpan();
        var check;
        var ch;
        switch (type) {
            case 'String':
                var trvalue = $.trim(value);
                // Only title has a limitation on its length
                if (index === Constants.UtilityConstants.SF_TITLE) {
                    if (!trvalue) {
                        value = '';
                        addError(Constants.c.enterATitle);
                    }
                    if (trvalue.length > parseInt(Constants.UtilityConstants.MAX_TITLE_LENGTH, 10)) {
                        addError(Constants.c.nameTooLong);
                        break;
                    }
                }
                if (index === 'Title') {    // For validating Capture Tab's Import Grid Title
                    if (!trvalue) {
                        value = '';
                        addMessage(Constants.c.dateAsTitle);
                    }
                }
                break;
            case 'Date':
                ch = function (date) {
                    return DateUtil.isDate(date);
                };
                check = ch(value);
                if (!check && value) {
                    addError(Constants.c.invalidDateSelection);
                    value = '';
                } else {
                    value = new Date(value).format('generalDateOnly');
                }
                break;
            case 'DateTime':
                ch = function (date) {
                    return DateUtil.isDate(date);
                };
                check = ch(value);
                if (!check && value) {
                    addError(Constants.c.invalidDateSelection);
                    value = '';
                } else {
                    value = Date(value);
                }
                break;
            case 'Boolean':
                break;
            case 'Int32':
                validateInputInt(value, Constants.IntMin, Constants.IntMax);
                break;
            case 'Int64':
                validateInputInt(value, Constants.LongMin, Constants.LongMax);
                break;
            case 'Double':
            case 'Float':
            case 'Decimal':
                validateInputDecimal(value);
                break;
            case 'Object':
            case 'Input':
                break;
            default:
                break;
        }
        result.value = value;
        return result;
    }
});