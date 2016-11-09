var FormElements = Backbone.Collection.extend({
    proxy: FormsServiceProxy({ skipStringifyWcf: true }),
    model: FormElement,
    errorMsg: null,
    ///<summary>
    /// Obtain an array of form elements that share the same backing store id
    /// Returns an array of form element models
    ///</summary>
    getElementsByBackingStoreId: function (bsId) {
        var elems = [];
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var elem = this.at(idx);
            if (elem.get('BackingStoreId') === bsId) {
                elems.push(elem);
            }
        }
        return elems;
    },
    ///<summary>
    /// Reset the 'error' property on all elements to undefined
    ///</summary>
    clearErrors: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var model = this.at(idx);
            model.set('error', undefined);
        }
    },
    clearSelected: function (selectedModelId) {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var model = this.at(idx);
            var modelId = model.get('Id');
            if (modelId !== selectedModelId && model.isSelected()) {
                model.set('selected', false);
            }
        }
    },
    setSelectedIfNoSelected: function () {
        if (this && this.length > 0) {
            var selectedFormElements = this.getSelected(true);
            if (!selectedFormElements) {
                // If no selected control has been supplied obtain the element furthest to the top (ie. has the least top value)
                var selectedFormElement = this.getLeastTopElement();
                selectedFormElement.set('selected', true);
            }
        }
    },
    getSelected: function (testIfEmpty) {
        var idx = 0;
        var length = this.length;
        var selected = [];
        for (idx; idx < length; idx++) {
            var model = this.at(idx);
            if (model.isSelected()) {
                selected.push(model);
            }
        }
        if (testIfEmpty && selected.length === 0) {
            return false;
        }
        return selected;
    },
    fixPositionAndDimensions: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            this.at(idx).fixPositionAndDimensions();
        }
    },
    getFormElementsMarkup: function (options) {
        var collection = this;
        options = options || {};
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            } else {
                ErrorHandler.popUpMessage(error);
            }
        };
        var cf = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var group = options.group ? options.group.toJSON() : undefined;
        var sf = function (result) {
            var feIdx = 0;
            var feLen = collection.length;
            // Honourable intentions! - Update form element markup if not fetching markup for group
            // Markup is fetched for a group to preview group min/max with offsetX and offsetY
            if (!group) {
                for (feIdx; feIdx < feLen; feIdx++) {
                    var key = result[feIdx].Key;
                    var val = result[feIdx].Value;
                    var fe = collection.get(key);
                    fe.set({ 'Markup': val }, { silent: true });
                }
            }
            if (options && options.success) {
                options.success(result);
            }
        };
        this.fixPositionAndDimensions();
        this.proxy.generateHtmlElements({ Elements: this.toJSON(), Group: group, FormTemplatePkg: options.formTemplatePkg || null }, sf, ff, cf, null, options.headers);
    },
    getLeastTop: function () {
        var idx = 0;
        var length = this.length;
        var top = -1;
        for (idx; idx < length; idx++) {
            var elemTop = this.at(idx).get('Top');
            if (top === -1 || elemTop < top) {
                top = elemTop;
            }
        }
        return top;
    },
    getLeastLeft: function () {
        var idx = 0;
        var length = this.length;
        var left = -1;
        for (idx; idx < length; idx++) {
            var elemLeft = this.at(idx).get('Left');
            if (left === -1 || elemLeft < left) {
                left = elemLeft;
            }
        }
        return left;
    },
    getLeastTopElement: function () {
        var idx = 0;
        var length = this.length;
        var top = -1;
        var leastTopElem;
        for (idx; idx < length; idx++) {
            var fe = this.at(idx);
            var feTop = fe.get('Top');
            if (top === -1 || feTop < top) {
                top = feTop;
                leastTopElem = fe;
            }
        }
        return leastTopElem;
    },
    //#region Formulas
    replaceFormulaId: function (oldFormulaId, newFormulaId) {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var m = this.at(idx);
            m.replaceFormulaId(oldFormulaId, newFormulaId);
        }
    }
    //#endregion Formulas
});