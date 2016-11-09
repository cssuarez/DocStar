var SavedSearches = Backbone.Collection.extend({
    model: SavedSearch,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});