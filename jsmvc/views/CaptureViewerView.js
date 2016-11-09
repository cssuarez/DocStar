/// <reference path="../../Content/LibsInternal/ClientService.js" />
// For use with previewing documents in the Capture Tab
var CaptureViewerView = Backbone.View.extend({
    className: 'CaptureViewerView',
    collection: undefined, //SimpleDocuments,
    model: undefined, //SimpleDocument
    pzr: undefined,
    transparentUrl: Constants.Url_Base + 'Content/images/transparent.png',
    ctMenu: undefined,
    ctxAlias: 'CaptureViewerView_image_full_',
    events: {
        'keyup input[name="viewer_results_counter"]': 'goToSpecificPage',
        'click span[name="viewer_navigation_start"]': 'goToStartPage',
        'click span[name="viewer_navigation_end"]': 'goToEndPage',
        'click span[name="viewer_navigation_next"]': 'goToNextPage',
        'click span[name="viewer_navigation_prev"]': 'goToPrevPage',
        'click #rotateCapturePreview span': 'rotate',
        'click #splitCapturePreview span': 'split'
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('captureviewerlayout'));
        this.listenTo(this.collection, 'remove', this.collectionRemove);
        this.listenTo(this.collection, 'reset', this.collectionReset);
        this.listenTo(this.collection, 'change', this.collectionChanged);
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        if (this.$el.hasClass('hideNative')) {
            this.$el.removeClass('hideNative');
        }
        var $viewPortCont = this.$el.find('.viewer_image');
        this.pzr = new PanZoomRotate($viewPortCont, this.model);
        this.applyPZREventHandles();
        if (ro.imageSource === this.transparentUrl && this.model) {
            this.currentPageChanged(this.model, {});
        }
        return this;
    },
    getRenderObject: function () {
        var ro = {
            page: 1,
            ofPages: '',
            viewerNavClass: '',
            rotateClass: '',
            splitClass: '',
            splitDeleteClass: '',
            imageSource: this.transparentUrl,
            isCollapsed: Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed'))
        };
        if (!this.model || this.model.get('iframeId')) {
            ro.viewerNavClass = 'displayNone';
            ro.rotateClass = 'displayNone';
            ro.splitClass = 'displayNone';
            ro.splitDeleteClass = 'displayNone';
            if (this.model && this.model.get('iframeId')) {
                ro.imageSource = Constants.Server_Url + '/GetFile.ashx?functionName=GetSignalRPreview&previewFileName=' + Constants.UtilityConstants.HTMLFILEPREVIEW;
                ro.hasSelection = this.collection.getLastSelected();
            }
        } else {
            ro.page = this.model.getCurrentPage();
            ro.ofPages = Constants.c.of + ' ' + this.model.get('Pages');
            var totPages = this.model.get('Pages');
            if (!this.model.get('PageRotations')) {
                ro.rotateClass = 'displayNone';
            }
            // If the currently previewed document has more than 1 page and the current page is not the first page, then it can be split
            if (totPages > 0 && ro.page !== 1) {
                ro.splitClass = '';
            }
            else {
                ro.splitClass = 'displayNone';
            }
            // If the currently previewed document's last page is being viewed, the document can't have the operation 'Split and Delete' performed
            if (totPages === ro.page) {
                ro.splitDeleteClass = 'displayNone';
            }
            ro.hasSelection = this.collection.getLastSelected();
        }
        return ro;
    },
    close: function () {
        if (this.ctMenu) {
            ContextMenu.destroy(this.ctMenu);
            this.ctMenu = null;
        }
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    stopListeningToPriorModel: function () {
        if (this.model) {
            this.stopListening(this.model);
            this.model = undefined;
        }
    },
    collectionRemove: function (model, collection, options) {
        if (model === this.model) {
            this.stopListeningToPriorModel();
            this.render();
        }
    },
    collectionReset: function (collection, options) {
        this.stopListeningToPriorModel();
    },
    collectionChanged: function (model, options) {
        options = options || {};
        var previewModel = this.collection.getLastSelected();
        if (!options.ignoreSelection && previewModel !== this.model) {
            this.stopListeningToPriorModel();
            this.model = previewModel;
            if (this.model) {
                this.listenTo(this.model, 'change:currentPage', this.currentPageChanged);
            }
            this.render();
        }
    },
    currentPageChanged: function (model, options) {
        var fullSizePreview = Utility.GetUserPreference('capturePreviewMode') === 'thumbnailPreview' ? false : true;
        var previewFileName = this.model.getPreviewFileFromCache(fullSizePreview);
        if (previewFileName) {
            this.displayImage(previewFileName);
        } else {
            this.getPreviewPage();
        }
        var currentPage = this.model.getCurrentPage();
        var totPages = this.model.get('Pages');
        var $split = this.$el.find('#splitCapturePreviewSeparator, #splitCapturePreview');
        var $splitDel = this.$el.find('.splitDelete');
        // If the currently previewed document has more than 1 page and the current page is not the first page, then it can be split
        if (totPages > 0 && currentPage !== 1) {
            $split.removeClass('displayNone');
        }
        else {
            $split.addClass('displayNone');
        }
        // If the currently previewed document's last page is being viewed, the document can't have the operation 'Split and Delete' performed
        if (totPages === currentPage) {
            $splitDel.addClass('displayNone');
        } else {
            $splitDel.removeClass('displayNone');
        }
    },

    //#region Rotating
    rotate: function (ev) {
        var t = ev.currentTarget;
        var rotation = 0;
        var currentRotation = 0;
        var rotateAll = false;
        var pageNum = this.model.getCurrentPage();
        if ($(t).hasClass('rotateAllRight_icon')) {
            rotateAll = true;
            rotation = 90;
        }
        else if ($(t).hasClass('rotateRight_icon')) {
            rotation = 90;
        }
        else if ($(t).hasClass('rotateLeft_icon')) {
            rotation = -90;
        }
        else if ($(t).hasClass('rotateAllLeft_icon')) {
            rotateAll = true;
            rotation = -90;
        }

        this.model.setRotation(rotation, rotateAll);
        this.pzr.fitDefault();
    },
    //#endregion Rotating

    //#region Splitting 
    split: function (ev) {
        var $targ = $(ev.currentTarget);
        if ($targ.parent().hasClass('disabled')) {
            return; // parent(), so that both split functions are disabled
        }
        ClientService.previewMode = Utility.GetUserPreference('capturePreviewMode') === 'fullSizePreview';
        var pageNum = 1; // after the split, reset view to page 1
        var splitPackage = {
            SimpleDocument: this.model.toJSON(),
            PageNumber: this.model.getCurrentPage()
        };
        if ($targ.hasClass('split')) {
            // Split the document at the current page
            splitPackage.DeletePage = false;
        }
        else if ($targ.hasClass('splitDelete')) {
            // Split at and delete the current page
            splitPackage.DeletePage = true;
        }
        else {
            return;
        }
        var args = [
            JSON.stringify(splitPackage)
        ];
        var that = this;
        var success = function (result) {
            // Will always return an array of two Simple Documents (first item is original document transformed, second item is new document that was split)
            $targ.parent().removeClass("disabled");

            // Reset original document. (Preview might currently be displaying a page from another document)
            that.model.set(result[0]);
            that.model.PageRotations = result[0].PageRotations;
            //reset to page 1 without firing events as we will change selection later on and that will fire them.
            that.model.set({ currentPage: 1 }, { silent: true });
            ClientService.previewSimpleDocId = that.model.get('Id');

            that.collection.add(result[1]);
            var sids = that.collection.getSelectedIds();
            sids.push(result[1].Id);
            that.collection.setSelected(sids);
        };
        var failure = function (data) {
            ErrorHandler.addErrors(data.Exception.Message);
            $targ.parent().removeClass("disabled");
        };
        $targ.parent().addClass('disabled');
        ClientService.split(args, success, failure);
    },
    //#endregion Splitting

    //#region Paging
    setCurrentPage: function (pageNum) {
        pageNum = InputUtil.textRangeCheck(1, this.model.get('Pages'), pageNum);
        this.$el.find('input[name="viewer_results_counter"]').val(pageNum);
        this.model.set('currentPage', pageNum);
    },
    isPageable: function () {
        var $resultsCounter = $(this.el).find('input[name="viewer_results_counter"]');
        return this.model.get('Pages') > 1 && ($resultsCounter.length < 1 || !$resultsCounter.is(':disabled'));
    },
    goToStartPage: function () {
        var resultsCounter = $(this.el).find('input[name="viewer_results_counter"]');
        if (this.isPageable()) {
            if (this.model.getCurrentPage() === 1) { // If already on first page do nothing
                return;
            }
            $(resultsCounter).attr('disabled', true);
            this.setCurrentPage(1);
        }
    },
    goToEndPage: function () {
        var resultsCounter = $(this.el).find('input[name="viewer_results_counter"]');
        if (this.isPageable()) {
            if (this.model.getCurrentPage() === this.model.get('Pages')) {    // If already on last page do nothing
                return;
            }
            $(resultsCounter).attr('disabled', true);
            this.setCurrentPage(this.model.get('Pages'));
        }
    },
    goToNextPage: function (ev) {
        var resultsCounter = this.$el.find('input[name="viewer_results_counter"]');
        if (this.isPageable()) {
            var currentPage = this.model.getCurrentPage();
            var totalPages = this.model.get('Pages');
            if (totalPages > 1 && currentPage + 1 <= totalPages) {
                $(resultsCounter).attr('disabled', true);
                this.setCurrentPage(currentPage + 1);
            }
            else {
                if (ev === undefined || ev.type !== 'mousewheel') {
                    this.goToStartPage();
                }
            }
        }
    },
    goToPrevPage: function (ev) {
        var resultsCounter = this.$el.find('input[name="viewer_results_counter"]');
        if (this.isPageable()) {
            var currentPage = this.model.getCurrentPage();
            if (currentPage - 1 >= 1) {
                $(resultsCounter).attr('disabled', true);
                this.setCurrentPage(currentPage - 1);
            }
            else {
                if (ev === undefined || ev.type !== 'mousewheel') {
                    this.goToEndPage();
                }
            }
        }
    },
    goToSpecificPage: function (ev) {
        var $resultsCounter = $(this.el).find('input[name="viewer_results_counter"]');
        if (ev.which === 13 && this.isPageable()) {
            $resultsCounter.attr('disabled', true);
            var page = parseInt(InputUtil.textRangeCheck(1, this.model.get('Pages'), $resultsCounter.val()), 10);
            this.setCurrentPage(page);
        }
    },
    // #endregion Paging

    //#region Image Setup
    getPreviewPage: function () {
        var pageNum = this.model.getCurrentPage();
        var fullSizePreview = Utility.GetUserPreference('capturePreviewMode') === 'thumbnailPreview' ? false : true;
        var that = this;
        var id = this.model.get('Id');
        var method = Constants.im.PreviewPage;
        var args = [JSON.stringify({
            SimpleDocumentId: id,
            PageNumber: pageNum,
            FullSizePreview: fullSizePreview
        })];
        var success = function (result) {
            var m = that.collection.get(id);
            if (m) {
                m.cachePreview(result, pageNum, fullSizePreview);
                //It is possible that the model changed while the preview was being generated / uploaded
                //It is also possible that the page changed.
                if (that.model.get('Id') === id && that.model.getCurrentPage() === pageNum) {
                    that.displayImage(result.PreviewFileName);
                }
            }
        };
        var iMP = ClientService.setupInvokeMethod(method, args, success);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    setupContextMenu: function () {
        var $viewPortCont = this.$el.find('.viewer_image');
        var $img = $viewPortCont.find('img');
        var alias = this.ctxAlias;
        var options_zoom = {
            width: 150,
            items: [{
                text: Constants.c.zoom, icon: "", alias: alias + 'zoom', type: "group", width: 170, items: [
                  { text: "5%", icon: "", alias: "menu_1-0", action: function () { $(this).trigger('zoom', [0.05]); } },
                  { text: "10%", icon: "", alias: "menu_1-1", action: function () { $(this).trigger('zoom', [0.10]); } },
                  { text: "25%", icon: "", alias: "menu_1-2", action: function () { $(this).trigger('zoom', [0.25]); } },
                  { text: "50%", icon: "", alias: "menu_1-3", action: function () { $(this).trigger('zoom', [0.50]); } },
                  { text: "75%", icon: "", alias: "menu_1-4", action: function () { $(this).trigger('zoom', [0.75]); } },
                  { text: "100%", icon: "", alias: "menu_1-5", action: function () { $(this).trigger('zoom', [1.0]); } },
                  { text: "150%", icon: "", alias: "menu_1-6", action: function () { $(this).trigger('zoom', [1.50]); } },
                  { text: "200%", icon: "", alias: "menu_1-7", action: function () { $(this).trigger('zoom', [2.00]); } },
                  { text: "400%", icon: "", alias: "menu_1-8", action: function () { $(this).trigger('zoom', [4.00]); } },
                  { text: "800%", icon: "", alias: "menu_1-9", action: function () { $(this).trigger('zoom', [8.00]); } }
                ]
            }],
            namespace: 'ctxMenu' + this.cid,
            id: $viewPortCont[0] // Selector for viewportCont, rather than jquery object
        };
        if (this.ctMenu) {
            ContextMenu.destroy(this.ctMenu);
        }
        this.ctMenu = ContextMenu.init(options_zoom);
        this.pzr.init();
    },
    displayImage: function (previewFileName) {
        var $resultsCounter = $(this.el).find('input[name="viewer_results_counter"]');
        var that = this;
        var image = new Image();
        var img = this.$el.find('img[name="image_full"]');
        image.onload = function () {
            var imgThis = this;
            var thisWidth = imgThis.naturalWidth;
            var thisHeight = imgThis.naturalHeight;
            var afterImageShownFunc = function () {
                var transformCont = that.pzr.getTransformCont();
                var viewport = that.pzr.getViewPort();
                // split up selector if there is a class in it
                that.pzr.setHeightWidth(thisHeight, thisWidth);
                that.setupContextMenu();
                // if size of image is icon-ish set width and height of viewport to that of the image
                // if the user preference is to view the document as a thumbnail set the width and height of the viewport to that of the image
                if ((thisWidth < 50 && thisHeight < 50) || Utility.GetUserPreference('capturePreviewMode') === 'thumbnailPreview') {
                    viewport.width(thisWidth).height(thisHeight);
                }
                else {
                    // remove set height/width for viewport (in case it was set to the size of the icon (as above)
                    viewport.css({
                        height: '',
                        width: ''
                    });
                }
                transformCont.width(thisWidth);
                transformCont.height(thisHeight);
                $resultsCounter.attr('disabled', false);
                $('.modalThrobberCont').hide();
            };
            $(img).attr('src', imgThis.src);
            $(img).fadeIn(4, function () {
                $(img).show();
                afterImageShownFunc();
                ShowHidePanel.resizing = false;
                ShowHidePanel.resize();
                that.pzr.fitDefault();
            });
        };
        image.src = Constants.Server_Url + '/GetFile.ashx?functionName=GetSignalRPreview&previewFileName=' + previewFileName;
    },
    //#endregion Image Setup
    applyPZREventHandles: function () {
        var that = this;
        var eh = this.pzr.getEventHandles();
        eh.mouseWheelScroll = function (option) {
            var event = option.event;
            var delta = option.delta;
            if (delta === 1) {
                that.goToPrevPage(event);
            }
            else if (delta === -1) {
                that.goToNextPage(event);
            }
            return false;
        };
    },
    togglePreviewControls: function (show) {
        this.render();
    }
});