var SearchableEntity = CustomGridItem.extend({
    dateTimeFields: { Created: true, Modified: true },
    idAttribute: 'Id',
    initialize: function () {
        var that = this;
        this.listenTo(this, 'change', that.modelChanged);
        this.listenTo(this, 'sync', that.modelSynced);
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.DynamicFields) {
            attr = attrs.DynamicFields;
            if (this.get('DynamicFields') instanceof Backbone.Collection) {
                this.get('DynamicFields').set(attr, options);
                delete attrs.DynamicFields;
            }
            else {
                attrs.DynamicFields = new DynamicFields();
                attrs.DynamicFields.reset(attr, options);
                this.bindSubModelEvents(attrs.DynamicFields, 'DynamicFields');
            }
        }
        if (attrs.DynamicFieldDisplayValues) {
            attr = attrs.DynamicFieldDisplayValues;
            if (this.get('DynamicFieldDisplayValues') instanceof Backbone.Collection) {
                this.get('DynamicFieldDisplayValues').set(attr, options);
                delete attrs.DynamicFieldDisplayValues;
            }
            else {
                attrs.DynamicFieldDisplayValues = new DynamicFields();
                attrs.DynamicFieldDisplayValues.reset(attr, options);
                this.bindSubModelEvents(attrs.DynamicFieldDisplayValues, 'DynamicFieldDisplayValues');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    toJSON: function () {
        return this.toJSONComplex();
    },
    sync: function (method, model, options) {
        options.method = method;
        switch (method) {
            case "create":
                break;
            case "read":
                break;
            case "update":
                var type = this.get('Type');
                switch (type) {
                    case Constants.et.Document:
                        this.saveDocument(options);
                        break;
                    case Constants.et.Inbox:
                        this.saveInbox(options);
                        break;
                    case Constants.et.Folder:
                        this.saveFolder(options);
                        break;
                }
                break;
            case "delete":
                break;
        }
    },
    modelChanged: function (m, o) {
        //Set dirty flag with some exceptions.
        var firtLetterUpper = /^[A-Z]/;//Any property that is camelcase is not eligible. 
        var setDirty = false;
        if (o && o.collectionDirtyChange) {
            setDirty = true;
        } else if (m && m.isDirtyEligible()) {
            setDirty = true;
        }
        if (setDirty) {
            this.setDirty(true);
        }
    },
    modelSynced: function (model_or_collection, resp, options) {
        this.setDirty(false);
    },
    setDirty: function (state) {
        var dirty = this.get('isDirty');
        if (dirty !== state) {
            this.set('isDirty', state, { silent: true }); //Don't let setting dirty trigger a change. (even though the model change would ignore it don't want to fire all those events)
            this.trigger('change:isDirty'); //Manually fire just the isDirty change event (not the generic change event).
        }
    },
    /// <summary>
    /// Slim save of a document type searchable entity.
    /// </summary>
    saveDocument: function (options) {
        var sup = this.toSlimUpdatePackage();
        var docProxy = DocumentServiceProxy({ skipStringifyWcf: true });
        var that = this;
        var ff = function (xhr, status, err) {
            if (options.failure) {
                options.failure(err);
            } else {
                ErrorHandler.popUpMessage(err);
            }

        };
        var sf = function (result) {
            if (that.originalValues) {
                delete that.originalValues;
            }
            var r = result.ResultByVerId[0];
            that.suspendChangeRender = true;
            if (r.Value.Error) {
                ff(null, null, r.Value.Error);
            }
            else {
                if (r.Value.Reload || options.triggerMassUpdate) {
                    $('body').trigger('MassDocumentUpdated', { ids: [sup.DocumentId], callback: function () { options.success({}); } }); //Notify listeners that the meta has been updated.
                }
                    // If possible reset ModifiedTicks
                else {
                    var modifiedTicks = r.Value.ModifiedTicks;
                    that.setDotted('DynamicFields.' + Constants.UtilityConstants.DF_MODIFIED_TICKS + '.Value', [modifiedTicks]);
                    options.success({});
                }
            }
            delete that.suspendChangeRender;
        };
        docProxy.updateManySlim([sup], sf, ff);
    },
    /// <summary>
    /// Save of an inbox type searchable entity.
    /// </summary>
    saveInbox: function (options) {
        var inboxSvc = InboxServiceProxy({ skipStringifyWcf: true });
        var that = this;
        var id = this.get('Id');
        var title = this.get('Title');

        var sf = function (result) {
            if (that.originalValues) {
                delete that.originalValues;
            }
            that.suspendChangeRender = true;
            options.success({});
            $('#inbox_list').jstree('rename_node', $('#jstree-' + id), title);
            $('#jstree-' + id).attr('title', title);
            delete that.suspendChangeRender;
        };
        var ff = function (xhr, status, err) {
            ErrorHandler.popUpMessage(err);
        };
        var val = { NewName: this.get('Title'), Id: this.get('Id') };
        inboxSvc.renameInbox(val, sf, ff);
    },
    /// <summary>
    /// Save of a folder type searchable entity.
    /// </summary>
    saveFolder: function (options) {
        var folderSvc = FolderServiceProxy({ skipStringifyWcf: true });
        var that = this;
        var id = this.get('Id');
        var title = this.get('Title');

        var sf = function (result) {
            if (that.originalValues) {
                delete that.originalValues;
            }
            that.suspendChangeRender = true;
            options.success({});
            $('#inbox_list').jstree('rename_node', $('#jstree-' + id), title); //jstree rename_node from inbox_list also change folders title
            $('#jstree-' + id).attr('title', title);
            delete that.suspendChangeRender;
        };
        var ff = function (xhr, status, err) {
            ErrorHandler.popUpMessage(err);
        };
        var parent = this.getSingleDynamicFieldValue(Constants.UtilityConstants.DF_FOLDERID);
        if (!parent) {
            parent = Constants.c.emptyGuid;
        }
        val = { NewTitle: title, Id: id, Parent: parent };
        folderSvc.renameFolder(val, sf, ff);
    },
    /// <summary>
    /// Converts this to a slim update package.
    /// </summary>
    /// <param name="sfo">Specific Field Options: If provided an update package is generated for a single field instead of all changed fields. {field: 'title', values: ['new title']}</param>
    toSlimUpdatePackage: function (sfo) {
        var uc = Constants.UtilityConstants;
        var sup = {
            DocumentId: this.get('Id'),
            VersionId: this.versionId(),
            ModifiedTicks: this.getSingleDynamicFieldValue(uc.DF_MODIFIED_TICKS),
            FolderIds: null        //Not editable via searchable entity.
        };

        sup.Title = this.getSlimUpdateValue(this.get('Title'), uc.SF_TITLE, sfo);
        sup.Keywords = this.getSlimUpdateValue(this.get('Keywords'), uc.SF_KEYWORDS, sfo);
        sup.ContentTypeId = this.getSlimUpdateValue(this.get('ContentTypeId'), uc.SF_CONTENTTYPE_ID, sfo);
        sup.SecurityClassId = this.getSlimUpdateValue(this.get('SecurityClassId'), uc.SF_SECURITYCLASS_ID, sfo);
        sup.Priority = this.getSlimUpdateValue(this.getSingleDynamicFieldValue(uc.DF_PRIORITY), uc.DF_PRIORITY, sfo);
        sup.CutoffDate = this.getSlimUpdateValue(this.getSingleDynamicFieldValue(uc.DF_CUTOFF_DATE), uc.DF_CUTOFF_DATE, sfo);
        sup.DueDate = this.getSlimUpdateValue(this.getSingleDynamicFieldValue(uc.DUEDATE), uc.DUEDATE, sfo);
        sup.InboxId = this.getSlimUpdateValue(this.getSingleDynamicFieldValue(uc.DF_INBOXID), uc.DF_INBOXID, sfo);
        sup.RecordCategoryId = this.getSlimUpdateValue(this.getSingleDynamicFieldValue(uc.DF_RECORDCATEGORYID), uc.DF_RECORDCATEGORYID, sfo);

        sup.CustomFieldValues = [];   //Nulled if no custom field changes are detected.
        var dfs = this.get('DynamicFields');
        var length = dfs.length;
        var i = 0;
        var hasChange = false;
        var doesFieldExist = false;
        var values, vLength, idx, key, df, m, metaId;
        var cfvModel;
        var cfvModels = new CustomFieldValues();
        for (i; i < length; i++) {
            df = dfs.at(i);
            key = df.get('Key');
            m = window.customFieldMetas.getByName(key);
            if (m) {
                metaId = m.get('Id');
                values = df.get('Value');
                if (!hasChange) {
                    if (sfo) { //Specific Field Options override: if one is provided (column edit) use the values provided instead of the values
                        if (sfo.field === metaId) {
                            hasChange = true;
                            doesFieldExist = true;
                            values = sfo.values;
                        }
                    } else {
                        hasChange = !this.compareDynamicValue(values, key);
                    }
                }
                vLength = values ? values.length : 0;
                idx = 0;
                for (idx; idx < vLength; idx++) {
                    cfvModel = new CustomFieldValue({
                        CustomFieldName: key,
                        CustomFieldMetaId: metaId,
                        TypeCode: m.get('Type')
                    });
                    cfvModel.setValue(values[idx]);
                    cfvModels.add(cfvModel);
                }
            }
        }
        if (!doesFieldExist && sfo) {
            m = window.customFieldMetas.get(sfo.field);
            if (m) {
                hasChange = true;
                metaId = m.get('Id');
                values = sfo.values;
                vLength = values ? values.length : 0;
                idx = 0;
                for (idx; idx < vLength; idx++) {
                    cfvModel = new CustomFieldValue({
                        CustomFieldName: m.get('Key'),
                        CustomFieldMetaId: metaId,
                        TypeCode: m.get('Type')
                    });
                    cfvModel.setValue(values[idx]);
                    cfvModels.add(cfvModel);
                }
            }
        }
        if (hasChange) {
            sup.CustomFieldValues = cfvModels.onlyNonEmptyValues();
            //Field change detected - push in group values so they are not lost.
            var cfgvs = this.get('CustomFieldGroups');
            var cfgi, set;
            i = 0;
            length = cfgvs ? cfgvs.length : 0;
            for (i; i < length; i++) {
                set = cfgvs[i];
                vLength = set.Value ? set.Value.length : 0;
                idx = 0;
                for (idx; idx < vLength; idx++) {
                    cfgi = set.Value[idx];
                    m = window.customFieldMetas.getByName(cfgi.Name);

                    cfvModel = new CustomFieldValue({
                        CustomFieldName: m.get('Key'),
                        CustomFieldMetaId: m.get('Id'),
                        TypeCode: m.get('Type'),
                        CustomFieldGroupTemplateId: cfgi.GroupTemplateId,
                        SetId: set.Key
                    });
                    cfvModel.setValue(cfgi.Value);
                    sup.CustomFieldValues.push(cfvModel.toJSON());
                }
            }
        } else {
            sup.CustomFieldValues = null; //No CF changes.
        }
        return sup;
    },
    /// <summary>
    /// Compares orginal value to new value, if the value is unchanged null is returned, otherwise the new value is returned.
    /// NOTE this only handles single valued fields.
    /// </summary>
    getSlimUpdateValue: function (newVal, key, sfo) {
        if (sfo) {
            if (sfo.field === key) {
                return sfo.values[0];
            }
            return null;
        }
        if (!this.originalValues) {
            return newVal;
        }
        var uc = Constants.UtilityConstants;
        var ov = this.originalValues;
        switch (key) {
            case uc.SF_TITLE:
                return ov.Title === newVal ? null : newVal;
            case uc.SF_KEYWORDS:
                return ov.Keywords === newVal ? null : newVal;
            case uc.SF_CONTENTTYPE_ID:
                return ov.ContentTypeId === newVal ? null : newVal;
            case uc.SF_SECURITYCLASS_ID:
                return ov.SecurityClassId === newVal ? null : newVal;
            case uc.DF_PRIORITY:
            case uc.DF_CUTOFF_DATE:
            case uc.DUEDATE:
            case uc.DF_INBOXID:
            case uc.DF_RECORDCATEGORYID:
                return this.compareDynamicValue([newVal], key) ? null : newVal;
        }

    },
    /// <summary>
    /// Compares orginal dynamic value to new value, returns a bool indicating if it is the same or not.
    /// NOTE: the newVal should always be an array.
    /// </summary>
    compareDynamicValue: function (newVal, key) {
        if (!this.originalValues || !this.originalValues.DynamicFields) {
            return false;
        }
        var ovs;
        var df = this.originalValues.DynamicFields;
        var i = 0;
        var length = df.length;
        for (i; i < length; i++) {
            if (df[i].Key === key) {
                ovs = df[i].Value;
                break;
            }
        }
        var oLength = ovs ? ovs.length : 0;
        var nLength = newVal ? newVal.length : 0;
        if (oLength === 0 && nLength === 1 && newVal[0] === undefined) {
            return true;  //Special case, Value was not found in either the origninal values or the current values (undefined only returned when dynamic value is not found)
        }
        if (oLength !== nLength) {
            return false; //quick exit
        }
        i = 0;
        for (i; i < oLength; i++) {
            if (newVal.indexOf(ovs[i]) === -1) {
                return false;
            }
        }
        return true;
    },
    /// <summary>
    /// If this is selected a tooltip is returned indicating its order.
    /// </summary>
    getSelectedTT: function () {
        if (this.isSelected()) {
            var sequence = parseInt(this.get('sequence'), 10);
            if (!isNaN(sequence)) {

                return (sequence + 1).nth() + ' ' + Constants.c.selection;
            }
        }

        return '';
    },
    /// <summary>
    /// Gets the version Id of this from the dynamic fields
    /// </summary>
    versionId: function () {
        return this.getSingleDynamicFieldValue(Constants.UtilityConstants.VERSIONID);
    },
    /// <summary>
    /// Checks if the current user have the passed standard permission to this entity
    /// </summary>
    hasRights: function (sp) {
        var ep = this.get('EffectivePermissions');
        if (ep) {
            return Utility.hasFlag(ep, sp);
        }
    },
    /// <summary>
    /// Gets the hasVersions property of this from the dynamic fields
    /// </summary>
    hasVersions: function () {
        return this.getSingleDynamicFieldValue(Constants.UtilityConstants.DF_HAS_VERSIONS);
    },
    /// <summary>
    /// Gets the hasCfSet property of this from the dynamic fields
    /// </summary>
    hasGroupValues: function () {
        return this.getSingleDynamicFieldValue(Constants.UtilityConstants.DF_HAS_CF_SET);
    },
    /// <summary>
    /// Gets the hasDraft property of this from the dynamic fields
    /// </summary>
    hasDraft: function () {
        return this.getSingleDynamicFieldValue(Constants.UtilityConstants.DF_HAS_DRAFT);
    },
    /// <summary>
    /// Returns the first dynamic value of the passed key.
    /// If display value is true the DynamicFieldDisplayValues will be checked for a value prior to checking the DynamicFields.
    /// </summary>
    getSingleDynamicFieldValue: function (dfKey, displayValue) {
        var df = this.getDynamicValue(dfKey, displayValue);
        if (df && df.length > 0) {
            return df[0];
        }
    },
    /// <summary>
    /// Returns all dynamic values as a joined array using the passed separator.
    /// If display value is true the DynamicFieldDisplayValues will be checked for a value prior to checking the DynamicFields.
    /// </summary>
    getJoinedDynamicFieldValue: function (dfKey, displayValue, separator) {
        var df = this.getDynamicValue(dfKey, displayValue);
        if (df && df.length > 0) {
            return df.join(separator);
        }
    },
    /// <summary>
    /// Returns a copy of the dynamic value array of the passed key.
    /// If display value is true the DynamicFieldDisplayValues will be checked for a value prior to checking the DynamicFields.
    /// Optionally a lookup function may be provided to translate values into display values. These are only used if displayValue false. 
    /// </summary>
    getDynamicValue: function (dfKey, displayValue, lookupFunc) {
        var val;
        if (displayValue) {
            val = this.getDotted('DynamicFieldDisplayValues.' + dfKey + '.Value');
            if (val) {
                val = val.slice(0);
            }
        }
        if (!val) {
            var dfs = this.get('DynamicFields');
            val = dfs.getValue(dfKey, lookupFunc);
        }
        return val;
    },
    ///<summary>
    /// Obtain data for 'Approvals' column
    ///</summary>
    getApprovalsData: function () {
        var uc = Constants.UtilityConstants;
        var data = {};
        data[uc.APPROVALS] = this.getSingleDynamicFieldValue(uc.APPROVALS);
        data[uc.DF_APPROVALS_REQUIRED] = this.getSingleDynamicFieldValue(uc.DF_APPROVALS_REQUIRED);
        data[uc.DF_APPROVALS_STRINGS] = this.getDynamicValue(uc.DF_APPROVALS_STRINGS);
        data[uc.DF_APPROVALS_STRINGS_TOOLTIP] = this.getDynamicValue(uc.DF_APPROVALS_STRINGS_TOOLTIP);
        data[uc.DF_APPROVAL_REQUESTS] = this.getDynamicValue(uc.DF_APPROVAL_REQUESTS);
        return data;
    },
    ///<summary>
    /// Obtain Appproval State for the current user
    ///</summary>
    getAppStateCurr: function () {
        var uc = Constants.UtilityConstants;
        var currUser = Utility.getCurrentUser();
        if (!currUser) {
            return;
        }
        var i;
        var length;
        var isCurDenied = false;
        var isCurApproved = false;
        var userId = currUser.Id;
        var currApprovalUsers = this.getDynamicValue(uc.DF_APPROVAL_USERS);
        if (currApprovalUsers) {
            if (!(currApprovalUsers instanceof Array) && typeof currApprovalUsers === 'string') {
                currApprovalUsers = currApprovalUsers.split(',');
            }
            length = currApprovalUsers.length;
            for (i = 0; i < length; i++) {
                if (currApprovalUsers[i] === userId) {
                    isCurApproved = true;
                    break;
                }
            }
        }
        var currDenyUsers = this.getDynamicValue(uc.DF_DENY_USERS);
        if (currDenyUsers) {
            if (!(currDenyUsers instanceof Array) && typeof currDenyUsers === 'string') {
                currDenyUsers = currDenyUsers.split(',');
            }
            length = currDenyUsers.length;
            for (i = 0; i < length; i++) {
                if (currDenyUsers[i] === userId) {
                    isCurDenied = true;
                }
            }
        }
        return isCurApproved ? 1 : (isCurDenied ? 2 : '');
    },
    /// <summary>
    /// Given a field the appropriate value is returned either from dynamic fields or specific fields on this, all values are translated if required.
    /// If display value is true the DynamicFieldDisplayValues will be checked for a value prior to checking the DynamicFields.
    /// If separator is passed a joined array is returned, otherwise an array is returned.
    /// </summary>
    getValuesByField: function (field, displayValue, separator) {
        var value;
        if (Utility.containsGuid(field)) {
            var meta = window.customFieldMetas.get(field);
            if (meta) {
                var cfName = meta.get('Name');
                if (separator === undefined) {
                    value = this.getDynamicValue(cfName, displayValue);
                } else {
                    value = this.getJoinedDynamicFieldValue(cfName, displayValue, separator);
                }
            }
        } else {
            var uc = Constants.UtilityConstants;
            var id;
            var se;
            switch (field) {
                case uc.SF_TITLE:
                    value = this.get('Title');
                    break;
                case uc.SF_CREATED:
                    value = this.get('Created');
                    break;
                case uc.SF_KEYWORDS:
                    value = this.get('Keywords');
                    break;
                case uc.SF_MODIFIED:
                    value = this.get('Modified');
                    break;
                case uc.SF_CONTENTTYPE_ID:
                    value = this.get('ContentTypeId');
                    if (value && displayValue) {
                        var ct = window.contentTypes.get(value);
                        if (ct) {
                            value = ct.get('Name');
                        } else {
                            value = Constants.c.hidden; // Should never occur because even hidden ones are included in the collection
                        }
                    }
                    break;
                case uc.SF_SECURITYCLASS_ID:
                    value = this.get('SecurityClassId');
                    if (value && displayValue) {
                        var sc = window.slimSecurityClasses.get(value);
                        if (sc) {
                            value = sc.get('Name');
                        } else {
                            value = Constants.c.hidden; // Should never occur because security classes are not filtered
                        }
                    }
                    break;
                case uc.DF_APPROVAL_REQUESTS:
                case uc.DF_WORKFLOW_ASSIGNEE_ID:
                case uc.DF_WORKFLOW_OWNER_ID:
                    var urd = Utility.getUserRolesDictionary();
                    value = this.getDynamicValue(field, undefined, function (sv) { return urd.hasOwnProperty(sv) ? urd[sv] : sv; });//ALWAYS return display value, this is not an editable field
                    break;
                case uc.DF_FREEZEID:
                    value = this.getDynamicValue(field, undefined, function (sv) { //ALWAYS return display value, this is not an editable field
                        se = window.slimFreezes.get(sv);
                        return se ? se.get('Name') : sv;
                    });
                    break;
                case uc.DF_WORKFLOW_ID:
                    value = this.getDynamicValue(field, undefined, function (sv) { //ALWAYS return display value, this is not an editable field
                        se = window.slimWorkflows.get(sv);
                        return se ? se.get('Name') : Constants.c.hidden;
                    });
                    break;
                case uc.DF_INBOXID:
                    value = this.getDynamicValue(field, displayValue, function (sv) {
                        if (sv && displayValue) {
                            se = window.slimInboxes.get(sv);
                            return se ? se.get('Name') : Constants.c.hidden;
                        }
                        return sv === Constants.c.emptyGuid ? '' : sv;
                    });
                    break;
                case uc.DF_FOLDERID:
                    // Display 'Loading...' until the folder's path is obtained
                    value = this.getDynamicValue(field, displayValue, function (sv) {
                        if (sv === Constants.c.emptyGuid) {
                            return '';
                        }
                        var folder = window.folders.get(sv);
                        return folder && folder.get('Path') ? folder.get('Path') : Constants.t('loadText');
                    });
                    var idx = 0;
                    var length = value ? value.length : 0;
                    for (idx; idx < length; idx++) {
                        if (value[idx] === Constants.t('loadText')) {
                            value = Constants.t('loadText');
                            break;
                        }
                    }
                    break;
                case uc.DF_RECORDCATEGORYID:
                    value = this.getDynamicValue(field, displayValue, function (sv) {
                        if (sv && displayValue) {
                            se = window.slimRecordCategories.get(sv);
                            return se ? se.get('Name') : Constants.c.hidden;
                        }
                        return sv;
                    });
                    break;
                case uc.DF_PRIORITY:
                    var pld = {};
                    for (id in Constants.pl) {
                        if (Constants.pl.hasOwnProperty(id)) {
                            pld[Constants.pl[id]] = Constants.c['pl_' + id];
                        }
                    }
                    value = this.getDynamicValue(field, displayValue, function (sv) { return pld.hasOwnProperty(sv) ? pld[sv] : sv; });
                    break;
                case uc.DF_CURRENT_STATE:
                    var dsd = {};
                    for (id in Constants.ds) {
                        if (Constants.ds.hasOwnProperty(id)) {
                            dsd[Constants.ds[id]] = Constants.c['ds_' + id];
                        }
                    }
                    value = this.getDynamicValue(field, undefined, function (sv) { return dsd.hasOwnProperty(sv) ? dsd[sv] : sv; }); //ALWAYS return display value, this is not an editable field
                    break;
                case uc.APPROVALS:
                    // NOTE: The data is obtained and formatted in SearchResultItemView
                    break;
                default:
                    if (separator === undefined) {
                        value = this.getDynamicValue(field, displayValue);
                    } else {
                        value = this.getJoinedDynamicFieldValue(field, displayValue, separator);
                    }
                    break;
            }
        }
        if (separator === undefined && !(value instanceof Array)) {
            value = [value];
        }

        return value;
    },
    /// <summary>
    /// Returns the css class to be used based on the type and extension of this.
    /// </summary>
    getTypeClass: function () {
        var type = this.get('Type');
        switch (type) {
            case Constants.et.Document:
                var ext = this.get('Extension');
                if (ext && Utility.verifyStyle('.' + ext.toLowerCase())) {
                    return 'document_icon ' + ext.toLowerCase();
                }
                return 'default_icon';
            case Constants.et.Inbox:
                return 'inbox_icon';
            case Constants.et.Folder:
                return 'folder_icon';
            default:
                return 'default_icon';
        }
    },
    /// <summary>
    /// Updates this model based on form element data.
    /// </summary>
    /// <param name="data">{storeId: BackingStoreId, valueIndex: BackingStoreValueId, value: new value }</param>
    updateBackingStore: function (data) {
        switch (data.storeId) {
            case 'title':
                this.set('Title', data.value);
                break;
            case 'keywords':
                this.set('Keywords', data.value);
                break;
            case 'contenttypeid':
                this.set('ContentTypeId', data.value);
                break;
            case 'securityclassid':            
                this.set('SecurityClassId', data.value);
                break;
            default:
                var key = data.storeId;
                if (Utility.containsGuid(key)) {
                    var cf = window.customFieldMetas.get(key);
                    if (cf) {
                        key = cf.get('Name');
                    }
                }
                var df = this.getDotted('DynamicFields.' + key);
                if (df) {
                    var values = df.get('Value');
                    values[data.valueIndex] = data.value;
                    df.set('Value', values, { silent: true });  // triggering change event manually, so make this set silent
                    df.trigger('change', df, { collectionDirtyChange: true });
                } else {
                    this.get('DynamicFields').add({
                        Key: key,
                        Value: [data.value]
                    });
                }

                break;
        }
    },
    /// <summary>
    /// Stores the original values of this object. This is used in conjunction with revertChanges
    /// </summary>
    storeOriginalValues: function () {
        var dtf = this.dateTimeFields;
        this.dateTimeFields = []; //Temporarally remove the date fields, this way the orginal value dates are not turned to msjson.
        this.originalValues = JSON.parse(JSON.stringify(this.toJSON())); //Need to break the by ref bindings.
        this.dateTimeFields = dtf;
    },
    /// <summary>
    /// Reverts this object back to its original values (if it has any). Store original values should be called before any change is allowed.
    /// </summary>
    revertChanges: function () {
        if (this.originalValues) {
            this.originalValues.isSelected = this.isSelected(); //revert all but the isSelected property.
            this.set(this.originalValues);
            this.setDirty(false);
        }
    }
});