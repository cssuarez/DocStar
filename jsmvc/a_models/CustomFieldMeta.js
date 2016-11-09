var CustomFieldMeta = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};
        if (attrs.Name !== undefined) {
            if (attrs.Name.length === 0) {
                msg.Name = Constants.c.nameEmptyWarning;
            } else {
                var y = window.customFieldMetas.find(function (e) {
                    if ($.trim(attrs.Name) === $.trim(e.get('Name')) && (attrs.Id !== e.get('Id'))) {
                        return true;
                    }
                });
                if (y) {
                    msg.Name = Constants.c.duplicateNameError;
                }
            }
        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    sync: function (method, model, options) {
        var ff = function (jqXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.wait = false;
                options.success(result);
            }
        };
        var proxy = CustomFieldProxy({ skipStringifyWcf: true, raiseOverridableException: options.raiseOverridableException });
        switch (method) {
            case 'create':
                var attrs = model && model.attributes ? model.attributes : model;
                attrs.Id = Constants.c.emptyGuid;
                proxy.createCustomField(attrs, sf, ff, complete, null, options.headers);
                break;
            case 'update':
                proxy.updateCustomField(model, sf, ff, complete, null, options.headers);
                break;
            case 'delete':
                var id = model.get('Id');
                proxy.deleteCustomField(id, sf, ff, complete, null, options.headers);
                break;
        }
    },
    isNumber: function () {
        var type = this.get('Type');
        return type === Constants.ty.Int16 || type === Constants.ty.Int32 || type === Constants.ty.Int64 || type === Constants.ty.Double || type === Constants.ty.Decimal;
    },
    isDecimal: function () {
        var type = this.get('Type');
        return type === Constants.ty.Decimal;
    },
    ///<summary>
    /// Create an object for a custom field
    ///<param name="isNew">Whether the custom field meta Id should be an empty guid or this model's id</param>
    ///</summary>
    createValueObject: function (isNew) {
        var obj;
        if (isNew) {
            obj = { CustomFieldMetaId: Constants.c.emptyGuid, CustomFieldName: '', TypeCode: Constants.ty.String };
        }
        else {
            obj = { CustomFieldMetaId: this.get('Id'), CustomFieldName: this.get('Name'), TypeCode: this.get('Type'), CustomFieldFormat: this.get('DisplayFormat') };
        }
        if (obj.TypeCode === Constants.ty.Boolean) {
            obj.BoolValue = false;
        }
        obj.Id = Utility.getSequentialGuids(1)[0];
        return obj;
    },
    ///<summary>
    /// Map field type to a form tag
    ///<param name="asText">convert the form tag to its text representation from its integer value</param>
    ///</summary>
    mapTypeToFormTag: function (asText) {
        var type = this.get('Type');
        var tag;
        switch (type) {
            case Constants.ty.Boolean:
                tag = Constants.ft.CheckBox;
                break;
            case Constants.ty.Decimal:
            case Constants.ty.Double:
            case Constants.ty.Int16:
            case Constants.ty.Int32:
            case Constants.ty.Int64:    // Intentional fall throughs
                tag = Constants.ft.NumberInput;
                break;
            case Constants.ty.Date:
                tag = Constants.ft.Date;
                break;
            case Constants.ty.DateTime:
                tag = Constants.ft.DateTime;
                break;
            case Constants.ty.Object:
                tag = Constants.ft.Select;
                break;
            case Constants.ty.String:   // Intentional fall through
                tag = Constants.ft.TextInput;
                break;
            default:
                tag = Constants.ft.TextInput;
        }
        if (asText) {
            var rmoFT = Utility.reverseMapObject(Constants.ft);
            tag = rmoFT[tag];
        }
        return tag;
    }
});