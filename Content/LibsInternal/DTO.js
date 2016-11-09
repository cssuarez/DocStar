/// <reference path="Utility.js" />
/*
* As long as your DTOs can be selected with a clever css selector this class is your friend
* examples: $('.inputs'), $('#form input')...etc
*/
var DTO = {
    tags: ['input', 'select', 'textarea'],
    options: {},
    //Used for DTO elements that contain a combo box that represents both the ID and Name (IE DataLink, ContentType pages)
    getDTOCombo: function (el, tags, allowSaveAs, properties) {
        properties = properties || {};
        var selectName = properties.selectName || "Name";
        var selectId = properties.selectId || "Id";
        var $select = $(el).find('select[name="' + selectName + '"]');
        var dto = DTO.getDTO(el, tags);
        var name = $select.parent().find('.ui-combobox input').val();
        dto[selectName] = name;
        dto[selectId] = DTO.getComboBoxIdByName(name, $select, allowSaveAs);
        return dto;
    },
    getDTO: function (el, tags) {
        tags = (tags === undefined) ? DTO.tags : tags;
        var item;
        var obj = {};
        for (item in tags) {
            if (tags.hasOwnProperty(item) && tags[item] !== 0) {
                if (item !== undefined) {
                    $.extend(obj, window.DTO[tags[item]](el));
                }
            }
        }
        return obj;
    },
    // For basic setting of DTO data in UI
    setDTO: function (el, data) {
        var datum;
        for (datum in data) {
            if (data.hasOwnProperty(datum)) {
                var value = data[datum];
                var input = $(el).find('[name="' + datum + '"]');
                var inputType = input.attr('type');
                if (inputType === 'checkbox') {
                    var isChecked = Utility.convertToBool(value);
                    input.prop('checked', isChecked);
                }
                else if (inputType === 'radio') {
                    input = $(el).find('[name="' + datum + '"][value="' + value + '"]');
                    input.prop('checked', true);
                }
                else if (inputType === 'select') {
                    input.find('option[value="' + value + '"]').prop('selected', true);
                }
                else {
                    input.val(value);
                }
            }
        }
    },
    getComboBoxIdByName: function (name, select, allowSaveAs) {
        // name: name to compare against select list values, to determine if it is in the select list
        // select: select list that contains a list of models, if name is found in the select list fetch the matching id
        var id;
        if (allowSaveAs) {
            var options = $(select).find('option');
            var len = options.length;
            var i = 0;
            for (i; i < len; i++) {
                var selected = $(options[i]);
                var selText = $.trim(selected.text());
                if (name === selText) { // If the names match get the id from the select list
                    id = selected.val();
                    break;
                }
                else {  // Otherwise it is a new data link connection
                    id = Constants.c.emptyGuid;
                }
            }
        }
        else {
            id = $(select).find('option:selected').val() || Constants.c.emptyGuid;
        }
        return id;
    },
    input: function (el) {
        var obj = {};
        $(el).find('input.isCombo').each(function (index, elm) {
            var jelm = $(elm);
            var name = jelm.attr('name');
            if (name === undefined || $(jelm).hasClass('ignore')) {
                return;
            }
            if (!$.isEmptyObject(name)) {
                obj[name] = DTO.combobox(jelm);
            }
        });
        $(el).find('input:not(".isCombo")').each(function (index, elm) {
            var jelm = $(elm);
            var name = jelm.attr('name');
            if (name === undefined || $(jelm).hasClass('ignore')) {
                return;
            }
            var tp = jelm.attr('type');
            var value = '';
            switch (tp) {
                case 'checkbox':
                    value = jelm.is(':checked');
                    break;
                case 'radio':
                    if (!jelm.is(':checked')) {
                        name = '';
                    }
                    value = DTO.hiddenInputType(jelm);
                    break;
                case 'hidden':
                    value = DTO.hiddenInputType(jelm);
                    break;
                default:
                    value = DTO.defaultInputType(jelm);
                    break;
            }
            if (name !== '') {
                obj[name] = value;
            }
        });
        return obj;
    },
    hiddenInputType: function (jelm) {
        var value = '';
        if (jelm.hasClass('approvalOutput')) {
            value = DTO.approvalOutput(jelm);
        }
        else {
            value = DTO.defaultInputType(jelm);
        }
        return value;
    },
    defaultInputType: function (jelm) {
        var value = '';
        if (jelm.hasClass('noTrim')) {
            value = jelm.val();
        }
        else {
            value = $.trim(jelm.val());
        }
        return value;
    },
    select: function (el) {
        var select = DTO.generic(el, 'select');
        $(el).find('select.isCombo').each(function (index, elm) {
            var jelm = $(elm);
            var name = jelm.attr('name');
            if (name === undefined || $(jelm).hasClass('ignore')) {
                return;
            }
            if (!$.isEmptyObject(name)) {
                select[name] = DTO.combobox(jelm);
            }
        });
        return select;
    },
    textarea: function (el) {
        var obj = {};
        $(el).find('textarea.isList').each(function (index, elm) {
            var jelm = $(elm);
            var name = jelm.attr('name');
            if (!$.isEmptyObject(name) || $(jelm).hasClass('ignore')) {
                obj[name] = DTO.textareaList(jelm);
            }
        });
        if (!$.isEmptyObject(obj)) {
            return obj;
        }
        return DTO.generic(el, 'textarea:not(.isList)');

    },
    combobox: function (jelm) {
        var result = {};
        var idx = 0;
        var val = jelm.val();
        if (jelm.hasClass('usingSource')) {
            return val;
        }
        var selected = jelm.parent().parent().parent().find('select option:selected');
        if (jelm.val() === selected.val()) {
            idx = selected.index() + 1;
        }
        if (!val) { // return just the value if it doesn't exist (for isRequired checks simplification)
            return val;
        }
        result[idx] = val;
        return result;
    },
    approvalOutput: function (jelm) {
        var val = jelm.val();
        var parseVal;
        if (val) {
            parseVal = JSON.parse(val);
        }
        return parseVal;
    },
    textareaList: function (jelm) {
        var res = $(jelm).val().split('\n');
        var result = [];
        _.each(res, function (item) {         
            result.push($.trim(item));
        });
        return result;
    },
    generic: function (el, tn) {
        var obj = {};
        $(el).find(tn).each(function (index, elm) {
            var jelm = $(elm);
            var name = jelm.attr('name');
            if (name === undefined || $(jelm).hasClass('ignore')) {
                return;
            }
            var value = jelm.val();
            if (name !== '') {
                // Handle generic single selects, by finding the selected option.
                if (tn === 'select' && jelm.prop('multiple') !== true) {
                    value = jelm.find(':selected').val();
                }
                //handle select multiples slightly differently than single select multiples.  
                if (tn === 'select' && jelm.prop('multiple') === true && value === null && !jelm.hasClass('bitwise')) {
                    obj[name] = [];
                } else if (tn === 'select' && jelm.hasClass('bitwise')) {
                    var bitwiseValue = 0;
                    var i;
                    var length = value ? value.length : 0;
                    for (i = 0; i < length; i++) {
                        bitwiseValue |= parseInt(value[i], 10);
                    }
                    obj[name] = bitwiseValue;
                } else {
                    obj[name] = value;
                }
            }
        });
        return obj;
    }
};