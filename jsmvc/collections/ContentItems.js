var ContentItems = Backbone.Collection.extend({
    model: ContentItem,
    /// <summary>
    /// Checks if any content item has a formpart id.
    /// </summary>
    hasFormPart: function () {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).get('FormPartId')) {
                return true;
            }
        }
        return false;
    },
    /// <summary>
    /// Checks if every content item that has a formpart id is complete
    /// </summary>
    isFormComplete: function () {
        var i = 0;
        var length = this.length;
        var hasFormPart = false;
        var isComplete = false;
        for (i; i < length; i++) {
            if (this.at(i).get('FormPartId')) {
                isComplete = this.at(i).get('Complete');
                if (!isComplete) {
                    return false;
                }
            }
        }
        return isComplete;
    },
    /// <summary>
    /// Sets every content items 'Complete' property to true
    /// </summary>
    completeForm: function () {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var ci = this.at(i);
            if (ci.get('FormPartId')) {
                ci.set('Complete', true);
            }
        }
    },
    /// <summary>
    /// Sets every content items 'Complete' property to false
    /// </summary>
    uncompleteForm: function () {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var ci = this.at(i);
            if (ci.get('FormPartId')) {
                ci.set('Complete', false);
            }
        }
    },
    /// <summary>
    /// Returns all content items that have a form part id.
    /// </summary>
    getAllFormParts: function () {
        var result = [];
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).get('FormPartId')) {
                result.push(this.at(i));
            }
        }
        return result;
    },
    ///<summary>
    /// Reset all content items 'selected' properties to false
    ///</summary>
    clearSelected: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            this.at(idx).set('selected', false);
        }
    }
});