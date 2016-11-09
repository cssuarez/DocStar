var DynamicFields = Backbone.Collection.extend({
    model: DynamicField,
    /// <summary>
    /// Returns a copy of the value (array) of a dynamic field looked up by the key provided
    /// The lookup function is intended to translate Ids or enum ints into human readable values. (See SearchableEntityCPX getDynamicValue for an example)
    /// </summary>
    getValue: function (dfKey, lookupFunc) {
        var val = this.getDotted(dfKey + '.Value');
        if (val) {
            val = val.slice(0);
            if (lookupFunc) {
                var i = 0;
                var length = val.length;
                for (i; i < length; i++) {
                    val[i] = lookupFunc(val[i]);
                }
            }
        }
        return val;
    }
});