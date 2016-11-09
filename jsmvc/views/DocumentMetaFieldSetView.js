var DocumentMetaFieldSetView = Backbone.View.extend({
    model: undefined, //BulkViewerDataPackageCPX
    className: 'DocumentMetaFieldSetView',
    tagName: 'tr',
    setId: undefined,
    rowNumber: undefined,
    columnPreference: undefined,
    templateLookup: undefined,
    augmentedCFMs: undefined,
    progUpdt: false,
    canEdit: true,
    events: {
        'click .deleteSet': 'deleteSet',
        'input input[type="text"]': 'textChanged',
        'input input.isCombo, input.Autocomplete': 'textChanged',
        'change input.isCombo, input.Autocomplete': 'textChanged',
        'change input[type="checkbox"]': 'boolChanged',
        'input input[type="number"]': 'numberChanged',
        'input input[type="decimal"]': 'numberChanged',
        'change select': 'selectChanged',
        'input input[type="date"]': 'dateChanged',
        'input input[type="datetime"]': 'datetimeChanged',
        'change input[type="date"]': 'dateChanged',
        'change input[type="datetime"]': 'datetimeChanged'
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentmetafieldsetviewlayout'));
        this.setId = options.setId;
        this.rowNumber = options.rowNumber;
        this.templateLookup = options.templateLookup;
        this.columnPreference = options.columnPreference;
        this.augmentedCFMs = options.augmentedCFMs;
        this.canDeleteGroup = options.canDeleteGroup === false ? false : true;
        if (options.canEdit !== undefined) {
            this.canEdit = options.canEdit;
        }
        this.$el.data('rowid', this.setId);
        this.$el.attr('data-setid', this.setId);
        return this;
    },
    render: function (editMode) {
        var ro = this.getRenderObject(editMode);
        this.$el.html(this.compiledTemplate(ro));

        if (editMode) {
            var that = this;
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
        }
        return this;
    },
    getRenderObject: function (editMode) {
        var ro = {
            cells: [],
            rowNumber: this.rowNumber,
            canDelete: this.canDeleteGroup && this.model.hasRights(Constants.sp.Modify)
        };
        var cfs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        var setValues = cfs.getSetValues(this.setId, this.columnPreference); //returns filtered and in order.
        this.stopListening(); //Stop listening to all prior value changes.

        var cfgs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        this.listenTo(cfgs, 'add remove', this.fieldCollectionChanged);

        var i = 0;
        var length = setValues.length;
        for (i; i < length; i++) {
            var sv = setValues[i];
            if (sv !== undefined) {
                var error = sv.validate(sv.toJSON());
                var className = !!error ? 'warningErrorClass' : '';
                var cfmId = sv.get('CustomFieldMetaId');
                if (!editMode || !this.canEdit) {
                    var cfm = window.customFieldMetas.get(cfmId);
                    var template = this.templateLookup[cfmId];
                    var style = CustomFieldSetup.createStyleFromTemplate(template);
                    ro.cells.push({
                        value: Utility.safeHtmlValue(sv.getDisplayValue()),
                        style: style,
                        valueId: cfmId, // yes, this View uses the metaId as the cell's valueId
                        encodedName: SearchUtil.indexBase64Encode(cfm.get('Name')),
                        className: className
                    });
                } else {
                    var feo = this.getFieldEditObject(sv);
                    feo.valueId = cfmId; // yes again
                    ro.cells.push(feo);
                }
                this.listenTo(sv, 'change', this.setValueChanged);
            }
        }
        return ro;
    },
    getFieldEditObject: function (cfv) {
        var meta;
        var i = 0;
        var length = this.augmentedCFMs.length;
        var cfmId = cfv.get('CustomFieldMetaId');
        for (i; i < length; i++) {
            if (this.augmentedCFMs[i].Id === cfmId) {
                meta = this.augmentedCFMs[i];
                break;
            }
        }
        var value = CustomFieldSetup.getEditableElement(cfv.get('Id'), cfv.getValue(), meta);
        return {
            value: value,
            style: ''
        };
    },
    deleteSet: function () {
        var cfs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        cfs.removeSetValues(this.setId);
        this.close();
    },
    setValueChanged: function () {
        if (this.progUpdt) {
            return;
        }
        this.render();
    },
    fieldCollectionChanged: function (model, collection, options) {
        //Check if the model belongs to this set. if so re-render
        var setId = model.get('SetId');
        if (setId && this.setId === setId) {
            this.render();
        }
    },

    //#region Push events from Form into Model.
    updateModel: function ($sel, value) {
        if (this.progUpdt) {
            return;
        }
        var that = this;
        var cb = function () {
            that.progUpdt = false;
        };
        this.progUpdt = true;
        var bsId = $sel.data('backingstoreid');
        var values = {};
        values[bsId] = value;
        this.model.updateBackingStore({
            storeId: bsId,
            valueId: $sel.data('backingstorevalueid'),
            values: values
        }, cb);
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
    }
    //#endregion
});