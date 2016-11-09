var DistributedQueueCC = Backbone.Collection.extend({
    model: DistributedQueue,
    dqProxy: DistributedQueueProxy(),

    parse: function (response) {
        window.dqSearchResult = response.QueueItems;
        window.distributedQueues.reset(window.distributedQueues.parse(response.QueueItems.Results), { silent: true });
        window.companies.reset(window.companies.parse(response.Companies), { silent: true });
        window.dqProcessors.reset(window.dqProcessors.parse(response.Processors));
        return [];
    },
    fetch: function (options) {
        var that = this;
        var sf = function (r) {
            that.parse(r);
            if (options.success) {
                options.success();
            }
        };
        var ff = function (qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        var args = { Start: 0, MaxRows: 20 };
        args.InstanceId = $('#companySelect option:selected').val();
        this.dqProxy.getAllData(args, sf, ff);
    }
});