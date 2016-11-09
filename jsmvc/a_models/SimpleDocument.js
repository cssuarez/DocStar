var SimpleDocument = CustomGridItem.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    sync: function () {

    },
    ///<summary>
    /// Validate the simple document
    ///</summary
    validate: function (attrs) {
        var err = {};
        if (!this.get('ContentTypeId')) {
            err.ContentTypeId = Constants.t('noContentTypeSelectedImport') + ' ' + this.get('Title');
        }
        if ($.isEmptyObject(err) === false) {
            return err;
        }
    },
    ///<summary>
    /// Stores a clone of the current attributes in an object that may be used to revert changes.
    ///</summary>
    storeOriginalValues: function () {
        var dtf = this.dateTimeFields;
        this.originalValues = JSON.parse(JSON.stringify(this.toJSON())); //Need to break the by ref bindings.
        this.dateTimeFields = dtf;
    },
    /// <summary>
    /// Reverts this object back to its original values (if it has any). Store original values should be called before any change is allowed.
    /// </summary>
    revertChanges: function () {
        if (this.originalValues) {
            this.originalValues.selected = this.get('selected'); //revert all but the isSelected property.
            var currentValues = JSON.parse(JSON.stringify(this.toJSON()));//Need to break the by ref bindings.
            // Ensure that undefined properties in the original values are unset (ie removed from the model entirely), rather than set to 'undefined'
            var key;
            for (key in currentValues) {
                if (currentValues.hasOwnProperty(key) && this.originalValues[key] === undefined) {
                    this.unset(key, { silent: true });
                }
            }
            this.set(this.originalValues);
            if (!this.originalValues.ContentTypeId) {
                this.unset('ContentTypeId', { silent: true });  // Don't trigger change, otherwise it will be reset to the first ContentTypeId available
            }
        }
    },
    ///<summary>
    /// Returns a value based on a column preference name.
    ///</summary>
    getValuesByPreference: function (columnName, displayName) {
        switch (columnName) {
            case 'titleName':
                return [this.get('Title') || ''];
            case 'keywords':
                return [this.get('Keywords') || ''];
            case 'contentType':
                var ctId = this.get('ContentTypeId');
                if (displayName) {
                    if (ctId) {
                        var ct = window.contentTypes.get(ctId);
                        return [ct ? ct.get('Name') : ''];
                    }
                } else {
                    return [ctId || ''];
                }
                return [''];
            case 'securityClass':
                var scId = this.get('SecurityClassId');
                if (displayName) {
                    if (scId) {
                        var sc = window.slimSecurityClasses.get(scId);
                        return [sc ? sc.get('Name') : ''];
                    }
                } else {
                    return [scId || ''];
                }
                return [''];
            case 'workflow':
                var wfId = this.get('WorkflowId');
                if (displayName) {
                    if (wfId) {
                        var wf = window.slimWorkflows.get(wfId);
                        return [wf ? wf.get('Name') : ''];
                    }
                } else {
                    return [wfId || ''];
                }
                return [''];
            case 'inbox':
                var ibId = this.get('InboxId');
                if (displayName) {
                    if (ibId) {
                        var ib = window.slimInboxes.get(ibId);
                        return [ib ? ib.get('Name') : ''];
                    }
                } else {
                    return [ibId || ''];
                }
                return [''];
            case 'folder':
                return [this.get('FolderName') || ''];
            case 'fileSizeMB':
                return [this.get('FileSize') || 0.0];
            case 'createAsDraft':
                return [this.get('IsDraft') || false];
        }
        return [''];
    },
    ///<summary>
    /// Sets values by a column name
    ///</summary>
    setValueByColumnName: function (columnName, values) {
        switch (columnName) {
            case 'titleName':
                this.set('Title', values[0]);
                break;
            case 'keywords':
                this.set('Keywords', values[0]);
                break;
            case 'contentType':
                this.set('ContentTypeId', values[0]);
                break;
            case 'securityClass':
                this.set('SecurityClassId', values[0]);
                break;
            case 'workflow':
                this.set('WorkflowId', values[0]);
                break;
            case 'inbox':
                this.set('InboxId', values[0]);
                break;
            case 'folder':
                this.set('FolderId', values[0].Id);
                this.set('FolderName', values[0].Name);
                break;
            case 'createAsDraft':
                this.set('IsDraft', values[0]);
                break;
        }
    },
    ///<summary>
    /// Caches a preview page result into the page rotation array.
    ///</summary>
    cachePreview: function (previewPageResult, pageNum, fullSizePreview) {
        var prots = this.get('PageRotations');
        if (prots) {
            var i = 0;
            var length = prots.length;
            for (i; i < length; i++) {
                var prot = prots[i];
                if (prot.TruePageNumber === pageNum) {
                    prot.previewPageResult = previewPageResult;
                    prot.previewPageResult.isFullSize = fullSizePreview;
                }
            }
        }
    },
    ///<summary>
    /// Returns the preview file name from cache for the current page.
    ///</summary>
    getPreviewFileFromCache: function (fullSizePreview) {
        var prots = this.get('PageRotations');
        var pageNum = this.getCurrentPage();
        if (prots) {
            var i = 0;
            var length = prots.length;
            for (i; i < length; i++) {
                var prot = prots[i];
                if (prot && prot.TruePageNumber === pageNum && prot.previewPageResult) {
                    return prot.previewPageResult.PreviewFileName;
                }
            }
        }
    },
    ///<summary>
    /// Returns the 1 based current page. If no value is found 1 is assumed.
    ///</summary>
    getCurrentPage: function () {
        var pageNum = this.get('currentPage');
        if (!pageNum) {
            pageNum = 1;
        }
        return parseInt(pageNum, 10);
    },
    ///<summary>
    /// Returns the rotation value of the current page.
    /// Returns 0 if no rotation is found, if no current page is set then page 1 is assumed.
    ///</summary>
    getCurrentPageRotation: function () {
        var pageNum = this.getCurrentPage();
        var prots = this.get('PageRotations');
        if (prots) {
            var i = 0;
            var length = prots.length;
            for (i; i < length; i++) {
                var prot = prots[i];
                if (prot.TruePageNumber === pageNum) {
                    return prot.Rotation || 0;
                }
            }
        }
        return 0;
    },
    ///<summary>
    /// Applies a rotation value to the current page, if rotate all is true all page rotations will be set to the current pages value.
    ///</summary>
    setRotation: function (rotation, rotateAll) {
        rotation = parseInt(rotation, 10);
        var pageNum = this.getCurrentPage();
        var curPageRotation = 0;
        var prots = this.get('PageRotations');
        if (prots) {
            var prot;
            var i = 0;
            var length = prots.length;
            for (i; i < length; i++) {
                prot = prots[i];
                if (prot.TruePageNumber === pageNum) {
                    curPageRotation = prot.Rotation + rotation;
                    //Ensure a positive number between 0 and 360;
                    curPageRotation = 360 + curPageRotation;
                    curPageRotation %= 360;
                    prot.Rotation = curPageRotation;
                    break;
                }
            }

            if (rotateAll) {
                i = 0;
                for (i; i < length; i++) {
                    prot = prots[i];
                    prot.Rotation = curPageRotation;
                }
            }
        }
    }
});