var LicenseStatistics = CustomGridItems.extend({
    model: License,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,

    /// <summary>
    /// Sets the model of the id provided selected property true while setting all other models to false.
    /// Optionally if toggleExpanded is true it will toggle the expanded property of the selected model, other other models expanded property is set to false.
    /// </summary>
    setSelectedAndExpanded: function (id, toggleExpanded) {
        this.setSelected([id]);
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var m = this.at(i);
            if (m.get('Id') === id) {
                if (toggleExpanded) {
                    m.set('expanded', !m.get('expanded'));
                }
            } else {
                m.set('expanded', false);
            }
        }
    },
    /// <summary>
    /// Returns the id of the model with the expanded property of true.
    /// </summary>
    getExpandedId: function () {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).get('expanded')) {
                return this.at(i).get('Id');
            }
        }
    },
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
        if (column === 'Term') {
            var rev_lt = Utility.reverseMapObject(Constants.lt);
            this.comparator = function (a, b) {
                var aTerm = rev_lt[a.get('Term')];
                var bTerm = rev_lt[b.get('Term')];
                if (aTerm > bTerm) { return sa ? 1 : -1; }
                if (bTerm > aTerm) { return sa ? -1 : 1; }
                return 0;
            };
        } else {
            this.comparator = function (a, b) {
                var aCol = a.get(column);
                var bCol = b.get(column);
                if (aCol > bCol) { return sa ? 1 : -1; }
                if (bCol > aCol) { return sa ? -1 : 1; }
                return 0;
            };
        }
        this.sortColumn = column;
        this.sort();
    }
});