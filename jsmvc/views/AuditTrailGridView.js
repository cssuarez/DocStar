var AuditTrailGridView = CustomGridView.extend({
    model: undefined, //AuditTrailResultsCPX
    className: 'AuditTrailGridView',
    events: {
        'click .navigateFirstPage': 'firstPage',
        'click .navigatePreviousPage': 'previousPage',
        'click .navigateNextPage': 'nextPage',
        'click .navigateLastPage': 'lastPage',
        'keyup .navigateToPage': 'navigateToPage',
        'change .navigateToPage': 'navigateToPage'
    },
    initialize: function (options) {
        this.options = options;
        this.entityId = options.entityId;
        this.model = new AuditTrailResultsCPX();
        this.compiledTemplate = doT.template(Templates.get('audittrailgridlayout'));
        this.initializeGrid({});
        this.listenTo(this.model, 'change:Page', this.render);
        this.listenTo(this.model, 'sync', function (modelOrCollection, resp, options) {
            this.loaded = true;
            this.render();
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var results = this.model.getResults();
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
            maxResults: this.model.get('MaxRows')
        };
        if (results) {
            var maxRows = ro.maxResults;
            var currentPage = this.model.getCurrentPage();
            var start = (currentPage - 1) * maxRows;
            var total = this.model.get('Total');
            var totalPages = Math.ceil(total / maxRows);
            if (currentPage > 1) {
                ro.firstClass = '';
                ro.prevClass = '';
            }
            if (currentPage < totalPages) {
                ro.nextClass = '';
                ro.lastClass = '';
            }
            if (results.length > 0) {
                ro.navigateInputEnabled = true;
                ro.page = currentPage;
                ro.ofPages = Constants.c.of + ' ' + totalPages;
                var viewRangeLow = start + 1;
                var viewRangeHigh = start + maxRows;
                if (total < viewRangeHigh) {
                    viewRangeHigh = total;
                }
                ro.viewCount = String.format(Constants.c.recordText, viewRangeLow, viewRangeHigh, total);
            }
            ro.rows = results;
        }
        return ro;
    },
    render: function () {
        if (this.loaded) {
            var viewData = this.getRenderObject();
            this.$el.html(this.compiledTemplate(viewData));
            // setting width here instead of passing it into the template because it doesn't work for some reason (was not able to figure out why)
            this.$el.find('th').width(100 / 7 + '%');// 7 columns total
            this.renderGrid();
        }
        else {
            var throbber = document.createElement('span');
            throbber.className = 'loadingThrobber';
            this.$el.html(throbber);
            this.model.fetch({ entityId: this.entityId });
        }
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    //#region Event Handling
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
        var maxRows = this.model.get('MaxRows');
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
    //#endregion Event Handling
    //#region CustomGridView virtual functions
    onSortGrid: function (cellId, $th) {
        var sortName = cellId;
        if (this.model.get('SortBy') === sortName) {
            if (this.model.get('SortOrder') === 'desc') {
                this.model.set('SortOrder', 'asc');
            } else {
                this.model.set('SortOrder', 'desc');
            }
        }
        else {
            this.model.set('SortBy', sortName);
            this.model.set('SortOrder', 'asc');
        }
        this.model.sortResults(cellId);
        this.model.setPage(1);  // Go back to page 1 after results are sorted
    }
    //#endregion
});