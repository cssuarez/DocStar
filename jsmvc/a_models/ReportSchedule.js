var ReportSchedule = Backbone.Model.extend({
    dateTimeFields: { ExecutionTime: true },
    idAttribute: 'Id',
    proxy: ReportingProxy({ skipStringifyWcf: true }),
    initialize: function (options) {
        if (options !== undefined) {
            if (options.Schedule !== undefined) {
                var schedule = Utility.tryParseJSON(options.Schedule, true);
                if (schedule) {
                    this.set({ Schedule: schedule });
                }
            }
        }
    },
    validate: function (attrs) {
        // This function executes when you call model.save()
        var errors = {};
        if (!attrs.Frequency) {
            errors.FrequencyValidation = Constants.c.userInputException;
        }
        if (!attrs.ExecutionTime) {
            errors.ExecutionTimeValidation = Constants.c.scheduleExecutionTimeException;
        }
        if (attrs.Status === undefined || attrs.Status === null) {
            errors.Status = Constants.c.scheduleActiveException;
        }
        if (!attrs.Recipients) {
            errors.Recipients = Constants.c.userInputException;
        }
        else {
            attrs.Recipients = this.fixRecipientSpacing(attrs.Recipients);
            var validateEmailAddress = Utility.areValidEmailAddresses(attrs.Recipients, "Recipients", Constants.c.invalidEmailAddress, true);
            if (validateEmailAddress !== true) {
                errors.Recipients = validateEmailAddress;
            }
        }
        if (!attrs.ExecutionType) {
            errors.ExecutionTypeValidation = Constants.c.invalidReportExecutionFrequency;
        }
        if (!$.isEmptyObject(errors)) {
            return errors;
        }
    },
    fixRecipientSpacing: function (recipients) {
        var addresses = recipients.split(';');
        var i = 0;
        var length = addresses.length;
        for (i = 0; i < length; i++) {
            addresses[i] = $.trim(addresses[i]);
        }
        return addresses.join(';');
    },
    sync: function (method, model, options) {
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
        switch (method) {
            case 'create':
                this.proxy.createReportSchedule(model.toJSON(), sf, ff, complete);
                break;
            case 'update':
                this.proxy.updateReportSchedule(model.toJSON(), sf, ff, complete);
                break;
            case 'delete':
                this.proxy.deleteReportSchedule(model.get('Id'), sf, ff, complete);
                break;
        }
    }
});