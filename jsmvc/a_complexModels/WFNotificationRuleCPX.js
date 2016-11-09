var WFNotificationRuleCPX = Backbone.Model.extend({
    idAttribute: 'Id',
    dateTimeFields: { LastSent: true, LastModified: true},
    defaults: {
        Id: Constants.c.emptyGuid,
        RuleName: Constants.c.newTitle,
        IsDetailed: false,
        NewOnly: false,
        SendEmailForZeroItem: false,
        ResultLimit: 50,
        OwnerId: undefined,
        Columns: "[]",
        Schedule: {},
        Sort: "",
        SortDescending: false,
        InstanceId: Constants.c.emptyGuid
    },
    proxy: WorkflowServiceProxyV2({ skipStringifyWcf: true }),
    ///<summary>
    /// Returns true if there is a duplicate name present in this model's collection
    ///</summary>
    isDuplicateName: function (name, id) {
        name = name || this.get('RuleName');
        id = id || this.get('Id');
        var collection = this.collection || [];
        var idx = 0;
        var length = collection.length;
        for (idx; idx < length; idx++) {
            var model = collection.at(idx);
            if (model.get('RuleName') === name && model.get('Id') !== id) {
                return true;
            }
        }
        return false;
    },
    checkBlankOrNumeric: function (value, attrDisplayName) {
        var retval = '';
        if (value === '') {
            retval = attrDisplayName + ': ' + Constants.c.invalidnumber;
        }
        else if (isNaN(value) || parseInt(value, 10) > parseInt(Constants.IntMax, 10)) {
            retval = String.format(Constants.c.notavalidnumber, value, attrDisplayName);
        }
        return retval;
    },
    ///<summary>
    /// Perform client side validation for models here
    /// This function executes when you call model.save()
    /// It will return an object with each validation error that may have occurred
    ///<param name="attrs">Model's attributes that are to be validated</param>
    ///</summary>
    validate: function (attrs, options) {
        // Add validation here for attrs
        // Any error msg should be added to the msg object with a key that matches the name attribute of an html element
        // eg. msg.Name = 'error message', where an html element has a name attribute of 'Name'
        var msg = {};
        var ruleName = attrs.RuleName;
        if (this.isDuplicateName()) {
            msg.RuleNameValidation = Constants.c.duplicateNameError;
        }
        else if (ruleName === "" || ruleName === Constants.c.newTitle) {
            msg.RuleNameValidation = Constants.c.pawnsBlankRuleError;
        }

        if (!attrs.runNow && attrs.Schedule) {    // If executing as 'Run Now', don't validate the schedule
            var schedule = attrs.Schedule;
            var executionType = schedule.get('ExecutionType');
            var refEF = Utility.reverseMapObject(Constants.ef);
            var executionTime = schedule.getExecutionTime();
            var frequency = schedule.get('Frequency');
            if (!(executionType === refEF[Constants.ef.Hours] || (executionType === refEF[Constants.ef.Daily] && parseInt(schedule.Frequency, 10) === 1))) {
                if (!DateUtil.isDate(executionTime)) {
                    msg.DateTimeError = Constants.c.pawnsBlankScheduleDateTimeError;
                }
            }
            else if (!DateUtil.validateTime(executionTime)) {
                msg.DateTimeError = Constants.c.pawnsBlankScheduleDateTimeError;
            }
            var scheduleEveryErr = this.checkBlankOrNumeric(schedule.get('Frequency'), Constants.c.every);
            if (scheduleEveryErr) {
                msg.DateTimeError = scheduleEveryErr;
            }
        }
        if (attrs.IsDetailed) {
            var cols = attrs.Columns;
            if (cols.length === 0 || cols === "null") {
                msg.DetailLevelValidation = Constants.c.pawnsBlankDetailError;
            }
        }
        var resultLimitError = this.checkBlankOrNumeric(attrs.ResultLimit, Constants.c.pawnsResultLimit);
        if (resultLimitError) {
            msg.ResultLimit = resultLimitError;
        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.Schedule) {
            if (typeof attrs.Schedule === 'string') {
                attrs.Schedule = Utility.tryParseJSON(attrs.Schedule);
            }
            if (this.get('Schedule') instanceof Backbone.Model) {
                this.get('Schedule').set(attrs.Schedule, options);
                delete attrs.Schedule;
            }
            else {
                attrs.Schedule = new Schedule(attrs.Schedule, options);
                this.bindSubModelEvents(attrs.Schedule, 'Schedule');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        var that = this;
        options.syncMethod = method;
        var ff = function (qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var cf = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
        var success;
        var wfNotificationRule;
        if (method !== 'delete') {
            wfNotificationRule = this.prepRule();
        }
        switch (method) {
            case 'create':
                success = function (result) {
                    that.set(result);   // Update model
                    sf(result);
                };
                this.proxy.createWFNotificationRule(wfNotificationRule, success, ff, cf);
                break;
            case 'update':
                success = function (result) {
                    that.set(result);   // Update model
                    sf(result);
                };
                this.proxy.updateWFNotificationRule(wfNotificationRule, success, ff, cf);
                break;
            case 'delete':
                if (this.get('Id') === Constants.c.emptyGuid) {
                    ff(undefined, undefined, { Message: Constants.c.cannotDeleteNew });
                }
                else {
                    this.proxy.deleteRule(this.get('Id'), sf, ff, cf);
                }
                break;
        }
    },
    ///<summary>
    /// Prepare for saving/running
    ///</summary>
    prepRule: function () {
        var wfNotificationRule = this.toJSON();
        if (!wfNotificationRule.OwnerId) {
            wfNotificationRule.OwnerId = Utility.getCurrentUser().Id;
        }
        // Stringify the schedule
        wfNotificationRule.Schedule = JSON.stringify(wfNotificationRule.Schedule);
        // Is not detailed, so remove unneeded data
        if (!wfNotificationRule.IsDetailed) {
            delete wfNotificationRule.Columns;
            delete wfNotificationRule.Sort;
            delete wfNotificationRule.SortDescending;
        }
        delete wfNotificationRule.LastModified; // No need to pass up this value, it is updated server side
        return wfNotificationRule;
    },
    ///<summary>
    /// Obtain schedule data and parse it, if it exists
    ///</summary>
    getSchedule: function () {
        var schedule = this.get('Schedule');
        return Utility.tryParseJSON(schedule);
    },
    ///<summary>
    /// Obtain columns
    ///</summary>
    getColumns: function () {
        var cols = this.get('Columns');
        return Utility.tryParseJSON(cols, true);
    },
    ///<summary>
    /// Run the notification rule as it currently is
    ///</summary>
    runNowNotificationRule: function (options) {
        options = options || {};
        var ff = function (jqXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var cf = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
        var wfNotificationRule = this.prepRule();
        this.proxy.runNowNotificationRule(wfNotificationRule, sf, ff, cf);
    }
});