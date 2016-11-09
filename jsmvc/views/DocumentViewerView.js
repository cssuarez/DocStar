var DocumentViewerView = Backbone.View.extend({
    model: null, // BulkViewerDataPackageCPX
    className: 'DocumentViewerView',
    currentViewer: undefined,
    desiredViewerType: undefined,
    events: {
    },
    initialize: function (options) {
        //This view will not require a template. It will simply manage switching from one viewer to another (Image, Native, and Form)
        this.desiredViewerChanged();
        var that = this;
        $('body').on('desiredViewerChanged', function (ev) { that.desiredViewerChanged(ev); });
        this.listenTo(this.model, 'change:inFormEdit', that.inFormEditChanged);

        this.listenTo(this.model, 'change:imageZIndex', function (model, value, options) {
            var isImgViewer = this.currentViewer.viewerType === Constants.vt.Image;
            value = value || 'auto';
            // displayImageOverModalOverlay - value is a z-index other than 'auto'
            // displayImageUnderModalOverlay - value is a z-index of 'auto'
            if (value) {
                var $viewerImg = this.$el.find('.viewer_image');
                var $viewerNav = this.$el.find('.viewer_navigation');
                var $viewerItems = $viewerImg.add($viewerNav).add($viewerNav.children());
                $viewerItems.css('z-index', value);
            }
        });
        return this;
    },
    render: function () {
        //NOTE: Look here as an example of not having to redelegate events. If you don't have to use .html(...) then don't.
        if (this.model.get('DocumentPackage')) {
            var viewerType = this.desiredViewerType;
            var canEditForm = this.model.canI(Constants.sp.Modify) && this.model.canI(Constants.sp.Modify_Content);
            if (canEditForm && this.model.get('inFormEdit') && this.model.hasFormPart() && !this.model.isFormComplete()) { //Allow document paging with form viewer open, if one document is not a form in the collection it will simply use the desired viewer.
                viewerType = Constants.vt.FormEdit;
            }
            if (this.loadViewerType(viewerType)) {
                this.$el.html(this.currentViewer.render().$el);
            } else {
                this.currentViewer.render();
            }
        } else {
            this.$el.html('');
        }
        return this;
    },
    close: function () {
        // reset inAnnotationEdit, because we aren't looking to be in annotation edit mode, when we exit the viewer
        this.model.set('inAnnotationEdit', false);
        if (this.currentViewer) {
            this.currentViewer.close();
            this.currentViewer = undefined;
        }
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    loadViewerType: function (viewerType) {
        if (!this.currentViewer || this.currentViewer.viewerType !== viewerType) {
            if (this.currentViewer) {
                this.currentViewer.close();
                this.currentViewer = null;
            }
            switch (viewerType) {
                case Constants.vt.Native:
                    this.currentViewer = new DocumentNativeView({ model: this.model });
                    break;
                case Constants.vt.Image:
                    this.currentViewer = new DocumentImageView({ model: this.model });
                    break;
                case Constants.vt.FormEdit:
                    this.currentViewer = new DocumentFormView({ model: this.model });
                    break;
            }
            return true; //return true if the viewer type changed.
        }
        return false;
    },
    desiredViewerChanged: function (ev) {
        if ($.cookie('useNative')) {
            this.desiredViewerType = Constants.vt.Native;
        } else {
            this.desiredViewerType = Constants.vt.Image;
        }
        if (ev) {           //Only render if this is coming from an event (as opposed to the init function).
            this.render();
        }
    },
    inFormEditChanged: function () {
        this.render();
    }
});