var ReportSchedules = Backbone.Collection.extend({
    model: ReportSchedule,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    proxy: ReportingProxy({ skipStringifyWcf: true }),
    addNewField: function (newField) {
        this.getNewList(new ReportSchedule(newField));
    },
    fetch: function (options) {
        var that = this;
        var sf = function (r) {
            that.reset(r);
            if (options.success) {
                options.success();
            }
        };
        var defFailure = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        var ff = options.failure || defFailure;
        this.proxy.getSchedulesForReport(options.reportId, sf, ff);
    }
});