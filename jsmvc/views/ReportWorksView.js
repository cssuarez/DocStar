/// <reference path="../../Content/LibsInternal/DialogsUtil.js" />
var ReportWorksView = Backbone.View.extend({
    viewData: {},
    reportCategoryView: null,
    reportDashboardView: null,
    rsView: null,   // Report Scheduling View
    proxy: ReportingProxy(),
    router: {}, // instantiated in initialize, allows for navigation
    dashboardDefault: null,
    replace: false, // To update the URL without creating an entry in the browser's history, set the replace option to true.
    events: {
        'click .categoryLayout .root > a': 'changeCategory',
        'click .categoryLayout .category > a': 'changeCategory',
        'click .categoryLayout .category .report > a': 'changeCategoryReport',
        'click .dashboardLayout .report > a': 'changeDashboard',
        'click .categoryReport': 'selectReportInNavigationPanel',
        'click .collapse_arrow': 'collapseNavigationPanel',
        'click .expand_arrow': 'expandNavigationPanel'
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('reportworkslayout'));
        this.router = Page.routers.Reports;
        this.reportCategoryView = new ReportsCategoryView();
        this.reportDashboardView = new ReportsDashboardView();
        this.reportView = new ReportView();

        return this;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        if (this.viewData.reportRunnerExists) {
            this.reportCategoryView.setElement(this.$el.find('.mainLayout'));
            this.reportDashboardView.setElement(this.$el.find('.mainLayout'));
            this.reportView.setElement(this.$el.find('.mainLayout'));
            this.setupNavPanel();
            var urlFragments = $.url(window.location.hash).fsegment();
            var isDashboardDefaultRenderable = urlFragments.length === 1;
            if (isDashboardDefaultRenderable && this.dashboardDefault) {
                this.replace = true;
                this.updateReportView(this.dashboardDefault.Category, this.dashboardDefault.DisplayName, this.dashboardDefault.Id);
                this.dashboardDefault = null;
            }
        }
        else {
            ShowHidePanel.setupNavPanelResize(this.$el.find('.navigationLayout'), this.$el.find('.mainLayout'));
        }
        return this;
    },
    getRenderObject: function () {
        var r = {};
        r.categories = [
            {
                data: Constants.c.categories,
                attr: {
                    'class': 'root',
                    Title: Constants.c.categories,
                    Depth: 0
                },
                state: 'open',
                children: []
            }
        ];
        var dashboardReports = [];
        var cats = {};
        var idx = 0;
        var length = window.reports.length;
        for (idx; idx < length; idx++) {
            var reportData = window.reports.at(idx);
            if (reportData) {
                var report = reportData.get('Report');
                if (report.Dashboard) {
                    dashboardReports.push({
                        data: report.DisplayName,
                        attr: {
                            Id: report.Id + '_dashboard',
                            Title: report.DisplayName,
                            Depth: 0,
                            'class': 'report'
                        }
                    });
                }
                if (!cats[report.Category]) {
                    cats[report.Category] = {};
                    cats[report.Category].children = [];
                }
                cats[report.Category].children.push({
                    data: report.DisplayName,
                    attr: {
                        Id: report.Id + '_category',
                        Title: report.DisplayName,
                        Depth: 0,
                        'class': 'report'
                    }
                });
                if (report.DashboardDefault && !this.dashboardDefault) {
                    this.dashboardDefault = report;
                }
            }
        }
        dashboardReports.sort(Utility.sortByProperty('text'));
        r.dashboards = [
            {
                data: Constants.c.dashboard,
                attr: {
                    'class': 'root',
                    Title: Constants.c.dashboard,
                    Depth: 0
                },
                state: 'open',
                children: dashboardReports
            }
        ];
        var cat;
        for (cat in cats) {
            if (cats.hasOwnProperty(cat)) {
                var categoryReports = cats[cat].children.sort(Utility.sortByProperty('data'));
                r.categories[0].children.push({
                    data: cat,
                    attr: {
                        Title: cat,
                        'class': 'category'
                    },
                    state: 'closed',
                    children: categoryReports
                });
            }
        }
        r.categories[0].children.sort(Utility.sortByProperty('data'));
        r.reportRunnerExists = ClientService.reportRunnerExists();
        return r;
    },
    updateCategoryView: function (categoryName) {
        this.reportCategoryView.render(categoryName);
        this.changeSelected(categoryName);
        this.setupScheduleContextMenu(this.reportCategoryView.$el.find('.categoryItem'));
    },
    updateDashboardView: function (reportName, reportId) {
        this.reportDashboardView.render(reportName, reportId);
        this.changeSelected(null, reportId);
    },
    updateReportView: function (name, reportName, reportId) {
        this.reportView.render(name, reportName, reportId);
        this.changeSelected(name, reportId);
    },
    changeCategory: function (ev) {
        var $targ = $(ev.currentTarget);
        this.$el.find('.category > a, .report > a, .root > a').removeClass('underline bold');
        $targ.addClass('underline bold');
        var $cat = $targ.parent();
        var categoryName = $cat.attr('title');
        var url = '#Reports/category/' + categoryName;
        var finalURL = '#Reports/category/' + encodeURIComponent(categoryName);
        var testURL = encodeURIComponent(url);
        if (testURL !== encodeURIComponent(window.location.hash)) {
            this.router.navigate(finalURL, { trigger: true, replace: this.replace });
            this.replace = false;
        }
    },
    changeCategoryReport: function (ev) {
        var $targ = $(ev.currentTarget);
        this.$el.find('.category > a, .report > a, .root > a').removeClass('underline bold');
        this.$el.find('.category').has($targ).find('> a').addClass('bold');
        $targ.addClass('underline bold');
        var $cat = this.$el.find('.category').has($targ);
        var categoryName = $cat.attr('title');
        var $report = $targ.parent('.report');
        var id = $report.attr('id');
        if (!id) {
            return;
        }
        id = id.split('_')[0];
        var reportName = $report.attr('title');
        var url = '#Reports/category/' + categoryName + '/' + reportName + '/' + id;
        var finalURL = '#Reports/category/' + encodeURIComponent(categoryName) + '/' + encodeURIComponent(reportName) + '/' + encodeURIComponent(id);
        var testURL = encodeURIComponent(url);
        if (testURL !== encodeURIComponent(window.location.hash)) {
            this.router.navigate(finalURL, { trigger: true, replace: this.replace });
            this.replace = false;
        }
    },
    changeDashboard: function (ev) {
        var $targ = $(ev.currentTarget);
        this.$el.find('.category > a, .report > a, .root > a').removeClass('underline bold');
        $targ.addClass('underline bold');
        var $report = $targ.parent('.report');
        var id = $report.attr('id');
        if (!id) {
            return;
        }
        id = id.split('_')[0];
        var reportName = $report.attr('title');
        var url = '#Reports/dashboard/' + reportName + '/' + id;
        var finalURL = '#Reports/dashboard/' + encodeURIComponent(reportName) + '/' + encodeURIComponent(id);
        var testURL = encodeURIComponent(url);
        if (testURL !== encodeURIComponent(window.location.hash)) {
            this.router.navigate(finalURL, { trigger: true, replace: this.replace });
            this.replace = false;
        }
    },
    changeSelected: function (categoryName, reportId) {
        var that = this;
        var $el = this.$el;
        setTimeout(function () {
            $el.find('#categoryList').jstree('deselect_all');
            $el.find('#dashboardList').jstree('deselect_all');
            if (!categoryName && !reportId) {
                return;
            }
            var $catReport;
            var $dashReport;
            var event = new $.Event();
            if (categoryName) {
                categoryName = decodeURIComponent(categoryName);
                var $cat = $el.find('li[title="' + categoryName + '"]');
                $el.find('#categoryList').jstree('open_node', $cat);
                if (reportId) {
                    $catReport = $el.find('#' + reportId + '_category');
                    event.currentTarget = $catReport.find('> a');
                    that.changeCategoryReport(event);
                }
                else {
                    event.currentTarget = $cat.find('> a');
                    that.changeCategory(event);
                }
            }
            else if (reportId) {
                $dashReport = $el.find('#' + reportId + '_dashboard');
                event.currentTarget = $dashReport.find('> a');
                that.changeDashboard(event);
            }
        }, 5);
    },

    //#region Scheduling
    setupDashboardContextMenu: function () {
        this.setupScheduleContextMenu(this.$el.find('.dashboardLayout .report'));
    },
    setupCategoryViewContextMenu: function () {
        this.setupScheduleContextMenu(this.$el.find('.categoryLayout .report'));
    },
    setupScheduleContextMenu: function ($cmId) {
        var that = this;
        var action = function (htmlTarg) {
            that.scheduleReport(htmlTarg);
        };
        var menuAlias = 'cmroot-4_' + Constants.c.schedule;
        var options = {
            width: 150,
            items: [{
                text: Constants.c.schedule,
                icon: "",
                width: 170,
                action: action
            }],
            alias: menuAlias
        };
        $cmId.unbind('contextmenu').contextmenu(options);
    },
    scheduleReport: function (htmlTarg) {
        var $targ = $(htmlTarg);
        var id = $targ.attr('id');
        var reportId = id.split('_')[0];
        var name = $targ.text();
        var that = this;
        var reportSchedules = new ReportSchedules();
        var open = function () {
            var $extraMarkup = $dialog.find('.extraMarkup');
            var $throbber = $(document.createElement('span')).addClass('throbber dialogThrobberPosCenter posRel');
            $extraMarkup.append($throbber);
            var sf = function () {
                that.rsView = new ReportSchedulingView({
                    reportId: reportId,
                    schedules: reportSchedules
                });
                $extraMarkup.find('.throbber').remove();
                $extraMarkup.append(that.rsView.render());
            };
            var ff = function (jqXHR, textStatus, errorThrown) {
                $dialog.dialog('close');
                ErrorHandler.popUpMessage(errorThrown);
            };
            reportSchedules.fetch({
                reportId: reportId,
                success: sf,
                failure: ff,
                reset: true
            });
        };
        var close = function () {
            if (that.rsView) {
                that.rsView.close();
            }
        };
        var options = {
            title: name + " - " + Constants.c.schedules,
            width: 550,
            minWidth: 430,
            autoOpen: false,
            resizable: false,
            open: open,
            close: close,
            position: {
                my: 'left top',
                at: 'right top',
                of: $targ
            }
        };
        $dialog = DialogsUtil.generalCloseDialog(null, options);
        $dialog.dialog('open');
    },
    //#endregion Scheduling

    //#region Reports Navigation Panel
    setupNavPanel: function () {
        var that = this;
        var $catList = this.$el.find('#categoryList');
        var catData = $catList.containers('categoryList', this.viewData.categories);
        if (catData && catData.length > 0) {
            catData.bind('select_node.jstree', function (event, data) {
                if (data.rslt.obj.hasClass('root')) {
                    $catList.jstree('deselect_node');
                }
            });
            catData.bind('loaded.jstree', function (event, data) {
                that.setupCategoryViewContextMenu();
            });
        }
        var $dashList = this.$el.find('#dashboardList');
        var dashData = $dashList.containers('reportsDashboardList', this.viewData.dashboards);
        if (dashData && dashData.length > 0) {
            dashData.bind('select_node.jstree', function (event, data) {
                if (data.rslt.obj.hasClass('root')) {
                    $dashList.jstree('deselect_node');
                }
            });
            dashData.bind('loaded.jstree', function (event, data) {
                that.setupDashboardContextMenu();
            });
        }
        ShowHidePanel.setupNavPanelResize(this.$el.find('.navigationLayout'), this.$el.find('.mainLayout'));
    },
    collapseNavigationPanel: function (ev) {
        var $navPanel = this.$el.find('.navigationLayout');
        var $collapseTarget = $(ev.currentTarget);
        ShowHidePanel.collapseNavigationPanel($navPanel, $collapseTarget);
    },
    expandNavigationPanel: function (ev) {
        var $navPanel = this.$el.find('.navigationLayout');
        var $expandTarget = $(ev.currentTarget);
        ShowHidePanel.expandNavigationPanel($navPanel, $expandTarget);
    },
    selectReportInNavigationPanel: function (ev) {
        var $targ = $(ev.currentTarget);
        var id = $targ.attr('id');
        var $report = this.$el.find('#' + id + '_category');
        var $cat = $('.category').has($report);
        this.$el.find('#categoryList').jstree('open_node', $cat);
        var $evTarg = $report.find('> a');
        var event = new $.Event();
        event.currentTarget = $evTarg;
        this.changeCategoryReport(event);
    }
    //#endregion Reports Navigation Panel
});
