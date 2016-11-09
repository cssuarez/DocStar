var DBSyncSetting = Backbone.Model.extend({
    dateTimeFields: { },
    idAttribute: 'InstanceId',
    proxy: ReportingProxy({ skipStringifyWcf: true }),
    initialize: function (options) {
        if (options && !options.InstanceId) {
            options.InstanceId = Constants.c.all;
            this.set({ "InstanceId": options.InstanceId }, { "silent": true });
        }
    },
    validate: function (settings) {
        var errors = {};
        if (settings.Frequency < 5) {
            errors.Frequency = Constants.c.dbSyncMinFreq;
        }
        if (settings.Throttling === null) {
            errors.Throttling = Constants.c.dbSyncThrottlingNull;
        }
        if (settings.Throttling.ChunkSize < 1) {
            errors.ChunkSize = Constants.c.dbSyncMinChunkSize;
        }
        if (settings.Throttling.ChunkDelay < 0) {
            errors.ChunkDelay = Constants.c.dbSyncMinChunkDelay;
        }
        if (!$.isEmptyObject(errors)) {
            return errors;
        }
    },
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
            case 'create':
                break;
            case 'update':
                this.proxy.setSettings(model, sf, ff, complete);
                break;
            case 'delete':
                var instanceId = model.get('InstanceId');
                this.proxy.deleteSettings(instanceId, sf, ff, complete);
                break;
        }
    }
});