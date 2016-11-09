// Model of FieldSearchCriteria.cs
var FieldCriterion = Backbone.Model.extend({
    dateTimeFields: {},
    defaults: { Concatenation: 1, GroupConcatenation: 1 },
    validate: function (attrs, dateRange) {
        var msg = {};
        attrs = !attrs ? this.attributes : attrs;
        var type = this.get('Type') || attrs.Type;
        if (!type) {
            return;
        }
        var isValid = true;
        var val = '';
        switch (type) {
            case 'Int32':    // integer
                val = attrs.DatabaseFieldValue;
                if (!val) {
                    break;
                }
                if (parseInt(val, 10) > Constants.IntMax || parseInt(val, 10) < Constants.IntMin) {
                    isValid = false;
                }
                break;
            case 'Int64':    // long
                val = attrs.DatabaseFieldValue;
                if (!val) {
                    break;
                }
                if (parseInt(val, 10) > Constants.LongMax || parseInt(val, 10) < Constants.LongMin) {
                    isValid = false;
                }
                break;
            case 'Double':
            case 'Decimal':  // decimal/double/real
                val = attrs.DatabaseFieldValue;
                if (!val) {
                    break;
                }
                val = val.toString();
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
            case 'Date': // Date
            case 'DateTime': // DateTime                
                val = attrs.DatabaseFieldValue;
                if (type === Constants.ty.DateTime) {
                    val = attrs.DateTimeValue;
                }
                // Work around bug #13090
                // If value is date range join with ' - ', split value and validate both values fromDate and toDate. 
                var valArr = [];
                valArr = val.split(' - ');
                if (!valArr) {
                    valArr.push(val);
                }
                var length = valArr.length;
                var i = 0;
                if (dateRange && length === 2) {
                    var index = dateRange === "rangeStart" ? 0 : 1;
                    valArr = valArr.splice(index, 1);
                    length = 1;
                }
                for (i; i < length; i++) {
                    val = JSON.parseWithDate(JSON.stringify(valArr[i]));  // attempt to convert from msjsondate if need be, otherwise just the val should be returned
                    if (!val) {
                        break;
                    }
                    isValid = DateUtil.isDate(val);                    
                    if (!isValid) {
                        break;
                    }
                }
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
    setValue: function (val, options) {
        this.set({ DatabaseFieldValue: val });    // set the value in the model
        var df = this.toJSON();
        var isNotValid = this.validate(df); // validate the model before continuing
        if (isNotValid) {
            this.trigger('invalid', this, isNotValid, options);
            if (options && options.callBack) {
                Utility.executeCallback(options.callBack);
            }
            return;
        }
    }
});