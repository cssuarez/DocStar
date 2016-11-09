
var DateUtil = {
    // the number of .net ticks at the unix epoch
    epochTicks: goog.math.Long.fromString('621355968000000000', 10),
    // there are 10000 .net ticks per millisecond
    ticksPerMillisecond: goog.math.Long.fromNumber(10000),

    //Convert from date obtained from server (C#) to display date to client (javascript)
    /*
        Display Date to the User
    */
    convertToJSDate: function (date, format) {
        if (!format) {
            format = "general";
        }
        var jsDate = new Date();
        // Obtain milliseconds
        if (date) {
            date = date.slice(date.indexOf('(') + 1, date.indexOf(')'));
            if (!isNaN(date) && parseInt(date, 10) > 0) {
                jsDate.setTime(date);
            }
            else {
                jsDate = new Date(date);
            }
            if (!isNaN(jsDate)) {
                jsDate = jsDate.format(format);
            } else {
                jsDate = '';
            }
        }
        else {
            jsDate = '';
        }
        return jsDate;
    },
    /*
        Display Date and Time to the User
    */
    convertToJSDatetime: function (date) {
        var jsDate = new Date();
        // Obtain milliseconds
        if (date) {
            date = date.slice(date.indexOf('(') + 1, date.indexOf(')'));
            if (!isNaN(date) && parseInt(date, 10) > 0) {
                jsDate.setTime(date);
            }
            else {
                jsDate = new Date(date);
            }
            if (!isNaN(jsDate)) {
                jsDate = jsDate.format("general");
            } else {
                jsDate = '';
            }
        }
        else {
            jsDate = '';
        }
        return jsDate;
    },
    isDate: function (val) {
        var d = new Date(val).valueOf();
        return !isNaN(d) && d >= new Date(Constants.DateTimeMin).valueOf() && d <= new Date(Constants.DateTimeMax).valueOf();
    },
    isTime: function (val) {
        return String(val).match(/^\s*\d{1,2}(:|\.)?\d{0,2}\s*(am|pm|a|p)?\s*$/i);
    },
    validateTime: function (timeval) {
        var isValid = timeval.match(/^(0?[1-9]|1[012])(:[0-5]\d) [APap][mM]$/);
        return isValid !== undefined && isValid !== null ;
    },
    dotNetTicks: function (date) {
        if (!date) {
            date = new Date();
        }
        var jticks = goog.math.Long.fromNumber(date.getTime());
        var dnt = DateUtil.epochTicks.add(jticks.multiply(DateUtil.ticksPerMillisecond));
        return dnt.toString(10);
    }
};
Date.prototype.toMSJSON = function () {
    var x = this;
    var off = x.getTimezoneOffset();
    var sign = off > 0 ? '+' : '-';
    off = Math.abs(off) / 60;
    return '\/Date(' + Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes(), x.getUTCSeconds(), x.getUTCMilliseconds()) +
         sign + (off < 10 ? '0' : '') + off * 100 + ')\/';
};
/*
(c) 2008-2011 Rick Strahl, West Wind Technologies 
www.west-wind.com

Licensed under MIT License
http://en.wikipedia.org/wiki/MIT_License
*/
// set up a global filter to always parse JSON with
// date formatting applied
$.ajaxSetup({
    converters: {
        "text json": function (jsonString) {
            var res = JSON.parseWithDate(jsonString);
            if (res && res.hasOwnProperty("d")) {
                res = res.d;
            }
            return res;
        }
    }
});
if (this.JSON) {
    // ISO date time
    var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.?(\d*?)Z$/;
    // MS date time
    var reMsAjax = /^\/Date\((d|-|.*)\)[\/|\\]$/;
    // Eclipse Date display format
    var dateTimeDisplayFormat = new RegExp(/^(\d+)\/(\d+)\/(\d+)\s(\d+):(\d+):(\d+)\s\S+/);
    if (!this.JSON.parseWithDate) {
        JSON.parseWithDate = function (json) {
            /// <summary>
            /// parses a JSON string and turns ISO or MSAJAX date strings
            /// into native JS date objects
            /// </summary>    
            /// <param name="json" type="var">json with dates to parse</param>
            /// <returns type="value, array or object" />
            try {
                var res = JSON.parse(json,
                function (key, value) {
                    if (typeof value === 'string') {
                        var a = reISO.exec(value);
                        if (a) {
                            // 2013-06-10 : updated by Sean Cain to return the date as a string rather than a js date
                            var d = new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
                            try {
                                var fd = d.format('general');
                                // 2013-06-12: Sean Cain if the date can be formatted but it returns date time min, return '' instead
                                if (fd === '1/1/01 12:00:00 AM') {
                                    return '';
                                }
                                return fd;
                            } catch (dateFormatErr) {
                                // 2013-06-12: Sean Cain if the date can't be formatted just return the non-formatted date
                                return d;
                            }
                        }
                        a = reMsAjax.exec(value);
                        if (a) {
                            var b = a[1].split(/[\-+,.]/);
                            // 2013-06-10 : updated by Sean Cain to return the date as a string rather than a js date
                            var c = new Date(b[0] ? +b[0] : -b[1]);
                            try {
                                return c.format('general');
                            } catch (dateFormatErr2) {
                                // 2013-06-12: Sean Cain if the date can't be formatted return the non-formatted date
                                // if the date can't be formatted because the time to try to format is a negative value, return ''.
                                if (parseInt(a[1], 10) < 0) {
                                    return ''; // The date is date time min
                                }
                                return c;
                            }
                        }
                    }
                    return value;
                });
                return res;
            } catch (e) {
                try {
                    return JSON.parse(json);
                } catch (ee) {
                    // orignal error thrown has no error message so rethrow with message
                    throw new Error("JSON content could not be parsed");
                }
            }
        };
    }
    if (!this.JSON.stringifyWcf) {
        JSON.stringifyWcf = function (json) {
            /// <summary>
            /// Wcf specific stringify that encodes dates in the
            /// a WCF compatible format ("/Date(9991231231)/")
            /// Note: this format works ONLY with WCF. 
            ///       ASMX can use ISO dates as of .NET 3.5 SP1
            /// </summary>
            /// <param name="key" type="var">property name</param>
            /// <param name="value" type="var">value of the property</param>         
            return JSON.stringify(json, function (key, value) {
                if (typeof value === "string") {
                    var a = reISO.exec(value);
                    var val;
                    if (a) {
                        var d = new Date(value);
                        var offset = -(new Date('1/1/2009').getTimezoneOffset() / 60);
                        var operator = '+';
                        if (offset < 0) {
                            operator = ''; //Operator of - taken from the fact that it is already made into a negative number.
                        }
                        val = '/Date(' + d.getTime() + operator + offset + ')/';
                        this[key] = val;
                        return val;
                    }
                }
                return value;
            });
        };
    }
    if (!this.JSON.dateStringToDate) {
        JSON.dateStringToDate = function (dtString) {
            /// <summary>
            /// Converts a JSON ISO or MSAJAX string into a date object
            /// </summary>    
            /// <param name="" type="var">Date String</param>
            /// <returns type="date or null if invalid" /> 
            var a = reISO.exec(dtString);
            if (a) {
                return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]));
            }
            a = reMsAjax.exec(dtString);
            if (a) {
                var b = a[1].split(/[\-+,.]/);
                return new Date(b[0] ? +b[0] : -b[1]);
            }
            return null;
        };
    }
    if (!this.JSON.displayDateToMSJSONDate) {
        JSON.displayDateToMSJSONDate = function (json) {
            return JSON.stringify(json, function (key, value) {
                if (typeof value === 'string') {
                    var a = dateTimeDisplayFormat.exec(value);
                    if (a) {
                        var val = new Date(value);
                        return val.toMSJSON();
                    }
                }
                return value;
            });
        };
    }
}