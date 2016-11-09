/// <reference path="../../Content/LibsInternal/Utility.js" />
var WatchLibraryView = Backbone.View.extend({
    collection: undefined, // Watches
    viewData: {},
    watchViews: [],
    className: 'WatchLibraryView fullHeight',
    events: {
        'click .addWatch': 'renderWatchView',
        'click .deleteWatch': 'deleteWatch',
        'mouseenter .watchView': 'showDeleteWatch',
        'mouseleave .watchView': 'hideDeleteWatch'
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('watcheslayout'));
        if (!this.collection) {
            this.collection = new Watches();
        }
        this.collection.fetch();
        this.watchViews = [];
        this.listenTo(this.collection, 'remove', this.deleteWatch);
        return this;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        var html = this.compiledTemplate(this.viewData);
        this.$el.html(html);
        this.renderWatchViews();
        return this;
    },
    close: function () {
        this.unbind();
        var idx = 0;
        var length = this.watchViews.length;
        for (idx; idx < length; idx++) {
            var wv = this.watchViews[idx];
            wv.close();
        }
        this.remove();
    },
    getRenderObject: function () {
        var r = {};
        return r;
    },
    deleteWatch: function (ev) {
        var $targ = $(ev.currentTarget);
        var idx = 0;
        var length = this.watchViews.length;
        for (idx; idx < length; idx++) {
            var view = this.watchViews[idx];
            if (view.$el.find($targ).length > 0) {
                view.deleteWatch(ev);
                this.watchViews.splice(idx, 1);
                break;
            }
        }
    },
    renderWatchViews: function () {
        var idx = 0;
        var wfWatchLen = this.collection.length || 0;
        for (idx; idx < wfWatchLen; idx++) {
            var watch = this.collection.at(idx);
            this.renderWatchView(null, { model: watch });
        }
        if (wfWatchLen === 0) {
            this.renderWatchView();
        }
    },
    renderWatchView: function (ev, options) {
        options = options || {};
        if (!options.model) {
            this.collection.add({});
            options.model = this.collection.at(this.collection.length - 1);
        }
        var wv = new WatchView({ model: options.model });
        this.watchViews.push(wv);
        this.$el.find('.watchContainer').append(wv.render().$el);
    },
    showDeleteWatch: function (ev) {
        var $targ = $(ev.currentTarget);
        $targ.find('.deleteWatch').fadeIn('slow');
    },
    hideDeleteWatch: function (ev) {
        var $targ = $(ev.currentTarget);
        $targ.find('.deleteWatch').fadeOut('fast');
    }
});