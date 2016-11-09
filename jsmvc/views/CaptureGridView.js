var CaptureGridView = CustomGridView.extend({
    className: 'CaptureGridView',
    columnSelectView: undefined,
    colPreferences: undefined,
    collection: undefined, //SimpleDocuments
    ro: undefined,
    captureGridItemViews: undefined,
    editingView: undefined,
    resizeMe: true,
    resizeOnDocumentViewResize: true,
    events: {
        'click .columnSelector': 'chooseColumns'
    },
    close: function () {
        this.closeItemViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('capturegridviewlayout'));
        this.initializeGrid({ slowClickEdit: true });
        this.captureGridItemViews = [];
        this.colPreferences = Utility.tryParseJSON(Utility.GetUserPreference('capture_col_Pref'));
        this.listenTo(this.collection, 'remove', this.collectionRemovedFrom);
        this.listenTo(this.collection, 'add', this.collectionAddedTo);
        this.listenTo(this.collection, 'reset', this.render);
        return this;
    },
    render: function () {
        this.ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.ro));
        this.renderGrid();
        this.renderItemViews();
        return this;
    },
    getRenderObject: function () {
        var ro = {
            headers: []
        };
        var defColPrefs = this.defaultColumnPreferences();
        if (!this.colPreferences) {
            this.colPreferences = this.defaultColumnPreferences();
        }

        var length = Object.keys(this.colPreferences).length;
        var cp;
        var i = 0;
        for (cp in this.colPreferences) {
            if (this.colPreferences.hasOwnProperty(cp)) {
                var name = Constants.c[cp];
                var idx = this.colPreferences[cp].order;
                if (idx === undefined) {
                    idx = i++; //If you just resize and don't reorder you will have an undefined order.
                }
                var w = this.getWidthFromPreference(cp, this.colPreferences, defColPrefs);
                var isEditable = cp !== 'fileSizeMB';
                ro.headers[idx] = { value: name, colId: cp, hasColumnEdit: isEditable, style: 'width: ' + w };
            }
        }
        if (this.collection.hasAnyErrors()) {
            ro.headers.push({ value: Constants.c.exception, colId: '', hasColumnEdit: false, style: 'width: 10%;' });
        }
        return ro;
    },
    renderItemViews: function () {
        this.closeItemViews();
        var $container = this.$el.find('.customGridTable tbody');
        $container.empty(); //Remove any other rows left over after the item views are closed.

        var that = this;
        var cc = function (e, cae) { that.itemViewCellClick(e, cae); };
        var eem = function (e) { that.itemViewEnterEditMode(e); };
        var exem = function () { that.itemViewExitEditMode(); };
        var i = 0;
        var length = this.collection.length;
        for (i; i < length; i++) {
            var itemView = new CaptureGridItemView({
                model: this.collection.at(i),
                headers: this.ro.headers,
                cellClickFunc: cc,
                enterEditModeFunc: eem,
                exitEditModeFunc: exem
            });
            $container.append(itemView.render().$el);
            this.captureGridItemViews.push(itemView);
        }
        //Append an empty row to the end of the list, this will be used to fill the remaining space.
        var tr = document.createElement('tr');
        tr.setAttribute('class', 'emptyGridRow');
        var td = document.createElement('td');
        td.setAttribute('colspan', this.ro.headers.length + 2);
        tr.appendChild(td);
        $container.append(tr);
    },
    itemViewCellClick: function (e, cae) {
        var event = new $.Event();
        event.currentTarget = e;
        this.cellClick(event, cae);
    },
    itemViewEnterEditMode: function (e) {
        var event = new $.Event();
        event.currentTarget = e;
        this.enterEditMode(event);
    },
    itemViewExitEditMode: function () {
        this.exitEditMode();
    },
    closeItemViews: function () {
        var itemView = this.captureGridItemViews.pop();
        while (itemView) {
            itemView.close();
            itemView = null;
            itemView = this.captureGridItemViews.pop();
        }
    },
    defaultColumnPreferences: function () {
        var p = {
            titleName: { order: 0, width: 15 },
            keywords: { order: 1, width: 10 },
            contentType: { order: 2, width: 15 },
            securityClass: { order: 3, width: 10 },
            workflow: { order: 4, width: 10 },
            inbox: { order: 5, width: 10 },
            folder: { order: 6, width: 10 },
            fileSizeMB: { order: 7, width: 10 }
        };
        if (window.versioningLicensed) {
            p.createAsDraft = { order: 8, width: 10 };
        }
        return p;
    },
    applyColumnEdit: function (cleanupFunc, selected, columnId, $editElements) {
        var values = [];
        if ($editElements[0].tagName === 'SELECT') {
            $editElements = $editElements.find('option:selected');
        }
        var i = 0;
        var length = $editElements.length;
        for (i; i < length; i++) {
            if (columnId === 'folder') {
                values.push({ Id: $editElements.eq(i).attr("Id"), Name: $editElements.eq(i).attr("Name") });
            }
            else {
                values.push($editElements.eq(i).val());
            }
        }
        i = 0;
        length = selected.length;
        for (i; i < length; i++) {
            selected[i].setValueByColumnName(columnId, values);
        }
        Utility.executeCallback(cleanupFunc);
    },

    collectionRemovedFrom: function (model, collection, options) {
        var i = 0;
        var length = this.captureGridItemViews.length;
        for (i; i < length; i++) {
            if (this.captureGridItemViews[i].model === model) {
                this.captureGridItemViews[i].close();
                this.captureGridItemViews.splice(i, 1);
                break;
            }
        }
    },
    collectionAddedTo: function (model, collection, options) {
        this.render(); //Need to rerender as the collection is sorted once it is added to.
    },
    chooseColumns: function () {
        var sourceFields = {};
        var selectedFields = {};
        var allColumns = this.defaultColumnPreferences();
        var i = 0;
        if (!this.colPreferences) {
            this.colPreferences = this.defaultColumnPreferences();
        }
        var cp;
        for (cp in allColumns) {
            if (allColumns.hasOwnProperty(cp)) {
                sourceFields[cp] = Constants.c[cp];
                if (this.colPreferences[cp]) {
                    selectedFields[cp] = this.colPreferences[cp].order === undefined ? i : this.colPreferences[cp].order;
                }
                i++;
            }
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
                    that.onColumnsChanged(preference, true);
                },
                cancelCallback: function () {
                    that.columnSelectView.close();
                    that.columnSelectView = null;
                }
            }
        });
        this.columnSelectView.render();
    },
    onColumnEdit: function (colId, $th) {
        var selected = this.collection.getSelected();
        if (selected.length > 0) {
            var columnId = colId;
            var name = Constants.c[columnId];
            var length = this.captureGridItemViews.length;
            var i = 0;
            var editString = '<div class="searchColumnEdit">';
            for (i; i < length; i++) {
                if (this.captureGridItemViews[i].model === selected[0]) {
                    editString += this.captureGridItemViews[i].getFieldEditObject(columnId, ['']);
                    break;
                }
            }
            editString += '</div>';
            var $dlg;
            var that = this;
            var okFunc = function (cleanupFunc) {
                var $editElements = $dlg.find('.searchColumnEdit input, .searchColumnEdit select');
                var value = that.applyColumnEdit(cleanupFunc, selected, columnId, $editElements);
            };
            var setupFolderPicker = function () {
                var $input = $dlg.find('input[data-colname="folder"]');
                $input.off('click').on('click', function (ev) {
                    var callback = function (btnText, uiState, foldId, foldTitle, foldPath) {
                        var targ = $(ev.currentTarget);
                        if (btnText && btnText !== Constants.c.cancel) {
                            targ.attr('Id', foldId);
                            targ.attr('Name', foldPath);
                            targ.val(foldPath);
                        }
                    };
                    DialogsUtil.folderSelection(false, false, '', callback, this, { singleSelect: true });
                });
            };
            var options = {
                autoOpen: false,
                title: Constants.c.editColumn + ' ' + name,
                height: 110,
                resizable: false,
                modal: true,
                open: function () {
                    if (columnId === "folder") {
                        setupFolderPicker();
                    }
                },
                html: editString
            };
            $dlg = DialogsUtil.generalPromptDialog('', okFunc, null, options);
            $dlg.dialog('open');
        }
    },
    //#region CustomGridView virtual functions
    onColumnsChanged: function (preference, isColumnSelection) {
        var colPreferences = Utility.tryParseJSON(Utility.GetUserPreference('capture_col_Pref')) || {};
        //Loop preference adding back values from exising preferences that are not specified while still dropping columns no longer displayed. (no extend).
        var id;
        var totWidth = 0;
        for (id in preference) {
            if (preference.hasOwnProperty(id)) {
                if (colPreferences[id]) {
                    if (preference[id].width === undefined) { //if width is not specified copy from existing preference.
                        preference[id].width = colPreferences[id].width;
                    }
                    if (preference[id].order === undefined) { //if order is not specified copy from existing preference.
                        preference[id].order = colPreferences[id].order;
                    }
                    totWidth += colPreferences[id].width;
                }
                // If there is no width specified, set it to 100 (eg. Columns made to be visible in the column chooser don't have a specified width)
                if (preference[id].width === undefined) {
                    preference[id].width = 100;
                }
            }
        }
        if (isColumnSelection && totWidth !== 0 && totWidth < 100) {
            var keys = Object.keys(preference);
            var length = keys.length;
            var average = (100 - totWidth) / length;
            var cp;
            for (cp in preference) {
                if (preference.hasOwnProperty(cp)) {
                    preference[cp].width += average;
                }
            }
        }
        Utility.SetSingleUserPreference('capture_col_Pref', JSON.stringify(preference));
        this.colPreferences = preference;
        this.render();
    },
    onRowSelect: function (rowId, $td, ev) {
        this.onGridRowSelect(rowId, $td, ev);
    },
    onSortGrid: function (cellId, $th) {
        this.collection.sortByColumn(cellId);
    },
    onEdit: function (rowId, $td) {
        var i = 0;
        var length = this.captureGridItemViews.length;
        var cellId = $td.data('cellid');
        for (i; i < length; i++) {
            var iv = this.captureGridItemViews[i];
            if (iv.modelId === rowId) {
                this.editingView = iv;
                iv.model.storeOriginalValues();
                iv.render(true);
                this.focusElement(cellId, iv.$el);
                break;
            }
        }
    },
    onExitEdit: function (rowId) {
        if (!this.editingView) {
            return;
        }
        var pref = Utility.GetUserPreference('rowEditChange') || 'restoreRow';
        if (pref === 'restoreRow') {
            this.editingView.model.revertChanges();
        }
        this.editingView.render();
    },
    getGridCollection: function () {
        return this.collection;
    }
    //#endregion
});