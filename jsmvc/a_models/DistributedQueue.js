var DistributedQueue = CustomGridItem.extend({
    dateTimeFields: { Created: true, ProcessStarted: true, SortDate: true },
    idAttribute: 'Id',
    proxy: DistributedQueueProxy(),
    constructor: function () {
        if (!window.distributedQueuesTaskFlagRevMapObj) {
            window.distributedQueuesTaskFlagRevMapObj = Utility.reverseMapObject(Constants.dtfs);
        }
        Backbone.Model.apply(this, arguments);
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.DistributedTaskFlag) {
            attrs.ComponentName = window.distributedQueuesTaskFlagRevMapObj[attrs.DistributedTaskFlag];
        }

        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error);
            }
        };
        var cf = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        switch (method) {
            case 'create':
                // Add a create call
                break;
            case 'update':
                // Add an update call
                break;
            case 'delete':
                var deleteSuccess = function () {
                };
                this.proxy.deleteDQ(this.get('Id'), sf, ff, cf);
                break;
        }
    }
});