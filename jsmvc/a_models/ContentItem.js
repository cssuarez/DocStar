var ContentItem = Backbone.Model.extend({
    dateTimeFields: { CreatedOn: true, ModifiedOn: true, AccessedOn: true },
    defaults: { ImageState: Constants.igf.Pending, PageOrder: 999999 }, //Default of Pending and last Page (resequenced server side).
    idAttribute: 'Id',
    sync: function (method, model, options) {
        //Sync must exist even though it does nothing, otherwise backbone will attempt to save on destroy and other calls.
        switch (method) {
            case "create":
                break;
            case "read":
                break;
            case "update":
                break;
            case "delete":
                break;
        }
    },
    isRendered: function () {
        var state = this.get('ImageState');
        return state === Constants.igf.Imaged || state === Constants.igf.PendingRerender;
    },
    iIsPending: function () {
        var state = this.get('ImageState');
        return state === Constants.igf.Pending || state === Constants.igf.PendingRerender;
    }
});