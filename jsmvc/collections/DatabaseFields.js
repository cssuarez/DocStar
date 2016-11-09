var DatabaseFields = Backbone.Collection.extend({
    model: DatabaseField,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});