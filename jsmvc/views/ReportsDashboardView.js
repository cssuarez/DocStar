var ReportsDashboardView = Backbone.View.extend({
    viewData: {},
    events: {
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('reportsdashboardlayout'));
        this.reportView = new ReportView();
        return this;
    },
    render: function (reportName, reportId) {
        this.$el.html(this.compiledTemplate(this.viewData));
        this.reportView.setElement(this.$el);
        this.delegateEvents(this.events);
        this.reportView.render('', reportName, reportId);
        return this;
    }
});
