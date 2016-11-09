var SearchableEntities = CustomGridItems.extend({
    model: SearchableEntity,
    errorMsg: null,

    /// <summary>
    /// Gets the selected entity ids always returning versionIds, optionally you may includeDocIds, includeInboxIds, includeFolderIds, and includeWfDocIds.
    /// searchableIds are returned as well if includeDocIds, includeInboxIds, includeFolderIds, and/or includeWfDocIds are true and each is added to the searchableIds 
    /// array as well as their respective array.
    /// </summary>
    getEntityIds: function (options) {
        options = options || {};
        var selected = this.getSelected();
        var numSelected = selected.length;
        var i = 0;
        var documentIds = [];
        var inboxIds = [];
        var folderIds = [];
        var versionIds = [];
        var wfDocIds = [];
        var searchableIds = [];
        for (i = 0; i < numSelected; i++) {
            // If the grid item has a doctype value
            var docType = selected[i].get('Type') || 1; // If there is no doctype value, it is a document.
            var entityId = selected[i].get('Id');
            if (docType && entityId) {
                if (options.includeDocIds && docType === 1) {  // documents, only obtain selected documents if the operation is to 'Delete' -  don't need to deny the user from removing selected inboxes/folders if a single document is selected
                    documentIds.push(entityId);
                    searchableIds.push(entityId);
                }
                else if (options.includeInboxIds && docType === 512) {         // inboxes, obtain whether the operation is 'Delete' or 'Remove'
                    inboxIds.push(entityId);
                    searchableIds.push(entityId);
                }
                else if (options.includeFolderIds && docType === 1024) {        // folders, obtain whether the operation is 'Delete' or 'Remove'
                    folderIds.push(entityId);
                    searchableIds.push(entityId);
                }
            }
            if (options.includeWfDocIds) {
                var wfDocIdsArr = selected[i].getDotted('DynamicFields.' + Constants.UtilityConstants.WFDOCID + '.Value');
                if (wfDocIdsArr) {
                    wfDocIds.push(wfDocIdsArr[0]);
                }
            }
            var verId = selected[i].versionId();
            if (verId) {
                versionIds.push(verId);
            }
        }
        return { documentIds: documentIds, versionIds: versionIds, inboxIds: inboxIds, folderIds: folderIds, wfDocIds: wfDocIds, searchableIds: searchableIds };
    },
    /// <summary>
    /// Gets a searchable entity by its version id.
    /// </summary>
    getByVersionId: function (versionId) {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).versionId() === versionId) {
                return this.at(i);
            }
        }
    }
});