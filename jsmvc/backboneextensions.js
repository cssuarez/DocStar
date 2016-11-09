/* 
Globally overriding toJSON method for models to account for Date type fields
*/
Backbone.Model.prototype.toJSON = function (options) {
    //This part is identical to .toJSON in backbone.js
    var skipDateTimeProcessing = options && options.skipDateTimeProcessing;
    var attrs = _.clone(this.attributes);
    //The rest is not:
    if (!skipDateTimeProcessing && !$.isEmptyObject(this.dateTimeFields)) {
        var attr;
        for (attr in attrs) {
            if (attrs.hasOwnProperty(attr) && this.dateTimeFields[attr] && attrs[attr]) {
                var val = new Date(attrs[attr]);
                if (!attrs[attr] || isNaN(val)) {
                    val = new Date(JSON.parseWithDate(JSON.stringify(attrs[attr])));
                }
                if (val && !isNaN(val)) {
                    attrs[attr] = val.toMSJSON();
                }
            }
        }
    }
    return attrs;
};
/* 
    Add a new Item to a collection 
    The collections add event handler needs to be aware of adding a new item, so as to not trigger its add event
*/
Backbone.Collection.prototype.getNewList = function (newItem) {
    if (!this.get(Constants.c.emptyGuid)) {
        this.add(newItem, { at: 0, silent: true });	//silent so bound add events aren't triggered
    }
    return this;
};
/* Globally overriding parse method for models to use our response structure. 
*   response: response from ajax call, should be a JSON response from the Result method of ControllerBase
*/
Backbone.Model.prototype.parse = function (response) {
    if (!response || !response.status) {
        return response;
    }
    if (response.status === "ok") {
        if (response.result !== null) {
            this.id = response.result.Id;
        }
        return response.result;
    }
    this.errorMsg = response.message;
    return [];
};
Backbone.Model.prototype.isDirtyEligible = function () {
    var firstLetterUpper = /^[A-Z]/;//Any property that is camelcase is not eligible. 
    var e = false;
    if (this && this.changed) {
        var attr;
        for (attr in this.changed) {
            if (this.changed.hasOwnProperty(attr) && firstLetterUpper.test(attr)) {
                e = true;
                break;
            }
        }
    }
    return e;
};
Backbone.Model.prototype.bindSubModelEvents = function (model, propName) {
    var that = this;
    if (model instanceof Backbone.Collection) { //Complex Models bind to their collection add/remove and trigger a change event. This way an add or remove will register as a change on parent models.
        this.listenTo(model, 'add', function (m, c, o) {
            o = o || {};
            o.collectionDirtyChange = true;
            o.collectionName = propName;
            that.trigger('change', m, o);
        });
        this.listenTo(model, 'remove', function (m, c, o) {
            o = o || {};
            o.collectionDirtyChange = true;
            o.collectionName = propName;
            that.trigger('change', m, o);
        });
        this.listenTo(model, 'change reset', function (m, o) {
            o = o || {};
            o.collectionDirtyChange = o.collectionDirtyChange || (m.isDirtyEligible ? m.isDirtyEligible() : false);
            o.collectionName = propName;
            that.trigger('change', m, o);
        });
    }
    else {
        this.listenTo(model, 'all', function () {
            that.fireSubModelEvent(propName, arguments);
        });
    }
};
Backbone.Model.prototype.fireSubModelEvent = function (propName, args) {
    var options = {};
    switch (args[0]) {
        case 'add':
        case 'remove':
        case 'destroy':
        case 'request':
        case 'error':
        case 'invalid':
        case 'sync':
            options = this.appendPropName(propName, args[3]);
            this.trigger(args[0], args[1], args[2], options);
            break;
        case 'reset':
        case 'sort':
        case 'change':
            options = this.appendPropName(propName, args[2]);
            this.trigger(args[0], args[1], options);
            break;
        default:
            if (args[0].indexOf("change:") === 0) {
                var change = args[0].substring(7);
                args[0] = 'change:' + propName + '.' + change;
                this.trigger(args[0], args[1], args[2], args[3]);
            }
    }
};
Backbone.Model.prototype.appendPropName = function (propName, options) {
    var newoptions = $.extend(true, {}, options);
    if (newoptions.propName) {
        newoptions.propName = propName + "." + newoptions.propName;
    }
    else {
        newoptions.propName = propName;
    }
    return newoptions;
};
Backbone.Model.prototype.toJSONComplex = function (options) {
    var obj = Backbone.Model.prototype.toJSON.call(this, options);
    var o;
    for (o in obj) {
        if (obj.hasOwnProperty(o) && obj[o] && obj[o].toJSON) {
            obj[o] = obj[o].toJSON(options);
        }
    }
    return obj;
};
Backbone.Model.prototype.getDotted = function (dottedProp) {
    if (!(dottedProp instanceof Array)) {
        dottedProp = dottedProp.split('.');
    }
    var myProp = dottedProp.shift();
    if (dottedProp.length === 0) {
        return this.get(myProp);
    }
    var m = this.get(myProp);
    if (m) {
        return m.getDotted(dottedProp);
    }
};
Backbone.Model.prototype.setDotted = function (dottedProp, val, options) {
    if (!(dottedProp instanceof Array)) {
        dottedProp = dottedProp.split('.');
    }
    var myProp = dottedProp.shift();
    if (dottedProp.length === 0) {
        return this.set(myProp, val, options);
    }
    var m = this.get(myProp);
    if (!m) {
        var createOptions = $.extend({ silent: true }, options || {}); //Don't trigger change on creation of a new object, instead trigger on settings its value.
        this.set(myProp, {}, createOptions);
        m = this.get(myProp);
    }
    return m.setDotted(dottedProp, val, options);
};
Backbone.Model.prototype.unsetDotted = function (dottedProp, options) {
    if (!(dottedProp instanceof Array)) {
        dottedProp = dottedProp.split('.');
    }
    var myProp = dottedProp.shift();
    if (dottedProp.length === 0) {
        return this.unset(myProp, options);
    }
    var m = this.get(myProp);
    if (m) {
        return m.unsetDotted(dottedProp, options);
    }
};
Backbone.Collection.prototype.getDotted = function (dottedProp) {
    if (!(dottedProp instanceof Array)) {
        dottedProp = dottedProp.split('.');
    }
    var myProp = dottedProp.shift();
    if (dottedProp.length === 0) {
        return this.get(myProp);
    }
    var m = this.get(myProp);
    if (m) {
        return m.getDotted(dottedProp);
    }
};
Backbone.Collection.prototype.setDotted = function (dottedProp, val, options) {
    if (!(dottedProp instanceof Array)) {
        dottedProp = dottedProp.split('.');
    }
    var myProp = dottedProp.shift();
    if (dottedProp.length === 0) {
        return this.set(myProp, val, options);
    }
    var m = this.get(myProp);
    if (m) {
        return m.setDotted(dottedProp, val, options);
    }
};
Backbone.Model.prototype.normalizeSetParams = function (key, value, options, attrs) {
    // Normalize the key-value into an object
    if (_.isObject(key) || key === null) {
        _.extend(attrs, key);
        _.extend(options, value);
    }
    else {
        var tmpAttrs;
        (tmpAttrs = {})[key] = value;
        _.extend(attrs, tmpAttrs);
    }
};
/* Globally overriding parse method for collections to use our response structure. 
*   response: response from ajax call, should be a JSON response from the Result method of ControllerBase
*/
Backbone.Collection.prototype.parse = function (response) {
    if (!response.status) {
        return response;
    }
    if (response.status === "ok") {
        if (response.result !== null) {
            this.id = response.result.Id;
        }
        return response.result;
    }
    this.errorMsg = response.message;
    return [];
};
/* Generic method to handle successful saves in views
*   result: from ajax call
*   response: from ajax call
*   id: id of the selected item
*   collection: passed in collection to update after successful call.
*   classInstance: backbone collection class calling this function.
*   dialogSelector: selector for dialog to display a OverridableException, if the exception exists 
*   ****    If passing in a dialog selector initialize the dialog elsewhere     ****
****    (i.e. the initialize function for the view calling this method )    ****
*/
Backbone.View.prototype.saveSuccess = function (result, response, id, collection, classInstance, errSelector, getMethod, viewDataSelected) {
    if (!viewDataSelected) {
        viewDataSelected = 'selected';
    }
    var isOverridableException = false;
    if (response.exceptionType && response.exceptionType.match('OverridableException')) {
        isOverridableException = true;
    }
    if (!response.status || response.status === 'ok' || isOverridableException) {
        if (classInstance.viewData) {
            classInstance.viewData[viewDataSelected] = result;
        }
        if (!this.isNew(id)) {
            var existing;
            if (getMethod) { existing = getMethod(id); }
            else { existing = collection.get(id); }
            if ($.isEmptyObject(existing)) {
                collection.add(result);
            }
            else {
                if (result !== existing) {
                    if (result.attributes) {
                        existing.set(result.attributes, { silent: true });
                    } else {
                        existing.set(result, { silent: true });
                    }
                }
            }
        }
        else {
            collection.add(result);
        }
        collection.sort().trigger('reset', collection);
        if (isOverridableException) {
            var msg = response.message;
            if (result.get('Username')) {
                msg = response.message.replace('{0}', "'" + result.get('Username') + "'");
            }
            if ($(errSelector).length > 0) {
                $(errSelector).find('span').text(msg);
                $(errSelector).dialog('open');
            }
            else if (errSelector) {
                var err = {};
                if (typeof msg === "string") {
                    err[errSelector] = msg;
                } else {
                    err = msg;
                }
                ErrorHandler.addErrors(err, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                return false;
            }
        }
    }
    else {
        if (classInstance.handleErrors) {
            classInstance.handleErrors(null, response.message);
        } else {
            ErrorHandler.addErrors(response.message);
        }
        return false;
    }
    return true;
};
Backbone.View.prototype.isNew = function (id) {
    return (!id || id === Constants.c.emptyGuid);
};
/*

*/
Backbone.View.prototype.isNameValid = function (name, maxLength) {
    if (!$.trim(name)) {
        return 'isEmpty';
    }
    if ($.trim(name) === Constants.c.newTitle) {
        return 'isNew';
    }
    if (name.length > (parseInt(maxLength, 10) || 256)) {
        return 'tooLong';
    }
    return 'true';
};
Backbone.View.prototype.isNameValidHandling = function (name, errDispName, maxLength) {
    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
    var isNameValid = this.isNameValid(name, maxLength);
    var errObj = {};
    if (isNameValid !== 'true') {
        if (!errDispName) {
            ErrorHandler.addErrors(Constants.c.nameEmptyWarning, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return false;
        }
        if (isNameValid === 'isEmpty') {
            errObj[errDispName] = Constants.c.nameEmptyWarning;
            ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, null, null, this.$el);
            return false;
        }
        if (isNameValid === 'isNew') {
            errObj[errDispName] = String.format(Constants.c.newNameWarning, Constants.t('newTitle'));
            ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, null, null, this.$el);
            return false;
        }
        if (isNameValid === 'tooLong') {
            errObj[errDispName] = Constants.c.nameTooLong;
            ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, null, null, this.$el);
            return false;
        }
    }
    return true;
};
Backbone.View.prototype.getComboBoxIdByName = function (name, select) {
    // name: name to compare against select list values, to determine if it is in the select list
    // select: select list that contains a list of models, if name is found in the select list fetch the matching id
    if (!select || $(select).length <= 0) {
        select = $('select[name="Name"]');
    }
    var options = $(select).find('option');
    var len = options.length;
    var i = 0;
    var id;
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
    return id;
};
/*
    Obtain the New Class contained within @collection
    @collection: a backbone collection in which to find the new class
    @comparisonKey: string, used to filter @collection models for comparison against @comparisonValue
    @comparisonValue: string, used to filter @collection models 
    return a backbone model contained within @collection 
*/
Backbone.View.prototype.getNewClass = function (collection, comparisonKey, comparisonValue) {
    comparisonKey = comparisonKey || 'Id';
    comparisonValue = comparisonValue || Constants.c.emptyGuid;
    var newClass = collection.find(function (item) {
        return item.get(comparisonKey) === comparisonValue;
    });
    if (!newClass || $.isEmptyObject(newClass)) {
        newClass = collection.first();
    }
    return newClass;
};
Backbone.View.prototype.renderDialog = function () {
    if (this.$dialog) {
        return;
    }
    this.dialogCallbacks = this.dialogCallbacks || {};
    var that = this;
    var opts = {
        okText: Constants.t('save'),
        autoOpen: false,
        open: function () {
            that.$dialog.find('input[name="Name"]').focus().select();
        },
        html: this.$el
    };
    opts = $.extend(opts, this.dialogOptions);
    var okFunc = function (cleanup) {
        var saveCallback = that.dialogCallbacks.saveCallback;
        var callback = function (result) {
            Utility.executeCallback(saveCallback, result);
            Utility.executeCallback(cleanup);
        };
        var failureFunc = function () { // Error Display is handled in save changes
            DialogsUtil.cleanupDialog(that.$dialog, null, true);
        };
        if (that.executeDialogSave) {
            that.executeDialogSave(callback, failureFunc);
        }
        else {
            //TODO: SCAIN - REPLACE THIS (not applicable for every view), by adding executeDialogSave to views rendered as dialogs, having executeDialogSave call the views own save function...
            that.saveChanges(null, null, callback, failureFunc);
        }
    };
    var cancelFunc = function (cleanup) {
        // Check dirty flag of custom field meta edit view
        var saveDirtyPrompt = function (dirtyCleanup) {
            okFunc();                
            Utility.executeCallback(dirtyCleanup); //Call regardless of okFunc success or failure
        };
        var noSaveDirtyPrompt = function (dirtyCleanup) {
            if (that.clearDirty) {
                that.clearDirty();
            }
            that.close();
            Utility.executeCallback(cleanup);
            Utility.executeCallback(dirtyCleanup);
            Utility.executeCallback(that.dialogCallbacks.cancelCallback);
        };
        if (that.isDirty && that.isDirty()) {
            var dto = DTO.getDTO(that.$el);
            var dirtyOpts = {
                open: function () {
                    $(this).width('auto');
                    $(this).height('auto');
                },
                close: cancelFunc
            };
            DialogsUtil.generalSaveDirtyPromptDialog(String.format(Constants.c.unsavedChanges, dto.Name), saveDirtyPrompt, noSaveDirtyPrompt, dirtyOpts);
        }
        else {
            noSaveDirtyPrompt();
        }
    };
    this.$dialog = DialogsUtil.generalPromptDialog('', okFunc, cancelFunc, opts);
    this.$dialog.dialog('open');
};
Backbone.Router.prototype.onNavigate = function (s) {
    Navigation.onNavigate(s);
    Page.showTimeMsg();
};

