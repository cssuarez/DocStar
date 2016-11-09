var CustomFieldMetaGroupPackages = Backbone.Collection.extend({
    model: CustomFieldMetaGroupPackage,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    getByName: function (name) {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            if (this.at(idx).get('CustomFieldGroup').Name === name) {
                return this.at(idx);
            }
        }
    }
});