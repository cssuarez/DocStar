var DistributedQueueProcessor = CustomGridItem.extend({
    dateTimeFields: { LastCommunication: true },
    idAttribute: 'Id',
    dqProxy: DistributedQueueProxy({ skipStringifyWcf: true }),
    sync: function (method, model, options) {
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
                options.success(result);
            }
        };
        switch (method) {
            case 'read':
                break;
            case 'create':
                break;
            case 'update':
                this.dqProxy.setProcessor(model, sf, ff, complete);
                break;
            case 'delete':
                break;
        }
    }
});