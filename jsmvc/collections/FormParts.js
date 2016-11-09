var FormParts = Backbone.Collection.extend({
    model: FormPart,
    errorMsg: null,
    ///<summary>
    /// Set the form part that is currently being viewed
    //<param name="partIdx">1 based index into this collection</param>
    ///</summary>
    setCurrent: function (partIdx, options) {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            if (idx !== partIdx - 1) {
                this.at(idx).set('current', false);
            }
        }
        var current = this.at(partIdx - 1);
        current.set('current', true, options);
    },
    ///<summary>
    /// Get the form part that is currently being viewed
    ///</summary>
    getCurrent: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var part = this.at(idx);
            if (part.get('current')) {
                return part;
            }
        }
    }
});