var CustomFieldGroups = Backbone.Collection.extend({
    model: CustomFieldGroup,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});