var ReportsManagerView = Backbone.View.extend({
    editView: null,
    initialize: function (options) {
        this.editView = new ReportWorksView();
        if (window.reports === undefined) {
            window.reports = new Reports();
        }
        this.options = options;
        // bind to collection events here
        this.go();
    },
    go: function () {
        var that = this;
        window.reports.fetch({
            success: function (result) {
                that.render();
                that.updateViews();
                Utility.executeCallback(that.options.success);
            },
            failure: function (jqXHR, textStatus, errorThrown) {
                ErrorHandler.popUpMessage(errorThrown);
            },
            reset: true
        });
    },
    updateViews: function () {
        this.editView.viewData.selected = undefined;
        this.editView.render();
    },
    updateCategoryView: function (name) {
        this.editView.updateCategoryView(name);
    },
    updateDashboardView: function (reportName, reportId) {
        this.editView.updateDashboardView(reportName, reportId);
    },
    updateReportView: function (name, reportName, reportId) {
        this.editView.updateReportView(name, reportName, reportId);
    },
    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});
