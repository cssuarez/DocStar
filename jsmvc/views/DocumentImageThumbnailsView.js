var DocumentImageThumbnailsView = Backbone.View.extend({
    renderTries: 0,
    model: null, // BulkViewerDataPackageCPX
    ciViews: null, // collection of DocumentImageThumbnailsView
    className: 'DocumentImageThumbnailsView',
    setCacheBusterString: false,    // Whether to add a cache buster string when loading thumbnails
    ctMenu: undefined,
    events: {
        "mouseup .thumbs_cont": "scrollThumbs",
        "mousewheel .thumbs_cont": "scrollThumbs",
        "click .DocumentImageThumbnailView img": "selectThumb"
    },
    initialize: function (options) {
        this.ciViews = [];
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('documentimagethumbnailslayout'));
        var that = this;
        this.setCacheBusterString = true;   // When this class is initially created, have every thumbnail refetched - it may have changed since last load.
        this.listenTo(this.model, 'change:thumbnails', function (model, value, options) {
            if (value === 'thumbnailleft') {
                that.showThumbsLeft();
            }
            else if (value === 'thumbnailright') {
                that.showThumbsRight();
            }
            else {
                that.showHideThumbnails();
            }
        });
        this.listenTo(window.userPreferences, 'change', function (model, value, options) {
            var key = model.get('Key');
            if (key === 'thumbnails') {
                if (model.get('Value') === 'thumbnailleft') {
                    that.showThumbsLeft();
                }
                else if (model.get('Value') === 'thumbnailright') {
                    that.showThumbsRight();
                }
                else {
                    that.showHideThumbnails();
                }
            }
        });
        this.listenTo(window.userPreferences, 'reset', this.showHideThumbnails);
        this.listenTo(this.model, 'change:currentPage', function (model, value, options) {
            var pageInfo = this.model.get('DocumentPackage').findPage(value);
            if (!pageInfo) {
                return;
            }
            if (pageInfo.pdto) {
                pageInfo.pdto.set('selected', true);
            }
            else if (pageInfo.ci) {
                pageInfo.ci.set('selected', true);
            }
        });
        this.listenTo(this.model.getDotted('DocumentPackage.Pages'), 'change:selected', function (model, value, options) {
            var pageNum = model.get('TruePageNumber');
            var $thumb = this.$el.find('#thumb_' + pageNum);
            var $contentItem = this.$el.find('.contentItem').has($thumb);
            if (value) {
                $contentItem.addClass('selectedContentItem');
            }
            else {
                // Deselect content items
                $contentItem.removeClass('selectedContentItem');
            }
        });
        this.listenTo(this.model.getDotted('DocumentPackage.ContentItems'), 'change:selected', function (model, value, options) {
            var selectedCIClass = 'selectedContentItem';
            var selectedThumbClass = 'selected_thumbnail';
            var pageNum = this.model.get('DocumentPackage').getPageNumber(model);
            var $thumb = this.$el.find('#thumb_' + pageNum);
            var $contentItem = this.$el.find('.contentItem').has($thumb);
            if (value) {
                $contentItem.addClass(selectedCIClass);
                $thumb.addClass(selectedThumbClass);
            }
            else {
                $contentItem.removeClass(selectedCIClass);
                $thumb.removeClass(selectedThumbClass);
            }
        });
        this.listenTo(this.model.get('DocumentPackage'), 'change:selectedThumbs', function (model, value, options) {
            if (!options.ignoreChange) {
                var ev = new $.Event();
                var lastSelectedPage = this.model.get('DocumentPackage').getLastSelectedPage();
                ev.currentTarget = this.$el.find('#thumb_' + lastSelectedPage);
                this.selectThumb(ev, true);
            }
        });
        this.listenTo(this.model.getDotted('DocumentPackage.Pages'), 'reset', function (collection, options) {
            if (!options.ignoreChange && options.method !== 'read') {
                this.render();
            }
        });
        this.listenTo(this.model.getDotted('DocumentPackage.ContentItems'), 'reset', function (collection, options) {
            if (!options.ignoreChange && options.method !== 'read') {
                this.render();
            }
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var thumbPref = Utility.GetUserPreference('thumbnails');
        var ro = {
            displayThumbnails: thumbPref && (thumbPref === 'thumbnailright' || thumbPref === 'thumbnailleft')
        };
        ro.thumbnailsPreference = thumbPref;
        return ro;
    },
    render: function () {
        this.cleanupChildViews();
        $('body').off('DocumentImageThumbnailsViewRendered');
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        if (ro.displayThumbnails) {
            var truePageOffset = 1;
            var idx = 0;
            var cis = this.model.getDotted('DocumentPackage.ContentItems');
            var ciLen = cis.length;
            for (idx; idx < ciLen; idx++) {
                var ci = cis.at(idx);
                var ciPages = this.model.getContentItemPages(ci.get('Id'));
                var ciView = new DocumentImageContentItemThumbnailsView({
                    model: this.model,
                    contentItem: ci,
                    truePageOffset: truePageOffset, // true page number of first page (needed when there are no pages for this ci)
                    pages: ciPages,
                    displaySeparator: ciLen > 1 && idx !== ciLen - 1 // identifies position of <hr>, which is after every ci except the last (if there is more than one)
                });
                truePageOffset += (ciPages.length || 1);
                this.$el.find('.thumbs_cont .vert_scroll').append(ciView.render().$el);
                this.ciViews.push(ciView);
            }

            var that = this;
            $('body').on('DocumentImageThumbnailsViewRendered', function () {
                if (that.$el.find(".thumbs_cont").is(':visible') && ro.displayThumbnails) {
                    var $selThumb = that.$el.find('#thumb_' + that.model.getCurrentPage());
                    var ev = new $.Event();
                    ev.currentTarget = $selThumb;
                    if ($selThumb.length > 0) {
                        that.scrollToSelectedThumb($selThumb);
                        that.selectThumb(ev, true);
                    }
                    that.$el.find('.thumbs_cont').perfectScrollbar({
                        wheelSpeed: 40,
                        wheelPropagation: true,
                        minScrollbarLength: 20,
                        useKeyboard: false
                    });
                    $('body').off('DocumentImageThumbnailsViewRendered');
                }
                else {
                    setTimeout(function () {
                        $('body').trigger('DocumentImageThumbnailsViewRendered');
                    }, 100);
                }
            });
            this.setupContextMenu();
            this.delegateEvents(this.events);
            $('body').trigger('DocumentImageThumbnailsViewRendered');
        }
        return this;
    },
    cleanupChildViews: function () {
        var civ = this.ciViews.pop();
        while (civ) {
            civ.close();
            civ = undefined;
            civ = this.ciViews.pop();
        }
    },
    close: function () {
        if (this.ctMenu) {
            ContextMenu.destroy(this.ctMenu);
            this.ctMenu = null;
        }
        this.cleanupChildViews();
        this.unbind();
        this.remove();
    },
    setupContextMenu: function () {
        var that = this;
        var $thumbContainSelector = this.$el.find('div[name="image_thumbnails_container"]');
        // TODO: scain enforce content permissions, do not allow page options if the user doesn't have content editing permissions, same goes for page options dropdown menu
        var thumbOptions = {
            width: 150,
            items: [
                {
                    text: Constants.c.reorderPages, icon: "", alias: "reorderPages",
                    action: function (target) {
                        that.reorderPages(null, target);
                    }
                },
                {
                    text: Constants.c.deletePages, icon: "", alias: "deletePages",
                    action: function (target) {
                        that.deletePages(null, target);
                    }
                },
                {
                    text: Constants.c.burstContentItem, icon: "", alias: "burstContentItem",
                    action: function (target) {
                        that.burstContentItem(null, target);
                    }
                },
                {
                    text: Constants.c.splitDocument, icon: "", alias: "splitContent",
                    action: function (target) {
                        that.splitDocument(null, target);
                    }
                }
            ],
            id: $thumbContainSelector.find('img'), // Selector for thumb's img tag
            alias: 'pageOptionsCMRoot',
            onContextMenu: function (event) {
                // this: context menu target (thumbnail)
                var id = this.id;   // obtain id of the target thumbnail
                // If the thumbnail is not already selected select it
                var selectedThumbs = that.model.get('DocumentPackage').getSelectedThumbs();
                if (selectedThumbs.indexOf(id) === -1) {
                    that.selectThumb(event, true);
                }
                // whether or not to show the context menu (we always want to show it so return true)
                return true;
            },
            onShow: function (menuHandle) {
                // menuHandle: a html element representing the root menu (has id of the alias specified above as 'pageOptionsCMRoot')
                // TODO: add in any functionality for when the menu gets shown, and it will be called here
                ShowHideUtil.toggleNativeViewer(true);
            },
            onHide: function (menuHandle) {
                ShowHideUtil.toggleNativeViewer(false);
            },
            namespace: 'ctxMenu' + this.cid
        };
        if (this.ctMenu) {
            ContextMenu.destroy(this.ctMenu);
        }
        this.ctMenu = ContextMenu.init(thumbOptions);
    },
    //#region Show/Hide Thumbnails
    showThumbsLeft: function (event, noScroll) {
        var userPref = Utility.GetUserPreference('thumbnails');
        Utility.SetUserPreferenceWithoutAjax('thumbnails', 'thumbnailleft');
        this.render();
        if (userPref !== 'thumbnailleft') {
            Utility.SetSingleUserPreference('thumbnails', 'thumbnailleft');
        }
    },
    showThumbsRight: function (event, noScroll) {
        var userPref = Utility.GetUserPreference('thumbnails');
        Utility.SetUserPreferenceWithoutAjax('thumbnails', 'thumbnailright');
        this.render();
        if (userPref !== 'thumbnailright') {
            Utility.SetSingleUserPreference('thumbnails', 'thumbnailright');
        }
    },
    showHideThumbnails: function (event, noResizeViewer, sel) {
        var userPref = Utility.GetUserPreference('thumbnails');
        Utility.SetUserPreferenceWithoutAjax('thumbnails', 'thumbnailoff');
        this.render();
        if (userPref !== 'thumbnailoff') {
            Utility.SetSingleUserPreference('thumbnails', 'thumbnailoff');
        }
    },
    //#endregion Show/Hide Thumbnails

    //#region Navigate Thumbnails
    scrollToSelectedThumb: function ($thumb, noScroll) {
        if (noScroll) {
            return;
        }
        var page = 1;
        if ($thumb.length > 0 && $thumb.attr('id')) {
            page = $thumb.attr('id').split('_')[1];
            this.scrollToSelectedThumbByPage(page - 1);
        }
    },
    scrollToSelectedThumbByPage: function (page) {
        // To scroll to the one above the page (so it loads and so it doesn't cut half of it off from the throbber being too small)
        var that = this;
        var $contSel = this.$el.find('.thumbs_cont');
        if (parseInt(page, 10) <= 1) {
            $contSel.animate({
                scrollTop: 0
            }, 1000, function () { that.scrollThumbs(); });
        }
        else {
            var $thumbSel = $('#thumb_' + page);
            $contSel.animate({
                scrollTop: $thumbSel.offset().top - $contSel.offset().top + $contSel.scrollTop()
            }, 1000, function () { that.scrollThumbs(); });
        }
    },
    canNavigateUsingThumb: function (selThumb, page) {
        if (!selThumb && page) {
            selThumb = this.$el.parent().find('#thumb_' + page);
        }
        return selThumb && selThumb.length > 0 && this.$el.find('.thumbs_cont').is(':visible');
    },
    selectSingleThumbFromPage: function (page, performSelect) {
        var selThumb = this.$el.parent().find('#thumb_' + page);    // Find thumbnail corresponding to viewer
        var canNavigate = this.canNavigateUsingThumb(selThumb);
        if (canNavigate) {
            var ev = new $.Event();
            ev.currentTarget = selThumb;
            this.selectThumb(ev, performSelect);
            // Scroll to selected thumbnail when paging
            this.scrollToSelectedThumbByPage(page);
        }
    },
    selectThumb: function (event, performSelect) {
        if (event && event.type === 'click') {
            performSelect = true;
        }
        var docPkg = this.model.getDotted('DocumentPackage');
        var pages = docPkg.get('Pages');
        var contentItems = docPkg.get('ContentItems');

        // Remove selected flags from both the pages collection and the content items collection
        // They will be re-selected below
        pages.clearSelected();
        contentItems.clearSelected();

        var selThumb = $(event.currentTarget).attr('id');
        var selectedThumbs = docPkg.getSelectedThumbs();
        var currentlySelectedThumb = selectedThumbs.length > 0 ? selectedThumbs[selectedThumbs.length - 1] : $(this.el).find('.selected_thumbnail').attr('id');

        var ctrlKeyPressed = event.ctrlKey;
        var shiftKeyPressed = event.shiftKey;
        if ((selThumb === currentlySelectedThumb && !ctrlKeyPressed && !shiftKeyPressed && !performSelect)) {
            return;
        }
        var that = this;
        var length = selectedThumbs.length;
        var isSelected = false;
        var i = 0;
        if (length === 0) {
            selectedThumbs.push(this.$el.find('img').first());
        }
        // Ctrl-key is being pressed
        if (ctrlKeyPressed) {
            // Determine if the thumbnail is already selected
            for (i = 0; i < length; i++) {
                // clicked thumbnail is selected
                if (selectedThumbs[i] === selThumb) {
                    // Remove from selected
                    isSelected = true;
                    break;
                }
            }
            if (length === 0 || !isSelected) {
                // If thumb is not selected select it, and view it
                selectedThumbs.push(selThumb);
            }
            else if (isSelected) {
                // If clicked thumb is selected: 
                // unselect it
                // make the previously last selected thumb the last selected thumb and view it (unless the clicked thumb is the only thumb selected)
                if (length > 1) {
                    selectedThumbs.splice(i, 1);
                    length--;
                }
                selThumb = selectedThumbs[length - 1];
            }
        }
        else if (shiftKeyPressed) {
            // Shift-key is being pressed
            // Find the first selected thumbnail page num and all the ones in between the clicked thumbnail
            // Select all of the pages between the first selected thumbnail and the clicked thumbnail
            var lastPageNum = typeof selectedThumbs[0] === 'string' ? selectedThumbs[0].split('_')[1] : selectedThumbs[0];
            lastPageNum = parseInt(lastPageNum, 10);
            var selPageNum = parseInt(selThumb.split('_')[1], 10);
            var shiftThumbs = ['thumb_' + lastPageNum];
            if (selPageNum < lastPageNum) {
                // Selecting a lower page from a higher page (eg. Page 3 is selected, Page 1 is the current Target)
                // Need to add in order from lastPageNum to selPageNum
                for (i = lastPageNum - 1; i >= selPageNum; i--) {
                    shiftThumbs.push('thumb_' + i);
                }
            }
            else if (lastPageNum < selPageNum) {
                // Selecting a higher page from a lower page (eg. Page 1 is selected, Page 3 is the current target)
                // Need to add in order from selPageNum to lastPageNum
                for (i = lastPageNum + 1; i <= selPageNum; i++) {
                    shiftThumbs.push('thumb_' + i);
                }
            }
            selectedThumbs = shiftThumbs;
        }
        else if (selThumb) {
            // No Ctrl-key or Shift-key being pressed, then deselect everything else and only select the clicked thumbnail
            selectedThumbs = [selThumb];
        }
        else { //we came from a change page event so just use the data in the model.
            selThumb = selectedThumbs[0];
        }

        // Obtain page number from last selected thumb (last item in selectedThumbs), calculated above
        pageNum = selThumb.split('_')[1];
        that.scrollToSelectedThumb(this.$el.find('#' + selThumb));
        if (performSelect) {
            that.model.setCurrentPage(pageNum);
        }
        // Select all thumbs located in selectedThumbs
        length = selectedThumbs.length;
        for (i = 0; i < length; i++) {
            var selectedThumb = selectedThumbs[i];
            var selThumbPageNum = selectedThumb.split('_')[1];
            var pageInfo = docPkg.findPage(selThumbPageNum);
            if (pageInfo) {
                if (pageInfo.pdto) {
                    pageInfo.pdto.set('selected', true);
                }
                else if (pageInfo.ci) {
                    pageInfo.ci.set('selected', true);
                }
            }
        }
        docPkg.set('selectedThumbs', selectedThumbs, { ignoreChange: true });
    },
    selectThumbAfterDelete: function (pageNumBeforeDelete, numDeletedPages) {
        pageNumBeforeDelete = parseInt(pageNumBeforeDelete, 10);
        if (isNaN(pageNumBeforeDelete)) {
            pageNumBeforeDelete = 1;
        }
        var ev = new $.Event();
        if ($('#thumb_' + pageNumBeforeDelete).length > 0) {
            // Reselect the new "current" page, the page that follows the last page selected
            // this may be invalid if the deleted page is the last page
            ev.currentTarget = $('#thumb_' + pageNumBeforeDelete);
        }
        else {
            // Search for previous page number
            var idx = 0;
            for (idx; idx < pageNumBeforeDelete; idx++) {
                var selPageNum = pageNumBeforeDelete - (idx + 1);
                var $selThumb = $('#thumb_' + selPageNum);
                if ($selThumb.length > 0) {
                    ev.currentTarget = $selThumb;
                    break;
                }
            }
            // This should never happen, but just in case.
            // If no other thumb is found for some reason, default to selecting the first
            if (!ev.currentTarget) {
                ev.currentTarget = $('#thumb_1');
            }
        }
        // Only select the thumb if there is a thumb that exists to be selected.
        if ($(ev.currentTarget).length > 0) {
            this.selectThumb(ev, true);
        }
    },
    //#endregion Navigate Thumbnails

    //#region Display Thumbnails In View
    showDocumentThumbnails: function (versionId) {
        if (!versionId) {
            versionId = this.model.versionId();
        }
        var that = this;
        var i = 0, j = 0;
        var selector = '#thumb_';
        var thumbVisible = [];
        var diffDoc = false;
        var elemVisible;
        var $thumbSelector = this.$el.find('div[name="image_thumbnails"]');
        if (versionId !== this.prevVersionId) {
            diffDoc = true;
        }
        this.prevVersionId = versionId;
        var numPage = this.model.get('DocumentPackage').getNumPages().pages;
        for (numPage; numPage >= 0; numPage--) {
            var $thumbSel = this.$el.find(selector + numPage);
            if ($thumbSel.attr('src') === Constants.Url_Base + 'Content/themes/default/throbber.gif') {
                elemVisible = that.loadThumbnailInView($thumbSel);
                if (elemVisible === true) {
                    thumbVisible.push(selector + numPage);
                }
                else {
                    if (thumbVisible.length > 0) {
                        break;
                    }
                }
            }
        }
        var cacheBusterString = this.setCacheBusterString ? Utility.getCacheBusterStr('&') : '';
        that.showThumb(thumbVisible, versionId, cacheBusterString);

    },
    scrollThumbs: function () {
        this.showDocumentThumbnails(this.model.versionId());
        this.$el.find('.thumbs_cont').perfectScrollbar('update');
    },
    loadThumbnailInView: function ($thumbSelector) {
        var $thumbContainSelector = this.$el.find('.thumbs_cont');
        var viewTop = Math.round($thumbContainSelector.offset().top); // top offset for viewport
        var viewBottom = viewTop + $thumbContainSelector.height();    // bottom offset for viewport
        var elemTop = $thumbSelector.offset().top + 15; // top offset of throbber from viewport (offset by part of the throbber height, so if its partially viewable, it will be shown)
        var elemBottom = elemTop + $thumbSelector.height();   // bottom offset of throbber from viewport
        return ((elemBottom > viewTop && elemBottom < viewBottom) && (elemTop < viewBottom && elemTop > viewTop));  // If throbber is wholly inside the viewport fetch the thumbnail
    },
    showThumb: function (thumbVisible, versionId, cacheBusterString) {
        var that = this;
        var $thumbContainSelector = this.$el.find('div[name="image_thumbnails_container"]');
        if (thumbVisible.length > 0) {
            cacheBusterString = cacheBusterString || '';
            var currVisThumb = thumbVisible.shift();
            var numPage = currVisThumb.split('_')[1];   // Get page number from thumbnail selector
            var info = this.model.get('DocumentPackage').findPage(numPage);
            var pdto;
            if (info && info.pdto) {
                pdto = info.pdto.toJSON();
            }
            var image = new Image();
            var src;
            var $thumbSel;
            $thumbSel = $thumbContainSelector.find(currVisThumb);
            if (pdto && pdto.Id) {
                // Display the icon for the selected rendered page
                $thumbSel.removeClass('notRendered');
                src = Constants.Server_Url + '/GetFile.ashx?functionName=GetThumbnailByIds' +
                    '&versionId=' + encodeURIComponent(versionId) + '&pageId=' + encodeURIComponent(pdto.Id) + cacheBusterString;
            }
            else {
                // Display the icon for the selected non-rendered page
                src = Constants.Server_Url + '/GetFile.ashx?functionName=GetThumbnail' +
                    '&versionId=' + encodeURIComponent(versionId) + '&pageNum=' + encodeURIComponent(numPage) + '&isNative=' + encodeURIComponent(true);
                $thumbSel.addClass('notRendered');
            }
            image.onload = function () {
                $thumbSel.attr('src', src);
                $thumbSel.removeClass('throbber');
                $thumbSel.removeAttr('height').removeAttr('width');
                that.showThumb(thumbVisible, versionId, cacheBusterString);
            };
            image.src = src;
        }
        else {
            this.setCacheBusterString = false;
        }
    },
    //#endregion Display Thumbnails

    //#region Page Options 
    ///<summary>
    /// Reorder documents pages
    /// <param name="event">event triggered to reorderPages</param>
    /// <param name="cmTarget">context menu DOM target</param>
    ///</summary>
    reorderPages: function (event, cmTarget) {
        this.model.get('DocumentPackage').reorderPages(PageOptionsDialogs.reorderPages);
    },
    ///<summary>
    /// Burst content items (making each page into its own content item)
    ///</summary>
    burstContentItem: function (event, cmTarget) {
        this.model.get('DocumentPackage').burstDocumentContentItems(PageOptionsDialogs.burstContentItems, this.model.get('isDirty'));
    },
    ///<summary>
    /// Delete the selected page(s) or entire document if all pages are selected
    ///</summary>
    deletePages: function () {
        var docPkg = this.model.get('DocumentPackage');
        var pageRanges = docPkg.getPageRangesFromSelectedThumbs(docPkg.getSelectedThumbs());
        // Check for a simple delete condition. If we are deleting all the pages then delete document.
        var cis = docPkg.get('ContentItems');
        var isNotRendered = cis.length === 1 && !cis.at(0).isRendered();    // document consists of a single content item that isn't rendered
        var fullRange = docPkg.isFullPageRange(pageRanges.actualSelectedPages, docPkg.get('Pages').length);
        if (fullRange || isNotRendered) {
            $('#action-message pre').text(String.format(Constants.c.deleteAllContent, '\r\n', Constants.c.continueYesNo)); // Bug 12025
            this.model.deleteDocument(SearchResultDialogs.deleteOrRemoveDialog);
        }
        else if (!pageRanges.burstRequired) {
            docPkg.deletePagesSimple(PageOptionsDialogs.deletePagesSimple);
        }
        else {
            docPkg.burstAndDeletePages(PageOptionsDialogs.burstAndDeletePages);
        }
    },
    splitDocument: function () {
        this.model.splitDocument(PageOptionsDialogs.splitDocument);
    },
    //#endregion Page Options
    //#region Event Handling
    changeSelection: function (ev) {
        var ctrlKeyPressed = ev.ctrlKey;
        var shiftKeyPressed = ev.shiftKey;
    }
    //#endregion Event Handling
});