//#region Sorting
///<summary>
/// Obtain which property should be used for sorting
///</summary>
Backbone.Model.prototype.getSort = function () {
    var m = this;
    // If a sortAttribute was set on the model use it for sorting
    if (m.sortAttribute) {
        return m.sortAttribute;
    }
    // Find the property that should be used for sorting, if one was not provided
    var sort = 'Username';
    if (m.get(sort) && typeof (m.get(sort)) !== 'string') { sort = defSort; }
    if (!m.get(sort)) { sort = 'Name'; }
    if (m.get(sort) && typeof (m.get(sort)) !== 'string') { sort = defSort; }
    if (!m.get(sort)) { sort = 'Title'; }
    if (m.get(sort) && typeof (m.get(sort)) !== 'string') { sort = defSort; }
    if (!m.get(sort)) { sort = 'DisplayName'; }
    if (m.get(sort) && typeof (m.get(sort)) !== 'string') { sort = defSort; }
    return sort;
};
///<summary>
/// Default comparator for sorting the collection
/// Collection must opt in to use this comparator
///</summary>
Backbone.Collection.prototype.defaultComparator = function (m) {
    var defSort = '';
    var sort = m.getSort();
    if (!m.get(sort) && m.get('CustomFieldGroup')) {
        return m.get('CustomFieldGroup').Name.toLowerCase();
    }
    if (!m.get(sort) && m.get('Connection')) {
        return m.get('Connection').Domain.toLowerCase();
    }
    if (m.get(sort) && typeof (m.get(sort)) === 'string') {
        return m.get(sort).toLowerCase();
    }
    return m.get(sort);
};
///<summary>
/// Alpha-numeric sort
/// Collection must opt in to use this comparator
///<param name="mA" model belonging to the collection</param>
///<param name="mB" model belonging to the collection</param>
///</summary>
Backbone.Collection.prototype.alphaNumericSort = function (mA, mB) {
    // mA and mB should be the same type of model, so just need to obtain one of the models sort properties
    var sort = mA.getSort();
    var a = mA.get(sort).toLowerCase();
    var b = mB.get(sort).toLowerCase();
    // Check to see if the name is 'hidden', if so place it at the end of the list
    var isANameHidden = a === Constants.t('hidden');
    var isBNameHidden = b === Constants.t('hidden');
    if (isANameHidden && isBNameHidden) {
        return 0;
    }
    if (isANameHidden) {
        return 1;
    }
    if (isBNameHidden) {
        return -1;
    }
    return Sort.alphaNumeric(a, b);
};
//#endregion Sorting
