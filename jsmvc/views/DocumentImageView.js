var DocumentImageView = Backbone.View.extend({
    model: null, //BulkViewerDataPackageCPX
    options: undefined,
    viewerType: Constants.vt.Image,
    cacheBusterStr: undefined,
    viewingImage: undefined,
    pageKeyUpTimeout: undefined,
    bookmarkView: undefined,
    annotationView: undefined,
    renderCompleteFunc: undefined,
    pzr: undefined,
    recognition: undefined,
    className: 'DocumentImageView',
    ctxAlias: 'DocumentImageView_image_full_',
    events: {
        "click .navigation_start": "firstPage",
        "click .navigation_prev": "prevPage",
        "click .navigation_next": "nextPage",
        "click .navigation_end": "lastPage",
        "keyup input[name='currentPage']": "currentPageKeyUp",
        "click .rotateControl": "rotateControlClick",
        "click .downloadNativeDocument": "downloadNativeDocument",
        "click span.closeDocNav": "closeDocHits",
        "click span.closeDocText": "closeDocText",
        "click span.nextHit": "nextHit",
        "click span.prevHit": "prevHit",
        "click span.highlightAll": "highlightAllHits",
        "click .saveApprovalStamp:not(.disabled)": "saveApprovalStamp",         // Button added in AnnotationView.js
        "click .cancelApprovalStamp:not(.disabled)": "cancelApprovalStamp"      // Button added in AnnotationView.js
    },
    initialize: function (options) {
        var that = this;
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('documentimageviewlayout'));
        this.listenTo(this.model, 'change:DocumentPackage.saveExecuting', this.saveExecutingChanged);
        this.listenTo(this.model, 'change:imagingMessage', this.imagingMessageChanged);
        this.listenTo(this.model, 'change:syncActionNotification', this.syncActionNotificationChanged);
        this.listenTo(this.model, 'change:currentPage', this.currentPageChanged);
        this.listenTo(this.model, 'change:thumbnails', function (model, value, options) {
            this.$el.find('.viewer_image').removeClass('thumbnailright thumbnailleft').addClass(value);
        });
        this.listenTo(this.model, 'enterCTB', function (model, options) {
            // Obtain the pzr instance for the content type builder
            options.pzr = this.pzr;
            // Suspend editing of annotations while in the content type builder
            this.annotationView.suspendEditing();
        });
        this.listenTo(this.model, 'exitCTB', function (model) {
            // Content tyep builder exited, unsuspend annotation editing
            this.annotationView.unsuspendEditing();
        });
        this.listenTo(this.model, 'zoomLevelChanged', function () {
            this.pzr.fitDefault();
        });
        this.listenTo(this.model, 'zoomToRegion', this.zoomToRegion);
        this.listenTo(this.model, 'cleanupHighlights', function (e) {
            this.$el.find('.zoomHighlight').remove();
            this.lastSyncRegion = undefined;
        });
        if (!this.options.regionViewer && this.model.get('DocumentPackage')) {
            this.listenTo(this.model.get('DocumentPackage'), 'change:burningInAnnotations', this.burningInChanged);
            this.listenTo(this.model.get('DocumentPackage'), 'change:annotationDisplay', function (model, value, options) {
                if (!value) {
                    this.render();
                } else {
                    var reRender = true;
                    if (this.viewingImage) {
                        cp = this.model.getCurrentPage(this.viewerType);
                        info = this.model.get('DocumentPackage').findPage(cp);
                        reRender = !(info && info.pdto);
                    }
                    if (reRender) {
                        this.render();
                    } else {
                        // gotoPage will get the annotations png without causing a new render of the annotations view
                        this.gotoPage(info, cp);
                    }
                }
            });
        }
        this.listenTo(window.userPreferences, 'reset', function (collection, options) {
            this.currentPageChanged();
        });
        this.listenTo(window.userPreferences, 'change', function (model, options) {
            var key = model.get('Key');
            var pref;
            if (key === 'thumbnails') {
                pref = model.get('Value');
                this.$el.find('.viewer_image').removeClass('thumbnailright thumbnailleft').addClass(pref);
            }
        });
        this.listenTo(window.userPreferences, 'reset', function (collection, options) {
            this.$el.find('.viewer_image').removeClass('thumbnailright thumbnailleft');
        });
        if (window.imgCacheBusterStr) {
            this.cacheBusterStr = window.imgCacheBusterStr;
            window.imgCacheBusterStr = undefined;
        }
        else {
            this.cacheBusterStr = Utility.getCacheBusterStr('&');
        }

        $('body').off('DocumentTextAction').on('DocumentTextAction', function (e, data) {
            that.documentTextAction(e, data);
        });
        this.renderCompleteFunc = function (pageIds) { that.onRenderComplete(pageIds); };
        window.CompanyInstanceHubProxy.onRenderComplete(this.renderCompleteFunc);
        return this;
    },
    initializePZR: function () {
        if (!this.pzr) {
            var $viewPortCont = this.$el.find('.viewer_image');
            this.pzr = PanZoomRotate($viewPortCont, this.model); //setupPZR called when the image is loaded. (imageLoaded)
            this.applyPZREventHandles();
        }
    },
    render: function () {
        //retain last selected annotation mode before annotationView close for annotationEditMode option.
        var selectedAnno = '';
        if (this.annotationView) {
            selectedAnno = this.annotationView.selectedAnnotationType || this.annotationView.lastSelectedAnno;
        }
        this.closeSubViews();
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        if (ro.loaded) {
            var pages = this.model.getDotted('DocumentPackage.Pages');
            if (pages) {
                this.stopListening(pages);
                this.listenTo(pages, 'add delete change', this.pagesCollectionChanged);
                this.listenTo(pages, 'reset', function () { this.pagesCollectionChanged(); this.currentPageChanged(); });
            }
            this.initializePZR();
            this.annotationView = new AnnotationView({ model: this.model, pzr: this.pzr, lastSelectedAnno: selectedAnno });
            this.$el.find('.anno_menu_cont').html(this.annotationView.render().$el);
            this.recognition = Recognition(this.pzr, this.annotationView.drawing);
            if (!this.options.regionViewer) { //Region viewer is set in Workflow Designer
                this.bookmarkView = new BookmarksView({ model: this.model });
                this.$el.find('.bookmarks_container').html(this.bookmarkView.$el);
                this.bookmarkView.render();
                this.thumbnailView = new DocumentImageThumbnailsView({ model: this.model });
                this.$el.find('.DocumentImageViewThumbnailContainer').append(this.thumbnailView.$el);
                this.thumbnailView.render();
                this.setupMenu();
            }
            this.gotoPage(ro.findPageInfo, ro.currentPage);
            if (this.model.get('showDocumentText')) {
                this.model.trigger('change:showDocumentText', this.model, true, {});
            }
        }
        this.$el.find('input[name="currentPage"]').numeric({ negative: false, decimal: false });
        return this;
    },
    close: function () {
        window.CompanyInstanceHubProxy.onRenderComplete(this.renderCompleteFunc, true);
        this.cleanupMenuView();
        this.closeSubViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    cleanupMenuView: function () {
        if (this.menuView) {
            this.menuView.close();
            this.menuView = undefined;
        }
    },
    closeSubViews: function () {
        if (this.ctMenu) {
            ContextMenu.destroy(this.ctMenu);
            this.ctMenu = undefined;
        }
        if (this.bookmarkView) {
            this.bookmarkView.close();
            this.bookmarkView = undefined;
        }
        if (this.annotationView) {
            this.annotationView.close();
            this.annotationView = undefined;
        }
        if (this.thumbnailView) {
            this.thumbnailView.close();
            this.thumbnailView = undefined;
        }
        if (this.pzr) {
            this.pzr.close();
            this.pzr = undefined;
        }
    },
    getRenderObject: function () {
        var dp = this.model.get('DocumentPackage');
        var ro = {
            loaded: !!dp,
            imageSource: Constants.Url_Base + 'Content/images/transparent.png',
            maxPages: 0,
            currentPage: '',
            renderingMessage: this.model.get('imagingMessage') || '',
            renderingTitle: this.model.get('imagingMessage') ? 'title="' + this.model.get('imagingMessage') + '"' : '',
            showNative: false,
            iframeSource: Constants.Url_Base + 'Content/images/transparent.png',
            canDownload: this.model.hasRights(Constants.sp.Export_Output),
            typeNotSupported: false,
            iframeClass: 'fullIframe',
            noDownloadMessage: Constants.c.nativeDownloadPermissions,
            findPageInfo: undefined,
            nativeHideClass: '',
            thumbnailsPreference: Utility.GetUserPreference('thumbnails') || '',
            regionViewer: !!this.options.regionViewer, //Region viewer is set in Workflow Designer
            burnInClass: this.model.getDotted('DocumentPackage.burningInAnnotations') ? '' : 'displayNone'
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
            ro.canRotate = this.model.canModifyVersioning() && !this.model.pageIsPartOfForm(ro.currentPage);
            var info = ro.findPageInfo = this.model.get('DocumentPackage').findPage(ro.currentPage);
            var isNative = !(info && info.ci.isRendered()); // is native if not rendered
            ro.showNative = isNative || !info.pdto; // show native if native or (somehow) there is no pdto
            if (info && ro.showNative) {
                var mimeType = this.model.getMimeType(info.idx);
                ro.typeNotSupported = !Utility.detectMimeTypes(mimeType);
                if (ro.typeNotSupported && ro.canDownload) {
                    ro.typeNotSupported = true;
                    ro.iframeClass = 'iconIframe';
                    ro.iframeSource = Constants.Server_Url + '/GetFile.ashx?functionName=GetImage' +
                        '&versionId=' + this.model.versionId() +
                        '&pageNum=' + ro.currentPage +
                        '&redacted=false&annotated=false&isNative=true' + this.cacheBusterStr;
                } else if (ro.canDownload) {
                    var ci = info.ci;
                    if (mimeType === 'text/plain') {
                        // If mimetype is plain text make the native viewer iframe's background white
                        ro.iframeClass += ' whiteBG';
                    }
                    ro.iframeSource = this.getDownloadUrl(ci);
                }
            } else {
                ro.canDownload = false;
                ro.noDownloadMessage = Constants.c.contentItemNotFound;
            }

            if (ro.showNative) {
                ro.nativeHideClass = 'displayNone';
            }
            ro.docText = this.getCurrentPageDocText();
            ro.showDocumentHits = !!this.model.get('showDocumentHits');
            var hitsData = this.model.get('hitsData');
            ro.hitStart = ro.showDocumentHits && hitsData && hitsData.hits ? 1 : 0;
            ro.hitEnd = ro.showDocumentHits && hitsData && hitsData.hits ? hitsData.hits.length : 0;
            ro.showDocumentText = !!this.model.get('showDocumentText');
            this.viewingImage = !ro.showNative;
        }
        return ro;
    },
    getCurrentPageDocText: function () {
        var currentPageInfo = this.model.getCurrentPageInfo();
        return currentPageInfo ? currentPageInfo.get('Text') : '';
    },
    getDownloadUrl: function (ci, isDownload) {
        return Constants.Server_Url + '/GetFile.ashx?functionName=GetNativeDownload&documentId=' +
                this.model.documentId() +
                '&versionId=' + this.model.versionId() +
                '&contentItemId=' + ci.get('Id') +
                '&inline=' + !isDownload;   // inline is false when downloading, true when viewing - so the iframe will render it
    },
    downloadNativeDocument: function () {
        var cis = this.model.getDotted('DocumentPackage.ContentItems');
        var cp = this.model.getCurrentPage(this.viewerType);
        var ci = cis.at(cp - 1);
        var $iframe = this.$el.find('iframe.download');
        $iframe.attr('src', this.getDownloadUrl(ci, true));
    },
    setupMenu: function () {
        this.cleanupMenuView();
        if (!window.isGuest) {
            this.menuView = new DocumentViewerMenuView({ model: this.model, viewerType: Constants.vt.Image });
            var $vm = this.$el.find('.view_menu');
            $vm.html(this.menuView.render().$el);
        }
    },
    setupPZR: function () {
        var that = this;
        var $viewPortCont = this.$el.find('.viewer_image');
        var $img = $viewPortCont.find('img');
        var alias = this.ctxAlias;
        var ctxOptions = {
            width: 150,
            items: [
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
            id: $viewPortCont[0], // Selector for viewportCont, rather than jquery object            
            namespace: 'ctxMenu' + this.cid
        };
        if (this.options.regionViewer) {
            ctxOptions.items.unshift({
                text: Constants.c.recognition, icon: "", alias: alias + 'rec', type: "group", width: 170, items: [
                  {
                      text: Constants.c.getRegion,
                      icon: '',
                      alias: "2-0",
                      action: function () {
                          that.recognition.initAreaSelect();
                          that.recognition.lasso('region');
                      }
                  }
                ]
            });
        } else {
            ctxOptions.items.unshift({
                text: Constants.c.recognition, icon: "", alias: alias + 'rec', type: "group", width: 170, items: [
                  {
                      text: Constants.c.ocr,
                      icon: '',
                      alias: "2-1",
                      action: function () {
                          $('Body').trigger('setRecShortCutParameters');
                          that.recognition.setIslassoOcrOn(true);
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
            });
        }
        if (this.ctMenu) {
            ContextMenu.destroy(this.ctMenu);
        }
        this.ctMenu = ContextMenu.init(ctxOptions);
        this.pzr.init(function () {
            that.annotationView.unselectMark();
        });
        this.recognition.init();
    },
    setCurrentPage: function (pageNumber) {
        this.model.setCurrentPage(pageNumber, true);
        pageNumber = this.model.get('currentPage'); //Get in case the range was bad.
        var inputPageNumber = parseInt(this.$el.find('input[name="currentPage"]').val(), 10);
        if (inputPageNumber !== pageNumber) {
            this.$el.find('input[name="currentPage"]').val(pageNumber);
        }
    },
    gotoPage: function (findPageInfo, currentPage) {
        this.$el.find('.viewer_navigation input').prop('disabled', true);

        var image = document.getElementById('imgLoader');
        var info = findPageInfo;
        var verId = this.model.versionId();

        var that = this;
        var src = "";
        var isNative = !(info && info.ci.isRendered());
        if (info && info.pdto) {  // If there is no page collection detected make the call to get the proper page
            var ad = this.model.getDotted('DocumentPackage.annotationDisplay');
            if (!ad) {
                ad = this.model.getDefaultAnnotationDisplay();
            }
            src = Constants.Server_Url + '/GetFile.ashx?functionName=GetImageByIds' +
                '&versionId=' + encodeURIComponent(verId) + '&pageId=' + encodeURIComponent(info.pdto.get('Id')) +
                '&redacted=' + ad.redacted + '&annotated=' + ad.annotated + '&isNative=' + encodeURIComponent(isNative) + this.cacheBusterStr;
        }
        else {
            src = Constants.Server_Url + '/GetFile.ashx?functionName=GetImage' +
                '&versionId=' + encodeURIComponent(verId) + '&pageNum=' + encodeURIComponent(currentPage) +
                '&redacted=true&annotated=true&isNative=' + encodeURIComponent(isNative) + this.cacheBusterStr;
        }
        if (src !== "") {
            //Utility.OutputToConsole("DocumentImageView.gotoPage src=" + src);
            var $img = this.$el.find('.transformCont img.element_transition');
            $img.css('visibility', 'hidden');
            $(image).one("load", function () {
                //Utility.OutputToConsole("DocumentImageView.gotoPage calling imageLoaded");
                that.imageLoaded(info, this);
            }).attr('src', src).each(function () {
                //Utility.OutputToConsole("DocumentImageView.gotoPage this.complete=" + this.complete);
                if (this.complete) {
                    $(this).load();
                }
            });
        }

    },

    firstPage: function (e) {
        this.setCurrentPage(1);
    },
    prevPage: function (e) {
        var currPage = this.model.getCurrentPage(this.viewerType);
        this.setCurrentPage(currPage - 1);
    },
    nextPage: function (e) {
        var currPage = this.model.getCurrentPage(this.viewerType);
        this.setCurrentPage(currPage + 1);
    },
    lastPage: function (e) {
        this.setCurrentPage(999999);
    },
    currentPageKeyUp: function (e) {
        var that = this;
        if (this.pageKeyUpTimeout) {
            clearTimeout(this.pageKeyUpTimeout);
        }
        this.pageKeyUpTimeout = setTimeout(function () {
            that.setCurrentPage(parseInt($(e.currentTarget).val(), 10));
        }, 700);
    },
    imageLoaded: function (info, imgThis) {
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
        var $img = this.$el.find('.transformCont img.element_transition');
        if (!$img.length) {
            return;
        }
        var $iconIframe = this.$el.find('.iconIframe');
        // Reattempt to load the image, if it isn't visible yet.
        clearTimeout(this.imgTimeout);
        if (!$img.is(':visible') && !$iconIframe.is(':visible')) {
            this.imgTimeout = setTimeout(function () {
                that.imageLoaded(info, imgThis);
            }, 100);
            return;
        }
        $img.attr('src', imgThis.src);
        $img.fadeIn(4).promise().done(function () {
            $img.css('visibility', 'inherit');
            that.initializePZR();   // Ensure pzr exists
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
            if ($._data($('body')[0], 'events').highlightHit && $($._data($('body')[0], 'events').highlightHit).length > 0) {
                $('body').trigger('highlightHit');
                $('body').off('highlightHit');
            }

            var inAnnotationEdit = that.model.get('inAnnotationEdit');
            // If the model is set to be in annotation edit mode, then we should put it in edit mode, if it isn't already there
            if (inAnnotationEdit && !that.annotationView.editingAnnotations) {
                that.annotationView.editingAnnotations = true;
                that.pzr.fitImage();
                that.annotationView.editAnnotations();
            }
            if (!that.annotationView.editingAnnotations) {
                that.pzr.fitDefault();
            }

            // fire the following event only after all zooming/panning/fitting is done
            if ($._data($('body')[0], 'events').imageLoadedRegionSelection && $($._data($('body')[0], 'events').imageLoadedRegionSelection).length > 0) {
                $('body').trigger('imageLoadedRegionSelection');
            }
            that.$el.find('.viewer_navigation input').prop('disabled', false);
            $('body').off('setupRecognitionShortcut').on('setupRecognitionShortcut', function () {
                that.setupRecognitionShortcut();
            });
            if (that.annotationView.editingAnnotations) {
                $('body').trigger('getBurnedInImages');
                $('body').trigger('drawAnnotations');
            }
            else {
                $('body').trigger('setupRecognitionShortcut');
            }
            if (that.annotationView.lastSelectedAnno) {
                that.annotationView.setupAnnotationEditModeOption();
            }
            var dp = that.model.get('DocumentPackage');
            var approval = dp.get('Approval');
            // If we aren't in annotation edit mode, but there is an approval, we should trigger the event for the annotation view to render the approval stamp
            // This must be before the trigger of docImageLoadedForApprovalStamp
            if (!inAnnotationEdit && approval) {
                dp.trigger('change:Approval', dp, approval);
            }
            if (that.annotationView.approvalStampsEnabled && approval) {
                that.model.trigger('docImageLoadedForApprovalStamp', that, true);
            }
        });
    },
    currentPageChanged: function (model, value, options) {
        var reRender = true;
        var cp;
        var info;
        if (this.viewingImage) {
            cp = this.model.getCurrentPage(this.viewerType);
            info = this.model.get('DocumentPackage').findPage(cp);
            reRender = !(info && info.pdto);
        }
        if (reRender) {
            this.render();
        } else {
            this.gotoPage(info, cp);
            var formPage = this.model.pageIsPartOfForm(cp);
            var rotateControls = this.$el.find('.rotateSeperator, .rotate_menu');
            if (formPage) {
                rotateControls.hide();
            } else {
                rotateControls.show();
            }
            this.$el.find('input[name="currentPage"]').val(cp);
            var docText = this.getCurrentPageDocText() || '';
            var currShowDocText = this.model.get('showDocumentText') || false;
            var opts = { docText: docText };
            this.model.trigger('change:showDocumentText', this.model, currShowDocText, opts);
            this.annotationView.render();
        }
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
    pagesCollectionChanged: function (model, options) {
        this.cacheBusterStr = Utility.getCacheBusterStr('&');
    },
    rotateControlClick: function (e) {
        var cp = this.model.getCurrentPage(this.viewerType);
        var info = this.model.get('DocumentPackage').findPage(cp);
        if (!info || !info.pdto) {
            return; //No rotations on native content.
        }
        var $sel = $(e.currentTarget);
        var rotVal = $sel.data('rotatevalue');
        var rotAll = Utility.convertToBool($sel.data('rotateall'));
        this.model.get('DocumentPackage').rotate(cp, rotVal, rotAll);
        this.pzr.fitDefault();
    },
    documentTextAction: function (e, data) {
        this.model.set({
            'showDocumentHits': data.show,
            'showDocumentText': data.show
        });
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
            this.annotationView.endEditAnnotations();
            this.cacheBusterStr = Utility.getCacheBusterStr('&');
            this.model.setDotted('DocumentPackage.burningInAnnotations', undefined); //This will trigger a CurrentPageChanged.
        }
    },
    regionIsDrawn: function (region) {
        if (!this.lastSyncRegion) {
            return false;
        }
        var l = this.lastSyncRegion;
        var c = region;

        return l.Page === c.Page && l.Left === c.Left && l.Top === c.Top && l.Width === c.Width && l.Height === c.Height;
    },
    syncActionNotificationChanged: function (model, options) {
        var dqn = this.model.get('syncActionNotification');

        if (dqn.NotificationType === Constants.dqnt.Start || dqn.NotificationType === Constants.dqnt.End) {
            if (this.lastSyncRegion) {
                var $transCon = this.pzr.getTransformCont();
                var $regionCon = $transCon.find('.regionContainer');
                $regionCon.empty();
            }
            this.lastSyncRegion = undefined;
        }
        if (dqn.Region && !this.regionIsDrawn(dqn.Region)) {
            this.lastSyncRegion = dqn.Region;


            var currentPage = this.model.getCurrentPage(this.viewerType);
            var that = this;
            var drawFunc = function () {
                //Check the region again, if we had to load the page its possible that we have moved on to another region.
                if (!that.regionIsDrawn(dqn.Region)) {
                    return;
                }

                // Transform region (% based) into screen coords - px
                var selectionArea = that.pzr.getSelectionArea(dqn.Region);
                var regionData = {
                    Color: '#B2DFEE',
                    Opacity: 0.5,
                    Rectangle: {
                        Width: selectionArea.width,
                        Height: selectionArea.height,
                        Left: selectionArea.x1,
                        Top: selectionArea.y1
                    }
                };
                // Transform region into image coords- px
                regionData.Rectangle = that.pzr.screenToImageRect(regionData.Rectangle);
                var $region = that.annotationView.drawing.createRegion(regionData);
                var $transCon = that.pzr.getTransformCont();
                var $regionCon = $transCon.find('.regionContainer');
                $regionCon.empty();
                $regionCon.append($region);
                //TODO eventually make this a preference if a betterizer comes in.  
                that.pzr.fitImage();
                //that.pzr.zoomToRegion(dqn.Region.Left, dqn.Region.Top, dqn.Region.Width, dqn.Region.Height);
            };

            if (currentPage === dqn.Region.Page) {
                drawFunc();
            }
            else {
                $('body').one('imageLoadedRegionSelection', drawFunc);
                this.setCurrentPage(dqn.Region.Page);
            }
        }
    },
    zoomToRegion: function (region) {
        if (this.regionIsDrawn(region)) {
            return;
        }
        this.lastSyncRegion = region;
        var top = parseFloat(region.Top);
        var left = parseFloat(region.Left);
        var width = parseFloat(region.Width);
        var height = parseFloat(region.Height);
        var page = parseInt(region.Page, 10);
        if (!isNaN(top) && !isNaN(left) && !isNaN(width) && !isNaN(height)) {
            var that = this;
            var zoomFunc = function () {
                // Zoom to the region and highlight it 
                that.pzr.zoomToRegion(left, top, width, height, true, region.isLegacyRegion);
            };
            // If the page in the Workflow Designer selected is '0' or unspecified, use the first page (not StartPage, because user prompts may well come from a cover page)
            page = page || 1;
            var currPage = this.model.getCurrentPage();
            if (currPage !== page) {
                // Navigate to the page which needs to be zoomed
                $('body').on('highlightHit', zoomFunc);
                this.model.setCurrentPage(page);
            }
            else {
                zoomFunc();
            }
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
    burningInChanged: function (model, options) {
        var val = this.model.getDotted('DocumentPackage.burningInAnnotations');
        if (val) {
            this.$el.find('.burningInAnnotationsCont').removeClass('displayNone');
        } else {
            this.$el.find('.burningInAnnotationsCont').addClass('displayNone');
        }
        this.currentPageChanged(model, options);
    },
    setupRecognitionShortcut: function () {
        var ocrShortcutUserPref = Utility.GetUserPreference('viewocrShortcut');
        var barcodeShortcutUserPref = Utility.GetUserPreference('viewbarcodeShortcut');
        if (ocrShortcutUserPref) {
            var viewocrShortcut = JSON.parse(ocrShortcutUserPref);
            if (viewocrShortcut === 'viewocrShortcut') {
                this.recognition.setIslassoOcrOn(false);
                this.recognition.setIslassobarcodeOn(false);
                this.recognition.initAreaSelect();
                this.recognition.lasso('ocr');
            }
        }
        if (barcodeShortcutUserPref) {
            var viewbarcodeShortcut = JSON.parse(barcodeShortcutUserPref);
            if (viewbarcodeShortcut === 'viewbarcodeShortcut') {
                this.recognition.setIslassoOcrOn(false);
                this.recognition.setIslassobarcodeOn(false);
                this.recognition.initAreaSelect();
                this.recognition.lasso('barcode');
            }
        }

    },

    nextHit: function () {
        this.model.trigger('nextHit', this.model); //Handled in DocumentView.js
    },
    prevHit: function () {
        this.model.trigger('prevHit', this.model); //Handled in DocumentView.js
    },
    highlightAllHits: function () {
        this.model.trigger('highlightAllHits', this.model); //Handled in DocumentView.js
    },
    closeDocHits: function () {
        this.model.set('showDocumentHits', false);
    },
    closeDocText: function () {
        this.model.set('showDocumentText', false);
    },

    saveExecutingChanged: function () {
        var saveBtn = this.$el.find('.saveApprovalStamp:visible');
        var cancelBtn = this.$el.find('.cancelApprovalStamp:visible');
        var executing = this.model.getDotted('DocumentPackage.saveExecuting');
        if (executing) {
            saveBtn.text('');
            var throbber = document.createElement('span');
            Utility.setElementClass(throbber, 'throbber');
            saveBtn.append(throbber);
            saveBtn.addClass('disabled');
            cancelBtn.addClass('disabled');
        }
        else {
            saveBtn.removeClass('disabled');
            saveBtn.empty();
            saveBtn.text(Constants.c.save);
            cancelBtn.removeClass('disabled');
        }
    },
    saveApprovalStamp: function (ev) {
        // Saving the approval stamp needs to move to the next item if it is supposed to.
        $(ev.currentTarget).addClass('disabled');
        // If the document is in workflow then attempt to submit it and move to next, otherwise just save the document
        var taskUIData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage.TaskUIData');
        var isUserApprovalOnly = taskUIData ? taskUIData.IsUserApprovalOnlyInput() : false;
        // Only submit the workflow if the document is in an active workflow and the only task is the user approval task.
        // Otherwise just perform a save of the document
        if (this.model.isInWorkflow(true) && isUserApprovalOnly) {
            this.model.set('submitWorkflowOnApprovalStampSave', true);
        }
        else {
            this.model.get('DocumentPackage').save();
        }
    },
    ///<summary>
    /// Remove the approval from the document and remove the approval stamp
    ///</summary>
    cancelApprovalStamp: function (ev) {
        $(ev.currentTarget).addClass('disabled');
        var dp = this.model.get('DocumentPackage');
        var newApp = dp.get('Approval');
        var approvals = dp.get('Approvals');
        // remove the in progress approval from the approvals collection
        approvals.remove(newApp);
        var o = { ignoreChange: true, ignoreReset: true };
        dp.removeApprovalStamp(newApp.get('Id'), o);
        //Unset any approval in progress (It has been cancelled)
        dp.set('Approval', undefined, o);
        var transformCont = this.pzr.getTransformCont();
        var viewport = this.pzr.getViewPort();
        transformCont.find('.isNewApprovalStamp').remove();
        var $appStamp = viewport.find('.isNewApprovalStamp');
        var $selectedAppStamp = viewport.find('.selectedAnno').has($appStamp);
        if ($selectedAppStamp.length > 0) {
            $selectedAppStamp.remove();
        }

        // Show any my approval marks. (The user may approve/deny while in annotation edit mode and then both the existing stamp and new stamp would be movable)
        var page1 = this.model.get('DocumentPackage').findPage(1);
        var myApproval = this.model.getMyApproval();
        if (myApproval) {
            var existingMyApprovalMark = page1.pdto.get('AnnotationCollection').findWhere({ ApprovalId: myApproval.get('Id') });
            if (existingMyApprovalMark) {
                $('img[markId="' + existingMyApprovalMark.get('Id') + '"]').show();
            }
        }
    }
});