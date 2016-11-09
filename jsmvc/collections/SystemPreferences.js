var SystemPreferences = Backbone.Collection.extend({
    model: SystemPreference,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    url: Constants.Url_Base + "Preferences/GetSystemPreferences",
    /// <summary>
    /// Gets a system preference value by its name. Case Insensitive
    /// </summary>
    getValueByName: function (preferenceName) {
        var m = this.getByName(preferenceName);
        if (m) {
            return m.get('Value');
        }
    },
    /// <summary>
    /// Gets a system preference by its name. Case Insensitive
    /// </summary>
    getByName: function (preferenceName) {
        var i = 0;
        var length = this.length;
        var settingName = preferenceName.toLowerCase();
        for (i; i < length; i++) {
            if (this.at(i).get('Name').toLowerCase() === settingName) {
                return this.at(i);
            }
        }
    }
});
