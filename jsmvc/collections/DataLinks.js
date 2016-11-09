var DataLinks = Backbone.Collection.extend({
    model: DataLink,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});