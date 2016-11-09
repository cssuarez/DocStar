var ContentType = Backbone.Model.extend({
    dateTimeFields: { CreatedOn: true },
    idAttribute: 'Id',
    proxy: ContentTypeServiceProxy({ skipStringifyWcf: true }),
    defaultsMap: undefined,
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};
        var name = attrs.Name;
        if (!name || name.length === 0) {
            msg.Name = Constants.c.nameEmptyWarning;
        }
        else if (name === Constants.c.newTitle) {
            msg.Name = Constants.c.titleNewWarning;
        }
        else {
            var y = window.contentTypes.find(function (e) {
                if ($.trim(attrs.Name) === $.trim(e.get('Name')) && (attrs.Id !== e.get('Id'))) {
                    return true;
                }
            });
            if (y) {
                msg.Name = Constants.c.duplicateNameError;
            }

        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    sync: function (method, model, options) {
        var that = this;
        var ff = function (jqXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            $('body').trigger('MassDocumentUpdated');
            if (options && options.success) {
                options.success(result);
            }
        };
        var success;
        switch (method) {
            case 'create':
                success = function (result) {
                    that.set('Id', result.Id);
                    if (window.contentTypes) {
                        window.contentTypes.add(result, { merge: true });
                    }
                    sf(result);
                };
                this.proxy.create(model, success, ff, complete);
                break;
            case 'update':
                success = function (result) {
                    if (window.contentTypes) {
                        window.contentTypes.add(result, { merge: true });
                    }
                    sf(result);
                };
                this.proxy.update(model, success, ff, complete);
                break;
            case 'delete':
                success = function (result) {
                    window.contentTypes.remove(that, { replacementId: options.ReplacementId });
                    sf(result);
                };
                var delObj = { Id: model.get('Id') };
                if (options && options.ReplacementId && options.ReplacementId !== Constants.c.emptyGuid) {
                    delObj.ReplacementId = options.ReplacementId;
                }
                this.proxy.deleteContentType(delObj, success, ff, complete);
                break;
        }
    },
    getDisplayMask: function () {
        var ctdm = this.get('DisplayMask');
        ctdm = Utility.tryParseJSON(ctdm, true);
        ctdm = $.extend({ DisplayOrder: [], IsDisplayed: {} }, ctdm);
        return ctdm;
    },
    defaultsNotInDisplayMaskOrCFValues: function (repCfmIds) {
        var dm = this.getDisplayMask();
        var defaultCFS = this.get('DefaultCustomFields');
        var i = 0;
        var length = defaultCFS ? defaultCFS.length : 0;
        var result = [];
        for (i; i < length; i++) {
            var dcf = defaultCFS[i];
            if (!repCfmIds[dcf.CustomFieldMetaID] && dm.IsDisplayed[dcf.CustomFieldMetaID] === undefined) {
                result.push(dcf);
            }
        }
        return result;
    },
    buildDefaultsMap: function () {
        this.defaultsMap = {};
        var defaultCFS = this.get('DefaultCustomFields');
        var i = 0;
        var length = defaultCFS ? defaultCFS.length : 0;
        for (i; i < length; i++) {
            this.defaultsMap[defaultCFS[i].CustomFieldMetaID] = i;
        }
    },
    metaIdIsDefaultField: function (cfMetaId) {
        if (!this.defaultsMap) {
            this.buildDefaultsMap();
        }

        return this.defaultsMap[cfMetaId] >= 0;
    },
    /// <summary>
    /// Returns an array of plain javascript objects that repesent all custom field metas, the returned values take into account 
    /// source overrides that the custom field defaults apply to it.
    /// </summary>
    getAugmentedMetas: function () {
        var cfms = window.customFieldMetas;
        if (!this.defaultsMap) {
            this.buildDefaultsMap();
        }
        var ams = [];
        var defaultCFS = this.get('DefaultCustomFields');
        var i = 0;
        var length = cfms.length;
        for (i; i < length; i++) {
            var cfm = cfms.at(i).toJSON();
            if (this.metaIdIsDefaultField(cfm.Id)) {
                var dcf = defaultCFS[this.defaultsMap[cfm.Id]];
                if (dcf.ListName) {
                    cfm.ListName = dcf.ListName; //Override List
                }
                if (dcf.TypeAheadDataLinkId) {
                    cfm.TypeAheadDataLinkId = dcf.TypeAheadDataLinkId; //Override TypeAhead
                }
                if (dcf.DropDownDataLinkId) {
                    cfm.DropDownDataLinkId = dcf.DropDownDataLinkId; //Override DropDown
                }
            }
            ams.push(cfm);
        }
        return ams;
    },
    /// <summary>
    /// Returns a custom field meta (plain javascript object) for the id passed, the returned value take into account 
    /// source overrides that the custom field defaults apply to it.
    /// </summary>
    getAugmentedMeta: function (metaId) {
        var cfm = window.customFieldMetas.get(metaId);
        if (!cfm) {
            return;
        }
        if (!this.defaultsMap) {
            this.buildDefaultsMap();
        }
        cfm = cfm.toJSON();
        var defaultCFS = this.get('DefaultCustomFields');
        if (this.metaIdIsDefaultField(cfm.Id)) {
            var dcf = defaultCFS[this.defaultsMap[cfm.Id]];
            if (dcf.ListName) {
                cfm.ListName = dcf.ListName; //Override List
            }
            if (dcf.TypeAheadDataLinkId) {
                cfm.TypeAheadDataLinkId = dcf.TypeAheadDataLinkId; //Override TypeAhead
            }
            if (dcf.DropDownDataLinkId) {
                cfm.DropDownDataLinkId = dcf.DropDownDataLinkId; //Override DropDown
            }
        }
        return cfm;

    },
    ///<summary>
    /// Whether or not this content type has associated related fields
    ///</summary>
    hasRelatedFields: function () {
        var rf = this.get('RelatedCustomFields');
        return rf && rf.length > 0;
    },
    ///<summary>
    /// Determine if the user has modify permissions to the content type
    ///</summary>
    hasModifyPermissions: function () {
        var effPerms = this.get('EffectivePermissions');
        return Utility.hasFlag(effPerms, Constants.sp.Modify);
    },
    ///<summary>
    /// Determine if the user has delete permissions to the content type
    ///</summary>
    hasDeletePermissions: function () {
        var effPerms = this.get('EffectivePermissions');
        return Utility.hasFlag(effPerms, Constants.sp.Delete);
    },
    ///<summary>
    /// Determine if the user has view permissions to the content type
    hasViewPermissions: function () {
        var effPerms = this.get('EffectivePermissions');
        return Utility.hasFlag(effPerms, Constants.sp.View);
    },
    ///</summary>
    ///<summary>
    /// Delete a content type with a selected replacement
    ///<param name="dialogFunc"> Will always be ContentTypeDialogs.replace, unless executed by a unit test</param>
    ///</summary>
    replace: function (dialogFunc) {
        var that = this;
        dialogFunc({
            model: this,
            callback: function (replacementId, cleanup) {
                that.destroy({
                    ReplacementId: replacementId,
                    success: function (result) {
                        Utility.executeCallback(cleanup);
                    },
                    failure: function (result) {
                        Utility.executeCallback(cleanup);
                    }
                });
            }
        });
    },
    ///<summary>
    /// Obtain the default custom fields for a content type
    ///<param name="sort">bool - sort the default custom fields</param>
    ///</summary>
    getDefaultCustomFields: function (sort) {
        var dcfs = this.get('DefaultCustomFields') || [];
        var length = dcfs.length;
        if (sort && length > 0) {
            var cfms = window.customFieldMetas;
            if (cfms) {
                dcfs = dcfs.sort(function (a, b) {
                    var aCFM = cfms.get(a.CustomFieldMetaID);
                    var bCFM = cfms.get(b.CustomFieldMetaID);
                    var aName;
                    var bName;
                    if (aCFM) {
                        aName = aCFM.get('Name');
                    }
                    if (bCFM) {
                        bName = bCFM.get('Name');
                    }
                    return Sort.alphaNumeric(aName, bName);
                });
            }
        }
        return dcfs;
    }
});