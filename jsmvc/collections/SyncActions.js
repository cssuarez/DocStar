var SyncActions = Backbone.Collection.extend({
    model: SyncAction,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});