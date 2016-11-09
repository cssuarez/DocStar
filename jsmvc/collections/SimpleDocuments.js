var SimpleDocuments = CustomGridItems.extend({
    model: SimpleDocument,
    comparator: function (m1, m2) {
        var st1 = m1.get("SortTicks");
        var st2 = m2.get("SortTicks");

        if (st1 === st2) {
            return 0;
        }
        if (!st1) {
            return 1;
        }
        if (!st2) {
            return -1;
        }
        var st1N = goog.math.Long.fromString(st1, 10);
        var st2N = goog.math.Long.fromString(st2, 10);
        return st2N.compare(st1N);
    },

    sync: function () {
        //Nothing to do here, move on.
    },
    ///<summary>
    /// Returns a count of the number of selected documents that have an iframeId
    ///</summary>
    getSelectedIframeDocsCount: function () {
        var count = 0;
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).isSelected() && this.at(i).get('iframeId')) {
                count++;
            }
        }
        return count;
    },
    ///<summary>
    /// Iterates over the collection to replace a content type that has been deleted.
    ///</summary>
    replaceContentType: function (ctModel, ctCollection, options) {
        var length = this.length;
        var i;
        for (i = 0; i < length; i++) {
            var m = this.at(i);
            var ctId = m.get('ContentTypeId');
            if (ctId === model.get('Id')) {
                // Replace the content type with the replacement Id
                m.set('ContentTypeId', options.replacementId);
            }
        }
    },
    ///<summary>
    /// Returns a bool indicating if any model in the collection has an exception message.
    ///</summary>
    hasAnyErrors: function () {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).get('ExceptionMessage')) {
                return true;
            }
        }
        return false;
    },
    ///<summary>
    /// Validates the section is suitable for a merge operation.
    ///</summary>
    validateForMerge: function () {
        var err = {};
        var selItems = this.getSelected();
        var i = 0;
        var length = selItems.length;
        var validSelLength = length;
        if (length < 2) {
            err.message = Constants.c.mergeCount;
            err.fatal = true;
        } else {
            var docTitles = [];
            for (i; i < length; i++) {
                if (this.at(i).get('iframeId')) {
                    validSelLength--;
                    docTitles.push(this.at(i).get('Title'));
                    this.at(i).setSelected(false);
                }
            }
            var invalidCapSelection = String.format(Constants.c.invalidCapSelection, '\n\n' + docTitles.join(',\n')) + '\n\n' + Constants.c.invalidCapSelection2 + '\n\n';
            if (validSelLength === 0) {
                err.message = invalidCapSelection + Constants.c.cancelledOperation;
                err.fatal = true;
            } else if (length !== validSelLength) {
                // At least one of the selected documents was a browser file select item
                // Check selected items after the non-simple documents have been unselected
                if ((length - validSelLength) >= 2) {
                    err.message = invalidCapSelection + Constants.c.selectionChangedContinue;
                    err.fatal = false;
                } else {
                    err.message = invalidCapSelection + String.format(Constants.c.operationCountChanged, 2);
                    err.fatal = true;
                }
            }
        }
        return err;
    },
    ///<summary>
    /// Validates the section is suitable for a un-merge operation.
    ///</summary>
    validateForUnMerge: function () {
        var err = {};
        var selItems = this.getSelected();
        var i = 0;
        var length = selItems.length;
        if (length !== 1) {
            err.message = Constants.c.onlySelectOneDoc;
            err.fatal = true;
        } else {
            var doc = selItems[0];
            var docTitles = [doc.get('Title')];
            var invalidCapSelection = String.format(Constants.c.invalidCapSelection, '\n\n' + docTitles.join(',\n')) + '\n\n' + Constants.c.invalidCapSelection2 + '\n\n';
            if (doc.get('iframeId')) {
                err.message = invalidCapSelection + Constants.c.cancelledOperation;
                err.fatal = true;
            }
        }
        return err;
    },
    ///<summary>
    /// Removes all documents from the collection that do not have an iframeId property.
    /// This will typically occur when a client is disconnected in some way.
    ///</summary>
    removeNonIFrameDocuments: function () {
        var i = this.length - 1;
        for (i; i >= 0; i--) {
            if (!this.at(i).get('iframeId')) {
                this.at(i).destroy();
            }
        }
    }
});