var RetrieveView = Backbone.View.extend({
    inViewer: /retrieve\/(view|native)\//i,
    docView: undefined,
    searchView: undefined,
    currentView: undefined,
    className: 'RetrieveView',
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('retrievelayout'));
        this.docView = new DocumentView();
        this.searchView = new SearchView();
        var that = this;
        $('body').off('ViewDocuments').on('ViewDocuments', function (e, data) {
            $('body').data('referrer', window.location.hash);
            data = data || {};
            if (data.inFormEdit === undefined) { //If we have not been told only way or another to open in form edit mode read the user preference. 
                if (Utility.GetUserPreference('formEditMode') === undefined) {
                    data.inFormEdit = true;
                }
                else {
                    data.inFormEdit = Utility.convertToBool(Utility.GetUserPreference('formEditMode'));
                }
            }
            that.viewbyVersionIdsEvent(e, data);
        });
        return this;
    },
    render: function () {
        //We only call this once from the RetrieveController, once rendered we generally just hide and show the either the Document View or the Search View.
        this.$el.html(this.compiledTemplate());
        this.$el.find('.SearchContainer').html(this.searchView.render().$el);
        this.$el.find('.DocumentViewContainer').html(this.docView.render().$el);
        return this;
    },
    showSearch: function () {
        this.switchToView(this.searchView);
    },
    showExistingResults: function (searchId, page, maxRows) {
        this.switchToView(this.searchView);
        this.searchView.showExistingResults(searchId, page, maxRows);
    },
    quickSearchIntegrated: function (params) {
        this.switchToView(this.searchView);
        this.searchView.quickSearchIntegrated(params);
    },
    savedSearch: function (savedSearchId) {
        this.switchToView(this.searchView);
        this.searchView.savedSearch(savedSearchId);
    },
    viewByVersionId: function (versionId) {
        this.viewByVersionIds([versionId]);
    },
    viewByVersionIds: function (versionIds, inFormEdit, searchResultId) {
        if (!versionIds || versionIds.length === 0) {
            DialogsUtil.invalidSelection();
            return;
        }
        this.switchToView(this.docView);
        this.docView.viewByVersionIds(versionIds, inFormEdit, searchResultId);
    },
    viewbyVersionIdsEvent: function (e, data) {
        this.viewByVersionIds(data.versionIds, data.inFormEdit, data.resultId);
    },
    viewResults: function (viewId, index, page, queryString) {
        this.switchToView(this.docView);
        this.docView.viewResults(viewId, index, page, queryString);
    },
    setMetaData: function (viewId, index, page, params) {
        if (this.currentView !== this.docView) {
            return;
        }
        if (this.checkReadOnlyUser()) {
            return;
        }
        if (!this.checkAppIntegration()) {
            return;
        }
        var action;
        var regEx;
        if (params.toLowerCase().indexOf("/go") > -1) {
            // auto open the documents for viewing
            action = 'go';
            regEx = new RegExp("/go", "ig");
            params = params.replace(regEx, '');
        }
        else if (params.toLowerCase().indexOf("/syncsave") > -1) {
            // auto open the documents for viewing
            action = 'syncSave';
            regEx = new RegExp("/syncSave", "ig");
            params = params.replace(regEx, '');
        }
        if (params.toLowerCase().indexOf("/sync") > -1) {
            // auto open the documents for viewing
            action = 'sync';
            regEx = new RegExp("/sync", "ig");
            params = params.replace(regEx, '');
        }
        if (!params.startsWith('?')) {
            params = '?' + params;
        }
        params = Utility.getURLParams(params);
        this.docView.setData(params, action);
        Utility.setWindowTitle();
    },   
    switchToView: function (viewer) {
        $('body').trigger('DocumentTextAction', { show: false });   // Reset showDocumentHits and showDocumentText when changing viewers
        if ($('#retrieve_tab_panel').hasClass('show_tabs') !== true) {
            Navigation.showRetrievePanel(); //Viewing a document from the workflow tab.
        }
        if (this.currentView === viewer) {
            return;
        }

        var $dvc = this.$el.find('.DocumentViewContainer');
        var $sc = this.$el.find('.SearchContainer');

        if (viewer === this.docView) {
            $sc.hide();
            $dvc.show();
            this.searchView.destroyPreview();
        }
        else if (viewer === this.searchView) {
            $dvc.hide();
            $sc.show();
            if (viewer.lastHash) { //Navigating back to the retrieve view with a prior result, restore the search hash.
                Utility.navigate(viewer.lastHash, Page.routers.Retrieve, false, false);
            } else if (this.inViewer.test(window.location.hash)) { //Started off in the viewer (bookmark) and navigated back
                Utility.navigate('Retrieve', Page.routers.Retrieve, false, false);
            }
            this.docView.closeChildren();
            this.searchView.previewSelected();          
        }
        ShowHidePanel.resize();
        this.currentView = viewer;
    },
    checkAppIntegration: function () {
        if (window.appIntegration) {
            return true;
        }
        ErrorHandler.addErrors(Constants.c.appIntegrationNotLicensed);
        window.location.href = Constants.Url_Base + '#Home/IntegrationException';
        return false;
    },
    checkReadOnlyUser: function () {
        if ($('#isReadOnlyUser').val() === 'True') {
            window.location.href = Constants.Url_Base + '#Home/IntegrationException';
            return true;
        }
        return false;
    }
});