var ContentTypeReplacementView = Backbone.View.extend({
    model: undefined, // Content Type being replaced
    collection: undefined, // ContentTypes
    className: 'ContentTypeReplacementView',
    events: {
    },
    initialize: function (options) {
        this.collection = window.contentTypes;
        this.compiledTemplate = doT.template(Templates.get('contenttypereplacementlayout'));
        this.listenTo(this.collection, 'add remove reset', this.render);
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {
            ctToReplace: this.model.toJSON(),
            cts: this.collection
        };
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.attr('title', Constants.t("selectContentType"));
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});