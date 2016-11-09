// Collection for Roles model 
// 2011-08-29
// defines the model to use, and the URL of the API method to fill the collection with said models
// Overrides Backbone fetch, to obtain 
var Roles = Backbone.Collection.extend({
    proxy: SecurityServiceProxy({ skipStringifyWcf: true }),
    model: Role,
    comparator: Backbone.Collection.prototype.defaultComparator,
    errorMsg: null,
    initialize: function () {
        this.listenTo(this, 'add remove reset change', function () {
            Utility.BustCachedItem('userRoleDictionaryData');
        });
    },
    sync: function (method, collection, options) {
        var that = this;
        var ff = function (jqXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            } else {
                ErrorHandler.popUpMessage(error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (results) {
            if (options && options.success) {
                options.success(results);
            }
        };
        switch (method) {
            case 'read':
                this.proxy.getAllRoles(sf, ff, complete);
                break;
        }
    }
});