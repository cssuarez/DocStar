/// <reference path="../../Content/LibsInternal/Utility.js" />
var CustomFieldValueView = Backbone.View.extend({
    model: undefined, //CustomFieldValue
    changed: false,
    tagName: "li",
    className: 'CustomFieldValueView displayTable',
    items: undefined, //Used in DLDropDowns and Lists.
    blurTimer: undefined,   // timer used to clear blur event if the comboboxes dropdown arrow was clicked.
    events: {
        'change select.cfsFormat': 'selectedMetaChanged',
        'change .cf_val': 'customFieldValueChanged',
        'keyup .cf_val:not([type="checkbox"]):not(select)': 'customFieldInputChanged',
        'change .hasDatepicker': 'customFieldInputChanged',
        'click div.del_cf': 'deleteCF',
        'click div.cf_displayVal:not(.cf_displayDisabled)': 'switchToEditMode',
        'focus div.cf_displayVal:not(.cf_displayDisabled)': 'switchToEditMode'
    },
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('customfieldvaluelayout'));
        this.listenTo(this.model, 'change', function (model, options) {
            options = options || {};
            ErrorHandler.removeErrorTagsElement(this.$el);
            if (!options.skipRender) {
                this.render();
            }
        });
        this.listenTo(this.model, 'invalid', function (model, errors, options) {
            this.addErrorMessages(errors);
        });
        return this;
    },
    render: function () {
        var that = this;
        var renderObj = this.getRenderObject();
        this.$el.html(this.compiledTemplate(renderObj));
        this.$el.find('option[value="' + renderObj.CFMetaId + '"]').prop('selected', true);
        this.delegateEvents(this.events);

        if (this.options.hasModifyPermissions) {
            this.constrictCFTypeInput(renderObj);
        }
        else {
            Utility.SetTextAreaHeightFromUserPreference(this.$el.find('textarea'));
            this.makeResizeable(this.$el.find('textarea'), true);
        }

        if (this.options.focusOnRender) {
            setTimeout(function () {
                that.$el.find('select').focus();
            }, 10);
        }

        if (this.options.hidden) {
            this.$el.hide();
        }
        setTimeout(function () {
            that.validateModel();
        }, 10);
        return this;
    },
    close: function () {
        // Remove all bindings with this views cid namespace
        this.$el.find('.cf_val').off('.' + this.cid);
        this.$el.find('.cf_val_Container textarea').off('.' + this.cid);
        this.unbind();
        this.remove();
    },
    addErrorMessages: function (errors) {
        var msg = '';
        var error;
        var $errDiv = this.$el.find('.cf_displayVal');
        $errDiv.removeClass('warningErrorClass');
        ErrorHandler.removeErrorTagsElement(this.$el);
        for (error in errors) {
            if (errors.hasOwnProperty(error)) {
                if (error === 'ValueError') {
                    var warningElem = $('<' + css.warningErrorClassTag + '>' + '</' + css.warningErrorClassTag + '>').addClass(css.warningErrorClass);
                    if ($errDiv.is(':visible')) {
                        $errDiv.addClass('warningErrorClass');
                    }
                    else {
                        $errDiv.after(warningElem.text(errors[error]));
                    }
                    delete errors[error];
                }
            }
        }
        ErrorHandler.addErrors(errors);
    },
    getRenderObject: function () {
        var r = {};
        r.customFieldMetas = this.options.augmentedCFMs || [];
        r.customFieldMetas.sort(Utility.sortByProperty('Name'));    // ensure the customfields are sorted by name (case insensitive)
        r.CFId = this.model.get('Id');
        // trim the actual custom field value when editing, disallowing erroneous spaces (ie prepended or appended to the value)
        r.CFVal = $.trim(this.model.getValue());
        r.CFMetaId = this.model.get('CustomFieldMetaId');
        r.CFDisplayVal = this.model.getDisplayValue();
        r.IsBool = this.model.get('TypeCode') === Constants.ty.Boolean;
        r.hasModifyPermissions = this.options.hasModifyPermissions;
        r.isNew = this.model.get('isNew');
        r.isDefaultField = this.options.isDefaultField;
        var length = r.customFieldMetas.length;
        var i = 0;
        for (i; i < length; i++) {
            r.customFieldMetas[i].selected = '';
            if (r.customFieldMetas[i].Id === r.CFMetaId) {
                r.cfMeta = r.customFieldMetas[i];
                r.customFieldMetas[i].selected = 'selected="selected"';
                break;
            }
        }
        if (!r.cfMeta) {
            var cfm = window.customFieldMetas.get(r.CFMetaId);
            if (cfm) {
                r.cfmMeta = cfm.toJSON();
            }
        }
        if (!!r.cfMeta && !!r.cfMeta.Type && !!r.cfMeta.Name) {
            r.encodedName = SearchUtil.getSearchFieldPrefix(r.cfMeta.Type) + SearchUtil.indexBase64Encode(r.cfMeta.Name);
        }
        r.hasSource = !!r.cfMeta && (!!r.cfMeta.TypeAheadDataLinkId || !!r.cfMeta.DropDownDataLinkId || !!r.cfMeta.ListName);
        return r;
    },
    selectedMetaChanged: function (ev) {
        var cfmId = $(ev.currentTarget).find('option:selected').val(),
            cfmName = $(ev.currentTarget).find('option:selected').text(),
            cfm,
            cfv = {};
        var cfms = this.options.augmentedCFMs;
        var length = this.options.augmentedCFMs.length;
        var i = 0;
        for (i; i < length; i++) {
            if (cfms[i].Id === cfmId) {
                cfm = cfms[i];
                break;
            }
        }

        cfv.DisplayValue = '';
        cfv.IntValue = null;
        cfv.BoolValue = null;
        cfv.LongValue = null;
        cfv.DecimalValue = null;
        cfv.DateValue = null;
        cfv.DateTimeValue = null;
        cfv.StringValue = null;
        cfv.CustomFieldName = cfmName;
        cfv.CustomFieldMetaId = cfmId;
        if (cfm) {
            cfv.CustomFieldFormat = cfm.DisplayFormat;
            cfv.TypeCode = cfm.Type;
        }
        this.items = undefined;
        this.model.set(cfv);
        // If this isn't done then a newly selected boolean field isn't saved, unless it is checked then unchecked
        if (cfv.TypeCode === Constants.ty.Boolean) {
            this.model.setValue(false);
        }
    },
    customFieldInputChanged: function (ev) {
        clearTimeout(this.inputTimeout);
        var that = this;
        var $currTarg = $(ev.currentTarget);
        this.inputTimeout = setTimeout(function () {
            var newVal = $currTarg.val();
            var oldVal = that.model.getValue();
            that.model.setValue($currTarg.val(), { skipRender: true });
            if (newVal === oldVal) {
                that.model.trigger('change', that.model, { skipRender: true });
            }
            if (!$currTarg.is(':focus') && !$currTarg.hasClass('hasDatepicker')) {
                that.exitEditMode($currTarg.siblings('.cf_displayVal'), $currTarg);
            }
        }, Constants.TypeAheadDelay);
    },
    customFieldValueChanged: function (ev) {
        this.changed = true;
        var $elem = $(ev.currentTarget);
        if ($elem.is(':checkbox')) { //Checkboxes do not enter and exit edit mode.
            this.model.setValue($elem.is(':checked'));
        }
        else if ($elem.is('select')) {  // allow changing of a select list value to trigger dirty, without having to exit edit mode.
            this.model.setValue($elem.val(), { skipRender: true });
        }
    },
    switchToEditMode: function (ev) {
        if (!this.options.hasModifyPermissions) {
            return;
        }
        var that = this;
        var $dispValDiv = $(ev.currentTarget);
        if ($dispValDiv.is('textarea')) {
            Utility.log("Display val is a text area");
        }
        var $ediVal = $dispValDiv.siblings('.cf_val, .cf_val_Container');
        var $combo = $dispValDiv.siblings('.ui-combobox');
        var comboExists = $combo.length === 1;
        if (comboExists) {
            $ediVal = $combo.find('.cf_val');
        }
        var cfmId = this.model.get('CustomFieldMetaId') || $dispValDiv.siblings('.cfsFormat').data('cfmid');
        if (!cfmId) { //Cannot edit value until a custom field is selected
            return;
        }

        $dispValDiv.hide();
        $ediVal.show();
        if (comboExists) {
            $combo.show();
        }
        $ediVal.focus();
        $ediVal.select();
        that.changed = false;
        var onBlur;
        if ($ediVal.hasClass('hasDatepicker')) {
            onBlur = function () {
                that.exitEditMode($dispValDiv, $ediVal);
            };
            $ediVal.one('dpBlur.' + this.cid, onBlur);
        }
        else if ($ediVal.hasClass('cf_val_Container')) {
            var $txtarea = $ediVal.find('textarea');
            onBlur = function () {
                that.exitEditMode($dispValDiv, $ediVal);
            };
            $txtarea.one('blur.' + this.cid, onBlur);
            $txtarea.show(); //IDK why, I tried to track it down, but this text area gets hidden when tabbing quickly back and forth between fields.
            $txtarea.focus();
            $txtarea.select();
            Utility.adjustResizeablePosition($txtarea);
        }
        else {
            if (comboExists) {
                onBlur = function () {
                    that.blurTimer = setTimeout(function () {
                        if ($ediVal.autocomplete('instance')) {
                            $ediVal.autocomplete('close');
                        }
                        that.exitEditMode($dispValDiv, $ediVal);
                    }, 500);
                };
                $ediVal.one('blur.' + this.cid, onBlur);
                $combo.off('click', 'a').on('click', 'a', function (ev) {
                    clearTimeout(that.blurTimer);
                });
            }
            else {
                onBlur = function () {
                    var autocomplete = $ediVal.data('ui-autocomplete');
                    if (autocomplete && autocomplete.menu) {
                        var menu = autocomplete.menu;
                        var $menuSel = $(menu.element);
                        var lis = $menuSel.find('li');
                        if (lis.length > 0) {
                            var elemData = $ediVal.data('selectedItemData');
                            if (menu.active) {
                                elemData = menu.active.data('item.autocomplete');
                            }
                            if (!elemData) {
                                var $elem = $menuSel.find('li:first');
                                elemData = $elem.data('item.autocomplete');
                            }
                            if (elemData && elemData.value) {
                                $ediVal.val(elemData.value);
                            }
                            $ediVal.data('selectedItemData', '');
                        }
                    }
                    that.exitEditMode($dispValDiv, $ediVal);
                };
                $ediVal.one('blur.' + this.cid, onBlur);
            }
        }
        // Setup recognition short cuts, with the currently focused custom field value element
        $('body').trigger('setRecShortCutParameters', {
            lassoShortcutTarget: {
                isDate: this.model.isDate(),
                setValue: function (value) {
                    // Hide the datepicker before the value is set, otherwise the element with the bound datepicker events is lost
                    var isDate = that.model.isDate();
                    if (isDate) {
                        $ediVal.datepicker('hide');
                    }
                    // Now cleanup blur events, since they aren't being triggered
                    // and the elements they are attached to are being removed once setValue on the model is called
                    var $blurItem = $ediVal;
                    if ($ediVal.hasClass('cf_val_Container')) {
                        $blurItem = $ediVal.find('textarea');
                    }
                    $blurItem.off('.' + that.cid);
                    var oldVal = that.model.getValue();
                    // Now update the value in the model, which will cause this view to re-render
                    if (oldVal === value) {
                        that.model.trigger('change', that.model);
                    }
                    else {
                        that.model.setValue(value);
                    }
                    // Obtain the elements again because the original ones obtained previously are no longer a part of the DOM 
                    // This is due to the setValue call on the model triggering a render method
                    $dispValDiv = that.$el.find('.cf_displayVal');
                    $ediVal = $dispValDiv.siblings('.cf_val, .cf_val_Container');
                    // trigger that the shortcut has completed
                    $('body').trigger('recShortCutdone', { currentTarget: $dispValDiv });
                }
            }
        });
        this.validateModel();
    },
    exitEditMode: function ($dispValDiv, $ediVal) {
        var warningElem = $dispValDiv.parent().find('.' + css.warningErrorClass);
        var displayError = warningElem.length > 0;
        var newVal = $ediVal.val();
        if ($ediVal.hasClass('cf_val_Container')) {
            newVal = $ediVal.find('textarea').val();
        }
        var oldVal = this.model.getValue() || '';
        if ($ediVal.hasClass('hasDatepicker') && this.model.get('TypeCode') === Constants.ty.DateTime) {
            newVal = DateUtil.isDate(newVal)? new Date(newVal).format('general') : newVal;
            oldVal =  DateUtil.isDate(oldVal)? new Date(oldVal).format('general') : oldVal;
        }
        if (this.changed || oldVal !== newVal) {
            $ediVal.prop('enabled', false);
            this.model.setValue(newVal);
            if (displayError) {
                var target = this.$el.find(".cf_displayVal");
                ErrorHandler.removeErrorTagsElement(this.$el);
                target.after(warningElem);
            }
            // trigger the change manually because the model hasn't truly changed, needed for re-rendering of custom field value
            if (oldVal === newVal) {
                this.model.trigger('change', this.model);
            }
            this.changed = false;
        }
        else {
            //No change just reshow the display val.       
            $dispValDiv.show();
            var $combo = $dispValDiv.parent().find('.ui-combobox');
            var comboExists = $combo.length === 1;
            if (comboExists) {
                $combo.hide();
            }
            $ediVal.hide();
            if (displayError) {
                ErrorHandler.removeErrorTagsElement(this.$el);
                $dispValDiv.after(warningElem);
            }
        }
        this.validateModel();
    },
    validateModel: function () {
        var isNotValid = this.model.validate(this.model.toJSON()); // validate the model before continuing
        if (isNotValid) {
            this.model.trigger('invalid', this, isNotValid);
        }
    },
    constrictCFTypeInput: function (renderObject) {
        var that = this;
        var type = this.model.get('TypeCode');
        var $input = this.$el.find('input.cf_val');
        switch (type) {
            case Constants.ty.Int32:
            case Constants.ty.Int64:
                // Set cell to accept integers, remove on any other
                $input.numeric({ negative: true, decimal: false });
                break;
            case Constants.ty.Decimal:
                // Set cell to accept decimal numbers, remove on any other  
                $input.numeric({ negative: true, decimal: Constants.c.decimalPlace });
                break;
            case Constants.ty.Date:
                $input.datepicker({
                    onClose: function (dateText, inst) {
                        if (dateText) {
                            dateText = DateUtil.isDate(dateText) ? new Date(dateText).format('generalDateOnly') : dateText;
                            $input.attr('value', dateText);
                            $input.val(dateText);
                        }
                        setTimeout(function () {
                            $input.trigger('dpBlur'); //Must be triggered outside onClose or the datepicker will reshow
                        }, 3);
                    }
                });
                break;
            case Constants.ty.DateTime:
                // Set cell to have a datepicker, remove datepicker on any other
                $input.datetimepicker({
                    onClose: function (dateText, inst) {
                        if (dateText) {
                            $input.attr('value', dateText);
                            $input.val(dateText);
                        }
                        setTimeout(function () {
                            $input.trigger('dpBlur'); //Must be triggered outside onClose or the datepicker will reshow
                        }, 3);
                    }
                });            
                break;
            case Constants.ty.String:
                // String values use a text area so they can be resizable.
                if (!renderObject.hasSource) {
                    this.replaceInputWithTextArea($input, renderObject);
                }
                break;
        }

        if (renderObject.hasSource) {
            this.applySourceToInput($input, renderObject);
        }
    },
    replaceInputWithTextArea: function ($input, renderObject) {
        var $textArea = $('<textarea></textarea>').addClass($input.attr('class'));
        $input.replaceWith($textArea);
        $textArea.val(renderObject.CFVal);
        $textArea.height(15).width(134);
        if ($textArea.resizable('instance')) {
            $textArea.resizable('destroy');
        }
        Utility.SetTextAreaHeightFromUserPreference($textArea);
        this.makeResizeable($textArea);
    },
    makeResizeable: function ($textArea, visible) {
        $textArea.resizable({
            width: '92%',
            maxWidth: '92%',
            maxHeight: 100,
            minWidth: 134,
            minHeight: 20,
            handles: 'se',
            resize: function (event, ui) {
                var $self = $(ui.element);
                $self.css('width', '92%');
                var $textarea = $self.find('textarea');
                $textarea.css('width', '100%');
                var maxWidth = $self.width();
                $self.resizable({ maxWidth: maxWidth });
                $('#view_document_data_scroll').perfectScrollbar('update');
            },
            stop: function () {
                $('#view_document_data_scroll').perfectScrollbar('update');
                var elem = $(this).find('textarea')[0];
                Utility.adjustResizeablePosition($(this).find('textarea'));
                Utility.SetTextAreaHeightPreference(elem);
            },
            create: function (event, ui) {
                if (visible) {
                    $(this).css({
                        'padding': 0,
                        'margin': '0 0 5px 8px',
                        'top': 0,
                        'height': 20,
                        'width': '92%',
                        'float': 'left'
                    });

                }
                else {
                    $(this).addClass('cf_val_Container').css({
                        'padding': 0,
                        'margin': '0 0 5px 8px',
                        'top': 0,
                        'float': 'left',
                        'display': 'none',
                        'width': '92%',
                        'position': 'relative'
                    });
                }
                $(this).find('textarea').css('width', '98%');
                $(this).find('.ui-resizable-handle').css('z-index', 2);
                $(this).find('textarea').off('keyup').on('keyup', function () {
                    Utility.adjustResizeablePosition($textArea);
                });
            }
        });
    },
    applySourceToInput: function ($input, renderObject) {
        var meta = renderObject.cfMeta;
        if (meta.DropDownDataLinkId) {
            this.loadDataLinkDropDown($input, renderObject);
        }
        else if (meta.TypeAheadDataLinkId) {
            this.loadDataLinkTypeAhead($input, renderObject);
        }
        else if (meta.ListName) {
            this.loadListValues($input, renderObject);
        }
    },
    loadDataLinkDropDown: function ($input, renderObject) {
        var that = this;
        var meta = renderObject.cfMeta;
        var queryId = meta.DropDownDataLinkId;
        var sf = function (result) {
            that.items = result.Columns[0].Value;
            that.replaceInputWithSelect($input, renderObject);
        };
        var ff = function (jqXHR, textStatus, bizEx) {
            ErrorHandler.addErrors(meta.Name + ':' + bizEx.Message);
        };
        var cf = function () {
            $input.removeClass('cf_sourceLoading');
        };

        if (this.items) {
            that.replaceInputWithSelect($input, renderObject);
        }
        else {
            $input.addClass('cf_sourceLoading');
            this.options.dataLinkSvc.executeQuery(queryId, null, null, sf, ff, cf);
        }
    },
    loadDataLinkTypeAhead: function ($input, renderObject) {
        var that = this;
        var meta = renderObject.cfMeta;
        var queryId = meta.TypeAheadDataLinkId;
        var ff = function (jqXHR, textStatus, bizEx) {
            ErrorHandler.popUpMessage(bizEx);
        };
        $input.autocomplete({
            select: function (event, ui) {
                $input.data('selectedItemData', ui.item);
            },
            source: function (request, response) {
                var sf = function (data) {
                    response(data.Columns[0].Value);
                };
                if (!that[queryId]) {
                    that[queryId] = {};
                }
                else if (that[queryId].cancel) {
                    that[queryId].cancel();
                }
                that.options.dataLinkSvc.executeQuery(queryId, null, [{ Key: "param1", Value: request.term }], sf, ff, null, that[queryId]);
            },
            minLength: 1,
            delay: Constants.TypeAheadDelay
        });
    },
    loadListValues: function ($input, renderObject) {
        var that = this;
        var meta = renderObject.cfMeta;
        var listName = meta.ListName;
        var sf = function (list) {
            if (!list) {
                ErrorHandler.addErrors(meta.Name + ':' + Constants.c.listNotFound_T.replace('{0}', listName));
                return;
            }
            var i;
            for (i = 0; i < list.Items.length; i++) {
                if ($.trim(list.Items[i]) === "&nbsp;") {
                    list.Items[i] = ' ';
                }
            }
            if (!list.ReadOnly) {
                var $combo;
                $input.combobox({
                    source: list.Items,
                    onChange: function (data) {
                        that.exitEditMode($combo.siblings('.cf_displayVal'), $combo.find('.cf_val'));
                    },
                    onSelect: function (data) {
                        if (data.ui.item) {
                            $combo.find('input').val(data.ui.item.value);
                            that.exitEditMode($combo.siblings('.cf_displayVal'), $combo.find('.cf_val'));
                        }
                    }
                });
                $combo = $input.parent().find('.ui-combobox');
                $combo.find('input').addClass('cf_val').val(renderObject.CFVal);
                $combo.hide();
            }
            else {
                that.items = list.Items;
                that.replaceInputWithSelect($input, renderObject);
            }
        };
        var ff = function (jqXHR, textStatus, bizEx) {
            ErrorHandler.addErrors(meta.Name + ':' + bizEx.Message);
        };
        if (this.items) {
            that.replaceInputWithSelect($input, renderObject);
        }
        else {
            this.options.adminSvc.GetCustomList(listName, sf, ff);
        }
    },
    replaceInputWithSelect: function ($input, renderObject) {
        var $option, found;
        var $select = $('<select></select>').addClass($input.attr('class')).css('display', 'none');
        var items = this.items || [''];
        if (items.length === 0) {
            items.push('');
        }
        var length = items.length;
        var selected = false;
        var i = 0;
        for (i; i < length; i++) {
            var lstItm = items[i];
            found = renderObject.CFVal && lstItm.toLowerCase() === renderObject.CFVal.toLowerCase();
            if (found) {
                selected = true;
            }
            $option = $(Utility.safeHtmlValue(lstItm, { tag: 'option', text: lstItm, attrs: { selected: found ? 'selected' : undefined } }));
            $select.append($option);
        }

        if (!renderObject.CFVal) { //No value, just as the drop down does set the display value to the first selected.
            $select.find('option:first').prop('selected', true);
            this.$el.find('.cf_displayVal').text(items[0]);
        }
        else if (!selected) {
            $option = $(Utility.safeHtmlValue(renderObject.CFVal, { tag: 'option', text: renderObject.CFVal, attrs: { selected: 'selected' } }));
            $select.append($option);
        }

        $input.replaceWith($select);
    },
    deleteCF: function () {
        this.model.destroy();
    }
});