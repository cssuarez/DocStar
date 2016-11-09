var Document = Backbone.Model.extend({
    dateTimeFields: { CreatedOn: true, ModifiedOn: true, AccessedOn: true, CutoffDate: true, DispositionDate: true },
    idAttribute: 'Id',
    validate: function (attrs) {
        // This function executes when you call model.save()
        var msg = {};

        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    hasRights: function (sp) {
        var ep = this.get('EffectivePermissions');
        if (ep) {
            return Utility.hasFlag(ep, sp);
        }
        return false;
    }
});