var DataLinkQueries = Backbone.Collection.extend({
    model: DataLinkQuery,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});