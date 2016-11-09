//Complex Objects: A model that contains other models in its attributes. The complex object is setup so events from child models propegate up to the parent.
var DocumentGetPackageCPX = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    docProxy: DocumentServiceProxy({ skipStringifyWcf: true }),
    customSave: undefined, //Custom save method used if something needs to be done prior to a save execution but within a save call (Like uploading attachements in a form).
    isSlimUpdateEligible: true, // set by BulkViewerDataPackageCPX if a change, which precludes use of SlimUpdate, occurs
    slimUpdatePackage: undefined, // populated by BulkViewerDataPackageCPX on each change, which may be made through SlimUpdate 
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.Document) {
            attr = attrs.Document;
            if (this.get('Document') instanceof Backbone.Model) {
                this.get('Document').set(attr, options);
                delete attrs.Document;
            }
            else {
                attrs.Document = new Document();
                attrs.Document.set(attr, options);
                this.bindSubModelEvents(attrs.Document, 'Document');
            }
        }
        if (attrs.Version) {
            attr = attrs.Version;
            if (attr.Id) {
                attrs.Id = attr.Id;
            }
            if (this.get('Version') instanceof Backbone.Model) {
                this.get('Version').set(attr, options);
                delete attrs.Version;
            }
            else {
                attrs.Version = new DocumentVersionCPX();
                attrs.Version.set(attr, options);
                this.bindSubModelEvents(attrs.Version, 'Version');
            }
        }
        if (attrs.ContentItems) {
            attr = attrs.ContentItems;
            if (this.get('ContentItems') instanceof Backbone.Collection) {
                this.get('ContentItems').reset(attr, options);
                delete attrs.ContentItems;
            }
            else {
                attrs.ContentItems = new ContentItems();
                attrs.ContentItems.set(attr, options);
                this.bindSubModelEvents(attrs.ContentItems, 'ContentItems');
            }
        }
        if (attrs.Pages) {
            attr = attrs.Pages;
            if (this.get('Pages') instanceof Backbone.Collection) {
                this.get('Pages').reset(attr, options);
                delete attrs.Pages;
            }
            else {
                attrs.Pages = new DocumentPages();
                attrs.Pages.set(attr, options);
                this.bindSubModelEvents(attrs.Pages, 'Pages');
            }
        }
        if (attrs.Bookmarks) {
            attr = attrs.Bookmarks;
            if (this.get('Bookmarks') instanceof Backbone.Collection) {
                this.get('Bookmarks').reset(attr, options);
                delete attrs.Bookmarks;
            }
            else {
                attrs.Bookmarks = new Bookmarks();
                attrs.Bookmarks.set(attr, options);
                this.bindSubModelEvents(attrs.Bookmarks, 'Bookmarks');
            }
        }
        if (attrs.Inbox) {
            attr = attrs.Inbox;
            if (this.get('Inbox') instanceof Backbone.Model) {
                this.get('Inbox').set(attr);
                delete attrs.Inbox;
            }
            else {
                attrs.Inbox = new SlimEntity();
                attrs.Inbox.set(attr, options);
                this.bindSubModelEvents(attrs.Inbox, 'Inbox');
            }
        }
        if (attrs.Approvals) {
            attr = attrs.Approvals;
            if (this.get('Approvals') instanceof Backbone.Collection) {
                this.get('Approvals').reset(attr, options);
                delete attrs.Approvals;
            }
            else {
                attrs.Approvals = new Approvals();
                attrs.Approvals.set(attr, options);
                this.bindSubModelEvents(attrs.Approvals, 'Approvals');
            }
        }
        if (attrs.Folders) {
            attr = attrs.Folders;
            if (this.get('Folders') instanceof Backbone.Collection) {
                this.get('Folders').reset(attr, options);
                delete attrs.Folders;
            }
            else {
                attrs.Folders = new SlimEntities();
                attrs.Folders.set(attr, options);
                this.bindSubModelEvents(attrs.Folders, 'Folders');
            }
        }
        if (attrs.VersionComments) {
            attr = attrs.VersionComments;
            if (this.get('VersionComments') instanceof Backbone.Collection) {
                this.get('VersionComments').reset(attr, options);
                delete attrs.VersionComments;
            }
            else {
                attrs.VersionComments = new VersionComments();
                attrs.VersionComments.set(attr, options);
                this.bindSubModelEvents(attrs.VersionComments, 'VersionComments');
            }
        }
        if (attrs.VersionStateInfo) {
            attr = attrs.VersionStateInfo;
            if (this.get('VersionStateInfo') instanceof Backbone.Model) {
                this.get('VersionStateInfo').set(attr, options);
                delete attrs.VersionStateInfo;
            }
            else {
                attrs.VersionStateInfo = new VersionStateInfo();
                attrs.VersionStateInfo.set(attr, options);
                this.bindSubModelEvents(attrs.VersionStateInfo, 'VersionStateInfo');
            }
        }
        if (attrs.Messages) {
            attr = attrs.Messages;
            if (this.get('Messages') instanceof Backbone.Collection) {
                this.get('Messages').reset(attr, options);
                delete attrs.Messages;
            }
            else {
                attrs.Messages = new Messages();
                attrs.Messages.set(attr, options);
                this.bindSubModelEvents(attrs.Messages, 'Messages');
            }
        }
        if (attrs.WFDocumentDataPackage) {
            attr = attrs.WFDocumentDataPackage;
            //Make the WFDocumentDataPackage document id aware so it can fire MassDocumentUpdated events.
            attr.DocumentId = this.documentId() || (attrs.Document ? attrs.Document.get('Id') : '');
            if (!attr.DocumentId) {
                delete attr.DocumentId;
            }
            if (this.get('WFDocumentDataPackage') instanceof Backbone.Model) {
                this.get('WFDocumentDataPackage').set(attr, options);
                delete attrs.WFDocumentDataPackage;
            }
            else {
                attrs.WFDocumentDataPackage = new WFDocumentDataPackageCPX();
                attrs.WFDocumentDataPackage.set(attr, options);
                this.bindSubModelEvents(attrs.WFDocumentDataPackage, 'WFDocumentDataPackage');
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
                this.getDocument(options);
                break;
            case "update":
                this.updateDocument(options);
                break;
            case "delete":
                this.deleteDocument(options);
                break;
        }
    },
    validate: function (attributes, options) {
        var errObj = {};
        var m = this.get('Document');
        if (!m) {
            errObj.Document = Constants.c.cannotSaveBeforeLoaded;
        }
    },
    hasRights: function (sp) {
        var doc = this.get('Document');
        if (doc) {
            return doc.hasRights(sp);
        }
        return false;
    },
    documentId: function () {
        var doc = this.get('Document');
        if (doc) {
            return doc.get('Id');
        }
    },
    versionId: function () {
        var ver = this.get('Version');
        if (ver) {
            return ver.get('Id');
        }
    },
    effectivePermissions: function () {
        var doc = this.get('Document');
        if (doc) {
            return doc.get('EffectivePermissions');
        }
    },
    baseSlimUpdatePkg: function () {
        return {
            DocumentId: this.documentId(),
            VersionId: this.versionId(),
            ModifiedTicks: this.get('ModifiedTicks')
        };
    },
    /// <summary>
    /// Returns an object used to get a rendering with or without redactions / annotations.
    /// The values for this are based on a user preference and security.
    /// </summary>
    getDefaultAnnotationDisplay: function () {
        var showAnnotations = window.userPreferences.getShowAnnotations();
        var canRedact = this.hasRights(Constants.sp.Redact);
        return { redacted: !canRedact || (canRedact && showAnnotations), annotated: showAnnotations };
    },
    /// <summary>
    /// Load the markup for the form part that is being requested by formPartIndex
    ///<param name="formPartIndex">index of the content item that is also a form part</param>
    ///<param name="callBack">callback function to execute on completion of loading the markup</param>
    ///<param name="options">Service Proxy options, eg. skipStringifyWcf</param>
    /// </summary>
    loadFormPartMarkup: function (formPartIndex, callBack, options) {
        options = $.extend(options || {}, { skipStringifyWcf: true });

        var cis = this.get('ContentItems');
        if (!cis) {
            return;
        }
        var fps = cis ? cis.getAllFormParts() : [];
        if (fps.length === 0) {
            return;
        }
        var fp = fps[formPartIndex];
        if (!fp || !fp.get('FormPartId')) {
            return;
        }
        var formPartId = fp.get('FormPartId');
        var docGetPackage = this.toJSON();
        // Clear out any empty values, so the custom fields aren't improperly mapped server side when obtaining the form markup
        var cfvs = this.getDotted('Version.CustomFieldValues');
        if (cfvs && cfvs.length) {
            docGetPackage.Version.CustomFieldValues = cfvs.onlyNonEmptyValues();
        }
        var sf = function (result) {
            callBack(result);
        };
        var ff = function (xhr, status, err) {
            ErrorHandler.popUpMessage(err);
        };
        var formProxy = FormsServiceProxy(options);
        formProxy.generatePartBody({ FormPartId: formPartId, Document: docGetPackage, OnlyBodyContent: true }, sf, ff);
    },
    /// <summary>
    /// Finds the bookmark relating to a page 1 of a content item
    /// </summary>
    getBookmarkForContentItem: function (contentItem) {
        var cis = this.get('ContentItems');
        var bookmarks = this.get('Bookmarks');
        if (!bookmarks || bookmarks.length === 0 || !cis || cis.length === 0) {
            return;
        }
        var pageNumber = this.getPageNumber(contentItem);
        return bookmarks.getForPage(pageNumber);
    },
    /// <summary>
    /// Returns the true page number of the first page of a given content item.
    /// </summary>
    getPageNumber: function (contentItem) {
        //Easy Mode, find the page in the pages collection
        var pages = this.get('Pages');
        var page;
        if (pages && pages.length > 0) {
            page = pages.getContentItemPage(contentItem.get('Id'), 1);
        }
        if (page) {
            return page.get('TruePageNumber');
        }

        //Take the hard way, iterate over the content items and determine the true page number.
        var cis = this.get('ContentItems');
        var i = 0;
        var length = cis.length;
        var pageNum = 0;    // start at 0, and increment/set before returning. Should be 1 based.
        for (i; i < length; i++) {
            var ci = cis.at(i);
            page = pages.getContentItemPage(ci.get('Id')); //No page number passed = last page of the content item.
            if (page) {
                pageNum = page.get('TruePageNumber');
            } else {
                pageNum++; //Native content item, count as 1 page.
            }
            if (ci === contentItem) {
                return pageNum;
            }
        }
        return -1;

    },
    /// <summary>
    /// Checks if the current user has an approval in the documents approvals collection.
    /// This includes checking to see if the user is in a role that has an approval request.
    /// </summary>
    userHasApprovals: function () {
        var apps = this.get('Approvals');
        if (apps && apps.length > 0) {
            return apps.userHasApprovals();
        }
        return false;
    },
    /// <summary>
    /// Creates a DocumentUpdatePackage based on this model.
    /// </summary>
    getUpdatePackage: function () {
        var pages = this.get('Pages');
        var dup = {
            AnnotationChangePageNumbers: [],
            RedactionChangePageNumbers: [],
            SaveOptions: {
                BrowserConnectionId: window.CompanyInstanceHubProxy ? window.CompanyInstanceHubProxy.connection.id : undefined,
                ReturnUpdated: true,
                AddToDistributedQueue: !!this.get('addToDistributedQueue')
            },
            ModifiedTicks: this.get('ModifiedTicks'),
            Document: this.get('Document').toJSON(),
            Version: this.get('Version').getUpdatePackage(),
            ContentItems: this.get('ContentItems').toJSON(),
            // Pages: set later
            RolePermissions: this.get('RolePermissions'),
            UserPermissions: this.get('UserPermissions'),
            Bookmarks: this.get('Bookmarks') ? this.get('Bookmarks').toJSON() : undefined,
            Approval: this.get('Approval')
        };
        var ib = this.get('Inbox');
        dup.InboxId = ib ? ib.get('Id') : undefined;
        dup.FolderIds = [];
        var fs = this.get('Folders');
        var i = 0;
        var length = fs ? fs.length : 0;
        for (i; i < length; i++) {
            dup.FolderIds.push(fs.at(i).get('Id'));
        }
        i = 0;
        length = pages ? pages.length : 0;
        for (i; i < length; i++) {
            var p = pages.at(i);
            var annotations = p.get('AnnotationCollection');
            // If there is a new approval and we are at page 1, find the stamp, update the approval and remove from collection (It will be saved through the Approval attribute)
            if (dup.Approval && p.get('TruePageNumber') === 1) {
                var approvalMark = annotations.findWhere({ ApprovalId: Constants.c.emptyGuid });
                if (approvalMark) {
                    var r = approvalMark.get('Rectangle');
                    var x = Math.round(r.Left);
                    var y = Math.round(r.Top);
                    dup.Approval.set('X', x);
                    dup.Approval.set('Y', y);
                    // Function to save user prefs was prepared for us when approval mark was created
                    var saveUserPrefsFunction = approvalMark.get('savePreferencesFunction');
                    if (saveUserPrefsFunction) {
                        saveUserPrefsFunction(x, y);
                    }
                    annotations.remove(approvalMark);
                }
            }
            if (annotations && annotations.anyDirty()) {
                dup.AnnotationChangePageNumbers.push(p.get('TruePageNumber'));
            }
            var redactions = p.get('RedactionCollection');
            if (redactions && redactions.anyDirty()) {
                dup.RedactionChangePageNumbers.push(p.get('TruePageNumber'));
            }
        }
        dup.Pages = pages ? pages.toJSON() : undefined; // set here to recognized removed temporary annotations
        return dup;
    },
    /// <summary>
    /// This method is modeled 1:1 after Astria.Framework.DataContracts.V2Extensions.DocumentPackageExtensions.FindPage
    /// return { idx: contentItem, ci: ci, pdto: pdto[pageNumber - 1], pageIdx: pageNumber - 1, ciPages: ciPages };
    /// </summary>
    findPage: function (pageNumberSought) {
        pageNumberSought = parseInt(pageNumberSought, 10);  // Ensure that pageNumberSought is an integer
        var contentItems = this.get('ContentItems');
        var pages = this.get('Pages');
        var ciPages = [];
        var contentItem = null;
        var ciCount = contentItems ? contentItems.length : 0;
        if (ciCount === 0 || pageNumberSought < 1) {
            return null;
        }

        var pgCount = pages ? pages.length : 0;

        // Short-cuts for special cases
        if (pgCount === 0) {
            // nothing rendered: return content item directly from array with null page
            if (pageNumberSought <= ciCount && pageNumberSought >= 1) {
                contentItem = contentItems.at(pageNumberSought - 1); // return ci only if in range
            }
            return { idx: pageNumberSought - 1, ci: contentItem }; // either way, page is null
        }
        if (ciCount === 1) {
            // single content item, rendered: return page from array and the only content item
            if (pageNumberSought <= pgCount && pageNumberSought >= 1) {
                contentItem = contentItems.at(0);
                ciPages = this.getPagesPerContentItem(contentItem);
                return { idx: 0, ci: contentItem, pdto: pages.at(pageNumberSought - 1), pageIdx: pageNumberSought - 1, ciPages: ciPages };
            }
            return null; // page requested is out-of-range
        }

        // Strategy: advanced through content item and page collections concurrently, 
        // advancing pages while they match the current content item, and
        // advancing content item when there are no more pages in the current one
        var pgIndex = 0;
        var ciIndex = 0;
        var pageNumber = 0; // this will be set to TruePage or incremented before first pageNumber == pageNumberSought comparison
        var pg = null;
        var newPage;
        var ci;
        var ciHasPages = false;

        do {
            ci = contentItems.at(ciIndex);

            // find next page
            newPage = pg = null;
            if (pgIndex < pgCount) {
                newPage = pages.at(pgIndex);
                if (newPage.get('ContentItemId') === ci.get('Id')) {
                    pg = newPage;
                    ciHasPages = true;  // indicates at least one page in this content item
                    pgIndex++;          // current page belongs to current content item; advance index to next page
                    pageNumber = pg.get('TruePageNumber');
                }
            }

            if (pg === null && !ciHasPages) {
                pageNumber++; // a content item with no pages counts as a page
            }

            if (pageNumber === pageNumberSought) {
                contentItem = ci;
                ciPages = this.getPagesPerContentItem(ci);
                return { idx: ciIndex, ci: contentItem, pdto: pg, pageIdx: pgIndex, ciPages: ciPages };
            }

            // seek: pgIndex has already advanced if it belonged to current content item
            if (pg === null) {
                ciIndex++; // ciIndex advances when there are no more pages in this one
                ciHasPages = false;
            }
        }
        while (ciIndex < ciCount);

        return null; // ran out of content items
    },
    /// <summary>
    /// Returns all the pages that belong to the given content item
    /// </summary>
    getPagesPerContentItem: function (ci) {
        var ciPages = [];
        if (ci) {
            var ciId = ci.get('Id');
            var i = 0;
            var pages = this.get('Pages');
            var length = pages.length;
            for (i; i < length; i++) {
                var page = pages.at(i);
                if (page && ciId && page.get('ContentItemId') === ciId) {
                    ciPages.push(page);
                }
            }
        }
        return ciPages;
    },
    ///<summary>
    /// Determines if the passed in page has text
    /// </summary>
    pageHasText: function (pageNum) {
        var hasText = false;
        var pageInfo = this.findPage(pageNum);
        if (pageInfo && pageInfo.pdto) {
            hasText = !!pageInfo.pdto.get('Text');
        }
        else {
            hasText = false;
        }
        return hasText;
    },
    /// <summary>
    /// Gets the total number of pages in a document accounting for non-rendered content items (counted as 1 page).
    /// Also returns the number of pages per content item.
    /// </summary>
    getNumPages: function () {
        var numPagesPerContentItem = [];
        var contentItems = this.get('ContentItems');
        var length = contentItems.length;
        var i = 0;
        var plen = 0;
        for (i = 0; i < length; i++) {
            numPagesPerContentItem.push(this.getPagesPerContentItem(contentItems.at(i)).length);
            plen += numPagesPerContentItem[i] === 0 ? 1 : numPagesPerContentItem[i];
        }
        return { numPagesPerContentItem: numPagesPerContentItem, pages: plen };
    },
    ///<summary>
    /// Gets an array of thumbnails, in the order they were selected
    ///</summary>
    getSelectedThumbs: function () {
        return this.get('selectedThumbs') || [];
    },
    ///<summary>
    /// Get page number from the last selected thumbnail
    ///</summary>
    getLastSelectedPage: function () {
        var selectedThumbs = this.getSelectedThumbs();
        var lastSelectedPage = 1;
        var lastSelectedThumb = selectedThumbs[selectedThumbs.length - 1];
        if (typeof lastSelectedThumb === 'string') {
            lastSelectedPage = lastSelectedThumb.split('_')[1];
        }
        if (!lastSelectedPage) {
            lastSelectedPage = 1;
        }
        return parseInt(lastSelectedPage, 10);
    },
    /// <summary>
    /// Updates the rotation values for the appropriate pages. If rotating all the rotation of all pages are based on the page number passed in.
    /// </summary>
    rotate: function (page, rotateValue, rotateAll) {
        var info = this.findPage(page);
        if (info && info.pdto) {
            var newRotation = info.pdto.applyRotation(rotateValue);
            if (rotateAll) {
                var pages = this.get('Pages');
                var i = 0;
                var length = pages.length;
                for (i; i < length; i++) {
                    pages.at(i).set('Rotation', newRotation);
                }
            }
        }
    },

    /// <summary>
    /// Loads or refreshes this model, typically called via this.sync as a result of a this.fetch call.
    /// Generally should not be called directly to refresh the model.
    /// </summary>
    getDocument: function (options) {
        var sf = function (result) {
            options.success(result);
        };
        var ff = function (xhr, status, err) {
            ErrorHandler.popUpMessage(err);
        };
        var wfDoc = this.getDotted('WFDocumentDataPackage.WFDocument');
        var versionId = this.getDotted('Version.Id');
        //check before get whether document has workflow
        if (!wfDoc) {
            this.docProxy.getByVersion(versionId, sf, ff);
        }
        else {
            var documentGetArgs = { Id: versionId, GetOption: Constants.dgop.ByVersion, GetFlags: Constants.dgf.Everything };
            this.docProxy.getPackage(documentGetArgs, sf, ff);
        }

    },
    validateCustomFieldValues: function () {
        var cfvs = this.getDotted('Version.CustomFieldValues');
        var isValid = true;
        if (cfvs) {
            var length = cfvs.length;
            var i = 0;
            for (i; i < length; i++) {
                var valid = cfvs.at(i).isValid();
                if (!valid) {
                    isValid = false;
                }
            }
        }
        return isValid;
    },
    /// <summary>
    /// Commits this model to the server, typically called via this.sync as a result of a this.save call.
    /// Generally should not be called directly to update the model.
    /// </summary>
    updateDocument: function (options) {
        var that = this;
        if (!this.validateCustomFieldValues()) {
            that.set('saveExecuting', false);
            if (options && options.failure) {
                Utility.executeCallback(options.failure);
            }
            ErrorHandler.addErrors(Constants.c.errorFixMessage);
            return;
        }
        if (this.customSave && !options.fromCustomSave) {
            this.set('saveExecuting', true); // relies on customSave's callback to this function to clear saveExecuting
            this.customSave(function (saveOptions) { that.updateDocument($.extend({ fromCustomSave: true }, saveOptions)); }, options);
            return;
        }
        if (this.isSlimUpdateEligible) {
            this.slimUpdate(options); // sets and clears 'saveExecuting'
        } else {
            this.set('saveExecuting', true); // clears saveExecuting in sf and ff (not complete)
            var dup = this.getUpdatePackage();
            var sf = function (result) {
                var approvalStamp = that.get('Approval') && Utility.convertToBool(Utility.GetSystemPreferenceValue('enableApprovalStamps'));
                if (dup.AnnotationChangePageNumbers.length > 0 || dup.RedactionChangePageNumbers.length > 0 || approvalStamp) {
                    that.set('burningInAnnotations', { AnnoPageNums: dup.AnnotationChangePageNumbers, RedacPageNums: dup.RedactionChangePageNumbers, Approval: approvalStamp }); //Notify the user an asynchronous burn in is in progress.
                }
                that.set('Approval', undefined, { silent: true }); //Unset any approval in progress (It's been saved)
                that.trigger('change:Approval', that, undefined); // Manually trigger just the change event for the Approval unset, so the buttons become enabled again
                that.set('annotationDisplay', undefined, { silent: true }); //annotation mode is reset.
                that.set('addToDistributedQueue', false, { silent: true }); //reset flag in case it was set.
                if (!options.remainExecuting) {
                    that.set('saveExecuting', false); //Timing prevents this from being in a complete function. We need to set this prior to calling the success function.
                }
                options.success(result);
                $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
            };
            var ff = function (xhr, status, err) {
                that.set('saveExecuting', false);
                if (options && options.failure) {
                    options.failure(xhr, status, err);
                }
                ErrorHandler.popUpMessage(err);
            };
            var complete = function () {
                Utility.executeCallback(options.complete);
            };
            this.docProxy.update(dup, sf, ff, complete);
        }
    },
    /// <summary>
    /// Soft Deletes the document as the result of a destroy call to the model.
    /// Generally should not be called directly to update the model.
    /// </summary>
    deleteDocument: function (options) {
        this.set('saveExecuting', true);
        var that = this;

        var sf = function (result) {
            options.success(result);
            $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()], callback: options.cleanup });
        };
        var ff = function (xhr, status, err) {
            if (options && options.failure) {
                options.failure(xhr, status, err);
            } else {
                ErrorHandler.popUpMessage(err);
            }
        };
        var cf = function () {
            that.set('saveExecuting', false);
        };
        this.docProxy.softDelete([this.documentId()], sf, ff, cf);
    },
    /// <summary>
    /// Commits specific members of this model to the server, typically called via this.sync as a result of a this.save call.
    /// Generally should not be called directly to update the model.
    /// Be sure to test isSlimUpdateEligible prior to calling this method.
    /// </summary>
    slimUpdate: function (options) {
        options = options || {};
        var that = this;
        this.set('saveExecuting', true);
        var ff = function (xhr, status, err) {
            that.set('saveExecuting', false);
            if (options && options.failure) {
                options.failure(xhr, status, err);
            }
            ErrorHandler.popUpMessage(err);
        };
        var sf = function (result) {
            if (!options.remainExecuting) {
                that.set('saveExecuting', false); //Timing prevents this from being in a complete function. We need to set this prior to calling the success function.
            }
            var oneResult = result.ResultByVerId[0].Value; // ResultByVerId MUST contain one result if method reports success
            if (oneResult.Error) {
                ff(null, null, { Message: oneResult.Error.Message });
            }
            else {
                if (oneResult.Reload) {
                    that.fetch({
                        ignoreSync: options.ignoreSync,
                        ignoreReset: options.ignoreReset,
                        success: function () {
                            options.success({});
                        }
                    });
                }
                else {
                    that.set('ModifiedTicks', oneResult.ModifiedTicks);
                    options.success({});
                    $('body').trigger('MassDocumentUpdated', { ids: [that.documentId()] }); //Notify listeners that the meta has been updated.
                }
            }
        };
        var complete = function () {
            Utility.executeCallback(options.complete);
        };
        var sup = this.baseSlimUpdatePkg();
        $.extend(sup, this.slimUpdatePackage);
        // handle slim updatable collections
        var i;
        var col;
        var length;
        if (sup.FolderIds) {
            sup.FolderIds = [];
            col = this.get('Folders');
            length = col.length;
            for (i = 0; i < length; i++) {
                sup.FolderIds.push(col.at(i).get('Id'));
            }
        }
        if (sup.CustomFieldValues) {
            sup.CustomFieldValues = [];
            col = this.getDotted('Version.CustomFieldValues');
            if (col) {
                col.removeEmptySets();
                sup.CustomFieldValues = col.onlyNonEmptyValues();
            }
        }
        this.docProxy.updateManySlim([sup], sf, ff, complete);
    },
    /// <summary>
    /// Saves this model to the server, then submits the temporary document to make it permanent.
    /// </summary>
    submitForm: function (completeForm, requestIds, complete) {
        var that = this;
        var failure = function (xhr, status, msg) {
            ErrorHandler.addErrors(msg);
            that.set('saveExecuting', false);
        };
        var submitSuccess = function () {
            // that.set('saveExecuting', false); not needed here, because the caller's complete function redirects
            Utility.executeCallback(complete);
        };
        var saveSuccess = function () {
            var args = {
                DocumentId: that.documentId(),
                ProxyAuthRequestIds: requestIds
            };
            that.docProxy.submitTemporaryDocument(args, submitSuccess, failure);
        };
        if (completeForm) {
            var cis = this.get('ContentItems');
            cis.completeForm();
        }
        this.save({}, { success: saveSuccess, remainExecuting: true, ignoreSync: true, ignoreReset: true }); //When submitting a form we don't want to trigger any events, no reloads, nothing as we will redirect to a thankyou page after the submission is complete.
    },
    /// <summary>
    /// Moves a document to a container
    /// </summary>
    /// <param name="dialogFunc">Should always be DocumentMetaDialogs.moveTo, exception in unit tests where a UI will not be presented.</param>
    moveTo: function (dialogFunc) {
        var that = this;
        dialogFunc({
            callback: function (data, cleanup) {
                var addTo = data.addTo;
                var foldCol = that.get('Folders');
                foldCol.reset();
                if (data.folderLength > 0) {
                    foldCol.add(addTo);
                }
                if (data.inboxLength === 1) {
                    that.set('Inbox', addTo[0]);
                } else {
                    that.unset('Inbox');
                }
                cleanup();
            }
        });
    },
    /// <summary>
    /// Adds a document to a folder
    /// </summary>
    /// <param name="dialogFunc">Should always be DocumentMetaDialogs.addTo, exception in unit tests where a UI will not be presented.</param>
    addTo: function (dialogFunc) {
        var that = this;
        dialogFunc({
            callback: function (data, cleanup) {
                var addTo = data.addTo;
                var foldCol = that.get('Folders');
                foldCol.add(addTo);
                cleanup();
            }
        });
    },
    ///<summary>
    /// Downloads the fetched document
    ///</summary>
    /// <param name="dialogFunc">Should always be Send.downloadDialog, exception in unit tests where a UI will not be presented.</param>
    download: function (dialogFunc) {
        var ids = { versionIds: [this.versionId()] };
        Send.download(ids, dialogFunc);
    },
    ///<summary>
    /// Displays the audit trail for this document
    ///<param name="dialogFunc">Should always be DocumentMetaDialogs.viewAuditTrail, exception in unit tests where a UI will not be presented.</param>
    ///</summary>
    viewAuditTrail: function (dialogFunc) {
        dialogFunc({
            entityId: this.getDotted('Document.Id')
        });
    },
    //#region Page Options 
    ///<summary>
    /// Returns page ranges of selected pages (pagesToMove) and pages contained within a single content item (pagesToBurst)
    /// <param name="selectedThumbs">array of selected thumbnails ids ( eg. [thumb_1, thumb_2, ...])</param>
    ///</summary>
    getPageRangesFromSelectedThumbs: function (selectedThumbs) {
        // pagesToMove combines single paged Content Items and multi-paged content items into page ranges (eg. selectedThumbs are 1,2,3, pagesToMove contains 1 item ['1-3'])
        // eg. Content Item 1 has 3 pages, Content Item 2 has 1 page, page 1 of Content Item 1 is selected, and page 1 of Content Item 2 is selected
        // pagesToMove will contain ['1-3'] from Content Item 1, and will then make that range into ['1-4'] to include the page selected from Content Item 2
        var pagesToMove = [];
        // pagesToBurst contains page ranges of Content Items that have more than one selected thumb and would need to be burst in order to move those pages individually
        var pagesToBurst = [];
        var actualSelectedPages = [];
        var selectedPages = $.extend(true, [], selectedThumbs);
        selectedPages = selectedPages.sort(function (a, b) {
            return parseInt(a.split('_')[1], 10) - parseInt(b.split('_')[1], 10);
        });
        var length = selectedPages.length;
        var i = 0;
        for (i; i < length; i++) {
            actualSelectedPages.push(parseInt(selectedPages[i].split('_')[1], 10));
        }
        var selectedCIs = this.getSelectedCIsFromSelectedThumbs(selectedPages);
        var selectedCI;
        var burstRequired = false;
        for (selectedCI in selectedCIs) {
            if (selectedCIs.hasOwnProperty(selectedCI)) {
                var ci = selectedCIs[selectedCI];
                length = ci.length;
                // any ci with the same index is going to have the same data
                // just need to know how many pages are selected inside that content item, for proper message display and whether or not 'burst' is required
                var selCI = ci[0];
                var startPage = selCI.startpage;
                var endPage = selCI.endpage;
                var numCIPages = selCI.numpages;
                if (!burstRequired) {
                    burstRequired = !Utility.hasSeqRange(actualSelectedPages, startPage, endPage);
                }
                if (numCIPages === 1) {
                    // CI consists of a single page, 'Normalized' Document, can be moved
                    pagesToMove = PageOptionsDialogs.setPagesToMove(pagesToMove, startPage, endPage);
                }
                else if (numCIPages > 1) {
                    if (length === 1) {
                        // CI contain a single selected page
                        // Ok to move, Display page range of CI to show those pages will be moved (not just the selected one)
                        pagesToMove = PageOptionsDialogs.setPagesToMove(pagesToMove, startPage, endPage);
                    }
                    else if (length > 1) {
                        // CI contains multiple selected pages?
                        // CI must be burst in order to move selected Pages
                        pagesToMove = PageOptionsDialogs.setPagesToMove(pagesToMove, startPage, endPage);
                        pagesToBurst = PageOptionsDialogs.setPagesToMove(pagesToBurst, startPage, endPage);
                    }
                }
            }
        }
        return { pagesToMove: pagesToMove, pagesToBurst: pagesToBurst, actualSelectedPages: actualSelectedPages, burstRequired: burstRequired };
    },
    ///<summary>
    /// Returns content item data selected based on selected thumbnails
    ///</summary>
    getSelectedCIsFromSelectedThumbs: function (selectedThumbs) {
        var selectedCIs = {};
        var i = 0;
        var length = selectedThumbs.length;
        for (i; i < length; i++) {
            var truePageNum = Number(selectedThumbs[i].split('_')[1]);
            var pageInfo = this.findPage(truePageNum);
            if (pageInfo) {
                var ciIdx = pageInfo.idx;
                var data;
                if (pageInfo.ciPages && pageInfo.ciPages.length > 0) {
                    var ciNumPages = pageInfo.ciPages.length;
                    data = {
                        startpage: pageInfo.ciPages[0].get('TruePageNumber'),
                        endpage: pageInfo.ciPages[ciNumPages - 1].get('TruePageNumber'),
                        numpages: ciNumPages
                    };
                } else {
                    data = { startpage: truePageNum, endpage: truePageNum, numpages: 1 };
                }
                if (!selectedCIs[ciIdx]) {
                    selectedCIs[ciIdx] = [];
                }
                selectedCIs[ciIdx].push(data);
            }
        }
        return selectedCIs;
    },
    ///<summary>
    /// Obtain positions of selected content items based on positions of selected thumbs
    ///</summary>
    getSelectedCIPositionsFromSelectedThumbs: function (selectedThumbs, insertAtCI) {
        var indices = [];
        var i = 0;
        var length = selectedThumbs.length;
        for (i; i < length; i++) {
            var page = typeof selectedThumbs[i] === 'string' ? selectedThumbs[i].split('_')[1] : -1;
            if (page > 0) {
                var pageInfo = this.findPage(page);
                var ciIdx = pageInfo.idx;
                if (ciIdx === insertAtCI || (ciIdx === 0 && insertAtCI === -1)) { // If page range includes the page to be reordered (eg. Move page 1 before page 1 Move page 1-5 after page 3)
                    ErrorHandler.addErrors({ pageOptionsPageNumber: Constants.c.pageDestinationInMoveRange }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                    return;
                }
                indices.push(ciIdx);
            }
        }
        // Return sorted desc
        // If an index is not unique it is a compound document
        // Return unique indices
        indices = indices.sort(function (a, b) { return b - a; });
        indices = _.uniq(indices, true);
        return indices;
    },
    ///<summary>
    /// Reorder content items
    ///</summary>
    reorderContentItemDTOs: function (original, selectedThumbs, insertAtCI) {
        var totalCIs = original.length;
        var selected = [];
        var iab = insertAtCI === -1; //Insert at beginning
        if (!iab) {
            original[insertAtCI].InsertAfterMe = true;
        }
        var selIndices = this.getSelectedCIPositionsFromSelectedThumbs(selectedThumbs, insertAtCI);
        if (!selIndices) {
            return false;
        }
        var length = selIndices.length;
        // remove selected from original, based on selected CI indexes
        // insert selected back into original using splice
        //selIndices are ordered descending. So selected is in reverse order as well. 
        for (i = 0; i < length; i++) {
            selected.push(original.splice(selIndices[i], 1)[0]);
        }

        i = 0;

        while (i < totalCIs) {
            //YES you need two ifs here, inserting at the beginning is a special case.
            if (iab && i === 0) {
                this.spliceInSelContentItems(original, selected, insertAtCI);
                i += selIndices.length;
            }
            if (original[i]) {
                original[i].PageOrder = i + 1;
                if (original[i].InsertAfterMe) {
                    this.spliceInSelContentItems(original, selected, i);
                    i += selIndices.length;
                }
            }
            i++;
        }
        return true;
    },
    ///<summary>
    /// Add back in selected content items at the desired idx
    ///</summary>
    spliceInSelContentItems: function (original, selected, idx) {
        var length = selected.length;
        var i = length;
        //Selected is in reverse order, so to put them into the original array we need to walk through the selected backwards.
        for (i; i > 0; i--) {
            idx++;
            selected[i - 1].PageOrder = idx + 1; //Page numbers are one based, idx is 0;
            original.splice(idx, 0, selected[i - 1]);
        }
    },
    ///<summary>
    /// Returns whether or not all pages are selected 
    /// (eg. a single page is selected but the document consists of a single content item, then all pages are selected)
    ///</summary>
    isFullPageRange: function (pagesSelected, numberOfPages) {
        return Utility.hasSeqRange(pagesSelected, 1, numberOfPages);
    },
    selectThumbAfterDelete: function (pageNumBeforeDelete, numDeletedPages) {
        pageNumBeforeDelete = parseInt(pageNumBeforeDelete, 10);
        if (isNaN(pageNumBeforeDelete)) {
            pageNumBeforeDelete = 1;
        }
        var pageInfo = this.findPage(pageNumBeforeDelete);
        // default to the first page being selected, unless one is found below
        var selectedThumbs = ['thumb_1'];
        // Attempt to find a page that is after the page that was deleted (the one that would replace the deleted pages position)
        if (pageInfo && pageInfo.ci) {
            selectedThumbs[0] = 'thumb_' + (pageInfo.idx + 1);  // returned idx is zero based so add one since the thumbs are one based
        }
        else {
            // If there are no pages after the deleted page, go backwards to find the thumb that will precede the deleted thumb
            var idx;
            for (idx = 0; idx < pageNumBeforeDelete; idx++) {
                pageInfo = this.findPage(pageNumBeforeDelete - (idx + 1));
                if (pageInfo && pageInfo.ci) {
                    selectedThumbs[0] = 'thumb_' + (pageInfo.idx + 1);  // returned idx is zero based so add one since the thumbs are one based
                    break;  // early exit since a preceding page was found
                }
            }
        }
        // Clear the selected thumbs, but don't allow the events to trigger, since we are going to be resetting it directly below
        this.unset('selectedThumbs', { silent: true });
        // Set the selected thumbs, allowing the events to trigger for the updated selected thumbs
        this.set('selectedThumbs', selectedThumbs);
    },

    ///<summary>
    /// Perform reorder of content items (and thereby pages)
    ///</summary>
    /// <param name="dialogFunc">Should always be PageOptionsDialogs.reorderPages, exception in unit tests where a UI will not be presented.</param>
    reorderPages: function (dialogFunc) {
        var that = this;
        dialogFunc({
            document: this,
            contentItems: this.get('ContentItems'),
            pages: this.get('Pages'),
            callback: function (contentItems, cleanup) {
                var originalDocument = that.toJSON();
                that.set('ContentItems', contentItems, { collectionDirtyChange: true });
                that.save(null, {
                    success: function () {
                        Utility.executeCallback(cleanup);
                    },
                    failure: function (jqXHR, textStatus, errorThrown) {
                        // restore pages and content items to original values
                        that.set(originalDocument);
                        Utility.executeCallback(cleanup);
                    }

                });
            }
        });
    },
    ///<summary>
    /// Private - used in conjuction with reorderPages or with burstDocumentContentItems
    ///</summary>
    burstContentItem: function (args, sf, ff) {
        var that = this;
        var success = function (result) {
            that.set(result, { setDirty: false });
            Utility.executeCallback(sf, result);
        };
        var failure = function (jqXHR, textStatus, errorThrown) {
            if (ff && typeof ff === 'function') {
                ff(jqXHR, textStatus, errorThrown);
            }
        };
        this.docProxy.burstContentItem(args, success, failure);
    },
    ///<summary>
    /// Burst content items so each content item only contains a single page
    ///</summary>
    /// <param name="dialogFunc">Should always be PageOptionsDialogs.burstContentItems, exception in unit tests where a UI will not be presented.</param>
    /// <param name="isDirty">True if any change pending on document meta else false</param>
    burstDocumentContentItems: function (dialogFunc, isDirty) {
        var that = this;
        dialogFunc({
            document: this,
            contentItems: this.get('ContentItems'),
            pages: this.get('Pages'),
            pageDirty: isDirty,
            callback: function (args, sf, ff) {
                that.burstContentItem(args, sf, ff);
            }
        });
    },
    ///<summary>
    /// Delete selected pages - does not have to be burst
    ///</summary>
    /// <param name="dialogFunc">Should always be PageOptionsDialogs.deletePagesSimple, exception in unit tests where a UI will not be presented.</param>
    deletePagesSimple: function (dialogFunc) {
        var that = this;
        dialogFunc({
            document: this,
            pages: this.get('Pages'),
            contentItems: this.get('ContentItems'),
            callback: function (cleanup) {
                var originalDocument = that.toJSON();
                var original = that.get('ContentItems').toJSON();
                var pages = that.get('Pages').toJSON();
                // Obtain the selected content items
                var selectedThumbs = that.getSelectedThumbs();
                var lastSelectedPage = that.getLastSelectedPage();
                var length = selectedThumbs.length;
                var i = length - 1;
                var removedContentItems = [];
                // Obtain the ids from the selected content items
                for (i; i >= 0; i--) {
                    var pageInfo = that.findPage(selectedThumbs[i].split('_')[1]);
                    var ci = pageInfo.ci;
                    var remCI = original.splice(pageInfo.idx, 1);   // will only return one value, in an array
                    if (remCI && remCI[0]) {
                        removedContentItems.push(remCI[0]);
                    }
                }
                var j;
                length = pages.length;
                var numDeletedPages = removedContentItems.length;
                for (i = 0; i < length; i++) {
                    // Remove pages corresponding to their removed content items
                    var rciLen = removedContentItems.length;
                    for (j = 0; j < rciLen; j++) {
                        if (removedContentItems[j].Id === pages[i].ContentItemId) {
                            // Remove from the content item and the page collections
                            removedContentItems.splice(j, 1);
                            rciLen--;
                            j--;
                            pages.splice(i, 1);
                            length--;
                            i--;
                            break;
                        }
                    }
                    if (pages && i >= 0 && pages[i]) {
                        pages[i].TruePageNumber = i + 1;
                    }
                }
                that.set({
                    ContentItems: original,
                    Pages: pages
                }, { collectionDirtyChange: true });
                that.save(null, {
                    success: function (result) {
                        that.set(result);
                        that.selectThumbAfterDelete(lastSelectedPage, numDeletedPages);
                        Utility.executeCallback(cleanup);
                    },
                    failure: function (jqXHR, textStatus, errorThrown) {
                        // restore pages and content items to original values
                        that.set(originalDocument);
                        Utility.executeCallback(cleanup);
                    }
                });
            }
        });
    },
    ///<summary>
    /// Burst content items and then delete the selected pages
    ///</summary>
    /// <param name="dialogFunc">Should always be PageOptionsDialogs.burstAndDeletePages, exception in unit tests where a UI will not be presented.</param>
    burstAndDeletePages: function (dialogFunc) {
        var that = this;
        dialogFunc({
            callback: function (cleanup) {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                var versionId = that.versionId();
                var selectedThumbs = that.getSelectedThumbs();
                var lastSelectedPage = that.getLastSelectedPage();
                var pageInfo = that.findPage(lastSelectedPage);
                var allPages = pageInfo.ciPages; // should not be burstable if not rendered; should have been validated elsewhere
                var contentItemId = pageInfo.ci.get('Id');
                var firstPage = allPages[0].get('TruePageNumber');
                var lastPage = allPages[allPages.length - 1].get('TruePageNumber');

                var pageRanges = that.getPageRangesFromSelectedThumbs(selectedThumbs);
                var args = { VersionId: versionId, ContentItemId: contentItemId };
                var burstAndDeleteItemPackage = {
                    BurstContentItem: args,
                    PageRange: pageRanges.actualSelectedPages
                };
                var deletedPages = pageRanges.actualSelectedPages;
                var sf = function (result) {
                    var original = result.ContentItems;
                    var pages = result.Pages;
                    that.set(result);
                    that.selectThumbAfterDelete(lastSelectedPage, deletedPages.length);
                    Utility.executeCallback(cleanup);
                    that.trigger('sync', that, {});
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    Utility.executeCallback(cleanup);
                };
                that.docProxy.burstAndDelete(burstAndDeleteItemPackage, sf, ff);
            }
        });
    },
    removeApprovalStamp: function (approvalId, options) {
        if (approvalId) {
            var page1 = this.findPage(1);
            if (page1) {
                var annotations = page1.pdto.get('AnnotationCollection');
                var approvalMark = annotations.findWhere({ ApprovalId: approvalId });
                annotations.remove(approvalMark, options);
            }
        }
    }
    //#endregion Page Options

});