// Use to extend any collection that is used for grid selection
// Be sure to have the collection's model extend CustomGridItem
var CustomGridItems = Backbone.Collection.extend({
    model: CustomGridItem,
    ///<summary>
    /// Obtain the idAttribute of the model
    ///</summary>
    getIdAttribute: function (model) {
        var idAttr = model.idAttribute;
        if (!idAttr) {
            idAttr = 'Id';
        }
        return idAttr;
    },
    getHighestSequence: function () {
        var selected = this.getSelected();
        if (selected.length === 0) {
            return 0;
        }
        return selected[selected.length - 1].get('sequence');
    },
    //#region Selecting
    ///<summary>
    /// Returns the ids of all selected documents
    ///</summary>
    getSelectedIds: function () {
        var selected = this.getSelected();
        var ids = [];
        var i = 0;
        var length = selected.length;
        for (i; i < length; i++) {
            var item = selected[i];
            var idAttr = this.getIdAttribute(item);
            ids.push(selected[i].get(idAttr));
        }
        return ids;
    },
    ///<summary>
    /// Returns all selected documents
    ///</summary>
    getSelected: function () {
        var selected = [];
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).isSelected()) {
                selected.push(this.at(i));
            }
        }
        selected.sort(function (a, b) {
            return a.get('sequence') - b.get('sequence');
        });
        return selected;
    },
    ///<summary>
    /// Sets the selection state to true for all the ids passed, resets all others to false.
    ///</summary>
    setSelected: function (ids, options) {
        options = options || {};
        // If passed in ids is not an array, make it into an array, for a singular id passed in
        if (!(ids instanceof Array)) {
            ids = [ids];
        }
        var model;
        // If only a single item was passed in to be selected, then call clear selected, and reselect the single item
        if (ids.length === 1) {
            this.listenToOnce(this, 'clearAll', function () {
                model = this.get(ids[0]);
                if (model) {
                    model.setSelected(true, 0, options);
                }
            });
            this.clearSelected(options);
        }
        else {
            var i = 0;
            var length = this.length;
            var sequence = 0;
            for (i; i < length; i++) {
                var id = ids[i];
                var item = this.get(id);
                // Select all items specified to be selected
                if (item) {
                    // Prevent triggering selection events for every item, but the last
                    item.setSelected(true, sequence++, $.extend(options, { ignoreSelection: (i < ids.length - 1) || options.ignoreSelection }));
                }
                // Deselect all items not specified to be selected
                model = this.at(i);
                var modelId = model.get(this.getIdAttribute(model));
                if (ids.indexOf(modelId) === -1) {
                    item = this.get(modelId);
                    if (item && item.get('isSelected')) {
                        item.setSelected(false, undefined, options);
                    }
                    else {
                        item.unset('sequence', options);
                    }
                }
            }
        }
    },
    ///<summary>
    /// Sets the selection state to true for all items
    ///</summary>
    selectAll: function (options) {
        options = options || {};
        var i = 0;
        var length = this.length;
        // trigger a selectAll event, not each individual selection event
        for (i; i < length; i++) {
            options.silent = i < length - 1;
            this.at(i).setSelected(true, i, options);
        }
        this.trigger('selectAll', this);
    },
    ///<summary>
    /// Clears the selection state in all items
    ///</summary>
    clearSelected: function (options) {
        options = options || {};
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            options.silent = i < length - 1;
            this.at(i).setSelected(false, undefined, options);
        }
        this.trigger('clearAll', this);
    },
    ///<summary>
    /// Returns the last selected simple document
    ///</summary>
    getLastSelected: function () {
        var selected = this.getSelected();
        return selected[selected.length - 1];
    },
    ///<summary>
    /// Returns a bool indicating if all items in the collection are selected or not.
    ///</summary>
    areAllSelected: function () {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (!this.at(i).isSelected()) {
                return false;
            }
        }
        return true;
    },
    ///<summary>
    /// Destroys all documents that are selected.
    ///</summary>
    deleteSelected: function () {
        var i = this.length - 1;
        for (i; i >= 0; i--) {
            if (this.at(i).isSelected()) {
                this.at(i).destroy();
            }
        }
    },
    //#endregion Selecting

    //#region Sorting
    ///<summary>
    /// Sorts the collection by the given property.
    ///</summary>
    sortByColumn: function (columnName) {
        this.comparator = columnName;
        this.sort();
    }
    //#endregion Sorting
});