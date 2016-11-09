var GetViewableVersionsPackageCPX = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    defaults: { Versions: [], Comments: [] },
    docProxy: DocumentServiceProxy({ skipStringifyWcf: true }),
    initialize: function () {
        this.listenTo(this, 'change:selectedId', function (model, value, options) {
            this.get('Versions').setSelected([value], undefined, options);
        });
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.Versions) {
            attr = attrs.Versions;
            if (this.get('Versions') instanceof Backbone.Collection) {
                this.get('Versions').reset(attr, options);
                delete attrs.Versions;
            }
            else {
                attrs.Versions = new DocumentVersions();
                attrs.Versions.set(attr, options);
                this.bindSubModelEvents(attrs.Versions, 'Versions');
            }
        }
        if (attrs.Comments) {
            attr = attrs.Comments;
            if (this.get('Comments') instanceof Backbone.Collection) {
                this.get('Comments').reset(attr, options);
                delete attrs.Comments;
            }
            else {
                attrs.Comments = new VersionComments();
                attrs.Comments.set(attr, options);
                attrs.Comments.verCol = this.get('Versions') || attrs.Versions; //used in sorting.
                this.bindSubModelEvents(attrs.Comments, 'Comments');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    toJSON: function () {
        return this.toJSONComplex();
    },
    sync: function (method, model, options) {
        options.method = method;
        switch (method) {
            case "create":
                break;
            case "read":
                var ff = function (xhr, status, errorThrown) {
                    ErrorHandler.popUpMessage(errorThrown);
                };
                var sf = function (result) {
                    options.success(result);
                };
                var args = { DocumentId: this.get('Id'), IncludeCurrentVersion: !!this.get('IncludeCurrentVersion') };
                this.docProxy.getViewableVersions(args, sf, ff);
                break;
            case "update":
                break;
            case "delete":
                break;
        }
    }
});