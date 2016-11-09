var Watches = Backbone.Collection.extend({
    model: Watch,
    sync: function (method, collection, options) {
        var ff = function (jqXHR, textStatus, error) {
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
        // Watches are stored in user preferences, get and set them there
        switch (method) {
            case 'update':  // No create method because they are stored in UserPreferences, and should only need to be updated
                Utility.SetSingleUserPreference('workflowWatches', JSON.stringify(this.toJSON()), sf);
                break;
            case 'read':
                var watches = Utility.tryParseJSON(Utility.GetUserPreference('workflowWatches'), true) || [];
                this.reset(watches);
                sf(watches);
                break;
        }
    },
    ///<summary>
    /// Modify watches via CRUD methods
    ///<param name="dialogFunc"> Should always be SearchResultDialogs.changeWatches, unless performing unit tests</param>
    ///</summary>
    changeWatches: function (dialogFunc) {
        var that = this;
        dialogFunc({
            watches: this,
            callback: function (cleanup) {
                that.sync('update', that, {
                    success: function (result) {
                        Utility.executeCallback(cleanup);
                    }
                });
            }
        });
    }
});