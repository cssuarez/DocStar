var FileSystemEntries = CustomGridItems.extend({
    model: FileSystemEntry,
    ///<summary>
    /// Returns all selected documents that will be imported in the format filesize:::fullpath as is expected by the client.
    ///</summary>
    getSelectedFilesForImport: function (currentPath) {
        if (!currentPath) {
            currentPath = "";
        } else if (!currentPath.endsWith("\\")) {
            currentPath += "\\";
        }

        var selected = [];
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).isSelected()) {
                selected.push(this.at(i).getSizeInBytes() + ':::' + this.at(i).get('FullPath'));
            }
        }
        return selected;
    }
});