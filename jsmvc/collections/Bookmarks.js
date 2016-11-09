var Bookmarks = Backbone.Collection.extend({
    model: Bookmark,
    /// <summary>
    /// Returns a bookmark the belongs to the give true page number.
    /// </summary>
    getForPage: function (truePageNumber) {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var bm = this.at(i);
            if (bm.get('PageNumber') === truePageNumber) {
                return bm;
            }
        }
    }
});