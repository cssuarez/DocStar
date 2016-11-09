//Complex Objects: A model that contains other models in its attributes. The complex object is setup so events from child models propegate up to the parent.
var BulkViewerDataPackageCPX = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id', //VersionId
    defaults: { isDirty: false },
    docProxy: DocumentServiceProxy({ skipStringifyWcf: true }),
    bulkProxy: BulkDataServiceProxy({ skipStringifyWcf: true }),
    searchProxy: SearchServiceProxy({ skipStringifyWcf: true }),
    initialize: function (options) {
        this.options = options || {};
        var that = this;
        this.listenTo(this, 'change', that.modelChanged);
        this.listenTo(this, 'sync', that.modelSynced);
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.DocumentPackage) {
            attr = attrs.DocumentPackage;
            attrs.Id = attr.Version ? attr.Version.Id : undefined;
            if (this.get('DocumentPackage') instanceof Backbone.Model) {
                this.get('DocumentPackage').set(attr, options);
                delete attrs.DocumentPackage;
            }
            else {
                attrs.DocumentPackage = new DocumentGetPackageCPX();
                attrs.DocumentPackage.set(attr, options);
                this.bindSubModelEvents(attrs.DocumentPackage, 'DocumentPackage');
            }
        }
        if (attrs.DQEntries) {
            attr = attrs.DQEntries;
            if (this.get('DQEntries') instanceof Backbone.Collection) {
                this.get('DQEntries').set(attr, options);
                delete attrs.DQEntries;
            }
            else {
                attrs.DQEntries = new DQEntries();
                attrs.DQEntries.reset(attr, options);
                this.bindSubModelEvents(attrs.DQEntries, 'DQEntries');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
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
                this.getViewerDataWithCache(options);
                break;
            case "update":
                break;
            case "delete":
                break;
        }
    },
    hasRights: function (sp) {
        var docGP = this.get('DocumentPackage');
        if (docGP) {
            return docGP.hasRights(sp);
        }
        return false;
    },
    documentId: function () {
        var docGP = this.get('DocumentPackage');
        if (docGP) {
            return docGP.documentId();
        }
    },
    versionId: function () {
        var docGP = this.get('DocumentPackage');
        if (docGP) {
            return docGP.versionId();
        }
    },
    effectivePermissions: function () {
        var docGP = this.get('DocumentPackage');
        if (docGP) {
            return docGP.effectivePermissions();
        }
    },
    ///<summary>
    /// Determine if the user can modify the document based on versioning checks
    /// returns true if the user can, otherwise a message is returned
    ///</summary>
    canModifyVersioning: function () {
        var canMod = true;
        var version = this.getDotted('DocumentPackage.Version');
        var vsi = this.getDotted('DocumentPackage.VersionStateInfo');
        var dvi = vsi.get('DraftVersionId');
        if (dvi && dvi !== version.get('Id')) {
            canMod = false;
        }
        var doi = vsi.get('DraftOwnerId');
        if (doi && doi !== Utility.getCurrentUser().Id) {
            canMod = false;
        }
        return canMod;
    },
    ///<summary>
    /// Determine if the user can perform an action based on the permission required
    /// entityPermission and entityType are optional, if provided and the user has the permission flag
    /// passed the restrictions object is checked (if one exists, see GuestDocumentView).
    /// Restrictions are setup such that the entity can be the first level, then under it would be the docPermission.
    /// Restrictions can start with just the action to globally disallow a specific action type.
    ///</summary>
    canI: function (docPermission, entityPermission, entityType) {
        var allowed = Utility.checkSP(this.effectivePermissions(), docPermission);
        if (allowed && entityPermission) {
            var restricted = this.get('restricted');
            if (restricted) {
                allowed = allowed && !restricted[entityPermission]; //Check if the entity permission is globally restricted
                if (allowed && restricted[entityType]) {
                    allowed = allowed && !restricted[entityType][entityPermission]; //Check if the entity permission is restricted for the entity type.
                }
            }
        }
        return allowed;
    },
    baseSlimUpdatePkg: function () {
        return this.get('DocumentPackage').baseSlimUpdatePkg();
    },
    modelChanged: function (m, o) {
        var dp = this.get('DocumentPackage');
        if (!dp || o.ignoreChange) {
            return; // ignore event if DocumentPackage doesn't exist (yet), if explicitly want to ignore change (eg. performing a save with a success callback)
        }
        //Set dirty flag (except for certain case); set isSlimEligible in DocumentPackage
        var setDirty = false;
        if (o && o.collectionDirtyChange) {
            setDirty = true;
            switch (o.collectionName) {
                case 'Folders':
                    // supported by slim update
                    dp.slimUpdatePackage.FolderIds = true; // this is just a flag indicating that changes were made; details will be determined upon save                    
                    break;
                case 'CustomFieldValues':
                    // supported by slim update
                    dp.slimUpdatePackage[o.collectionName] = true; // another flag
                    break;
                default:
                    // no other collections are supported
                    dp.isSlimUpdateEligible = false;
                    break;
            }
        } else if (m && m.isDirtyEligible && m.isDirtyEligible()) {
            setDirty = true;
            var propName;
            switch (o.propName) {
                case 'DocumentPackage.Version':
                case 'DocumentPackage.Document':
                    if (dp.isSlimUpdateEligible) { // only do this work if the doc pkg is (still) slim update eligible
                        for (propName in m.changed) {
                            if (m.changed.hasOwnProperty(propName)) {
                                switch (propName) {
                                    case 'Title':
                                    case 'Keywords':
                                    case 'Priority':
                                    case 'CutoffDate':
                                    case 'DueDate':
                                        // slim updatable Version properties
                                        dp.slimUpdatePackage[propName] = m.changed[propName] || '';
                                        break;
                                    case 'StartPage':
                                        dp.slimUpdatePackage[propName] = m.changed[propName] || '';
                                        break;
                                    case 'SecurityClassId':
                                    case 'RecordCategoryId':
                                    case 'ContentTypeId':
                                        // slim updatable Document properties
                                        dp.slimUpdatePackage[propName] = m.changed[propName] || '';
                                        break;
                                    case 'SecurityClassName':
                                    case 'RecordCategoryName':
                                    case 'ContentTypeName':
                                        // ignored by slim update
                                        break;
                                    default:
                                        // other properties in Document and Version do not support slim update
                                        dp.isSlimUpdateEligible = false;
                                        break;
                                }
                                if (!dp.isSlimUpdateEligible) {
                                    // Quit the loop if doc pkg ceases to be slim update eligible
                                    break;
                                }
                            }
                        }
                    }
                    break;
                case 'DocumentPackage.Inbox':
                    if (m.changed.hasOwnProperty('Id')) {
                        dp.slimUpdatePackage.InboxId = m.changed.Id || '';
                    }
                    break;
                default:
                    // other members of BulkViewerData do not support slim updates of any their properties
                    dp.isSlimUpdateEligible = false;
                    break;
            }
        }
        setDirty = o.setDirty !== undefined && !o.setDirty ? false : setDirty;
        if (setDirty) {
            //Utility.OutputToConsole(o.propName + ": collectionDirtyChange=" + !!o.collectionDirtyChange + ", changed=" + JSON.stringify(m.changed));
            this.setDirty(true);
        }
    },
    modelSynced: function (model_or_collection, resp, options) {
        if (options && options.ignoreSync) {
            return;
        }
        this.setDirty(false);
        var dp = this.get('DocumentPackage');
        if (dp) {
            dp.isSlimUpdateEligible = true;
            dp.slimUpdatePackage = {};
            var cfvs = dp.getDotted("Version.CustomFieldValues");
            if (cfvs) {
                cfvs.clearTemporaryProperties();
            }
        }
    },
    setDirty: function (state) {
        var dirty = this.get('isDirty');
        if (dirty !== state) {
            this.set('isDirty', state, { silent: true }); //Don't let setting dirty trigger a change. (even though the model change would ignore it don't want to fire all those events)
            this.trigger('change:isDirty'); //Manually fire just the isDirty change event (not the generic change event).
        }
    },
    errorHandler: function (jqXhr, status, errorThrown) {
        ErrorHandler.popUpMessage(errorThrown);
    },
    ///<summary>
    /// Handle updating bulk viewer data after slim update
    ///</summary>
    handleSlimUpdateResults: function (data) {
        var result = data.result;
        var key = data.key;
        var value = data.value;
        var ff = data.failure;
        var cleanup = data.cleanup;
        var r = result.ResultByVerId[0];
        var err = r.Value.Error;
        if (err) {
            ff(null, null, err);
        }
        else {
            // Have to reload entire document, so don't execute cleanup until after MassDocumentUpdated completes, preventing temporary mid-air collisions from occuring
            if (r.Value.Reload) {
                // Refetch this models data
                this.fetch({
                    success: function () {
                        Utility.executeCallback(cleanup);
                    }
                });
            }
                // If possible reset ModifiedTicks
            else {
                this.setDotted(key, value);
                this.setDotted('DocumentPackage.ModifiedTicks', r.Value.ModifiedTicks);
                Utility.executeCallback(cleanup);
            }
            $('body').trigger('MassDocumentUpdated', { ids: [this.documentId()] }); //Notify listeners that the meta has been updated.
        }
    },
    /// <summary>
    /// Sets or unsets the imaging message for the document.
    /// </summary>
    setImagingMessage: function (msg) {
        if (msg === null) {
            this.unset('imagingMessage');
        } else {
            this.set('imagingMessage', msg);
        }
    },
    /// <summary>
    /// Returns an object used to get a rendering with or without redactions / annotations.
    /// The values for this are based on a user preference and security.
    /// </summary>
    getDefaultAnnotationDisplay: function () {
        var dp = this.get('DocumentPackage');
        return dp.getDefaultAnnotationDisplay();
    },
    /// <summary>
    /// Sets the annotation display in the document package
    /// </summary>
    setAnnotationsDisplay: function (annoDisplay, options) {
        options = options || {};
        var dp = this.get('DocumentPackage');
        if (dp) {
            var currAD = dp.get('annotationDisplay');
            if (currAD !== annoDisplay) {
                dp.set('annotationDisplay', annoDisplay, options);
            }
            else if (!options.silent) {
                dp.trigger('change:annotationDisplay', dp, annoDisplay, options);
            }
        }
    },
    /// <summary>
    /// Returns the total number of pages of the model
    /// </summary>
    getMaxPage: function (viewerType) {
        var maxPage = 1;
        var cis;
        switch (viewerType) {
            case Constants.vt.Native:
                cis = this.getDotted('DocumentPackage.ContentItems');
                maxPage = cis ? cis.length : 1;
                break;
            case Constants.vt.FormEdit:
                cis = this.getDotted('DocumentPackage.ContentItems');
                var fps = cis ? cis.getAllFormParts() : [];
                maxPage = fps.length === 0 ? 1 : fps.length;
                break;
            default:
                //other viewers Image / Preview
                var dpkg = this.get('DocumentPackage');
                if (dpkg) {
                    var pd = dpkg.getNumPages();
                    maxPage = pd.pages === 0 ? 1 : pd.pages;
                }
                break;
        }
        return maxPage;
    },
    /// <summary>
    /// Returns the current page of the model
    /// </summary>
    /// <param name="viewerType">The current page being displayed will be dependent on the viewer type passed in, each has a different max page.</param>
    getCurrentPage: function (viewerType) {
        var maxPage = 1;
        var cis;
        var currentPage = this.get('currentPage');
        switch (viewerType) {
            case Constants.vt.Native:
                cis = this.getDotted('DocumentPackage.ContentItems');
                maxPage = cis ? cis.length : 1;
                break;
            case Constants.vt.FormEdit:
                cis = this.getDotted('DocumentPackage.ContentItems');
                var fps = cis ? cis.getAllFormParts() : [];
                maxPage = fps.length === 0 ? 1 : fps.length;
                break;
            default:
                //other viewers Image / Preview
                var dpkg = this.get('DocumentPackage');
                if (dpkg) {
                    var pd = dpkg.getNumPages();
                    maxPage = pd.pages === 0 ? 1 : pd.pages;
                }
                break;
        }
        if (!currentPage) {
            currentPage = this.getDotted('DocumentPackage.Document.StartPage') || 1;
        }
        if (!currentPage) {
            currentPage = 0;
        }
        return InputUtil.textRangeCheck(1, maxPage, currentPage);
    },
    /// <summary>
    /// Sets the current page for the document.
    /// Checks if the desired page is within the page range of the document, if it is not an appropriate min or max value will be used.
    /// Returns a bool indicating if the page was changed.
    /// </summary>
    setCurrentPage: function (desiredPage, noAnnotationReset) {
        var pd = this.get('DocumentPackage').getNumPages();
        var pageNumber = InputUtil.textRangeCheck(1, pd.pages, desiredPage);
        var currentPage = parseInt(this.get('currentPage'), 10);  // Obtain currently set page        
        if (currentPage !== pageNumber) {
            if (!noAnnotationReset) {   // Don't reset when paging through documents pages normally, maintain the current setting
                this.setAnnotationsDisplay(undefined, { silent: true });
            }
            this.set('currentPage', pageNumber);
            this.setDotted('DocumentPackage.selectedThumbs', ['thumb_' + pageNumber]);
        }
        return currentPage !== pageNumber;
    },
    ///<summary>
    /// Get page model for current page
    ///</summary>
    getCurrentPageInfo: function () {
        var docPkg = this.get('DocumentPackage');
        if (!docPkg) { return null; }
        var pageInfo = docPkg.findPage(this.getCurrentPage());
        return pageInfo ? pageInfo.pdto : null;
    },
    ///<summary>
    /// Gets the current pages rotation
    ///</summary>
    getCurrentPageRotation: function () {
        var pdto = this.getCurrentPageInfo();
        if (pdto) {
            return pdto.getRotation();
        }
        return 0;
    },
    /// <summary>
    /// Gets the True Page Number for the first page of a content item.
    /// Bug 12161
    /// </summary>
    getCIStartingPageTruePageNumber: function (contentItemId, pages) {
        var tpn = 0;
        var i = 0;
        var plength = pages.length;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).get('Id') === contentItemId) {
                tpn++;
                break;
            } else { //skip ahead to the last page of this content item (i).
                var p;
                var pi = 0;
                for (pi; pi < plength; pi++) {
                    var page = pages.at(pi);
                    if (page && page.get('ContentItemId') === contentItemId) { //Pages a sequenced server side.
                        p = page;
                    }
                }
                if (p) {
                    tpn = p.get('TruePageNumber'); //Rendered content
                } else {
                    tpn++; //Unrendered content
                }
            }
        }
        return tpn;
    },
    ///<summary>
    /// Obtain Pages in the specified content item
    ///<param name="ciId">Id of the Content Item to obtain pages from</param>
    ///</summary>
    getContentItemPages: function (ciId) {
        var ci = this.getDotted('DocumentPackage.ContentItems.' + ciId);
        if (!ci) {
            return [];
        }
        var docPkg = this.get('DocumentPackage');
        return docPkg.getPagesPerContentItem(ci);
    },
    ///<summary>
    /// Places the current version in the distributed queue to be imaged
    ///</summary>
    requeueImaging: function () {
        var that = this;
        var sf = function (result) {
            var dqEntries = that.get('DQEntries');
            dqEntries.add(result);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        };
        this.docProxy.queueDocumentForImaging(this.versionId(), sf, ff, null, null, { "ds-options": Constants.sro.NotifyVerbosely });
    },
    ///<summary>
    /// Toggles the user preference and model property to show or hide the meta viewer in the document view.
    ///</summary>
    toggleMetaViewer: function () {
        var result = Utility.GetUserPreference('viewMeta');
        if (result) {
            result = JSON.parse(result);
        }
        if (result === 'viewMeta') {   // If there is a user preference then destroy the user preference and hide the metadata
            Utility.SetSingleUserPreference('viewMeta', JSON.stringify('hideMeta'));
            this.set('showMetaView', false);
        }
        else {
            // If there isn't a user preference or the user preference is set to 'hideMeta', create the user preference or change it to 'viewMeta' and show the metadata
            Utility.SetSingleUserPreference('viewMeta', JSON.stringify('viewMeta'));
            this.set('showMetaView', true);
        }
    },
    /// <summary>
    /// Returns Attachement restrictions used in the general file upload.
    /// </summary>
    getRestrictions: function () {
        return {
            fileTypes: [], //no type restrictions.
            fileSize: 15000000 //15mb
        };

    },
    /// <summary>
    /// Updates this model based on form element data.
    /// </summary>
    /// <param name="data">{storeId: BackingStoreId, valueId: BackingStoreValueId, value: object { Key: backing store id, Value: new value }, groupId: if a part of a group, valueIdUpdatedCB: callback to update the UI's value id data property, if a new group set is created a group object is returned}</param>
    /// <param name="cb"> callback to be executed after update occurs</param>
    updateBackingStore: function (data, cb) {
        switch (data.storeId) {
            case Constants.UtilityConstants.FIELD_ID_TITLE:
                this.setDotted('DocumentPackage.Version.Title', data.values[data.storeId]);
                if (cb) {
                    Utility.executeCallback(cb);
                }
                break;
            case Constants.UtilityConstants.FIELD_ID_KEYWORDS:
                this.setDotted('DocumentPackage.Version.Keywords', data.values[data.storeId]);
                if (cb) {
                    Utility.executeCallback(cb);
                }
                break;
            default:
                var cfs = this.getDotted('DocumentPackage.Version.CustomFieldValues');
                cfs.updateBackingStore(data, cb);
                break;
        }
    },
    /// <summary>
    /// Returns the mime type for a content item.
    /// </summary>
    getMimeType: function (contentItemIndex) {
        var mimeTypes = this.get('MimeTypes');
        var cis = this.getDotted('DocumentPackage.ContentItems');
        if (!cis || !mimeTypes) {
            return;
        }
        var ci = cis.at(contentItemIndex);
        if (!ci) {
            return;
        }
        var ctId = ci.get('Id');
        var i = 0;
        var length = mimeTypes.length;
        for (i; i < length; i++) {
            var mt = mimeTypes[i];
            if (mt.Key === ctId) {
                return mt.Value;
            }
        }
    },
    /// <summary>
    /// Checks to see if the document has any content items with a form part id.
    /// </summary>
    hasFormPart: function () {
        var cis = this.getDotted('DocumentPackage.ContentItems');
        if (cis) {
            return cis.hasFormPart();
        }
        return false;
    },
    /// <summary>
    /// Checks to see if all form parts are complete.
    /// </summary>    
    isFormComplete: function () {
        var cis = this.getDotted('DocumentPackage.ContentItems');
        if (cis) {
            return cis.isFormComplete();
        }
        return false;
    },
    /// <summary>
    /// Completes all form parts
    /// </summary> 
    ///<summary>
    /// Save the document with all of its content items Complete bit set to true
    ///<param name="dialogFunc">Should always be FormDialogs.completeForm, exception in unit tests where a UI will not be presented.</param>
    ///</summary
    completeForm: function (dialogFunc) {
        var that = this;
        dialogFunc({
            isDirty: this.get('isDirty'),
            docPkg: this.get('DocumentPackage'),
            callback: function (cleanup) {
                that.set('inFormEdit', false);
                Utility.executeCallback(cleanup);
            }
        });
    },
    /// <summary>
    /// UnCompletes all form parts
    /// </summary> 
    uncompleteForm: function () {
        var cis = this.getDotted('DocumentPackage.ContentItems');
        if (cis) {
            cis.uncompleteForm();
        }
    },
    /// <summary>
    /// Checks if a page is a part of a form
    /// </summary> 
    pageIsPartOfForm: function (truePageNum) {
        var docPkg = this.get('DocumentPackage');
        if (!docPkg) { return false; }
        var pageInfo = docPkg.findPage(truePageNum);
        if (!pageInfo || !pageInfo.ci) { return false; }
        return !!pageInfo.ci.get('FormPartId');
    },
    /// <summary>
    /// Checks if the document is in a state where the save button should be enabled.
    /// </summary>
    allowSave: function () {
        var isDirty = this.get('isDirty');
        var isSaving = this.getDotted('DocumentPackage.saveExecuting');
        var syncActionExecuting = this.get('syncActionExecuting');
        var hasPermissions = this.canI(Constants.sp.Modify);

        return hasPermissions && isDirty && !isSaving && !syncActionExecuting;
    },
    /// <summary>
    /// Checks if the current documents content type has a sync action.
    /// </summary>
    hasSyncAction: function () {
        var ctId = this.getDotted('DocumentPackage.Document.ContentTypeId');
        var ct = window.contentTypes.get(ctId);
        return ct && !!ct.get('SyncActionId');
    },
    /// <summary>
    /// Checks if the current document has any Approvals or Workflow Chat Histroy
    /// </summary>
    hasHistoryItems: function () {
        var approvals = this.getDotted('DocumentPackage.Approvals');
        if (approvals && approvals.length > 0) {
            return true;
        }
        var wfDocId = this.getDotted('DocumentPackage.WFDocumentDataPackage.WFDocument.Id');
        return !!wfDocId;
    },
    /// <summary>
    /// Checks if the document is in workflow by checking for the presents of a WFDocument
    /// </summary>
    isInWorkflow: function (testForActive) {
        var wfDoc = this.getDotted('DocumentPackage.WFDocumentDataPackage.WFDocument');
        if (wfDoc) {
            if (testForActive) {
                return !Utility.hasFlag(wfDoc.get('State'), Constants.wfs.Inactive);
            }
            return true;
        }
        return false;
    },
    /// <summary>
    /// Deletes the currently fetched document
    /// </summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.deleteOrRemoveDialog, exception in unit tests where a UI will not be presented.</param>
    deleteDocument: function (dialogFunc) {
        var that = this;
        var versionId = this.versionId();
        dialogFunc({
            title: Constants.c['delete'],
            callback: function (cleanup) {
                var sf = function () {
                    that.replaceCachedViewDataVersionId(undefined);
                    var cvd = that.get('CachedViewData');
                    if (cvd.length > 0) {
                        fetched = true;
                        that.fetch();
                    } else {
                        that.trigger('change:CachedViewData', that);
                    }
                    // Don't .trigger('MassDocumentUpdated') here -- DocumentPackage will do so through its MassDocumentUpdated
                    // Likewise, Utility.executeCallback(cleanup) is not here -- it is called through MassDocumentUpdated
                };
                var ff = function (xhr, status, err) {
                    that.errorHandler(xhr, status, err);
                    Utility.executeCallback(cleanup);
                };
                that.get('DocumentPackage').destroy({ wait: true, success: sf, failure: ff, cleanup: cleanup });
            }
        });
    },
    /// <summary>
    /// Updates the cutoff date for this document.
    /// </summary>
    /// <param name="dialogFunc">Should always be RecordsManagementUtil.cutoffDialog, exception in unit tests where a UI will not be presented.</param>
    cutoff: function (dialogFunc) {
        var that = this;
        var coDate = this.getDotted('DocumentPackage.Document.CutoffDate');
        dialogFunc({
            cutoffDate: coDate,
            callback: function (selDate, cleanup) {
                if (selDate === coDate) {
                    cleanup();
                    return; //No change
                }
                that.setDotted('DocumentPackage.Document.CutoffDate', selDate);
                var saveOptions = {
                    success: function () {
                        Utility.executeCallback(cleanup);
                        that.trigger('sync', that, {});
                    }
                };
                that.get('DocumentPackage').updateDocument(saveOptions);
            }
        });
    },
    /// <summary>
    /// Places a freeze on this document
    /// </summary>
    /// <param name="dialogFunc">Should always be RecordsManagementUtil.freezeDialog, exception in unit tests where a UI will not be presented.</param>
    freeze: function (dialogFunc) {
        var that = this;
        dialogFunc({
            callback: function (freezeId, cleanup) {
                var sf = function (result) {
                    Utility.executeCallback(cleanup);
                    $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
                };
                var args = { FreezeId: freezeId, DocumentIds: [that.documentId()] };
                var adminProxy = AdminServiceProxy({ skipStringifyWcf: true });
                adminProxy.freezeDocuments(args, sf, that.errorHandler);
            }
        });
    },
    /// <summary>
    /// Releases a freeze on this document
    /// </summary>
    /// <param name="dialogFunc">Should always be RecordsManagementUtil.unFreezeDialog, exception in unit tests where a UI will not be presented.</param>
    unfreeze: function (dialogFunc) {
        var that = this;
        var adminProxy = AdminServiceProxy({ skipStringifyWcf: true });
        var getFreezesSF = function (result) {
            dialogFunc({
                freezes: result,
                callback: function (freezeId, cleanup) {
                    var sf = function (result2) {
                        Utility.executeCallback(cleanup);
                        $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
                    };
                    var args = { FreezeId: freezeId, DocumentIds: [that.documentId()] };
                    adminProxy.unFreezeDocuments(args, sf, that.errorHandler);
                }
            });
        };
        adminProxy.getFreezesForDocs([this.documentId()], getFreezesSF, that.errorHandler);
    },
    /// <summary>
    /// Requests an approval on this document
    /// </summary>
    /// <param name="dialogFunc">Should always be ApprovalDialogs.requestApproval, exception in unit tests where a UI will not be presented.</param>
    requestApproval: function (dialogFunc) {
        var that = this;
        var required = that.getDotted('DocumentPackage.ApprovalsRequired') || 0;
        dialogFunc({
            numRequired: required,
            displaySetRequired: true,
            callback: function (req, cleanup) {
                var sf = function (results) {
                    var result = results[0];
                    var dp = that.get('DocumentPackage');
                    var update = {
                        ApprovalsRequired: result.NumberRequired,
                        Approvals: result.Approvals,
                        Version: { ApprovalSetId: result.Id }
                    };
                    dp.set(update, { ignoreChange: true });
                    Utility.executeCallback(cleanup);
                    $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
                };
                req.VersionId = that.versionId();
                req.DocumentId = that.documentId();
                that.docProxy.requestApproval([req], sf, that.errorHandler);
            }
        });
    },
    /// <summary>
    /// Sets the current users approval state
    /// </summary>
    /// <param name="dialogFunc">Should always be ApprovalDialogs.setMyApproval, exception in unit tests where a UI will not be presented.</param>
    /// <param name="options">Object - contains callback, approving, mayDelaySave, etc.
    /// options.callback - callback to perform once approval is complete
    /// options.approving - Stating if you are approving or not, when an approval already exists this is used to determine if we are withdrawing.
    /// options.mayDelaySave - Boolean parameter indicates that caller supports delayed save, which is true for the Document Viewer. Delayed save is used to position approval stamps.
    setMyApproval: function (dialogFunc, options) {
        options = options || {};
        var that = this;
        var myApproval = this.getMyApproval();
        var stampsEnabled = Utility.convertToBool(Utility.GetSystemPreferenceValue('enableApprovalStamps'));
        var subOpt = Utility.GetUserPreference('subOpt');
        var submitAndNext = !subOpt || subOpt === 'submitNext';
        var isInWorkflow = this.isInWorkflow(true);
        var isUserApprovalPromptOnly = false;
        var performPostSubmitAction = false;
        if (isInWorkflow) {
            var tud = that.getDotted('DocumentPackage.WFDocumentDataPackage.TaskUIData');
            isUserApprovalPromptOnly = tud && tud.IsUserApprovalOnlyInput();
        }
        dialogFunc({
            myApproval: myApproval,
            approving: options.approving,
            callback: function (scuApproval, cleanup) {
                scuApproval.VersionIds = [that.versionId()];
                var isRecall = (Constants.as.ApprovedOrDenied & scuApproval.State) === 0;
                if (options.mayDelaySave && stampsEnabled && !isRecall) {
                    // Delay the approval so the user can set stamp's position (but don't delay a Recall)
                    // If the approval is coming from workflow and the user approval is the only task, then don't delay, just automatically place the stamp - http://pedro.docstar.com/b/show_bug.cgi?id=13687
                    // If the user is in Form Edit mode, we must exit it before continuing on to setting the new approval stamp

                    var dp = that.get('DocumentPackage');
                    var currUser = Utility.getCurrentUser();
                    var app = new Approval({
                        Id: Constants.c.emptyGuid,
                        State: scuApproval.State,
                        Reason: scuApproval.Reason,
                        UserId: currUser.Id,
                        UserName: currUser.Name,
                        CreatedOn: new Date()
                    });
                    // no position set now; it may be set later if page is imaged and stamp can be shown
                    dp.set('Approval', app);
                    that.setDirty(true);
                    if (options.callback) {
                        options.callback(scuApproval, cleanup);
                    }
                    else {
                        Utility.executeCallback(cleanup);
                    }
                } else {
                    // sf: success function for setCurrentUserApproval, which is only called when: Approving/Denying, without stamping or when Recalling
                    var sf = function (results) {
                        var o = { ignoreChange: true, ignoreReset: true };
                        var result = results[0];
                        var dp = that.get('DocumentPackage');
                        if (stampsEnabled && isRecall && myApproval) {
                            dp.removeApprovalStamp(myApproval.get('Id'), o);
                        }
                        if (result) {
                            // an approval set was returned
                            var update = {
                                ApprovalsRequired: result.NumberRequired,
                                Approvals: result.Approvals,
                                Version: {
                                    ApprovalSetId: result.Id
                                }
                            };
                            dp.set(update, o);
                        } else {
                            // no approval set returned -- therefore, there are no approvals and no number required
                            dp.get('ApprovalsRequired');
                            dp.unsetDotted('Version.ApprovalSetId', o);
                            var apps = that.getDotted('DocumentPackage.Approvals');
                            if (apps) {
                                apps.reset([]);
                            }

                        }
                        //Notify listeners that the meta has been updated.
                        $('body').trigger('MassDocumentUpdated', {
                            ids: [that.documentId()],
                            callback: function () {
                                var successCallback = function () {
                                    if (options.callback) {
                                        options.callback(scuApproval, cleanup, true);
                                    }
                                    else {
                                        Utility.executeCallback(cleanup);
                                    }
                                };

                                if (performPostSubmitAction) {
                                    //We must get before performing the post submit action so the data in the wfdocument is up to date
                                    that.fetch({ success: function () { that.performPostSubmitAction(false, true, successCallback); } });
                                } else {
                                    successCallback();
                                }
                            }
                        });
                        // refresh page if stamp was removed - Do not trigger change if we are re-fetching (a fetch will rerender the view).
                        //Utility.OutputToConsole("stampsEnabled=" + stampsEnabled + ", currentPage=" + that.get('currentPage'));
                        if (stampsEnabled && that.getCurrentPage() === 1 && !performPostSubmitAction) {
                            //Utility.OutputToConsole("triggering change:currentPage");
                            that.trigger('change:currentPage', that); // stampsEnabled only calls sf on a recall, which needs to re-get page 1
                        }
                    };
                    //If we are in a workflow and the only userprompt is an user approval task save dirty meta first as it will progress a workflow and the workflow should work against all current meta changes
                    if (scuApproval.State !== Constants.as.None && isUserApprovalPromptOnly && that.get('isDirty')) {
                        performPostSubmitAction = true;
                        that.get('DocumentPackage').save(null, {
                            success: function () {
                                that.docProxy.setCurrentUserApproval(scuApproval, sf, that.errorHandler);
                            },
                            failure: function () {
                                Utility.executeCallback(cleanup);
                            }
                        });
                    } else {
                        performPostSubmitAction = isUserApprovalPromptOnly;
                        that.docProxy.setCurrentUserApproval(scuApproval, sf, that.errorHandler);
                    }
                }
            }
        });
    },
    ///<summary>
    /// Set a cache for approvals
    ///</summary>
    setApprovalsCache: function (success, successCallback) {
        var approvalStampsEnabled = Utility.convertToBool(Utility.GetSystemPreferenceValue('enableApprovalStamps'));
        if (!approvalStampsEnabled) {
            Utility.executeCallback(successCallback);
            return;
        }
        var that = this;
        var approvals = this.getDotted('DocumentPackage.Approvals');
        if (!approvals) {
            approvals = new Approvals();
        }
        approvals.remove(Constants.c.emptyGuid);
        approvals.add(this.getDotted('DocumentPackage.Approval'));

        // Hack to send the correct date format to controller 
        //(controller doesn't support the way dates are serialized while the server needs it)
        var length = approvals.length;
        var i = 0;
        var approvalsPOJO = [];
        for (i; i < length; i++) {
            var approvalModel = approvals.at(i);
            var approvalPOJO = approvalModel.toJSON();
            approvalPOJO.CreatedOn = approvalModel.get('CreatedOn'); // Overwrite the date with the original one without json serialization
            approvalsPOJO.push(approvalPOJO);
        }
        // End of Hack: Send approvalsPOJO instead of approvals to avoid backbone serialization

        Utility.log("setApprovalsCache " + length);
        $.ajax({
            url: Constants.Url_Base + 'Annotations/SetApprovalsCache',
            data: JSON.stringify({ approvals: approvalsPOJO }),
            type: "POST",
            contentType: "application/json",
            success: success
        });
    },
    ///<summary>
    /// Cascade Approval Stamps so that they don't overlap by a certain portion
    ///</summary>
    cascade: function (x, y, width, height, rotation, pdto) {
        // Note duplication of logic from Annotations.Accusoft Assembly, Accusoft.Annotations class, CascadeApprovalMark()
        // This differs in that it operates on rotated coordinate system, but the effect is the same
        var stepDown = 0.5 * pdto.get('RezY');
        var stepLeft = 8.5 / 11.0 * 0.5 * pdto.get('RezX'); // so that steps run exactly down major diagonal of 8.5 by 11 inch page
        var minimumDistance = 0.5 * pdto.get('RezX'); // 1/2 inch
        var anyChange = false;
        var a;
        switch ((360 + rotation) % 360) {
            case 90:
                a = stepDown;
                stepDown = -stepLeft;
                stepLeft = a;
                break;
            case 180:
                stepDown = -stepDown;
                stepLeft = -stepLeft;
                break;
            case 270:
                a = stepLeft;
                stepLeft = -stepDown;
                stepDown = a;
                break;
        }
        while (true) { // must hit one of two return statements to exit loop
            var overlap = false; // assumed until other annos are checked
            var annos = pdto && pdto.get('AnnotationCollection');
            if (annos) {
                var length = annos.length;
                var mark;
                // Get png for each annotation
                while (length-- > 0) {
                    mark = annos.at(length); // this new stamp will be among the annos, but it won't have an approval Id yet
                    if (mark.get('Type') === Constants.mt.Approval && mark.get('ApprovalId') !== Constants.c.emptyGuid) {
                        var rect = mark.get('Rectangle');
                        if (rect && Utility.distance(rect.Left, rect.Top, x, y) < minimumDistance) {
                            overlap = true;
                            break;
                        }
                    }
                }
            }
            if (!overlap) {
                return anyChange ? { x: x, y: y } : null;
            }
            // perform a step
            x += stepLeft;
            y += stepDown;
            anyChange = true;
            if (x > width - minimumDistance || y > height - minimumDistance) {
                // we've stepped too close to the edge of the page
                // return null to stick with original x, y
                return null;
            }
            // if we're still here, repeat loop to check new position
        }
    },
    performPostSubmitAction: function (ignoresubOptPref, skipFetch, callback) {
        var movedToAnotherDocument = false;
        var wfData = this.getDotted('DocumentPackage.WFDocumentDataPackage');
        var pref = Utility.GetUserPreference('subOpt');
        if (!pref) {
            pref = 'submitNext';
        }
        var taskUIData = wfData.get('TaskUIData');
        var isAssignee = wfData.getDotted('WFDocument.IsAssignee');
        var referrer = $('body').data('referrer');
        var isLast = this.isLastInCache();
        if (!ignoresubOptPref && pref === 'submitNext' && (!taskUIData || taskUIData.length <= 0 || !isAssignee) && (!isLast || referrer)) {
            movedToAnotherDocument = true;
            Utility.executeCallback(callback);
            if (isLast) {
                setTimeout(function () { //Needs to occur after this stack execution completes.
                    window.location.hash = referrer;
                }, 3);
            } else {
                this.resetInFormEdit();
                this.moveNext();
            }
        } else {
            //Check if the workflow resulted in a version change (IE workflow performed a check out or check in draft).
            var cv = this.versionId();
            var nv = wfData.getDotted('WFDocument.VersionId');
            if (cv !== nv) {
                movedToAnotherDocument = true;
                this.replaceCachedViewDataVersionId(nv);
            }
            if (!skipFetch) {
                this.fetch({ success: callback });
            } else {
                Utility.executeCallback(callback);
            }
        }
        return movedToAnotherDocument;
    },
    ///<summary>
    /// Reset the inFormEdit to the user preference after we set it false due to applying an approval stamp
    ///</summary>
    resetInFormEdit: function () {
        // If we exited form edit mode to set an approval stamp, then we need to reset it to the user preference before navigating to the next document - Bug 13811
        var resetFormEditOnSubmitAndNext = this.get('resetFormEditOnSubmitAndNext');  // This should only be set when an approval stamp is pending
        if (resetFormEditOnSubmitAndNext) {
            this.unset('resetFormEditOnSubmitAndNext', { silent: true });    // don't trigger any events for this property.
            // reset inFormEdit to be what the users preference was before performing a setMyApproval, but don't trigger any events
            var inFormEdit = true;
            if (Utility.GetUserPreference('formEditMode') !== undefined) {
                inFormEdit = Utility.convertToBool(Utility.GetUserPreference('formEditMode'));
            }
            this.set('inFormEdit', inFormEdit, { silent: true });   // don't trigger any events for resetting form edit mode - moveNext will take care of it for us
        }
    },
    ///<summary>
    /// Obtain My (current user's) approval from all approvals
    ///</summary>
    getMyApproval: function () {
        var allApprovals = this.getDotted('DocumentPackage.Approvals');
        var myApproval;
        if (allApprovals) {
            myApproval = allApprovals.myApproval();
        }
        return myApproval;
    },
    /// <summary>
    /// Releases a freeze on this document
    /// </summary>
    /// <param name="dialogFunc">Should always be ApprovalDialogs.setNumRequired, exception in unit tests where a UI will not be presented.</param>
    setNumRequired: function (dialogFunc) {
        var that = this;
        var required = that.getDotted('DocumentPackage.ApprovalsRequired') || 0;
        dialogFunc({
            numRequired: required,
            callback: function (numRequired, cleanup) {
                if (required === numRequired) {
                    Utility.executeCallback(cleanup);
                    return;
                }
                var sf = function (result) {
                    Utility.executeCallback(cleanup);
                    that.setDotted('DocumentPackage.ApprovalsRequired', numRequired);
                    that.setDotted('DocumentPackage.Version.ApprovalSetId', result);
                    $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
                };
                var reqPkg = {
                    DocumentId: that.documentId(),
                    VersionId: that.versionId(),
                    NumberRequired: numRequired
                };
                that.docProxy.setApprovalsRequired(reqPkg, sf, that.errorHandler);
            }
        });
    },
    /// <summary>
    /// Sets the due date on this document
    /// </summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.setDueDate), exception in unit tests where a UI will not be presented.</param>
    setDueDate: function (dialogFunc) {
        var that = this;
        var dueDate = this.getDotted('DocumentPackage.Version.DueDate');
        dialogFunc({
            itemCount: 1,
            dueDate: dueDate,
            callback: function (selDate, cleanup) {
                that.setDotted('DocumentPackage.Version.DueDate', selDate);
                var saveOptions = {
                    success: function () {
                        Utility.executeCallback(cleanup);
                        that.trigger('sync', that, {});
                    }
                };
                that.get('DocumentPackage').updateDocument(saveOptions);
            }
        });
    },

    /// <summary>
    /// Checks to see if the document has a draft
    /// </summary>
    currentVersionIsDraft: function () {
        return this.hasDraft() && this.getDotted('DocumentPackage.VersionStateInfo.DraftVersionId') === this.versionId();
    },
    /// <summary>
    /// Checks to see if the document has a draft
    /// </summary>
    hasDraft: function () {
        return !!this.getDotted('DocumentPackage.VersionStateInfo.DraftVersionId');
    },
    /// <summary>
    /// Promotes the current version to either the current published version (no draft currently) or the current draft version (if a draft exists).
    /// </summary>
    /// <param name="dialogFunc">Should always be VersioningDialogs.promote), exception in unit tests where a UI will not be presented.</param>
    promote: function (dialogFunc) {
        var that = this;
        var verId = this.versionId();
        dialogFunc({
            hasDraft: this.hasDraft(),
            callback: function (cleanup) {
                var sf = function (result) {
                    Utility.executeCallback(cleanup);
                    $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
                    that.replaceCachedViewDataVersionId(result.Version.Id);
                    that.set({ DocumentPackage: result }, { silent: true }); //Triggering sync, don't trigger saves down the chain.
                    that.trigger('sync', that, {});
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup, true);
                };
                that.docProxy.promoteVersion({ DocumentVersionId: verId }, sf, ff);
            }
        });
    },
    /// <summary>
    /// Checks in a draft version
    /// </summary>
    /// <param name="dialogFunc">Should always be VersioningDialogs.checkIn), exception in unit tests where a UI will not be presented.</param>
    checkIn: function (dialogFunc) {
        var that = this;
        dialogFunc({
            hasFormPart: this.hasFormPart(),
            isFormComplete: this.isFormComplete(),
            hasIncompleteWorkflow: this.isInWorkflow(true),
            currentOwner: this.getDotted('DocumentPackage.VersionStateInfo.DraftOwnerId'),
            callback: function (settings, cleanup) {
                var sf = function (result) {
                    var updateDocPkg = function (docPkgResult) {
                        $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
                        that.replaceCachedViewDataVersionId(docPkgResult.Version.Id);
                        Utility.executeCallback(cleanup);
                        that.set({ DocumentPackage: docPkgResult }, { silent: true }); //Triggering sync, don't trigger change events down the chain.
                    };
                    // If Completing change results' content item's 'Complete' to true, save the result, then update this model's document package
                    if (settings.Complete) {
                        var idx = 0;
                        var length = result.ContentItems.length;
                        for (idx; idx < length; idx++) {
                            result.ContentItems[idx].Complete = true;
                        }
                        that.set({ DocumentPackage: result }, { silent: true }); //Triggering sync, don't trigger change events down the chain.
                        that.get('DocumentPackage').save(null, {
                            success: function (updatedDocPkg) {
                                updateDocPkg(updatedDocPkg.toJSON());
                            }
                        });
                    }
                    else {
                        updateDocPkg(result);
                        that.trigger('sync', that, {});
                    }
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup, true);
                };
                settings.DocumentId = that.documentId();
                that.docProxy.checkIn(settings, sf, ff);
            }
        });
    },
    /// <summary>
    /// Checks out published version.
    /// </summary>
    /// <param name="dialogFunc">Should always be VersioningDialogs.checkOut), exception in unit tests where a UI will not be presented.</param>
    /// <param name="downloadFunc">Should always be VersioningDialogs.checkOutFileDownload), exception in unit tests where a UI will not be presented.</param>
    checkOut: function (dialogFunc, downloadFunc) {
        var that = this;
        var docId = this.documentId();
        var hasDraft = this.hasDraft();
        var currOwner = this.getDotted('DocumentPackage.VersionStateInfo.DraftOwnerId');
        dialogFunc({
            draftExists: hasDraft,
            hasFormPart: this.hasFormPart(),
            isFormComplete: this.isFormComplete(),
            currentOwner: currOwner,
            callback: function (settings, cleanup) {
                var updateDocPkg = function (docPkgResult) {
                    docPkgResult = docPkgResult && docPkgResult.toJSON ? docPkgResult.toJSON() : docPkgResult;  // make sure it is an object and not a Backbone model
                    that.set({ DocumentPackage: docPkgResult }, { silent: true }); //Triggering sync, don't trigger change events down the chain.
                    that.trigger('sync', that, {});
                    if (settings.download) {
                        that.downloadDraft(downloadFunc);
                    }
                };
                var coSF = function (result) {
                    Utility.executeCallback(cleanup);
                    $('body').trigger('MassDocumentUpdated', { ids: [docId] }); //Notify listeners that the meta has been updated.
                    that.replaceCachedViewDataVersionId(result.Version.Id);
                    if (settings.Uncomplete) {
                        var idx = 0;
                        var length = result.ContentItems.length;
                        for (idx; idx < length; idx++) {
                            result.ContentItems[idx].Complete = false;
                        }
                        that.set({ DocumentPackage: result }); // Need to allow changes to trigger, otherwise certain things such as isSlimUpdateEligible wont' be set properly
                        that.get('DocumentPackage').save(null, {
                            success: function (updatedDocPkg) {
                                updateDocPkg(updatedDocPkg);
                            }
                        });
                    }
                    else {
                        updateDocPkg(result);
                    }
                };
                var cvlSF = function (result) {
                    that.setDotted('DocumentPackage.ModifiedTicks', result);
                    var cvlCF = function () {
                        Utility.executeCallback(cleanup);
                        $('body').trigger('MassDocumentUpdated', { ids: [docId] }); //Notify listeners that the meta has been updated.
                        that.setDotted('DocumentPackage.VersionStateInfo.DraftOwnerId', settings.newDraftOwnerId);
                        var docPkg = that.get('DocumentPackage');
                        updateDocPkg(docPkg);
                    };
                    if (settings.Uncomplete) {
                        that.uncompleteForm();
                        that.get('DocumentPackage').save(null, {
                            success: function () {
                                cvlCF();
                            },
                            failure: function () {
                                Utility.executeCallback(cleanup, true);
                            }
                        });
                    }
                    else {
                        cvlCF();
                    }
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup, true);
                };
                if (hasDraft) {
                    var changeVersionLockArgs = {
                        VersionId: that.versionId(),
                        ReplacementDraftOwner: settings.newDraftOwnerId || null
                    };
                    that.docProxy.changeVersionLock(changeVersionLockArgs, cvlSF, ff);
                } else {
                    var documentCheckOutArgs = {
                        DocumentId: docId,
                        VersionComment: settings.comment
                    };
                    that.docProxy.checkOut(documentCheckOutArgs, coSF, ff);
                }
            }
        });
    },
    /// <summary>
    /// Removes the current draft, if a prior draft exists it becomes the new draft.
    /// </summary>
    /// <param name="dialogFunc">Should always be VersioningDialogs.cancelCheckOut), exception in unit tests where a UI will not be presented.</param>
    cancelDraft: function (dialogFunc) {
        var that = this;
        var verId = this.versionId();
        dialogFunc({
            callback: function (cleanup) {
                var sf = function (result) {
                    Utility.executeCallback(cleanup);
                    $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
                    if (result === Constants.c.emptyGuid) {
                        result = undefined;
                    }
                    that.replaceCachedViewDataVersionId(result);
                    that.fetch();
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup, true);
                };
                that.docProxy.deleteVersion({ DocumentVersionId: verId }, sf, ff);
            }
        });
    },
    /// <summary>
    /// Downloads the current draft.
    /// </summary>
    /// <param name="dialogFunc">Should always be VersioningDialogs.checkOutFileDownload), exception in unit tests where a UI will not be presented.</param>
    downloadDraft: function (dialogFunc) {
        var that = this;
        var sf = function (fileId) {
            dialogFunc(fileId);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            that.errorHandler(jqXHR, textStatus, errorThrown);
        };
        this.docProxy.prepForEdit({ DocumentId: this.documentId() }, sf, ff);
    },
    /// <summary>
    /// Downloads the current draft.
    /// </summary>
    /// <param name="dialogFunc">Should always be VersioningDialogs.unpublishVersion), exception in unit tests where a UI will not be presented.</param>
    /// <param name="versions">A collection of DocumentVersions (Models)</param>
    unpublishVersion: function (dialogFunc, versions) {
        var curVer = this.getDotted('DocumentPackage.Version');
        var that = this;
        var verId = this.versionId();
        dialogFunc({
            hasDraft: this.hasDraft(),
            currentVersion: curVer,
            versions: versions,
            callback: function (settings, cleanup) {
                var sf = function (result) {
                    // Select the created draft from the unpublish operation
                    Utility.executeCallback(cleanup);
                    var latestVersionId = result.LatestVersionId;
                    $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
                    that.replaceCachedViewDataVersionId(latestVersionId);
                    that.fetch();
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup, true);
                };
                var unpublishArgs = {
                    DocumentId: that.documentId(),
                    PromotePrior: settings.promotePrior,
                    PriorVersionId: settings.priorVersionId
                };
                that.docProxy.unpublish(unpublishArgs, sf, ff);
            }
        });
    },
    /// <summary>
    /// Deletes a given version from the document. If the version being deleted is the current version then the view is refreshed with the next version in the collection.
    /// </summary>
    /// <param name="versionId">Version id to be deleted</param>
    /// <param name="dialogFunc">Should always be VersioningDialogs.unpublishVersion), exception in unit tests where a UI will not be presented.</param>
    /// <param name="versions">A collection of DocumentVersions (Models)</param>
    /// <param name="cb">A callback on completion of the delete</param>
    deleteVersion: function (versionId, dialogFunc, versions, cb) {
        var that = this;
        var sf = function () {
            var fetched = false;
            if (versionId === that.versionId()) {
                var i = 0;
                var nextVer = versions.at(i).get('Id');
                while (nextVer === versionId) {
                    i++;
                    nextVer = versions.at(i).get('Id');
                }
                $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] });
                that.replaceCachedViewDataVersionId(nextVer);
                if (nextVer) {
                    fetched = true;
                    that.fetch();
                } else {
                    if (this.get('CachedViewData').length === 0) {
                        Utility.navigate('Retrieve', Page.routers.Retrieve, true, true); //No more documents in collection, go back to the retrieve page.
                    } else {
                        fetched = true;
                        that.fetch(); //Load the prior (or in the case viewing the first the next) document.
                    }
                }
            }
            Utility.executeCallback(cb, fetched);
        };
        var verToDel = versions.get(versionId);
        verToDel.destroy({ dialogFunc: dialogFunc, wait: true, success: sf });
    },
    /// <summary>
    /// Replaces the current version id in the CachedViewData with the passed id.
    /// If the value is null the current version is removed from the cached view data and the view index is adjusted as needed.
    /// </summary>
    replaceCachedViewDataVersionId: function (newVersionId) {
        var cvd = this.get('CachedViewData');
        if (cvd) {
            var i = 0;
            var length = cvd.length;
            var verId = this.versionId();
            for (i; i < length; i++) {
                var item = cvd[i];
                if (item.Key === verId) {
                    if (newVersionId) {
                        item.Key = newVersionId;
                    } else {
                        cvd.splice(i, 1);
                        var viewIndex = this.get('viewIndex') || 1;
                        if (viewIndex > 1) {
                            viewIndex--;
                            this.set('viewIndex', viewIndex, { silent: true }); //allow the caller to fetch.
                        }
                    }
                    break;
                }
            }
        }
        var that = this;
        var searchProxy = SearchServiceProxy();
        searchProxy.updateCachedViewData({
            CacheId: this.get('CachedViewId'),
            Data: cvd
        }, function () {
            that.set('versionIds', that.getVersionIdsFromCachedViewData(that.get('CachedViewData')));
        }, function (xhr, status, err) {
            that.errorHandler(xhr, status, err);
        });
    },
    ///<summary>
    /// Update the cached data, adding the new version id from a document split
    ///<param name="newVersionId">New document version to update CachedViewData with</param>
    ///</summary>
    updateCachedViewDataWithSplitDocument: function (newVersionId) {
        var cvd = this.get('CachedViewData');
        if (cvd) {
            var i = 0;
            var length = cvd.length;
            var verId = this.versionId();
            for (i; i < length; i++) {
                var item = cvd[i];
                if (item.Key === verId) {
                    if (newVersionId) {
                        cvd.splice(i + 1, 0, { Key: newVersionId, Value: 'ver' });  // Insert the new version id after the document that was split
                    }
                    break;
                }
            }
        }
        var that = this;
        var searchProxy = SearchServiceProxy();
        searchProxy.updateCachedViewData({
            CacheId: this.get('CachedViewId'),
            Data: cvd
        }, null, function (xhr, status, err) {
            that.errorHandler(xhr, status, err);
        });
    },
    getVersionIdsFromCachedViewData: function (cvd) {
        cvd = cvd || [];
        var versionIds = [];
        var idx = 0;
        var length = cvd.length;
        for (idx; idx < length; idx++) {
            var cvdItem = cvd[idx];
            if (cvdItem.Value === 'ver') {
                versionIds.push(cvdItem.Key);
            }
        }
        return versionIds;
    },
    /// <summary>
    /// Checks if the currently viewed document is the last in the CachedViewData
    /// </summary>
    isLastInCache: function () {
        var cvd = this.get('CachedViewData');
        if (cvd) {
            var length = cvd.length;
            var verId = this.versionId();
            return cvd[length - 1].Key === verId;
        }
    },
    /// <summary>
    /// Moves to the next document in the CachedViewData collection.
    /// Loads the document so the sync event will be fired.
    /// </summary>
    moveNext: function () {
        var cvd = this.get('CachedViewData');
        var viewIndex = this.get('viewIndex') || 1;
        viewIndex++;
        if (cvd && cvd.length < viewIndex) {
            viewIndex = 1;
        }
        this.set('viewIndex', viewIndex);
        this.fetch();
    },
    ///<summary>
    /// Move to the specified document (first, previous, next, last, or specific document)
    ///</summary>
    goToDocument: function (viewIndex) {
        viewIndex = this.boundsCheckDocumentNavigation(viewIndex);
        var currIndex = this.get('viewIndex');
        if (currIndex === viewIndex) {  // Don't fetch the same document, if currently viewing that document
            return;
        }
        var that = this;
        var changeViewIndex = function () {
            that.set('viewIndex', viewIndex);
            that.fetch({
                success: function () {
                    that.setDotted('DocumentPackage.burningInAnnotations', undefined); // hide burningInAnnotations div after fatch .
                }
            });
        };
        var dirty = this.get('isDirty');
        if (dirty) { // Save current document first if there are unsaved changes before going to another document
            if (confirm(Constants.t('confirmSave'))) {
                that.get('DocumentPackage').save(null, {
                    success: function () {
                        changeViewIndex(); // change view index on success only(do not change document if there is any error in unsaved document).
                    }
                });
            }
        }
        else {// if no unsaved change go to next document
            changeViewIndex();
        }
    },
    ///<summary>
    /// Ensure the index being navigated to falls within the correct bounds (1 - versionIds.length)
    ///<param name="idx">documentn index being navigated to</param>
    ///</summary>
    boundsCheckDocumentNavigation: function (idx) {
        var versionIds = this.get('versionIds');
        var numDocs = versionIds ? versionIds.length : 1;
        if (idx <= 1) {
            idx = 1;
        }
        else if (idx > numDocs) {
            idx = numDocs;
        }
        return idx;
    },
    /// <summary>
    /// Loads this model, typically called via this.sync as a result of a this.fetch call.
    /// Creates a cached view if one is not already created. This is important for caching the getViewerDataWithCache and should be done even by the previewer.
    /// </summary>
    getViewerDataWithCache: function (options) {
        var that = this;
        var sf = function (result) {
            that.set('versionIds', that.getVersionIdsFromCachedViewData(result.CachedViewData));
            result.DocumentPackage.saveExecuting = false;
            result.isDirty = false;
            options.success(result); //This success is pass in by backbone to the sync function.
        };
        var ff = function (xhr, status, err) {
            that.errorHandler(xhr, status, err);
        };

        this.set('currentPage', options.currentPage || undefined, { silent: true });
        this.setAnnotationsDisplay(undefined, { silent: true });

        var cachedViewId = this.get('CachedViewId');
        var cachedViewData = this.get('CachedViewData');
        var args;
        if (cachedViewId || cachedViewData) {
            //Have a cached view, load the data based on its values.
            var viewIndex = this.get('viewIndex') || 1;
            var htp = Utility.GetUserPreference('histTab');
            if (!htp) {
                htp = 'allChat';
            }
            args = {
                CachedViewData: cachedViewData,
                CachedViewId: cachedViewId,
                ViewIndex: viewIndex,
                IncludeUserChat: htp === 'userChat' || htp === 'allChat',
                IncludeSysChat: htp === 'sysChat' || htp === 'allChat'
            };
            this.bulkProxy.getViewerDataWithCache(args, sf, ff);
        } else {
            //Create a cached view based on either the Id or Ids passed, then call this function again.
            var ids = this.get('versionIds') || [];
            var id = this.get('Id');
            if (id) {
                ids.push(id);
            }
            args = [];
            var i = 0;
            var length = ids.length;
            for (i; i < length; i++) {
                args.push({ Key: ids[i], Value: 'ver' });
            }
            var cacheSF = function (result) {
                that.set({ CachedViewId: result, CachedViewData: args });
                that.getViewerDataWithCache(options);
            };
            this.searchProxy.setCachedViewData(args, cacheSF, ff);
        }

    },
    ///<summary>
    /// Split a document at the selected page - creating a new document out of the selected page and every page after it
    ///</summary>
    splitDocument: function (dialogFunc) {
        var that = this;
        var docPkg = this.get('DocumentPackage');
        dialogFunc({
            document: docPkg,
            pages: docPkg.get('Pages'),
            callback: function (atPage, splitOptions, cleanup) {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                var versionId = that.versionId();
                var sf = function (newVersionId) {
                    if (newVersionId !== Constants.c.emptyGuid) {
                        // a split has occurred and newVersionId is now part of our view collection
                        that.updateCachedViewDataWithSplitDocument(newVersionId);
                        that.fetch();   // obtain document data
                    }
                    Utility.executeCallback(cleanup);
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    Utility.executeCallback(cleanup);
                };
                var args = { VersionId: versionId, AtPage: atPage, DeletePage: splitOptions.deletePage, Title: splitOptions.Title, ContentTypeId: splitOptions.ContentTypeId };
                that.docProxy.splitDocument(args, sf, ff);
            }
        });
    },
    ///<summary>
    /// Obtain document hits
    ///</summary>
    getDocumentHits: function (options) {
        options = options || {};
        var searchId = this.get('searchResultId');
        var entityId = this.getDotted('DocumentPackage.Document.Id');
        if (!searchId) {
            return '';
        }
        var hitsData = this.get('hitsData') || {};
        if (options.fetch || !hitsData || hitsData.searchId !== searchId || hitsData.entityId !== entityId) {
            hitsData.searchId = searchId;
            hitsData.entityId = entityId;
            var that = this;
            var sf = function (hits) {
                hitsData.hits = hits;
                that.set('hitsData', hitsData);
                Utility.executeCallback(options.callback, hits);
            };
            var ff = function (jqHXR, textStatus, errorThrown) {
                ErrorHandler.popUpMessage(errorThrown);
            };
            this.searchProxy.getDocumentHits({ ResultId: searchId, EntityId: entityId }, sf, ff);
        }
        else {
            Utility.executeCallback(options.callback, hitsData.hits);
        }
    },
    ///<summary>
    /// Emails a document
    ///</summary>
    /// <param name="dialogFunc">Should always be Send.emailDialog, exception in unit tests where a UI will not be presented.</param>
    email: function (dialogFunc) {
        var ids = { documentIds: [this.documentId()], versionIds: [this.versionId()] };
        Send.email(ids, dialogFunc);
    },
    ///<summary>
    /// Prints the current document.
    ///</summary>
    /// <param name="dialogFunc">Should always be Send.printDialog, exception in unit tests where a UI will not be presented.</param>
    print: function (dialogFunc) {
        var ids = { versionIds: [this.versionId()] };
        Send.print(ids, dialogFunc);
    },
    ///<summary>
    /// Assigns the current document to a workflow
    ///</summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.assignWorkflow, exception in unit tests where a UI will not be presented.</param>
    assignWorkflow: function (dialogFunc) {
        var that = this;
        var versionId = this.versionId();
        var docId = this.documentId();
        var oldWf = this.getDotted('DocumentPackage.WorkflowId');
        dialogFunc({
            title: oldWf ? Constants.c.changeWorkflow : Constants.c.assignWorkflow,
            versionIds: [versionId],
            callback: function (workflowId, cleanup, failureCleanUp) {
                var success = function (result) {
                    var callback = function () {
                        Utility.executeCallback(cleanup);
                        that.fetch();
                    };
                    $('body').trigger('MassDocumentUpdated', { ids: [docId], callback: callback });
                };
                var failure = function (xhr, status, err) {
                    Utility.executeCallback(failureCleanUp, err);
                };
                var assignWorkflowPkg = { WorkflowId: workflowId, VersionIds: [versionId], ReplaceWorkflow: true };
                var header = {};
                header["ds-options"] = Constants.sro.NotifyVerbosely;
                var proxy = WorkflowServiceProxyV2({ skipStringifyWcf: true });
                proxy.assignWorkflow(assignWorkflowPkg, success, failure, null, null, header);
            }
        });
    },
    ///<summary>
    /// Sets the assignee for the current document being viewed/previewed
    ///</summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.setAssignee, exception in unit tests where a UI will not be presented.</param>
    setWorkflowAssignee: function (dialogFunc) {
        var that = this;
        var wfDocId = this.getDotted('DocumentPackage.WFDocumentDataPackage.WFDocument.Id');
        var docId = this.documentId();
        var versionId = this.versionId();
        var header = {};
        header["ds-options"] = Constants.sro.NotifyVerbosely;
        var options = {
            versionIds: [versionId],
            callback: function (assigneeId, cleanup, failureCleanup) {
                var success = function (result) {
                    var callback = function () {
                        Utility.executeCallback(cleanup);
                        that.fetch();
                    };
                    $('body').trigger('MassDocumentUpdated', { ids: [docId], callback: callback });
                };
                var failure = function (xhr, status, err) {
                    failureCleanup(xhr, status, err);
                };
                var changeAssigneePackage = {
                    WFDocumentIds: [wfDocId],
                    AssigneeId: assigneeId,
                    DocumentIds: [docId]
                };
                var proxy = WorkflowServiceProxyV2({ skipStringifyWcf: true });
                proxy.changeAssignee(changeAssigneePackage, success, failure, null, null, header);
            }
        };
        dialogFunc(options);
    },
    ///<summary>
    /// Retrieves the guest option value if present
    ///</summary>
    guestOption: function (optionName) {
        var guestOptions = this.get('guestOptions');
        if (guestOptions) {
            return guestOptions[optionName];
        }
    }
});