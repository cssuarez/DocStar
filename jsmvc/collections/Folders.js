var Folders = Backbone.Collection.extend({
    model: Folder,
    proxy: FolderServiceProxy(),
    comparator: Backbone.Collection.prototype.defaultComparator,
    initialize: function () {
        this.proxy.setCacheDuration(10000);
    },
    getFoldersWithPaths: function (folderIds) {
        var that = this;
        var sf = function (result) {
            that.set(result, { remove: false });
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        this.proxy.getFolders({ IncludePaths: true, FolderIds: folderIds }, sf, ff);
    }
});