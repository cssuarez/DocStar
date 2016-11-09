var CustomFieldValues = Backbone.Collection.extend({
    model: CustomFieldValue,
    /// <summary>
    /// Returns all Values that have the given meta id.
    /// </summary>
    allByMetaId: function (metaId, includeGroupValues) {
        var result = [];
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var cf = this.at(i);
            if (includeGroupValues || !cf.isInGroup()) {
                if (metaId === cf.get('CustomFieldMetaId')) {
                    result.push(cf);
                }
            }
        }
        return result;
    },
    /// <summary>
    /// Returns all Values that are not in the given content type display mask.
    /// Excludes values in a group.
    /// </summary>
    allNotInMask: function (contentTypeDisplayMask) {
        var isDisp = contentTypeDisplayMask.IsDisplayed;
        var result = [];
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var cf = this.at(i);
            if (!cf.isInGroup()) {
                var val = cf.hasValue();
                if (((cf.get('CustomFieldMetaId') && val) || cf.get('isNew')) && isDisp[cf.get('CustomFieldMetaId')] === undefined) {
                    result.push(cf);
                }
            }
        }
        return result;
    },
    /// <summary>
    /// Returns meta ids that are represented in this collection
    /// Excludes values in a group.
    /// </summary>
    getMetaIds: function () {
        var result = {};
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var cf = this.at(i);
            if (!cf.isInGroup()) {
                if (!result[cf.get('CustomFieldMetaId')]) {
                    result[cf.get('CustomFieldMetaId')] = true;
                }
            }
        }
        return result;

    },
    /// <summary>
    /// Returns only custom fields that have a value as a JSON object array and custom fields that have a selected custom field meta id.
    /// Used during save.
    /// If the field is a part of a group, its value is set to a default.
    /// </summary>
    onlyNonEmptyValues: function () {
        var result = [];
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var cf = this.at(i);
            var cfmId = cf.get('CustomFieldMetaId');
            // If no CustomFieldMetaId don't include the custom field
            if (cfmId) {
                if (cf.hasValue()) {
                    result.push(cf.toJSON());
                } else if (cf.isInGroup()) {
                    cf.setDefaultValue();
                    result.push(cf.toJSON());
                }
            }
        }
        return result;
    },
    /// <summary>
    /// if all the fields in a set are empty then this set will be removed.
    /// </summary>
    removeEmptySets: function () {
        var sets = this.getSets();
        var length = sets.length;
        var i = 0;
        for (i; i < length; i++) {
            var cSet = sets[i];
            var isSetEmpty = this.isSetEmpty(cSet);
            if (isSetEmpty) {
                this.removeSetValues(sets[i]);
            }
        }
    },
    getSets: function () {
        var result = [];
        var i = 0;
        var length = this.length;
        for (i = 0; i < length; i++) {
            var cf = this.at(i);
            var cfmId = cf.get('SetId');
            if (cfmId) {
                if (result.indexOf(cfmId) === -1) {
                    result.push(cfmId);
                }
            }
        }
        return result;
    },
    isSetEmpty: function (set) {
        var length = this.length;
        for (i = 0; i < length; i++) {
            var cf = this.at(i);
            var cfmId = cf.get('CustomFieldMetaId');
            if (cfmId && cf.get('SetId') === set && cf.hasValue()) {
                return false;
            }
        }
        return true;
    },
    /// <summary>
    /// Returns an object that has all group ids represented in this collection as the property name with a value of true.
    /// </summary>
    getRepresentedGroups: function () {
        var result = {};
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var cf = this.at(i);
            if (cf.isInGroup()) {
                var gid = cf.get('CustomFieldGroupId');
                if (!result[gid]) {
                    result[gid] = true;
                }
            }
        }
        return result;

    },
    /// <summary>
    /// Gets all sets that are associated with a group id.
    /// </summary>
    /// <param name="groupId"></param>
    /// <param name="sortObj">If provided the sets are returned in a sorted order ({metaId:guid, direction: asc})</param>
    /// <param name="createMissingSetValues">Ensures that each set a complete set of fields, if any are missing they are added.</param>
    getGroupData: function (groupId, sortObj, createMissingSetValues) {
        var data = { setIds: [], allFields: [], setIdHash: {} };
        var col = this;
        var i = 0;
        var length = col.length;
        var cf;
        if (sortObj && sortObj.metaId) {
            var desc = sortObj.direction === 'desc';
            var sorted = [];
            var toBeAppended = [];
            for (i; i < length; i++) {
                cf = col.at(i);
                if (cf.get('CustomFieldMetaId') === sortObj.metaId) {
                    sorted.push(cf);
                } else {
                    toBeAppended.push(cf);
                }
            }
            sorted.sort(function (a, b) {
                var ret = 0;
                if (a.getValue() > b.getValue()) { ret = 1; }
                else if (a.getValue() < b.getValue()) { ret = -1; }
                if (ret !== 0 && desc) {
                    ret = -ret;
                }
                return ret;
            });
            i = 0;
            length = toBeAppended.length;
            for (i; i < length; i++) {
                sorted.push(toBeAppended[i]);
            }
            col = new CustomFieldValues(sorted);
        }

        i = 0;
        length = col.length;
        for (i; i < length; i++) {
            cf = col.at(i);
            if (cf.get('CustomFieldGroupId') === groupId) {
                data.allFields.push(cf);
                var setId = cf.get('SetId');
                if (!data.setIdHash[setId]) {
                    data.setIdHash[setId] = true;
                    data.setIds.push(setId);
                }
            }
        }
        var group = window.customFieldMetaGroupPackages.get(groupId);
        if (group && createMissingSetValues) {
            var missingSetValues = [];
            var templates = group.get('CustomFieldGroupTemplates');
            var name = group.get('CustomFieldGroup').Name;
            i = 0;
            length = data.setIds.length;
            var idx = 0;
            var templateLength = templates.length;
            for (i; i < length; i++) {
                setId = data.setIds[i];
                var setValues = this.getSetValues(setId);
                idx = 0;
                for (idx; idx < templateLength; idx++) {
                    var t = templates[idx];
                    if (this.isMissingTemplateValue(setId, t, setValues)) {
                        var cfm = window.customFieldMetas.get(t.CustomFieldMetaId);
                        var obj = cfm.createValueObject();
                        obj.CustomFieldGroupId = t.CustomFieldGroupId;
                        obj.CustomFieldGroupName = name;
                        obj.CustomFieldGroupOrder = t.Order;
                        obj.CustomFieldGroupTemplateId = t.Id;
                        obj.SetId = setId;

                        missingSetValues.push(obj);
                    }
                }
            }
            if (missingSetValues.length > 0) {
                data.addedFields = true;
                this.add(missingSetValues);
            }
        }
        return data;
    },
    /// <summary>
    /// Removes all values that are associated with a Custom Field Group.
    /// </summary>
    removeGroupValues: function (groupId) {
        var data = this.getGroupData(groupId);
        this.remove(data.allFields, { collectionRemoveInProgress: true });
        this.trigger('remove', data.allFields[0]); //Trigger another remove but this time we are done removing all fields.
    },
    /// <summary>
    /// Gets all values in a set. 
    /// If column preferences are provided only set values that are in the column preferences are returned.
    /// If column preferences are provided the set is returned in order.
    /// </summary>
    getSetValues: function (setId, columnPreferences) {
        var setValues = [];
        var unsortedArray = [];
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var cf = this.at(i);
            if (cf.get('SetId') === setId) {
                if (!columnPreferences) {
                    setValues.push(cf);
                } else if (columnPreferences[cf.get('CustomFieldMetaId')]) {
                    var idx = columnPreferences[cf.get('CustomFieldMetaId')].order;
                    if (idx === undefined) {
                        idx = i;//If you just resize and don't reorder you will an an undefined order.
                    }
                    setValues[idx] = cf; //Ok I admit JS is pretty cool allowing this.
                }
            }
        }
        return setValues;
    },
    /// <summary>
    /// Checks this collection to ensure a set has a specific group template represented.
    /// </summary>
    isMissingTemplateValue: function (setId, groupTemplate, setValues) {
        var i = 0;
        var length = setValues.length;
        for (i; i < length; i++) {
            var sv = setValues[i];
            if (sv.get('CustomFieldMetaId') === groupTemplate.CustomFieldMetaId) {
                return false;
            }
        }
        return true;
    },
    /// <summary>
    /// Removes all values in a set.
    /// </summary>
    removeSetValues: function (setId) {
        var set = this.getSetValues(setId);
        if (set.length) {
            this.remove(set, { collectionRemoveInProgress: true });
            this.trigger('remove', set[0]); //Trigger another remove but this time we are done removing all fields.
        }
    },
    /// <summary>
    /// Updates this collection based on form element data.
    /// If a custom field value does not yet exist one is created.
    /// </summary>
    /// <param name="data">{storeId: BackingStoreId, valueId: BackingStoreValueId, value: object { Key: backing store id, Value: new value }, groupId: if a part of a group, valueIdUpdatedCB: callback to update the UI's value id data property, if a new group set is created a group object is returned}</param>
    updateBackingStore: function (data, cb) {
        var cfv = this.get(data.valueId);
        var option = {
            createWithDefault: data.createWithDefault
        };
        if (cb) {
            option.callBack = cb;
        }
        var values = data.values || {};
        var value = values[data.storeId];   // singular value present in the values object, obtain it via the provided storeid
        var valExists = value !== undefined && value.toString().length > 0;
        if (cfv) {
            if (valExists) {
                cfv.setValue(value, option);
            } else if (!cfv.get('CustomFieldGroupId')) { //Only remove non group values.
                cfv.destroy();
            } else {
                cfv.setValue('', option); //Set the value to blank in the case of a custom field group value where the value is null or empty.
            }
        } else {
            var cfm = window.customFieldMetas.get(data.storeId);
            if (!cfm) {
                return;
            }
            if (data.groupId) {
                this.createSet(data, option);
            } else if (valExists) { // Don't create a new custom field value if there is no value to create a custom field value for
                var obj = cfm.createValueObject();
                cfv = new CustomFieldValue(obj);
                cfv.setValue(value, option);
                this.add(cfv);
                data.valueIdUpdatedCB(obj.Id);
            }
        }
    },
    ///<summary>
    /// Create a custom field value set and add its values to the collection of custom field values
    /// <param name="data">{storeId: BackingStoreId, valueId: BackingStoreValueId, value: object { Key: backing store id, Value: new value }, groupId: if a part of a group, valueIdUpdatedCB: callback to update the UI's value id data property, if a new group set is created a group object is returned}</param>
    ///<param name="option">{createWithDefault: if the value is undefined provide a default value instead of not setting it}</param>
    ///</summary>
    createSet: function (data, option) {
        option = option || {
            createWithDefault: data.createWithDefault
        };
        var cfgPkg = window.customFieldMetaGroupPackages.get(data.groupId);
        var values = data.values || {};
        var set = cfgPkg.createValueSet();
        var i = 0;
        var length = set.length;
        var id;
        for (i; i < length; i++) {
            set[i] = new CustomFieldValue(set[i]);
            var cfmId = set[i].get('CustomFieldMetaId');
            var val = values[cfmId];
            set[i].setValue(val, option);
            if (cfmId === data.storeId) {
                id = set[i].get('Id');
            }
        }
        this.add(set);
        if (data.valueIdUpdatedCB) {
            data.valueIdUpdatedCB(id, set);
        }
    },
    /// <summary>
    /// Adds a new custom field value to this collection if an existing value is not found. If an existing value is found then its value is replaced by the value passed.
    /// Note non-grouped values are given presidence over group values when updating.
    /// </summary>
    addOrReplaceValue: function (cfMetaNameOrId, cfValue) {
        var cfm;
        var length = window.customFieldMetas.length;
        var i = 0;
        for (i; i < length; i++) {
            var m = window.customFieldMetas.at(i);
            if (m.get('Name').toLowerCase() === cfMetaNameOrId.toLowerCase() || m.get('Id') === cfMetaNameOrId) {
                cfm = m;
                break;
            }
        }

        if (cfm) {
            var cfs = this.allByMetaId(cfm.get('Id'));
            i = 0;
            length = cfs.length;
            var cf = cfs[0];
            for (i; i < length; i++) {
                var c = cfs[i];
                if (!c.isInGroup()) {
                    cf = c;
                    break; //Break on the first non-grouped value, otherwise continue
                }
            }

            if (cf) {
                cf.setValue(cfValue);
            } else {
                cf = new CustomFieldValue(cfm.createValueObject());
                cf.setValue(cfValue);
                this.add(cf);
            }
        }
    },
    /// <summary>
    /// Clears ephemeral properties; call when model is synced.
    /// </summary>
    clearTemporaryProperties: function () {
        var i = 0;
        var length = this.length;
        var opt = { silent: true };
        for (i; i < length; i++) {
            var cf = this.at(i);
            cf.unset('isNew', opt);
        }
    }
});