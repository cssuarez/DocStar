var InputUtil = {
    isEdit: false,
    validateListDuplicates: function (listItems) {
        var duplicated = [];
        var length = listItems.length;
        var i, j, k;
        if (length > 0) {
            for (i = 0; i < length - 1; i++) {
                var currListItem = listItems[i];
                if (currListItem !== "") {
                    var flag = true;
                    for (j = i + 1; j < length; j++) {
                        if ($.trim(currListItem.toLowerCase()) === $.trim(listItems[j].toLowerCase())) {
                            flag = false;
                        }
                    }
                    for (k = 0; k < duplicated.length; k++) {
                        if (duplicated[k].toLowerCase() === $.trim(currListItem.toLowerCase())) {
                            flag = true;
                        }
                    }
                    if (!flag) {
                        duplicated.push($.trim(currListItem));
                    }
                }
            }
        }
        length = duplicated.length;
        var duplicateValues = '';
        if (length > 0) {
            duplicateValues = duplicated[0];
            for (k = 1; k < length; k++) {
                duplicateValues += ", " + duplicated[k];
            }
            duplicateValues += ".";
        }
        return duplicateValues;
    },
    underscoreCheck: function (name, check) {
        if (name.indexOf("_") >= 0) {
            if (!check) {
                check = [];
            }
            check.push("_");
        }
        return check;
    },
    textRangeCheck: function (minNum, maxNum, textVal) {
        textVal = parseInt(textVal, 10);
        minNum = parseInt(minNum, 10);
        maxNum = parseInt(maxNum, 10);
        // Only allow numbers
        if (isNaN(textVal)) {
            textVal = minNum;
            return textVal;
        }
        if (textVal < minNum || minNum > maxNum) {
            textVal = minNum;
            return textVal;
        }
        if (textVal > maxNum) {
            textVal = maxNum;
            return textVal;
        }
        if (textVal >= minNum && textVal <= maxNum) {
            return textVal;
        }
    },
    /*
        sid: grid selection id
        e: event for grid selection
        selector: grid selector
    */
    gridSelection: function (sid, e, selector) {
        var grid = $(selector);
        var ts = grid[0], td = e.target;
        var sel = grid.getGridParam('selarrrow');
        var selected = $.inArray(sid, sel) >= 0;

        if (e.ctrlKey) {
            grid.jqGrid('setSelection', sid, true);
        } else if (e.shiftKey) {
            var six = grid.getInd(sid);
            var min = six, max = six;
            // Determine the minimum and maximum in the selected rows.
            $.each(sel, function (item) {
                var ix = grid.getInd(sel[item]);
                if (ix < min) {
                    min = ix;
                }
                if (ix > max) {
                    max = ix;
                }
            });
            // loop through selection
            while (min <= max) {
                var row = ts.rows[min++];
                var rid = row.id;
                if (rid !== sid && $.inArray(rid, sel) < 0) {
                    grid.jqGrid('setSelection', row.id, false);
                }
            }
            if (!selected) {
                grid.jqGrid('setSelection', sid, true);
            }
        } else if ($(td).is('input')) {
            grid.jqGrid('setSelection', sid, true);
        } else {
            grid.resetSelection();
            grid.jqGrid('setSelection', sid, true);
        }
    },
    /*
        Highlight all text inside @input
        @input: html input selector to highlight text of
        @inputValue: highlight only when this value is present
    */
    selectText: function (input, inputValue) {
        if (!inputValue || $(input).val() === inputValue) {
            $(input).select().one('mouseup', function (e) {
                $(input).unbind('keyup');
                e.preventDefault();
            }).one('keyup', function () {
                $(input).select().unbind('mouseup');
            });
        }
    },
    checkPageRange: function (e) {
        var key = e.charCode || e.keyCode || 0;
        key = parseInt(key, 10);
        // allow backspace, tab, delete, arrows, numbers, and enter!
        // and keypad numbers ONLY
        return (
          key === 8 ||
          key === 9 ||
          key === 13 ||
          key === 46 ||
          (key >= 37 && key <= 40) ||
          (key >= 48 && key <= 57) ||
          (key >= 96 && key <= 105));
    }
};