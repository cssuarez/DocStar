var CustomFieldSetup = {
    adminSvc: AdminServiceProxy(),
    dataLinkSvc: DataLinkServiceProxy(),
    init: function () {
        CustomFieldSetup.dataLinkSvc.setCacheDuration(30000);
        CustomFieldSetup.adminSvc.setCacheDuration(30000);
    },
    setupAutocompletes: function ($elements) {
        var ff = function (jqXHR, textStatus, bizEx) {
            ErrorHandler.popUpMessage(bizEx);
        };
        $elements.autocomplete({
            source: function (request, response) {
                var queryId = this.element.data('datalinkid');
                var sf = function (data) {
                    response(data.Columns[0].Value);
                };
                if (!CustomFieldSetup[queryId]) {
                    CustomFieldSetup[queryId] = {};
                }
                else if (CustomFieldSetup[queryId].cancel) {
                    CustomFieldSetup[queryId].cancel();
                }
                CustomFieldSetup.dataLinkSvc.executeQuery(queryId, null, [{ Key: "param1", Value: request.term }], sf, ff, null, CustomFieldSetup[queryId]);
            },
            select: function (event, ui) {
                $(this).val(ui.item.value);
                $(this).trigger('change');
            },
            minLength: 1,
            delay: Constants.TypeAheadDelay
        });
    },
    loadSelect: function ($elements) {
        // This method relies on recursive calls to itself, each call processing one $element from $elements.
        if ($elements.length === 0) {
            return;
        }
        var $element = $elements.eq(0); // element to be processed now
        $elements = $elements.not($element); // remaining elements for recursive call

        var listName = $element.data('listname');
        var dlId = $element.data('datalinkid');
        if (dlId === Constants.c.emptyGuid) {
            dlId = undefined;
        }
        if (!listName && !dlId) {
            //Static select (like priority) -- no load needed; just recurse
            CustomFieldSetup.loadSelect($elements);
            return;
        }
        var ff = function (jqXHR, textStatus, bizEx) {
            ErrorHandler.popUpMessage(bizEx);
        };
        var cf = function () {
            $element.removeClass('cf_sourceLoading');
            CustomFieldSetup.loadSelect($elements);
        };

        $element.addClass('cf_sourceLoading');
        if (dlId) {
            var dlsf = function (result) {
                CustomFieldSetup.fillSelectDatalink(result.Columns[0].Value, $element);
            };
            CustomFieldSetup.dataLinkSvc.executeQuery(dlId, null, null, dlsf, ff, cf);
        } else {
            var clsf = function (result) {
                CustomFieldSetup.fillSelectList(result, $element, listName);
            };
            CustomFieldSetup.adminSvc.GetCustomList(listName, clsf, ff, cf);
        }

    },
    fillSelectDatalink: function (result, $element) {
        var co = $element.find(':selected');
        var cv = co.val();
        var ct = co.text();
        $element.empty();
        var i = 0;
        var length = result.length;
        // If there is no blank option as the first option, then add one.
        if (result[0]) {
            var opt = document.createElement('option');
            opt.value = '';
            opt.selected = true;
            $element.append(opt);
        }
        for (i; i < length; i++) {
            $element.append($('<option></option>').val(result[i]).text(result[i]));
        }
        if (!cv) { //No value, just as the drop down does set the display value to the first selected.
            $element.find('option:first-child').prop('selected', true);
        }
        else {
            var $selected = $element.find('option[value="' + cv + '"]');
            var selected = $selected.length !== 0;
            if (selected) { // Existing option found, so select it.
                $selected.prop('selected', true);
            }
            else { // Existing option not found. Add it to the select, and select it.
                $element.append($('<option></option>').val(cv).prop('selected', true).text(ct));
            }
        }
    },
    fillSelectList: function (list, $element, listName) {
        if (!list) {
            ErrorHandler.addErrors(Constants.c.listNotFound_T.replace('{0}', listName));
            return;
        }
        var i;
        var length = list.Items ? list.Items.length : 0;
        for (i = 0; i < length; i++) {
            if ($.trim(list.Items[i]) === "&nbsp;") {
                list.Items[i] = ' ';
            }
        }
        if (!list.ReadOnly) {
            var co = $element.find(':selected');
            var cv = co.val();
            var databackingstoreid = $element.data('backingstoreid');
            var databackingstorevalueid = $element.data('backingstorevalueid');
            var groupId = $element.data('groupid');
            var dlId = $element.data('datalinkid');
            var $combo;
            var $input;
            var elwidth = $element.width();
            $element.combobox({
                source: list.Items,
                onSelect: function (data, ui) {
                    if (data.ui.item) {
                        $input.val(data.ui.item.value);
                        $input.trigger('change');
                    }

                }
            });
            $combo = $element.next('.ui-combobox');
            $input = $combo.find('input');
            $input.val(cv);
            if ($input.length === 0) {
                Utility.log('CustomField input not found, setAttribute is failing', $element); // This should never happen, but adding it as a log for if this issue occurs again
            }
            $input.get(0).setAttribute('data-backingstoreid', databackingstoreid);
            $input.get(0).setAttribute('data-backingstorevalueid', databackingstorevalueid);
            $input.get(0).setAttribute('data-datalinkid', dlId);
            $input.get(0).setAttribute('data-groupid', groupId);
            if ($element.hasClass('Select')) {
                $combo.css({
                    position: $element.css('position'),
                    left: $element.css('left'),
                    top: $element.css('top')
                });
                $input.width(elwidth - $combo.find('a.ui-button').outerWidth(true));
            }
            if ($element.hasClass('ComboBox')) { // ComboBox class used only in case of Form element.
                $combo.find('input').css({
                    width: $element.css('width'),
                    height: $element.css('height')
                });
                $combo.find('a').css({
                    height: parseInt($element.css('height'), 10) + 4
                });
            }
        }
        else {
            CustomFieldSetup.fillSelectDatalink(list.Items, $element);
        }
    },
    getEditableElement: function (cfvId, cfvValue, cfMeta) {
        if (!cfvValue) {
            cfvValue = "";
        }
        var value;
        cfvValue = cfvValue || '';
        var co = { attrs: { 'data-backingstoreid': cfMeta.Id, 'data-backingstorevalueid': cfvId } };
        if (cfMeta.TypeAheadDataLinkId) {
            value = Utility.safeHtmlValue(cfvValue, $.extend(true, co, { tag: 'input', attrs: { 'class': 'Autocomplete', 'data-datalinkid': cfMeta.TypeAheadDataLinkId } }));
        } else if (cfMeta.DropDownDataLinkId || cfMeta.ListName) {
            var sel = document.createElement('select');
            if (cfMeta.DropDownDataLinkId) {
                sel.setAttribute('data-datalinkid', cfMeta.DropDownDataLinkId);
            } else {
                sel.setAttribute('data-listname', cfMeta.ListName);
            }
            sel.setAttribute('data-backingstoreid', cfMeta.Id);
            sel.setAttribute('data-backingstorevalueid', cfvId);
            sel.setAttribute('class', 'Select');
            var option = document.createElement('option');
            option.setAttribute('selected', 'selected');
            option.setAttribute('value', cfvValue);
            option.text = cfvValue;
            sel.appendChild(option);
            var container = document.createElement('div');
            container.appendChild(sel);
            value = container.innerHTML;
        } else {
            var tc = cfMeta.Type;
            switch (tc) {
                case Constants.ty.Boolean:
                    if (cfvValue) {
                        value = Utility.safeHtmlValue('', $.extend(true, co, { tag: 'input', attrs: { 'type': 'checkbox', 'Checked': 'Checked' } }));
                    } else {
                        value = Utility.safeHtmlValue('', $.extend(true, co, { tag: 'input', attrs: { 'type': 'checkbox' } }));
                    }
                    break;
                case Constants.ty.DateTime:
                    value = Utility.safeHtmlValue(cfvValue, $.extend(true, co, { tag: 'input', attrs: { 'type': 'datetime' } }));
                    break;
                case Constants.ty.Date:
                    value = Utility.safeHtmlValue(cfvValue, $.extend(true, co, { tag: 'input', attrs: { 'type': 'date' } }));
                    break;
                case Constants.ty.Int32:
                case Constants.ty.Int64:
                    value = Utility.safeHtmlValue(cfvValue, $.extend(true, co, { tag: 'input', attrs: { 'type': 'number' } }));
                    break;
                case Constants.ty.Decimal:
                    value = Utility.safeHtmlValue(cfvValue, $.extend(true, co, { tag: 'input', attrs: { 'type': 'decimal' } }));
                    break;
                default:
                    value = Utility.safeHtmlValue(cfvValue, $.extend(true, co, { tag: 'input', attrs: { 'type': 'text' } }));
                    break;
            }
        }
        return value;
    },
    createStyleFromTemplate: function (template) {
        var settings = template.Settings;
        var style = '';
        if (settings) {
            settings = JSON.parse(settings);
            switch (settings.Alignment) {
                case 'right':
                    style += 'text-align: right;';
                    break;
                case 'center':
                    style += 'text-align: center;';
                    break;
                default:
                    style += 'text-align: left;';
                    break;
            }
        }
        return style;
    }
};