var WorkflowView = Backbone.View.extend({
    className: 'WorkflowView',
    wfSearchResults: null, // WorkflowItemsCPX
    appReqSearchResults: null, // ApprovalRequestItemsCPX
    wfAccHeightsUserPref: undefined, // storage of workflow accordions user preference (so it is obtained on resize start, and not for every resize call)
    events: {
        'click .accordion_title': 'showHideAccordion',
        "click .viewer_menubar .expand_arrow": "collapsePreview",
        "click .viewer_menubar .collapse_arrow": "expandPreview"
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('workflowlayout'));
        this.wfSearchResults = new WorkflowItemsCPX({
            Request: {
                Start: 0,
                MaxRows: Utility.GetUserPreference('WFMaxItems'),
                SortBy: Utility.GetUserPreference('WFSearchOrderBy') || Utility.GetUserPreference('searchOrderBy'),
                SortOrder: Utility.GetUserPreference('WFSearchOrder') || Utility.GetUserPreference('searchOrder')
            }
        });
        this.appReqSearchResults = new ApprovalRequestItemsCPX({
            Request: {
                Start: 0,
                MaxRows: Utility.GetUserPreference('ARMaxItems'),
                SortBy: Utility.GetUserPreference('ARSearchOrderBy') || Utility.GetUserPreference('searchOrderBy'),
                SortOrder: Utility.GetUserPreference('ARSearchOrder') || Utility.GetUserPreference('searchOrder')
            }
        });
        var that = this;
        this.workflowItemsView = new WorkflowItemsView({
            model: this.wfSearchResults,
            onResizeGrid: function () {
                that.resizeWorkflowAccordions(true);
            }
        });
        this.approvalRequestItemsView = new ApprovalRequestItemsView({
            model: this.appReqSearchResults,
            onResizeGrid: function () {
                that.resizeWorkflowAccordions(true);
            }
        });

        this.wfItemCounts = new WorkflowItemCounts();
        this.wfItemsByWf = new WorkflowItemsByWorkflow();
        this.wfDashboardView = new WorkflowDashboardView({
            wfItemCounts: this.wfItemCounts,
            wfItemsByWf: this.wfItemsByWf,
            onResizeGrid: function () {
                that.resizeWorkflowAccordions(true);
            }
        });

        //#region WorkflowItemsCPX Event Bindings
        this.listenTo(this.wfSearchResults.get('Results'), 'change:isSelected', function (model, value, options) {
            options = options || {};
            if (!options.ignoreSelection) {
                this.previewSelected(this.wfSearchResults, "wfItems");
            }
        });
        this.listenTo(this.wfSearchResults.get('Results'), 'reset remove', function (collection, options) {
            options = options || {};
            if (!options.ignoreSelection) {
                this.previewSelected(this.wfSearchResults, "wfItems");
            }
        });
        //#endregion

        //#region ApprovalRequestItemsCPX Event Bindings
        this.listenTo(this.appReqSearchResults.get('Results'), 'change:isSelected', function (model, value, options) {
            options = options || {};
            if (!options.ignoreSelection) {
                this.previewSelected(this.appReqSearchResults, "arItems");
            }
        });
        this.listenTo(this.appReqSearchResults.get('Results'), 'reset remove', function (collection, options) {
            options = options || {};
            if (!options.ignoreSelection) {
                this.previewSelected(this.appReqSearchResults, "arItems");
            }
        });
        //#endregion

        this.listenTo(window.userPreferences, 'change', function (model, value, options) {
            var key = model.get('Key');
            if (key === 'previewResizeWidth' || key === 'previewerCollapsed') {
                this.setupPreviewPanel();
            }
            if (key === 'wfAccHeights') {
                this.resizeWorkflowAccordions(true);
                this.setupAccordionHeightMenu();
            }
        });
        this.listenTo(window.userPreferences, 'reset', function () {
            this.setupPreviewPanel();
            this.resizeWorkflowAccordions(true);
            this.setupAccordionHeightMenu();
        });
        this.listenTo(Backbone, 'customGlobalEvents:resize', function (options) {
            options = options || {};
            // Only re-render the preview if it is visible
            if (!this.resizing && options.windowResize && (this.$el.is(':visible') && this.$el.css('visibility') !== 'hidden')) {
                this.setupPreviewPanel();
            }
            this.resizing = false;
            this.resizeWorkflowAccordions(true);
            this.setupAccordionHeightMenu();
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.workItemsState = Utility.GetUserPreference('work_items') || 'open';
        ro.appReqState = Utility.GetUserPreference('approval_requests') || 'open';
        ro.dashboardState = Utility.GetUserPreference('dashboard') || 'open';
        ro.wiFirstOpen = ro.workItemsState === 'open';
        ro.arFirstOpen = !ro.wiFirstOpen && ro.appReqState === 'open';
        ro.dbFirstOpen = !ro.wiFirstOpen && !ro.arFirstOpen;
        ro.allClosed = ro.workItemsState === 'closed' && ro.appReqState === 'closed' && ro.dashboardState === 'closed';
        ro.isCollapsed = Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed'));
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.css('visibility', 'hidden');
        this.$el.find('.WorkflowItemsViewContainer').append(this.workflowItemsView.render().$el);
        this.$el.find('.ApprovalRequestItemsViewContainer').append(this.approvalRequestItemsView.render().$el);
        this.$el.find('.DashboardViewContainer').append(this.wfDashboardView.render().$el);
        this.previewView = new DocumentPreviewView({ showPreviewControls: false });
        this.$el.find('.DocumentPreviewContainer').html(this.previewView.render().$el);
        var that = this;
        $('body').bind('workflowLayoutRenderedInit', function () {
            if (that.$el.is(':visible')) {
                that.resizing = true;
                that.setupPreviewPanel();
                //that.resizing = false;
                $('body').trigger('workflowLayoutRendered');
                $('body').unbind('workflowLayoutRendered');
                $('body').unbind('workflowLayoutRenderedInit');
            }
            else {
                setTimeout(function () {
                    $('body').trigger('workflowLayoutRenderedInit');
                }, 10);
            }
        });
        $('body').trigger('workflowLayoutRenderedInit');
        this.setupAccordionResize();
        return this;
    },
    destroyPreview: function () {
        if (this.previewView) {
            this.previewView.close();
            this.previewView = undefined;
        }
    },
    hidePreviewControls: function () {
        if (this.previewView) {
            this.previewView.togglePreviewControls(false);
        }
    },
    close: function () {
        this.destroyPreview();
        this.unbind();
        this.remove();
    },
    setupPreviewPanel: function () {
        var isCollapsed = Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed'));
        if (isCollapsed) {
            this.collapsePreview();
        }
        else {
            this.expandPreview();
        }
        this.$el.css('visibility', 'inherit');
    },
    ///<summary>
    /// Obtain workflow items and approval request items
    ///</summary>
    showWorkflow: function () {
        // TODO: Support Bug 9572 (http://pedro.docstar.com/b/show_bug.cgi?id=9572)
        if (this.refreshWorkflowTab() || !this.lastHash) {
            var that = this;
            this.appReqSearchResults.fetch({
                doNotSetHash: true,
                ignoreSelection: true,
                complete: function () {
                    // piggy back calls, so not too many are made at once
                    // Obtain workflows last so that workflow documents are selected last and are the ones that are displayed in the previewer
                    that.wfSearchResults.fetch({
                        doNotSetHash: true
                    });
                }
            });
        }
        else {
            Utility.navigate(this.lastHash, Page.routers.Workflow, false, true);
        }
    },
    ///<summary>
    /// Display existing results or fetch new results - depending on user preference and whether or not there are results to display
    ///<param name="page">page of results to fetch</param>
    ///<param name="rows">number of rows results should return</param>
    ///<param name="sortName">column to sort results by</param>
    ///<param name="sortOrder">order to sort results by, asc or desc</param>
    ///<param name="grid">which grid to apply the other parameters to</param>
    ///</summary.
    showExistingResults: function (page, rows, sortName, sortOrder, grid, wfId, qId) {
        // Update the corresponding search results
        var start = rows * (page - 1);
        if (!grid || grid === 'wfItems') {
            // Maintain the wfId and queueId from the model, if they are not provided by the navigation
            wfId = wfId || this.wfSearchResults.get('wfId');
            qId = qId || this.wfSearchResults.get('queueId');
            this.wfSearchResults.reset();
            this.wfSearchResults.set({ Request: { MaxRows: rows, Start: start, SortBy: sortName, SortOrder: sortOrder }, wfId: wfId, queueId: qId });
        }
        if (!grid || grid === 'arItems') {
            this.appReqSearchResults.reset();
            this.appReqSearchResults.set({ Request: { MaxRows: rows, Start: start, SortBy: sortName, SortOrder: sortOrder } });
        }
        // Refresh both workflow search results and approval request search results if the user preference says to refresh - and there are items to be viewed
        if (this.refreshWorkflowTab()) {
            this.showWorkflow();
        }
        else {
            var refreshWFItems = this.wfSearchResults.get('Results').length === 0;
            var refreshAppReqs = this.appReqSearchResults.get('Results').length === 0;
            // If there are no results in the workflow items grid refresh it
            if (refreshWFItems && refreshAppReqs) {
                this.showWorkflow();
            }
            else if (refreshWFItems) {
                this.wfSearchResults.fetch();
            }
                // If there are no results in the approval request items grid refresh it.
            else if (refreshAppReqs) {
                this.appReqSearchResults.fetch();
            }
        }
        if (grid === 'wfItems') {
            this.lastHash = this.workflowItemsView.setHash({ grid: grid });
        }
        else {
            this.lastHash = this.approvalRequestItemsView.setHash({ grid: grid });
        }
    },
    refreshWorkflowTab: function () {
        var workflowTabRefreshOption = Utility.GetUserPreference('workflowTabRefreshOption');
        return workflowTabRefreshOption !== 'None';
    },
    //#region Event Handling
    previewSelected: function (results, type) {
        // If the previewer is collapsed
        var isPreviewerCollapsed = Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed'));
        this.lastPreviewedResults = results;
        if (!results) {
            this.destroyPreview();
            return;
        }
        var that = this;
        clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(function () {
            var current;
            var selected = results.get('Results').getSelected();
            if (type === "wfItems" && selected.length === 0) {
                // get selected if approval grid have selected row
                selected = that.appReqSearchResults.get('Results').getSelected();
                if (selected && selected.length > 0) {
                    that.lastPreviewedResults = that.appReqSearchResults;
                }
            }
            else if (type === "arItems" && selected.length === 0) {
                // get selected if workflow grid have selected row
                selected = that.wfSearchResults.get('Results').getSelected();
                if (selected && selected.length > 0) {
                    that.lastPreviewedResults = that.wfSearchResults;
                }
            }
            if (!selected || selected.length === 0) { //Nothing selected, close view if open.
                that.destroyPreview();
            } else {
                if (that.previewView) {
                    current = that.previewView.model.versionId();
                }
                //Always Preview last selected item. (getSelected is order aware).               
                var selId = selected[selected.length - 1].versionId(); //NOTE: Inboxes and Folders will return null here. 
                if (!selId) {
                    that.hidePreviewControls();
                }
                if (current !== selId) {
                    that.destroyPreview();
                    that.previewView = new DocumentPreviewView({ versionId: selId, showPreviewControls: !isPreviewerCollapsed });
                    that.$el.find('.DocumentPreviewContainer').html(that.previewView.render().$el);
                }
            }
        }, 300);
    },
    showHideAccordion: function (ev) {
        var that = this;
        var callback = function () {
            that.resizeWorkflowAccordions(true);
        };
        ShowHideUtil.showHideWfAccordion(ev, '#workflow_layout', callback);
    },
    collapsePreview: function (ev) {
        var that = this;
        ShowHidePanel.collapseDocumentView(this.$el, function () {
            that.hidePreviewControls();
        });
    },
    expandPreview: function (ev) {
        var that = this;
        ShowHidePanel.expandDocumentView(this.$el, function () {
            if (that.previewView) {
                that.previewView.togglePreviewControls(true);
            }
            that.previewSelected(that.lastPreviewedResults);
        });
    },
    //#endregion Event Handling

    //#region Accordion Resize
    setupAccordionResize: function () {
        var that = this;
        this.$el.find('[data-accid="work_items"] .accordion').resizable({
            handles: "s",
            minHeight: 104,
            resize: function (event, ui) {
                var noResizeAccordions = ['[data-accid="dashboard"]'];
                var openAccs = that.$el.find('.accordion_title_open');
                var openAcc = '';
                if (openAccs.length > 1) {
                    openAcc = that.$el.find('[data-accid="approval_requests"] .accordion_title_open').parent();
                    if (openAcc.length === 0) {
                        openAcc = that.$el.find('[data-accid="dashboard"] .accordion_title_open').parent();
                        noResizeAccordions = [];
                    }
                }
                else {
                    $(this).resizable('widget').trigger('mouseup');
                    noResizeAccordions.push('[data-accid="approval_requests"]');
                }
                var data = {
                    //filterSelector: ui.element.find('.filtersContainer'),
                    resizeAccordion: openAcc,
                    noResizeAccordions: noResizeAccordions
                };
                that.resizeAccordion(event, ui, data);
            },
            stop: function (event, ui) {
                that.stopResizeAccordion(event, ui);
            }
        });
        this.$el.find('[data-accid="approval_requests"] .accordion').resizable({
            handles: "s",
            minHeight: 104,
            resize: function (event, ui) {
                var noResizeAccordions = ['[data-accid="work_items"]'];
                var openAccs = that.$el.find('.accordion_title_open');
                var openAcc = '';
                if (openAccs.length > 1) {
                    openAcc = that.$el.find('[data-accid="dashboard"] .accordion_title_open').parent();
                    if (openAcc.length === 0) {
                        $(this).resizable('widget').trigger('mouseup'); // Don't allow resizing of approval requests accordion if the dashboard is collapsed
                    }
                }
                else {
                    $(this).resizable('widget').trigger('mouseup');
                    noResizeAccordions.push('[data-accid="dashboard"]');
                }
                var data = {
                    filterSelector: ui.element.find('.results_actions'),
                    resizeAccordion: openAcc,
                    noResizeAccordions: noResizeAccordions
                };
                that.resizeAccordion(event, ui, data);
            },
            stop: function (event, ui) {
                that.stopResizeAccordion(event, ui);
            }
        });
        that.setupAccordionHeightMenu();
    },
    setupAccordionHeightMenu: function () {
        var that = this;
        // Only display the context menu on an accordion title bar that has a user preference
        var userPref = Utility.tryParseJSON(Utility.GetUserPreference('wfAccHeights'), true);
        var $accPar;
        var id;
        // Remove all context menus from accordions, will be reset below
        var $accs = $(this.$el).find('.accordion');
        var idx = 0;
        var length = $accs.length;
        for (idx; idx < length; idx++) {
            $accPar = this.$el.find('[data-accid]').has($accs.eq(idx));
            id = $accPar.data('accid');
            $('#wfEditViewAccordionHeight_' + id).remove();
        }
        if (userPref) {
            var pref;
            var remove = function (target) {
                that.removeAccordionHeightPreference(target);
            };
            var removeAll = function (target) {
                that.removeAllAccordionHeightPreference(target);
            };
            for (pref in userPref) {
                if (userPref.hasOwnProperty(pref)) {
                    id = pref.split('_accordionHeight')[0];
                    $accPar = this.$el.find('[data-accid="' + id + '"]');
                    var $accBar = $accPar.find('.accordion_title');
                    var menuAlias = 'wfEditViewAccordionHeight_' + id;
                    var menu = {
                        alias: menuAlias,
                        width: 200,
                        items: [
                            {
                                text: Constants.c.removePredefinedHeight,
                                icon: "",
                                alias: "removeAccordionHeightPreference",
                                action: remove
                            },
                            {
                                text: Constants.c.removeAllPredefinedHeight,
                                icon: "",
                                alias: "removeAllAccordionHeightPreference",
                                action: removeAll

                            }
                        ]
                    };
                    $accBar.contextmenu(menu);
                }
            }
        }
    },
    removeAccordionHeightPreference: function (target) {
        var $targ = $(target);
        var $targPar = this.$el.find('[data-accid]').has($targ);
        var id = $targPar.data('accid');
        var userPref = Utility.tryParseJSON(Utility.GetUserPreference('wfAccHeights'), true);
        delete userPref[id + '_accordionHeight'];   // remove the target's user preference
        Utility.SetSingleUserPreference('wfAccHeights', JSON.stringify(userPref));
    },
    removeAllAccordionHeightPreference: function (target, cb) {
        Utility.SetSingleUserPreference('wfAccHeights', "{}");
    },
    resizeAccordion: function (event, ui, data) {
        // Resize self
        var $self = $(ui.element);
        var $grid = $self.find('.resultsGrid > .customGridTableContainer');
        var $gridHeader = $grid.find('.customGridHeaderContainer');
        this.resizeWorkflowAccordionGrid($self);
        var $selfPar = this.$el.find('[data-accid]').has($self);
        var selfHeight = $self.height();
        var accBarHeight = $selfPar.find('.accordion_title').outerHeight(true);
        selfHeight += accBarHeight;
        // Resize other accordion(s)
        var containerHeight = this.$el.outerHeight(true);
        var idx = 0;
        var noResizeLen = data.noResizeAccordions.length;
        // Obtain height of accordions that shouldn't be resized (to be subtracted later from allowable height, and to be used to set the max height of the element being resized)
        var noResizeAccordionsHeight = 0;
        for (idx; idx < noResizeLen; idx++) {
            var $accContainer = this.$el.find(data.noResizeAccordions[idx]);
            noResizeAccordionsHeight += $accContainer.find('.accordion_title').outerHeight(true) + $accContainer.find('.accordion:visible').outerHeight(true);
        }
        var $accPar = this.$el.find(data.resizeAccordion);
        var $acc = $accPar.find('.accordion');
        var $accGridContainer = $accPar.find('.customGridTableContainer').first();
        var $accGridHeader = $accGridContainer.find('.customGridHeaderContainer');
        var $accGridPager = $accGridContainer.find('.customGridFooterContainer');
        var allowedAccHeight = containerHeight - selfHeight - accBarHeight - noResizeAccordionsHeight - 3;
        var resizeAccordionMinHeight = parseInt($acc.css('minHeight'), 10) + $accGridHeader.outerHeight(true) * 2;
        resizeAccordionMinHeight = isNaN(resizeAccordionMinHeight) ? 0 : resizeAccordionMinHeight;
        if (allowedAccHeight < resizeAccordionMinHeight) {
            $acc.height(resizeAccordionMinHeight);
        }
        else {
            $acc.height(allowedAccHeight);
        }
        var numRows = $grid.find('tbody tr').length;
        var minResizeHeight = parseInt($self.css('minHeight'), 10);
        minResizeHeight = isNaN(minResizeHeight) ? 0 : minResizeHeight;
        if (numRows > 0) {
            minResizeHeight += ($gridHeader.outerHeight(true) * 2);   // allow for 3 rows to be visible;
        }
        $self.resizable({ minHeight: minResizeHeight });
        $self.resizable({ maxHeight: containerHeight - resizeAccordionMinHeight - (accBarHeight * (3 - noResizeLen + 1)) - noResizeAccordionsHeight });
        this.resizeWorkflowAccordionGrid($acc);
    },
    stopResizeAccordion: function (event, ui) {
        var $accBars = this.$el.find('.accordion_title_open');
        var pref = {};
        var containerHeight = this.$el.outerHeight(true);
        var accBarHeight = $accBars.eq(0).outerHeight(true);
        var idx = 0;
        var accBarLen = $accBars.length;
        // Replace values in the 
        for (idx; idx < accBarLen; idx++) {
            var $acc = $accBars.eq(idx).siblings('.accordionContainer').find('.accordion');
            var $accPar = this.$el.find('[data-accid]').has($acc);
            var id = $accPar.data('accid');
            var key = id + '_accordionHeight';
            var value = $acc.outerHeight(true);
            if (id === 'dashboard' && !this.$el.find('[data-accid="approval_requests"]').find('.accordion').is(':visible')) {
                value -= accBarHeight;
            }
            pref[key] = value / containerHeight;
        }
        Utility.SetSingleUserPreference('wfAccHeights', JSON.stringify(pref));
    },
    /*
        For setting a workflow accordions height and width based on its parent containers height and width
        $acc: the accordion cotainer, that contains the grid.
    */
    resizeWorkflowAccordionGrid: function ($acc) {
        var $grid = $acc.find('.customGridTableContainer');
        var $accTitle = $acc.parent().parent().find('.accordion_title');
        $grid.height($acc.height() - $accTitle.outerHeight(true) - 8);
    },
    resizeWorkflowAccordions: function (overrideResizing) {
        var that = this;
        if (!overrideResizing && this.resizing) {
            return;
        }
        this.resizing = true;
        // Check user preference for sizing, if present use it, percentage based
        // If the user preference is present but the accordion selector is not,  set its height to the min height for an accordion
        var $accBars = this.$el.find('.accordion_title_open');
        var accBarHeight = $accBars.eq(0).outerHeight(true);
        var containerHeight = this.$el.height();
        var wfAccHeights = Utility.tryParseJSON(Utility.GetUserPreference('wfAccHeights'), true);
        if (wfAccHeights) {
            var pref;
            var wfAccs = ['work_items', 'approval_requests', 'dashboard'];
            var idx = 0;
            var wfAccsLen = wfAccs.length;
            for (idx; idx < wfAccsLen; idx++) {
                var hasPref = wfAccHeights[wfAccs[idx] + '_accordionHeight'];
                var $accBar = this.$el.find('[data-accid="' + wfAccs[idx] + '"]').find('.accordion_title_open');
                var $acc = this.$el.find('[data-accid="' + wfAccs[idx] + '"]').find('.accordion');
                if (!hasPref) {
                    if ($accBar.length > 0) {
                        var minHeight = parseInt($acc.css('minHeight'), 10);
                        $acc.height(minHeight);
                        containerHeight -= minHeight;
                        this.resizeWorkflowAccordionGrid($acc);
                    }
                    else {
                        $acc.height(0);
                        this.resizeWorkflowAccordionGrid($acc);
                    }
                }
            }
            for (pref in wfAccHeights) {
                if (wfAccHeights.hasOwnProperty(pref)) {
                    var sel = pref.split('_accordionHeight')[0];
                    var height = containerHeight * wfAccHeights[pref];
                    if ($accBars.length === 1) {
                        height = containerHeight - (accBarHeight * 3);
                    }
                    var $selAcc = this.$el.find('[data-accid="' + sel + '"]').find('.accordion');
                    $selAcc.height(height);
                    this.resizeWorkflowAccordionGrid($selAcc);
                }
            }
            return;
        }
        var contSelector, contHeight, numOpen, numClosed, numAccordions, availHeightPerAcc,
            wfGrid, arGrid, wfIPA, wfIPS, wfRecs, wfGridHeight, arGridHeight;
        contSelector = '#workflow_layout';
        contHeight = $(contSelector).height();
        numOpen = $(contSelector + ' .accordion:visible, ' + contSelector + ' .accordion.isOpen').length;
        var accordions = this.$el.find('.WorkflowViewAccordions > div');
        numAccordions = accordions.length;
        numClosed = numAccordions - numOpen;
        // accordion is open
        var wfIsOpen = this.$el.find('[data-accid="work_items"] .accordion').is(':visible');
        var arIsOpen = this.$el.find('[data-accid="approval_requests"] .accordion').is(':visible');
        // accordion title height
        var titleHeight = this.$el.find('.accordion_title').outerHeight(true);
        // Height available per open accordion
        availHeightPerAcc = numOpen > 0 ? (contHeight - (numAccordions * titleHeight)) / numOpen : titleHeight * numClosed;
        // Determine whether grid should be small or not
        wfGrid = this.workflowItemsView.$el;
        arGrid = this.approvalRequestItemsView.$el;
        var wfDBView = this.wfDashboardView;
        var dbView = wfDBView.dashboardView;
        wfIPA = dbView.wfItemCountsView.$el;
        wfIPS = dbView.wfItemsPerStepView.$el;



        wfRecs = this.wfSearchResults.get('Results').length;
        arRecs = this.appReqSearchResults.get('Results').length;
        wfIPARecs = this.wfItemCounts.length;
        wfIPSRecs = this.wfItemsByWf.length;

        // Determine height of wfItems accordion
        if (wfIsOpen) {
            wfGridHeight = availHeightPerAcc;
        }
        else {
            wfGridHeight = titleHeight;
        }

        wfGridHeight = wfGridHeight > availHeightPerAcc ? availHeightPerAcc : wfGridHeight;
        if (wfGrid) {
            wfGrid.find('.accordion:visible').height(wfGridHeight);
        }
        // Determine height of approval requests accordion
        if (arIsOpen) {
            arGridHeight = availHeightPerAcc;
        }
        else {
            arGridHeight = titleHeight;
        }

        arGridHeight = arGridHeight > availHeightPerAcc ? availHeightPerAcc : arGridHeight;
        if (arGrid) {
            arGrid.find('.accordion:visible').height(arGridHeight);
        }
        var dbViewHeaderHeight = wfDBView.$el.find('.header').outerHeight(true);
        var remainingHeight = (contHeight - wfGridHeight - arGridHeight - dbViewHeaderHeight - (titleHeight * (numOpen - 1)));
        var dbHeight = availHeightPerAcc > remainingHeight ? remainingHeight : availHeightPerAcc;
        wfDBView.$el.find('.accordion:visible').height(dbHeight);
        this.resizeWorkflowAccordionGrid(this.$el.find('[data-accid="work_items"]').find('.accordion'));
        this.resizeWorkflowAccordionGrid(this.$el.find('[data-accid="approval_requests"]').find('.accordion'));
        this.resizeWorkflowAccordionGrid(this.$el.find('[data-accid="dashboard"]').find('.accordion'));
        setTimeout(function () {
            that.resizing = false;
        }, 10);
    }
    //#endregion Accordion Resize
});