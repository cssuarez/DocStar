var AuditTrailResultsCPX = Backbone.Model.extend({
    cancellationToken: {},
    dateTimeFields: {},
    defaults: {
        Results: [], // FormattedAudit[]
        Total: 0,
        Page: 1,
        MaxRows: 25,
        SortOrder: 'asc',
        SortBy: 'CreatedOn'
    },
    proxy: AdminServiceProxy({ skipStringifyWcf: true }),
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        options = options || {};
        var that = this;
        options.syncMethod = method;
        this.cancelCalls();
        switch (method) {
            case "read":
                var sf = function (results) {
                    that.set({ Results: results, Total: results.length });
                    options.success(results); //This success is pass in by backbone to the sync function. This triggers the sync event.
                };
                var ff = function (jqXhr, status, err) {
                    that.errorHandler(jqXhr, status, err);
                };
                if (!this.cancellationToken[options.entityId]) {
                    this.cancellationToken[options.entityId] = {};
                }
                this.proxy.getAuditsForEntity(options.entityId, sf, ff, options.complete, this.cancellationToken[options.entityId]);
                break;
        }

    },
    getResults: function () {
        var page = this.get('Page');
        var maxRows = this.get('MaxRows');
        var start = (page - 1) * maxRows;
        var end = page * maxRows;
        var results = this.get('Results').slice(start, end);
        var i;
        var length = results.length;
        for (i = 0; i < length; i++) {
            var r = results[i];
            r.IsGuest = !!r.AuthorizedFor;
        }
        return results;
    },
    ///<summary>
    /// Sort the results based upon SortBy and SortOrder
    ///</summary>
    sortResults: function () {
        var results = this.get('Results');
        var type;
        if (this.get('SortBy') === 'CreatedOn') {
            type = Constants.ty.DateTime;
        }
        results.sort(Utility.sortByProperty(this.get('SortBy'), false, this.get('SortOrder'), type));
    },
    cancelCalls: function () {
        var item;
        for (item in this.cancellationToken) {
            if (this.cancellationToken.hasOwnProperty(item)) {
                if (this.cancellationToken[item] && this.cancellationToken[item].cancel) {
                    this.cancellationToken[item].cancel();
                }
            }
        }
    },
    errorHandler: function (jqXhr, status, errorThrown) {
        ErrorHandler.popUpMessage(errorThrown);
    },
    toJSON: function () {
        return this.toJSONComplex();
    },
    /// <summary>
    /// Gets the current page and ensures its valid
    /// </summary>
    getCurrentPage: function () {
        var page = this.get('Page');
        if (isNaN(parseInt(page, 10))) {
            page = 1;
        }
        return this.boundsCheckPage(page);
    },
    /// <summary>
    /// Sets the current page and ensures its valid
    /// </summary>
    setPage: function (page) {
        page = this.boundsCheckPage(page);
        if (parseInt(this.get('Page'), 10) === page) {
            this.trigger('change:Page', this, page, { ignoreChange: true, resetPageInput: true });
        }
        else {
            this.set('Page', page);
        }
    },
    /// <summary>
    /// Ensures the page passed is within the total number of pages found; returns 1 (rather than 0) if there are no rows
    /// </summary>
    boundsCheckPage: function (page) {
        page = parseInt(page, 10);
        if (isNaN(page)) {
            return this.getCurrentPage();
        }
        var maxRows = parseInt(this.get('MaxRows'), 10);
        var total = this.get('Total');
        var totalPages = Math.ceil(total / maxRows);
        if (page > totalPages) {
            page = totalPages;
        }
        if (page < 1) {
            page = 1;
        }
        return page;
    }
});