var DocumentView = Backbone.View.extend({
    className: 'DocumentView',
    rendered: false,
    priorId: undefined,
    minViewerWidth: 500,
    metaView: undefined,
    viewerView: undefined,
    onSendDQSubscription: undefined,
    model: undefined, // BulkViewerDataPackageCPX
    hitsCache: { searchId: '', entityId: '', hits: '' },
    events: {
    },
    initialize: function (options) {
        return this.initView(options); //Also called by GuestDocumentView
    },
    initView: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentviewlayout'));
        this.model = new BulkViewerDataPackageCPX();
        this.listenTo(this.model, 'sync', this.modelSynced);
        this.listenTo(this.model, 'change:currentPage', this.setHash);
        this.listenTo(this.model, 'change:showDocumentHits', this.showDocHitsChanged);
        this.listenTo(this.model, 'change:showDocumentText', this.showDocTextChanged);
        this.listenTo(this.model, 'change:versionIds', this.render);
        this.listenTo(this.model, 'change:showMetaView', function (model, value, options) {
            this.setPanelSizes();
        });
        this.listenTo(this.model, 'change:CachedViewData', function (model, collection, options) {
            if (!model.get('CachedViewData') || model.get('CachedViewData').length === 0) {
                window.location.hash = $('body').data('referrer') || 'Home';
            }
        });
        this.listenTo(this.model, 'nextHit', this.nextHit);
        this.listenTo(this.model, 'prevHit', this.prevHit);
        this.listenTo(this.model, 'highlightAllHits', this.highlightAllHits);
        var that = this;
        if (window.CompanyInstanceHubProxy) {
            this.onSendDQSubscription = function (dqn) { that.onSendDQNotification(dqn); };
            window.CompanyInstanceHubProxy.onSendDQNotification(this.onSendDQSubscription);
        }
        this.listenTo(Backbone, 'customGlobalEvents:resize', function (options) {
            if (options && (options.windowResize || options.resizeDocumentView)) {
                if (!that.resizingPanels && (that.$el.find('.DocumentViewLeft').width() < 300 || that.$el.find('.DocumentViewRight').width() < 400)) {
                    that.setPanelSizes();
                }
                that.$el.find('.view_document_data_scroll').perfectScrollbar('update');
            }
        });
        return this;
    },
    render: function () {
        var that = this;
        if (!this.rendered) {
            this.docPagerView = new DocumentPagerView({ model: this.model });
            this.metaView = new DocumentMetaView({
                model: this.model,
                ctbPosition: {
                    my: 'left top',
                    at: 'left bottom',
                    of: this.$el.find('.DocumentViewRight .viewer_menubar').selector
                }
            });
            this.viewerView = new DocumentViewerView({ model: this.model });
            this.$el.html(this.compiledTemplate());
            this.$el.hide();
            setTimeout(function () {
                that.$el.show();
                that.setPanelSizes();
                that.$el.find('.view_document_data_scroll').perfectScrollbar('update');
            }, 4);

            this.$el.find('.DocumentViewLeft').html(this.docPagerView.render().$el);
            this.$el.find('.DocumentViewLeft').append(this.metaView.render().$el);
            this.$el.find('.DocumentViewRight').html(this.viewerView.render().$el);
            this.rendered = true;
            var isResizable = this.$el.find('.DocumentViewLeft').resizable('instance');
            if (isResizable) {
                this.$el.find('.DocumentViewLeft').resizable('destroy');
            }
            this.$el.find('.DocumentViewLeft').resizable({
                handles: 'e',
                minWidth: 300,
                maxWidth: this.$el.width() - 450,
                start: function (event, ui) {
                    that.resizingPanels = true;
                    ui.element.resizable('option', 'maxWidth', that.$el.width() - 450);
                    that.$el.find('.view_document_data_scroll .ps-scrollbar-y-rail').hide();
                },
                resize: function (event, ui) {
                    var marginLeft = ui.element.width() / that.$el.width() * 100 + '%';
                    that.$el.find('.DocumentViewRight').css('margin-left', marginLeft);
                },
                stop: function (event, ui) {
                    var percentWidth = ui.element.width() / that.$el.width() * 100;
                    ui.element.css('width', percentWidth + '%'); // set the width to a %
                    that.$el.find('.view_document_data_scroll .ps-scrollbar-y-rail').show();
                    that.$el.find('.view_document_data_scroll').perfectScrollbar('update');
                    Utility.SetSingleUserPreference('documentMetaPanelWidth', percentWidth);
                    Backbone.trigger('customGlobalEvents:resize', { resizeDocumentView: true });
                    that.resizingPanels = false;
                }
            });
        } else {
            this.docPagerView.render();
            this.metaView.render();
            this.viewerView.render();
        }
        var versionIds = this.model.get('versionIds');
        if (versionIds && versionIds.length > 1) {
            this.$el.find('.view_document_data_scroll').addClass('metaPanelWithPagerView');
        }
        return this;
    },
    close: function () {
        this.closeChildren();
        if (window.CompanyInstanceHubProxy) {
            window.CompanyInstanceHubProxy.onSendDQNotification(this.onSendDQSubscription, true); //Unsubscribe
        }
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    ///<summary>
    /// Called when switching from document view to results view as well as on close of the document view.
    ///</summary>
    closeChildren: function () {
        if (this.priorId && window.CompanyInstanceHubProxy) {
            window.CompanyInstanceHubProxy.leaveGroup(this.priorId);
        }
        this.closeViews();
    },
    load: function (options) {
        //Note: Pascal case property changes cause dirty flags to be set, so only set the pascal case if they are a real member of the server side object.
        this.model.set({
            Id: options.versionId,
            CachedViewData: undefined,
            CachedViewId: options.viewId,
            viewIndex: options.index || 1,
            currentPage: options.page || 1,
            versionIds: options.versionIds,
            inFormEdit: options.inFormEdit,
            searchResultId: options.searchResultId,
            accOverrides: options.accOverrides
        }, { silent: true });
        this.model.fetch({ currentPage: options.page });
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
            this.setHash();
            this.render();
        }
        this.model.resetInFormEdit();   // So when we page to the next document we will be in form edit mode if we should be - Bug 13811
    },
    viewByVersionIds: function (versionIds, inFormEdit, searchResultId) {
        this.load({ versionIds: versionIds, inFormEdit: inFormEdit, searchResultId: searchResultId });
    },
    viewResults: function (viewId, index, page, queryString) {
        var params = Utility.tryParseJSON(Utility.getURLParams('?' + queryString), true);
        var accOverrides = {};
        if (params[Constants.UtilityConstants.WF_LINK_ACTION] === Constants.UtilityConstants.WF_EMAIL_LINK) {
            var cup = Utility.GetUserPreference('wf_acc');
            if (cup) {
                cup = { pos: 6, val: 'open' };
            }
            cup.val = 'open';
            Utility.SetSingleUserPreference('wf_acc', cup);
        }
        var inFormEdit = true;
        if (Utility.GetUserPreference('formEditMode') !== undefined) {
            inFormEdit = Utility.convertToBool(Utility.GetUserPreference('formEditMode'));
        }
        this.load({ viewId: viewId, index: index, page: page, accOverrides: accOverrides, inFormEdit: inFormEdit });

    },
    closeViews: function () {
        this.rendered = false;
        if (this.viewerView) {
            this.viewerView.close();
            this.viewerView = undefined;
        }
        if (this.metaView) {
            this.metaView.close();
            this.metaView = undefined;
        }
    },
    setHash: function () {
        this.resetHighlightsToText();
        var cachedViewId = this.model.get('CachedViewId');
        var viewIndex = this.model.get('viewIndex') || 1;
        var page = this.model.get('currentPage') || 1;
        var hash = String.format('Retrieve/view/{0}/index/{1}/page/{2}', cachedViewId, viewIndex, page);

        Utility.navigate(hash, Page.routers.Retrieve, false, false);
    },
    onSendDQNotification: function (dqn) {
        //dqn = DQNotificationEventArgs
        if (!dqn || !this.rendered) {
            return;
        }
        if (dqn.DocumentId !== this.model.documentId()) {
            return;
        }
        if (this.model.get('syncActionExecuting') && Utility.hasFlag(Constants.dtfs.SyncAction, dqn.TaskType)) {
            this.model.set('syncActionNotification', dqn);
        } else {
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
                            var reloadFunc = function () {
                                that.model.fetch({
                                    success: function () {
                                        that.model.setImagingMessage(null);
                                    }
                                });
                            };
                            if (that.model.get('isDirty')) {
                                that.model.get('DocumentPackage').save(undefined, { success: reloadFunc });
                            } else {
                                reloadFunc();
                            }
                        }, 4000);
                    }
                    break;
                case Constants.dqnt.Progress:
                    if (Utility.hasFlag(Constants.dtfs.Imaging, dqn.TaskType)) {
                        this.model.setImagingMessage(String.format(Constants.c.asyncImagingProgress_T, dqn.PercentDone));
                    }
                    break;
                case Constants.dqnt.Debug:
                    //TODO: Future Dev
                    break;
            }
        }
    },
    setPanelSizes: function () {
        var percentWidth = parseInt(Utility.GetUserPreference('documentMetaPanelWidth'), 10);
        var showMetaPref = Utility.GetUserPreference('viewMeta');

        var $docViewerView = this.$el.find('.DocumentViewerView');
        if (showMetaPref) {
            showMetaPref = JSON.parse(showMetaPref);
        }
        if (showMetaPref && showMetaPref !== 'viewMeta') {
            percentWidth = 0;
            $docViewerView.addClass('metaPanelHidden');
        }
        else {
            var minWidth = 300;
            var minPercentWidth = minWidth / this.$el.width() * 100;  // Minimum / starting width of meta panel is 300 px - calculate % width based on this minimum
            // if no user preference for the width or if less than minimum width, set to minimum width
            if (isNaN(percentWidth) || !percentWidth || percentWidth <= minPercentWidth) {
                percentWidth = minPercentWidth;
            }
            $docViewerView.removeClass('metaPanelHidden');
        }
        this.$el.find('.DocumentViewLeft').css('width', percentWidth + '%');
        this.$el.find('.DocumentViewRight').css('margin-left', percentWidth + '%');
        this.$el.find('.view_document_data_scroll').perfectScrollbar('update');
    },


    //#region ContentTypeBuilder 
    //#endregion

    //#region Document Hits
    ///<summary>
    /// Obtain the next hit in the set of obtained hits, navigate to and highlight it
    ///</summary>
    nextHit: function () {
        if (this.gettingHit) {
            return;
        }
        this.gettingHit = true;
        var hitStart = this.getHitStartSelector();
        var hitEnd = this.getHitEndSelector();
        var endVal = parseInt(hitEnd.text(), 10);
        var val = parseInt(hitStart.text(), 10);
        this.toggleHitsText(false);
        // Increment hits counter, if max go to beginning
        if (++val > endVal) {
            val = 1;
        }
        hitStart.text(val);
        // Get the corresponding hit, highlight it for the user (open anything required for the user to see it)
        this.getHit(val);
    },
    ///<summary>
    /// Obtain the previous hit in the set of obtained hits, navigate to and highlight it
    ///</summary>
    prevHit: function () {
        if (this.gettingHit) {
            return;
        }
        this.gettingHit = true;
        var hitStart = this.getHitStartSelector();
        var hitEnd = this.getHitEndSelector();
        var endVal = parseInt(hitEnd.text(), 10);
        var val = parseInt(hitStart.text(), 10);
        this.toggleHitsText(false);
        // Decrement hits counter, if min go to end
        if (--val < 1) {
            val = endVal;
        }
        hitStart.text(val);
        // Get the corresponding hit, highlight it for the user (open anything required for the user to see it)
        this.getHit(val);

    },
    ///<summary>
    /// Highlight all hits in the set of obtained hits
    ///</summary>
    highlightAllHits: function (e) {
        if (this.gettingHit) {
            return;
        }
        var annoHighlights = this.getAnnoHighlights();
        // remove all annotation highlights before highlighting all
        annoHighlights.remove();
        this.gettingHit = true;
        this.toggleHitsText(true);
        var that = this;
        var cb = function (hits) {
            that.resetHighlightsToText();
            var len = hits.length;
            var i = 0;
            for (i; i < len; i++) {
                var hitNum = i + 1;
                that.getHit(hitNum, true, hits);
            }
        };
        this.getHits({ callback: cb });
    },
    ///<summary>
    /// Remove highlights from document text
    ///</summary>
    resetHighlightsToText: function () {
        var highlights = this.getHitHighlights();
        var docTextSel = this.getDocTextSelector();
        var docTextCont = docTextSel.find('.documentTextContent');
        var preSel = docTextCont.find('pre');
        var i = 0;
        var length = highlights.length;
        for (i = 0; i < length; i++) {
            var $highlightSel = $(highlights).eq(i);
            preSel.find($highlightSel).replaceWith($highlightSel.text());
        }
        highlights = this.getHitHighlights();
        highlights.removeClass('hitHighlight');
        var annoHighlights = this.getAnnoHighlights();
        annoHighlights.remove();
    },
    ///<summary>
    /// Obtain specified hit from the set of obtained hits
    ///</summary>
    getHit: function (hitNum, keepHighlight, hits) {
        hitNum--;
        var that = this;
        if (!keepHighlight) {
            this.resetHighlightsToText();
        }
        var currentPageNumber = parseInt(this.model.getCurrentPage(), 10);
        var cb = function (docHits) {
            var hit = docHits[hitNum];
            var docTextSel = that.getDocTextSelector();
            var docTextCont = docTextSel.find('.documentTextContent');
            var preSel = docTextCont.find('pre');
            if (hit) {
                var selector = hit.FieldName;
                var subStrs = hit.Hit.match(/<em>(.+?)<\/em>/ig);
                subStrs = _.uniq(subStrs);  // Filter out duplicates
                var highlightDocHitFunc = function (event) {
                    // If the hit is document text show the document text panel
                    that.model.set('showDocumentText', true, { ignoreChange: true });
                    docTextSel.show();
                    // Obtain text to be highlighted in the document text panel
                    var html = that.highlightSubstring(preSel, event.data.hitValue);
                    if (html) {
                        preSel.html(html);  // replace document text with a highlighted version of the document text
                        docTextCont.scrollTop(0);
                        var spanOffset = docTextCont.find('span').offset();
                        var docTextContOffset = docTextCont.offset();
                        if (spanOffset && docTextContOffset) {
                            var spanTop = spanOffset.top;
                            var docTextTop = docTextContOffset.top;
                            docTextCont.scrollTo(spanTop - docTextTop);
                        }
                    }
                    that.gettingHit = false;
                };
                var highlightAnnoHitFunc = function () {
                    if (that.viewerView && that.viewerView.currentViewer && that.viewerView.currentViewer.pzr) {
                        that.viewerView.currentViewer.pzr.fitImage();
                    }
                    // Get annotation Id
                    var annoId = that.getAnnoId(selector);
                    var currentPage = that.model.getCurrentPageInfo(currentPageNumber);
                    var annotations = currentPage ? currentPage.get('AnnotationCollection') : [];
                    var transformCont = that.$el.find('.transformCont');
                    // Obtain annotation matching the id
                    var annotationHit = annotations.get(annoId);
                    var rect = annotationHit.get('Rectangle');
                    // highlight annotation
                    transformCont.append($('<span></span>')
                        .width(rect.Width)
                        .height(rect.Height)
                        .addClass('annoHighlight')
                        .css({
                            'top': rect.Top,
                            'left': rect.Left
                        })
                    );
                    that.gettingHit = false;
                };
                var length = subStrs.length;
                var j = 0;
                for (j = 0; j < length; j++) {
                    var navigate = j === length - 1;
                    var subStr = subStrs[j];
                    var val = subStr.replace(/<em>/ig, '').replace(/<\/em>/ig, ''); // replace all <em> and </em> tags with ''
                    var accSelector;
                    var isDocText = false;
                    var pageNum = parseInt(that.model.getCurrentPage(), 10);
                    var setID = null;
                    var elem = '';
                    if (selector.match(/cfdocTxt/ig)) {   // Determine if document text
                        isDocText = true;
                        pageNum = that.getHitPage(selector);
                        if (keepHighlight && pageNum !== currentPageNumber) {
                            return;
                        }
                        $('body').bind('highlightHit', { hitValue: val }, highlightDocHitFunc); // The value is sent as event data instead of just the global variable to avoid a race condition.
                        //keepHighlight will prevent page navigation so when we highlight all we don't navigate to every page.
                        if (navigate) {
                            that.navigateToHitPage(!keepHighlight, pageNum);
                        }
                    }
                    else if (selector.match(/cfAnnoTxt/ig)) {
                        isAnnoText = true;
                        pageNum = that.getHitPage(selector);
                        if (keepHighlight && pageNum !== currentPageNumber) {
                            return;
                        }
                        $('body').bind('highlightHit', highlightAnnoHitFunc);
                        if (navigate) {
                            that.navigateToHitPage(!keepHighlight, pageNum);
                        }
                    }
                    else if (selector.indexOf(":") > -1) {
                        // If selector contains ':' then it is a "line item" (CFGroup) and the SetId is after ':'
                        var selectorParts = selector.split(":");
                        selector = selectorParts[0];
                        setID = selectorParts[1];
                        //Remove custom field's prefix and search for the line item
                        elem = that.$el.find('[data-setid="' + setID + '"] [data-encodedname="' + selector.substring(selector.indexOf("_") + 1) + '"]');
                    }
                    else {
                        // Maybe selector is for a custom field
                        var $cf = that.$el.find('.CustomFieldValueView').has('.' + selector);
                        var $cfDisplayVal = $cf.find('.cf_displayVal');
                        elem = $cfDisplayVal;
                        if (elem.length === 0) {
                            // Nope, it doesn't match a custom field

                            // Now, remove type prefix, if present, and compare to special/build-in fields
                            selector = selector.replace(/^cf[a-z]_/, '');
                            if (selector === Constants.UtilityConstants.DF_APPROVAL_COUNT) {    // isn't displayed anywhere as an actual count, only in list form, navigate to approvals tab
                                that.focusApprovals();
                                accSelector = that.$el.find('[data-accid="hist_acc"]').siblings('.meta_accordion_title');
                            }
                            else if (selector === Constants.UtilityConstants.DF_APPROVAL_REQUESTS) {    // requested approval hit, by UserId, navigate to approvals tab
                                that.focusApprovals();
                                accSelector = that.$el.find('[data-accid="hist_acc"]').siblings('.meta_accordion_title');
                                //elem = $('#' + val);  //TODO: scain highlight requested approval?
                            }
                            else if (selector === Constants.UtilityConstants.DF_APPROVALS_REQUIRED) {   // isn't displayed anywhere in meta panel, navigate to approvals tab
                                that.focusApprovals();
                                accSelector = that.$el.find('[data-accid="hist_acc"]').siblings('.meta_accordion_title');
                            }
                            else if (selector === Constants.UtilityConstants.DF_APPROVALS_STRINGS) {    // navigate to approvals tab
                                that.focusApprovals();
                                accSelector = that.$el.find('[data-accid="hist_acc"]').siblings('.meta_accordion_title');
                            }
                            else {  // a property of the document or a property of workflow i.e.  workflow name, title...
                                var docFieldName = selector;
                                elem = that.$el.find('.' + docFieldName);
                                if (selector === Constants.UtilityConstants.DF_FOLDERID) {
                                    elem = elem.find('#' + val + '_folds');
                                }
                            }
                        }
                    }
                    if (elem) {
                        if (!accSelector) { // Find accordion to open and scroll to
                            accSelector = that.$el.find('.meta_accordion_title').has(elem);
                        }
                        if (accSelector.length > 0) {  // Scroll to the element being highlighted, open the accordion containing the hit
                            accSelector.scrollTo(elem);
                            var $metaScrollContainer = that.$el.find('.view_document_data_scroll');
                            $metaScrollContainer.scrollTop(0);   // Maintain starting point at the top
                            that.triggerAccordionClick(accSelector);
                            $metaScrollContainer.scrollTop(accSelector.offset().top - $metaScrollContainer.offset().top - 25);  // scroll to the accordion containing the element                
                        }
                        $(elem).addClass('hitHighlight');
                        $(elem).closest('li').find('div.cf_displayVal').focus();
                    }
                    if (!isDocText) {
                        that.gettingHit = false;    // allow clicking next / previous again
                    }
                }
            }
        };
        if (hits) {
            cb(hits);
        }
        else {
            this.getHits({ callback: cb });
        }
    },
    ///<summary>
    /// Obtain page number to which the hit refers
    ///<param name="selector">contains the page number of the hit</param>
    ///</summary>
    getHitPage: function (selector) {
        var tmpNum = parseInt(selector.match(/[0-9]+/ig)[0], 10);
        var pageNum = this.pageNum;
        if (!isNaN(tmpNum)) {
            pageNum = tmpNum;
        }
        return pageNum;
    },
    ///<summary>
    /// Navigate to the page that contains the hit (i.e. document text / annotation text)
    ///</summary>
    navigateToHitPage: function (canNavigate, pageNum) {
        var currentPage = parseInt(this.model.getCurrentPage(), 10);
        pageNum = parseInt(pageNum, 10);
        if (canNavigate && currentPage !== pageNum) {
            this.model.setCurrentPage(pageNum);
        }
        else if (currentPage === pageNum) {    // If the page is the same, trigger event to highlight the hit
            $('body').trigger('highlightHit');
            $('body').unbind('highlightHit');
        }
    },
    ///<summary>
    /// Obtain the id of the annotation to which the hit refers
    ///<param name="selector">contains the annotation id to return</param>
    ///</summary>
    getAnnoId: function (selector) {
        var id = selector.match(/ID(.+?)\:/ig)[0];
        id = id.replace('ID', '').replace(':', '');
        return id;
    },
    triggerAccordionClick: function (accSelector) {
        if (accSelector.hasClass('meta_accordion_title_closed')) {
            $(accSelector).click();
        }
    },
    focusApprovals: function () {
        // open tabs if need be (i.e. approvals)
        this.$el.find('.wfTab[data-chattype="approvals"]').click();
    },
    ///<summary>
    /// Obtain Document Hits
    ///<param name="options"></param>
    ///</summary>
    getHits: function (options) {
        var that = this;
        var getHitsOpts = {
            fetch: options.fetch,
            callback: options.callback
        };
        this.model.getDocumentHits(getHitsOpts);
    },
    showDocHitsChanged: function (model, value, options) {
        if (options.ignoreChange) {
            return;
        }
        if (value) {
            //Stop editing annotations if we were prior.
            if (this.viewerView.currentViewer.viewerType === Constants.vt.Image) {
                var annoView = this.viewerView.currentViewer.annotationView;
                annoView.endEditAnnotations();
            }
        }
        if (value) {
            this.showDocHits();
        }
        else {
            var docNav = this.getDocNavSelector();
            var highlights = this.getHitHighlights();
            var annoHighlights = this.getAnnoHighlights();
            docNav.hide();
            highlights.removeClass('hitHighlight');
            annoHighlights.remove();
        }
    },
    showDocHits: function () {
        // show document text navigator and document text
        var that = this;
        var docNav = this.getDocNavSelector();
        var $hitStart = this.getHitStartSelector();
        var $hitEnd = this.getHitEndSelector();
        var cb = function (hits) {
            if (hits) {
                if (hits.length > 0) {
                    that.toggleHitsText(false);
                    $hitStart.text(1);
                    $hitEnd.text(hits.length);
                    that.getHit(1);
                }
                else {
                    that.toggleHitsText(false);
                    $hitStart.text(0);
                    $hitEnd.text(hits.length);
                }
            }
            docNav.show();
        };
        if (this.model.get('showDocumentHits')) {
            this.getHits({ fetch: true, callback: cb });
        }
    },
    showDocTextChanged: function (model, value, options) {
        if (options.ignoreChange) {
            return;
        }
        var docText = this.getDocTextSelector();
        if (value) {
            this.showDocText();
        }
        docText.toggle(value);
    },
    ///<summary>
    /// Display Document Text panel, containing the currently viewed pages Document Text, if there is document text to display
    ///</summary>
    showDocText: function () {
        // show document text
        if (this.model.get('showDocumentText')) {
            var info = this.model.get('DocumentPackage').findPage(this.model.getCurrentPage());
            var docTextSel = this.getDocTextSelector();
            var docTextCont = docTextSel.find('.documentTextContent pre');
            var docText = '';
            if (info && info.pdto) {    // Get Document Text for the current page (when paging set doc text)
                docText = info.pdto.get('Text') || '';
            }
            docTextCont.text(docText);
        }
    },
    ///<summary>
    /// Hide document text navigator
    ///</summary>
    closeDocHits: function () {
        this.model.set('showDocumentHits', false);
    },
    ///<summary>
    /// Hide document text
    ///</summary>
    closeDocText: function () {
        this.model.set('showDocumentText', false);
    },
    ///<summary>
    /// Toggle display of hits navigation text
    ///</summary>
    toggleHitsText: function (showAll) {
        var docNav = this.getDocNavSelector();
        var hitText = docNav.find('.hitText');
        var hitCounters = docNav.find('.hitCounters');
        if (showAll) {  // when highlighting all hits
            hitCounters.hide();
            hitText.text(Constants.c.showingAllHits);
        }
        else {
            hitCounters.show();
            hitText.text(Constants.c.showingHit);
        }
    },
    ///<summary>
    /// Obtain selector for Document Hit Navigation 'Start'
    ///</summary>
    getHitStartSelector: function () {
        return this.$el.find('.hitStart');
    },
    ///<summary>
    /// Obtain selector for Document Hit Navigation 'End'
    ///</summary>
    getHitEndSelector: function () {
        return this.$el.find('.hitEnd');
    },
    ///<summary>
    /// Obtain selector for Document Hit Navigation
    ///</summary>
    getDocNavSelector: function () {
        return this.$el.find('.documentNavigator');
    },
    ///<summary>
    /// Obtain selector for Document Text Container
    ///</summary>
    getDocTextSelector: function () {
        return this.$el.find('.documentText');
    },
    ///<summary>
    /// Obtain highlighted document hits (excluding annotations)
    ///</summary>
    getHitHighlights: function () {
        return this.$el.find('.hitHighlight');
    },
    ///<summary>
    /// Obtain highlighted annotations hits
    ///</summary>
    getAnnoHighlights: function () {
        return $('.annoHighlight');
    },
    ///<summary>
    /// Highlight a substring within document text
    ///<param name="element">html element containing the substring to be highlighted</param>
    ///<param name="val">substring to look for in element to be highlighted</param>
    ///</summary>
    highlightSubstring: function (element, val) {
        var str = $(element).html();
        var regEx = new RegExp('(<span (.+?)>' + val + '<\/span>)', 'g');
        str = str.replace(regEx, val);  // remove all duplicate highlights, so we don't get nested highlighting
        var highlightRegEx = new RegExp(val, 'gi'); // gi for global and case insensitive
        str = str.replace(highlightRegEx, '<span class="hitHighlight">$&</span>'); // add highlights to matched values. ($& instead of just val to use the original text with the original case distribution)
        return str;
    },
    //#endregion Document hits

    //#region URL Integration 
    setData: function (query, autoAction) {
        // Used to take in a query string and set metadata OR workflow data
        // query: data used to fill out metadata OR workflow panel (in the form of a JSON string)
        // autoAction: save metadata after setting it OR progress to next step in workflow OR to next workflow item               
        var param, params, i, length;
        var isInWorkflow = this.model.isInWorkflow(true);
        //TODO: scain have the ability to append to a field i.e. Keywords is "hello", i want it to be "hellokitty", ?Keywords+=kitty (to append value)
        if (query) {
            params = JSON.parse(query);
        }
        // Determine if it is the meta panel OR workflow panel that needs to be set        
        // Loop over parameters
        var wfParamFound = false;   // whether a wf parameter was found, if not don't submit values for the workflow panel
        for (param in params) {
            if (params.hasOwnProperty(param)) {
                var isArray = $.isArray(params[param]);
                length = isArray ? params[param].length : 1;    // Allow for setting multiple data, e.g. Add to two Folders
                for (i = 0; i < length; i++) {
                    var value = isArray ? params[param][i] : params[param]; // Take i-th array item or take the entire thing if it isn't an array
                    if (param.match(/Workflow\./ig)) {
                        if (isInWorkflow) {
                            var tmp = this.metaView.workflowView.wfURLPush(param, value);
                            if (!wfParamFound) {
                                wfParamFound = tmp;
                            }
                        }
                    }
                    else {
                        this.metaURLPush(param, value);
                    }
                }
            }
        }
        // Reset URL so another push can be performed.
        // Remove the /metadata/?        
        var metaDataRegEx = new RegExp('/metadata', 'ig');
        if (window.location.hash.split(metaDataRegEx).length > 1) {   // /metadata/?{&...n} is still present, set hash, otherwise hash has updated on its own
            Utility.navigate(window.location.hash.split(metaDataRegEx)[0], Page.routers.Retrieve, false, false);
        }
        if (autoAction) {
            if (autoAction.toLowerCase() === 'go') {
                // Check if workflow data needs to be submitted
                var submitWf = isInWorkflow && wfParamFound;
                if (submitWf) { // workflow is enabled in the meta panel
                    // submit workflow
                    this.metaView.workflowView.wfUIPromptSubmitClick();
                }
            }
            else if (autoAction.toLowerCase() === 'sync') {
                // Check to make sure the Content Type of the document contains a Sync Action to be executed
                if (this.model.hasSyncAction()) {
                    this.metaView.fieldView.executeSyncAction();
                }
            }
        }
    },
    metaURLPush: function (param, value) {
        var that = this;
        // Set each parameter in workflow panel or in meta panel
        if (param === 'Folders') {  // Perform an Add To finding the folder with the param path
            value = value.replace(/\\/ig, '/');   // replace all \ with /
            var folderProxy = FolderServiceProxy();
            var sf = function (folder) {
                if (folder) {   // If the folder is found
                    var folders = that.model.getDotted('DocumentPackage.Folders');
                    folders.add({
                        EffectivePermissions: folder.EffectivePermissions,
                        Id: folder.Id,
                        Name: folder.Path
                    });
                }
            };
            var ff = function (xhr, statusText, error) {
                ErrorHandler.popUpMessage(error);
            };
            var getFoldByPathPkg = {
                Path: value,
                Split: '/'
            };
            folderProxy.getByPath(getFoldByPathPkg, sf, ff);
        }
        else if (param.match(/Fields/ig)) { // Fill out / create custom fields that correspond to the passed in Field.(value)
            var cfs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
            cfs.addOrReplaceValue(param.split('.')[1], value);
        }
        else {
            var lparam = param.toLowerCase();
            switch (lparam) {
                case 'title':
                    this.model.setDotted('DocumentPackage.Version.Title', value);
                    break;
                case 'keywords':
                    this.model.setDotted('DocumentPackage.Version.Keywords', value);
                    break;
                case 'inbox':
                    var inbox = window.slimInboxes.getByNameOrId(value);
                    if (inbox) {
                        this.model.setDotted('DocumentPackage.Inbox', { EffectivePermissions: inbox.get('EffectivePermissions'), Id: inbox.get('Id'), Name: inbox.get('Name') });
                    }
                    break;
                case 'contenttype':
                    var ct = window.contentTypes.getByNameOrId(value);
                    if (ct) {
                        this.model.setDotted('DocumentPackage.Document.ContentTypeId', ct.get('Id'));
                        this.model.setDotted('DocumentPackage.Document.ContentTypeName', ct.get('Name'));
                    }
                    break;
                case 'securityclass':
                    var sc = window.slimSecurityClasses.getByNameOrId(value);
                    if (sc) {
                        this.model.setDotted('DocumentPackage.Document.SecurityClassId', sc.get('Id'));
                        this.model.setDotted('DocumentPackage.Document.SecurityClassName', sc.get('Name'));
                    }
                    break;
                case 'recordcategory':
                    var rc = window.slimRecordCategories.getByNameOrId(value);
                    if (rc) {
                        this.model.setDotted('DocumentPackage.Document.RecordCategoryId', rc.get('Id'));
                        this.model.setDotted('DocumentPackage.Document.RecordCategoryName', rc.get('Name'));
                    }
                    break;
            }
        }
    }
    //#endregion URL Integration
});