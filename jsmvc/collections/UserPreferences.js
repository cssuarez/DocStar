var UserPreferences = Backbone.Collection.extend({
    model: UserPreference,
    proxy: UserServiceProxy({ skipStringifyWcf: true }),
    sync: function (method, collection, options) {
        var that = this;
        var ff = function (jqXHR, textStatus, error) {
            // reset the collection to what it was before being updated
            var idx = 0;
            var length = that.length;
            for (idx; idx < length; idx++) {
                var model = that.at(idx);
                var prevAttrs = model.previousAttributes();
                if (prevAttrs && !$.isEmptyObject(prevAttrs)) {
                    model.set(prevAttrs);
                }
            }
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.wait = false;
                options.success(result);
            }
        };
        switch (method) {
            case 'read':
                //TODO: get user preferences here, if ever need be - NOTE: currently obtained once on bulk get during initial page load and don't need to fetch again
                break;
            case 'update':
                this.proxy.setUserPreferences(this.getChangedPreferences(options.kvps), sf, ff, complete);
                break;
            case 'delete':
                this.proxy.DeleteAllPreferences(sf, ff, complete);
                break;
        }
    },
    ///<summary>
    /// Obtain a specific user preference value
    ///<param name="key">the key for the user preference</param>
    ///</summary>
    getUserPreferenceValue: function (key) {
        var val;
        var up = this.get(key);
        if (up) {
            val = up.get('Value');
        }
        return val;

    },
    getChangedPreferences: function (kvps) {
        if (!kvps || kvps.length === 0) {
            return this.toJSON();
        }
        var prefs = [];
        var idx = 0;
        var length = kvps.length;
        for (idx; idx < length; idx++) {
            var model = this.get(kvps[idx].Key);
            if (model) {
                prefs.push(model.toJSON());
            }
        }
        return prefs;
    },
    getShowAnnotations: function () {
        var pref = this.getUserPreferenceValue('showAnnotations');
        var showAnnos = pref === undefined ? true : pref;
        return Utility.convertToBool(showAnnos);
    }
});