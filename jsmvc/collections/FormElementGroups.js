var FormElementGroups = Backbone.Collection.extend({
    model: FormElementGroup,
    errorMsg: null,
    ///<summary>
    /// Clear all selected groups, except for the passed in model
    ///</summary>
    clearSelected: function (selectedModelId) {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var model = this.at(idx);
            var modelId = model.get('Id');
            if (modelId !== selectedModelId && model.isSelected()) {
                model.set('selected', false);
            }
        }
    }
});