var FileSystemEntry = CustomGridItem.extend({
    dateTimeFields: { Created: true, Modified: true },
    idAttribute: 'Name',
    sync: function () {

    },
    ///<summary>
    /// Returns the file size in bytes, value stored in the model is in MB
    ///</summary>
    getSizeInBytes: function () {
        var size = this.get('Length');
        size = parseFloat(size);
        if (isNaN(size)) {
            return 0;
        }
        return size * 1048576;
    }
});