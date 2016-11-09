// Provide navigation for Retrieve
var RetrieveRouter = Backbone.Router.extend({
    retrieveView: null,
    /*
    * Routes for retrieve
    */
    routes: {
        'Retrieve': 'showSearch',
        'Retrieve/searchId/:searchId/page/:page/maxRows/:maxRows': 'retrieveSearch',
        'Retrieve/view/:viewId/index/:index/page/:page': 'viewResults',
        'Retrieve/view/:viewId/index/:index/page/:page/query?*queryString': 'viewResults',
        'Retrieve/native/:viewId/index/:index/page/:page': 'viewResults', //This route is depricated, maintained for prior bookmarks. Selection of native vs image viewer based on cookie.
        'Retrieve/viewByVersionId/:versionId': 'viewByVersionId',
        'Retrieve/search/qs/*qsParam': 'quickSearch',
        'Retrieve/SavedSearch/:savedSearchId': 'savedSearch',
        'Retrieve/view/:viewId/index/:index/page/:page/metadata/*': 'setMetaData',
        'Retrieve/native/:viewId/index/:index/page/:page/metadata/*': 'setMetaData'
    },
    initialize: function () {
        if (this.retrieveView === null) {
            this.retrieveView = new RetrieveView();
            $('#retrieve_tab_panel').html(this.retrieveView.render().$el);
        }
    },
    afterRoute: function () {
        ShowHidePanel.resize();
    },
    showSearch: function () {
        this.onNavigate("retrieve");
        this.retrieveView.showSearch();
    },
    retrieveSearch: function (searchid, page, maxRows) {
        this.onNavigate("search");
        this.retrieveView.showExistingResults(searchid, page, maxRows);
    },
    quickSearch: function (params) {
        this.onNavigate("quickSearch");
        this.retrieveView.quickSearchIntegrated(params);
    },
    savedSearch: function (savedSearchId) {
        this.onNavigate("savedSearch");
        this.retrieveView.savedSearch(savedSearchId);
    },
    viewByVersionId: function (versionId) {
        this.onNavigate("viewByVersionId");
        this.retrieveView.viewByVersionId(versionId);
    },
    viewResults: function (viewId, index, page, queryString) {
        this.onNavigate("viewResults");
        this.retrieveView.viewResults(viewId, index, page, queryString);
    },
    setMetaData: function (viewId, index, page, params) {
        this.onNavigate("setMetaData");
        this.retrieveView.setMetaData(viewId, index, page, params);
    }
});
