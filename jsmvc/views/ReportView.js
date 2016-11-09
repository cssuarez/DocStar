var ReportView = Backbone.View.extend({
    viewData: {},
    events: {
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('reportlayout'));
        return this;
    },
    render: function (name, reportName, reportId) {
        var that = this;
        this.viewData.source = Constants.Url_Base + 'ReportViewer.aspx?reportId=' + reportId;
        this.$el.html(this.compiledTemplate(this.viewData));
        this.$el.find('iframe').get(0).onload = function () {
            that.$el.find('.modalThrobberCont').hide();
        };
        this.delegateEvents(this.events);
        return this;
    }
});
