var DQEntry = Backbone.Model.extend({
    dateTimeFields: { Created: true, ProcessStarted: true, SortDate: true },
    idAttribute: 'Id',
    getSyncActionMessage: function () {
        var message = Constants.c.syncActionInQueuePending;
        if (this.get('Error')) {
            message = String.format(Constants.c.syncActionInQueuePendingWithError_T, this.get('Error'));
        }
        if (this.get('ProcessStarted')) {
            message = Constants.c.syncActionInQueueProcessing;
        }
        return message;
    }
});