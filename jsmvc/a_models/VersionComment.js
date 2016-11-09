var VersionComment = Backbone.Model.extend({
    dateTimeFields: { CommentDate: true },
    idAttribute: 'Id',
    sync: function (method, model, options) {
        var that = this;
        options.method = method;
        var sf = function (result) {
            if (method === 'delete' && result) { //Delete and replace
                var col = that.collection;
                col.add(result);
                result = undefined;
            }
            options.success(result);            
        };
        var ff = function (xhr, status, err) {
            ErrorHandler.popUpMessage(err);
        };
        switch (method) {
            case "create":
                var proxy = DocumentServiceProxy({ skipStringifyWcf: true });
                proxy.addVersionComment(this.toJSON(), sf, ff);
                break;
            case "read":
                break;
            case "update":
                break;
            case "delete":
                options.dialogFunc({
                    callback: function (replacement, cleanup) {
                        var proxy = DocumentServiceProxy({ skipStringifyWcf: true });
                        var args = {
                            CommentId: that.get('Id')
                        };
                        if (replacement) {
                            args.ReplacementComment = {
                                DocumentVersionId: that.get('DocumentVersionId'),
                                Comment: replacement
                            };
                        }
                        var dsf = function (result) {
                            Utility.executeCallback(cleanup);
                            sf(result);
                        };
                        proxy.deleteVersionComment(args, dsf, ff);
                    }
                });
                break;
        }
    }
});