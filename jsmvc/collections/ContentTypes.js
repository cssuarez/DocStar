var ContentTypes = Backbone.Collection.extend({
    model: ContentType,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.alphaNumericSort,
    getByNameOrId: function (nameOrId) {
        var m = this.get(nameOrId);
        if (!m) {
            var ln = nameOrId.toLowerCase();
            var i = 0;
            var length = this.length;
            for (i; i < length; i++) {
                if (this.at(i).get('Name').toLowerCase() === ln) {
                    m = this.at(i);
                    break;
                }
            }
        }
        return m;
    },
    // Returns all with view permision plus (optionally) one whose Id is specified
    getViewable: function (selectedId) {
        var ctList = this.toJSON();
        var ctFilteredList = [];
        var idx;
        var length = ctList.length;
        for (idx = 0; idx < length; idx++) {
            var ct = ctList[idx];
            if (Utility.hasFlag(ct.EffectivePermissions, Constants.sp.View) || (selectedId && ct.Id === selectedId)) {
                ctFilteredList.push(ct);
            }
        }
        return new ContentTypes(ctFilteredList);
    }
});