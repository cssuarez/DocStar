var Companies = Backbone.Collection.extend({
    model: Company,
    errorMsg: null,
    url: Constants.Url_Base + "Company/Companies",
    comparator: Backbone.Collection.prototype.defaultComparator
});