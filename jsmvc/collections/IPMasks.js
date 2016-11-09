var IPMasks = Backbone.Collection.extend({
    model: ContentType,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    url: Constants.Url_Base + "IPMask/GetIPMasks"
});