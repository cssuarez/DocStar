var CaptureGridItemView = Backbone.View.extend({
    className: 'CaptureGridItemView',
    ignoreSelectedEvent: false,
    tagName: 'tr',
    model: undefined, //SimpleDocument
    headers: undefined,
    enterEditModeFunc: undefined,
    exitEditModeFunc: undefined,
    cellClickFunc: undefined,
    progUpdt: false,
    events: {
        'click .saveRow': 'saveRow',
        'click .cancelSave': 'cancelSave',
        'click .editRow': 'editRow',
        'input input[type="text"]': 'textChanged',
        'input input.ComboBox, input.Autocomplete': 'textChanged',
        'change input.ComboBox, input.Autocomplete': 'textChanged',
        'click input[type="checkbox"]': 'boolChanged',
        'input input[type="number"]': 'numberChanged',
        'input input[type="decimal"]': 'numberChanged',
        'change select': 'selectChanged',
        'input input[type="date"]': 'dateChanged',
        'input input[type="datetime"]': 'datetimeChanged',
        'click input[data-colname="folder"]': 'openFolderPicker'
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = Templates.getCompiled('capturegriditemviewlayout');
        this.headers = options.headers;
        this.modelId = this.model.get('Id');
        this.$el.data('rowid', this.model.get('Id'));
        this.listenTo(this.model, 'change', this.modelChanged);
        this.listenTo(this.model, 'change:ContentTypeId', function (model, value, options) {
            if (value) {
                this.$el.removeClass('errorRow');
            }
        });
        this.listenTo(this.model, 'invalid', function (model, error, options) {
            this.$el.addClass('errorRow');
        });
        this.cellClickFunc = options.cellClickFunc || function () { };
        this.enterEditModeFunc = options.enterEditModeFunc || function () { };
        this.exitEditModeFunc = options.exitEditModeFunc || function () { };
        return this;
    },
    render: function (editMode) {
        this.inEditMode = editMode;
        var ro = this.getRenderObject(editMode);
        this.$el.html(this.compiledTemplate(ro));
        this.$el.data('rowid', this.model.get('Id'));
        if (ro.selected) {
            this.$el.addClass('customGridHighlight');
        } else {
            this.$el.removeClass('customGridHighlight');
        }

        if (editMode) {
            var that = this;
            this.$el.find('input[type="date"]').datepicker({
                onClose: function (dateText, inst) { that.datePickerClose(dateText, inst); }
            });
            this.$el.find('input[type="datetime"]').datetimepicker({
                onClose: function (dateText, inst) { that.datePickerClose(dateText, inst); }
            });
            CustomFieldSetup.setupAutocompletes(this.$el.find('.Autocomplete'));
            var $elements = this.$el.find('select');
            var i = 0;
            var length = $elements.length;
            CustomFieldSetup.loadSelect($elements);
            this.$el.find('input[type="number"]').numeric({ decimal: false });
            this.$el.find('input[type="decimal"]').numeric();
        }
        return this;
    },
    getRenderObject: function (editMode) {
        var ro = {
            cells: [],
            selected: this.model.isSelected(),
            inEditMode: editMode
        };
        var cp;
        var i = 0;
        var length = this.headers.length;
        for (i; i < length; i++) {
            var h = this.headers[i];
            var values = this.model.getValuesByPreference(h.colId, !editMode);
            if (!editMode) {
                values = [Utility.safeHtmlValue(values.join(', '))];
            } else {
                values = this.getFieldEditObject(h.colId, values);
            }
            ro.cells[i] = { values: values, valueId: h.colId };
        }
        this.numCols = ro.cells.length;
        return ro;
    },
    getFieldEditObject: function (colName, values) {
        var results = [];

        var uc = Constants.UtilityConstants;
        var id;
        switch (colName) {
            case 'titleName':
            case 'keywords':
                results.push(Utility.safeHtmlValue(values[0], { tag: 'input', attrs: { 'type': 'text', 'data-colname': colName } }));
                break;
            case 'folder':                
                results.push(Utility.safeHtmlValue(values[0], { tag: 'input', attrs: { 'type': 'text', 'data-colname': colName, 'readonly': true } }));
                break;
            case 'contentType':
                results.push(this.generateSelect(window.contentTypes, values[0], colName));
                break;
            case 'securityClass':
                results.push(this.generateSelect(window.slimSecurityClasses, values[0], colName));
                break;
            case 'workflow':
                results.push(this.generateSelect(window.slimWorkflows, values[0], colName));
                break;
            case 'inbox':
                results.push(this.generateSelect(window.slimInboxes, values[0], colName));
                break;
            case 'createAsDraft':
                var select = document.createElement('select');
                select.setAttribute('data-colname', colName);
                $(select).append('<option value=true>True</option><option value=false>False</option>');
                $(select).find('option[value="' + values[0] + '"]').attr("selected", "selected");
                var container = document.createElement('div');
                container.appendChild(select);
                results.push(container.innerHTML);

                break;
            default:
                results.push(Utility.safeHtmlValue(values.join(', ')));
                break;

        }

        return results;
    },
    generateSelect: function (collection, selectedId, colName, excludeBlankOption) {
        var select = document.createElement('select');
        select.setAttribute('data-colname', colName);
        var option;
        if (!excludeBlankOption) {
            option = document.createElement('option');
            option.text = ' ';
            select.appendChild(option);
        }
        var i = 0;
        var length = collection.length;
        for (i; i < length; i++) {
            var item = collection.at(i);
            option = document.createElement('option');
            option.value = item.get('Id');
            option.text = item.get('Name');
            if (item.get('Id') === selectedId) {
                option.setAttribute('selected', 'selected');
            }
            select.appendChild(option);
        }
        var container = document.createElement('div');
        container.appendChild(select);
        return container.innerHTML;
    },
    openFolderPicker: function (event) {
        var targ = $(event.currentTarget);
        var that = this;
        var callback = function (btnText, uiState, foldId, foldTitle, foldPath) {
            if (btnText && btnText !== Constants.c.cancel) {
                targ.attr('Id', foldId);
                targ.attr('Name', foldPath);
                targ.val(foldPath);
                that.progUpdt = false;
                that.updateModel(targ);
            }
        };
        DialogsUtil.folderSelection(false, false, '', callback, this, { singleSelect: true });
    },
    modelChanged: function (m, o) {
        if (this.ignoreSelectedEvent) {
            return;
        }
        if (!this.progUpdt) {
            this.render(this.inEditMode);
        }
    },
    saveRow: function (e) {
        var $td = this.$el.find('td');
        if (this.model.originalValues) {
            this.model.originalValues = undefined;
        }
        this.exitEditModeFunc($td[0]);
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

    //#region Push events Model.
    updateModel: function ($sel, value) {
        if (this.progUpdt) {
            return;
        }
        this.progUpdt = true;
        var colName = $sel.data('colname');
        if (colName === 'isSelected') {
            this.progUpdt = false; //We want selection changes to allow a re-render.
            this.model.setSelected(value, this.model.collection.getHighestSequence() + 1);
        }
        else if (colName === 'folder') {
            var foldrVal = [{ Id: $sel.attr("Id"), Name: $sel.attr("Name") }];
            this.model.setValueByColumnName(colName, foldrVal);
        }
        else {
            this.model.setValueByColumnName(colName, [value]);
        }
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
        if (ev.shiftKey) {
            return;  // let cellclick perform the selection;
        }
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
    }
    //#endregion
});