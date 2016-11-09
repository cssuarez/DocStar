var SearchResultItemView = Backbone.View.extend({
    model: undefined, // SearchableEntityCPX
    className: 'SearchResultItemView',
    ignoreSelectedEvent: false,
    inEditMode: false,
    tagName: 'tr',
    modelId: undefined,
    colPreferences: undefined,
    enterEditModeFunc: undefined,
    exitEditModeFunc: undefined,
    cellClickFunc: undefined,
    regionMode: false,
    progUpdt: false,
    numCols: 0, // number of columns displayed
    events: {
        'input input[type="text"]': 'textChanged',
        'change input[type="text"]': 'textChanged',
        'input input.isCombo, input.Autocomplete': 'textChanged',
        'change input.isCombo, input.Autocomplete': 'textChanged',
        'change input[type="checkbox"]:not(.selectedItem)': 'boolChanged',
        'input input[type="number"]': 'numberChanged',
        'input input[type="decimal"]': 'numberChanged',
        'change select': 'selectChanged',
        'input input[type="date"]': 'dateChanged',
        'input input[type="datetime"]': 'datetimeChanged',
        'change input[type="date"]': 'dateChanged', //Change needed for date pickers.
        'change input[type="datetime"]': 'datetimeChanged',//Change needed for date pickers.
        'click .saveRow': 'saveRow',
        'click .cancelSave': 'cancelSave',
        'click .editRow': 'editRow',
        'click input.selectedItem': 'selectionChanged',
        'click .subgridExpand': 'toggleSubGrid',
        'change .ui-combobox input': 'comboboxChanged'
    },
    initialize: function (options) {
        this.compiledTemplate = Templates.getCompiled('searchresultitemviewlayout');
        this.colPreferences = options.columnPreference;
        this.cellClickFunc = options.cellClickFunc || function () { };
        this.enterEditModeFunc = options.enterEditModeFunc || function () { };
        this.exitEditModeFunc = options.exitEditModeFunc || function () { };
        this.regionMode = options.regionMode;
        this.resizeFunc = options.resizeFunc || function () { };
        this.modelId = this.model.get('Id');
        this.$el.data('rowid', this.modelId);
        this.listenTo(this.model, 'change', this.modelChanged);
        this.listenTo(this.model, 'sync', this.modelSync);
        this.listenTo(this.model, 'change:subGridExpanded', this.renderSubGrid);
        this.listenTo(window.userPreferences, 'change', function (model, value, options) {
            var key = model.get('Key');
            if (key === 'workflowWatches') {
                this.setWatchHighlight();
            }
        });
        this.listenTo(window.userPreferences, 'reset', function (collection, options) {
            this.setWatchHighlight();
        });
        if (window.folders && !this.regionMode) {
            this.listenTo(window.folders, 'add remove reset', this.renderFoldersCell);
            this.listenTo(window.folders, 'change:Path', this.renderFoldersCell);
        }
        return this;
    },
    render: function (editMode, selectedCellId) {
        this.inEditMode = editMode;
        var ro = this.getRenderObject(editMode);
        this.$el.html(this.compiledTemplate(ro));
        this.setWatchHighlight();
        if (ro.selected) {
            this.$el.addClass('customGridHighlight');
        } else {
            this.$el.removeClass('customGridHighlight');
        }
        var that = this;
        if (editMode) {
            var inputs = this.$el.find('input').filter('[type="datetime"],[type="date"]');
            var i = 0;
            var length = inputs.length;
            for (i; i < length; i++) {
                Utility.addDatePicker(inputs[i]);
            }
            CustomFieldSetup.setupAutocompletes(this.$el.find('.Autocomplete'));
            var $elements = this.$el.find('select');
            CustomFieldSetup.loadSelect($elements);
            this.$el.find('input[type="number"]').numeric({ decimal: false });
            this.$el.find('input[type="decimal"]').numeric();
            // selectedCellId won't be provdided when clicking the 'edit' icon for the row
            if (!selectedCellId) {
                var $editElm = this.$el.find('input:not([type="checkbox"]),textarea,select').filter(':visible').first();
                $editElm.focus();
                $editElm.select();
            }
        }
        this.renderApprovals();

        if (ro.subGridExpanded) {
            // Wait until this has been rendered to trigger the subgrid expansion
            setTimeout(function () {
                if ((!that.dvSubgridView || (that.dvSubgridView && !that.dvSubgridView.$el.is(':visible'))) ||
                  (!that.cfgSubgridView || (that.cfgSubgridView && !that.cfgSubgridView.$el.is(':visible')))) {
                    that.toggleSubGrid(null, true);
                }
            }, 4);
        }
        return this;
    },
    getRenderObject: function (editMode) {
        var ro = {
            cells: [],
            selected: this.model.isSelected(),
            toolTip: this.model.getSelectedTT(),
            hasSubGrid: this.model.hasDraft() || this.model.hasVersions() || this.model.hasGroupValues(),
            subGridExpanded: this.model.get('subGridExpanded'),
            canEdit: this.model.hasRights(Constants.sp.Modify),
            typeClass: this.model.getTypeClass(),
            inEditMode: editMode,
            regionMode: this.regionMode
        };
        var i = 0;
        var cp;
        var j = 0;
        var length = Object.keys(this.colPreferences).length;
        for (cp in this.colPreferences) {
            if (this.colPreferences.hasOwnProperty(cp)) {
                var values = [];
                var cpFieldExists = true; // used to prevent execution of code when the field is not found to be part of the site, but is part of the users preference
                if (cp === Constants.UtilityConstants.APPROVALS) {
                    this.setupApprovals();
                }
                else if (!window.databaseFields.get(cp)) {
                    // Case: When field exists on one site, but not on another Site.
                    j++;
                    cpFieldExists = false;
                }
                else {
                    values = this.model.getValuesByField(cp, !editMode);
                }
                // Don't execute if the user preference contains a field that doesn't exist as part of the current site.
                if (cpFieldExists) {
                    var idx = this.colPreferences[cp].order;
                    if (idx === undefined) {
                        idx = i++; //If you just resize and don't reorder you will have an undefined order.
                    }
                    else {
                        idx = idx - j;
                    }
                    var width = this.colPreferences[cp].width;
                    if (!width) {
                        width = 100 / length;
                    }
                    if (!editMode) {
                        values = [Utility.safeHtmlValue(values.join(', '))];
                    }
                    else {
                        if (this.model.get('Type') === Constants.et.Document && ro.canEdit) {
                            values = this.getFieldEditObject(cp, values);
                        }
                        else {
                            if (cp === Constants.UtilityConstants.SF_TITLE && ro.canEdit) {   //Inboxes and Folders: Only the title is editable.
                                values = this.getFieldEditObject(cp, values);
                            }
                            else {
                                values = [Utility.safeHtmlValue(values.join(', '))];
                            }
                        }
                    }
                    ro.cells[idx] = { values: values, valueId: cp };
                }
            }
        }
        this.numCols = ro.cells.length;
        return ro;
    },
    setWatchHighlight: function () {
        var color = false;
        // Highlight based on whether or not a watch dictates this row to be highlighted
        var watches = new Watches();
        watches.fetch();
        if (watches) {
            var idx = 0;
            var watchesLength = watches.length;
            for (idx; idx < watchesLength; idx++) {
                var watch = watches.at(idx).toJSON();
                var cfId = watch.CustomFieldId;
                if (cfId) {
                    var grouping = watch.Grouping;
                    var isTrue = watch.IsTrue;
                    // Compare watch to row data's custom field value
                    var cfMeta = window.customFieldMetas.get(cfId);
                    var cfValue;
                    if (cfMeta) {
                        cfValue = this.model.getValuesByField(cfId);
                    }
                    var cfValIdx = 0;
                    var cfValLen = cfValue ? cfValue.length : 0;
                    var canSetColor = false;
                    var isAny = grouping === 'any';
                    var isAll = grouping === 'all';
                    var val;
                    for (cfValIdx; cfValIdx < cfValLen; cfValIdx++) {
                        val = cfValue[cfValIdx];
                        val = Utility.convertToBool(val);
                        if (isAll) {   // All values have to match the isTrue property to be highlighted
                            if (val === isTrue) {
                                canSetColor = true;
                            }
                            else {
                                canSetColor = false;
                                break;
                            }
                        }
                        else if (isAny) {  // Only one has to match the isTrue property to be highlighted
                            if (val === isTrue || (!val && !isTrue)) {
                                canSetColor = true;
                                break;
                            }
                        }
                    }
                    if (canSetColor) {  // return the color of the first watch that allows setting of color
                        color = watch.Color;
                        break;
                    }
                }
            }
        }
        // Remove each of the highlights, then re-add the fields highlight
        this.$el.removeClass('watchHighlight_ffffaa');
        this.$el.removeClass('watchHighlight_d4ffaa');
        this.$el.removeClass('watchHighlight_aaffaa');
        this.$el.removeClass('watchHighlight_aaffff');
        this.$el.removeClass('watchHighlight_aad4ff');
        this.$el.removeClass('watchHighlight_aaaaff');
        this.$el.removeClass('watchHighlight_d4aaff');
        this.$el.removeClass('watchHighlight_ffaaff');
        this.$el.removeClass('watchHighlight_ffaad4');
        if (color) {
            // Highlight the row based on the watch highlight color, if it exists
            this.$el.addClass('watchHighlight');
            this.$el.addClass('watchHighlight_' + color);
        }
        else {
            this.$el.removeClass('watchHighlight');
        }
    },
    closeAppDisplay: function () {
        if (this.appDisplayView) {
            this.appDisplayView.close();
        }
    },
    closeSubGrids: function () {
        if (this.dvSubgridView) {
            this.dvSubgridView.close();
        }
        if (this.cfgSubgridView) {
            this.cfgSubgridView.close();
        }
    },
    close: function () {
        this.closeSubGrids();
        this.closeAppDisplay();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getFieldEditObject: function (field, values, mixedCTs, multiSelect) {
        var results = [];
        var ct;
        var i = 0;
        var length = values.length;
        var co = { attrs: { 'data-backingstoreid': field, 'data-backingstorevalueid': 0 } };
        var ctId = this.model.get('ContentTypeId');
        if (Utility.containsGuid(field)) { // apply field augmentation per contenttype unless mixed content types are being edited            
            var augCFM;
            ct = window.contentTypes.get(ctId);
            if (ct && !mixedCTs) {
                augCFM = ct.getAugmentedMeta(field);
            } else {
                augCFM = window.customFieldMetas.get(field).toJSON();
            }
            for (i; i < length; i++) {
                results.push(CustomFieldSetup.getEditableElement(i, values[i], augCFM));
            }
        } else {
            var uc = Constants.UtilityConstants;
            var id;
            switch (field) {
                case uc.SF_TITLE:
                case uc.SF_KEYWORDS:
                    results.push(Utility.safeHtmlValue(values[0], $.extend(true, co, { tag: 'input', attrs: { 'type': 'text' } })));
                    break;
                case uc.SF_CONTENTTYPE_ID:
                    var cts = window.contentTypes.getViewable(!mixedCTs && ctId); //  getViewable() includes "(hidden)" only if homogenous collection of contentTypes are represented
                    results.push(this.generateSelect(cts, values[0], field, multiSelect, true)); // generateSelect won't have to add (hidden) because cts will include it if needed; exclude blank
                    break;
                case uc.SF_SECURITYCLASS_ID:
                    results.push(this.generateSelect(window.slimSecurityClasses, values[0], field, multiSelect)); // don't show (hidden) if more than one item selected
                    break;
                case uc.DF_INBOXID:
                    results.push(this.generateSelect(window.slimInboxes, values[0], field, multiSelect));
                    break;
                case uc.DF_RECORDCATEGORYID:
                    results.push(this.generateSelect(window.slimRecordCategories, values[0], field, multiSelect));
                    break;
                case uc.DUEDATE:
                case uc.DF_CUTOFF_DATE:
                    results.push(Utility.safeHtmlValue(values[0], $.extend(true, co, { tag: 'input', attrs: { 'type': 'datetime', 'displayClearButton': true } })));
                    break;
                case uc.DF_PRIORITY:
                    var select = document.createElement('select');
                    select.setAttribute('data-backingstoreid', field);
                    select.setAttribute('data-backingstorevalueid', 0);
                    for (id in Constants.pl) {
                        if (Constants.pl.hasOwnProperty(id)) {
                            var option = document.createElement('option');
                            option.value = Constants.pl[id];
                            option.text = Constants.c['pl_' + id];
                            if (id === values[0]) {
                                option.setAttribute('selected', 'selected');
                            }
                            select.appendChild(option);
                        }
                    }
                    var container = document.createElement('div');
                    container.appendChild(select);
                    results.push(container.innerHTML);
                    break;
                default:
                    results.push(Utility.safeHtmlValue(values.join(', ')));
                    break;

            }
        }

        return results;
    },
    generateSelect: function (collection, selectedId, backingStoreId, dontAddHidden, excludeBlankOption) {
        var select = document.createElement('select');
        select.setAttribute('data-backingstoreid', backingStoreId);
        select.setAttribute('data-backingstorevalueid', 0);
        var option;
        if (!excludeBlankOption) {
            option = document.createElement('option');
            option.text = ' ';
            select.appendChild(option);
        }
        var selectedFound = false;
        var i = 0;
        var length = collection.length;
        for (i; i < length; i++) {
            var item = collection.at(i);
            option = document.createElement('option');
            option.value = item.get('Id');
            option.text = item.get('Name');
            if (item.get('Id') === selectedId) {
                option.setAttribute('selected', 'selected');
                selectedFound = true;
            }
            select.appendChild(option);
        }
        if (selectedId && !selectedFound && !dontAddHidden) {
            option = document.createElement('option');
            option.value = selectedId;
            option.text = Constants.c.hidden;
            option.setAttribute('selected', 'selected');
            select.appendChild(option);
        }
        var container = document.createElement('div');
        container.appendChild(select);
        return container.innerHTML;
    },
    selectedChanged: function (model, options) {
        if (this.ignoreSelectedEvent) {
            return;
        }
        this.render();
    },
    saveRow: function (e) {
        var that = this;
        var $td = this.$el.find('td');
        this.model.save(undefined, { triggerMassUpdate: true, success: function () { that.exitEditModeFunc($td[0]); } });
        e.stopPropagation(); //Don't propegate the event to the TD above which is also listening for a click event.
        return false;
    },
    cancelSave: function (e) {
        this.model.revertChanges();
        this.exitEditModeFunc();
        if (e) {
            e.stopPropagation(); //Don't propegate the event to the TD above which is also listening for a click event.
        }
        return false;
    },
    editRow: function (e) {
        this.ignoreSelectedEvent = true; //Ignoreing selected event, we will rerender instead on edit.
        var $td = this.$el.find('td');
        this.cellClickFunc($td[0], true);
        this.ignoreSelectedEvent = false;
        e.stopPropagation(); //Don't propegate the event to the TD above which is also listening for a click event.
        return false;
    },
    modelChanged: function (m, o) {
        if (this.model.suspendChangeRender) {
            return;
        }
        if (m && m.changed) {
            if (m.changed.isSelected !== undefined) {
                this.selectedChanged(m, o);
            }
            else if (!this.progUpdt && !this.ignoreSelectedEvent) {
                this.render(this.inEditMode);
            }
        }
    },
    modelSync: function () {
        this.exitEditModeFunc();
        this.render();
    },
    selectionChanged: function (e) {
        if (e.shiftKey) {
            // let cellclick perform the selection;
            return;
        }
        var selected = $(e.currentTarget).is(':checked');
        this.model.setSelected(selected, this.model.collection.getHighestSequence() + 1);
        e.stopPropagation(); //Don't propegate the event to the TD above which is also listening for a click event.
        return false;
    },
    toggleSubGrid: function (ev, defaultVal) {
        var expandSubGrid;
        var isExpanded = this.model.get('subGridExpanded');
        if (defaultVal === undefined || defaultVal === null) {
            expandSubGrid = !isExpanded;
        } else {
            expandSubGrid = defaultVal;
        }
        // select document only if subgridIcon clicked  
        if (!isExpanded && ev) {
            // Determine if the document will be displaying a versioning subgrid, if so do NOT preview the main grids document
            var hasVersionGrid = this.model.hasVersions() || this.model.hasDraft();
            this.model.setSelected(true, this.model.collection.getHighestSequence() + 1, { previewSelected: !hasVersionGrid });
        }
        this.model.set('subGridExpanded', expandSubGrid, { silent: true });
        this.model.trigger('change:subGridExpanded', this.model, expandSubGrid);
    },
    renderSubGrid: function (model, value, options) {
        this.closeSubGrids();
        var that = this;
        // Display Versioning
        var changeExpandArrow = false;
        if (value) {
            if (this.model.hasVersions() || this.model.hasDraft()) {
                changeExpandArrow = true;
                this.dvSubgridView = new SearchResultVersioningSubgridView({
                    model: this.model,
                    numColsToIndent: 3,
                    numColsToSpan: this.numCols + 1
                });
                this.$el.after(this.dvSubgridView.render().$el); // Append subgrid as a new row after this row
            }

            // Custom field groups will appear above versioning grids, due to appending after this.$el
            // If the order needs to change just move the below if block before the versioning if block above
            if (this.model.hasGroupValues()) {
                changeExpandArrow = true;
                this.cfgSubgridView = new SearchResultCustomFieldGroupSubgridView({
                    model: this.model,
                    numColsToIndent: 3,
                    numColsToSpan: this.numCols + 1
                });
                this.$el.after(this.cfgSubgridView.render().$el);
            }
            if (changeExpandArrow) {
                this.$el.find('.subgridExpand').removeClass('ui-icon-triangle-1-e').addClass('ui-icon-triangle-1-s');
            }
        }
        else {
            this.$el.find('.subgridExpand').removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-e');
        }
        this.resizeFunc();//Not a window resize but still causes ui elements to resize.
    },
    renderFoldersCell: function () {
        // Re-render folders column
        var cp = Constants.UtilityConstants.DF_FOLDERID;
        var $td = this.$el.find('td[data-cellid="' + cp + '"]');
        var vbfs = this.model.getValuesByField(cp);
        $td.find('.valueContainer').html([Utility.safeHtmlValue(vbfs.join(', '))]);
    },
    setupApprovals: function () {
        this.closeAppDisplay();
        this.appDisplayView = new AppDisplayView({ model: this.model });
    },
    renderApprovals: function () {
        if (!this.appDisplayView) {
            return;
        }
        this.$el.find('[data-cellid="' + Constants.UtilityConstants.APPROVALS + '"]').append(this.appDisplayView.render().$el);
    },
    //#region Push events from Form into Model.
    updateModel: function ($sel, value) {
        if (this.progUpdt) {
            return;
        }
        this.progUpdt = true;
        this.model.updateBackingStore({
            storeId: $sel.data('backingstoreid'),
            valueIndex: $sel.data('backingstorevalueid'),
            value: value
        });
        this.progUpdt = false;
    },
    datePickerClose: function (dateText, inst) {
        if (dateText) {
            var $input = inst.input;
            if ($input.attr('type') === 'date') {
                dateText = new Date(dateText).format('generalDateOnly');
            }
            $input.attr('value', dateText);
            $input.val(dateText);
        }
    },
    textChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, $sel.val());
    },
    boolChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, $sel.is(':checked'));
    },
    radioChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, $sel.val());
    },
    numberChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, $sel.val());
    },
    selectChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        var $option = $sel.find(':selected');
        this.updateModel($sel, $option.val());
    },
    dateChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, $sel.val());
    },
    datetimeChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, $sel.val());
    },
    comboboxChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, $sel.val());
    }
    //#endregion
});