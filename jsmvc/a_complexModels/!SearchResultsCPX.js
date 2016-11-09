var SearchResultsCPX = Backbone.Model.extend({
    cancellationToken: {},
    dateTimeFields: {},
    idAttribute: 'ResultId',
    defaults: { Results: [], HitCount: 0, DidYouMean: [], ResultId: '', Total: 0, QueryTime: 0, Request: {}, Page: 1, MaxRows: 25 },
    defaultOverrides: {},  // Set overrides of defaults here (eg. MaxRows user preference)
    docProxy: DocumentServiceProxy({ skipStringifyWcf: true }),
    srProxy: SearchResultServiceProxy({ skipStringifyWcf: true }),
    adminProxy: AdminServiceProxy({ skipStringifyWcf: true }),
    importExportProxy: ImportExportServiceProxy({ skipStringifyWcf: true }),
    inboxProxy: InboxServiceProxy({ skipStringifyWcf: true }),
    folderProxy: FolderServiceProxy({ skipStringifyWcf: true }),
    wfProxy: WorkflowServiceProxyV2({ skipStringifyWcf: true }),
    searchProxy: SearchServiceProxy({ skipStringifyWcf: true }),
    initialize: function () {
        var that = this;
        $('body').on('MassDocumentUpdated', function (event, args) { that.massDocumentUpdated(event, args); });
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.Results) {
            if (this.get('Results') instanceof Backbone.Collection) {
                this.get('Results').reset(attrs.Results, options);
                delete attrs.Results;
            }
            else {
                attrs.Results = new SearchableEntities(attrs.Results, options);
                this.bindSubModelEvents(attrs.Results, 'Results');
            }
        }
        if (attrs.Request === null) {
            attrs.Request = {};
        }
        if (attrs.Request) {
            if (this.get('Request') instanceof Backbone.Model) {
                this.get('Request').set(attrs.Request, options);
                delete attrs.Request;
            }
            else {
                attrs.Request = new SearchRequestCPX(attrs.Request, options);
                this.bindSubModelEvents(attrs.Request, 'Request');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        var that = this;
        options.syncMethod = method;
        this.cancelCalls();
        switch (method) {
            case "create":
                break;
            case "read":
                var sf = function (result) {
                    that.set(result, options);
                    options.success(result, options); //This success is pass in by backbone to the sync function. This triggers the sync event.
                };
                var ff = function (jqXhr, status, err) {
                    that.errorHandler(jqXhr, status, err);
                };
                if (options.relatedDocumentId) {
                    if (!this.cancellationToken[options.relatedDocumentId]) {
                        this.cancellationToken[options.relatedDocumentId] = {};
                    }
                    this.searchProxy.searchRelatedDocuments(options.relatedDocumentId, sf, ff, null, this.cancellationToken[options.relatedDocumentId]);
                }
                else {
                    var request = this.get('Request').toJSON();
                    if (!this.cancellationToken[request.ResultId]) {
                        this.cancellationToken[request.ResultId] = {};
                    }
                    this.searchProxy.search(request, sf, ff, null, this.cancellationToken[request.ResultId]);
                }
                break;
            case "update":
                break;
            case "delete":
                break;
        }

    },
    cancelCalls: function () {
        var item;
        for (item in this.cancellationToken) {
            if (this.cancellationToken.hasOwnProperty(item)) {
                if (this.cancellationToken[item] && this.cancellationToken[item].cancel) {
                    this.cancellationToken[item].cancel();
                }
            }
        }
    },
    errorHandler: function (jqXhr, status, errorThrown) {
        ErrorHandler.popUpMessage(errorThrown);
    },
    toJSON: function () {
        return this.toJSONComplex();
    },
    ///<summary>
    /// Handle updating search results after slim update
    ///</summary>
    handleSlimUpdateResults: function (data) {
        data = data || {};
        var sups = data.sups;
        var key = data.key;
        var value = data.value;
        var cleanup = data.cleanup;
        var ff = data.failure;
        var entities = data.entities;
        var docIds = data.docIds;
        var result = data.result;
        var sup;
        var ex = [];
        var executeCleanup = true;
        for (sup in sups) {
            if (sups.hasOwnProperty(sup)) {
                var docId = sups[sup].DocumentId;
                var verId = sups[sup].VersionId;
                var searchableEntity = entities.get(docId);
                searchableEntity.setDotted('DynamicFields.' + key + '.Value', [value]);
                var idx = 0;
                var length = result.ResultByVerId.length;
                var r;
                for (idx; idx < length; idx++) {
                    r = result.ResultByVerId[idx];
                    if (r.Key === verId) {
                        if (r.Value.Error) {
                            ex.push(r.Value.Error);
                        }
                        else {
                            // Have to refetch search result items data, so don't execute cleanup until after MassDocumentUpdated completes
                            // This will prevent temporary mid-air collisions from occuring
                            if (r.Value.Reload) {
                                executeCleanup = false;
                            }
                                // If possible reset ModifiedTicks
                            else {
                                searchableEntity.setDotted('DynamicFields.' + Constants.UtilityConstants.DF_MODIFIED_TICKS + '.Value', [r.Value.ModifiedTicks]);
                            }
                        }
                        break;
                    }
                }
            }
        }
        if (ex.length) {
            ff(null, null, { Message: ex.join('<br>') });
        }
        if (executeCleanup) {
            Utility.executeCallback(cleanup);   // Allow user to perform further edits as soon as possible, so there is no waiting for MassDocumentUpdated to finish
        }
        // MassDocumentUpdated should take care of fetching new data for each document that was attempted to be updated.
        $('body').trigger('MassDocumentUpdated', { ids: docIds, callback: cleanup });
    },
    updateSortIfNoResults: function () {
        var results = this.get('Results');
        if (!results || results.length === 0) {
            var req = this.get('Request');
            if (req) {
                req.setSortOrder();
                req.setSortBy();
            }
        }
    },
    /// <summary>
    /// Creates a SlimUpdatePackage for each selected item in the results. This will add the required fields DocumentId, VersionId, and ModifiedTicks and merge in any properties in the slimupdates argument.
    /// </summary>
    baseSlimUpdatePkg: function (slimUpdates) {
        var sups = [];
        var selected = this.get('Results').getSelected();
        var idx = 0;
        var length = selected.length;
        for (idx; idx < length; idx++) {
            if (selected[idx].get('Type') === 1) {
                var sup = {
                    DocumentId: selected[idx].get('Id'),
                    VersionId: selected[idx].getDotted('DynamicFields.' + Constants.UtilityConstants.VERSIONID + '.Value')[0],
                    ModifiedTicks: selected[idx].getDotted('DynamicFields.' + Constants.UtilityConstants.DF_MODIFIED_TICKS + '.Value')[0]
                };
                sup = $.extend(true, sup, slimUpdates);
                sups.push(sup);
            }
        }
        return sups;
    },
    /// <summary>
    /// Deletes or removes selected Documents, Folders, and/or Inboxes
    /// </summary>
    getResults: function () {
        return this.get('Results');
    },
    /// <summary>
    /// Gets the selected entity ids always returning versionIds, optionally you may includeDocIds, includeInboxIds, includeFolderIds, and includeWfDocIds.
    /// searchableIds are returned as well if includeDocIds, includeInboxIds, includeFolderIds, and/or includeWfDocIds are true and each is added to the searchableIds 
    /// array as well as their respective array.
    /// </summary>
    getEntityIds: function (options) {
        return this.get('Results').getEntityIds(options);
    },
    /// <summary>
    /// Deletes or removes selected Documents, Folders, and/or Inboxes
    /// </summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.deleteOrRemove, exception in unit tests where a UI will not be presented.</param>
    /// <param name="justRemove">Boolean - True - remove folders/inboxes, False - Delete Folders/Inboxes/</param>
    deleteOrRemoveItems: function (dialogFunc, justRemove) {
        var that = this;
        var entityIds = this.getEntityIds({
            includeDocIds: !justRemove,
            includeInboxIds: true,
            includeFolderIds: true
        });
        var documentIds = entityIds.documentIds;
        var inboxIds = entityIds.inboxIds;
        var folderIds = entityIds.folderIds;
        var method;
        var args;
        if (justRemove) {
            method = "remove";
            args = { InboxIds: inboxIds, FolderIds: folderIds };
        }
        else {
            method = "delete";
            args = { DocumentIds: documentIds, InboxIds: inboxIds, FolderIds: folderIds };
        }
        var diagFuncArgs = {
            justRemove: justRemove,
            documentIds: documentIds,
            inboxIds: inboxIds,
            folderIds: folderIds
        };
        dialogFunc($.extend({}, diagFuncArgs, {
            callback: function (cleanup) {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                var sf = function () {
                    //TODO: items should be removed from jstree due to a backbone event removing the item from the collection
                    //Remove from tree
                    var i = 0;
                    var length = inboxIds.length;
                    for (i = 0; i < length; i++) {
                        $('#jstree-' + inboxIds[i]).remove();
                    }
                    length = folderIds.length;
                    for (i = 0; i < length; i++) {
                        $('#jstree-' + folderIds[i]).remove();
                    }
                    $('body').trigger('MassDocumentUpdated', { callback: cleanup });
                    that.get('Results').trigger('change:isSelected');
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    if (errorThrown && errorThrown.Type && errorThrown.Type.match('WarningException')) {
                        that.errorHandler(jqXHR, textStatus, errorThrown);
                        var errData = errorThrown.Data;
                        errData = errData.split('\r\n');
                        // remove folderIds from passed in collection that were added to data 
                        //(these folders failed being deleted, so don't remove them from the grid, or jstree)
                        var dataLen = errData.length;
                        length = folderIds.length;
                        var j;
                        for (j = 0; j < dataLen; j++) {
                            var datum = errData[j].split(':'); // folderId and name are separated by a ':'
                            var id = datum[0];  // Obtain folderId
                            var i;
                            for (i = 0; i < length; i++) {
                                if (folderIds[i] === id) {
                                    folderIds.splice(i, 1);
                                    length--;
                                    i--;
                                    break;
                                }
                            }
                        }
                        sf();
                    }
                    else {
                        that.errorHandler(jqXHR, textStatus, errorThrown);
                        Utility.executeCallback(cleanup, true);
                    }
                };
                that.srProxy[method](args, sf, ff);
            }
        }));
    },
    /// <summary>
    /// Clears the selected result options and optionally notifies.
    /// </summary>
    clearSelected: function (notify) {
        var currentResults = this.get('Results');
        if (currentResults) {
            currentResults.clearSelected({ notify: notify });
        }
    },
    /// <summary>
    /// Selects all result items in the collection.
    /// </summary>
    selectAll: function (notify) {
        var currentResults = this.get('Results');
        if (currentResults) {
            currentResults.selectAll({ notify: notify });
        }
    },
    /// <summary>
    /// Clears the results collection and optionally notifies.
    /// </summary>
    clearResults: function (notify) {
        var currentResults = this.get('Results');
        if (currentResults) {
            currentResults.reset({ silent: !notify });
        }
    },
    ///<summary>
    /// Execute the provided callback for mass document updated
    /// Only allow the mass document updated callback to be executed ONCE, after the last handler has been allowed to execute.
    /// NOTE: this function is vulnerable to multiple triggers to massDocumentUpdated overlapping, because the two different callbacks will not be distinguished 
    /// here and they may not both get called
    ///</summary>
    executeMassDocumentUpdatedCallback: function (callback) {
        if (callback) {
            if (!window.massDocumentUpdatedEventHandlerCount) {
                window.massDocumentUpdatedEventHandlerCount = 0;
            }
            window.massDocumentUpdatedEventHandlerCount++;
            var evtHandlers = $._data($('body').get(0), "events").MassDocumentUpdated || [];
            var maxCalls = evtHandlers.length;
            if (window.massDocumentUpdatedEventHandlerCount >= maxCalls) {
                Utility.executeCallback(callback); // Still need to execute the callback if it exists (closes dialogs or possibly more crucial things)
                window.massDocumentUpdatedEventHandlerCount = undefined;
            }
        }
    },
    /// <summary>
    /// Refreshes all or specific result items in this Results collection
    /// </summary>
    massDocumentUpdated: function (event, args, isFromTimer) {
        args = args || {};
        // Determine number of event handlers for MassDocumentUpdated, and only execute the callback on the very last one
        if (this.get('Results').length === 0) {
            this.executeMassDocumentUpdatedCallback(args.callback);
            return; //If we don't currently have any results then there is nothing to update.
        }
        var that = this;
        //This is required to get updated information from SOLR. If you do not setTimeout you will get old information.
        if (!isFromTimer) {
            setTimeout(function () { that.massDocumentUpdated(event, args, true); }, Constants.RefreshDelay);
            return;
        }
        if (!args || !args.ids || args.ids.length === 0) {
            // Attempt to execute the callback on success or error
            this.fetch({    //No Arguements, just refetch all data based on last search request.
                doNotSetHash: true,
                success: function () {
                    that.executeMassDocumentUpdatedCallback(args.callback);
                },
                error: function () {
                    that.executeMassDocumentUpdatedCallback(args.callback);
                }
            });
        }
        else {
            var entityIds = this.intersectIds(args.ids);
            if (entityIds.length === 0) {
                that.executeMassDocumentUpdatedCallback(args.callback);
                return; //The changed id is not in our collection.
            }
            var searchObject = this.get('Request').toJSON();
            searchObject.Start = 0;
            searchObject.FieldedCriteria = [];
            searchObject.FieldedCriteria.push({
                DatabaseField: "id",
                DatabaseFieldOperator: "Has",
                DatabaseFieldValue: "",
                Has: entityIds,
                Concatenation: 2, // OR
                GroupConcatenation: 1 // AND
            });
            var success = function (result) {
                that.updateResultItems(result.Results, entityIds);
            };
            var failure = function (xhr, statusText, error) {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                ErrorHandler.addErrors({ 'search_error': error.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            var complete = function () {
                that.executeMassDocumentUpdatedCallback(args.callback);
            };
            SearchUtil.searchProxy.search(searchObject, success, failure, complete);

        }
    },
    /// <summary>
    /// Given an id array this function returns the ids that are in the results collection.
    /// </summary>
    intersectIds: function (ids) {
        var results = this.get('Results');
        var length = ids.length;
        var i = 0;
        var intersect = [];
        for (i; i < length; i++) {
            if (results.get(ids[i])) {
                intersect.push(ids[i]);
            }
        }
        return intersect;
    },
    /// <summary>
    /// Updates result items in the results collection as a result of a MassDocumentsUpdated call.
    /// Removes items that are not in the results but were passed in the criteria.
    /// </summary>
    updateResultItems: function (results, entityIds) {
        var ri;
        var i = 0;
        var length = results.length;
        var rCol = this.get('Results');
        for (i; i < length; i++) {
            var idx = entityIds.indexOf(results[i].Id);
            if (idx >= 0) {
                entityIds.splice(idx, 1);
            }
            ri = rCol.get(results[i].Id);
            if (ri) {
                ri.set(results[i]);
                // If it is selected and was modified, trigger isSelection in case preview needs to be refreshed (i.e. new approval stamp)
                if (ri.get('isSelected') === true && idx >= 0) {
                    ri.trigger('change:isSelected', ri, true);
                }
            }
        }
        i = 0;
        length = entityIds.length;
        for (i; i < length; i++) {
            ri = rCol.get(entityIds[i]);
            rCol.remove(ri); //Destroy instead? Would need to make sure an option is passed so it doesn't call delete.
            this.trigger('sync', this, {}, { doNotSetHash: true });
        }
    },
    ///<summary>
    /// Applies a document freeze to the selected documents
    ///</summary>
    /// <param name="dialogFunc">Should always be RecordsMgmtDialogs.freeze, exception in unit tests where a UI will not be presented.</param>
    freeze: function (dialogFunc) {
        var that = this;
        var documentIds = this.getEntityIds({
            includeDocIds: true
        }).documentIds;
        dialogFunc({
            itemCount: documentIds.length,
            callback: function (freezeId, cleanup) {
                var sf = function (result) {
                    Utility.executeCallback(cleanup);
                    $('body').trigger('MassDocumentUpdated', { ids: documentIds, callback: cleanup });
                };
                var args = { FreezeId: freezeId, DocumentIds: documentIds };
                var results = that.get('Results');
                var docIdIdx = 0;
                var docIdLen = documentIds.length;
                for (docIdIdx; docIdIdx < docIdLen; docIdIdx++) {
                    var res = results.get(documentIds[docIdIdx]);
                    var freezeIds = $.merge([], res.getDotted('DynamicFields.' + Constants.UtilityConstants.DF_FREEZEID + '.Value') || []);
                    var idx = 0;
                    var length = freezeIds.length;
                    var found = false;
                    for (idx; idx < length; idx++) {
                        if (freezeIds[idx] === freezeId) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        freezeIds.push(freezeId);
                    }
                    res.setDotted('DynamicFields.' + Constants.UtilityConstants.DF_FREEZEID + '.Value', freezeIds);
                }
                that.adminProxy.freezeDocuments(args, sf, that.errorHandler);
            }
        });
    },
    ///<summary>
    /// Removes a document from a freeze
    ///</summary>
    /// <param name="dialogFunc">Should always be RecordsMgmtDialogs.unFreeze, exception in unit tests where a UI will not be presented.</param>
    unfreeze: function (dialogFunc) {
        var that = this;
        var documentIds = this.getEntityIds({
            includeDocIds: true
        }).documentIds;
        var getFreezesSF = function (result) {
            dialogFunc({
                freezes: result,
                callback: function (freezeId, cleanup) {
                    var sf = function (result2) {
                        Utility.executeCallback(cleanup);
                        $('body').trigger('MassDocumentUpdated', { ids: documentIds, callback: cleanup });
                    };
                    var args = { FreezeId: freezeId, DocumentIds: documentIds };
                    that.adminProxy.unFreezeDocuments(args, sf, that.errorHandler);
                }
            });
        };
        this.adminProxy.getFreezesForDocs(documentIds, getFreezesSF, that.errorHandler);
    },
    ///<summary>
    /// Sets the cutoff date for the selected documents
    ///</summary>
    /// <param name="dialogFunc">Should always be RecordsMgmtDialogs.cutoff, exception in unit tests where a UI will not be presented.</param>
    cutoff: function (dialogFunc) {
        var entities = this.get('Results');
        if (!entities) {
            return;
        }
        var that = this;
        var docIds = entities.getEntityIds({
            includeDocIds: true
        }).documentIds;
        var itemCount = docIds.length;
        var coDate = itemCount === 1 ? entities.get(docIds[0]).getSingleDynamicFieldValue(Constants.UtilityConstants.DF_CUTOFF_DATE) : undefined;
        dialogFunc({
            itemCount: itemCount,
            cutoffDate: coDate,
            callback: function (selDate, cleanup) {
                if (selDate === coDate) {
                    cleanup();
                    return; //No change
                }
                var sups = that.baseSlimUpdatePkg({ CutoffDate: selDate });
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup, true);
                };
                var sf = function (result) {
                    that.handleSlimUpdateResults({
                        result: result,
                        sups: sups,
                        key: Constants.UtilityConstants.DF_CUTOFF_DATE,
                        value: selDate,
                        failure: ff,
                        entities: entities,
                        docIds: docIds,
                        cleanup: cleanup
                    });
                };
                that.docProxy.updateManySlim(sups, sf, ff);
            }
        });
    },
    ///<summary>
    /// Exports search results as a CSV file
    ///</summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.exportToCSV, exception in unit tests where a UI will not be presented.</param>
    exportToCSV: function (dialogFunc) {
        var that = this;
        dialogFunc({
            itemCount: that.getResults().length,
            callback: function (sf, ff) {
                that.importExportProxy.ExportToCSV(that.get('Request'), sf, ff);
            }
        });
    },
    ///<summary>
    /// Merges the selected documents into the first document selected.
    ///</summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.mergeResults, exception in unit tests where a UI will not be presented.</param>
    mergeResults: function (dialogFunc) {
        var that = this;
        var results = that.getResults();
        var docIds = this.getEntityIds({
            includeDocIds: true
        }).documentIds;
        if (docIds.length < 2) {
            ErrorHandler.addErrors(Constants.c.mergeCount);
            return;
        }
        dialogFunc({
            destinationDocTitle: results.get(docIds[0]).get('Title'),
            documentIds: docIds,
            callback: function (args, cleanup) {
                var sf = function (result) {
                    results.remove(args.SourceDocumentIds);
                    var callbackFunc = function () {
                        results.setSelected(args.DestinationDocumentId);
                        Utility.executeCallback(cleanup);
                    };
                    $('body').trigger('MassDocumentUpdated', { callback: callbackFunc });
                    that.get('Results').trigger('change:isSelected');
                };
                var ff;
                ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup);
                };
                that.docProxy.mergeDocuments(args, sf, ff);
            }
        });
    },
    ///<summary>
    /// Changes the security class and adhoc permissions to the selected documents
    ///</summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.changeSecurity, exception in unit tests where a UI will not be presented.</param>
    changeSecurity: function (dialogFunc) {
        var that = this;
        var entityIds = this.getEntityIds({
            includeDocIds: true,
            includeInboxIds: true,
            includeFolderIds: true
        });
        var opts = {
            showSecurityClass: true,
            callback: function (entitySecurityInformation) {
                var results = that.getResults();
                var idx = 0;
                var ids = $.merge([], entityIds.documentIds, entityIds.folderIds, entityIds.InboxIds);
                var length = ids.length;
                for (idx; idx < length; idx++) {
                    results.setDotted(ids[idx] + '.DynamicFields.' + Constants.UtilityConstants.DF_MODIFIED_TICKS + '.Value', [entitySecurityInformation.ModifiedTicks]);
                }
            }
        };
        opts = $.extend(opts, entityIds);
        dialogFunc(opts);
    },
    ///<summary>
    /// Removes all selected documents from any inbox they may be in
    ///</summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.removeFromInbox, exception in unit tests where a UI will not be presented.</param>
    removeFromInbox: function (dialogFunc) {
        var entities = this.get('Results');
        var docIds = entities.getEntityIds({
            includeDocIds: true
        }).documentIds;
        var docInboxData = {};
        var idx = 0;
        var length = docIds.length;
        for (idx; idx < length; idx++) {
            var inboxIdValues = entities.getDotted(docIds[idx] + '.DynamicFields.' + Constants.UtilityConstants.DF_INBOXID + '.Value');
            if (inboxIdValues) {
                var inboxId = inboxIdValues[0];
                if (!docInboxData[inboxId]) {
                    docInboxData[inboxId] = [];
                }
                docInboxData[inboxId].push(docIds[idx]);
            }
        }
        var containerArgs = [];
        var datum;
        var itemCount = 0;
        for (datum in docInboxData) {
            if (docInboxData.hasOwnProperty(datum)) {
                itemCount += docInboxData[datum].length;
                containerArgs.push({ ContainerId: datum, ChildId: docInboxData[datum] });
            }
        }
        var that = this;
        var opts = {
            itemCount: itemCount,
            containerArgs: containerArgs,
            callback: function (cleanup) {
                var sf = function (result) {
                    var idx = 0;
                    var length = docIds.length;
                    for (idx; idx < length; idx++) {
                        entities.setDotted(docIds[idx] + '.DynamicFields.' + Constants.UtilityConstants.DF_INBOXID + '.Value', '');
                    }
                    $('body').trigger('MassDocumentUpdated', { ids: docIds, callback: cleanup });
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup);
                };
                that.inboxProxy.removeDocumentsFrom(containerArgs, sf, ff);
            }
        };
        dialogFunc(opts);
    },
    ///<summary>
    /// Removes all selected documents from any folder or folders they may be in
    ///</summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.removeFromFolder, exception in unit tests where a UI will not be presented.</param>
    removeFromFolder: function (dialogFunc) {
        var entities = this.get('Results');
        var docIds = entities.getEntityIds({
            includeDocIds: true
        }).documentIds;
        var docFolderData = {};
        var idx = 0;
        var length = docIds.length;
        var itemCount = 0;
        for (idx; idx < length; idx++) {
            var folderIdValues = entities.getDotted(docIds[idx] + '.DynamicFields.' + Constants.UtilityConstants.DF_FOLDERID + '.Value');
            if (folderIdValues) {
                itemCount += 1;
                var idx2 = 0;
                var length2 = folderIdValues.length;
                for (idx2; idx2 < length2; idx2++) {
                    var folderId = folderIdValues[idx2];
                    if (!docFolderData[folderId]) {
                        docFolderData[folderId] = [];
                    }
                    docFolderData[folderId].push(docIds[idx]);
                }
            }
        }
        var containerArgs = [];
        var datum;
        for (datum in docFolderData) {
            if (docFolderData.hasOwnProperty(datum)) {
                containerArgs.push({ ContainerId: datum, ChildId: docFolderData[datum] });
            }
        }
        var that = this;
        var opts = {
            itemCount: itemCount,
            containerArgs: containerArgs,
            callback: function (cleanup) {
                var sf = function (result) {
                    var idx = 0;
                    var length = docIds.length;
                    for (idx; idx < length; idx++) {
                        entities.setDotted(docIds[idx] + '.DynamicFields.' + Constants.UtilityConstants.DF_FOLDERID + '.Value', '');
                    }
                    $('body').trigger('MassDocumentUpdated', { ids: docIds, callback: cleanup });
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup);
                };
                that.folderProxy.removeDocumentsFrom(containerArgs, sf, ff);
            }
        };
        dialogFunc(opts);
    },
    ///<summary>
    /// Requests approval for all selected documents.
    ///</summary>
    /// <param name="dialogFunc">Should always be ApprovalDialogs.requestApproval, exception in unit tests where a UI will not be presented.</param>
    requestApprovals: function (dialogFunc) {
        var versionIds = this.getEntityIds().versionIds;
        if (versionIds.length === 0) {
            DialogsUtil.invalidSelection();
            return;
        }
        var that = this;
        dialogFunc({
            callback: function (req, cleanup) {
                var sf = function (result) {
                    Utility.executeCallback(cleanup);
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup, true);
                };
                var idx = 0;
                var length = versionIds.length;
                var reqs = [];
                for (idx; idx < length; idx++) {
                    var newReq = $.extend({}, req);
                    newReq.VersionId = versionIds[idx];
                    reqs.push(newReq);
                }
                that.docProxy.requestApproval(reqs, sf, ff);
            }
        });
    },
    ///<summary>
    /// Sets the due date for all selected documents
    ///</summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.setDueDate, exception in unit tests where a UI will not be presented.</param>
    setDueDate: function (dialogFunc) {
        var that = this;
        var entities = that.getResults();
        var docIds = entities.getEntityIds({
            includeDocIds: true
        }).documentIds;
        var dueDate;
        if (docIds.length === 1) {
            dueDate = entities.get(docIds[0]).getSingleDynamicFieldValue(Constants.UtilityConstants.DUEDATE);
        }
        dialogFunc({
            dueDate: dueDate,
            itemCount: docIds.length,
            callback: function (dueDate, cleanup) {
                var slimUpdates = that.baseSlimUpdatePkg({ DueDate: dueDate });
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.errorHandler(jqXHR, textStatus, errorThrown);
                    Utility.executeCallback(cleanup, true);
                };
                var sf = function (result) {
                    that.handleSlimUpdateResults({
                        result: result,
                        sups: slimUpdates,
                        key: Constants.UtilityConstants.DUEDATE,
                        value: dueDate,
                        failure: ff,
                        entities: entities,
                        docIds: docIds,
                        cleanup: cleanup
                    });
                };
                that.docProxy.updateManySlim(slimUpdates, sf, ff);
            }
        });
    },
    ///<summary>
    /// Moves selected documents to a folder or inbox
    ///</summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.moveTo, exception in unit tests where a UI will not be presented.</param>
    moveTo: function (dialogFunc) {
        var that = this;
        var entities = this.get('Results');
        var entityIds = entities.getEntityIds({
            includeDocIds: true,
            includeFolderIds: true
        });
        var foldersData = [];
        var idx = 0;
        var folderIds = entityIds.folderIds;
        var length = folderIds.length;
        var res;
        for (idx; idx < length; idx++) {
            res = entities.get(folderIds[idx]);
            foldersData.push({
                title: res.get('Title'),
                entityId: folderIds[idx]
            });
        }
        var docsWithFolders = [];
        var documentIds = entityIds.documentIds;
        length = documentIds.length;
        for (idx = 0; idx < length; idx++) {
            res = entities.getDotted(documentIds[idx]);
            var dfFolderIds = res.getDotted('DynamicFields.' + Constants.UtilityConstants.DF_FOLDERID + '.Value');
            if (dfFolderIds && dfFolderIds.length > 1) {
                docsWithFolders.push(res.get('Title'));
            }
        }

        var overrideErrors;
        var opts = {
            documentIds: documentIds,
            foldersData: foldersData,
            callback: function (movementArgs, cleanup) {
                var docFolderMovementPkg = movementArgs.docFolderMovementPkg;
                var docMovementPkg = movementArgs.docMovementPkg;
                var folderMovementPkgs = movementArgs.folderMovementPkgs;
                var gridEntityType = movementArgs.gridEntityType;
                var overridableException = function (msg) {
                    var cleanupFunc;
                    var okFunc = function (ffCleanup) {
                        cleanupFunc = function () {
                            Utility.executeCallback(cleanup);
                            Utility.executeCallback(ffCleanup);
                        };
                        opts.callback(movementArgs, cleanupFunc);
                    };
                    var cancelFunc = function (ffCleanup) {
                        cleanupFunc = function () {
                            Utility.executeCallback(cleanup);
                            Utility.executeCallback(ffCleanup);
                        };
                        cleanupFunc();
                    };
                    DialogsUtil.generalPromptDialog(msg, okFunc, cancelFunc, { title: Constants.c.moveTo });
                };
                if (!overrideErrors && docsWithFolders.length > 0) {
                    msg = String.format(Constants.c.removeDocFromMultipleFolders, docsWithFolders.join(', '));
                    if (docsWithFolders.length > 1) {
                        msg = String.format(Constants.c.removeDocsFromMultipleFolders, docsWithFolders.join(', '));
                    }
                    msg += '\n\n' + Constants.c.continueYesNo;
                    overrideErrors = { "ds-options": Constants.sro.OverrideErrors };
                    overridableException(msg);
                }
                else {
                    var sf = function (results) {
                        var idx = 0;
                        var length = documentIds.length;
                        for (idx; idx < length; idx++) {
                            if (docMovementPkg && gridEntityType === Constants.UtilityConstants.DF_INBOXID) {
                                // Remove document from its folders, and add it to the selected inbox
                                entities.setDotted(documentIds[idx] + '.DynamicFields.' + Constants.UtilityConstants.DF_FOLDERID + '.Value', '');
                                entities.setDotted(documentIds[idx] + '.DynamicFields.' + Constants.UtilityConstants.DF_INBOXID + '.Value', docMovementPkg.DestinationId);
                            }
                            else {
                                // Remove document from its inbox, and add it to the selected folder(s)
                                entities.setDotted(documentIds[idx] + '.DynamicFields.' + Constants.UtilityConstants.DF_INBOXID + '.Value', '');
                                var newFolderIds = docFolderMovementPkg ? docFolderMovementPkg.DestinationId : docMovementPkg ? docMovementPkg.DestinationId : [];
                                entities.setDotted(documentIds[idx] + '.DynamicFields.' + Constants.UtilityConstants.DF_FOLDERID + '.Value', newFolderIds);
                            }
                        }
                        var massUpdateParams = {
                            ids: $.merge([], documentIds, entityIds.folderIds),
                            callback: function () {
                                //Try to refresh the tree if we moved some folders
                                if (foldersData.length > 0) {
                                    try {
                                        $.jstree._reference('#folder_list').refresh();
                                    } catch (e) { }
                                }
                                Utility.executeCallback(cleanup);
                            }

                        };
                        $('body').trigger('MassDocumentUpdated', massUpdateParams);
                    };
                    var ff = function (jqXHR, textStatus, errorThrown) {
                        if (errorThrown.Type && errorThrown.Type.match('OverridableException')) {
                            msg = errorThrown.Message;
                            msg += '\n\n' + Constants.c.continueYesNo;
                            overrideErrors = { "ds-options": Constants.sro.OverrideErrors };
                            overridableException(msg);
                        }
                        else {
                            that.errorHandler(jqXHR, textStatus, errorThrown);
                            Utility.executeCallback(cleanup, true);
                        }
                    };
                    var success = sf;
                    if (folderMovementPkgs.length > 0) {
                        success = function (result, movePkgIdx) {
                            movePkgIdx = movePkgIdx || 0;
                            if (folderMovementPkgs[movePkgIdx]) {
                                // Move folders one by one
                                that.folderProxy.moveFolder(folderMovementPkgs[movePkgIdx], function (result) {
                                    if (folderMovementPkgs[movePkgIdx + 1]) {
                                        success(result, ++movePkgIdx);
                                    }
                                    else {
                                        sf(result);
                                    }
                                }, ff);
                            }
                        };
                    }
                    // Move the documents
                    if (documentIds.length > 0) {
                        if (docFolderMovementPkg) {
                            that.docProxy.moveToFolders(docFolderMovementPkg, function (result) {
                                success(result, 0);
                            }, ff, null, null, overrideErrors);
                        }
                        else {
                            that.docProxy.moveTo(docMovementPkg, success, ff, null, null, overrideErrors);
                        }
                    }
                    else {
                        success();
                    }
                }
            }
        };
        dialogFunc(opts);
    },
    ///<summary>
    /// Sets the priority of selected documents
    ///</summary>
    /// <param name="dialogFunc">Should always be SearchResultDialogs.setPriority, exception in unit tests where a UI will not be presented.</param>
    setPriority: function (dialogFunc) {
        var that = this;
        var entities = this.get('Results');
        var docIds = entities.getEntityIds({
            includeDocIds: true
        }).documentIds;
        var currentPriority;
        if (docIds.length === 1) {
            var currentPriorityArr = entities.getDotted(docIds[0] + '.DynamicFields.' + Constants.UtilityConstants.DF_PRIORITY + '.Value');
            if (currentPriorityArr) {
                currentPriority = currentPriorityArr[0];
            }
        }
        var opts = {
            priority: currentPriority,
            documentIds: docIds,
            callback: function (priority, cleanup) {
                var slimUpdates = that.baseSlimUpdatePkg({ Priority: priority });
                var ff = function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.popUpMessage(errorThrown);
                    Utility.executeCallback(cleanup, true);
                };
                var sf = function (result) {
                    that.handleSlimUpdateResults({
                        result: result,
                        sups: slimUpdates,
                        key: Constants.UtilityConstants.DF_PRIORITY,
                        value: priority,
                        failure: ff,
                        entities: entities,
                        docIds: docIds,
                        cleanup: cleanup
                    });
                };
                that.docProxy.updateManySlim(slimUpdates, sf, ff);
            }
        };
        dialogFunc(opts);
    },
    ///<summary>
    /// Resets the selected documents workflows
    ///</summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.reset, exception in unit tests where a UI will not be presented.</param>
    resetWfDocuments: function (dialogFunc) {
        var that = this;
        var ids = this.getEntityIds({
            includeWfDocIds: true,
            includeDocIds: true
        });
        if (ids.wfDocIds.length <= 0) {
            ErrorHandler.addErrors(Constants.c.selectDocumentInWorkflow);
            return;
        }
        var opts = {
            wfDocumentIds: ids.wfDocIds,
            callback: function (resetWorkflowPkg, successCleanup, failureCleanup, cleanup) {
                var sf = function (result) {
                    Utility.executeCallback(successCleanup, result);
                    Utility.executeCallback(cleanup);
                    $('body').trigger('MassDocumentUpdated', { ids: ids.documentIds, callback: cleanup });
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    if (failureCleanup) {
                        failureCleanup(jqXHR, textStatus, errorThrown);
                    }
                    Utility.executeCallback(cleanup);
                };
                that.wfProxy.resetWorkflow(resetWorkflowPkg, sf, ff);
            }
        };
        dialogFunc(opts);
    },
    ///<summary>
    /// Sets the assignee for the selected documents in a workflow.
    ///</summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.setAssignee, exception in unit tests where a UI will not be presented.</param>
    setWorkflowAssignee: function (dialogFunc) {
        var that = this;
        var ids = this.getEntityIds({ includeWfDocIds: true, includeDocIds: true });
        var wfDocIds = ids.wfDocIds;
        var docIds = ids.documentIds.slice(0); //copy array.
        var header = {};
        header["ds-options"] = Constants.sro.NotifyVerbosely;
        var options = {
            versionIds: ids.versionIds,
            callback: function (assigneeId, cleanup, failureCleanup, progress) {
                var arraySize = 25;
                var totalReassign = 0;
                var length = wfDocIds.length;
                var count = 1;
                var reassignFunc;
                var success = function (result) {
                    if (totalReassign !== 0) {
                        count += totalReassign;
                    }
                    totalReassign += arraySize;
                    if (totalReassign > length) {
                        totalReassign = length;
                    }
                    if (count > length) {
                        count -= arraySize;
                    }
                    var msg = String.format(Constants.c.reassignWorkFlowXofY, count, totalReassign, length);
                    if (wfDocIds.length === 0) {
                        $('body').trigger('MassDocumentUpdated', { ids: ids.documentIds, callback: cleanup });
                    }
                    else {
                        if (progress) {
                            progress(msg);
                        }
                        reassignFunc();
                    }
                };
                var failure = function (xhr, status, err) {
                    failureCleanup(xhr, status, err);
                };
                reassignFunc = function () {
                    var tempArrWFDocIds = wfDocIds.splice(0, arraySize);
                    var tempArrDocIds = docIds.splice(0, arraySize);

                    var changeAssigneePackage = {
                        WFDocumentIds: tempArrWFDocIds,
                        AssigneeId: assigneeId,
                        DocumentIds: tempArrDocIds
                    };
                    that.wfProxy.changeAssignee(changeAssigneePackage, success, failure, null, null, header);
                };
                reassignFunc();
            }
        };
        dialogFunc(options);
    },
    ///<summary>
    /// Assigns the selected documents to a workflow
    ///</summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.assignWorkflow, exception in unit tests where a UI will not be presented.</param>
    assignWorkflow: function (dialogFunc) {
        var that = this;
        var ids = this.getEntityIds({ includeDocIds: true });
        var options = {
            versionIds: ids.versionIds,
            title: Constants.c.assignWorkflow,
            noAdditionalAction: false,
            callback: function (workflowId, cleanup, failureCleanUp) {
                var success = function (result) {
                    $('body').trigger('MassDocumentUpdated', { ids: ids.documentIds, callback: cleanup });
                };
                var failure = function (xhr, status, err) {
                    if (failureCleanUp) {
                        Utility.executeCallback(failureCleanUp, err);
                    } else {
                        Utility.executeCallback(cleanup, err);
                    }
                };
                var assignWorkflowPkg = { WorkflowId: workflowId, VersionIds: ids.versionIds, ReplaceWorkflow: true };
                var header = {};
                header["ds-options"] = Constants.sro.NotifyVerbosely;
                that.wfProxy.assignWorkflow(assignWorkflowPkg, success, failure, null, null, header);
            }
        };
        dialogFunc(options);
    },
    ///<summary>
    /// Changes the workflow for the selected documents
    ///</summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.assignWorkflow, exception in unit tests where a UI will not be presented.</param>
    changeWorkflows: function (dialogFunc) {
        var that = this;
        var ids = this.getEntityIds({ includeWfDocIds: true, includeDocIds: true });
        var options = {
            versionIds: ids.versionIds,
            title: Constants.c.changeWorkflow,
            noAdditionalAction: true,
            callback: function (workflowId, cleanup, failureCleanUp) {
                var success = function (result) {
                    $('body').trigger('MassDocumentUpdated', { ids: ids.documentIds, callback: cleanup });
                };
                var failure = function (xhr, status, err) {
                    if (failureCleanUp) {
                        Utility.executeCallback(failureCleanUp, err);
                    } else {
                        Utility.executeCallback(cleanup, err);
                    }
                };
                var assignWorkflowPkg = { WorkflowId: workflowId, VersionIds: ids.versionIds, ReplaceWorkflow: true };
                var header = {};
                header["ds-options"] = Constants.sro.NotifyVerbosely;
                that.wfProxy.assignWorkflow(assignWorkflowPkg, success, failure, null, null, header);
            }
        };
        dialogFunc(options);
    },
    ///<summary>
    /// Removes the selected documents from workflow
    ///</summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.removeOrTerminateWorkflow, exception in unit tests where a UI will not be presented.</param>
    removeFromWorkflow: function (dialogFunc) {
        var that = this;
        var ids = this.getEntityIds({ includeWfDocIds: true, includeDocIds: true });
        var length = ids.wfDocIds.length;
        var options = {
            wfDocIds: ids.wfDocIds,
            title: Constants.c.remove,
            successMsg: Constants.c.wfRemoveSuccess,
            operationMsg: String.format(Constants.c.removeFromWfMessage, length),
            callback: function (cleanup) {
                var success = function (result) {
                    var cb = function () {
                        that.fetch();
                        cleanup();
                    };
                    $('body').trigger('MassDocumentUpdated', { ids: ids.documentIds, callback: cb });
                };
                var failure = function (xhr, status, err) {
                    Utility.executeCallback(cleanup, err);
                };
                that.wfProxy.removeDocumentFromWorkflow(ids.wfDocIds, success, failure);
            }
        };
        dialogFunc(options);
    },
    ///<summary>
    /// Changes the workflow for the selected documents
    ///</summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.removeOrTerminateWorkflow, exception in unit tests where a UI will not be presented.</param>
    terminateWorkflow: function (dialogFunc) {
        var that = this;
        var ids = this.getEntityIds({ includeWfDocIds: true, includeDocIds: true });
        var length = ids.wfDocIds.length;
        var options = {
            wfDocIds: ids.wfDocIds,
            title: Constants.c.terminate,
            successMsg: Constants.c.wfTerminateSuccess,
            operationMsg: String.format(Constants.c.terminateWfMessage, length),
            callback: function (cleanup) {
                var success = function (result) {
                    var cb = function () {
                        that.fetch();
                        cleanup();
                    };
                    $('body').trigger('MassDocumentUpdated', { ids: ids.documentIds, callback: cb });
                };
                var failure = function (xhr, status, err) {
                    Utility.executeCallback(cleanup, err);
                };
                that.wfProxy.terminateWorkflow(ids.wfDocIds, success, failure);
            }
        };
        dialogFunc(options);
    },

    ///<summary>
    /// Sets overrides for the default values of this class (Max Rows by the user preference for example)
    ///</summary>
    setDefaultOverrides: function (defaultOverrides) {
        this.defaultOverrides = defaultOverrides;
    },
    ///<summary>
    /// Resets this model with default values, this includes submodel resets.
    ///</summary>
    reset: function (options) {
        this.set(this.defaults, { reset: true });
        if (!$.isEmptyObject(this.defaultOverrides)) {
            this.set(this.defaultOverrides);    // reset possible default overrides - setting them in previous set does NOT work.
        }
        this.trigger('reset', this, options);
    },
    /// <summary>
    /// Ensures the page passed is within the total number of pages found; returns 1 (rather than 0) if there are no rows
    /// </summary>
    boundsCheckPage: function (page) {
        page = parseInt(page, 10);
        if (isNaN(page)) {
            return this.getCurrentPage();
        }
        var maxRows = parseInt(this.getDotted('Request.MaxRows'), 10);
        var total = this.get('Total');
        var totalPages = Math.ceil(total / maxRows);
        if (page > totalPages) {
            page = totalPages;
        }
        if (page < 1) {
            page = 1;
        }
        return page;
    },
    ///<summary>
    /// Returns the current page with a bounds check
    ///</summary>
    getCurrentPage: function () {
        var page = this.get('Page');
        return this.boundsCheckPage(page);
    },
    ///<summary>
    /// Sets the current page with a bounds check
    ///</summary>
    setPage: function (page) {
        page = this.boundsCheckPage(page);
        if (parseInt(this.get('Page'), 10) === page) {
            this.trigger('change:Page', this, page, { ignoreChange: true, resetPageInput: true });
        }
        else {
            this.set('Page', page);
        }
    },
    ///<summary>
    /// Obtain the currently viewed page from the search request
    ///</summary>
    getPageFromRequest: function () {
        var req = this.get('Request');
        var page = Math.floor(req.get('Start') / req.get('MaxRows')) + 1;
        return page;
    },
    ///<summary>
    /// Emails selected documents
    ///</summary>
    /// <param name="dialogFunc">Should always be Send.emailDialog, exception in unit tests where a UI will not be presented.</param>
    email: function (dialogFunc) {
        var ids = this.getEntityIds({ includeDocIds: true });
        Send.email(ids, dialogFunc);
    },
    ///<summary>
    /// Prints selected documents
    ///</summary>
    /// <param name="dialogFunc">Should always be Send.printDialog, exception in unit tests where a UI will not be presented.</param>
    print: function (dialogFunc) {
        var ids = this.getEntityIds();
        Send.print(ids, dialogFunc);
    },
    ///<summary>
    /// Downloads selected documents
    ///</summary>
    ///<param name="dialogFunc">Should always be Send.downloadDialog, exception in unit tests where a UI will not be presented.</param>
    download: function (dialogFunc) {
        var ids = this.getEntityIds({ includeInboxIds: true, includeFolderIds: true });
        Send.download(ids, dialogFunc);
    },
    ///<summary>
    /// Obtain folders including their paths in the folder hierarchy
    ///</summary>
    getFoldersWithPaths: function () {
        var results = this.getResults();
        var folderIds = [];
        var idx = 0;
        var length = results.length;
        for (idx; idx < length; idx++) {
            var res = results.at(idx);
            folderIds = folderIds.concat(res.getDynamicValue(Constants.UtilityConstants.DF_FOLDERID));
        }
        folderIds = _.uniq(folderIds);
        length = folderIds.length;
        for (idx = length - 1; idx >= 0; idx--) {
            if (!folderIds[idx] || folderIds[idx] === Constants.c.emptyGuid) {
                folderIds.splice(idx, 1);
            }
        }
        if (!window.folders) {
            window.folders = new Folders();
        }
        window.folders.getFoldersWithPaths(folderIds);
    }
});