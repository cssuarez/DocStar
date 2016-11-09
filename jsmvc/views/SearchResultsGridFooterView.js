var SearchResultsGridFooterView = CustomGridView.extend({
    model: undefined, // SearchResultsCPX
    className: 'customGridPager',
    tagName: 'tr',
    searchResultsGridView: undefined,   // Parent Grid that will contain this footer
    headers: [],
    events: {
        'click  .columnSelector': 'chooseColumns', // column chooser located in the footer
        'click  .refreshGrid': 'refreshGrid',
        'click  .navigateFirstPage': 'firstPage',
        'click  .navigatePreviousPage': 'previousPage',
        'click  .navigateNextPage': 'nextPage',
        'click  .navigateLastPage': 'lastPage',
        'keyup  .navigateToPage': 'navigateToPage',
        'change .navigateToPage': 'navigateToPage'
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('SearchResultsGridFooterViewlayout'));
        this.searchResultsGridView = options.searchResultsGridView;
        this.showGridRefresh = options.searchResultsGridView.showGridRefresh;
        this.regionMode = options.searchResultsGridView.regionMode;
        this.headers = options.headers;
        this.model = options.searchResultsGridView.model;
        this.listenTo(this.model, 'change:Page', function (model, value, options) {
            if (options.resetPageInput) {
                this.$el.find('.navigateToPage').val(value);
            }
            if (options.ignoreChange || options.reset) {
                return;
            }
            if (options.syncMethod !== 'read') {
                this.onPageChange();
            }
        });
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        return this;
    },
    getRenderObject: function () {
        var results = this.model.get('Results');
        var ro = {
            maxResults: this.model.getDotted('Request.MaxRows'),
            headers: [],
            footers: [],
            firstClass: 'disabledNav',
            prevClass: 'disabledNav',
            nextClass: 'disabledNav',
            lastClass: 'disabledNav',
            navigateInputEnabled: false,
            page: 0,
            ofPages: Constants.c.of + ' ' + '0',
            viewCount: Constants.c.noRecords,
            regionMode: this.regionMode
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
        }
        ro.showGridRefresh = this.showGridRefresh;
        headers = this.headers;
        return ro;
    },
    refreshGrid: function (ev) {
        this.searchResultsGridView.refreshGrid(ev);
    },
    onKeyUp: function (ev) {
        if (ev.which === 13) {
            this.refreshGrid();
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
            ResultId: undefined,
            Start: start
        });
        this.model.fetch();
    },
    chooseColumns: function (e) {
        this.searchResultsGridView.chooseColumns(e);
    }

});