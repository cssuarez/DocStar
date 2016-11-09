var SlimEntities = Backbone.Collection.extend({
    model: SlimEntity,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
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
    }
});