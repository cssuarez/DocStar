var DocumentMetaFieldGroupView = CustomGridView.extend({
    model: undefined, // BulkViewerDataPackageCPX
    className: 'DocumentMetaFieldGroupView',
    groupId: undefined,
    groupPkg: undefined,
    groupData: undefined,
    augmentedCFMs: undefined,
    showGroupName: true,
    bound: false,
    previewMode: false,
    columnSelectView: undefined,
    colPreferences: undefined,
    ro: undefined,
    customFieldGroupSetViews: undefined,
    events: {
        'click .deleteGroup': 'deleteGroup',
        'click .addGroupSet': 'addGroupSet',
        'click .columnSelector': 'chooseColumns',
        'click .saveChanges:not(.disabledIcon)': 'saveChanges',
        'click .cancelChanges:not(.disabledIcon)': 'cancelChanges'
    },
    close: function () {
        this.closeSetViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentmetafieldgroupviewlayout'));
        this.groupId = options.groupId;
        this.showGroupName = options.showGroupName;
        this.canDelete = options.canDelete === false ? false : true;
        this.canDeleteGroup = options.canDeleteGroup === false ? false : true;
        this.canSave = options.canSave;
        this.previewMode = options.previewMode;
        this.colPreferences = Utility.tryParseJSON(Utility.GetUserPreference('col_Pref_' + this.groupId));
        this.sortObj = Utility.tryParseJSON(Utility.GetUserPreference('col_sort_' + this.groupId));
        this.initializeGrid({ singleClickEdit: true, makeScrollable: false, makeColumnsResizable: false });
        this.customFieldGroupSetViews = [];
        return this;
    },
    render: function () {
        this.ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.ro));
        this.renderGrid();
        this.renderSets(this.ro);
        if (!this.bound) {
            this.bound = true;
            var cfgs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
            this.listenTo(cfgs, 'add', this.fieldValuesAdded);
            this.listenTo(cfgs, 'remove', this.fieldValuesRemoved);
            this.listenTo(cfgs, 'change', this.fieldValueChanged);

            this.listenTo(this.model, 'change:enableSave', function (model, value, options) {
                var $btns = this.$el.find('.saveChanges, .cancelChanges');
                if (value) {
                    $btns.removeClass('disabledIcon');
                }
                else {
                    $btns.addClass('disabledIcon');
                }
            });
            this.listenTo(this.model.get('DocumentPackage'), 'change:saveExecuting', function (model, value, options) {
                var $saveBtn = this.$el.find('.saveChanges');
                if (value) {
                    $saveBtn.removeClass('ui-icon').addClass('throbber');
                }
                else {
                    $saveBtn.removeClass('throbber').addClass('ui-icon');
                }
            });
        }
        if (!this.showGroupName) {
            this.$el.find('.groupName').hide();
        }
        this.setFooterValues();
        return this;
    },
    renderSets: function (ro) {
        this.closeSetViews();
        var $container = this.$el.find('.customGridTable tbody');
        var i = 0;
        var length = ro.setIds.length;
        for (i; i < length; i++) {
            var setView = new DocumentMetaFieldSetView({
                model: this.model,
                setId: ro.setIds[i],
                rowNumber: i + 1,
                templateLookup: ro.templateLookup,
                columnPreference: this.colPreferences,
                augmentedCFMs: ro.augmentedCFMs,
                canDelete: this.canDelete,
                canEdit: this.canSave
            });
            $container.append(setView.render().$el);
            this.customFieldGroupSetViews.push(setView);
        }
        this.displayCustomFieldValueTaskUIData(ro);
    },
    getRenderObject: function () {
        var ro = { groupId: this.groupId, groupName: '', canDeleteGroup: false, setIds: [], headers: [], footers: [] };
        if (!this.groupPkg) {
            this.groupPkg = window.customFieldMetaGroupPackages.get(this.groupId);
        }
        ro.hideColumnSelect = this.previewMode;
        ro.hasModifyRights = this.model.hasRights(Constants.sp.Modify);
        ro.canDeleteGroup = this.canDeleteGroup && ro.hasModifyRights;
        ro.canDelete = this.canDelete && ro.hasModifyRights;
        ro.canSave = this.canSave && ro.hasModifyRights;
        ro.enableSave = this.model.get('enableSave');
        ro.groupName = this.groupPkg.get('CustomFieldGroup').Name;
        var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        var groupData = cfvs.getGroupData(this.groupId, this.sortObj, !this.previewMode);
        ro.setIds = groupData.setIds;
        ro.setIdHash = groupData.setIdHash;
        ro.templateLookup = this.groupPkg.createTemplateLookup();
        ro.allGroupFields = groupData.allFields;
        var templates = this.groupPkg.get('CustomFieldGroupTemplates');
        var defColPrefs = this.defaultColumnPreferences(templates);
        if (!this.colPreferences) {
            this.colPreferences = this.defaultColumnPreferences(templates);
        }
        var i = 0;
        var idx;
        var length = templates ? templates.length : 0;
        for (i; i < length; i++) {
            var t = templates[i];
            var metaId = t.CustomFieldMetaId;
            var meta = window.customFieldMetas.get(metaId);
            var header = Utility.safeHtmlValue(meta.get('Name'));
            var style = CustomFieldSetup.createStyleFromTemplate(t);
            if (this.colPreferences && this.colPreferences[metaId]) {
                idx = this.colPreferences[metaId].order;
                if (idx === undefined) {//If you just resize and don't reorder you will an an undefined order.
                    idx = t.Order;
                    if (idx === undefined) {
                        idx = i;
                    }
                }
                var w = this.getWidthFromPreference(metaId, this.colPreferences, defColPrefs);
                this.colPreferences[metaId] = { order: idx, width: width };
                ro.headers[idx] = { value: header, metaId: metaId, style: 'width: ' + w };
                ro.footers[idx] = { value: '', style: style, id: t.Id };
            }
        }
        ro.headerCount = ro.headers.length - (this.previewMode ? 2 : 1);
        var ctId = this.model.getDotted('DocumentPackage.Document.ContentTypeId');
        if (ctId) {
            var ct = window.contentTypes.get(ctId);
            ro.augmentedCFMs = ct ? ct.getAugmentedMetas() : [];
        } else {
            ro.augmentedCFMs = [];
        }
        this.augmentedCFMs = ro.augmentedCFMs; //Maintained for adds.
        var wfDocDataPkg = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');
        if (wfDocDataPkg) {
            ro.taskUIData = wfDocDataPkg.getTaskUIData();
            ro.taskUIDataHasFlag = wfDocDataPkg.taskUIDataHasFlag(Constants.wftf.UserCustomFieldCompare);
        }
        return ro;
    },
    defaultColumnPreferences: function (templates) {
        var defaultPrefs = {};
        var i = 0;
        var length = templates ? templates.length : 0;
        for (i; i < length; i++) {
            var t = templates[i];
            var metaId = t.CustomFieldMetaId;
            idx = t.Order;
            if (idx === undefined) {
                idx = i;
            }
            width = 100 / length;
            defaultPrefs[metaId] = { order: idx, width: width };
        }
        return defaultPrefs;
    },
    closeSetViews: function () {
        var setView = this.customFieldGroupSetViews.pop();
        while (setView) {
            setView.close();
            setView = null;
            setView = this.customFieldGroupSetViews.pop();
        }
    },
    getFooterValue: function (settings, metaId, allFieldsInGroup, callback) {
        var footerValue = '';
        var lastValue;
        var sf = function (result) {
            if (result) {
                result = Utility.safeHtmlValue(result);
            }
            Utility.executeCallback(callback, result);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            Utility.executeCallback(callback, errorThrown.Message);
        };
        if (settings.Totaled) {
            footerValue = 0;
            var i = 0;
            var length = allFieldsInGroup.length;
            for (i; i < length; i++) {
                var f = allFieldsInGroup[i];
                if (f.get('CustomFieldMetaId') === metaId && f.canBeTotaled()) {
                    lastValue = f;
                    var val = parseFloat(f.getValue());
                    if (val) {
                        footerValue += val;
                    }
                }
            }
            if (lastValue) {
                lastValue.generateDisplayValue(footerValue, { success: sf, failure: ff });
            } else {
                sf(''); // execute the callback with no result - Bug 13343
            }
        }
    },
    setFooterValues: function (index) {
        var that = this;
        var templates = this.groupPkg.get('CustomFieldGroupTemplates');
        var idx = 0;
        var length = templates.length;
        var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        var groupData = cfvs.getGroupData(this.groupId, this.sortObj, !this.previewMode);
        var cb = function (idx, result) {
            return function (result) {
                that.$el.find('tfoot td[data-footerid]').eq(idx).html(result);
            };
        };
        for (idx; idx < length; idx++) {
            var t = templates[idx];
            var metaId = t.CustomFieldMetaId;
            var settings = t.Settings ? JSON.parse(t.Settings) : {};
            this.getFooterValue(settings, metaId, groupData.allFields, cb(idx));
        }
    },
    deleteGroup: function (ev) {
        var groupId = $(ev.currentTarget).data('groupid');
        var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        cfvs.removeGroupValues(groupId);
    },
    addGroupSet: function (ev) {
        var set = this.groupPkg.createValueSet();
        var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        cfvs.add(set);
    },
    chooseColumns: function (ev) {
        var sourceFields = {};
        var selectedFields = {};
        var templates = this.groupPkg.get('CustomFieldGroupTemplates');
        var i = 0;
        var length = templates.length;
        for (i; i < length; i++) {
            var t = templates[i];
            var metaId = t.CustomFieldMetaId;
            var meta = window.customFieldMetas.get(metaId);
            sourceFields[metaId] = meta.get('Name');
            if (!this.colPreferences) {
                selectedFields[metaId] = { order: i };
            } else if (this.colPreferences[metaId]) {
                selectedFields[metaId] = this.colPreferences[metaId].order === undefined ? i : this.colPreferences[metaId].order;
            }
        }

        var that = this;
        this.columnSelectView = new ColumnSelectView({
            sourceFields: sourceFields,
            selectedFields: selectedFields,
            dialogCallbacks: {
                saveCallback: function (preference) {
                    that.columnSelectView.close();
                    that.columnSelectView = null;
                    that.onColumnsChanged(preference);
                },
                cancelCallback: function () {
                    that.columnSelectView.close();
                    that.columnSelectView = null;
                }
            }
        });
        this.columnSelectView.render();
    },
    saveChanges: function (ev) {
        if (this.$el.parents('.DocumentMetaFieldGroupsView').find('.DocumentMetaFieldSetView .' + css.warningErrorClass).length === 0) {
            this.model.set('enableSave', false);
            this.model.get('DocumentPackage').save();
        }
        else {
            ErrorHandler.addErrors(Constants.c.errorFixMessage);
        }
    },
    cancelChanges: function (ev) {
        this.model.set('enableSave', false);
        this.model.fetch(); // Re-fetch the model
    },
    enableSave: function () {
        this.model.set('enableSave', true);
    },
    fieldValuesAdded: function (model, collection, options) {
        this.enableSave();
        //Check if the added fields group is already represented. If not re-render.
        var cfgId = model.get('CustomFieldGroupId');
        var setId = model.get('SetId');
        if (cfgId && setId && this.groupId === cfgId && !this.ro.setIdHash[setId]) {
            this.render();
        }
    },
    fieldValuesRemoved: function (model, collection, options) {
        options = options || {};
        if (options.collectionRemoveInProgress) {
            return;
        }
        this.enableSave();
        //Check if the remove fields group was the last item in one of the sets, if so re-render.
        var cfgId = model.get('CustomFieldGroupId');
        var setId = model.get('SetId');
        if (cfgId && setId && this.groupId === cfgId && this.ro.setIdHash[setId]) {
            var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
            var groupData = cfvs.getGroupData(this.groupId);
            if (!groupData.setIdHash[setId]) {
                this.render();
            }
        }
    },
    fieldValueChanged: function (model, options) {
        this.enableSave();
        var cfgId = model.get('CustomFieldGroupId');
        var cfmId = model.get('CustomFieldMetaId');
        if (cfgId && cfmId && this.groupId === cfgId) {
            var t = this.ro.templateLookup[cfmId];
            var settings = t.Settings ? JSON.parse(t.Settings) : {};
            var that = this;
            var callback = function (result) {
                if (result !== '') {
                    var $footers = that.$el.find('tfoot tr td');
                    var i = 0;
                    var length = $footers.length;
                    for (i; i < length; i++) {
                        var $f = $footers.eq(i);
                        if ($f.data('footerid') === t.Id) {
                            $f.html(result);
                            break;
                        }
                    }
                }
            };
            this.getFooterValue(settings, cfmId, this.ro.allGroupFields, callback);
        }
    },

    //#region Field Group Task UI Data Handling
    displayCustomFieldValueTaskUIData: function (ro) {
        if (!ro.taskUIData || ro.taskUIData.length === 0 || !ro.taskUIDataHasFlag) {
            return;
        }

        var $container = this.$el.find('.customGridTable tbody');
        var i = 0;
        var k = 0;
        var length = 0;
        var cfMismatches = {};
        var rowIds = this.ro.setIds;
        var lineItemNumbers = rowIds.length || 1;
        var color;
        var interLeaveColors = ['#FBF9D0' /*yellow-ish*/, '#FFD76B' /*orange-ish*/, '#FFA07A' /*lightsalmon*/];
        var taskUIDatum;
        var visibleColumns = [];
        var colPref;
        for (colPref in this.colPreferences) {
            if (this.colPreferences.hasOwnProperty(colPref)) {
                var cfm = window.customFieldMetas.get(colPref) || '';
                var colName = cfm.get('Name');
                visibleColumns.push($.extend({}, this.colPreferences[colPref], { colName: colName, colId: colPref }));
            }
        }
        visibleColumns.sort(Utility.sortByProperty('order'));
        var colLength = visibleColumns.length;
        // Loop over taskUIData, finding matches/mismatches
        var setId;
        var mismatchId = 0;
        var len = ro.taskUIData.length;
        for (k = len - 1; k >= 0; k--) {
            taskUIDatum = ro.taskUIData.at(k);
            if (!taskUIDatum) { // No Task UI Data
                Utility.log('No Task UI datum');
                return;
            }
            var data = Utility.tryParseJSON(taskUIDatum.get('Data'), true);
            if (data) {
                var settings = Utility.tryParseJSON(taskUIDatum.get('Settings'), true);
                color = interLeaveColors[k % 3];
                if (settings.InlayColor) {
                    color = '#' + settings.InlayColor;
                }

                //#region Data Variables
                var cfmmSetIds = data.CustomFieldSetMisMatchSetIds;
                var dlmms = data.DataLinkMisMatches;
                var dlmmsDisplay = data.DataLinkMisMatchesDisplay;
                var dlr = data.DataLinkResult;
                var dlmmsColumns = dlmms.Columns;
                var dlmmsDisplayColumns = dlmmsDisplay.Columns;
                var dlrColumns = dlr.Columns;
                var mdlcs = data.MissingDataLinkColumns;
                var mfs = data.MissingFields;
                //#endregion

                this.datalinkMatches(cfMismatches, cfmmSetIds);
                var groupValidationSetId = Constants.UtilityConstants.GROUP_VALIDATION_SET_ID;
                length = dlmmsColumns[groupValidationSetId].length;
                i = 0;
                for (i; i < length; i++) {
                    setId = dlmmsColumns[groupValidationSetId][i];
                    var existingRowIdx = 0;
                    var rowIdx = 0;
                    var existingRowLength = this.customFieldGroupSetViews.length;
                    for (rowIdx; rowIdx < existingRowLength; rowIdx++) {
                        if (this.customFieldGroupSetViews[rowIdx] && this.customFieldGroupSetViews[rowIdx].setId === setId) {
                            existingRowIdx = rowIdx;
                        }
                    }
                    var currSetView = this.customFieldGroupSetViews[existingRowIdx];
                    var cfs = currSetView.model.getDotted('DocumentPackage.Version.CustomFieldValues');
                    var setValues = cfs.getSetValues(setId, this.colPreferences);
                    setValues = Utility.cleanArrayOfValue(setValues, undefined);

                    var colIdx = 0;
                    var cells = [];
                    for (colIdx; colIdx < colLength; colIdx++) {
                        var setValue = setValues[colIdx];
                        var style = '';
                        if (setValue) {
                            var cfmId = setValue.get('CustomFieldMetaId');
                            var template = ro.templateLookup[cfmId];
                            style = CustomFieldSetup.createStyleFromTemplate(template);
                        }
                        var col = visibleColumns[colIdx].colName;
                        var cell = { value: '', style: style };
                        if (dlmmsColumns[col]) {
                            cell.value = dlmmsColumns[col][i];
                        }
                        cells.push(cell);
                    }
                    var newSetView;
                    var $newSetViewEL;
                    if (!setId) {
                        setId = '_mismatch' + (mismatchId++);
                        newSetView = new DocumentMetaFieldSetVerifyView({
                            cells: cells,
                            setId: setId,
                            rowNumber: ''
                        });
                        $newSetViewEL = newSetView.render().$el;
                        $newSetViewEL.css({ background: color });
                        $container.append($newSetViewEL);
                    }
                    else {
                        // Obtain setValue before changing the setId
                        setId = setId + '_interleaved' + k;
                        // add the row under the matched row
                        var rowNumber = currSetView.rowNumber;
                        lineItemNumbers = rowNumber > lineItemNumbers ? rowNumber : lineItemNumbers;
                        for (colIdx = 0; colIdx < colLength; colIdx++) {
                            var sv = setValues[colIdx];
                            if (sv) {
                                var cfmName = sv.get('CustomFieldName');
                                var cellData = sv.getDisplayValue();
                                if (cellData) {
                                    if (!cells || (cells[colIdx] && cellData !== cells[colIdx].value)) {
                                        var encName = SearchUtil.indexBase64Encode(cfmName);
                                        currSetView.$el.find('[data-encodedname="' + encName + '"]').addClass('mismatch');
                                    }
                                }
                            }
                        }
                        newSetView = new DocumentMetaFieldSetVerifyView({
                            cells: cells,
                            setId: setId,
                            rowNumber: rowNumber
                        });
                        $newSetViewEL = newSetView.render().$el;
                        currSetView.$el.addClass('mismatch');
                        $newSetViewEL.css({ background: color, 'border-bottom': '2px solid #000' });
                        currSetView.$el.after($newSetViewEL);
                    }
                    this.customFieldGroupSetViews.push(newSetView);
                }
            }
        }
        i = 0;
        length = rowIds.length;
        for (i; i < length; i++) {
            var rowId = rowIds[i];
            if (!cfMismatches[rowId]) {
                // Highlight success
                color = '#FFFFFF';  //TODO: use success highlight
            }
            else {
                color = '#FFFFFF';
            }
            this.$el.find('[data-setid="' + rowId + '"]').css({ background: color });
        }
        var missingCFsErrMsg = '';
        if (mfs && mfs.length > 0) {
            missingCFsErrMsg = mfs.join(', ');
            missingCFsErrMsg = String.format(Constants.c.missingCustomFields, missingCFsErrMsg);
        }
        this.$el.find('.missingCFsErrMsgContainer').html(missingCFsErrMsg);
        var missingDLCsErrMsg = '';
        if (mdlcs && mdlcs.length > 0) {
            missingDLCsErrMsg = mdlcs.join(', ');
            missingDLCsErrMsg = String.format(Constants.c.missingDataLinkColumns, missingDLCsErrMsg);
        }
        this.$el.find('.missingDLCsErrMsgContainer').html(missingDLCsErrMsg);
        return true;
    },
    ///<summary>
    /// Determine rows that were successful
    ///</summary>
    datalinkMatches: function (cfMismatches, cfmmSetIds) {
        // Any row id that is in the grid, but not part of CustomFieldSetMisMatchSetIds is a success
        var length = cfmmSetIds.length;
        var idx = 0;
        for (idx; idx < length; idx++) {
            cfMismatches[cfmmSetIds[idx]] = true;
        }
    },
    //#endregion


    //#region CustomGridView virtual functions
    onColumnsChanged: function (preference) {
        var colPreferences = Utility.tryParseJSON(Utility.GetUserPreference('col_Pref_' + this.groupId)) || {};
        //Loop preference adding back values from exising preferences that are not specified while still dropping columns no longer displayed. (no extend).
        var id;
        for (id in preference) {
            if (preference.hasOwnProperty(id)) {
                if (colPreferences[id]) {
                    if (preference[id].width === undefined) { //if width is not specified copy from existing preference.
                        preference[id].width = colPreferences[id].width;
                    }
                    if (preference[id].order === undefined) { //if order is not specified copy from existing preference.
                        preference[id].order = colPreferences[id].order;
                    }
                }
                // If there is no width specified, set it to 100 (eg. Columns made to be visible in the column chooser don't have a specified width)
                if (preference[id].width === undefined) {
                    preference[id].width = 100;
                }
            }
        }
        var that = this;
        Utility.SetSingleUserPreference('col_Pref_' + this.groupId, JSON.stringify(preference));
        this.colPreferences = preference;
        this.render();
        this.gceResize();
    },
    onSortGrid: function (metaId) {
        if (this.sortObj && this.sortObj.metaId === metaId) {
            this.sortObj.direction = this.sortObj.direction === 'desc' ? 'asc' : 'desc';
        } else {
            this.sortObj = {
                metaId: metaId,
                direction: 'asc'
            };
        }
        Utility.SetSingleUserPreference('col_sort_' + this.groupId, JSON.stringify(this.sortObj));
        this.render();
    },
    onEdit: function (rowId, $td) {
        var i = 0;
        var length = this.customFieldGroupSetViews.length;
        var cellId = $td.data('cellid');
        for (i; i < length; i++) {
            var cfsv = this.customFieldGroupSetViews[i];
            if (cfsv.setId === rowId) {
                cfsv.render(true);
                this.focusElement(cellId, cfsv.$el);
                break;
            }
        }
    },
    onExitEdit: function (rowId, $sel) {
        var i = 0;
        var length = this.customFieldGroupSetViews.length;
        for (i; i < length; i++) {
            if (this.customFieldGroupSetViews[i].setId === rowId) {
                this.customFieldGroupSetViews[i].render();
                break;
            }
        }
    }
    //#endregion
});