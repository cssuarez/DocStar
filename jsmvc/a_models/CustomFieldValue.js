var CustomFieldValue = Backbone.Model.extend({
    dateTimeFields: { DateTimeValue: true },
    idAttribute: 'Id',
    cfProxy: new CustomFieldProxy({ skipStringifyWcf: true }),
    validate: function (attrs) {
        var msg = {};
        attrs = !attrs ? this.attributes : attrs;
        var type = this.get('TypeCode') || attrs.TypeCode;
        if (!type) {
            return;
        }
        var isValid = true;
        var val = '';
        switch (type) {
            case Constants.ty.Boolean:  // bool
                isValid = true;
                break;
            case Constants.ty.Int32:    // integer
                val = attrs.IntValue;
                if (!val) {
                    break;
                }
                // Convert to a number and compare due to possible conversion to scientific notation
                var intVal = Number(val);
                if (isNaN(val) || intVal > Number(Constants.IntMax) || intVal < Number(Constants.IntMin)) {
                    isValid = false;
                }
                break;
            case Constants.ty.Int64:    // long
                val = attrs.LongValue;
                if (!val) {
                    break;
                }
                // Convert to a number and compare due to possible conversion to scientific notation
                var longVal = Number(val);
                if (isNaN(val) || longVal > Number(Constants.LongMax) || longVal < Number(Constants.LongMin)) {
                    isValid = false;
                }
                break;
            case Constants.ty.Double:
            case Constants.ty.Decimal:  // decimal/double/real
                val = attrs.DecimalValue;
                if (!val) {
                    break;
                }
                val = val.toString();
                if (isNaN(val)) {
                    isValid = false;
                    break;
                }
                type = Constants.ty.Decimal;
                // we allow a total of 19 characters, up to 14 before and 5 after decimal
                var splitVal = val.split('.');
                var beforeDec = splitVal[0];
                var afterDec = splitVal[1];
                var beforeDecLen = beforeDec.length;
                var afterDecLen = afterDec ? afterDec.length : 0;
                var maxLen = 19;
                var maxRight = 5;
                var maxLeft = maxLen - maxRight;
                if (beforeDec.startsWith('-')) {
                    beforeDecLen -= 1;
                }
                var valLen = beforeDecLen + afterDecLen;
                if (valLen > maxLen || beforeDecLen > maxLeft || afterDecLen > maxRight) {
                    isValid = false;
                }
                break;
            case Constants.ty.Date: // Date
            case Constants.ty.DateTime: // DateTime
                val = attrs.DateValue;
                if (type === Constants.ty.DateTime) {
                    val = attrs.DateTimeValue;
                }
                if (!!val) {
                    isValid = DateUtil.isDate(JSON.parseWithDate(JSON.stringify(val)));
                    break;
                }
                break;
            case Constants.ty.Object:   // list
            case Constants.ty.String:   // string
                isValid = true;
                break;
            default:
        }
        if (!isValid) {
            var revTY = Utility.reverseMapObject(Constants.ty);
            msg.ValueError = String.format(Constants.c.invalidValue, Constants.c['ty_' + revTY[type]]);
        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    sync: function (method, model, options) {
        //Sync must exist even though it does nothing, otherwise backbone will attempt to save on destroy and other calls.
        switch (method) {
            case "create":
                break;
            case "read":
                break;
            case "update":
                break;
            case "delete":
                break;
        }
    },
    /// <summary>
    /// Return whether or not the custom field has a value
    /// </summary>
    hasValue: function () {
        var cfVal = this.getValue();
        return cfVal !== undefined && cfVal !== null && cfVal.toString() && cfVal.toString().length > 0;
    },
    /// <summary>
    /// Get the value of the custom field from one of its type specific properties.
    /// </summary>
    getValue: function () {
        //JSValue: String representation of CF Val, required in JS as numerics: Integers (numbers without a period or exponent notation) are considered accurate up to 15 digits.The maximum number of decimals is 17. 
        //The only types that can exceed this is Int64 and Decimal
        var val;
        var typeCode = this.get('TypeCode');
        switch (typeCode) {
            case Constants.ty.Boolean:  // bool
                val = this.get('BoolValue');
                break;
            case Constants.ty.Int32:    // integer
                val = this.get('IntValue');
                break;
            case Constants.ty.Int64:    // long
                val = this.get('JSValue') || this.get('LongValue');
                break;
            case Constants.ty.Decimal:  // real, decimal
                val = this.get('JSValue') || this.get('DecimalValue');
                break;
            case Constants.ty.Date: // Date
                val = this.formatDateValue(this.get('DateValue'));
                break;
            case Constants.ty.DateTime: // Date time
                val = this.formatDateTimeValue(this.get('DateTimeValue'));
                break;
            case Constants.ty.Object:   // list
            case Constants.ty.String:   // string
                val = this.get('StringValue');
                break;
            default:
                val = this.get('StringValue');
                break;
        }
        return val; //This should return undefined if no value is set, this is used when testing if this model should be saved when sent to the server.
    },
    /// <summary>
    /// Returns the display value for a custom field, if none is found an emtpy string is returned.
    /// </summary>
    getDisplayValue: function () {
        var value = this.get('DisplayValue');
        if (value === undefined || value === null) {
            value = '';
        }
        return value;
    },
    formatDateValue: function (val) {
        if (val) {
            if (DateUtil.isDate(val)) {
                val = new Date(val).format('generalDateOnly');
            }
        }
        return val;
    },
    formatDateTimeValue: function (val) {
        var convertedDateFromMSJONDate = JSON.dateStringToDate(val);
        if (convertedDateFromMSJONDate) {
            val = convertedDateFromMSJONDate.format('general');
        }
        return val;
    },
    /// <summary>
    /// Sets the value of the custom field to one of its type specific properties.
    /// This will also update the display value.
    /// </summary>
    setValue: function (val, options) {
        var that = this;
        var cfv = this.toJSON();

        if (val === undefined && options && options.createWithDefault) {
            val = this.getDefaultValue(cfv.TypeCode);
        }

        cfv.IntValue = null;
        cfv.BoolValue = null;
        cfv.LongValue = null;
        cfv.DecimalValue = null;
        cfv.DateValue = null;
        cfv.DateTimeValue = null;
        cfv.StringValue = null;
        cfv.JSValue = val;
        this.setValueSwitch(cfv, val);
        var isNotValid = this.validate(cfv); // validate the model before continuing
        if (isNotValid) {
            cfv.DisplayValue = isNotValid.ValueError;
            this.set(cfv, { silent: true });    // set the value in the model
            this.trigger('invalid', this, isNotValid, options);
            if (options && options.callBack) {
                Utility.executeCallback(options.callBack);
            }
            return;
        }
        if (this.get('CustomFieldFormat') && val.length !== 0) {
            //Has a format code, send to the server to be formatted.
            var currentVal = this.getValue();
            currentVal = currentVal ? currentVal.toString() : currentVal;
            if (currentVal !== val) {
                var sf = function (result) {
                    that.set({ 'DisplayValue': result }, options);
                    if (options && options.callBack) {
                        Utility.executeCallback(options.callBack);
                    }
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.popUpMessage(errorThrown);
                };
                this.set(cfv, { skipRender: true });
                this.cfProxy.getDisplayValue(cfv, sf, ff);
            }

        } else {
            cfv.DisplayValue = val;
            if (cfv.TypeCode === Constants.ty.Date) {
                cfv.DisplayValue = this.formatDateValue(val);
            }
            else if (cfv.TypeCode === Constants.ty.DateTime) {
                cfv.DisplayValue = this.formatDateTimeValue(val);
            }
            this.set(cfv, options);
            if (options && options.callBack) {
                Utility.executeCallback(options.callBack);
            }
        }
    },
    /// <summary>
    /// Sets an appropriate default value based on the field type
    /// Used on save for fields without a defined value that are a part of a group.
    /// </summary>
    setDefaultValue: function (options) {
        var val = this.getDefaultValue(this.get('TypeCode'));
        this.setValue(val, options);
    },
    /// <summary>
    /// Returns an appropriate value based on the type.
    /// </summary>
    getDefaultValue: function (type) {
        var val;
        switch (type) {
            case Constants.ty.Boolean:  // bool
                val = false;
                break;
            case Constants.ty.Int32:    // integer
            case Constants.ty.Int64:    // long
            case Constants.ty.Decimal:  // decimal/double
                val = 0;
                break;
            case Constants.ty.Date: // Date
            case Constants.ty.DateTime: // DateTime    
                val = new Date().format('generalDateOnly');
                break;
            case Constants.ty.Object:   // list
            case Constants.ty.String:   // string
                val = ' ';
                break;
            default:
                val = ' ';
                break;
        }
        return val;
    },
    /// <summary>
    /// setValue type switched shared in a couple of methods here.
    /// </summary>
    setValueSwitch: function (cfv, value) {
        var intVal = parseInt(value, 10);
        var decVal = parseFloat(value);
        if (isNaN(intVal) && (cfv.TypeCode === Constants.ty.Int32 || cfv.TypeCode === Constants.ty.Int64)) {
            intVal = null;
            cfv.JSValue = null;
        }
        if (isNaN(decVal) && cfv.TypeCode === Constants.ty.Decimal) {
            decVal = null;
            cfv.JSValue = null;
        }
        switch (cfv.TypeCode) {
            case Constants.ty.Boolean:  // bool
                cfv.BoolValue = Utility.convertToBool(value);
                break;
            case Constants.ty.Int32:    // integer
                cfv.IntValue = intVal !== null ? intVal : value;
                break;
            case Constants.ty.Int64:    // long
                cfv.LongValue = intVal !== null ? intVal : value;
                break;
            case Constants.ty.Decimal:  // decimal/double
                cfv.DecimalValue = decVal !== null ? decVal : value;
                break;
            case Constants.ty.Date: // Date
                cfv.DateValue = value;
                break;
            case Constants.ty.DateTime: // DateTime
                cfv.DateTimeValue = DateUtil.isDate(value) ? JSON.parse(JSON.stringifyWcf(new Date(value))) : value;
                break;
            case Constants.ty.Object:   // list
            case Constants.ty.String:   // string
                cfv.StringValue = value;
                break;
            default:
                cfv.StringValue = value;
        }
    },
    /// <summary>
    /// Check to see if this field is in a group.
    /// </summary>
    isInGroup: function () {
        return !!this.get('CustomFieldGroupId');
    },
    /// <summary>
    /// Check to see if this field is a type that can be totaled.
    /// </summary>
    canBeTotaled: function () {
        var type = this.get('TypeCode');

        return type === Constants.ty.Int32 || type === Constants.ty.Int64 || type === Constants.ty.Decimal;
    },
    /// <summary>
    /// Method to get the display value for a passed in value based on this fields format.
    /// </summary>
    generateDisplayValue: function (value, options) {
        options = options || {};
        if (!this.get('CustomFieldFormat')) {
            Utility.executeCallback(options.success, this.getValue());
        }

        var displayValue = '';
        var sf = function (result) {
            Utility.executeCallback(options.success, result);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            if (options.failure) {
                options.failure(jqXHR, textStatus, errorThrown);
            }
            else {
                ErrorHandler.popUpMessage(errorThrown);
            }
        };
        var cfv = this.toJSON();
        this.setValueSwitch(cfv, value);
        this.cfProxy.getDisplayValue(cfv, sf, ff);
    },
    /// <summary>
    /// Test to see if the custom field value is a date type
    /// </summary>
    isDate: function () {
        var tc = this.get('TypeCode');
        return tc === Constants.ty.DateTime || tc === Constants.ty.Date;
    }
});