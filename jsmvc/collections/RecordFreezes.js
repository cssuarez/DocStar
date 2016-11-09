// Collection for RecordCategories model
// defines the model to use, and the URL of the API method to fill the collection with said models
var RecordFreezes = Backbone.Collection.extend({
    model: RecordFreeze,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    url: Constants.Url_Base + "RecordsManagement/GetFreezes"
});