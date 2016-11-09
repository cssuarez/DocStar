var AuditGridView = CustomGridView.extend({
    className: 'AuditGridView',
    options:undefined,
    model: undefined, //AuditResultsCPX
    events: {
        'click .navigateFirstPage': 'firstPage',
        'click .navigatePreviousPage': 'previousPage',
        'click .navigateNextPage': 'nextPage',
        'click .navigateLastPage': 'lastPage',
        'keyup .navigateToPage': 'navigateToPage',
        'change .navigateToPage': 'navigateToPage'
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('auditgridviewlayout'));
        this.options = options || {};
        this.initializeGrid(options);
        this.listenTo(this.model, 'reset sync', this.render);
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
        return this;
    },
    render: function () {
        this.ro = this.getRenderObject();
        this.options.scrollPos = this.$el.find('.customGridScrollableContainer').scrollTop();
        this.$el.html(this.compiledTemplate(this.ro));
        this.renderGrid();
        return this;
    },
    getRenderObject: function () {
        var results = this.model.get('Results');
        var ro = {
            rows: [],
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
            ro.rows = results.getDisplayValues();
        }
        ro.colWidth = 'width: ' + (100 / 8) + '%';    // 8 columns total
        return ro;
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
            ResultId: undefined,
            Start: start
        });
        this.model.fetch();
    },
    //#region CustomGridView virtual functions
    onRowSelect: function (rowId, $td, ev) {
        this.model.get('Results').setSelected([rowId]);
        this.render();
    },
    onSortGrid: function (cellId, $th) {
        var sr = this.model.get('Request');
        var sortName = cellId;
        if (sr.get('SortBy') === sortName) {
            if (sr.get('SortOrder') === 'desc') {
                sr.set('SortOrder', 'asc');
            } else {
                sr.set('SortOrder', 'desc');
            }
        } else {
            sr.set('SortBy', sortName);
            sr.set('SortOrder', 'asc');
        }
        this.model.fetch();
    }
    //#endregion
});