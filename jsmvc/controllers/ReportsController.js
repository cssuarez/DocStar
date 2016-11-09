var ReportsRouter = Backbone.Router.extend({
    reportsManagerView: null,
    lastHash: '',
    routes: {
        'Reports': 'reportsPanel',
        'Reports/category/:categoryName': 'selectCategory',
        'Reports/category/:categoryName/:reportName/:reportId': 'selectReport',
        'Reports/dashboard/:dashboardName/:reportId': 'selectDashboardReport'
    },
    setLastHash: function () {
        this.lastHash = window.location.hash;
    },
    isDifferentLastHash: function () {
        return this.lastHash !== window.location.hash;
    },
    afterRoute: function () {
        ShowHidePanel.resize();
    },
    reportsPanel: function () {
        this.onNavigate('reports');
        if (this.lastHash) {
            Utility.navigate(this.lastHash, Page.routers.Reports, false, true);
        }
        else {
            if (this.reportsManagerView === null) {
                this.reportsManagerView = new ReportsManagerView({
                    el: '#reports_tab_panel'
                });
            }
            else if (this.isDifferentLastHash()) {
                this.reportsManagerView.updateViews();
            }
            this.setLastHash();
        }
    },
    selectReport: function (name, reportName, reportId) {
        this.onNavigate('reports');
        var that = this;
        var updateReportView = function () {
            that.reportsManagerView.updateReportView(name, reportName, reportId);
        };
        if (this.reportsManagerView === null) {
            this.reportsManagerView = new ReportsManagerView({
                el: '#reports_tab_panel',
                success: updateReportView
            });
        }
        else if (this.isDifferentLastHash()) {
            updateReportView();
        }
        this.setLastHash();
    },
    selectCategory: function (categoryName) {
        this.onNavigate('reports');
        var that = this;
        var updateCategoryView = function () {
            that.reportsManagerView.updateCategoryView(categoryName);
        };
        if (this.reportsManagerView === null) {
            this.reportsManagerView = new ReportsManagerView({
                el: '#reports_tab_panel',
                success: updateCategoryView
            });
        }
        else if (this.isDifferentLastHash()) {
            updateCategoryView();
        }
        this.setLastHash();
    },
    selectDashboardReport: function (reportName, reportId) {
        this.onNavigate('reports');
        var that = this;
        var updateDashboardView = function () {
            that.reportsManagerView.updateDashboardView(reportName, reportId);
        };
        if (this.reportsManagerView === null) {
            this.reportsManagerView = new ReportsManagerView({
                el: '#reports_tab_panel',
                success: updateDashboardView
            });
        }
        else if (this.isDifferentLastHash()) {
            updateDashboardView();
        }
        this.setLastHash();
    }
});