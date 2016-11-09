var Marks = Backbone.Collection.extend({
    model: Mark,
    anyDirty: function () {
        if (this.hasDeletions) {
            return true;
        }
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).get('isDirty')) {
                return true;
            }
        }
        return false;
    }
});