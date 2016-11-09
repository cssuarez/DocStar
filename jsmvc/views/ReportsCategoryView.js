var ReportsCategoryView = Backbone.View.extend({
    viewData: {},
    router: {}, // instantiated in initialize, allows for navigation
    categoryView: null, // Rendering a report categories
    events: {
        'click .categoryItem': 'renderReport'
    },
    initialize: function (options) {
        this.router = Page.routers.Reports;
        return this;
    },
    renderReport: function (ev) {
        var $targ = $(ev.currentTarget);
        var reportId = $targ.attr('id');
        var reportName = $targ.find('span').text();
        var url = window.location.hash + '/' + reportName + '/' + reportId;
        if (url !== window.location.hash) {
            this.router.navigate(url, { trigger: true });
        }
        return this;
    },
    render: function (categoryName) {
        this.viewData = this.getRenderObject(categoryName);
        if (this.categoryView && this.categoryView.close) {
            this.categoryView.close();
        }
        this.categoryView = new CategoryView({ categoryItems: this.viewData.categoryItems });
        this.$el.html(this.categoryView.render().$el);
        this.$el.find('iframe').hide();
        this.delegateEvents(this.events);
        this.categoryView.renderThumbnails(0);
        return this;
    },
    getRenderObject: function (categoryName) {
        var r = {};
        r.categoryItems = [];
        var idx = 0;
        var length = window.reports.length;
        for (idx; idx < length; idx++) {
            var reportData = window.reports.at(idx);
            var report = reportData.get('Report');
            if (categoryName === report.Category || categoryName === Constants.c.categories) {
                report.thumbnailSource = Constants.Server_Url + '/GetFile.ashx?functionName=GetReportThumbnail&fileName=' + encodeURIComponent(report.Thumbnail);
                r.categoryItems.push(report);
            }
        }
        return r;
    }
});
