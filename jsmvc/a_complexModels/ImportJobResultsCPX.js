var ImportJobResultsCPX = Backbone.Model.extend({
    cancellationToken: {},
    dateTimeFields: {},
    defaults: { Results: [], Total: 0, Request: {}, Page: 1 },
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
                attrs.Results = new ImportJobs(attrs.Results, options);
                this.bindSubModelEvents(attrs.Results, 'Results');
            }
        }
        if (attrs.Request) {
            if (this.get('Request') instanceof Backbone.Model) {
                this.get('Request').set(attrs.Request, options);
                delete attrs.Request;
            }
            else {
                attrs.Request = new GetImportJobsPackage(attrs.Request, options);
                this.bindSubModelEvents(attrs.Request, 'Request');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        var that = this;
        options.syncMethod = method;
        switch (method) {
            case "create":
                break;
            case "read":
                var sf = function (result) {
                    var attrs = { Results: result.ImportJobResults, Total: result.Total };
                    that.set(attrs);
                    options.success(attrs); //This success is pass in by backbone to the sync function. This triggers the sync event.
                };
                var ff = function (jqXhr, status, err) {
                    that.errorHandler(jqXhr, status, err);
                };
                var request = this.get('Request').toJSON();

                var proxy = ImportExportServiceProxy({ skipStringifyWcf: true });
                proxy.GetImportJobsFiltered(request, sf, ff, options.complete);
                break;
            case "update":
                break;
            case "delete":
                break;
        }

    },
    errorHandler: function (jqXhr, status, errorThrown) {
        ErrorHandler.popUpMessage(errorThrown);
    },
    toJSON: function () {
        return this.toJSONComplex();
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
    },
    /// <summary>
    /// Returns the current page with a bounds check
    /// </summary>
    getCurrentPage: function () {
        var page = this.get('Page');
        return this.boundsCheckPage(page);
    },
    /// <summary>
    /// Sets the curren page with a bounds check
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
    /// Resets the criteria to the defaults and fetches a new set of results.
    /// </summary>
    clearAndRefresh: function () {
        this.set(this.defaults, { reset: true });
        this.fetch();
    },
    /// <summary>
    /// Sends a test email to the designated Import Job Email Recipient (System Setting)
    /// </summary>
    sendTestEmail: function (companyName, emailOptions, sf, ff, cf) {
        var htmlBody = this.PrepareHtml(companyName);

        var subject = String.format(Constants.c.ImportJobsDetail, companyName);
        emailOptions.Subject = subject;
        emailOptions.Body = htmlBody;
        var emailPkg = {
            Attachments: "",
            EmailOptions: emailOptions
        };
        var proxy = AdminServiceProxy();
        proxy.emailMessage(emailPkg, sf, ff, cf);
    },
    /// <summary>
    /// Creates the HTML body for the sendTestEmail function
    /// </summary>
    PrepareHtml: function (companyName) {
        var testMailHtml = "";
        var RowsHtml = "";
        var results = this.get('Results');
        if (results) {
            var i = 0;
            var length = results.length;
            for (i; i < length; i++) {
                var ij = results.at(i);
                var rowHtml = "<tr><td>" + ij.get('MachineName') + "</td>"
                              + "<td>" + ij.get('Username') + "</td>"
                              + "<td>" + ij.getStatus() + "</td>"
                              + "<td>" + ij.get('PercentDone') + "</td>"
                              + "<td>" + ij.get('StartedOn') + "</td>"
                              + "<td>" + ij.get('EndedOn') + "</td>"
                              + "<td>" + ij.get('Failures') + "</td>"
                              + "<td>" + ij.get('Results') + "</td>"
                              + "<td>" + ij.get('Exception') + "</td></tr>";
                RowsHtml = RowsHtml + rowHtml;

            }
            testMailHtml = "<h2>" + String.format(Constants.c.ImportJobsDetail, companyName) + "</h2><html>";
            testMailHtml = testMailHtml + "<table border='1'> <tr>"
                                    + "<td width='10%'>" + Constants.c.machineName + "</td> "
                                    + "<td width='10%'>" + Constants.c.userName + "</td>"
                                    + "<td width='5%'>" + Constants.c.status + "</td>"
                                    + "<td width='5%'>" + Constants.c.percentDone + "</td>"
                                    + "<td width='10%'>" + Constants.c.startedOn + "</td>"
                                    + "<td width='10%'>" + Constants.c.endedOn + "</td>"
                                    + "<td width='10%'>" + Constants.c.failures + "</td>"
                                    + "<td width='20%'>" + Constants.c.result + "</td>"
                                    + "<td width='20%'>" + Constants.c.exception + "</td></tr>";

            testMailHtml = testMailHtml + RowsHtml + "</table></html>";
            return testMailHtml;
        }
    }
});