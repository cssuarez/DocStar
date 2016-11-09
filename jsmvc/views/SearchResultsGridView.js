var SearchResultsGridView = CustomGridView.extend({
    model: undefined, // SearchResultsCPX
    className: 'SearchResultsGridView',
    prefKeyPrefix: '',
    editingView: undefined,
    colPreferences: undefined,
    searchResultsMenuView: undefined,
    searchResultsGridFooterView: undefined,
    columnSelectView: undefined,
    resultViews: undefined,
    regionMode: false,
    resizeMe: true, //Override CustomGridView value.
    resizeOnDocumentViewResize: true,
    defaultColumns: undefined, // Object containing overrides for default column orders/widths
    events: {
        'change .maxResultsContainer .maxResults': 'refreshGrid',
        'keyup .maxResultsContainer .maxResults': 'changeMaxResults',
        'click .column_chooser': 'chooseColumns'  //list action
    },
    initialize: function (options) {
        //NOTE: Model passed in from parent view (eg SearchView).
        this.compiledTemplate = doT.template(Templates.get('searchresultsgridviewlayout'));
        this.prefKeyPrefix = options.prefKeyPrefix;
        this.menuViewOptions = options.menuViewOptions;
        this.showGridRefresh = options.showGridRefresh;
        this.hideNonGridColumnChooser = options.hideNonGridColumnChooser;
        this.regionMode = options.regionMode;
        this.triggerRefreshOnMaxRowsChange = options.triggerRefreshOnMaxRowsChange;
        this.colPreferences = Utility.tryParseJSON(Utility.GetUserPreference(this.prefKeyPrefix + 'col_Pref'));
        this.defaultColumns = options.defaultColumns;
        this.initializeGrid({ slowClickEdit: true });
        this.resultViews = [];
        this.listenTo(this.model, 'sync', this.modelSync);
        // model reset event - NOT for a collection
        this.listenTo(this.model, 'reset', function (model, options) {
            options = options || {};
            if (!options.ignoreReset) {
                this.render();
            }
        });
        var that = this;
        if (window.customFieldMetas) {
            this.listenTo(window.customFieldMetas, 'remove', function (model, value, options) {
                var sr = this.model.get('Request');
                if (sr.get('SortBy') === model.get('Name')) {
                    sr.set('SortBy', 'Title');
                }

                var cfmId = model.get('Id');
                if (that.colPreferences[cfmId]) {
                    var order = parseInt(that.colPreferences[cfmId].order, 10);
                    delete that.colPreferences[cfmId];
                    var cp;
                    for (cp in that.colPreferences) {
                        if (that.colPreferences.hasOwnProperty(cp)) {
                            if (that.colPreferences[cp].order > order) {
                                that.colPreferences[cp].order--;
                            }
                        }
                    }
                    that.onColumnsChanged(that.colPreferences);
                }
            });
        }
        return this;
    },
    render: function (options) {
        var ro = this.getRenderObject(options);
        this.$el.html(this.compiledTemplate(ro));
        this.renderGrid();
        var $srm = this.$el.find('.searchResultsMenu');
        this.closeMenuView();
        if (!this.regionMode) {
            this.searchResultsMenuView = new SearchResultsMenuView(this.getMenuViewOptions());
            $srm.append(this.searchResultsMenuView.render().$el);
            this.$el.find('.maxResults').numeric({ negative: false, decimal: false });
        }
        this.renderResultViews(ro);
        if (this.searchResultsGridFooterView) {
            this.searchResultsGridFooterView.close();
            this.searchResultsGridFooterView = null;
        }
        this.searchResultsGridFooterView = new SearchResultsGridFooterView({ searchResultsGridView: this, headers: ro.headers });
        this.$el.find('.customGridTable tfoot').html(this.searchResultsGridFooterView.render().$el);
        this.$el.find('.navigateToPage').numeric({ negative: false, decimal: false });
        return this;
    },
    renderResultViews: function (ro) {
        this.closeResultViews();
        var $container = this.$el.find('.customGridTable tbody');
        var results = this.model.get('Results');
        if (!results) {
            return;
        }
        var that = this;
        var enterFunc = function (e) {
            var event = new $.Event();
            event.currentTarget = e;
            that.enterEditMode(event);
        };
        var exitFunc = function () {
            that.exitEditMode();
        };
        var clickFunc = function (e, cae) {
            var event = new $.Event();
            event.currentTarget = e;
            that.cellClick(event, cae);
        };
        var resizeFunc = function () {
            that.gceResize();
        };
        var i = 0;
        var length = results.length;
        for (i; i < length; i++) {
            var srView = new SearchResultItemView({
                model: results.at(i),
                columnPreference: this.colPreferences,
                cellClickFunc: clickFunc,
                enterEditModeFunc: enterFunc,
                exitEditModeFunc: exitFunc,
                regionMode: this.regionMode,
                resizeFunc: resizeFunc
            });
            $container.append(srView.render().$el);
            this.resultViews.push(srView);
        }
        if (results.length > 0 && results.getSelected().length === 0) {
            var autoSelectFirstDocPrefs = Utility.getAutoSelectFirstDocPreferences();
            if ((this.prefKeyPrefix === "search" && autoSelectFirstDocPrefs.autoSelectFirstDocRetrive === true) || ((this.prefKeyPrefix === "wfItems" || this.prefKeyPrefix === "arItems") && autoSelectFirstDocPrefs.autoSelectFirstDocWorkFlow === true)) {
                var ids = [];
                ids.push(results.at(0).get('Id'));
                this.model.get('Results').setSelected(ids, { ignoreSelection: ro.ignoreSelection });
            }
        }
        //Append an empty row to the end of the list, this will be used to fill the remaining space.
        var tr = document.createElement('tr');
        tr.setAttribute('class', 'emptyGridRow');
        var td = document.createElement('td');
        td.setAttribute('colspan', ro.headers.length + 4);
        tr.appendChild(td);
        $container.append(tr);

        // Only if viewing the folders column
        if (this.colPreferences[Constants.UtilityConstants.DF_FOLDERID]) {
            this.model.getFoldersWithPaths();
        }
    },
    close: function () {
        this.closeMenuView();
        this.closeSubGrids();
        this.closeResultViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    closeMenuView: function () {
        if (this.searchResultsMenuView) {
            this.searchResultsMenuView.close();
            this.searchResultsMenuView = null;
        }
    },
    closeResultViews: function () {
        var rv = this.resultViews.pop();
        while (rv) {
            rv.close();
            rv = undefined;
            rv = this.resultViews.pop();
        }
    },
    closeSubGrids: function () {
        if (this.versioningSubGridView) {
            this.versioningSubGridView.close();
        }
        if (this.customFieldGroupsSubGridView) {
            this.customFieldGroupsSubGridView.close();
        }
    },
    getRenderObject: function (options) {
        options = options || {};
        var results = this.model.get('Results');
        var ro = {
            maxResults: this.model.getDotted('Request.MaxRows'),
            allSelected: results ? results.areAllSelected() : false,
            headers: [],
            regionMode: this.regionMode
        };
        //NOTE: Selection, Subgrid Expander, Edit and Type are all added in the template, the column preferences are just user selectable columns.
        var defColPrefs = this.defaultColumnPreferences();
        if (!this.colPreferences) {
            this.colPreferences = this.defaultColumnPreferences();
        }
        var uc = Constants.UtilityConstants;
        var length = Object.keys(this.colPreferences).length;
        var cp;
        var i = 0;
        var j = 0;
        for (cp in this.colPreferences) {
            if (this.colPreferences.hasOwnProperty(cp)) {
                var name;
                var cpFieldExists = true; // used to prevent execution of code when the field is not found to be part of the site, but is part of the users preference
                var df = window.databaseFields.get(cp);
                if (df) {
                    name = Utility.safeHtmlValue(df.get('DisplayName'));
                }
                else if (cp === Constants.UtilityConstants.APPROVALS) {
                    name = Constants.t('approvals');
                }
                else {
                    // Case: When field exists on one site, but not on another Site.
                    j++;
                    cpFieldExists = false;
                }
                // Don't execute if the user preference contains a field that doesn't exist as part of the current site.
                if (cpFieldExists) {
                    var idx = this.colPreferences[cp].order;
                    if (idx === undefined) {
                        idx = i++; //If you just resize and don't reorder you will an an undefined order.
                    } else {
                        idx = idx - j;  // reduce the order by the number of items found to not exist, so the proper order is obtained.
                    }
                    var w = this.getWidthFromPreference(cp, this.colPreferences, defColPrefs);
                    var isEditable = !this.regionMode && (Utility.containsGuid(cp) || cp === uc.SF_TITLE || cp === uc.SF_KEYWORDS || cp === uc.SF_CONTENTTYPE_ID || cp === uc.SF_SECURITYCLASS_ID || cp === uc.DF_INBOXID || cp === uc.DF_RECORDCATEGORYID || cp === uc.DF_PRIORITY || cp === uc.DUEDATE || cp === uc.DF_CUTOFF_DATE) && Utility.checkGP(window.gatewayPermissions, Constants.gp.Edit_Columns);
                    ro.headers[idx] = { value: name, colId: cp, hasColumnEdit: isEditable, style: 'width: ' + w };
                }
            }
        }
        ro.hideNonGridColumnChooser = this.hideNonGridColumnChooser;
        ro.ignoreSelection = !!options.ignoreSelection;
        return ro;
    },
    getMenuViewOptions: function () {
        var opts = {
            model: this.model,
            showExportToCSVOption: true,
            showMergeOption: true,
            showMoveToOption: true,
            showRecordsManagementOption: true,
            showAllRemoveOptions: true,
            showRequestApprovalOption: true,
            showWatchOption: true
        };
        if (this.menuViewOptions) {
            opts = this.menuViewOptions;
        }
        opts.model = this.model;
        return opts;
    },
    defaultColumnPreferences: function () {
        if (this.defaultColumns) {
            return this.defaultColumns;
        }
        var p = {
            title: { order: 0, width: 25 },
            created: { order: 1, width: 25 },
            modified: { order: 2, width: 25 },
            keywords: { order: 3, width: 25 }
        };
        return p;
    },
    changeMaxResults: function (e) {
        var maxResults = parseInt($(e.currentTarget).val(), 10);
        maxResults = InputUtil.textRangeCheck(1, 1000, maxResults);
        $('#maxResults').val(maxResults);
        this.model.setDotted('Request.MaxRows', maxResults);
        if (e.which === 13) {
            this.refreshGrid();
        }
    },
    chooseColumns: function (e) {
        var sourceFields = {};
        var selectedFields = {};
        var i = 0;
        var length = window.databaseFields.length;
        if (!this.colPreferences) {
            this.colPreferences = this.defaultColumnPreferences();
        }
        for (i; i < length; i++) {
            var df = window.databaseFields.at(i);
            if (!df.get('NonIndexed')) {
                var id = df.get('Id');
                sourceFields[id] = df.get('DisplayName');
                if (this.colPreferences[id]) {
                    selectedFields[id] = this.colPreferences[id].order === undefined ? i : this.colPreferences[id].order;
                }
            }
        }
        // Add in appDisplay column (ie. 'Approvals')
        var appDisplayId = Constants.UtilityConstants.APPROVALS;
        sourceFields[appDisplayId] = Constants.t('approvals');
        if (this.colPreferences[appDisplayId]) {
            selectedFields[appDisplayId] = this.colPreferences[appDisplayId].order === undefined ? i : this.colPreferences[appDisplayId].order;
        }
        var that = this;
        if (this.columnSelectView) {
            this.columnSelectView.close();
            this.columnSelectView = null;
        }
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
    onColumnEdit: function (columnId, $th) {
        var selected = this.model.get('Results').getSelected();
        if (selected.length > 0) {
            var name;
            var actualName = '';
            var type = "";
            var df = window.databaseFields.get(columnId);
            if (df) {
                name = Utility.safeHtmlValue(df.get('DisplayName'));
                actualName = df.get('ActualName');
                type = df.get('Type');
            }

            // check for common content type among all selected
            var mixedCTs = false;
            var ctId = selected[0].get('ContentTypeId');
            var length = selected.length;
            var i = 1; // skip 0
            for (i; i < length; i++) {
                if (selected[i].get('ContentTypeId') !== ctId) {
                    mixedCTs = true;
                    break;
                }
            }
            // use first selected item to get field edit object, recognizing when content types are mixed
            var editString = '<div class="searchColumnEdit">';
            i = 0;
            length = this.resultViews.length;
            for (i; i < length; i++) {
                if (this.resultViews[i].model === selected[0]) {
                    editString += this.resultViews[i].getFieldEditObject(columnId, [''], mixedCTs, selected.length > 1);
                    break;
                }
            }
            editString += '</div>';
            var $dlg;
            var that = this;
            var okFunc = function (cleanupFunc) {
                var $editElements = $dlg.find('.searchColumnEdit input, .searchColumnEdit select');
                if ($dlg.find('.searchColumnEdit .isCombo').length > 0) {
                    $editElements = $dlg.find('.searchColumnEdit .isCombo');
                }
                var cleanUp = function (failed) {
                    if (failed) { DialogsUtil.cleanupDialog($dlg, undefined, true); }
                    else { Utility.executeCallback(cleanupFunc); }
                };
                var value = that.applyColumnEdit(cleanUp, selected, columnId, $editElements);
            };
            var addDateTimePicker = function () {
                var inputs = $dlg.find('input').filter('[type="datetime"],[type="date"]');
                var i = 0;
                var length = inputs.length;
                for (i; i < length; i++) {
                    Utility.addDatePicker(inputs[i]);
                }

            };
            var options = {
                autoOpen: false,
                title: Constants.c.editColumn + ' ' + name,
                height: 130,
                resizable: false,
                modal: true,
                open: function () {
                    addDateTimePicker();
                    $dlg.find('input[type="number"]').numeric({ decimal: false });
                    $dlg.find('input[type="decimal"]').numeric();
                    var listItems = $dlg.find('select');
                    var length = listItems.length;
                    if (listItems && length > 0) {
                        CustomFieldSetup.loadSelect(listItems);
                    }
                    var validateMethod = function (e) {
                        that.validateInput({
                            input: e.currentTarget,
                            index: actualName,
                            value: $(e.currentTarget).val(),
                            type: type,
                            onError: function (message) {
                                Utility.disableButtons([Constants.c.ok]);
                                ErrorHandler.addErrors({ 'error': message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'div', 'id');
                            },
                            onSuccess: function () {
                                Utility.enableButtons([Constants.c.ok]);
                                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                            }
                        });
                    };
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    $dlg.off('keyup change', 'input, textarea').on('keyup change', 'input, textarea', validateMethod);
                },
                close: function () {
                    $dlg.off('keyup change', 'input, textarea');
                },
                html: editString
            };
            $dlg = DialogsUtil.generalPromptDialog('', okFunc, null, options);
            $dlg.dialog('open');
            this.exitEditMode();
        }
    },
    applyColumnEdit: function (cleanupFunc, selected, columnId, $editElements) {
        var values = [];
        if ($editElements[0].tagName === 'SELECT') {
            $editElements = $editElements.find('option:selected');
        }
        var i = 0;
        var length = $editElements.length;
        for (i; i < length; i++) {
            if ($editElements.eq(i).attr('type') === 'checkbox') {
                values.push($editElements.eq(i).is(":checked"));
            } else {
                values.push($editElements.eq(i).val());
            }
        }
        i = 0;
        length = selected.length;
        var sfo = { field: columnId, values: values };
        var updPkgs = [];
        var field = window.databaseFields.get(columnId);
        var actName = field.get('ActualName');
        for (i; i < length; i++) {
            var se = selected[i];
            if (se.get('Type') === Constants.et.Document) {
                updPkgs.push(se.toSlimUpdatePackage(sfo));
            } else if (actName === Constants.UtilityConstants.SF_TITLE) {
                se.set('Title', values[0]);
                se.save(null, { triggerMassUpdate: false }); //Folders and inboxes saved individually, only title edits allowed.
            }
        }
        var ids = this.model.get('Results').getEntityIds({ includeDocIds: true, includeInboxIds: true, includeFolderIds: true });
        var docProxy = DocumentServiceProxy({ skipStringifyWcf: true });
        var sf = function (result) {
            // Always refetch every item that was modified 
            $('body').trigger('MassDocumentUpdated', { ids: ids.searchableIds, callback: cleanupFunc }); //Notify listeners that the meta has been updated.
        };
        var ff = function (xhr, status, err) {
            ErrorHandler.popUpMessage(err);
            cleanupFunc(true);
        };
        docProxy.updateManySlim(updPkgs, sf, ff);
    },
    modelSync: function (model, resp, options) {
        //Cleanup Last Selection
        this.lastClick = undefined;
        this.exitEditMode();
        //Then re-render.
        this.render(options);
    },
    refreshGrid: function (ev) {
        var $targ;
        if (ev) {
            $targ = $(ev.currentTarget);
        }
        if ($targ && $targ.hasClass('maxResults') && !this.triggerRefreshOnMaxRowsChange) {
            return;
        }
        var sr = this.model.get('Request');
        sr.set({
            ResultId: undefined,
            Start: 0
        });//Remove prior search result, and set to initial page
        this.model.fetch();
    },
    //#region CustomGridView virtual functions
    onColumnsChanged: function (preference) {
        var colPreferences = Utility.tryParseJSON(Utility.GetUserPreference(this.prefKeyPrefix + 'col_Pref')) || {};
        //Loop preference adding back values from exising preferences that are not specified while still dropping columns no longer displayed. (no extend).
        var id;
        for (id in preference) {
            if (preference.hasOwnProperty(id)) {
                if (colPreferences[id]) {
                    if (preference[id].width === undefined || (!preference[id].changed && colPreferences[id].width)) { //if width is not specified copy from existing preference.
                        preference[id].width = colPreferences[id].width;
                    }
                    if (preference[id].order === undefined) { //if order is not specified copy from existing preference.
                        preference[id].order = colPreferences[id].order;
                    }
                    if (preference[id].changed === undefined) { //if changed is not specified copy from existing preference.
                        preference[id].changed = colPreferences[id].changed;
                    }
                }
                // If there is no width specified, set it to 100 (eg. Columns made to be visible in the column chooser don't have a specified width)
                if (preference[id].width === undefined) {
                    preference[id].width = 100;
                }
            }
        }
        Utility.SetSingleUserPreference(this.prefKeyPrefix + 'col_Pref', JSON.stringify(preference));
        this.colPreferences = preference;
        this.render();
    },
    onRowSelect: function (rowId, $td, ev) {
        // Don't trigger if the event is from a subgrid
        var $tr = this.$el.find('tr').has($td);
        if (!$tr.hasClass('SearchResultItemView')) {
            return;
        }
        this.onGridRowSelect(rowId, $td, ev);
    },
    onRowDoubleClick: function (rowId, $td) {
        var se = this.model.get('Results').get(rowId);
        var versionId;
        if (se) {
            versionId = se.versionId();
        }
        if (versionId) {    // Document
            $('body').trigger('ViewDocuments', { versionIds: [versionId], resultId: this.model.get('ResultId') });
        }
        else {  // Inbox or Folder
            var req = {
                IncludeDocuments: true,
                ContainerName: se.get('Title')
            };
            var container = window.slimInboxes.get(rowId);
            if (container) {    // Is an Inbox
                req.IncludeInboxes = true;
                req.IncludeFolders = false;
                req.InboxId = rowId;
            }
            else {  // Is a Folder
                req.IncludeInboxes = false;
                req.IncludeFolders = true;
                req.FolderId = rowId;
            }
            // Trigger the event that handles container searches. 
            // The same one used when clicking an inbox or folder in the navigation panel
            $('body').trigger('searchInContainer', [req]);
        }
    },
    onSortGrid: function (cellId, $th) {
        var sr = this.model.get('Request');
        var sortName = cellId;
        if (Utility.containsGuid(cellId)) {
            var cfm = window.customFieldMetas.get(cellId);
            if (cfm) {
                sortName = cfm.get('Name');
            }
        }
        if (sr.get('SortBy') === sortName) {
            if (sr.get('SortOrder') === 'desc') {
                sr.set('SortOrder', 'asc');
            } else {
                sr.set('SortOrder', 'desc');
            }
        } else {
            sr.set('SortBy', sortName);
            sr.set('SortOrder', 'asc');
        }
        this.model.fetch();
    },
    onEdit: function (rowId, $td) {
        if (this.regionMode) {
            return;
        }
        var i = 0;
        var length = this.resultViews.length;
        var cellId = $td.data('cellid');
        for (i; i < length; i++) {
            var rv = this.resultViews[i];
            if (rv.modelId === rowId) {
                this.editingView = rv;
                rv.render(true, cellId);
                rv.model.storeOriginalValues();
                this.focusElement(cellId, rv.$el);
                break;
            }
        }
    },
    onExitEdit: function (rowId) {
        var that = this;
        if (!this.editingView) {
            return;
        }
        if (this.editingView.model.get('isDirty')) {
            var pref = Utility.GetUserPreference('rowEditChange') || 'restoreRow';
            if (pref === 'saveRow') {
                // listenTo event will cause the row to be re-rendered on model save
                // keeping originalValues so if user click cancel button then previousValues will be restored 
                var originalValues = that.editingView.model.originalValues;
                this.editingView.model.save(null, {
                    failure: function (errMessage) {
                        ErrorHandler.popUpMessage(errMessage);                        
                        that.editingView.render();
                        //set editRowId null before edit
                        that.editRowId = null;
                        that.editingView.$el.find('.editRow').click();
                        // set originalValues because these require on cancel button click
                        that.editingView.model.originalValues = originalValues;
                    }
                });
            } else {
                this.editingView.model.revertChanges();
                this.editingView.render();
            }
        }
        else {
            this.editingView.render();
        }
    },
    getGridCollection: function () {
        return this.model.get('Results');
    },
    getGridSelectedIds: function () {
        return this.getGridCollection().getEntityIds({ includeDocIds: true, includeInboxIds: true, includeFolderIds: true }).searchableIds;
    }
    //#endregion
});