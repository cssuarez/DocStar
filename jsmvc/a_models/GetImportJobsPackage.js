var GetImportJobsPackage = Backbone.Model.extend({
    dateTimeFields: { StartDate: true, EndDate: true },
    defaults: {
        UserId: undefined, MachineName: '', Statuses: undefined, Start: 0, MaxRows: 25, SortedBy: 'StartedOn', SortOrder: 'DESC'
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (options.reset) {
            var defaults = _.extend({}, this.defaults);
            attrs = _.extend(defaults, attrs);
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    }
});