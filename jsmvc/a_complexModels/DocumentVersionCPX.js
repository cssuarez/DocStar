var DocumentVersionCPX = CustomGridItem.extend({
    dateTimeFields: { CreatedOn: true, ModifiedOn: true, AccessedOn: true, DueDate: true },
    idAttribute: 'Id',
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.CustomFieldValues) {
            attr = attrs.CustomFieldValues;
            if (this.get('CustomFieldValues') instanceof Backbone.Collection) {
                this.get('CustomFieldValues').reset(attr, options);
                delete attrs.CustomFieldValues;
            }
            else {
                attrs.CustomFieldValues = new CustomFieldValues();
                attrs.CustomFieldValues.set(attr, options);
                this.bindSubModelEvents(attrs.CustomFieldValues, 'CustomFieldValues');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};

        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    toJSON: function () {
        return this.toJSONComplex();
    },
    sync: function (method, model, options) {
        options.method = method;
        switch (method) {
            case "create":
                break;
            case "read":
                break;
            case "update":
                break;
            case "delete":
                var that = this;
                options.dialogFunc({
                    callback: function (cleanup) {
                        var sf = function () {
                            $('body').trigger('MassDocumentUpdated', { ids: [that.get('DocumentId')], updateVersioningData: true });
                            Utility.executeCallback(cleanup);
                            options.success({});
                        };
                        var ff = function (jqXHR, textStatus, errorThrown) {
                            ErrorHandler.popUpMessage(errorThrown);
                            Utility.executeCallback(cleanup);
                            $('body').trigger('cancelCheckOutDialogDisplayed.qunit');
                        };
                        var proxy = DocumentServiceProxy({ skipStringifyWcf: true });
                        proxy.deleteVersion({ DocumentVersionId: that.get('Id') }, sf, ff);
                    }
                });
                break;
        }
    },
    getUpdatePackage: function () {
        var ver = this.toJSON();
        delete ver.CustomFieldValues;
        ver.CustomFieldValues = this.get('CustomFieldValues').onlyNonEmptyValues();
        return ver;
    },
    /// <summary>
    /// Used to sort versions by their version number, returns 1 if this version is greater then the version passed, -1 if less and 0 if they are the same.
    /// </summary>
    compareTo: function (version2) {
        if (this.get('Major') > version2.get('Major')) {
            return 1;
        }
        if (this.get('Major') < version2.get('Major')) {
            return -1;
        }
        // Major numbers are equivalent, compare Minor numbers
        if (this.get('Minor') > version2.get('Minor')) {
            return 1;
        }
        if (this.get('Minor') < version2.get('Minor')) {
            return -1;
        }
        // Both Major and Minor are equivalent
        return 0;
    },
    /// <summary>
    /// Gets the username to be displayed. This may be 1 of 3 values.
    /// If there is a publisher then this value is displayed, always.
    /// If the created date equals the modified date then the created by user is displayed.
    /// Finally if neither of the above cases we display the modified by user.
    /// </summary>
    getUserName: function () {
        var userId = this.get('PublishedBy')|| this.get('ModifiedBy') || this.get('CreatedBy');
        var u = window.users.get(userId);
        if (u) {
            return u.get('Username');
        }
        return '';
    },
    /// <summary>
    /// Gets the username of the publisher.
    /// </summary>
    getPublisherName: function () {
        var userId = this.get('PublishedBy');
        if (userId) {
            var u = window.users.get(userId);
            if (u) {
                return u.get('Username');
            }
        }
        return '';
    },
    /// <summary>
    /// Gets the translated state value.
    /// </summary>
    getState: function () {
        var states = Utility.reverseMapObject(Constants.ds);
        return Constants.c["ds_" + states[this.get('CurrentState')]];
    }
});