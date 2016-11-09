var AuditSearchCriteria = Backbone.Model.extend({
    dateTimeFields: {StartDate: true, EndDate: true},
    defaults: {
        ResultId: undefined, User: '', Title: '', Description: '', StartDate: new Date().format('generalDateOnly'), EndDate: undefined, Type: Constants.at.All, EntityType: Constants.et.All,
        MaxRows: 25, Start: 0, SortBy: 'CreatedOn', SortOrder: 'asc'
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (options.reset) {
            attrs = _.extend(attrs, this.defaults);
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },

    /// <summary>
    /// Sets a models value by the name given. Validates the value based on the field name.
    /// </summary>
    setByName: function (name, value) {
        if (name === 'Title' || name === 'User' || name === 'Description') {
            if (value && value.length > 256) {
                return Constants.c.valueTooLong;
            }
        }
        if (name === 'StartDate' || name === 'EndDate') {
            value = !!value ? value : undefined;
            if (value && !DateUtil.isDate(value)) {
                return Constants.c.invalidDateSelection;
            }
        }
        this.set(name, value);
    }
});