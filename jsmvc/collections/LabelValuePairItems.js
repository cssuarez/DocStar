var LabelValuePairItems = Backbone.Collection.extend({
    model: LabelValuePairItem,
    ///<summary>
    /// Set IsSelected for every LabelValuePairItem to false
    ///</summary>
    clearSelected: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            this.at(idx).set('IsSelected', false);
        }
    },
    ///<summary>
    /// Set IsSelected for each LabelValuePairItem according to the parameter selectedLabels
    ///<param name="selectedLabels">The LabelValuePairItem's that should be selected (others are unselected)
    /// if not provided all items will be unselected, same as calling clearSelected
    ///</summary>
    setSelected: function (selectedLabels, options) {
        selectedLabels = selectedLabels || [];
        if (selectedLabels.length === 0) {
            this.clearSelected();
            return;
        }
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var selIdx = 0;
            var selLen = selectedLabels.length;
            var lvp = this.at(idx);
            for (selIdx; selIdx < selLen; selIdx++) {
                var isSelected = false;
                // Don't set selected for a label value pair item that is a checkbox - checkboxes cannot be selected by default
                if (lvp.get('type') !== 'checkbox') {
                    if (lvp.get('Label') === selectedLabels[selIdx]) {
                        isSelected = true;
                    }
                    else {
                        isSelected = false;
                    }
                }
                lvp.set('IsSelected', isSelected, options);
            }
        }
    }
});