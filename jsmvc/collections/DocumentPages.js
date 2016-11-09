//Page is used by another class.
var DocumentPages = Backbone.Collection.extend({
    model: DocumentPageCPX,
    /// <summary>
    /// Returns the page that a part of the given content item and is the 
    /// the page number passed (relative to the content item).
    /// if no page number is passed then the last page of the content item is returned.
    /// </summary>
    getContentItemPage: function (contentItemId, pageNumber) {
        var lookinForLast = pageNumber === undefined;
        var i = 0;
        var length = this.length;
        var ciPageNumber = 1;
        var lastPage;
        for (i; i < length; i++) {
            var pg = this.at(i);
            if (pg.get('ContentItemId') === contentItemId) {
                if (ciPageNumber === pageNumber) {
                    return pg;
                }
                ciPageNumber++;
                lastPage = pg;
            } else if (lookinForLast && lastPage) {
                return lastPage;
            }
        }
    },
    clearSelected: function (selectedValue) {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            if (this.at(idx).get('TruePageNumber') !== selectedValue && this.at(idx).get('selected')) {
                this.at(idx).set('selected', false);
            }
        }
    }
});