var InlayColors = Backbone.Collection.extend({
    model: InlayColor,
    sync: function (method, collection, options) {
        switch (method) {
            case 'read':
                // Add a getter
                break;
        }
    },
    ///<summary>
    /// Obtain the one and only selected InlayColor (if one exists)
    ///</summary>
    getSelected: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var inlayColor = this.at(idx);
            if (inlayColor.isSelected()) {
                return inlayColor;
            }
        }
        return this.at(0);
    },
    ///<summary>
    /// Set the color selection to the one passed in, if a color is not passed in or not found select the first
    ///<param name="color">optional - hex value for a color</param>
    ///</summary>
    setSelection: function (color) {
        if (!color || !this.get(color)) {
            color = this.at(0).get('Color');
        }
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var inlayColor = this.at(idx);
            if (inlayColor.get('Color') === color) {    // Only one color can be selected
                inlayColor.set('isSelected', true);
            }
            else {
                inlayColor.set('isSelected', false);
            }
        }
    }
});