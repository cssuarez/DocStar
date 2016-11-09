var UserPreference = Backbone.Model.extend({
    idAttribute: 'Key', 
    sync: function (method, model, options) {
        options = options || {};
        options.syncMethod = method;
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
    }
});