var DistributedQueues = CustomGridItems.extend({
    model: DistributedQueue,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    /// <summary>
    /// Sorts the collection by the passed column (must match a property name).
    /// </summary>
    sortByColumn: function (column) {
        if (column === this.sortColumn) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortAsc = true;
        }

        var sa = this.sortAsc;

        this.comparator = function (a, b) {
            var aCol = a.get(column) === null ? '' : a.get(column);
            var bCol = b.get(column) === null ? '' : b.get(column);
            if (aCol > bCol) { return sa ? 1 : -1; }
            if (bCol > aCol) { return sa ? -1 : 1; }
            return 0;
        };
        this.sortColumn = column;
        this.sort();
    }
});