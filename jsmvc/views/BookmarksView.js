// View for showing (and someday, editing, bookmarks)
/// <reference path="../../Content/LibsInternal/Utility.js" />
/// <reference path="../../Content/LibsInternal/SecurityUtil.js" />
var BookmarksView = Backbone.View.extend({
    className: 'BookmarksView',
    events: {
        "click .bookmarkItem": "bookmarkClicked"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('bookmarkslayout'));
        this.options = options || {};
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.createToggleButton();
        return this;
    },
    getRenderObject: function () {
        var ro = {
            seperatorClass: '',
            bookmarksClass: '',
            bookmarks: []
        };
        var bookmarks = this.model.getDotted('DocumentPackage.Bookmarks');
        var i = 0;
        var length = bookmarks ? bookmarks.length : 0;
        for (i; i < length; i++) {
            var bm = bookmarks.at(i);
            ro.bookmarks.push({
                Id: bm.get('Id'),
                Name: Utility.safeHtmlString(bm.get('Name'))
            });
        }
        if (length === 0) {
            ro.seperatorClass = ro.bookmarksClass = 'displayNone';
        }
        return ro;
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    createToggleButton: function () {
        var that = this;
        var $bmm = this.$el.find('.bookmarksMenu');
        $bmm.on('click', {
            dropdownSelector: $bmm,
            childHoverSelector: 'dt>span',
            childShowHideSelector: 'ul.children',
            toggleFunction: function (isPressed) { that.toggleButton(isPressed); }
        }, function (e) { that.toggleBookmarks(e); });
    },
    toggleBookmarks: function (event) {
        ShowHideUtil.showHideDropdownMenu(event);
    },
    toggleButton: function (isPressed) {
        var $tb = this.$el.find('.bookmarksMenu .toggle_btn');
        if (isPressed) {
            if (!$tb.hasClass('pressed')) {
                $tb.addClass('pressed');
            }
        }
        else {
            if ($tb.hasClass('pressed')) {
                $tb.removeClass('pressed');
            }
        }
    },
    bookmarkClicked: function (event) {
        event.stopPropagation();
        ShowHideUtil.hideMenu(); // this makes the command "definitive"; picking one closes the menu.  We could drop this line to keep Bookmarks open.
        var $sel = $(event.currentTarget);
        var id = $sel.data('bookmarkid');
        var bms = this.model.getDotted('DocumentPackage.Bookmarks');
        var bm = bms.get(id);
        if (bm) {
            var pageNumber = bm.get('PageNumber');
            if (pageNumber) {
                this.model.setCurrentPage(bm.get('PageNumber'));
            } else {
                DialogsUtil.generalCloseDialog('', { title: bm.get('Name'), msg: bm.get('Message') });
            }
        }
    }
});