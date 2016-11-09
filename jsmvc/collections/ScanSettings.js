var ScanSettings = Backbone.Collection.extend({
    model: ScanSetting,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});