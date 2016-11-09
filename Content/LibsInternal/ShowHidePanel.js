/// <reference path="PanZoomRotate.js" />
/// <reference path="~/Content/LibsExternal/perfect-scrollbar.js" />
/*
*  Show/Hide Panel Functions
*/
var ShowHidePanel = {
    viewerSelector: '',
    aspectRatio: 1,
    previewResizeWidthPref: 'previewResizeWidth',
    navPanelCollapsedPref: "collapseNavigationPanel",
    //Changed from - showDocumentInfoInGrid, which made no sense for its actual purpose - this will break previous user preference for if the previewer was collapsed or not
    previewerCollapsedPref: "previewerCollapsed",
    middlePanelMinWidth: 485,
    userPref: false,
    isHideNavigationPan: function () {
        return Utility.convertToBool(Utility.GetUserPreference(ShowHidePanel.navPanelCollapsedPref));
    },
    isShowDocumentView: function () {
        // The user preference is whether or not the previewer is collapsed, so negate what is returned
        return !(Utility.convertToBool(Utility.GetUserPreference(ShowHidePanel.previewerCollapsedPref)));
    },
    docIdsRestore: { ch: false },
    // Initialize delegates.
    init: function (left, right, slide, ev) {
        if ($(slide).data('left_width') === undefined) {
            $(slide).data('left_width', $(left).width());
        }
        if ($(slide).data('right_width') === undefined) {
            $(slide).data('right_width', $(right).width());
        }
        if ($(slide).data('left') === undefined) {
            $(slide).data('left', $(slide + ' span').css('left'));
        }
        if ($(slide).data('collapsed') === undefined) {
            var isCollapse = ShowHidePanel.isHideNavigationPan();
            $('body').delegate(slide, 'click', function () {
                ShowHidePanel.collapsePanel(left, right, slide, true);
            });
            $(slide).data('collapsed', !isCollapse);
            ShowHidePanel.collapsePanel(left, right, slide, false);
        }
        $('#tabs').width(window.innerWidth - $('#browse').width());
        $('#tab_panel_container').width($('#tabs').width() - 5);
        if ($('body').height() <= parseInt($('body').css('min-height'), 10)) {
            $('#tabs').width($(window).width() - $('#browse').width());
            $('#tab_panel_container').width($('#tabs').width() - 5);
        }
        var layoutHeight = window.innerHeight - ShowHidePanel.getHeaderHeight() + (ShowHidePanel.isHeaderVisible() ? 4 : 0);
        $('#layout').height(layoutHeight);
    },
    isHeaderVisible: function () {
        return $('#header').css('display') !== 'none';
    },
    getHeaderHeight: function () {
        var h = 0;
        // Detect if the header is display none or not
        var headerIsVisible = ShowHidePanel.isHeaderVisible();
        h += headerIsVisible ? $('#header').height() : 0;
        var colBorderIsVisible = $('#col_border_top').css('display') !== 'none';
        h += colBorderIsVisible ? $('#col_border_top').outerHeight() : 0;
        return h;
    },
    /*
        // selectors: css selectors for other elements whose width need be taken into account
    */
    getMaxWidthFromMiddlePanelWidth: function (selectors, limitedWidth) {
        var $selectors = $(selectors);
        var windowWidth = ShowHidePanel.getWindowWidth();
        var additionalWidth = 0;
        var i;
        var length = $selectors.length;
        for (i = 0; i < length; i++) {
            var addWidth = parseInt($selectors.eq(0).width(), 10);
            additionalWidth += isNaN(addWidth) ? 0 : addWidth;
        }
        var maxWidth = windowWidth - ShowHidePanel.middlePanelMinWidth - additionalWidth - 10;
        if (maxWidth > limitedWidth) {
            maxWidth = limitedWidth;
        }
        return maxWidth;
    },
    getWindowWidth: function () {
        var minTotWidth = parseInt($('body').css('minWidth'), 10);
        return $(window).width() < minTotWidth ? minTotWidth : $(window).width();
    },
    getNavPanelWidth: function () {
        return $('#browse:visible').width() || 0;
    },
    getAvailablePreviewWidth: function () {
        return ShowHidePanel.getWindowWidth() - ShowHidePanel.middlePanelMinWidth - $('#browse').width();
    },
    slidePanel: function (options) {
        var left = options.left || undefined;
        var resize = options.resize;
        var start = options.start;
        var stop = options.stop;
        var minWidth = options.minWidth || 15;
        var maxWidth = options.maxWidth > 0 ? options.maxWidth : 400;
        $(left).resizable({
            handles: 'e',
            maxWidth: maxWidth,
            minWidth: minWidth,
            resize: function (event, ui) {
                resize(event, ui, options);
            },
            start: function (event, ui) {
                start(event, ui, options);
            },
            stop: function (event, ui) {
                stop(event, ui, options);
            }
        });
    },
    resizeNavScrollBars: function () {
        // Resize scroll bars according to navigation panel size and folder/inbox size
        var width = 0;
        var length = 0;
        var i = 0;
        var newWidth = 0;
        var depthLength = 0;
        var depth = 1;
        var inboxDepth = 2; // always 2, root Inbox and children (inboxes don't go any deeper)
        depthLength = $('#inbox_list #Root ul').length;
        length = $('#inbox_list #Root ul li a').length;
        while (length--) {
            if (width < $($('#inbox_list #Root ul li a')[length]).width()) {
                width = $($('#inbox_list #Root ul li a')[length]).width();
                newWidth = width + 36 - inboxDepth;
            }
        }
        depthLength = $('#folder_list #Root ul').length;
        while (depthLength--) {
            if ($($('#folder_list #Root ul')[depthLength]).parent().hasClass('jstree-open')) {
                depth++;
            }
        }
        length = $('#folder_list #Root ul li').length;
        width = 0;
        i = 0;
        while (length--) {
            if (width < $($('#folder_list #Root ul li a')[length]).outerWidth()) {
                width = $($('#folder_list #Root ul li a')[length]).outerWidth();
                newWidth = width + 18 * depth - depth;
            }
        }
    },
    saveInDbCollapse: function (status, slide) {
        var prevStat = ShowHidePanel.isHideNavigationPan();
        if (status !== prevStat) {
            $(slide).data('collapsed', status);
            Utility.SetSingleUserPreference(ShowHidePanel.navPanelCollapsedPref, JSON.stringify(status));
            Utility.SetUserPreferenceWithoutAjax(ShowHidePanel.navPanelCollapsedPref, JSON.stringify(status));
        }
    },
    scrollChanges: function (left, minWidth) {
        if ($(left).width() <= minWidth) {
            $(left + ' .root_list').css('visibility', 'hidden');
            $('#browse hr').hide();
        }
        else {
            $(left + ' .root_list').css('visibility', 'visible');
            $('#browse hr').show();
        }
    },
    slideChanges: function (slide, size, collapse) {
        $(slide + ' span').css('left', size);
        var removedClass, addedClass;
        if (collapse) {
            removedClass = 'collapse_arrow';
            addedClass = 'expand_arrow';
        } else {
            addedClass = 'collapse_arrow';
            removedClass = 'expand_arrow';
        }
        $(slide + ' span').removeClass(removedClass);
        $(slide + ' span').addClass(addedClass);
    },
    // Change panel width to show/hide left hand panel
    collapsePanel: function (left, right, slide, withsave) {
        $('#inbox_list_scroll').perfectScrollbar('update');
        $('#folder_list_scroll').perfectScrollbar('update');
        // left is the panel you wish to collapse
        var minWidth = 60,
            scrollChanges = function () { ShowHidePanel.scrollChanges(left, minWidth); },
            slideChanges = function (size, status) { ShowHidePanel.slideChanges(slide, size, status); },
            saveInDbCollapse = function (status) {
                if (withsave) {
                    ShowHidePanel.saveInDbCollapse(status, slide);
                } else {
                    $(slide).data('collapsed', status);
                }
            };

        // Collapse (left) panel, resize image accordingly    
        if ($(left).width() > minWidth && $(slide).data('collapsed') === false) {
            var leftWidth = $(left).outerWidth(),
                rightWidth = $(right).outerWidth(),
                newRightWidth = rightWidth + leftWidth - 15;
            $(right).data('right_width', rightWidth);
            $(left).width(15);

            $(right).width(newRightWidth);
            $(right).css('max-width', newRightWidth);
            slideChanges($(left).width() - 12, true);
            scrollChanges();
            saveInDbCollapse(true, slide);
        }
        else {
            $(left).width($(slide).data('left_width'));
            $('#tabs').width(window.innerWidth - $('#browse').width());
            $('#tab_panel_container').width($('#tabs').width() - 5);
            if ($('body').height() <= parseInt($('body').css('min-height'), 10)) {
                $('#tabs').width($(window).width() - $('#browse').width());
                $('#tab_panel_container').width($('#tabs').width() - 5);
            }
            $('#layout').height(window.innerHeight - ShowHidePanel.getHeaderHeight() + 4);

            $(right).css('max-width', $(right).width());
            $(right).css('left', '0px');

            slideChanges($(slide).data('left'), false);
            scrollChanges();
            saveInDbCollapse(false, slide);
        }
        // Resize Image
        ShowHidePanel.resize();
    },

    // For use when window resizes / viewer resizes / user resizes nav panel
    resize: function (evtMode) {
        // Resizes dynamically resizable elements (grids, viewer...)
        /*
        IE8 infinite loop when viewing natively, causes imageResize to trigger infinitely.
        Keeping this from happening by checking to see if its being resized if so it won't get resized again for 
        another 10 ms, breaking the loop. (As seen in Page.js).
        */
        if (!ShowHidePanel.resizing) {
            ShowHidePanel.resizing = true;
            var clearFlag = function () {
                ShowHidePanel.resizing = false;
            };
            // Check size of window if less than min, make search bar smaller
            ShowHidePanel.resizeQuickSearch();
            $('#tab_panel_container').width($('#tabs').width() - 5);
            // Resize tab_panel_container to take up space when body min is reached
            var browseWidth = ShowHidePanel.getNavPanelWidth();
            $('#tab_panel_container').css('min-width',
                -($('#tab_panel_container').outerWidth(true) - $('#tab_panel_container').width()) -
                browseWidth + parseInt($('body').css('min-width'), 10)
            );
            // Calculate dimensions first and set afterward to reduce possible reflow/repaints
            var browseHeight = $(window).height() - ShowHidePanel.getHeaderHeight() - 1;
            var tabsWidth = ShowHidePanel.getWindowWidth() - browseWidth - 2;
            var tabPanelContWidth = tabsWidth - 5;
            $('#browse').height(browseHeight);
            $('#buzzspace_layout').height(browseHeight);
            $('#tabs').height('100%').css('max-height', '100%');
            $('#tabs').width(tabsWidth).css('max-width', tabsWidth);
            $('#tab_panel_container').width(tabPanelContWidth);
            ShowHidePanel.resizeAdminPage();

            //Notify any view listening to window resize events
            Backbone.trigger('customGlobalEvents:resize', { windowResize: true });
            // clear resizing flag so resizing can occur again as noted at the top
            setTimeout(clearFlag, 10);
        }
    },

    resizeQuickSearch: function () {
        var bodyWidth = $('body').width();
        var tabsWidth = $('#tabs_list').width();
        var tabsOffset = $('#tabs_list').offset();
        var tabsOffsetLeft = tabsOffset ? tabsOffset.left : 0;
        var savedSearchButtonWidth = $('#qs').find('.savedSearchSelection:visible').width();
        var dropdownWidth = $('#dropdown').width();
        var allowedWidth = bodyWidth - tabsOffsetLeft - tabsWidth - dropdownWidth - 15;
        var qsButtonMinWidth = 75;
        var qsButtonText = Constants.c.search;
        if (allowedWidth < 175) {
            qsButtonMinWidth = 22;
            qsButtonText = '';
        }
        var qtextAllowedWidth = allowedWidth - qsButtonMinWidth - savedSearchButtonWidth;
        $('#qtext').width(qtextAllowedWidth);
        $('#qsbutton').width(qsButtonMinWidth);
        $('#qsbuttonText').text(qsButtonText);
        $('#qs_suggested').width(qtextAllowedWidth + qsButtonMinWidth + savedSearchButtonWidth);
    },
    resizeAdminPage: function (noUpdateScroll) {
        if ($('#admin_tab_panel').hasClass('show_tabs')) {
            var adminHeight = ($('#admin_tab_panel').height() - $('#admin_menu').outerHeight(true)) - 10;
            $('#admin_screen').css('height', adminHeight);
            $('#admin_screen').css('max-height', adminHeight);
            $('#admin_action').css('min-height', adminHeight);
            $('#buzzEditorIframe').css('height', adminHeight);
            if (!noUpdateScroll) {
                ShowHidePanel.toggleAdminScrollbar();
            }
        }
    },
    toggleAdminScrollbar: function () {
        $('#admin_screen').scrollTop(0);
    },

    //Document View Collapse and Resize
    slideDocumentView: function (parent, selector, document) {
        selector = selector || '.resize-document';
        document = document || '.document_preview';
        $(selector, parent).resizable({
            handles: 'e',
            minWidth: ShowHidePanel.middlePanelMinWidth,
            start: function (event, ui) {
                //resizePageCover used to fix resize issue with PDFs
                $('body').css('overflow', 'hidden');
                $('body div.resizePageCover').show();

                //calculate and set the max width just once at the resizeStart rather than on the resize
                var maxWidth = 0.7 * $(parent).width();
                var maxWidthFromMiddlePanel = ShowHidePanel.getMaxWidthFromMiddlePanelWidth($('#browse'));
                if (maxWidth > maxWidthFromMiddlePanel) {
                    maxWidth = maxWidthFromMiddlePanel;
                }
                $(selector, parent).resizable("option", "maxWidth", maxWidth);
            },
            resize: function (event, ui) {
                var leftpadding = $(parent).width() - $(selector, parent).width();
                ShowHidePanel.resizedvAct(parent, document, leftpadding);
                Backbone.trigger('customGlobalEvents:resizing', { resizeDocumentView: true });
            },
            stop: function (event, ui) {
                //resizePageCover used to fix the resize issue with PDFs
                $('body div.resizePageCover').hide();
                $('body').css('overflow', 'visible');
                Utility.SetSingleUserPreference(ShowHidePanel.previewResizeWidthPref, $(document, parent).width());
                ShowHidePanel.resizeDocumentView(parent, selector, document);
            }
        });
    },
    resizedvAct: function (parent, document, size) {
        var leftpadding = ShowHidePanel.getParentDiffFix(parent, size);
        $(document, parent).css("margin-left", (leftpadding / $(parent).width() * 100) + '%');
    },
    resizeDocumentView: function (parent, selector, document) {
        var isShowDV = ShowHidePanel.isShowDocumentView();
        selector = selector || '.resize-document';
        document = document || '.document_preview';

        var docwidth = $(document, parent).width();
        if (!docwidth) {
            return;
        }
        var previewResizeWidth = Utility.GetUserPreference('previewResizeWidth');
        var availableWidth = ShowHidePanel.getAvailablePreviewWidth();
        if (!isShowDV) {
            docwidth = 20;
        }
        else if (previewResizeWidth !== undefined && selector === ".resize-document") {
            if (previewResizeWidth > availableWidth) {
                docwidth = availableWidth;
                Utility.SetSingleUserPreference('previewResizeWidth', docwidth);
            }
            else {
                docwidth = previewResizeWidth;
            }
        }
        else if ((docwidth < 400 || (availableWidth - docwidth <= 0)) && selector === ".resize-document") {
            docwidth = ShowHidePanel.getParentWidthFix(parent) * 0.4;
        }
        var contentWidth = (ShowHidePanel.getParentDiffFix(parent, docwidth) / $(parent).width() * 100) + '%';
        ShowHidePanel.resizedvAct(parent, document, docwidth);
        $(selector, parent).css("width", contentWidth);
        Backbone.trigger('customGlobalEvents:resize', { resizeDocumentView: true });
    },
    ///<summary>
    /// Collapse the previewer, resize other content to fill
    ///<param name="$parent">jquery parent containing the two panels to be resized when the previewer is expanded/collapsed</param>
    ///<param name="callback">function to call after the previewer has been collapsed</param>
    //</summary>
    collapseDocumentView: function ($parent, callback) {
        //Set 'previewerCollapsed' if it is not set or if it is being changed.
        var previewerCollapsed = Utility.GetUserPreference('previewerCollapsed');
        if (!previewerCollapsed || !Utility.convertToBool(previewerCollapsed)) {
            Utility.SetSingleUserPreference(ShowHidePanel.previewerCollapsedPref, JSON.stringify(true));
        }
        var selector = '.resize-document';
        var document = '.document_preview';
        $parent.find('.expand_arrow').removeClass('expand_arrow').addClass('collapse_arrow');
        ShowHidePanel.resizeDocumentView($parent);
        if ($(selector, $parent).resizable('instance')) {
            $(selector, $parent).resizable('destroy');
        }
        $parent.find('.document_preview_viewer, .DocumentPreviewView').addClass('hideNative');
        Utility.executeCallback(callback);
    },
    ///<summary>
    /// Expand the previewer, resize other content to allow room
    ///<param name="$parent">jquery parent containing the two panels to be resized when the previewer is expanded/collapsed</param>
    ///<param name="callback">function to call after the previewer has been collapsed</param>
    //</summary>
    expandDocumentView: function ($parent, callback) {
        //Set 'previewerCollapsed' if it is not set or if it is being changed.
        var previewerCollapsed = Utility.GetUserPreference('previewerCollapsed');
        if (!previewerCollapsed || Utility.convertToBool(previewerCollapsed)) {
            Utility.SetSingleUserPreference(ShowHidePanel.previewerCollapsedPref, JSON.stringify(false));
        }
        $parent.find('.collapse_arrow').removeClass('collapse_arrow').addClass('expand_arrow');
        var document = '.document_preview';
        ShowHidePanel.resizeDocumentView($parent);
        ShowHidePanel.slideDocumentView($parent);
        $parent.find('.document_preview_viewer, .DocumentPreviewView').removeClass('hideNative');
        $parent.find('.CaptureViewerView').removeClass('hideNative');
        Utility.executeCallback(callback);
    },
    getParentWidthFix: function (parent) {
        if ($(parent).width() < 450) {
            return $(window).width() - 170;
        }
        return $(parent).width();
    },
    getParentDiffFix: function (parent, width) {
        return ShowHidePanel.getParentWidthFix(parent) - width;
    },

    collapseOrExpandDocumentView: function ($parent, status, callback) {
        if (!status) {
            ShowHidePanel.collapseDocumentView($parent, callback);
        } else {
            ShowHidePanel.expandDocumentView($parent, callback);
        }
    },

    //#region Navigation Panels other than '#browse'
    setupNavPanelResize: function ($navPanel, $mainPanel) {
        var prefWidth = ShowHidePanel.getPreferredNavigationWidth();
        $navPanel.width(prefWidth);
        $navPanel.css('max-width', parseInt(prefWidth, 10));
        var resizeOptions = {
            left: $navPanel,
            right: $mainPanel,
            minWidth: 15,
            maxWidth: 400,
            start: function (event, ui, options) {
                $('body').css('overflow', 'hidden');
                $('body div.resizePageCover').show();
            },
            stop: function (event, ui, options) {
                $('body div.resizePageCover').hide();
                $('body').css('overflow', 'visible');
                Utility.SetSingleUserPreference('navigationLayoutWidth', ui.size.width);
            },
            resize: function (event, ui, options) {
                var totalWidth = $('body').outerWidth();
                var leftWidth = ui.size.width;
                if (leftWidth <= 50) {
                    $navPanel.find('.collapse_arrow').removeClass('collapse_arrow').addClass('expand_arrow');
                    $navPanel.find('.categoryLayout, .dashboardLayout, hr').hide();
                }
                else {
                    $navPanel.find('.expand_arrow').removeClass('expand_arrow').addClass('collapse_arrow');
                    $navPanel.find('.categoryLayout, .dashboardLayout, hr').show();
                }
                $navPanel.css('max-width', leftWidth);
                $navPanel.width(leftWidth);
                $mainPanel.width(totalWidth - leftWidth);
            }
        };
        ShowHidePanel.slidePanel(resizeOptions);
    },
    collapseNavigationPanel: function ($navPanel, $collapseTarget) {
        $navPanel.width(15);
        $navPanel.css('max-width', 15);
        $navPanel.find('.categoryLayout, .dashboardLayout, hr').hide();
        $collapseTarget.removeClass('collapse_arrow').addClass('expand_arrow');
    },
    expandNavigationPanel: function ($navPanel, $expandTarget) {
        var prefWidth = ShowHidePanel.getPreferredNavigationWidth();
        $navPanel.css('max-width', prefWidth);
        $navPanel.width(prefWidth);
        $navPanel.find('.categoryLayout, .dashboardLayout, hr').show();
        $expandTarget.removeClass('expand_arrow').addClass('collapse_arrow');
    },
    //#endregion Navigation Panels other than '#browse'

    getPreferredNavigationWidth: function () {
        var prefWidth = Utility.GetUserPreference('navigationLayoutWidth') || 170;
        prefWidth = parseInt(prefWidth, 10);
        // If the preferred width is less than 50 expand to starting width
        // If the preferred width is greater than 400, only allow the width to be 400
        prefWidth = isNaN(prefWidth) || prefWidth < 50 ? 170 : prefWidth > 400 ? 400 : prefWidth;
        return prefWidth;
    }
};
