var SearchRequestCPX = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    proxy: SearchServiceProxy({ skipStringifyWcf: true }),
    timeoutHandle: undefined,
    defaults: {
        ResultId: undefined, IncludeFolders: true, IncludeInboxes: true, IncludeDocuments: true, ContentTypeId: undefined, ContentTypeTitle: '', InboxId: undefined, FolderId: undefined, ContainerName: '',
        MaxRows: 25, Start: 0, TextCriteria: '', FieldedCriteria: [], SortBy: 'Title', SortOrder: '', refreshSearch: false, DocumentRetrieveLimit: undefined, PredefinedSearch: Constants.pds.None
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (options.reset) {
            attrs = _.extend(attrs, this.defaults);
        }
        if (attrs.FieldedCriteria) {
            attr = attrs.FieldedCriteria;
            if (this.get('FieldedCriteria') instanceof Backbone.Collection) {
                this.get('FieldedCriteria').reset(attr, options);
                delete attrs.FieldedCriteria;
            }
            else {
                attrs.FieldedCriteria = new FieldCriteria(attr, options);
                this.bindSubModelEvents(attrs.FieldedCriteria, 'FieldedCriteria');
            }
        }
        if (options.reset || (!attrs.SortBy && !this.get('SortBy'))) {
            this.setSortBy(attrs);
        }
        if (options.reset || (!attrs.SortOrder && !this.get('SortOrder'))) {
            this.setSortOrder(attrs);
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};
        var i;
        attrs = !attrs ? this.attributes : attrs;
        if (attrs.FieldedCriteria) {
            var fc = this.get('FieldedCriteria');
            if (fc instanceof Backbone.Collection) {
                var idx;
                var length = fc.length;
                for (idx = 0; idx < length; idx++) {
                    msg = fc.at(idx).validate();
                    if ($.isEmptyObject(msg) === false) {
                        return msg;
                    }
                }
            }
            else {
                msg = fc.validate();
            }
        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    toJSON: function () {
        return this.toJSONComplex();
    },
    getSuggestions: function (callback) {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = undefined;
        }

        var word = this.get('TextCriteria');
        if ($.trim(word).length <= 0) {// Don't send empty requests
            callback([]);
            return;
        }
        var success = function (r) {
            if (r && r.Suggestions) {
                callback(r.Suggestions);
            } else {
                callback([]);
            }
        };
        var failure = function (xhr, statusText, error) {
            ErrorHandler.addErrors(error.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        };
        var getFunc = function () {
            SearchUtil.searchProxy.vocabulary({ Word: word, Limit: 10 }, success, failure);
        };
        timeoutHandle = setTimeout(getFunc, Constants.TypeAheadDelay);
    },
    setSortOrder: function (attrs, options) {
        var so = Utility.GetUserPreference('searchOrder') || 'desc';
        if (attrs) {
            attrs.SortOrder = so;
        } else {
            this.set('SortOrder', so, options);
        }
    },
    setSortBy: function (attrs, options) {
        var sb = Utility.GetUserPreference('searchOrderBy') || Constants.UtilityConstants.SF_TITLE;
        if (attrs) {
            attrs.SortBy = sb;
        } else {
            this.set('SortBy', sb, options);
        }
    }
});