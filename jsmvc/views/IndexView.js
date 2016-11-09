/// <reference path="../../Content/JSProxy/SearchServiceProxy.js" />
var IndexView = Backbone.View.extend({
    searchSvc: SearchServiceProxy(),
    viewData: {},
    events: {
        "click input[name='reindex']": "reindex",
        "click input[name='deleteIndex']": "deleteReIndex",
        "click #indexLayout .fieldStatistics > legend": "toggleFieldStatistics"
    },

    initialize: function (options) {
        var template = Templates.get('indexlayout');
        this.compiledTemplate = doT.template(template);
        return this;
    },
    render: function () {
        // Refresh viewData.list
        this.viewData.stats = window.indexStats;
        $(this.el).html(this.compiledTemplate(this.viewData));
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        return this;
    },
    reindex: function () {
        var that = this;
        that.toggleButtons();
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var success = function (result) {
            window.indexStats.fetch({
                success: function () {
                    that.render();
                },
                reset: true
            });
        };
        var failure = function () {
            ErrorHandler.addErrors({ 'reindex_error': error.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        };
        this.searchSvc.reIndex(success, failure, null);
    },
    deleteReIndex: function () {
        var that = this;
        that.toggleButtons();
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var success = function (result) {
            window.indexStats.fetch({
                success: function () {
                    that.render();
                },
                reset: true
            });
        };
        var failure = function (jqXHR, textStatus, error) {
            ErrorHandler.addErrors({ 'reindex_error': error.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        };
        this.searchSvc.deleteReIndex(success, failure, null);
    },
    toggleButtons: function () {
        var buttons = $('#indexLayout input[type="button"]');
        if ($(buttons[0]).attr('disabled') === 'disabled') {
            buttons.removeAttr('disabled');
        }
        else {
            buttons.attr('disabled', 'disabled');
        }
    },
    toggleFieldStatistics: function (e) {
        ShowHideUtil.toggleFieldset(e, true);
        ShowHidePanel.toggleAdminScrollbar();
    }
});