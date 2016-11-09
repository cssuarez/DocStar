// Used to extend any model that is used within grid selection
var CustomGridItem = Backbone.Model.extend({
    ///<summary>
    /// Sets the selection state and sequence
    ///</summary>
    setSelected: function (isSelected, sequence, options) {
        options = options || {};
        var alwaysTriggerChange = !!options.notify;
        if (!isSelected) {
            this.unset('isSelected', options);
            this.unset('sequence', options);
        } else {
            this.set({ isSelected: true, sequence: sequence }, options);
        }
        if (alwaysTriggerChange) {
            this.trigger('change:isSelected');
        }
    },
    ///<summary>
    /// Simple test to see if the current model is selected or not.
    ///</summary>
    isSelected: function () {
        return !!this.get('isSelected');
    }
});