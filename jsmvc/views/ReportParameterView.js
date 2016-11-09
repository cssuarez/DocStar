var ReportParameterView = Backbone.View.extend({
    className: 'parameter',
    dataLinkSvc: DataLinkServiceProxy(),
    model: new ReportParameter(),   // the report parameter to be rendered by this view
    dynamicDates: DynamicDates(),
    events: {
        'change .useDefault': 'changeUseDefault',
        'change .useDynamic': 'changeUseDynamic',
        'click .date_icon': 'focusDatepicker',
        'change select[multiple="multiple"]': 'changeMultipleSelection'
    },
    initialize: function (options) {
        this.options = options || {};
        this.model = this.options.model;
        this.compiledTemplate = doT.template(Templates.get('reportparameterslayout'));
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        var that = this;
        this.$el.find('.datepicker').datetimepicker();
        var $ta = this.$el.find('.typeAhead');
        var $combo;
        if ($ta.length > 0) {
            $ta.combobox();
            $combo = this.$el.find('.isCombo');
            $combo.autocomplete({
                select: function (event, ui) {
                    var $input = $(this.element);
                    $input.data('selectedItemData', ui.item);
                },
                source: function (request, response) {
                    var elemName = $(this.element).attr('name');
                    var $param = that.$el;
                    var $ta = $param.find('.typeAhead');
                    var sf = function (data) {
                        response(data.Columns[0].Value);
                    };
                    var ff = function (jqXHR, textStatus, errorThrown) {
                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                        var err = {};
                        if (elemName) {
                            err[elemName] = errorThrown.Message;
                        }
                        else {
                            err = errorThrown.Message;
                        }
                        ErrorHandler.addErrors(err);
                    };
                    var dataSetId = $ta.data('datasetid');
                    var getReportDataTypeAheadArgs = {
                        DataSetId: dataSetId,
                        TypeAheadValue: request.term
                    };
                    if (!that[dataSetId]) {
                        that[dataSetId] = {};
                    }
                    else if (that[dataSetId].cancel) {
                        that[dataSetId].cancel();
                    }
                    that.dataLinkSvc.getReportDataTypeAhead(getReportDataTypeAheadArgs, sf, ff, null, that[dataSetId]);
                },
                minLength: 2,
                delay: Constants.TypeAheadDelay
            });
            $combo.prop('disabled', !(this.viewData.UseDefault === false || !this.viewData.displayUseDefault));
            $combo.val($ta.val() || '');
        }
        var $dynamicDates = this.$el.find('.dynamicDates');
        if ($dynamicDates.length > 0) {
            this.setupDynamicValueCombo($dynamicDates, this.viewData.dynamicDates);
            var ev = new $.Event();
            ev.currentTarget = this.$el.find('.useDynamic');
            this.changeUseDynamic(ev);
        }
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    getRenderObject: function () {
        var ro = this.model.toJSON();
        ro.HasMultipleValues = ro.IsMultiValued ? 'multiple="multiple"' : '';
        ro.dataDataSetId = ro.DataSetId ? 'data-datasetid="' + ro.DataSetId + '"' : '';
        ro.HasSelected = false;
        if (ro.ValidValues && ro.ValidValues.length > 0) {
            var i = 0;
            var length = ro.ValidValues.length;
            var found = false;
            for (i = 0; i < length; i++) {
                ro.ValidValues[i].Selected = ro.ValidValues[i].Selected === true;
                if (ro.HasSelected === false) {
                    ro.HasSelected = ro.ValidValues[i].Selected === true;
                }
                if (ro.DefaultValues && ro.DefaultValues.length > 0) {
                    var j = 0;
                    var dvLen = ro.DefaultValues.length;
                    for (j = 0; j < dvLen; j++) {
                        var dv = ro.DefaultValues[j];
                        // If multivalued, have 'All' selected by default (in the template)
                        if (ro.ValidValues[i].Value === dv) {
                            ro.ValidValues[i].Selected = true;
                            ro.HasSelected = true;
                            if (!ro.IsMultiValued) {
                                var k;
                                var vvLen = ro.ValidValues.length;
                                // Deselect all other options since it is a single mode select
                                for (k = 0; k < vvLen; k++) {
                                    if (k !== i) {
                                        ro.ValidValues[k].Selected = false;
                                    }
                                }
                                found = true;
                                break;
                            }
                        }
                    }
                    if (found) {
                        break;
                    }
                }
            }
        }
        ro.displayUseDefault = this.options.displayUseDefault || false;
        ro.disabledDefault = ro.UseDefault === false || !ro.displayUseDefault ? '' : 'disabled="disabled"';
        ro.dynamicDates = this.dynamicDates.getSortedDynamicDates();
        return ro;
    },
    setupDynamicValueCombo: function ($dynamicValueSelect, dynamicValueSource) {
        var source = [];
        var length = dynamicValueSource.length;
        var idx = 0;
        for (idx = 0; idx < length; idx++) {
            var dynamicValue = dynamicValueSource[idx];
            source.push({ label: dynamicValue.key, value: dynamicValue.value });
        }
        if ($dynamicValueSelect.combobox('instance')) {
            $dynamicValueSelect.combobox('destroy');
        }
        var autocompleteMinWidth = 200;
        $dynamicValueSelect.combobox({
            source: source,
            autocompleteMinWidth: autocompleteMinWidth,
            classes: 'usingSource'
        });
        var $combo = $dynamicValueSelect.parent().find('.isCombo');
        $combo.val(this.viewData.DynamicValue || $dynamicValueSelect.find('option:first').val());
    },
    //#region Event Handlers
    changeUseDefault: function (ev) {
        var $targ = $(ev.currentTarget);
        var useDefault = $targ.is(':checked');
        var $parent = this.$el.find('div').has($targ);
        $parent.siblings('input, select, textarea').prop('disabled', useDefault);
        $parent.siblings().find('.isCombo').prop('disabled', useDefault);
    },
    changeUseDynamic: function (ev) {
        var $targ = $(ev.currentTarget);
        var useDynamic = $targ.is(':checked');
        var $dateIcon = this.$el.find('.date_icon');
        var $input = this.$el.find('> input[type="text"]');
        var $combo = this.$el.find('.isCombo');
        $combo.addClass('ignore');
        $combo.prop('disabled', false);
        var $useDefault = this.$el.find('.useDefault');
        if (useDynamic) {
            $dateIcon.hide();
            $useDefault.removeAttr('checked');
            $useDefault.prop('disabled', true);
            $input.hide();
            $input.addClass('ignore');
            $combo.removeClass('ignore');
            $combo.parent().show();
        }
        else {
            $combo.addClass('ignore');
            $combo.parent().hide();
            $dateIcon.show();
            $useDefault.prop('disabled', false);
            if (this.viewData.UseDefault !== false) {
                $useDefault.attr('checked', 'checked');
            }
            $input.show();
            $input.removeClass('ignore');
        }
    },
    focusDatepicker: function (ev) {
        var $targ = $(ev.currentTarget);
        var $dp = $targ.parent().find('.datepicker');
        if (!$dp.prop('disabled')) {
            $targ.parent().find('.datepicker').focus();
        }
    },
    changeMultipleSelection: function (ev) {
        // Deselect 'All' option if any other option is selected
        var $targ = $(ev.currentTarget);
        var $allOpt = $targ.find('option[value="' + Constants.c.all + '"]');
        var isAllSelected = $allOpt.is(':selected');
        var selectedOpts = $targ.find('option:selected');
        if (isAllSelected && selectedOpts.length > 1) {
            $allOpt.prop('selected', false);
        }
    }
    //#endregion Events Handlers
});