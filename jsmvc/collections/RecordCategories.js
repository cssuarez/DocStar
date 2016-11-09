// Collection for RecordCategories model
// defines the model to use, and the URL of the API method to fill the collection with said models
var RecordCategories = Backbone.Collection.extend({
    model: RecordCategory,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});