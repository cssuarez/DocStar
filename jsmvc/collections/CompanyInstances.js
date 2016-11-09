var CompanyInstances = Backbone.Collection.extend({
    model: CompanyInstance,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});