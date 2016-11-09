var ImportJobsGridView = CustomGridView.extend({
    className: 'ImportJobsGridView',
    collection: undefined,
    model: undefined, //ImportJobResultsCPX
    itemViews: undefined,
    events: {
        'click .navigateFirstPage': 'firstPage',
        'click .navigatePreviousPage': 'previousPage',
        'click .navigateNextPage': 'nextPage',
        'click .navigateLastPage': 'lastPage',
        'keyup .navigateToPage': 'navigateToPage',
        'change .navigateToPage': 'navigateToPage',
        'click .dialogResults': 'showResultsDialog',
        'click .dialogException': 'showExceptionDialog'
    },
    close: function () {
        this.closeItemViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('importjobsgridviewwlayout'));
        this.initializeGrid({});
        this.listenTo(this.model, 'sync', this.render);
        this.listenTo(this.model, 'change:Page', function (model, value, options) {
            if (options.resetPageInput) {
                this.$el.find('.navigateToPage').val(value);
            }
            if (options.ignoreChange) {
                return;
            }
            if (options.syncMethod !== 'read') {
                this.onPageChange();
            }
        });
        this.itemViews = [];
        return this;
    },
    render: function () {
        this.ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.ro));
        this.renderGrid();
        this.renderGridItems();
        // Need to delegate events, otherwise navigation away from Import Jobs and back to it causes resizing and double clicking of 'Results' cells to not work
        this.delegateEvents();
        return this;
    },
    getRenderObject: function () {
        var results = this.model.get('Results');
        this.collection = results;
        var ro = {
            viewCount: Constants.c.noRecords,
            firstClass: 'disabledNav',
            prevClass: 'disabledNav',
            navigateInputEnabled: false,
            ofPages: Constants.c.of + ' ' + '0',
            page: 0,
            nextClass: 'disabledNav',
            lastClass: 'disabledNav',
            maxResults: this.model.getDotted('Request.MaxRows')
        };
        ro.colWidth = 'width: ' + (100 / 9) + '%';    // 9 columns total
        if (results) {
            var maxRows = ro.maxResults;
            var start = this.model.getDotted('Request.Start');
            var total = this.model.get('Total');
            var currentPage = this.model.getCurrentPage();
            var totalPages = Math.ceil(total / maxRows);
            ro.navigateInputEnabled = true;
            if (currentPage > 1) {
                ro.firstClass = '';
                ro.prevClass = '';
            }
            if (currentPage < totalPages) {
                ro.nextClass = '';
                ro.lastClass = '';
            }
            if (results.length > 0) {
                ro.page = currentPage;
                ro.ofPages = Constants.c.of + ' ' + totalPages;
                var viewRangeLow = start + 1;
                var viewRangeHigh = start + maxRows;
                if (total < viewRangeHigh) {
                    viewRangeHigh = total;
                }
                ro.viewCount = String.format(Constants.c.recordText, viewRangeLow, viewRangeHigh, total);
            }
        }
        return ro;
    },
    renderGridItems: function () {
        this.closeItemViews();
        var $container = this.$el.find('tbody');
        $container.empty(); //Remove any other rows left over after the item views are closed.
        var results = this.model.get('Results');
        var i = 0;
        var length = results.length;
        for (i; i < length; i++) {
            var model = results.at(i);
            var iv = new ImportJobsGridItemView({ model: model });
            $container.append(iv.render().$el);
        }

        //Append an empty row to the end of the list, this will be used to fill the remaining space.
        var tr = document.createElement('tr');
        tr.setAttribute('class', 'emptyGridRow');
        var td = document.createElement('td');
        td.setAttribute('colspan', 6);
        tr.appendChild(td);
        $container.append(tr);
    },
    closeItemViews: function () {
        var iv = this.itemViews.pop();
        while (iv) {
            iv.close();
            iv = undefined;
            iv = this.itemViews.pop();
        }
    },
    firstPage: function () {
        this.model.setPage(1);
    },
    previousPage: function () {
        var currentPage = this.model.getCurrentPage();
        this.model.setPage(currentPage - 1);
    },
    nextPage: function () {
        var currentPage = this.model.getCurrentPage();
        this.model.setPage(currentPage + 1);
    },
    lastPage: function () {
        var maxRows = this.model.getDotted('Request.MaxRows');
        var total = this.model.get('Total');
        var totalPages = Math.ceil(total / maxRows);
        this.model.setPage(totalPages);
    },
    navigateToPage: function (ev) {
        var page = $(ev.currentTarget).val();
        var currentPage = this.model.getCurrentPage();
        if (page === currentPage) { // prevents this event from being triggered infinitely when setting the page to the same value
            return;
        }
        if (ev.type === 'change' || ev.which === 13) {
            this.model.setPage($(ev.currentTarget).val());
        }
    },
    onPageChange: function () {
        var page = this.model.getCurrentPage();
        var maxResults = this.model.getDotted('Request.MaxRows');
        var start = (maxResults * (page - 1));  // Start is 0-based while page is 1-based
        var sr = this.model.get('Request');
        sr.set({
            Start: start
        });
        this.model.fetch();
    },
    showResultsDialog: function (e) {
        var results = this.model.get('Results');
        var $sel = $(e.currentTarget);
        var id = $sel.parent().data('rowid');
        results.showResults(this.jsonDataDialog, id);
    },
    showExceptionDialog: function (e) {
        var results = this.model.get('Results');
        var $sel = $(e.currentTarget);
        var id = $sel.parent().data('rowid');
        results.showErrors(this.jsonDataDialog, id);
    },
    jsonDataDialog: function (options) {
        $('#results_data').html(options.html);
        $('#results_data').dialog({
            modal: true,
            minWidth: 200,
            minHeight: 200,
            title: options.title,
            open: function () {
                Utility.enableButtons([Constants.c.previous, Constants.c.next]);
            },
            buttons: [{
                text: Constants.c.previous,
                click: function () {
                    $(this).dialog('close');
                    options.viewPrevious();
                }
            },
            {
                text: Constants.c.next,
                click: function () {
                    $(this).dialog('close');
                    options.viewNext();
                }
            },
            {
                text: Constants.c.close,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
    },
    //#region CustomGridView virtual functions
    onRowSelect: function (rowId, $td, ev) {
        this.onGridRowSelect(rowId, $td, ev);
    },
    onSortGrid: function (cellId, $th) {
        var sr = this.model.get('Request');
        var sortName = cellId;
        if (sr.get('SortedBy') === sortName) {
            if (sr.get('SortOrder') === 'desc') {
                sr.set('SortOrder', 'asc');
            } else {
                sr.set('SortOrder', 'desc');
            }
        } else {
            sr.set('SortedBy', sortName);
            sr.set('SortOrder', 'asc');
        }
        this.model.fetch();
    },
    getGridCollection: function () {
        return this.collection;
    }
    //#endregion
});