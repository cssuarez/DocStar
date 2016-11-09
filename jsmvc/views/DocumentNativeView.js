var DocumentNativeView = Backbone.View.extend({
    viewerType: Constants.vt.Native,
    cacheBusterStr: undefined,
    className: 'DocumentNativeView',
    menuView: undefined,
    events: {
        "click .navigation_start": "firstPage",
        "click .navigation_prev": "prevPage",
        "click .navigation_next": "nextPage",
        "click .navigation_end": "lastPage",
        "change input[name='currentPage']": "currentPageChanged",
        "click .downloadNativeDocument": "downloadNativeDocument"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentnativeviewlayout'));
        this.listenTo(this.model, 'change:currentPage', this.render);
        this.listenTo(this.model, 'change:imagingMessage', this.imagingMessageChanged);
        return this;
    },
    render: function () {
        var that = this;
        this.cacheBusterStr = Utility.getCacheBusterStr('&');
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.setupMenu(ro);
        var nativeViewerIframe = this.$el.find('iframe').first();
        $(nativeViewerIframe).unbind('mousewheel');
        $(nativeViewerIframe).bind('mousewheel', function (event, delta, deltaX, deltaY) {
            var mouseWheelBehavior = Utility.GetUserPreference('mouseWheelBehavior') || 'zoom';
            if (mouseWheelBehavior === 'scroll') {
                that.mouseWheelScroll(event, delta);
            }
        });
        this.$el.find('input[name="currentPage"]').numeric({ negative: false, decimal: false, max: ro.totalItems, min: 1 });
        return this;
    },
    cleanupMenuView: function () {
        if (this.menuView) {
            this.menuView.close();
            this.menuView = undefined;
        }
    },
    close: function () {
        this.cleanupMenuView();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var cis = this.model.getDotted('DocumentPackage.ContentItems');
        var ro = {
            loaded: !!cis,
            currentItem: this.model.getCurrentPage(this.viewerType),
            totalItems: cis ? cis.length : 0,
            renderingMessage: this.model.get('imagingMessage') || '',
            renderingTitle: this.model.get('imagingMessage') ? 'title="' + this.model.get('imagingMessage') + '"' : '',
            source: Constants.Url_Base + 'Content/images/transparent.png',
            canDownload: true,
            typeNotSupported: false,
            iframeClass: 'fullIframe'
        };

        var dqEntries = this.model.get('DQEntries');
        if (dqEntries) {
            var imaging = dqEntries.getImagingEntry();
            if (imaging) {
                ro.renderingMessage = Constants.c.asyncImagingInProgress;
                ro.renderingTitle = 'title="' + Constants.c.asyncImagingInProgress + '"';
            }
        }

        var mimeType = this.model.getMimeType(ro.currentItem - 1);
        ro.typeNotSupported = !Utility.detectMimeTypes(mimeType);
        ro.canDownload = this.model.hasRights(Constants.sp.Export_Output);

        if (ro.typeNotSupported && ro.canDownload) {
            ro.typeNotSupported = true;
            ro.iframeClass = 'iconIframe';
            ro.source = Constants.Server_Url + '/GetFile.ashx?functionName=GetImage' +
                '&versionId=' + this.model.versionId() +
                '&pageNum=' + ro.currentItem +
                '&redacted=false&annotated=false&isNative=true' + this.cacheBusterStr;
        } else if (ro.canDownload) {
            var ci = cis.at(ro.currentItem - 1);
            if (mimeType === 'text/plain') {
                // If mimetype is plain text make the native viewer iframe's background white
                ro.iframeClass += ' whiteBG';
            }
            ro.source = this.getDownloadUrl(ci);
        }
        return ro;
    },
    setupMenu: function (ro) {
        this.cleanupMenuView();
        if (ro.loaded && !window.isGuest) {
            this.menuView = new DocumentViewerMenuView({ model: this.model, viewerType: Constants.vt.Native });
            var $vm = this.$el.find('.view_menu');
            $vm.html(this.menuView.render().$el);
        }
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
    setCurrentPage: function (pageNumber) {
        var cis = this.model.getDotted('DocumentPackage.ContentItems');
        pageNumber = InputUtil.textRangeCheck(1, cis.length, pageNumber);
        var currentPage = this.model.getCurrentPage(this.viewerType);
        if (currentPage === pageNumber) {
            return; //already on this page.
        }
        this.model.set('currentPage', pageNumber);
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
    mouseWheelScroll: function (event, delta) {
        var that = this;
        if (delta === 1) {
            that.prevPage(event);
        }
        else if (delta === -1) {
            that.nextPage(event);
        }
        return false;
    }
});