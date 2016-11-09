var License = CustomGridItem.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    hasSubgridData: function () {
        var ub = this.get('UsedBy');
        return ub && ub.length > 0;
    },
    getTotal: function () {
        var licType = this.get('Type');
        if (licType === Constants.tt.Bool) { // If it is a boolean don't display available / used
            return '';
        }
        if (licType === Constants.tt.UnlimitedConcurrent) { //Unlimited Concurrent does not have a total, it is unlimited.
            return '';
        }
        return this.get('QuantityTotal') || '';
    },
    getUsed: function () {
        var licType = this.get('Type');
        if (licType === Constants.tt.Bool) { // If it is a boolean don't display available / used
            return '';
        }
        return this.get('QuantityUsed') || '';
    }
});