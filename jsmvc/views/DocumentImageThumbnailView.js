var DocumentImageThumbnailView = Backbone.View.extend({
    model: null, // DocumentPageCPX 
    bulkViewerDataPackage: null, // BulkViewerDataPackageCPX
    className: 'DocumentImageThumbnailView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.bulkViewerDataPackage = this.options.bulkViewerDataPackage;
        this.pageId = this.options.pageId;
        this.isInView = this.options.isInView;
        this.compiledTemplate = doT.template(Templates.get('documentimagethumbnaillayout'));
        this.listenTo(this.bulkViewerDataPackage, 'change:currentPage', function (model, value, options) {
            var selectedThumbClass = 'selected_thumbnail';
            this.bulkViewerDataPackage.getDotted('DocumentPackage.Pages').clearSelected(value);
            if (this.model.get('TruePageNumber') === value) {
                this.$el.find('img').addClass(selectedThumbClass);
            }
            else {
                this.$el.find('.' + selectedThumbClass).removeClass(selectedThumbClass);
            }
        });
        this.listenTo(this.model, 'change:selected', function (model, value, options) {
            var selectedThumbClass = 'selected_thumbnail';
            if (value) {
                this.$el.find('img').addClass(selectedThumbClass);
            }
            else {
                this.$el.find('.' + selectedThumbClass).removeClass(selectedThumbClass);
            }
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var thumbPref = Utility.GetUserPreference('thumbnails');
        var ro = this.model.toJSON();
        ro.displayThumbnails = thumbPref && (thumbPref === 'thumbnailright' || thumbPref === 'thumbnailleft');
        ro.thumbnailSource = Constants.Url_Base + 'Content/themes/default/throbber.gif';
        ro.throbber = 'throbber';
        // source is set later in DocumentImageThumbnailsView.showDocumentThumbnails
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    }
    //#region Event Handling
    //#endregion Event Handling
});