var Messages = Backbone.Collection.extend({
    model: Message,
    getSyncExceptionMessage: function () {
        var length = this.length;
        var i = 0;
        for (i; i < length; i++) {
            var m = this.at(i);
            if (m.get('Type') === Constants.emt.SyncActionException) {
                return {
                    CreatedDate: m.get('CreatedDate'),
                    Message: m.get('Message')
                };
            }
        }
    }
});