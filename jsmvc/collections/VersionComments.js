var VersionComments = Backbone.Collection.extend({
    model: VersionComment,
    comparator: function (a, b) {
        if (!this.verCol) {
            return 0;
        }
        var ver1 = this.verCol.get(a.get('DocumentVersionId'));
        var ver2 = this.verCol.get(b.get('DocumentVersionId'));
        if (!ver1 || !ver2) {
            return 0;
        }
        var r = ver1.compareTo(ver2);
        if (r === 0) { //Same version, fall back to date compare.
            var d1 = new Date(a.get('CommentDate'));
            var d2 = new Date(b.get('CommentDate'));
            r = d1 < d2 ? -1 : d1 > d2 ? 1 : 0;
        }
        return r;
    }
});