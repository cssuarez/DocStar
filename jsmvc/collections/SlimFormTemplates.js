var SlimFormTemplates = Backbone.Collection.extend({
    model: SlimFormTemplate,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.alphaNumericSort,
    proxy: FormsServiceProxy({ skipStringifyWcf: true }),
    sync: function (method, collection, options) {
        var ff = function (jqXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.wait = false;
                options.success(result);
            }
        };
        switch (method) {
            case 'read':
                this.proxy.getTemplatesSlim(sf, ff, complete, null, options.headers);
                break;
        }
    },
    ///<summary>
    /// Remove the 'editing' attribute from every template
    ///<param name="modelIdToNotClear">Do not clear the editing property of the model with this id, if specified</param>
    ///</summary>
    clearEditing: function (modelIdToNotClear) {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var item = this.at(idx);
            if (modelIdToNotClear !== item.get('FormTemplateId')) {
                item.set('editing', false);
            }
        }
    },
    ///<summary>
    /// Obtain the template that is currently being edited or was the last to be edited
    ///<summary>
    getTemplateInEdit: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            if (this.at(idx).get('editing')) {
                return this.at(idx);
            }
        }
        return null;
    },
    ///<summary>
    /// Obtain every selected slim form template
    /// To be used for category viewing
    ///<param name="includeNew">whether or not to include the 'Blank Form Template'</param>
    ///</summary>
    getSelected: function (includeNew) {
        var selected = [];
        var idx = 0;
        var length = this.length;
        if (includeNew) {
            selected.push(new SlimFormTemplate());
        }
        for (idx; idx < length; idx++) {
            var item = this.at(idx);
            if (item.get('selected')) {
                selected.push(item);
            }
        }
        return selected;
    },
    ///<summary>
    /// Obtain all slim form templates in the categoryname
    ///<param name="categoryName"> Category of template to filter templates by</param>
    ///</summary>
    filterByCategory: function (categoryName) {
        var sfts = [];
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var sft = this.at(idx);
            if (sft.isInCategory(categoryName)) {
                sfts.push(sft.toJSON());
            }
        }
        return sfts;
    },
    ///<summary>
    /// Select slim form templates based upon the category they reside in
    ///<param name="categoryName">The name of the category that the slim form template is in</param>
    ///<param name="options">Backbone options</param>
    ///</summary>
    setSelectedInCategory: function (categoryName, options) {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var item = this.at(idx);
            item.set('selected', item.isInCategory(categoryName), options);
        }
    }
});