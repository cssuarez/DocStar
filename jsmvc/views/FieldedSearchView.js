var FieldedSearchView = Backbone.View.extend({
    model: undefined, // FieldCriterion
    collection: undefined, // FieldCriteria
    className: 'FieldedSearchView',
    events: {
        "change input[name='searchValue']": "changeSearchValue",
        "change select[name='searchValue']": "changeSearchValue",
        "keyup input[name='searchValue']": 'changeSearchValue',
        "change input[name='rangeStart']": "changeSearchStartValue",
        "change input[name='rangeEnd']": "changeSearchEndValue",
        "keyup input[name='rangeStart']": "changeSearchStartValue",
        "keyup input[name='rangeEnd']": "changeSearchEndValue",
        "click .add_field_btn": "addFieldedSearch",
        "click .del_field_btn": "deleteFieldedSearch",
        "keyup input,select": "searchButtonClick"
    },
    initialize: function (options) {
        //NOTE: Model passed in from SearchCriteriaView. (FieldCriterion.js: FieldSearchCriteria.cs)
        this.compiledTemplate = doT.template(Templates.get('fieldedsearchviewlayout'));
        this.listenTo(this.model, 'change', this.modelChanged);
        this.listenTo(this.model, 'invalid', function (model, errors, options) {
            this.addErrorMessages(errors);
        });
        return this;
    },
    render: function () {
        var that = this;
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.applyTypeRestrictions();
        this.$el.find('.database_field select').combobox({
            onChange: function (data) {
                that.closestOnChange(data, true);
            },
            selected: function (event, ui) {
                if (ui && ui.item) {
                    that.changeField(ui.item);
                }
            }
        });
        this.$el.find('.database_field_criteria select').combobox({
            onChange: function (data) {
                that.closestOnChange(data, false);
            },
            selected: function (event, ui) {
                if (ui && ui.item) {
                    that.changeOperation(ui.item);
                }
            }
        });      
        return this;
    },
    addErrorMessages: function (errors, targ, isDateRange) {
        if (!targ) {
            targ = $(this.$el).find("input[name='searchValue']").first();
        }
        var msg = '';
        var error;
        for (error in errors) {
            if (errors.hasOwnProperty(error)) {
                if (error === 'ValueError') {
                    if (!isDateRange) {
                        var warningElem = $('<' + css.warningErrorClassTag + '>' + '</' + css.warningErrorClassTag + '>').addClass(css.warningErrorClass);
                        targ.after(warningElem.text(errors[error]));
                    }
                    targ.addClass(css.inputErrorClass);
                    delete errors[error];                   
                }
            }
        }
        ErrorHandler.addErrors(errors);
    },
    getRenderObject: function () {
        var ro = { dbFields: [], operations: [] };
        var length = window.databaseFields.length;
        var i = 0;
        var state = '';
        var fieldName = this.model.get('DatabaseField');
        var type = this.model.get('Type');
        var dbfo = this.model.get('DatabaseFieldOperator');
        var an;
        for (i; i < length; i++) {
            var dbf = window.databaseFields.at(i);
            if (!dbf.get('NonIndexed')) {
                an = dbf.get('ActualName');
                if (an !== Constants.UtilityConstants.SF_CONTENTTYPE_ID && an !== Constants.UtilityConstants.DF_FOLDERID && an !== Constants.UtilityConstants.DF_INBOXID) {
                    state = an === fieldName ? 'selected="selected"' : '';
                    ro.dbFields.push({ ActualName: an, DisplayName: dbf.get('DisplayName'), Type: dbf.get('Type'), state: state });
                }
            }
        }
        if (fieldName !== undefined) {
            var ops = this.operationsDictionary[type];
            if (!ops) {
                ops = [''];
            }

            length = ops.length;
            i = 0;
            for (i; i < length; i++) {
                an = ops[i];
                state = an === dbfo ? 'selected="selected"' : '';
                ro.operations.push({ ActualName: an, DisplayName: ops[i], state: state });
            }
        }

        var col = this.collection;
        var colLength = 1;
        if (col) {
            colLength = col.length;
        }
        ro.hideDelete = colLength === 1 ? 'displayNone' : '';
        ro.hideAdd = col.at(colLength - 1) === this.model ? '' : 'displayNone';
        ro.value = this.model.get('DatabaseFieldValue') || '';
        ro.hideOperation = '';
        ro.hideDateIcon = 'displayNone';
        ro.inputType = 'singleInput';
        if (type === 'Object') {
            this.fillEntityList(ro);
            if (!$.isEmptyObject(ro.valueList)) {
                ro.hideOperation = 'displayNone';
                ro.inputType = 'select';
            }
            if (dbfo === 'Between') {
                ro.inputType = 'range';
                this.getRange(ro);
            }
        }
        else if (type === 'Boolean') {
            ro.hideOperation = 'displayNone';
            ro.inputType = 'select';
            ro.valueList = [];
            state = ro.value === Constants.c['true'] ? 'selected="selected"' : '';
            ro.valueList.push({ Id: Constants.c['true'], Name: Constants.c['true'], state: state });
            state = ro.value === Constants.c['false'] ? 'selected="selected"' : '';
            ro.valueList.push({ Id: Constants.c['false'], Name: Constants.c['false'], state: state });
        }
        else if (type === 'Date' || type === 'DateTime') {
            ro.hideDateIcon = '';
            if (dbfo === 'Between' || dbfo === 'Last Seven Days' || dbfo === 'Last Thirty Days' || dbfo === 'Month' || dbfo === 'Year') {
                ro.inputType = 'range';
                this.getRange(ro);
                if (ro.rangeStart) {
                    ro.rangeStart = DateUtil.convertToJSDate(ro.rangeStart, 'shortDate');
                }
                if (ro.rangeEnd) {
                    ro.rangeEnd = DateUtil.convertToJSDate(ro.rangeEnd, 'shortDate');
                }
            }
            else if (ro.value && (dbfo === 'Today' || dbfo === 'Yesterday')) { //Today and yesterday are stored as a range but displayed as a single value.
                var range = ro.value.split(' - ');
                ro.value = DateUtil.convertToJSDate(range[0], 'shortDate');
            }

        }
        else {
            if (dbfo === 'Between') {
                ro.inputType = 'range';
                this.getRange(ro);
            }
        }
        return ro;
    },
    renderIsLast: function (isLast) {
        this.$el.find('.add_field_btn').toggle(isLast);
    },
    renderIsOnly: function (isOnly) {
        this.$el.find('.del_field_btn').toggle(!isOnly);
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    closestOnChange: function (data, isDbField) {
        var found = false;
        var $input = $(data.event.currentTarget);
        // Use the current text in the input to display the autocomplete dropdown
        $input.autocomplete('search');
        // Obtain the autocomplete dropdown jquery element
        var $autocompleteList = $input.autocomplete('widget');
        if ($input.val() !== '') {
            var $select = isDbField ? this.$el.find('.database_field select') : this.$el.find('.database_field_criteria select');
            // Obtain the value of the first item in the autocomplete dropdown, but only if the value is visible
            // If the value is not visible the entered input text doesn't correspond to a valid option
            var $lis = $autocompleteList.find('li:visible');
            var val = $lis.eq(0).text();
            var $options = $select.find('option');
            if (val) {
                var i = 0;
                var length = $options.length;
                for (i; i < length; i++) {
                    var $opt = $options.eq(i);
                    var optText = $opt.text();
                    if (val.toLowerCase() === optText.toLowerCase()) {
                        found = true;
                        $input.val(val);
                        if (isDbField) {
                            this.changeField($opt);
                        }
                        else {
                            this.changeOperation($opt);
                        }
                        break;
                    }
                }
            }
        }
        if (!found) {
            if (isDbField) {
                this.model.set({ DatabaseField: '', Type: '', DatabaseFieldOperator: '', DatabaseFieldValue: '' });
            }
            else {
                var dbfield = this.model.get('DatabaseField');
                var type = this.model.get('Type');
                var dbops = '';
                if (dbfield) {
                    var ops = this.operationsDictionary[type];
                    if (!ops) {
                        ops = this.operationsDictionary.String;
                    }
                    dbops = ops[0];
                }
                $input.val(dbops);
                this.model.set({ DatabaseFieldOperator: dbops, DatabaseFieldValue: '' });
            }
        }
        if ($input.autocomplete('instance')) {
            $input.autocomplete('close');
        }
    },
    changeField: function (option) {
        var $option = $(option);
        var actName = $option.val();
        var type = $option.data('fieldtype');

        var dbfv = '';
        if (type !== 'Object' && type === this.model.get('Type')) { //Try to save value, if a type change reset it. If its an EntityList reset it as well.
            dbfv = this.model.get('DatabaseFieldValue');
        }

        var ops = this.operationsDictionary[type];
        if (!ops) {
            ops = this.operationsDictionary.String;
        }

        this.model.set({ DatabaseField: actName, Type: type, DatabaseFieldOperator: ops[0], DatabaseFieldValue: dbfv });
    },
    changeOperation: function (option) {
        var $option = $(option);
        var dbfo = $option.val();
        var dbfv = this.model.get('DatabaseFieldValue');
        var type = this.model.get('Type');
        if (type === 'DateTime' || type === 'Date') {
            dbfv = SearchUtil.operationValueForDate(dbfo);
        }
        this.model.set({ DatabaseFieldOperator: dbfo, DatabaseFieldValue: dbfv });

    },
    changeSearchValue: function (e) {
        var $sel = $(e.currentTarget);
        $('.' + css.warningErrorClass, $sel.parent()).remove();
        $sel.removeClass(css.inputErrorClass);
        this.model.setValue($sel.val());      
    },
    changeSearchStartValue: function (e) {
        var $sel = $(e.currentTarget);
        $sel.removeClass(css.inputErrorClass);
        var dbfv = this.model.get('DatabaseFieldValue');
        if (dbfv) {
            if ($.type(dbfv) === "object") {
                dbfv = dbfv.toJSON();
            }
            var parts = dbfv.split(' - ');
            dbfv = $sel.val() + ' - ' + parts[1];
        }
        else {
            dbfv = $sel.val() + ' - ';
        }
        this.model.set({ DatabaseFieldValue: dbfv });
        var dbf = this.model.toJSON();
        var isNotValid = this.model.validate(dbf, "rangeStart"); // validate the model before continuing
        if (isNotValid) {
            this.addErrorMessages(isNotValid, $sel, true);
        }
    },
    changeSearchEndValue: function (e) {
        var $sel = $(e.currentTarget);
        $sel.removeClass(css.inputErrorClass);
        var dbfv = this.model.get('DatabaseFieldValue');
        if (dbfv) {
            if ($.type(dbfv) === "object") {
                dbfv = dbfv.toJSON();
            }
            var parts = dbfv.split(' - ');
            dbfv = parts[0] + ' - ' + $sel.val();
        }
        else {
            dbfv = ' - ' + $sel.val();
        }
        this.model.set({ DatabaseFieldValue: dbfv });
        var dbf = this.model.toJSON();
        var isNotValid = this.model.validate(dbf, "rangeEnd"); // validate the model before continuing
        if (isNotValid) {
            this.addErrorMessages(isNotValid, $sel, true);
        }
    },
    modelChanged: function (m, o) {
        if (m.changed.DatabaseField!==undefined  || m.changed.DatabaseFieldOperator !== undefined) {
            this.render(); //Only render if DatabaseField or DatabaseFieldOperator changed
        }
    },
    fillEntityList: function (ro) {
        var dbf = this.model.get('DatabaseField');
        ro.valueList = [];
        var state;
        var fill = function (data) {
            var i = 0, length;
            if (data) {
                length = data.length;
                if (length === 0) {
                    ro.valueList.push({ Id: '', Name: ' ', state: 'selected="selected"' });
                }
                for (i; i < length; i++) {
                    var m = data.at(i);
                    state = ro.value === m.get('Id') ? 'selected="selected"' : '';
                    ro.valueList.push({ Id: m.get('Id'), Name: m.get('Name'), state: state });
                }
            }
        };
        switch (dbf) {
            case Constants.UtilityConstants.SF_SECURITYCLASS_ID:
                fill(window.slimSecurityClasses);
                break;
            case Constants.UtilityConstants.DF_WORKFLOW_ID:
                fill(window.slimWorkflows);
                break;
            case Constants.UtilityConstants.DF_APPROVAL_REQUESTS:
            case Constants.UtilityConstants.DF_WORKFLOW_ASSIGNEE_ID:
            case Constants.UtilityConstants.DF_WORKFLOW_OWNER_ID:
                fill(window.slimRoles);
                var isAdmin = Utility.isSuperAdmin() || Utility.isInstanceAdmin();
                var us = Utility.getUsersDictionary(null, window.users, !isAdmin);
                var id;
                for (id in us) {
                    if (us.hasOwnProperty(id)) {
                        state = ro.value === id ? 'selected="selected"' : '';
                        ro.valueList.push({ Id: id, Name: us[id], state: state });
                    }
                }
                break;
            case Constants.UtilityConstants.DF_RECORDCATEGORYID:
                fill(window.slimRecordCategories);
                break;
            case Constants.UtilityConstants.DF_FREEZEID:
                fill(window.slimFreezes);
                break;
            case Constants.UtilityConstants.DF_CURRENT_STATE:
                for (id in Constants.ds) {
                    if (Constants.ds.hasOwnProperty(id)) {
                        state = ro.value === Constants.ds[id].toString() ? 'selected="selected"' : '';
                        ro.valueList.push({ Id: Constants.ds[id], Name: Constants.c['ds_' + id], state: state });
                    }
                }
                break;
            case Constants.UtilityConstants.DF_PRIORITY:
                for (id in Constants.pl) {
                    if (Constants.pl.hasOwnProperty(id)) {
                        state = ro.value === Constants.pl[id].toString() ? 'selected="selected"' : '';
                        ro.valueList.push({ Id: Constants.pl[id], Name: Constants.c['pl_' + id], state: state });
                    }
                }
                break;
            default:
                //Lists - Not yet populated, instead treated as a string.

                break;
        }
    },
    getRange: function (ro) {
        ro.rangeStart = '';
        ro.rangeEnd = '';
        if (ro.value) {
            var parts = ro.value.split(' - ');
            if (parts.length === 2) {
                ro.rangeStart = parts[0];
                ro.rangeEnd = parts[1];
            }
        }
    },
    applyTypeRestrictions: function () {
        var type = this.model.get('Type');
        var $inputs = this.$el.find('input[name="searchValue"],input[name="rangeStart"],input[name="rangeEnd"]');
        switch (type) {
            case 'DateTime':
                $inputs.datetimepicker({
                    onClose: SearchUtil.onDatePickerClose
                });
                break;
            case 'Date':
                $inputs.datepicker({
                    onClose: SearchUtil.onDatePickerClose
                });
                break;
            case 'Int64':
            case 'Int32':
                $inputs.numeric({ decimal: false });
                break;
            case 'Decimal':
                $inputs.numeric();
                break;
        }
    },
    addFieldedSearch: function () {
        this.renderIsLast(false);
        this.renderIsOnly(false);
        this.collection.add({});
    },
    deleteFieldedSearch: function () {
        this.model.destroy();
    },
    searchButtonClick:function(e){
        if (e.which === 13) {
            $('.SearchCriteriaView .search_btn').trigger('click');
        }
    },


    operationsDictionary: {
        DateTime: [
            Constants.c.equals,
            Constants.c.before,
            Constants.c.after,
            Constants.c.between,
            Constants.c.today,
            Constants.c.yesterday,
            Constants.c.lastSevenDays,
            Constants.c.lastThirtyDays,
            Constants.c.month,
            Constants.c.year
        ],
        Date: [
            Constants.c.equals,
            Constants.c.before,
            Constants.c.after,
            Constants.c.between,
            Constants.c.today,
            Constants.c.yesterday,
            Constants.c.lastSevenDays,
            Constants.c.lastThirtyDays,
            Constants.c.month,
            Constants.c.year
        ],
        Decimal: [
            Constants.c.equals,
            Constants.c.greaterThanOrEqualTo,
            Constants.c.lessThanOrEqualTo,
            Constants.c.between
        ],
        Int64: [
            Constants.c.equals,
            Constants.c.greaterThanOrEqualTo,
            Constants.c.lessThanOrEqualTo,
            Constants.c.between
        ],
        Int32: [
            Constants.c.equals,
            Constants.c.greaterThanOrEqualTo,
            Constants.c.lessThanOrEqualTo,
            Constants.c.between
        ],
        String: [
            Constants.c.equals,
            Constants.c.contains,
            Constants.c.between
        ],
        Object: [
            Constants.c.equals,
             Constants.c.contains,
            Constants.c.between
        ],
        Boolean: [
            Constants.c.equals
        ]
    }
});