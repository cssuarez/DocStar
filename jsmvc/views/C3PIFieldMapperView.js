/// <reference path="../../Content/JSProxy/AutomationHubProxy.js" />
/// <reference path="~/Content/LibsInternal/ClientService.js" />
var C3PIFieldMapperView = Backbone.View.extend({
    events: {
        "click fieldset legend": "toggleFieldset"
    },
    mappings: null,
    'arguments': null,
    initialize: function (options) {
        this.mappings = (options && options.mappings) || [];
        this.isDirtyCallback = options && options.isDirtyCallback;
        this.compiledTemplate = doT.template(Templates.get('c3pimapperlayout'));
        return this;
    },
    render: function () {
        var that = this;
        if (!this['arguments']) {
            var sf = function (data) {
                that['arguments'] = data;
                that.render();
            };
            var ff = function (jqXHR, textStatus, bizEx) {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                ErrorHandler.addErrors(bizEx.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            DataLinkServiceProxy(true).getAllArguments(Constants.c3p.eConnect, sf, ff);
        }

        // create render object from mappings and arguments
        var renderObj = {
            fields: window.customFieldMetas.models,
            args: []
        };
        if (this['arguments']) {
            var fieldChanged = false;
            var idx;
            var length = this['arguments'].length;
            for (idx = 0; idx < length; idx++) {
                var arg = this['arguments'][idx];
                var aName = arg.Key || arg.key; // getAllArguments originally returned a dictionary, then sorted KeyValue pairs.  The latter was lower case.  This makes the UI accept either.
                var type = arg.Value || arg.value;
                var selectedField = this.mappings[aName] || null;
                var fldIdx;
                var fldLen;
                var fName;
                if (!selectedField) {
                    // auto-select a field if none was specified and there is a field with matching name
                    fldLen = window.customFieldMetas.models.length;
                    for (fldIdx = 0; fldIdx < fldLen; fldIdx++) {
                        fName = window.customFieldMetas.models[fldIdx].get('Name');
                        if (aName.toUpperCase() === fName.toUpperCase() || aName.toUpperCase() === "@" + fName.toUpperCase()) {
                            fieldChanged = true;
                            selectedField = fName;
                            break;
                        }
                    }
                } else {
                    // validate selected field; clear the selection if it doesn't match an existing field name
                    fldLen = window.customFieldMetas.models.length;
                    for (fldIdx = 0; fldIdx < fldLen; fldIdx++) {
                        fName = window.customFieldMetas.models[fldIdx].get('Name');
                        if (selectedField === fName) {
                            break;
                        } else if (selectedField.toUpperCase() === fName.toUpperCase()) {
                            selectedField = fName; // correct the case
                            fieldChanged = true;
                            break;
                        }
                    }
                    if (fldIdx >= fldLen) {
                        // not found
                        selectedField = null;
                        fieldChanged = true;
                    }
                }
                renderObj.args.push({ Name: aName, Type: type, Field: selectedField });
            }
            if (fieldChanged) {
                this.isDirty();
            }
        }
        this.$el.html(this.compiledTemplate(renderObj));
        return this;
    },
    isDirty: function () {
        if (this.isDirtyCallback) {
            this.isDirtyCallback();
        }
    },
    toggleFieldset: function (event) {
        ShowHideUtil.toggleFieldset(event, true);
    }
});