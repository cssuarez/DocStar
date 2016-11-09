var SearchView = Backbone.View.extend({
    model: undefined, // SearchResultsCPX
    criteriaView: undefined,
    resultsView: undefined,
    previewView: undefined,
    lastHash: '',
    className: 'SearchView',
    events: {
        "click .viewer_menubar .expand_arrow": "collapsePreview",
        "click .viewer_menubar .collapse_arrow": "expandPreview"
    },
    initialize: function (options) {
        var maxRows = Utility.GetUserPreference('RetrieveMaxItems') || Constants.UtilityConstants.DEFAULT_SEARCH_MAXROW;
        var defaultOverrides = {
            MaxRows: maxRows,
            Request: {
                MaxRows: maxRows
            }
        };
        this.model = new SearchResultsCPX(defaultOverrides);
        this.setDefaultOverrides({ maxRows: maxRows });
        this.compiledTemplate = doT.template(Templates.get('searchviewlayout'));
        this.criteriaView = new SearchCriteriaView({ model: this.model });
        this.resultsView = new SearchResultsGridView({ model: this.model, prefKeyPrefix: 'search' });
        var that = this;
        this.listenTo(this.model, 'sync', function (model, value, options) {
            options = options || {};
            // Set search user preference(s)
            var currentMax = this.model.getDotted('Request.MaxRows');
            var oldMax = parseInt(Utility.GetUserPreference('RetrieveMaxItems'), 10);
            if (currentMax !== oldMax) {
                Utility.SetSingleUserPreference('RetrieveMaxItems', currentMax);
                this.setDefaultOverrides({ maxRows: currentMax });  // update the default overrides, so when this.model is reset it maintains these values
            }
            that.modelSynced(model, value, options);
        });
        this.listenTo(this.model.get('Results'), 'change:isSelected', function (model, value, options) {
            options = options || {};
            // Don't preview if explicitly specifying to not preview the document on selection
            if (options.previewSelected === false) {
                return;
            }
            that.previewSelected(model);
        });
        this.listenTo(this.model.get('Results'), 'change:selectedSubgridVersion', function (model, value, options) {
            this.previewSelectedVersion(value);
        });
        this.listenTo(this.model.get('Results'), 'reset', function (model, collection, options) {
            that.previewSelected();
        });
        this.listenTo(window.userPreferences, 'change', function (model, value, options) {
            var key = model.get('Key');
            if (key === 'previewResizeWidth' || key === 'previewerCollapsed') {
                this.setupPreviewPanel();
            }
        });
        this.listenTo(Backbone, 'customGlobalEvents:resize', function (options) {
            options = options || {};
            if (options.windowResize && (that.$el.is(':visible') && this.$el.css('visibility') !== 'hidden')) {
                that.setupPreviewPanel();
            }

        });
        this.listenTo(window.userPreferences, 'reset', this.setupPreviewPanel);
        $('#qsbutton').on('click', function () { that.quickSearch($('#qtext').val()); });
        $('body').on('searchInContainer', function (ev, data) {
            that.model.reset();
            that.model.set('Request', data, { reRenderCriteria: true });
            that.model.fetch({ replaceHash: true });
        });
        $('body').bind('searchLayoutRenderedInit', function () {
            if (that.$el.is(':visible')) {
                that.setupPreviewPanel();
                $('body').trigger('searchLayoutRendered');
                $('body').unbind('searchLayoutRendered');
            }
            else {
                setTimeout(function () {
                    $('body').trigger('searchLayoutRenderedInit');
                }, 10);
            }
        });
        return this;
    },
    ///<summary>
    /// Update default values to be used when this.model is 'reset'
    ///<param name="overrides">object - contains possible overrides for this.model (eg. MaxRows)</param>
    ///</summary>
    setDefaultOverrides: function (overrides) {
        // If no overrides are provided, don't set the model
        if (!overrides) {
            return;
        }
        // Just as a precaution, if maxRows is not provided for any reason, or is 0 or less, reset it to the default search max rows
        var maxRows = overrides.maxRows && overrides.maxRows > 0 ? overrides.maxRows : Constants.UtilityConstants.DEFAULT_SEARCH_MAXROW;
        var defaultOverrides = {
            MaxRows: maxRows,
            Request: {
                MaxRows: maxRows
            }
        };
        this.model.setDefaultOverrides(defaultOverrides);
    },
    getRenderObject: function () {
        var ro = {
            isCollapsed: Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed'))
        };
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.css('visibility', 'hidden');
        this.$el.find('.SearchCriteriaContainer').html(this.criteriaView.render().$el);
        this.$el.find('.SearchResultContainer').html(this.resultsView.render().$el);
        this.previewView = new DocumentPreviewView({ showPreviewControls: false });
        this.$el.find('.DocumentPreviewContainer').html(this.previewView.render().$el);
        $('body').trigger('searchLayoutRenderedInit');
        return this;
    },
    showExistingResults: function (searchId, page, maxRows) {
        var start = maxRows * (page - 1);
        this.model.reset({ ignoreReset: true });
        this.model.set({ Request: { ResultId: searchId, MaxRows: maxRows, Start: start } });
        this.model.fetch({ reRenderCriteria: true });
    },
    quickSearch: function (qsText, autoOpen) {
        if ($.trim(qsText) === '') {
            VocabUtil.addEmptyWarning('#qs_suggested');
            return;
        }
        this.model.reset();
        var qsPrefs = SearchUtil.getQuickSearchPreferences();

        this.model.setDotted('Request.IncludeDocuments', qsPrefs.documentsInQS);
        this.model.setDotted('Request.IncludeInboxes', qsPrefs.inboxesInQS);
        this.model.setDotted('Request.IncludeFolders', qsPrefs.foldersInQS);
        this.model.setDotted('Request.TextCriteria', qsText);

        if (qsPrefs.enableAutoWildcardQuickSearch === true) {
            if (this.model.getDotted('Request.TextCriteria').indexOf(":") < 0) {
                var searchtext = this.model.getDotted('Request.TextCriteria');
                searchtext += '*';
                this.model.setDotted('Request.TextCriteria', searchtext);
            }
        }
        this.model.fetch({ reRenderCriteria: true, autoOpen: !!autoOpen });
        Tab.updateTabById('retrieve_tab', undefined, true);
    },
    quickSearchIntegrated: function (params) {
        var autoOpen = false;
        if (params.toLowerCase().indexOf("/autoopen") > -1) {
            // auto open the documents for viewing
            autoOpen = true;
            var regEx = new RegExp("/autoopen", "ig");
            params = params.replace(regEx, '');
        }
        if (this.checkReadOnlyUser()) {
            return;
        }
        if (!this.checkAppIntegration()) {
            return;
        }
        params = decodeURI(params);
        $('#qtext').val(params);
        this.quickSearch(params, autoOpen);
    },
    savedSearch: function (savedSearchId) {
        this.criteriaView.savedSearchView.performSavedSearchById(savedSearchId);
    },
    previewSelected: function (targetModel) {
        var that = this;
        // If the previewer is collapsed
        var isPreviewerCollapsed = Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed'));
        clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(function () {
            var current;
            var selected = that.model.get('Results').getSelected();
            if (!selected || selected.length === 0) { //Nothing selected, close view if open.
                that.destroyPreview();
            } else {
                if (that.previewView) {
                    current = that.previewView.model.versionId();
                }
                //Always Preview last selected item, unless it is an Inbox or Folder. (getSelected is order aware).
                var selId = selected[selected.length - 1].versionId(); //NOTE: Inboxes and Folders will return null here, use this as the indicator to not preview
                if (!selId) {
                    that.hidePreviewControls();
                } else if (that.$el.is(':visible') && (current !== selId || (targetModel && targetModel.versionId && selId === targetModel.versionId()))) { // Refresh only if the document is not already being previewed or if it is the targetModel (MassDocumentUpdated may trigger this event to request a refresh)
                    that.destroyPreview();
                    that.previewView = new DocumentPreviewView({ versionId: selId, showPreviewControls: !isPreviewerCollapsed });
                    that.$el.find('.DocumentPreviewContainer').html(that.previewView.render().$el);
                } else if (that.previewView) {
                    that.previewView.pzr.fitDefault();
                }
            }
        }, 300);

    },
    previewSelectedVersion: function (versionId) {
        var current;
        if (this.previewView) {
            current = this.previewView.model.versionId();
        }
        var selId = versionId;
        if (!selId) {
            this.hidePreview();
        }
        else if (current !== selId) {
            this.destroyPreview();
            this.previewView = new DocumentPreviewView({ versionId: selId });
            this.$el.find('.DocumentPreviewContainer').html(this.previewView.render().$el);
        }
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
    modelSynced: function (m, v, o) {
        if (!o.doNotSetHash) {
            this.setHash(o);
        }
        if (o.autoOpen) {
            var results = this.model.get('Results');
            results.selectAll();
            var eids = results.getEntityIds();
            if (eids.versionIds && eids.versionIds.length > 0) {
                $('body').trigger('ViewDocuments', { versionIds: eids.versionIds, resultId: this.model.get('ResultId') });
            }
        }
    },
    setHash: function (options) {
        options = options || {};
        var maxRows = this.model.getDotted('Request.MaxRows');
        var start = this.model.getDotted('Request.Start');
        var page = (start / maxRows) + 1;
        this.lastHash = String.format('Retrieve/searchId/{0}/page/{1}/maxRows/{2}', this.model.get('ResultId'), page, maxRows);

        Utility.navigate(this.lastHash, Page.routers.Retrieve, false, options.replaceHash);
    },
    checkAppIntegration: function () {
        if (window.appIntegration) {
            return true;
        }
        ErrorHandler.addErrors(Constants.c.appIntegrationNotLicensed);
        return false;
    },
    checkReadOnlyUser: function () {
        if ($('#isReadOnlyUser').val() === 'True') {
            Utility.navigate('Home/IntegrationException', Page.routers.Home, true, true);
            return true;
        }
        return false;
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
            that.previewSelected();
        });
    },
    setupPreviewPanel: function () {
        ShowHidePanel.slideDocumentView(this.$el);
        var isCollapsed = Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed'));
        if (isCollapsed) {
            this.collapsePreview();
        }
        else {
            this.expandPreview();
        }
        this.$el.css('visibility', 'inherit');
    }
});