/// Model for MessageEclipse.cs
var Message = Backbone.Model.extend({
    docProxy: DocumentServiceProxy({ skipStringifyWcf: true }),
    dateTimeFields: { CreatedDate: true },
    idAttribute: 'Id',
    sync: function (method, model, options) {
        var sf = function (result) {
            options.success();
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.addError(errorThrown.Message);
        };
        switch (method) {
            case "create":
                break;
            case "read":
                break;
            case "update":
                break;
            case "delete":
                this.docProxy.deleteMessage({ DocumentId: options.DocumentId, MessageId: this.get('Id') }, sf, ff);
                break;
        }
    }
});