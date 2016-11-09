var Schedules = Backbone.Collection.extend({
    model: Schedule,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});