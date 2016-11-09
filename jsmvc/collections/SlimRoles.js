var SlimRoles = Backbone.Collection.extend({
    model: SlimRole,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});