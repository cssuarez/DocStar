// Collection for CustomList model
// defines the model to use, and the URL of the API method to fill the collection with said models
var CustomLists = Backbone.Collection.extend({
    model: CustomList,
    errorMsg: null,
    url: Constants.Url_Base + "CustomList/GetAllCustomLists",
    comparator: Backbone.Collection.prototype.defaultComparator,

    ///<summary>
    /// Obtain a list by name from a collection of lists
    ///<param name="name">The name of the list to be obtained</param>
    ///</summary>
    getCustomListByName: function (name) {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var list = this.at(idx);
            if (list.get('Name') === name) {
                return list;
            }
        }
        return undefined;
    },
    ///<summary>
    /// Obtain a listCollection by read only true or false from a collection of lists
    ///<param name="isReadOnly">The read only status true or false to be obtained</param>
    ///</summary>
    getCustomListsCollectionByReadOnly: function (isReadOnly) {
        var listCollection = new CustomLists();
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var list = this.at(idx);
            if (list.get('ReadOnly') === isReadOnly) {
                listCollection.add(list);
            }
        }
        return listCollection;
    }
});