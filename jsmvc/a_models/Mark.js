var Mark = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    sync: function (method, model, options) {
        options.method = method;
        switch (method) {
            case "read":
                if (options.markXML) {
                    this.getNewFromXML(options);
                } else if (options.redaction) {
                    this.getNewRedaction(options);
                } else {
                    this.getNew(options);
                }
                break;
            case "create":
            case "update":
            case "delete":
                break;
        }
    },
    getNew: function (options) {
        $.ajax({
            url: Constants.Url_Base + "Annotations/NewMark",
            data: { type: this.get('Type') },
            type: "GET",
            async: false,
            contentType: "application/json",
            success: function (result) {
                if (result.status === 'ok') {
                    result.result.isDirty = true; //All new marks are dirty
                    options.success(result.result);
                }
                else {
                    ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
    },
    getNewRedaction: function (options) {
        var rect = this.get('Rectangle');
        $.ajax({
            url: Constants.Url_Base + "Annotations/GetNewRedaction",
            data: { Rectangle: rect },
            type: 'get',
            async: false,
            success: function (result) {
                if (result.status === 'ok') {
                    result.result.isDirty = true; //All new marks are dirty
                    options.success(result.result);
                }
                else {
                    ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
    },
    getNewFromXML: function (options) {    // Get mark data (json) from mark xml
        $.ajax({
            url: Constants.Url_Base + "Annotations/GetMarkFromMarkXML",
            data: { markXML: encodeURI(options.markXML) },
            type: "GET",
            async: false,
            contentType: "application/json",
            success: function (result) {
                if (result.status === 'ok') {
                    result.result.isDirty = true; //All new marks are dirty
                    result.result.Id = Utility.getSequentialGuids(1)[0];
                    options.success(result.result);
                }
                else {
                    ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
    }
});