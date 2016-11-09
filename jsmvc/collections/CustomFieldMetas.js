var CustomFieldMetas = Backbone.Collection.extend({
    model: CustomFieldMeta,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.alphaNumericSort,
    proxy: CustomFieldProxy(),
    sync: function (method, collection, options) {
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
                //TODO: don't get new as well(get new when needed for the collection) KILL THE METHOD in server and controller
                this.proxy.getCustomFieldsWithNew(sf, ff, complete, null, options.headers);
                break;
            case 'create':
                break;
            case 'update':
                break;
            case 'delete':
                break;
        }
    },
    getByName: function (name) {
        var idx = 0;
        var length = this.length;
        var cfm;
        for (idx; idx < length; idx++) {
            if (this.at(idx).get('Name') === name) {
                cfm = this.at(idx);
            }
        }
        return cfm;
    },
    filterOutExisting: function (fieldsToAdd) {
        var idx = 0;
        var length = fieldsToAdd.length;
        var adds = [];
        for (idx; idx < length; idx++) {
            var fieldToAdd = fieldsToAdd[idx];
            var existingField = this.get(fieldToAdd.Id) || this.getByName(fieldToAdd.Name);
            if (existingField) {
                fieldsToAdd[idx] = existingField.toJSON();
            }
            else {
                adds.push(fieldToAdd);
                this.add(fieldToAdd);
            }
        }
        return adds;
    },
    ///<summary>
    /// Returns an array of filtered custom field metas, removing those that do not match the passed in types
    /// <param name="fieldTypes">an object containing the field types to filter by (subset of Constants.ty)</param>
    /// <param name="isReadOnlyList">an object containing the list type readOnly true or false to filter.</param>
    ///</summary>
    filterByTypes: function (fieldTypes, isReadOnlyList) {
        var fts = Utility.reverseMapObject(fieldTypes);
        var cfms = [];
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var cfm = this.at(idx);
            // If the fieldTypes to be allowed includes Constants.ty.Object, then check to see if the custom field meta has a ListName, a DropDownDataLinkId, or a TypeAheadDataLinkId
            // If so, then include that field
            if (fieldTypes.Object && (cfm.get('ListName') || cfm.get('DropDownDataLinkId') || cfm.get('TypeAheadDataLinkId'))) {
                if (isReadOnlyList !== undefined) {
                    var list = window.customLists.getCustomListByName(cfm.get('ListName'));
                    if (list) {
                        var readOnly = list.get('ReadOnly');
                        if (readOnly === isReadOnlyList) {
                            cfms.push(cfm.toJSON());
                        }
                    }
                } else {
                    cfms.push(cfm.toJSON());
                }
            }
            else if (fts[cfm.get('Type')]) {
                cfms.push(cfm.toJSON());
            }
        }
        return cfms;
    }
});