var DQEntries = Backbone.Collection.extend({
    model: DQEntry,
    comparator: Backbone.Collection.prototype.defaultComparator,
    getSyncActionEntry: function () {
        var length = this.length;
        var i = 0;
        for (i; i < length; i++) {
            var dqe = this.at(i);
            if (dqe.get('DistributedTaskFlag') === Constants.dtfs.SyncAction) {
                return dqe;
            }
        }
    },
    getImagingEntry: function () {
        var length = this.length;
        var i = 0;
        for (i; i < length; i++) {
            var dqe = this.at(i);
            if (dqe.get('DistributedTaskFlag') === Constants.dtfs.Imaging) {
                return dqe;
            }
        }
    }
});