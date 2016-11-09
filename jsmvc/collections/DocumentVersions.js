var DocumentVersions = CustomGridItems.extend({
    sortCol: Constants.c.versionNumber,
    sortDesc: true,
    model: DocumentVersionCPX,
    comparator: function (a, b) {
        var r = 0;
        switch (this.sortCol) {
            case Constants.c.versionStateShort:
                var va = a.getState();
                var vb = b.getState();
                r = va < vb ? -1 : va > vb ? 1 : 0;
                break;
            case Constants.c.user:
                var ua = a.getUserName();
                var ub = b.getUserName();
                r = ua < ub ? -1 : ua > ub ? 1 : 0;
                break;
            case Constants.c.publisher:
                var pa = a.getPublisherName();
                var pb = b.getPublisherName();
                r = pa < pb ? -1 : pa > pb ? 1 : 0;
                break;
            case Constants.c.date:
                var d1 = new Date(a.get('ModifiedOn'));
                var d2 = new Date(b.get('ModifiedOn'));
                r = d1 < d2 ? -1 : d1 > d2 ? 1 : 0;
                break;
            default:
                r = a.compareTo(b);
                break;
        }
        if (this.sortDesc) {
            r = -r;
        }
        return r;
    },
    sort: function (options) {
        this.sortCol = options.sortCol;
        this.sortDesc = !!(options.sortDesc || this.sortDesc);
        return Backbone.Collection.prototype.sort.call(this, options);
    }
});