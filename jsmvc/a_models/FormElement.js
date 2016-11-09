var FormElement = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    proxy: FormsServiceProxy({ skipStringifyWcf: true }),
    getTitleRegEx: new RegExp('title' + Constants.UtilityConstants.ATTRIBUTE_REGEX, 'i'),
    getClassRegEx: new RegExp('class="([^"]*)"', 'i'), // Find any and all characters in the class attribute, excluding the wrapping quotes
    getStyleRegEx: new RegExp(Constants.UtilityConstants.STYLE_REGEX, 'i'),
    getDataAttrsRegEx: new RegExp('data-.*' + Constants.UtilityConstants.ATTRIBUTE_REGEX, 'i'),
    getTabIndexRegEx: new RegExp('tabindex' + Constants.UtilityConstants.ATTRIBUTE_REGEX, 'i'),
    getAutofocusRegEx: new RegExp('autofocus' + Constants.UtilityConstants.ATTRIBUTE_REGEX, 'i'),
    guidRegEx: new RegExp(Constants.UtilityConstants.GUID_REGEX, 'ig'),
    /// <summary>
    /// Capturing Groups
    /// 0 - entire match
    /// 1 - space or ; (otherwise 'height' as a key replaces 'line-height')
    /// 2 - attribute value - with unit measurement if present
    /// 3 - attribute measurement - if found
    /// </summary>
    styleValueRegEx: Constants.UtilityConstants.STYLE_VALUE_REGEX,    // String.format with the key of the style attribute you are looking for
    attributeRegEx: Constants.UtilityConstants.ATTRIBUTE_REGEX,    // String.format with the key of the attribute you are looking for
    classesRegEx: new RegExp(Constants.UtilityConstants.CLASSNAME_REGEX, 'ig'),
    defaults: {
        Id: Constants.c.emptyGuid,
        FormPartId: Constants.c.emptyGuid,
        Attributes: '',
        Top: 0,
        Left: 0,
        Width: 200,
        Height: 20,
        BackingStoreId: null,
        Value: '',
        RenderAsSpan: false,
        Label: Constants.c.label,
        ContainerAttributes: '',
        LabelAttributes: '',
        Markup: '',
        Formula: null
    },
    // Perform client side validation for models here
    validate: function (attrs) {
        // This function executes when you call model.save()
        // It will return an object with each validation error that may have occurred
        attrs = !attrs ? this.attributes : attrs;
        var msg = {};
        if (isNaN(attrs.Top)) {
            msg.Top = Constants.c.topIsNotDefined;
        }
        if (isNaN(attrs.Left)) {
            msg.Left = Constants.c.leftIsNotDefined;
        }
        if (isNaN(attrs.Width)) {
            msg.Width = Constants.c.widthIsNotDefined;
        }
        if (isNaN(attrs.Height)) {
            msg.Height = Constants.c.heightIsNotDefined;
        }

        // Add validation here for attrs
        // Any error msg should be added to the msg object with a key that matches the name attribute of an html element
        // eg. msg.Name = 'error message', where an html element has a name attribute of 'Name'
        errorMsg = this.validatePredefinedValue();
        if (errorMsg) {
            msg.Value = errorMsg;
        }

        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    ///<summary>
    /// Validate the form elements formula
    ///</summary>
    validateFormula: function (options) {
        options = options || {};
        // Go to the server to validate (until the server parsing is ported to UI)
        var that = this;
        var sf = function (result) {
            that.trigger('validate:Formula', that, result);
            if (result.IsValid || !that.getFormula()) {
                Utility.executeCallback(options.validCallback, result);
            }
            else {
                Utility.executeCallback(options.invalidCallback, result);
            }
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            that.trigger('invalid', that, errorThrown);
        };
        this.proxy.parseFormula({ Formula: this.getFormula() }, sf, ff);
    },
    ///<summary>
    /// Validate the form elements predefined value
    ///</summary>
    validatePredefinedValue: function () {
        var predefinedValue = this.get('Value');
        var backingStoreId = this.get('BackingStoreId');
        if (!predefinedValue || !backingStoreId) {
            return;
        }
        var cf = window.customFieldMetas.get(backingStoreId);
        if (!cf) {
            return;
        }
        var valObj = cf.createValueObject();
        var cfvModel = new CustomFieldValue(valObj);
        cfvModel.setValueSwitch(valObj, predefinedValue);
        var msg = cfvModel.validate(valObj);

        if ($.isEmptyObject(msg) === false) {
            return String.format('{0} ({1} {2})', msg.ValueError, this.get('Label'), Constants.c.predefinedValue);
        }
    },
    sync: function (method, model, options) {
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
        switch (method) {
            case 'create':
                // Add a create call
                sf();
                break;
            case 'update':
                // Add an update call
                sf();
                break;
            case 'delete':
                // Add a delete call
                sf();
                break;
        }
    },
    ///<summary>
    /// Set default values for this model when its backing store changes
    ///<param name="model">form element that has had its backing store changed</param>
    ///<param name="value">backing store id</param>
    ///<param name="options">backbone options combined with any custom ones, if needed</param>
    setDefaultValues: function (model, value, options) {
        // If the type changes for a LabelValuePair then the values need to be updated (eg. going from text type to int type, values need to become integers)
        var prevAttrs = this.previousAttributes();
        var prevBSId = prevAttrs ? prevAttrs.BackingStoreId : '';
        var prevType;
        if (prevBSId) {
            var prevCFM = window.customFieldMetas.get(prevBSId);
            if (prevCFM) {
                prevType = prevCFM.get('Type');
            }
        }
        var isNumber;
        if (this.isLVPGroup()) {
            // Determine custom field meta type from backing store id
            var cfm = window.customFieldMetas.get(value);
            if (cfm && ((prevType && cfm.get('Type') !== prevType) || !prevType)) {
                if (cfm) {
                    isNumber = cfm.isNumber();
                }
                var val = Utility.tryParseJSON(this.get('Value'), true);
                var lvps = val.Values;
                if (val) {
                    var idx = 0;
                    var length = lvps.length;
                    for (idx; idx < length; idx++) {
                        var lvp = lvps[idx];
                        val = lvp.Value;
                        if (isNumber) {
                            val = parseInt(lvp.Value, 10);
                            if (val === undefined || val === null || isNaN(val)) {
                                lvp.Value = idx + 1;
                            }
                            else {
                                lvp.Value = val;
                            }
                        }
                        else if (val === '') {
                            lvp.Value = lvp.Label;
                        }
                    }
                }
                this.updateLabelValuePairData(lvps, options);
                return lvps;
            }
        }
    },
    /// <summary>
    /// Stores the original values of this object. This is used in conjunction with revertChanges
    /// </summary>
    storeOriginalValues: function () {
        var dtf = this.dateTimeFields;
        this.dateTimeFields = []; //Temporarally remove the date fields, this way the orginal value dates are not turned to msjson.
        this.originalValues = JSON.parse(JSON.stringify(this.toJSON())); //Need to break the by ref bindings.
        this.dateTimeFields = dtf;
    },
    /// <summary>
    /// Reverts this object back to its original values (if it has any). Store original values should be called before any change is allowed.
    /// </summary>
    revertChanges: function (options) {
        if (this.originalValues) {
            this.set(this.originalValues, options);
        }
        this.originalValues = undefined;    // clear the stored original values
    },
    fixPositionAndDimensions: function () {
        this.fixPosition();
        this.fixDimensions();
    },
    fixPosition: function () {
        this.set({ Top: parseInt(this.get('Top'), 10) }, { ignoreChange: true });
        this.set({ Left: parseInt(this.get('Left'), 10) }, { ignoreChange: true });
    },
    fixDimensions: function () {
        this.set({ Width: parseInt(this.get('Width'), 10) }, { ignoreChange: true });
        this.set({ Height: parseInt(this.get('Height'), 10) }, { ignoreChange: true });
    },
    getFormElementMarkup: function (options) {
        options = options || {};
        var that = this;
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var cf = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            that.set({ 'Markup': result[0].Value }, { silent: true });
            if (options && options.success) {
                options.success(result);
            }
        };
        this.fixPositionAndDimensions();
        this.proxy.generateHtmlElements({ Elements: [this.toJSON()], FormTemplatePkg: options.formTemplatePkg || null }, sf, ff, cf, null, options.headers);
    },
    isSelected: function () {
        return !!this.get('selected');
    },
    mapFormTagToFieldTypes: function () {
        var fieldTypes = {};
        var tag = this.get('Tag');
        switch (tag) {
            case Constants.ft.TextInput:
            case Constants.ft.TextArea:
                fieldTypes[Constants.ty.String] = tag;
                break;
            case Constants.ft.Date:
                fieldTypes[Constants.ty.Date] = tag;
                break;
            case Constants.ft.DateTime:
                fieldTypes[Constants.ty.DateTime] = tag;
                break;
            case Constants.ft.NumberInput:
                fieldTypes[Constants.ty.Decimal] = tag;
                fieldTypes[Constants.ty.Double] = tag;
                fieldTypes[Constants.ty.Int16] = tag;
                fieldTypes[Constants.ty.Int32] = tag;
                fieldTypes[Constants.ty.Int64] = tag;
                break;
            case Constants.ft.CheckBox:
                fieldTypes[Constants.ty.Boolean] = tag;
                break;
            case Constants.ft.Select:           // intentional fall through
            case Constants.ft.ComboBox:
                fieldTypes[Constants.ty.Object] = tag;
                break;
            case Constants.ft.CheckBoxGroup:    // intentional fall through
            case Constants.ft.RadioButtonGroup:
                fieldTypes[Constants.ty.String] = tag;
                fieldTypes[Constants.ty.Decimal] = tag;
                fieldTypes[Constants.ty.Double] = tag;
                fieldTypes[Constants.ty.Int16] = tag;
                fieldTypes[Constants.ty.Int32] = tag;
                fieldTypes[Constants.ty.Int64] = tag;
                break;
            default:
                fieldTypes = {};
        }
        return fieldTypes;
    },
    ///<summary>
    /// Obtain filtered Constants.ty object from a form tag to field type mapping
    ///</summary>
    getTypesFromTagMapping: function () {
        var fieldTypes = this.mapFormTagToFieldTypes();
        var types = Utility.reverseMapObject(Constants.ty);
        var ty;
        var allowedTypes = {};
        for (ty in fieldTypes) {
            if (fieldTypes.hasOwnProperty(ty)) {
                allowedTypes[types[ty]] = ty;
            }
        }
        return allowedTypes;
    },
    updatePosition: function (pos, options) {
        this.set({
            'Top': pos.top,
            'Left': pos.left
        }, { ignoreChange: true });
        this.fixPosition();
        // Manually trigger change event, since the above are made silent to prevent calling getFormElementMarkup more than once
        this.trigger('change', this, $.extend({ setDirty: true }, options));
    },
    updateDimensions: function (dims, options) {
        options = options || {};
        this.set({
            'Width': dims.width,
            'Height': dims.height
        }, $.extend({ ignoreChange: true }, options));
        this.fixDimensions();
        // Manually trigger change event, since the above are made silent to prevent calling getFormElementMarkup more than once
        this.trigger('change', this, $.extend({ setDirty: true }, options));
    },
    updateLabelValuePairData: function (lvpValues, options) {
        var value = Utility.tryParseJSON(this.get('Value'), true);
        value = $.extend(value, { Values: lvpValues }, options);
        this.set('Value', JSON.stringify(value));
    },
    ///<summary>
    /// Obtain the name of the backing store of this element
    ///</summary>
    getBackingStoreName: function () {
        var name = '';
        var bsId = this.get('BackingStoreId');
        if (bsId) {
            var cfm = window.customFieldMetas.get(bsId);
            if (cfm) {
                name = cfm.get('Name');
            }
        }
        return name;
    },
    getClassesFromAttributes: function (attributes, asArray) {
        if (!attributes) {
            attributes = "";
        }
        var classes = '';
        var match = attributes.match(this.getClassRegEx);
        if (match && match.length > 1) {
            classes = match[1];
        }
        if (asArray) {
            classes = classes.split(/\s+/);
        }
        return classes;
    },
    getHelpText: function () {
        var attributes = this.get('Attributes');
        if (!attributes) {
            attributes = "";
        }
        var helpText = '';
        var match = attributes.match(this.getTitleRegEx);
        if (match && match.length > 1) {
            helpText = match[1];
        }
        return helpText;
    },
    getClasses: function (asArray) {
        return this.getClassesFromAttributes(this.get('Attributes'), asArray);
    },
    getLabelClasses: function (asArray) {
        return this.getClassesFromAttributes(this.get('LabelAttributes'), asArray);
    },
    getContainerClasses: function (asArray) {
        return this.getClassesFromAttributes(this.get('ContainerAttributes'), asArray);
    },
    getAttributeValue: function (key) {
        var regEx = new RegExp(String.format(this.attributeRegEx, key), 'i');
        var value = this.get('Attributes').match(regEx) || undefined;
        if (value && value.length > 1) {
            value = value[1];
        }
        return value;
    },
    getAttributeValueInt: function (key) {
        return parseInt(this.getAttributeValue(key), 10);
    },
    getStyleAttributeValue: function (key) {
        var regEx = new RegExp(String.format(this.styleValueRegEx, key), 'i');
        var value = this.get('Attributes').match(regEx) || undefined;
        if (value && value.length > 1) {
            value = value[1];
        }
        return value;
    },
    getStyleAttributeValueInt: function (key) {
        return parseInt(this.getStyleAttributeValue(key), 10);
    },
    getAttributesAsTextSettingJSON: function () {
        var ts = new TextSetting({
            "font-family": this.getStyleAttributeValue('font-family'),
            "font-size": this.getStyleAttributeValue('font-size'),
            "font-style": this.getStyleAttributeValue('font-style'),
            "font-weight": this.getStyleAttributeValue('font-weight'),
            "text-decoration": this.getStyleAttributeValue('text-decoration'),
            "text-align": this.getStyleAttributeValue('text-align'),
            "color": this.getStyleAttributeValue('color')
        });
        return ts.toJSON();
    },
    getLabelAttributeValue: function (key) {
        var regEx = new RegExp(String.format(this.styleValueRegEx, key), 'i');
        var value = this.get('LabelAttributes').match(regEx) || undefined;
        if (value && value.length > 1) {
            value = value[1];
        }
        return value;
    },
    getLabelAttributeValueInt: function (key) {
        var value = parseInt(this.getLabelAttributeValue(key) || 0, 10);
        if (isNaN(value)) {
            return 0;
        }
        return value;
    },
    getLabelAttributesAsTextSettingJSON: function () {
        var ts = new TextSetting({
            "font-family": this.getLabelAttributeValue('font-family'),
            "font-size": this.getLabelAttributeValue('font-size'),
            "font-style": this.getLabelAttributeValue('font-style'),
            "font-weight": this.getLabelAttributeValue('font-weight'),
            "text-decoration": this.getLabelAttributeValue('text-decoration'),
            "text-align": this.getLabelAttributeValue('text-align'),
            "color": this.getLabelAttributeValue('color')
        });
        return ts.toJSON();
    },
    getAttributesAfterReplacement: function (oldAttrs, newAttrs) {
        // Get and maintain existing style if not replacing
        var style = oldAttrs.match(this.getStyleRegEx) || '';
        if (style && style.length > 1) {
            // wrap so that this.styleValueRegEx will properly find the first style 
            // (eg. width wont' be found if style = 'width: 10px;' since a '"' or a ';' or a space are expected to precede the style
            style = ' ' + style[1];
        }
        // Replace Style
        if (newAttrs.style) {
            var match;
            var key;
            for (key in newAttrs.style) {
                if (newAttrs.style.hasOwnProperty(key)) {
                    var newVal = key + ': ' + newAttrs.style[key] + ';';
                    if (style) {
                        var regEx = new RegExp(String.format(this.styleValueRegEx, key), 'i');
                        match = style.match(regEx);
                        if (match) {
                            style = style.replace(regEx, newVal);    // add back in the '"', ';', or space that was removed by the regex 
                        }
                        else {
                            style += newVal;
                        }
                    }
                    else {
                        style += newVal;
                    }
                }
            }
        }
        style = style ? 'style="' + $.trim(style) + '"' : '';   // Don't add an empty style

        // Get and maintain existing classes if not replacing
        var classAttr = oldAttrs.match(this.getClassRegEx) || '';
        if (classAttr && classAttr.length > 1) {
            classAttr = classAttr[1];
        }
        // Replace classses
        if (newAttrs.classNames) {
            // Loop over each class and see if it already exists, if not add it, if it no longer exists, remove it
            // Make sure there are no duplicates in the new class names
            var tmpClassNames = [];
            var idx = 0;
            var length = newAttrs.classNames.length;
            for (idx; idx < length; idx++) {
                if (tmpClassNames.indexOf(newAttrs.classNames[idx]) === -1) {
                    tmpClassNames.push(newAttrs.classNames[idx]);
                }
            }
            var newClassNames = tmpClassNames.join(' ');
            // Only allow viable class names (eg. not just a number)
            var classList = newClassNames.match(this.classesRegEx) || [];
            classAttr = classList.join(' ');
        }
        classAttr = classAttr ? 'class="' + $.trim(classAttr) + '"' : '';   // Don't add an empty classlist

        // Get and maintain existing title if not replacing
        var title = oldAttrs.match(this.getTitleRegEx) || '';
        if (title && title.length > 1) {
            title = title[1];
        }
        // Replace title (!== is required as an empty string should still replace any old value)
        if (newAttrs.title !== null) {
            title = newAttrs.title;
        }
        title = title ? 'title="' + title + '"' : '';   // Don't add an empty title

        // Get and maintain existing TabIndex if not replacing
        var tabindex = oldAttrs.match(this.getTabIndexRegEx) || '';
        if (tabindex && tabindex.length > 1) {
            tabindex = tabindex[1];
        }
        // Replace TabIndex (!== is required as an empty string should still replace any old value)
        if (newAttrs.tabindex !== null) {
            tabindex = newAttrs.tabindex;
        }
        tabindex = tabindex ? 'tabindex="' + tabindex + '"' : '';   // Don't add an empty tabindex

        // Get and maintain existing autofocus if not replacing
        var autofocus = oldAttrs.match(this.getAutofocusRegEx) || '';
        if (autofocus && autofocus.length > 1) {
            autofocus = autofocus[1];
        }
        // Replace autofocus (!== is required as an empty string should still replace any old value)
        if (newAttrs.autofocus !== null) {
            autofocus = newAttrs.autofocus;
        }
        autofocus = autofocus ? 'autofocus="' + autofocus + '"' : '';   // Don't add an empty autofocus

        // Get and maintain existing dataAttrs if not replacing
        var dataAttrs = oldAttrs.match(this.getDataAttrsRegEx) || '';
        if (dataAttrs && dataAttrs.length > 1) {
            dataAttrs = dataAttrs[0];
        }
        if (newAttrs.dataAttributes) {
            var dataAttr;
            for (dataAttr in newAttrs.dataAttributes) {
                if (newAttrs.dataAttributes.hasOwnProperty(dataAttr)) {
                    var newDataAttr = 'data-' + dataAttr + '="' + newAttrs.dataAttributes[dataAttr] + '" ';
                    if (dataAttrs) {
                        var attrRegEx = new RegExp('data-' + dataAttr + Constants.UtilityConstants.ATTRIBUTE_REGEX, 'i');
                        match = dataAttrs.match(attrRegEx);
                        if (match) {
                            dataAttrs = dataAttrs.replace(attrRegEx, newDataAttr);
                        }
                        else {
                            dataAttrs += newDataAttr;
                        }
                    }
                    else {
                        dataAttrs += newDataAttr;
                    }
                }
            }
        }
        // Return each attribute concatenated
        return autofocus + ' ' + tabindex + ' ' + style + ' ' + classAttr + ' ' + title + ' ' + dataAttrs;
    },
    replaceAttributeValues: function (attributes, options) {
        var attrs = this.get('Attributes') || '';
        var newAttrs = this.getAttributesAfterReplacement(attrs, attributes);
        this.set('Attributes', newAttrs, options);
    },
    replaceLabelAttributeValues: function (attributes, options) {
        var labelAttrs = this.get('LabelAttributes') || '';
        var newAttrs = this.getAttributesAfterReplacement(labelAttrs, attributes);
        this.set({ 'LabelAttributes': newAttrs }, options);
    },
    replaceContainerAttributeValues: function (attributes, options) {
        var attrs = this.get('ContainerAttributes') || '';
        var newAttrs = this.getAttributesAfterReplacement(attrs, attributes);
        this.set({ 'ContainerAttributes': newAttrs }, options);
        this.set({ 'ContainerAttributes': 'tabindex' }, options);
    },
    requiresBackingStore: function () {
        var tag = this.get('Tag');
        if (tag === Constants.ft.FileUpload || tag === Constants.ft.HorizontalRule) {
            return false;
        }
        if (tag === Constants.ft.Label) {
            switch (this.get('BackingStoreId')) {
                case Constants.UtilityConstants.FIELD_ID_CREATED:
                    return true;
                default:
                    return false;
            }
        }
        return true;
    },
    ///<summary>
    /// Update the form elements Value attribute if it is a RadioButtonGroup or CheckBoxGroup and its backing store is a list
    ///</summary>
    updateValueIfList: function () {
        var that = this;
        var tag = this.get('Tag');
        var bsId = this.get('BackingStoreId');
        var cfm = window.customFieldMetas.get(bsId);
        var isList = cfm && cfm.get('Type') === Constants.ty.Object && cfm.get('ListName');
        if (isList && this.isLVPGroup()) {
            var list = window.customLists.getCustomListByName(cfm.get('ListName'));
            list.fetch({
                success: function (listResult) {
                    var lvps = [];
                    var idx = 0;
                    var items = listResult.get('Items');
                    var length = items.length || 0;
                    for (idx; idx < length; idx++) {
                        var itemVal = items[idx];
                        lvps.push({
                            Label: itemVal,
                            Value: itemVal,
                            IsSelected: idx === 0
                        });
                    }
                    if (lvps.length > 0) {
                        that.updateLabelValuePairData(lvps);
                    }
                }
            });
        }
    },
    ///<summary>
    /// Determine if the form element is a Label Value Pair (ie CheckBoxGroup or RadioButtonGroup)
    ///</summary>
    isLVPGroup: function () {
        var tag = this.get('Tag');
        return tag === Constants.ft.CheckBoxGroup || tag === Constants.ft.RadioButtonGroup;
    },
    ///<summary>
    /// Determine whether or not a value setting should be displayed in the field options for the form element
    ///</summary>
    displayValueSetting: function () {
        var tag = this.get('Tag');
        return tag !== Constants.ft.HorizontalRule && tag !== Constants.ft.FileUpload && tag !== Constants.ft.Image && tag !== Constants.ft.Label;
    },
    ///<summary>
    /// Determine whether or not the render as text option should be allowed.
    ///</summary>
    allowRenderAsText: function () {
        var tag = this.get('Tag');
        return tag !== Constants.ft.HorizontalRule && tag !== Constants.ft.Image && tag !== Constants.ft.Label && tag !== Constants.ft.CheckBox && tag !== Constants.ft.CheckBoxGroup && tag !== Constants.ft.RadioButtonGroup;
    },
    ///<summary>
    /// Return whether the form element is a document property, based on its backing store id
    ///</summary>
    isDocumentProperty: function () {
        var bsId = this.get('BackingStoreId');
        var uc = Constants.UtilityConstants;
        return bsId === uc.FIELD_ID_CREATED || bsId === uc.FIELD_ID_KEYWORDS || bsId === uc.FIELD_ID_TITLE;
    },
    ///<summary>
    /// Return whether the form element is a list type, Select, ComboBox, etc.
    ///</summary>
    isList: function () {
        var tag = this.get('Tag');
        return tag === Constants.ft.Select || tag === Constants.ft.ComboBox;
    },
    ///<summary>
    /// Return whether the form element is a numeric type
    isNumeric: function () {
        var tag = this.get('Tag');
        return tag === Constants.ft.NumberInput;
    },
    ///<summary>
    /// Return whether this form element has a label or not
    ///</summary>
    hasLabel: function () {
        return !!$.trim(this.get('Label'));
    },

    //#region Formulas
    ///<summary>
    /// Obtain the Formula for this form element
    ///</summary>
    getFormula: function () {
        var formula = this.get('Formula');
        return formula || '';   // return an empty string rather than undefined if no formula existss
    },
    getFormulaElementIdForFormula: function (ffe) {
        return '[' + ffe.get('Id') + ']';
    },
    ///<summary>
    /// Add the passed in FormFormulaElement to the formula
    ///</summary>
    addFormElementToFormula: function (ffe) {
        var formula = this.getFormula();
        formula += ' ' + this.getFormulaElementIdForFormula(ffe) + ' ';
        this.set('Formula', formula);
    },
    ///<summary>
    /// Add an operation to the Formula (eg. SUM) along with a singular operand the operation should use
    ///<param name="operation">Operation to be performed (eg. SUM)</param>
    ///<param name="ffe">FormFormulaElement</param>
    ///</summary>
    addOperationWithSingleOperandToFormula: function (operation, ffe) {
        var formula = this.getFormula();
        var op = '';
        switch (operation) {
            case 'sum':
                op = ' SUM(' + this.getFormulaElementIdForFormula(ffe) + ') ';
                break;
            default:

        }
        formula += op;
        this.set('Formula', formula);
    },
    replaceFormulaId: function (oldFormulaId, newFormulaId) {
        var formula = this.getFormula();
        if (!formula || !newFormulaId) {
            return;
        }
        var guids = formula.match(this.guidRegEx);
        var idx = 0;
        var length = guids.length;
        for (idx; idx < length; idx++) {
            if (guids[idx] === oldFormulaId) {
                formula = formula.replace(guids[idx], newFormulaId);
            }

        }
        this.set('Formula', formula);
    }
    //#endregion Formulas
});