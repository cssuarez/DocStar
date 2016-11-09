var DataUsageReportView = Backbone.View.extend({
    editView: null,
    viewData: {},
    DataUsageReportdata: {},
    AdminServiceProxy: AdminServiceProxy(),
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('dataUsageReportlayout'));
        this.go();
    },
    go: function () {
        this.getDataUsageReportData();
    },
    render: function () {
        var html_data = this.compiledTemplate(this.viewData);
        this.$el.html(html_data);
        this.delegateEvents(this.events);
        return this;
    },
    getDataUsageReportData: function () {
        var that = this;
        var success = function (result) {
            if (result) {
                that.viewData = result;
                that.render();
            }
        };
        var error = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        this.AdminServiceProxy.getDataUsage(success, error);
    }
});