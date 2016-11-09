/// <reference path="C:\scain\E3\Astria.UI.Web\Content/LibsInternal/Utility.js" />
var ReportSchedulingView = Backbone.View.extend({
    reportId: null,
    scheduleView: null,
    reportSchedules: null,
    events: {
        "click .save": "saveChanges",
        "click .delete": "kill"
    },
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('reportschedulinglayout'));
        this.reportId = this.options.reportId;
        this.reportSchedules = this.options.schedules;
        this.reportSchedules.getNewList(new ReportSchedule(
            {
                Id: Constants.c.emptyGuid,
                ReportId: this.reportId,
                Name: Constants.c.newTitle
            }
        ));
        this.setNewClass();
        var that = this;
        this.reportSchedules.on('reset', function () {
            that.setNewClass();
            that.render();
        });
        this.reportSchedules.on('add', function () {
            that.setNewClass();
            that.render();
        });
        this.reportSchedules.on('remove', function () {
            that.setNewClass();
            that.render();
        });
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        this.delegateEvents(this.events);
        var that = this;
        var $scheduleSelect = this.$el.find('select[name="Name"]');
        $scheduleSelect.combobox({
            onChange: function (data) {
                if (data.ui.item) {
                    that.changeSelection(data.ui.item.option);
                }
            },
            onSelect: function (data) {
                if (data.ui.item) {
                    that.changeSelection(data.ui.item.option);
                }
            }
        });
        var schedules = [];
        var schedule = this.selected.get('Schedule');
        if (schedule) {
            schedules.push(schedule);
        }
        var selectedSchedule = Utility.tryParseJSON(schedule, true);
        if (selectedSchedule) {
            selectedSchedule = new Schedule(selectedSchedule);
        }
        // Render schedule
        this.closeScheduleView();
        this.scheduleView = new SchedulingView({
            schedules: schedules,
            executionTypes: [Constants.ef.Daily, Constants.ef.Hours],
            model: selectedSchedule
        });
        this.$el.find('div[name="Schedule"]').append(this.scheduleView.render().$el);
        this.renderParameters();
        if (this.selected.isNew() || this.selected.get('Id') === Constants.c.emptyGuid) {
            this.$el.find('.delete').addClass('disabled');
        }
        else {
            this.$el.find('.delete').removeClass('disabled');
        }
        return this.$el;
    },
    renderParameters: function () {
        var that = this;
        var $iframe = this.$el.find('iframe');
        $iframe.attr('src', Constants.Url_Base + 'Content/images/transparent.png');
        this.$el.find('.throbber').show();
        $iframe.get(0).onload = function () {
            var scheduleParams = that.getParametersFromSchedule();
            var parameters = that.getReportParameterData();
            that.fillParameters(scheduleParams, parameters);
            // Render report parameters
            that.reportParamLibView = new ReportParameterLibraryView({
                parameters: parameters,
                displayUseDefault: true
            });
            that.$el.find('.throbber').hide();
            that.$el.find('.reportParameters').append(that.reportParamLibView.render().$el);
        };
        $iframe.attr('src', Constants.Url_Base + 'ReportViewer.aspx?reportId=' + that.reportId + '&getParameters=getParameters');
    },
    fillParameters: function (scheduleParams, parameters) {
        // Loop over schedule parameters to fill out parameter with existing data
        var idx = 0;
        var scheduleParamLen = scheduleParams.length;
        var filledParams = {};
        for (idx = 0; idx < scheduleParamLen; idx++) {
            var scheduleParam = scheduleParams[idx];
            if (!filledParams[scheduleParam.Key]) {
                var paramIdx = 0;
                var paramLen = parameters.length;
                for (paramIdx = 0; paramIdx < paramLen; paramIdx++) {
                    var parameter = parameters[paramIdx];
                    if (scheduleParam.Key === parameter.Name) {
                        filledParams[scheduleParam.Key] = true;
                        parameter.UseDefault = scheduleParam.UseDefault === false ? false : true;
                        parameter.UseDynamic = scheduleParam.UseDynamic === true;
                        var vals = scheduleParam.Value.split(', ');
                        var valIdx = 0;
                        var valLen = vals.length;
                        var vvIdx = 0;
                        var vvLen = parameter.ValidValues instanceof Array ? parameter.ValidValues.length : 0;
                        if (vvLen > 0) {
                            for (valIdx = 0; valIdx < valLen; valIdx++) {
                                for (vvIdx = 0; vvIdx < vvLen; vvIdx++) {
                                    if (parameter.ValidValues[vvIdx].Value === vals[valIdx]) {
                                        parameter.ValidValues[vvIdx].Selected = true;
                                    }
                                }
                            }
                        }
                        else {
                            if (parameter.UseDynamic) {
                                parameter.DynamicValue = scheduleParam.Value;
                            }
                            else {
                                parameter.Values = parameter.Values || [];
                                parameter.Values[0] = scheduleParam.Value;
                            }
                        }
                        break;
                    }
                }
            }
        }
    },
    getRenderObject: function () {
        var r = {};
        r.reportSchedules = this.reportSchedules.toJSON();
        r.selected = this.getSelectedData();
        return r;
    },
    closeScheduleView: function () {
        if (this.scheduleView && this.scheduleView.close) {
            this.scheduleView.close();
        }
    },
    close: function () {
        this.closeScheduleView();
        if (this.reportParamLibView && this.reportParamLibView.close) {
            this.reportParamLibView.close();
        }
        this.unbind();
        this.remove();
    },
    setNewClass: function () {
        this.selected = this.getNewClass(this.reportSchedules);
        return this;
    },
    changeSelection: function (selection) {
        var id = $(selection).val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        }
        else {
            var model = this.reportSchedules.get(id);
            this.selected = model;
        }
        this.render();
    },
    getSelectedData: function () {
        var data = {};
        if (this.selected) {
            data = this.selected.toJSON();
        }
        return data;
    },
    getParametersFromSchedule: function () {
        var selectedData = this.getSelectedData();
        var schedule = Utility.tryParseJSON(selectedData.Schedule, true);
        var scheduleParams = [];
        if (schedule) {
            scheduleParams = schedule.Parameters;
        }
        return scheduleParams;
    },
    getReportParameterData: function () {
        var $iframe = this.$el.find('iframe');
        var iframeDocument = $iframe.contents();
        var $paramData = iframeDocument.find('#reportParameterData');
        var parameters = Utility.tryParseJSON($paramData.val(), true) || [];
        return parameters;
    },
    getParametersFromUI: function () {
        var parameters = [];
        var $params = this.$el.find('.reportParameters .parameter');
        var idx = 0;
        var length = $params.length;
        for (idx = 0; idx < length; idx++) {
            var $param = $params.eq(idx);
            var useDefault = $param.find('.useDefault').is(':checked');
            var useDynamic = $param.find('.useDynamic').is(':checked');
            var $isCombo = $param.find('input.isCombo');
            var key;
            var value;

            if ($isCombo && $isCombo.length > 0 && !$isCombo.hasClass('ignore')) {
                key = $isCombo.attr('name');
                value = $isCombo.val();
            }
            else {
                var paramData = DTO.getDTO($param);
                var datum;
                for (datum in paramData) {  // Should only ever be a single value
                    if (paramData.hasOwnProperty(datum)) {
                        key = datum;
                        var val = paramData[datum];
                        if (val instanceof Array) {
                            var i = 0;
                            var valLen = val.length;
                            value = '';
                            for (i = 0; i < valLen; i++) {
                                value += val[i];
                                if (i < valLen - 1) {
                                    value += ', ';
                                }
                            }
                        }
                        else {
                            value = val;
                        }
                    }
                }
            }
            parameters.push({
                Key: key,
                Value: value,
                UseDefault: useDefault,
                UseDynamic: useDynamic
            });
        }
        return parameters;
    },
    // Save changes made to a schedule
    saveChanges: function () {
        var attrs = DTO.getDTOCombo(this.$el);
        var model = this.selected;
        if (attrs.Id === Constants.c.emptyGuid) {
            delete attrs.Id;
            model = new ReportSchedule();
        }
        this.listenTo(model, 'invalid', function (model, error, options) {
            that.handleErrors(model, error);
        });
        attrs.Schedule = this.scheduleView.getCurrentUIData();
        attrs.Schedule.Parameters = this.getParametersFromUI();
        attrs.Schedule = JSON.stringify(attrs.Schedule);
        var that = this;
        model.save(attrs, {
            success: function (model, result) {
                model.set('id', result.Id);
                that.saveSuccess(model, result, attrs.Id, that.reportSchedules, that);
            },
            failure: function (message) {
                that.handleErrors(that.selected, null, message);
            },
            error: function (model, errors) {
                that.handleErrors(that.selected, errors);
            }
        });
    },
    kill: function (ev) {
        var $targ = $(ev.currentTarget);
        var model = this.selected;
        // Don't allow deletion of new schedule
        if ($targ.hasClass('disabled') || model.get('Id') === Constants.c.emptyGuid) {
            return;
        }
        var scheduleName = model.get('Name');
        var msg = String.format(Constants.c.proceedWithDelete, scheduleName);
        var that = this;

        var okFunc = function (cleanup) {
            var sf = function () {
                that.reportSchedules.remove(model);
                Utility.executeCallback(cleanup);
            };
            var ff = function (jqXHR, textStatus, errorThrown) {
                ErrorHandler.popUpMessage(errorThrown);
                Utility.executeCallback(cleanup);
            };
            model.destroy({ success: sf, failure: ff });
        };
        var cancelFunc = function (cleanup) {
            Utility.executeCallback(cleanup);
        };
        var options = {
            title: Constants.c['delete'],
            position: {
                my: 'left top',
                at: 'right top',
                of: that.$el
            }
        };
        DialogsUtil.generalPromptDialog(msg, okFunc, cancelFunc, options);

    },
    handleErrors: function (model, errors, message) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        if (!errors) {
            errors = {
                error: message
            };
        }
        else if (message) {
            errors.error = message;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    }
});