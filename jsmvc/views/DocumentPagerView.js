var DocumentPagerView = Backbone.View.extend({
    model: undefined, // BulkViewerDataPackageCPX
    className: 'DocumentPagerView',
    events: {
        'click .ui-icon.ui-icon-seek-start': 'navigateToFirstDoc',
        'click .ui-icon.ui-icon-seek-prev': 'navigateToPreviousDoc',
        'click .ui-icon.ui-icon-seek-next': 'navigateToNextDoc',
        'click .ui-icon.ui-icon-seek-end': 'navigateToLastDoc',
        'keyup .metadata_results_counter': 'navigateToDocEvent'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('documentpagerlayout'));
    },
    getRenderObject: function () {
        var ro = {};
        var versionIds = this.model.get('versionIds');
        ro.numSeries = versionIds ? versionIds.length : 0;
        ro.entityViewed = this.model.get('viewIndex') || 1;
        ro.display = ro.numSeries > 1 ? '' : 'display: none;';
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.find('input.metadata_results_counter').numeric({ decimal: false });
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    navigateToFirstDoc: function (ev) {
        this.model.goToDocument(1);
    },
    navigateToPreviousDoc: function (ev) {
        var currDocIdx = parseInt(this.model.get('viewIndex'), 10);
        this.model.goToDocument(currDocIdx - 1);
    },
    navigateToNextDoc: function (ev) {
        var currDocIdx = parseInt(this.model.get('viewIndex'), 10);
        this.model.goToDocument(currDocIdx + 1);
    },
    navigateToLastDoc: function (ev) {
        var versionIds = this.model.get('versionIds');
        var numDocs = versionIds ? versionIds.length : 1;
        this.model.goToDocument(numDocs);
    },
    navigateToDocEvent: function (ev) {
        if (ev.which !== 13) {
            return;
        }
        var $currTarg = $(ev.currentTarget);
        var versionIds = this.model.get('versionIds');
        var numDocs = versionIds ? versionIds.length : 1;
        var idx = InputUtil.textRangeCheck(1, numDocs, parseInt($currTarg.val(), 10));
        $currTarg.val(idx);
        this.model.goToDocument(idx);
    }
    //#endregion Event Handling
});