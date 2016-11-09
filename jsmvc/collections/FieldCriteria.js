var FieldCriteria = Backbone.Collection.extend({
    model: FieldCriterion,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});