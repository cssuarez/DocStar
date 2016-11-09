var CustomFieldMetaGroupPackage = Backbone.Model.extend({
    idAttribute: 'Id',
    dateTimeFields: {},
    proxy: CustomFieldProxy({ skipStringifyWcf: true }),
    initialize: function (options) {
        if (options !== undefined) {
            // Set this model's id to the Guid returned by the API
            // "id" must be set on the model to denote existing data
            // if "id" is unset, a call to model.save() will attempt to insert a new record
            if (options && options.CustomFieldGroup && options.CustomFieldGroup.Id !== undefined) {
                // "silent" set to true won't send a changed event, so validate won't fire
                this.set({ "Id": options.CustomFieldGroup.Id }, { "silent": true });
            }
        }
    },
    validate: function (attrs) {
        //validate gets called when updating the model too.
        var error;
        var cfg = attrs.CustomFieldGroup;
        if (cfg) {
            if (cfg.Name === '') {
                error = { 'Name': Constants.t('nameEmptyWarning') };
            }
            if (cfg.Name === Constants.c.newTitle) {
                error = { 'Name': String.format(Constants.c.newNameWarning, Constants.t('newTitle')) };
            }
            if (error) {
                return error;
            }
        }
        var cfgts = attrs.CustomFieldGroupTemplates;
        if (cfgts) {
            if (cfgts.length === 0) {
                error = Constants.t('customFieldGroupCannotHaveZeroTemplates');
            }
            if (error) {
                return error;
            }
        }
        return;
    },
    sync: function (method, model, options) {
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
                options.success(result);
            }
        };
        var attrs;
        switch (method) {
            case 'create':
                attrs = this.toJSON();
                attrs.CustomFieldGroup.Id = Constants.c.emptyGuid;
                if (options.createBuiltIn) {
                    this.proxy.createFieldsAndGroup({ CustomFieldGroupPackage: attrs, NewCustomFieldMetas: options.newFieldMetas }, function (result) {
                        result.Id = result.CustomFieldGroup.Id;
                        model.set(result);
                        sf(result);
                    }, ff, complete, null, options.headers);
                }
                else {
                    this.proxy.createGroup(attrs, sf, ff, complete, null, options.headers);
                }
                break;
            case 'update':
                attrs = this.toJSON();
                if (options.createBuiltIn) {
                    this.proxy.createFieldsAndGroup({ CustomFieldGroupPackage: attrs, NewCustomFieldMetas: options.newFieldMetas }, sf, ff, complete, null, options.headers);
                }
                else {
                    this.proxy.updateGroup(model, sf, ff, complete, null, options.headers);
                }
                break;
            case 'delete':
                var cfg = model.get('CustomFieldGroup');
                var id = cfg.Id;
                this.proxy.deleteGroup(id, sf, ff, complete, null, options.headers);
                break;
        }
    },
    /// <summary>
    /// Creates an array of CustomFieldValue based on the CustomFieldGroupTemplates collection.
    /// This method will generate a setId.
    /// </summary>
    createValueSet: function () {
        var templates = this.get('CustomFieldGroupTemplates');
        var setId = Utility.getSequentialGuids(1)[0];
        var name = this.get('CustomFieldGroup').Name;

        var set = [];
        var i = 0;
        var length = templates ? templates.length : 0;
        for (i; i < length; i++) {
            var t = templates[i];
            var cfm = window.customFieldMetas.get(t.CustomFieldMetaId);
            var obj = cfm.createValueObject();
            obj.CustomFieldGroupId = t.CustomFieldGroupId;
            obj.CustomFieldGroupName = name;
            obj.CustomFieldGroupOrder = t.Order;
            obj.CustomFieldGroupTemplateId = t.Id;
            obj.SetId = setId;

            set.push(obj);
        }

        return set;
    },
    createBuiltIn: function () {
        switch (this.get('CustomFieldGroup').Name) {
            case Constants.c.name:
                this.createCustomFieldGroupName();
                break;
            case Constants.c.address:
                this.createCustomFieldGroupAddress();
                break;
        }
    },
    addFieldsToTemplates: function (cfms) {
        var cfgts = this.get('CustomFieldGroupTemplates') || [];
        var cfgId = this.get('Id');
        var obj = {};
        var idx = 0;
        var length = cfgts.length;
        var cfmId;
        for (idx; idx < length; idx++) {
            var cfgt = cfgts[idx];
            cfmId = cfgt.CustomFieldMetaId;
            obj[cfmId] = true;
        }
        length = cfms.length;
        for (idx = 0; idx < length; idx++) {
            cfmId = cfms[idx].Id;
            if (!obj[cfmId]) {
                cfgts.push({
                    Order: idx,
                    CustomFieldGroupId: cfgId,
                    CustomFieldMetaId: cfmId
                });
            }
        }
    },
    createCustomFieldGroupName: function () {
        var cfmIds = Utility.getSequentialGuids(2);
        var cfmAttrs = {
            Type: Constants.ty.String
        };
        var cfms = [
            $.extend({}, cfmAttrs, { Id: cfmIds[0], Name: Constants.c.firstName }),     // First Name
            $.extend({}, cfmAttrs, { Id: cfmIds[1], Name: Constants.c.lastName })]      // Last Name
        ;
        var adds = window.customFieldMetas.filterOutExisting(cfms);
        this.addFieldsToTemplates(cfms);
        if (this.get('Id') === Constants.c.emptyGuid) {
            this.unset('Id');
        }
        this.save(null, {
            createBuiltIn: true,
            newFieldMetas: adds
        });
    },
    createCustomFieldGroupAddress: function () {
        var cfmIds = Utility.getSequentialGuids(6);
        var cfmAttrs = {
            Type: Constants.ty.String
        };
        var cfms = [
            $.extend({}, cfmAttrs, { Id: cfmIds[0], Name: Constants.c.street }),        // First Name
            $.extend({}, cfmAttrs, { Id: cfmIds[1], Name: Constants.c.suite }),         // Last Name
            $.extend({}, cfmAttrs, { Id: cfmIds[2], Name: Constants.c.city }),          // City
            $.extend({}, cfmAttrs, { Id: cfmIds[3], Name: Constants.c.state }),         // State
            $.extend({}, cfmAttrs, { Id: cfmIds[4], Name: Constants.c.postalCode }),    // Postal Code
            $.extend({}, cfmAttrs, { Id: cfmIds[5], Name: Constants.c.country })        // Country
        ];
        var adds = window.customFieldMetas.filterOutExisting(cfms);
        this.addFieldsToTemplates(cfms);
        if (this.get('Id') === Constants.c.emptyGuid) {
            this.unset('Id');
        }
        this.save(null, {
            createBuiltIn: true,
            newFieldMetas: adds
        });
    },
    createSampleData: function () {
        var ty = Constants.ty;
        var i, row;
        var valueSet = this.createValueSet();
        var length = valueSet.length;
        var rowCount = 2;
        var cfValues = [];
        for (i = 0; i < length; i++) {
            var cfVal = valueSet[i];
            for (row = 0; row < rowCount; row++) {
                cfVal.Id = Utility.intToGuid(row * length + i);
                cfVal.SetId = Utility.intToGuid(row);
                var shortValue = row === 0;
                var val = '';
                switch (cfVal.TypeCode) {
                    case ty.Boolean:
                        val = shortValue;
                        break;
                    case ty.Int32:
                        val = shortValue ? 1234 : 12345678;
                        break;
                    case ty.Int64:
                        val = shortValue ? 1234567 : 12345678901234;
                        break;
                    case ty.Decimal:
                        val = shortValue ? 12.34 : 1234.5678;
                        break;
                    case ty.Date:
                        val = shortValue ? new Date('1/1/2001') : new Date('12/12/2012');
                        val = val.format('generalDateOnly');
                        break;
                    case ty.DateTime:
                        val = shortValue ? '2001-01-01T00:00:00.000Z' : '2012-12-12T00:00:00.000Z';
                        break;
                    case ty.Object:
                    case ty.String:
                        if (shortValue) {
                            val = 'Lorem';
                        } else if (Page.currentUser && Page.currentUser.Name === 'admin@docstar.com') {
                            val = 'Owah tagoo sy-em';
                        } else {
                            val = 'Lorem ipsum dolor sit amet.';
                        }
                        break;
                    default:
                        val = shortValue ? 'Lorem' : 'Lorem ipsum dolor sit amet.';
                        break;
                }
                var newcfval = new CustomFieldValue(cfVal);
                newcfval.setValue(val, { ignoreChange: true }); //Don't trigger events when adding sample data.
                cfValues.push(newcfval);
            }
        }
        var result = new BulkViewerDataPackageCPX({ DocumentPackage: { Version: { CustomFieldValues: cfValues } } });
        return result;
    },
    createTemplateLookup: function () {
        var lookup = {};
        var ts = this.get('CustomFieldGroupTemplates');
        var i = 0;
        var length = ts ? ts.length : 0;
        for (i; i < length; i++) {
            var t = ts[i];
            lookup[t.CustomFieldMetaId] = t;
        }
        return lookup;
    }
});