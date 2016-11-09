var Audits = CustomGridItems.extend({
    model: Audit,

    /// <summary>
    /// Returns JSON objects representing each audit model with translated values (ActionType, EntityType, and UserName)
    /// </summary>
    getDisplayValues: function () {
        var dispValues = [];
        var rActTypes = Utility.reverseMapObject(Constants.at);
        var rEntTypes = Utility.reverseMapObject(Constants.et);
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            var audit = this.at(i);
            dispValues.push(this.at(i).getDisplayValues(rActTypes, rEntTypes));
        }
        return dispValues;
    }
});