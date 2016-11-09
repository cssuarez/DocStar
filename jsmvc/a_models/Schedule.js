var Schedule = Backbone.Model.extend({
    defaults: {
        Frequency: 1,
        Status: Constants.js.Active,
        ExecutionTime: new Date().format('general'),
        ExecutionType: Constants.ef.Daily
    },
    dateTimeFields: { ExecutionTime: true },
    idAttribute: 'Id',
    getExecutionTime: function () {
        var et = this.get('ExecutionTime');
        if (et) {
            var val = new Date(JSON.parseWithDate(JSON.stringify(et)));
            if (val && !isNaN(val)) {
                return val.format('general');
            }
        }
        return new Date().format('general');
    }
});