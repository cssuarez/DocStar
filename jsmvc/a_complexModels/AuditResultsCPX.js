//SearchResults<Audit>
var AuditResultsCPX = Backbone.Model.extend({
    cancellationToken: {},
    dateTimeFields: {},
    defaults: { Results: [], ResultId: '', Total: 0, Request: {}, Page: 1, MaxRows: 25, purgeAll: true, purgeDate: '' },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.Results) {
            if (this.get('Results') instanceof Backbone.Collection) {
                this.get('Results').reset(attrs.Results, options);
                delete attrs.Results;
            }
            else {
                attrs.Results = new Audits(attrs.Results, options);
                this.bindSubModelEvents(attrs.Results, 'Results');
            }
        }
        if (attrs.Request) {
            if (this.get('Request') instanceof Backbone.Model) {
                this.get('Request').set(attrs.Request, options);
                delete attrs.Request;
            }
            else {
                attrs.Request = new AuditSearchCriteria(attrs.Request, options);
                this.bindSubModelEvents(attrs.Request, 'Request');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        var that = this;
        options.syncMethod = method;
        this.cancelCalls();
        switch (method) {
            case "create":
                break;
            case "read":
                var sf = function (result) {
                    delete result.Request; //Do not reset the request object, in this call it always returned as null.
                    that.set(result);
                    options.success(result); //This success is pass in by backbone to the sync function. This triggers the sync event.
                };
                var ff = function (jqXhr, status, err) {
                    that.errorHandler(jqXhr, status, err);
                };
                var request = this.get('Request').toJSON();
                if (!this.cancellationToken[request.ResultId]) {
                    this.cancellationToken[request.ResultId] = {};
                }

                var adminProxy = AdminServiceProxy({ skipStringifyWcf: true });
                adminProxy.searchAudit(request, sf, ff, options.complete, this.cancellationToken[request.ResultId]);
                break;
            case "update":
                break;
            case "delete":
                break;
        }

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
    /// Clears the results and resets the request to defaults.
    /// </summary>
    clear: function () {
        this.set(this.defaults, { reset: true });
    },
    /// <summary>
    /// Executes a clear of the audit trail based on properties.
    /// </summary>
    clearAudit: function (dialogFunc, purgeDateElName) {
        var that = this;
        var selection = this.get('purgeAll') ? 'purgeAllAudit' : 'purgeAuditByDate';
        var message = Constants.c.purgeAuditWarning + Constants.c[selection];
        var date;
        if (!this.get('purgeAll')) {
            if (!DateUtil.isDate(this.get('purgeDate'))) {
                var errObj = {};
                errObj[purgeDateElName] = Constants.c.invalidDateSelection;
                ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                return;
            }
            date = this.get('purgeDate');
            message += ' ' + date;
        }
        message += '?';
        var options = {
            message: message,
            callback: function (cleanup) {
                var sf = function (result) {
                    Utility.executeCallback(cleanup);
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.popUpMessage(errorThrown);
                    Utility.executeCallback(cleanup);
                };
                var adminProxy = AdminServiceProxy();
                if (that.get('purgeAll')) {
                    adminProxy.clearAudit({}, sf, ff);
                } else {
                    adminProxy.clearAudit({ CutoffDate: new Date(date) }, sf, ff);
                }
            }
        };
        dialogFunc(options);
    },
    /// <summary>
    /// Gets the current page and ensures its valid
    /// </summary>
    getCurrentPage: function () {
        var page = this.get('Page');
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
        var maxRows = parseInt(this.getDotted('Request.MaxRows'), 10);
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