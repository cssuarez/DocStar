var FormFormulaElements = Backbone.Collection.extend({
    model: FormFormulaElement,
    ///<summary>
    /// Obtain Formula Elements by a form element id
    ///<param name="elementId">Id of a Form Element</param>
    ///</summary>
    getByElementId: function (elementId) {
        var result = [];
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var m = this.at(idx);
            if (m.get('FormElementId') === elementId) {
                result.push(m);
            }
        }
        return result;
    },
    ///<summary>
    /// Obtain Formula Elements by a form element id that is the TargetId
    ///<param name="targetId">Id of a Form Element</param>
    ///</summary>
    getByTargetId: function (targetId) {
        var result = [];
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var m = this.at(idx);
            if (m.get('TargetId') === targetId) {
                result.push(m);
            }
        }
        return result;
    }
});