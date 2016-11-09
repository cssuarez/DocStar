var DocumentImageContentItemThumbnailsView = Backbone.View.extend({
    model: null, // BulkViewerDataPackageCPX
    pages: [], // array of content item pages
    thumbnailViews: null, // array of DocumentImageThumbnailView
    className: 'DocumentImageContentItemThumbnailsView',
    events: {
    },
    initialize: function (options) {
        this.thumbnailViews = [];
        this.options = options;
        this.pages = this.options.pages;
        this.compiledTemplate = doT.template(Templates.get('documentimagecontentitemthumbnailslayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.displaySeparator = this.options.displaySeparator;
        return ro;
    },
    render: function () {
        this.cleanupSubViews();
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        var idx = 0;
        var thumbView;
        var length = this.pages.length;
        if (length === 0) { // Unrendered (Native?) Content Item
            var psuedoPage = new DocumentPageCPX( { TruePageNumber: this.options.truePageOffset, ContentItemId: this.options.contentItem.get('Id') });
            thumbView = new DocumentImageThumbnailView({ model: psuedoPage, bulkViewerDataPackage: this.model });
            this.thumbnailViews.push(thumbView);
            this.$el.find('.contentItem').append(thumbView.render().$el);
        } else {
            for (idx; idx < length; idx++) {
                var docPkgPage = this.pages[idx];
                thumbView = new DocumentImageThumbnailView({ model: docPkgPage, bulkViewerDataPackage: this.model });
                this.thumbnailViews.push(thumbView);
                this.$el.find('.contentItem').append(thumbView.render().$el);
            }
        }
        return this;
    },
    close: function () {
        this.cleanupSubViews();
        this.unbind();
        this.remove();
    },
    cleanupSubViews: function () {
        var tv = this.thumbnailViews.pop();
        while (tv) {
            tv.close();
            tv = undefined;
            tv = this.thumbnailViews.pop();
        }
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});