var DeletedDocuments = CustomGridItems.extend({
    model: DeletedDocument,
    sync: function (method, collection, options) {
        var proxy = DocumentServiceProxy({ skipStringifyWcf: true });
        var ff = function (jqXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.wait = false;
                options.success(result);
            }
        };
        switch (method) {
            case 'read':
                proxy.getDeleted(sf, ff, complete, null, options.headers);
                break;
            case 'create':
                break;
            case 'update':
                break;
            case 'delete':
                break;
        }
    },
    /// <summary>
    /// Sorts the collection based on the passed in column name (must match a property name)
    /// </summary>
    sortByColumn: function (column) {
        if (column === this.sortColumn) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortAsc = true;
        }

        var sa = this.sortAsc;
        this.comparator = function (a, b) {
            var aCol = a.get(column);
            var bCol = b.get(column);
            if (column === 'CreatedOn' || column === 'ModifiedOn') {
                aCol = Date.parse(a.get(column));
                bCol = Date.parse(b.get(column));
            }
            if (aCol > bCol) { return sa ? 1 : -1; }
            if (bCol > aCol) { return sa ? -1 : 1; }
            return 0;
        };
        this.sortColumn = column;
        this.sort();
    },
    /// <summary>
    /// Purges all selected items from eclipse.
    /// This process is done in batches of 50, the sf is invoked on each, if a failure occurs the process is stopped. The complete function is called only at the end of the process.
    /// </summary>
    purgeAllSelected: function (sf, ff, cf) {
        var proxy = DocumentServiceProxy({ skipStringifyWcf: true });
        var ids = this.getSelectedIds();
        var length = ids.length;
        if (length === 0) {
            Utility.executeCallback(cf);
        }
        var arraySize = 50;

        var batch = ids.splice(0, arraySize);
        var success = function (result) {
            Utility.executeCallback(sf, batch.length);
            if (ids.length === 0) {     //Done, call the complete function.
                Utility.executeCallback(cf);
            } else {                    //Still have items to delete, splice the next batch and call the hard delete method.
                batch = ids.splice(0, arraySize);
                proxy.hardDelete(batch, success, failure);
            }
        };
        var failure = function (xhr, status, err) {
            Utility.executeCallback(ff, err);
            Utility.executeCallback(cf);

        };
        proxy.hardDelete(batch, success, failure);

    },
    /// <summary>
    /// Restores all the documents selected.
    /// </summary>
    restoreAllSelected: function (sf, ff, cf) {
        var proxy = DocumentServiceProxy({ skipStringifyWcf: true });
        var ids = this.getSelectedIds();
        var length = ids.length;
        if (length === 0) {
            Utility.executeCallback(cf);
            return;
        }
        proxy.restoreDeleted(ids, sf, ff, cf);
    }
});