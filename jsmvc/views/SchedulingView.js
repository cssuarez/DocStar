/// <reference path="C:\scain\E3\Astria.UI.Web\Content/LibsExternal/String.js" />
/// <reference path="../../Content/LibsInternal/Utility.js" />
var SchedulingView = Backbone.View.extend({
    // Execution types for the schedule to perform, derived from Constants.ef, if left empty or undefined all execution types will be displayed
    executionTypes: [], // example: [Constants.ef.OneTime, Constants.ef.Hours], this will display One Time and Hours to the user for an execution type selection
    model: undefined,   // Schedule
    schedules: null,    // Schedules
    recurEvery: "",
    displayActive: true,
    showTimePickerOnly: false,
    events: {
        'click .date_icon': 'focusDatePicker',
        'change select[name="ExecutionType"]': 'changeExecutionType',
        'change input[name="Frequency"]': 'changeValue',
        'keyup input[name="Frequency"]': 'changeValue',
        'change input[name="Status"]': 'changeStatus',
        'change input[name="ExecutionTime"]': 'changeValue'
    },
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('schedulinglayout'));
        this.recurEvery = this.options.recurEvery || Constants.c.recureEvery;
        if (this.options.displayActive !== undefined) {
            this.displayActive = this.options.displayActive;
        }
        if (this.options.showTimePickerOnly !== undefined) {
            this.showTimePickerOnly = this.options.showTimePickerOnly;
        }
        this.executionTypes = this.options ? this.options.executionTypes || [] : [];
        this.model = this.model || new Schedule({ Status: Constants.js.Active });
        this.schedules = new Schedules(this.options && options.schedules ? options.schedules : this.model);
        this.listenTo(this.model, 'change:Frequency', function (model, value, options) {
            this.setDateTimePickerType({});
        });
        this.listenTo(this.model, 'change:ExecutionType', function (model, value, options) {
            this.setDateTimePickerType({});
        });
        return this;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.delegateEvents(this.events);
        this.setDateTimePickerType();
        var $input = this.$el.find('input[type=number]');
        $input.numeric({ negative: false, decimal: false });
        return this;
    },
    getRenderObject: function () {
        var r = {};
        r.schedules = this.schedules.toJSON();
        // obtain selected execution type from selected schedule, or selected the first execution type
        r.executionTypes = this.getExecutionTypes();
        r.recurEvery = this.recurEvery;
        r.displayActive = this.displayActive;
        r.showTimePickerOnly = this.showTimePickerOnly;
        r.selected = this.model.toJSON();
        r.selected.ExecutionTime = this.model.getExecutionTime();
        return r;
    },
    setDateTimePickerType: function (ev) {
        var that = this;
        var executionType = this.model.get('ExecutionType');
        var frequency = parseInt(this.model.get('Frequency'), 10);
        var $datePicker = this.$el.find('input[type="datetime"]');
        if (ev && !that.showTimePickerOnly) {
            $datePicker.val('');
        }
        if ($datePicker.hasClass('hasDatepicker')) {
            $datePicker.datetimepicker('destroy');
        }
        var $executionTimeSel = this.$el.find('input[name="ExecutionTime"]');
        var initialExecutionTime = this.model.getExecutionTime();
        var isTimeOnly = false;
        if (executionType === Constants.ef.Hours || (executionType === Constants.ef.Daily && frequency === 1) || that.showTimePickerOnly) {
            $datePicker.datetimepicker({
                timeOnly: true,
                ampm: true,
                onClose: SearchUtil.onDatePickerClose
            });
            isTimeOnly = true;
        }
        else {
            $datePicker.datetimepicker({
                ampm: true,
                onClose: SearchUtil.onDatePickerClose
            });
        }
        var executionTime;
        var date = new Date();
        if (initialExecutionTime) {
            date = new Date(initialExecutionTime);
            if (!DateUtil.isDate(date)) {
                executionTime = initialExecutionTime;
            }
            else if (isTimeOnly) {
                executionTime = date.format('shortTime');
            }
            else {
                executionTime = date.format('general');
            }
            $executionTimeSel.val(executionTime);
        }
        else {
            if (isTimeOnly) {
                executionTime = date.format('shortTime');
            }
            else {
                executionTime = date.format('general');
            }
            $executionTimeSel.val(executionTime);
        }
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    setNewClass: function () {
        this.model = this.getNewClass(this.schedules);
        return this;
    },
    focusDatePicker: function (ev) {
        var $targ = $(ev.currentTarget);
        var $input = $targ.siblings('.hasDatepicker');
        $input.focus();
    },
    // Obtain execution types for user to choose from
    getExecutionTypes: function () {
        var item;
        var efs = Constants.ef;
        var executionTypes = [];
        for (item in efs) {
            if (efs.hasOwnProperty(item)) {
                var ef = {};
                // Filter out execution types not present provided in this.executionTypes
                var idx = 0;
                var length = this.executionTypes.length;
                var include = false;
                for (idx; idx < length; idx++) {
                    if (this.executionTypes[idx] === efs[item]) {
                        include = true;
                        break;
                    }
                }
                if (include) {
                    ef.Key = efs[item];
                    ef.Value = Constants.c['ef_' + item];
                    executionTypes.push(ef);
                }
            }
        }
        // Order by the enum's integer representation, not by the display name
        executionTypes.sort(Utility.sortByProperty('Key'));
        return executionTypes;
    },
    /// Obtain currently displayed data that has possibly been modified by the user
    getCurrentUIData: function () {
        return this.model.toJSON();
    },

    //#region Event Handlers
    changeValue: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var val = $targ.val();
        this.model.set(name, val);
    },
    changeExecutionType: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var val = $targ.val();
        this.model.set(name, Constants.ef[val]);
    },
    changeStatus: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var val = $targ.prop('checked');
        var status = val ? Constants.js.Active : Constants.js.Disabled;
        this.model.set(name, status);
    }
    //#endregion
});
