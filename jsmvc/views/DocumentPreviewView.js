var DocumentPreviewView = Backbone.View.extend({
    cacheBusterStr: undefined,
    menuView: undefined,
    pzr: undefined,
    recognition: undefined,
    priorId: undefined,
    onSendDQSubscription: undefined,
    imageSrc: "",
    ctMenu: undefined,
    ctxAlias: 'DocumentPreviewView_image_full_',
    className: 'DocumentPreviewView',
    events: {
        "click .navigation_start": "firstPage",
        "click .navigation_prev": "prevPage",
        "click .navigation_next": "nextPage",
        "click .navigation_end": "lastPage",
        "change input[name='currentPage']": "currentPageChanged"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentpreviewviewlayout'));
        this.model = new BulkViewerDataPackageCPX({ Id: options.versionId });
        this.showPreviewControls = options.showPreviewControls === false ? false : true;
        this.listenTo(this.model, 'sync', this.modelSynced);
        this.listenTo(this.model, 'change:imagingMessage', this.imagingMessageChanged);
        var that = this;
        if (window.CompanyInstanceHubProxy) {
            this.onSendDQSubscription = function (dqn) { that.onSendDQNotification(dqn); };
            window.CompanyInstanceHubProxy.onSendDQNotification(this.onSendDQSubscription);
            this.renderCompleteFunc = function (pageIds) { that.onRenderComplete(pageIds); };
            window.CompanyInstanceHubProxy.onRenderComplete(this.renderCompleteFunc);
        }
        if (this.showPreviewControls) {
            this.model.fetch();
        }
        return this;
    },
    render: function () {
        this.cacheBusterStr = Utility.getCacheBusterStr('&');
        // NOTE: if need be window.imgCacheBusterStr may need a time created, and have it checked inside DocumentImageView, before using the cachebuster string
        // imgCacheBusterStr is checked in DocumentImageView, so it can use the same string so the image that is previewed doesn't have to be re-obtained when 
        window.imgCacheBusterStr = this.cacheBusterStr;
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        //This is called for one of two reasons: 1) Initializing view after click, 2) Fetch complete.
        //If the reason is item 2 then goto the start page.
        if (ro.loaded) {
            var $viewPortCont = this.$el.find('.viewer_image');
            this.pzr = PanZoomRotate($viewPortCont, this.model); //setupPZR called when the image is loaded. (previewLoaded)
            this.applyPZREventHandles();
            this.recognition = Recognition(this.pzr);
            this.setupMenu();
            var sp = this.model.getDotted('DocumentPackage.Document.StartPage') || 1;
            this.setCurrentPage(sp, true);
        }
        this.$el.find('input[name="currentPage"]').numeric({ negative: false, decimal: false });
        if (this.showPreviewControls) {
            this.$el.removeClass('hideNative');
        }
        else {
            this.$el.addClass('hideNative');
        }
        return this;
    },
    cleanupMenuView: function () {
        if (this.menuView) {
            this.menuView.close();
            this.menuView = undefined;
        }
    },
    close: function () {
        window.CompanyInstanceHubProxy.onRenderComplete(this.renderCompleteFunc, true);
        if (this.ctMenu) {
            ContextMenu.destroy(this.ctMenu);
            this.ctMenu = undefined;
        }

        if (window.CompanyInstanceHubProxy) {
            window.CompanyInstanceHubProxy.onSendDQNotification(this.onSendDQSubscription, true); //Unsubscribe
        }
        if (this.priorId && window.CompanyInstanceHubProxy) {
            window.CompanyInstanceHubProxy.leaveGroup(this.priorId);
        }

        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var dp = this.model.get('DocumentPackage');
        var ro = {
            isCollapsed: Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed')),
            showPreviewControls: this.showPreviewControls,
            loaded: !!dp,
            imageSource: Constants.Url_Base + 'Content/images/transparent.png',
            maxPages: 0,
            renderingMessage: this.model.get('imagingMessage') || '',
            renderingTitle: this.model.get('imagingMessage') ? 'title="' + this.model.get('imagingMessage') + '"' : '',
            currentPage: ''
        };
        var dqEntries = this.model.get('DQEntries');
        if (dqEntries) {
            var imaging = dqEntries.getImagingEntry();
            if (imaging) {
                ro.renderingMessage = Constants.c.asyncImagingInProgress;
                ro.renderingTitle = 'title="' + Constants.c.asyncImagingInProgress + '"';
            }
        }
        if (ro.loaded) {
            var pd = this.model.get('DocumentPackage').getNumPages();
            ro.maxPages = pd.pages;
            ro.currentPage = this.model.getCurrentPage(this.viewerType);
        }
        return ro;
    },
    setupMenu: function () {
        this.cleanupMenuView();
        if (!window.isGuest) {
            this.menuView = new DocumentViewerMenuView({ model: this.model, viewerType: Constants.vt.ImagePrevew });
            var $vm = this.$el.find('.view_menu');
            $vm.html(this.menuView.render().$el);
        }
    },
    setupPZR: function () {
        var that = this;
        var $viewPortCont = this.$el.find('.viewer_image');
        var $img = $viewPortCont.find('img');
        var alias = this.ctxAlias;
        var options_zoom = {
            width: 150,
            items: [
                    {
                        text: Constants.c.recognition, icon: "", alias: alias + 'rec', type: "group", width: 170, items: [
                          {
                              text: Constants.c.ocr,
                              icon: '',
                              alias: "2-1",
                              action: function () {
                                  $('Body').trigger('setRecShortCutParameters');
                                  that.recognition.initAreaSelect();
                                  that.recognition.lasso('ocr');
                              }
                          },
                          {
                              text: Constants.c.barcode,
                              icon: '',
                              alias: "2-2",
                              action: function () {
                                  $('Body').trigger('setRecShortCutParameters');
                                  that.recognition.initAreaSelect();
                                  that.recognition.lasso('barcode');
                              }
                          }
                        ]
                    },
                    {
                        text: Constants.c.zoom, icon: "", alias: alias + 'zoom', type: "group", width: 170, items: [
                          { text: "5%", icon: "", alias: "menu_1-0", action: function () { that.pzr.zoomToPoint(0.05); } },
                          { text: "10%", icon: "", alias: "menu_1-1", action: function () { that.pzr.zoomToPoint(0.10); } },
                          { text: "25%", icon: "", alias: "menu_1-2", action: function () { that.pzr.zoomToPoint(0.25); } },
                          { text: "50%", icon: "", alias: "menu_1-3", action: function () { that.pzr.zoomToPoint(0.50); } },
                          { text: "75%", icon: "", alias: "menu_1-4", action: function () { that.pzr.zoomToPoint(0.75); } },
                          { text: "100%", icon: "", alias: "menu_1-5", action: function () { that.pzr.zoomToPoint(1.0); } },
                          { text: "150%", icon: "", alias: "menu_1-6", action: function () { that.pzr.zoomToPoint(1.50); } },
                          { text: "200%", icon: "", alias: "menu_1-7", action: function () { that.pzr.zoomToPoint(2.00); } },
                          { text: "400%", icon: "", alias: "menu_1-8", action: function () { that.pzr.zoomToPoint(4.00); } },
                          { text: "800%", icon: "", alias: "menu_1-9", action: function () { that.pzr.zoomToPoint(8.00); } }
                        ]
                    }
            ],
            namespace: 'ctxMenu' + this.cid,
            id: $viewPortCont[0] // Selector for viewportCont, rather than jquery object
        };
        if (this.ctMenu) {
            ContextMenu.destroy(this.ctMenu);
            this.ctMenu = undefined;
        }
        this.ctMenu = ContextMenu.init(options_zoom);
        this.pzr.init();
        this.recognition.init();
    },
    setCurrentPage: function (pageNumber, triggerImageLoad) {
        var changed = this.model.setCurrentPage(pageNumber);
        pageNumber = this.model.get('currentPage'); //Get in case the range was bad.
        var inputPageNumber = parseInt(this.$el.find('input[name="currentPage"]').val(), 10);
        if (inputPageNumber !== pageNumber) {
            this.$el.find('input[name="currentPage"]').val(pageNumber);
        }
        if (triggerImageLoad || changed) {
            this.gotoPage(pageNumber);
        }
    },
    gotoPage: function (pageNumber) {
        this.$el.find('.viewer_navigation input').prop('disabled', true);

        var image = document.getElementById('imgLoader');
        var info = this.model.get('DocumentPackage').findPage(pageNumber);
        var verId = this.model.versionId();

        var that = this;
        this.imageSrc = "";
        var isNative = !(info && info.ci.isRendered());
        if (info && info.pdto) {  // If there is no page collection detected make the call to get the proper page
            this.imageSrc = Constants.Server_Url + '/GetFile.ashx?functionName=GetImageByIds' +
                '&versionId=' + encodeURIComponent(verId) + '&pageId=' + encodeURIComponent(info.pdto.get('Id')) +
                '&redacted=true&annotated=true&isNative=' + encodeURIComponent(isNative) + this.cacheBusterStr;
        }
        else {
            this.imageSrc = Constants.Server_Url + '/GetFile.ashx?functionName=GetImage' +
                '&versionId=' + encodeURIComponent(verId) + '&pageNum=' + encodeURIComponent(pageNumber) +
                '&redacted=true&annotated=true&isNative=' + encodeURIComponent(isNative) + this.cacheBusterStr;
        }
        if (this.imageSrc !== "") {
            $(image).one("load", function () {
                that.previewLoaded(info, this);
            }).attr('src', that.imageSrc).each(function () {
                if (this.complete) {
                    $(this).load();
                }
            });
        }
    },
    previewLoaded: function (info, imgThis) {
        var that = this;
        var thisWidth = imgThis.naturalWidth;
        var thisHeight = imgThis.naturalHeight;
        var zoomlevelval = Utility.GetUserPreference('zoomlevel');
        if (zoomlevelval) {
            $('body').data('fit', zoomlevelval);
        }
        else {
            $('body').data('fit', 'width');
        }
        var $img = this.$el.find('.transformCont img');
        $img.attr('src', that.imageSrc);
        $img.fadeIn(4).promise().done(function () {
            $img.show();
            var transformCont = that.pzr.getTransformCont();
            var viewport = that.pzr.getViewPort();
            // split up selector if there is a class in it
            that.pzr.setHeightWidth(thisHeight, thisWidth);
            that.setupPZR();
            // if size of image is icon-ish set width and height of viewport to that of the image
            // if the user preference is to view the document as a thumbnail set the width and height of the viewport to that of the image
            if ((thisWidth < 50 && thisHeight < 50)) {
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

            that.pzr.fitDefault();
            that.$el.find('.viewer_navigation input').prop('disabled', false);
        });
    },
    firstPage: function () {
        this.setCurrentPage(1);
    },
    prevPage: function () {
        var currPage = this.model.getCurrentPage(this.viewerType);
        this.setCurrentPage(currPage - 1);
    },
    nextPage: function () {
        var currPage = this.model.getCurrentPage(this.viewerType);
        this.setCurrentPage(currPage + 1);
    },
    lastPage: function () {
        this.setCurrentPage(999999);
    },
    currentPageChanged: function (e) {
        this.setCurrentPage(parseInt($(e.currentTarget).val(), 10));
    },
    imagingMessageChanged: function (model, options) {
        var message = this.model.get('imagingMessage') || '';
        var $span = this.$el.find('.dqRenderingInProgressContainer span');
        $span.text(message);
        if (message) {
            $span.attr('title', message);
        }
        else {
            $span.removeProp('title');
        }
    },
    onSendDQNotification: function (dqn) {
        //dqn = DQNotificationEventArgs
        if (!dqn) {
            return;
        }
        if (dqn.DocumentId !== this.model.documentId()) {
            return;
        }
        switch (dqn.NotificationType) {
            case Constants.dqnt.Start:
                if (Utility.hasFlag(Constants.dtfs.Imaging, dqn.TaskType)) {
                    this.model.setImagingMessage(Constants.c.asyncImagingInProgress);
                }
                break;
            case Constants.dqnt.End:
                if (Utility.hasFlag(Constants.dtfs.Imaging, dqn.TaskType)) {
                    var that = this;
                    this.model.setImagingMessage(Constants.c.imagingCompleteReloading);
                    setTimeout(function () {
                        that.model.fetch({
                            success: function () {
                                that.model.setImagingMessage(null);
                            }
                        });
                    }, 4000);
                    this.model.fetch();
                }
                break;
            case Constants.dqnt.Progress:
                if (Utility.hasFlag(Constants.dtfs.Imaging, dqn.TaskType)) {
                    this.model.setImagingMessage(String.format(Constants.c.asyncImagingProgress_T, dqn.PercentDone));
                }
                break;
        }
    },
    applyPZREventHandles: function () {
        var that = this;
        var eh = this.pzr.getEventHandles();
        eh.mouseWheelScroll = function (option) {
            var event = option.event;
            var delta = option.delta;
            if (delta === 1) {
                that.prevPage(event);
            }
            else if (delta === -1) {
                that.nextPage(event);
            }
            return false;
        };
    },
    ///<summary>
    /// Toggle the display of the document image, pager, and menu (toggle display of title bar with panel collapse/expand)
    ///</summary>
    togglePreviewControls: function (show) {
        this.showPreviewControls = !!show;
        this.render();
        this.showPreviewControls = !show;
    },
    modelSynced: function (model_or_collection, resp, options) {
        if (options && options.ignoreSync) {
            return;
        }
        var isBulkSync = model_or_collection instanceof BulkViewerDataPackageCPX;
        var isDocSync = model_or_collection instanceof DocumentGetPackageCPX;
        if (isBulkSync || isDocSync) {
            var docId = this.model.documentId();
            if (this.priorId !== docId) { //Join SignalR message group if needed.
                if (this.priorId && window.CompanyInstanceHubProxy) {
                    window.CompanyInstanceHubProxy.leaveGroup(this.priorId);
                }
                this.priorId = docId;
                if (window.CompanyInstanceHubProxy) {
                    window.CompanyInstanceHubProxy.joinGroup(docId);
                }
            }
            this.render();
        }
    },
    onRenderComplete: function (pageIds) {
        var found = false;
        var idx = 0;
        var length = pageIds.length;
        var pgModel = this.model.getCurrentPageInfo();
        var pgId;
        if (pgModel) {
            pgId = pgModel.get('Id');
        }
        for (idx; idx < length; idx++) {
            if (pageIds[idx] === pgId) {
                found = true;
                break;
            }
        }
        if (found) {
            this.model.setDotted('DocumentPackage.burningInAnnotations', undefined); //This will trigger a CurrentPageChanged.
        }
    }
});