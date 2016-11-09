/// <reference path="Utility.js" />
/// <reference path="~/Content/LibsExternal/perfect-scrollbar.js" />
/// <reference path="../LibsExternal/a_jquery.js" />
// Showing/Hiding functionality
var ShowHideUtil = {

    //#region Refactor for Bug 3373 (possible removal)
    //Dropdown menu for fields
    showHideDropdownMenu: function (event) {
        var $targ = $(event.currentTarget);
        if ($targ.hasClass('disabled')) {
            return;
        }
        // Initialize passed in event data
        var dropdown = event.data.dropdownSelector;
        var childHover = event.data.childHoverSelector;
        var childShowHide = event.data.childShowHideSelector;
        var unique_id;
        // Initialize data values
        if ($('body').data('show') === undefined) {
            $('body').data('show', false);
        }
        if ($(dropdown).data('unique_id') === undefined) {
            $(dropdown).data('unique_id', 'unique_0');
        }
        // Check for unique class to hide/show dropdown
        if ($(event.currentTarget).attr('id')) {
            unique_id = "#" + $(event.currentTarget).attr('id');
        }
        else if ($(event.currentTarget).parent().attr('id')) {
            unique_id = "#" + $(event.currentTarget).parent().attr('id');
        }
        else if ($(event.currentTarget).parent().attr('class')) {
            unique_id = "." + $(event.currentTarget).parent().attr('class');
        }
        else {
            unique_id = "#" + $(event.currentTarget).parent().parent().attr('id');
        }
        $(dropdown).data('unique_id', unique_id);
        // Check to see if its been clicked if so, show, if not hide on alternate clicks        
        var hideViewer = $(event.currentTarget).hasClass('view_actions'); // If the menu dropdown is not the native retrieve menu perform actions to show/hide native viewer, else do nothing
        if ($('body').data('show') === false) {
            if ($(event.currentTarget).hasClass('dropdown')) {
                // Don't change position to fixed if it is a meta panel item

                var dropdownMenu = $(event.currentTarget).find("dd ul.children").show();
                dropdownMenu.css('position', 'fixed');
                if ($(event.currentTarget).offset().top + $(event.currentTarget).height() + dropdownMenu.height() < window.innerHeight) {
                    dropdownMenu.css('left', $(event.currentTarget).offset().left - window.pageXOffset);
                    dropdownMenu.css('bottom', 'auto');
                    dropdownMenu.css('top', $(event.currentTarget).offset().top + $(event.currentTarget).height());
                } else {
                    dropdownMenu.css('left', $(event.currentTarget).offset().left + $(event.currentTarget).width() - window.pageXOffset);
                    dropdownMenu.css('bottom', 0);
                    dropdownMenu.css('top', 'auto');
                }
                var maxWidth = $(event.currentTarget).width(); // TODO what is this doing?  It is collapsing menu items to 24px!
                dropdownMenu.find('span.anchor').css('width', 'auto');
                dropdownMenu.find('span.anchor').each(function () {
                    if (this.offsetWidth > maxWidth) {
                        maxWidth = this.offsetWidth;
                        if ($(this).next().hasClass('right_icon')) {
                            maxWidth += $(this).next().width();
                        }
                    }
                });
                if ($(event.currentTarget).parent().attr("id") === "wfItems_filter" || $(event.currentTarget).parent().attr("id") === "arItems_filter") {
                    dropdownMenu.find('span.anchor').css('width', '80%');
                    dropdownMenu.css('min-width', $(event.currentTarget).width() > 190 ? $(event.currentTarget).width() : 190);

                } else {
                    dropdownMenu.find('span.anchor').css('width', '100%');
                    dropdownMenu.css('min-width', $(event.currentTarget).width());
                }

                dropdownMenu.css('max-width', maxWidth);
            }
            else {
                // IE and chrome don't trigger when the dropdown has focus but do when the .parent anchor has focus...
                $(event.currentTarget).find('.parent').focus();
            }
            $(unique_id).find(childHover).addClass('hover');
            //display the submenu
            $(unique_id).find(childShowHide).show();
            if (hideViewer) {
                ShowHideUtil.toggleNativeViewer(true); // Hide native viewer when children are shown
            }
            $('body').data('show', true);
            this.toggleFunction = event.data.toggleFunction;
            if (this.toggleFunction) {
                this.toggleFunction(true);
            }
        }
        else if ($('body').data('show') === true) {
            $(unique_id + ' ' + childHover).removeClass('hover');
            //hide the submenu
            if ($('.view_actions .children').is(':visible')) {
                ShowHideUtil.toggleNativeViewer(false); // Show native viewer when children are hidden
            }
            $(unique_id).find(childShowHide).hide();
            $('body').data('show', false);
            if (this.toggleFunction) {
                this.toggleFunction(false);
                delete this.toggleFunction;
            }
        }
    },
    /*
    *** IE8 Fix ***
    Check to see if textContent or innerText property of event.currenttarget 
    *** IE8 Fix ***
    */
    getText: function (event) {
        var text;
        if (typeof event.currentTarget.textContent === 'string') {
            text = event.currentTarget.textContent;
        }
        else {
            text = event.currentTarget.innerText;
        }
        return text;
    },
    // Set dropdown values for fields in retrieve page
    setSelectedDropdownText: function (event) {
        var dropdown = event.data.dropdownSelector;
        var dropdownFieldText = event.data.dropdownFieldTextSelector;
        var text = ShowHideUtil.getText(event);
        $($(dropdown).data('unique_id') + ' ' + dropdownFieldText).text($.trim(text));
        $($(dropdown).data('unique_id') + ' ' + dropdownFieldText).val($(event.currentTarget).attr('name'));
        $($(dropdown).data('unique_id') + ' ' + dropdownFieldText).attr('title', $.trim(text));
    },
    // Set dropdown text for our own generic dropdowns
    setDropdownTextGeneric: function (event) {
        var container = event.data.containerSelector;
        var dropdownFieldText = event.data.dropdownFieldTextSelector;
        var text = ShowHideUtil.getText(event);
        var hasChanged = false;
        if ($(container + ' ' + dropdownFieldText).text() !== text) {
            $(container + ' ' + dropdownFieldText).text($.trim(text));
            hasChanged = true;
        }
        if ($(container + ' ' + dropdownFieldText).val() !== $(event.currentTarget).attr('name')) {
            $(container + ' ' + dropdownFieldText).val($(event.currentTarget).attr('name'));
            $(container + ' ' + dropdownFieldText).attr('title', $.trim(text));
            hasChanged = true;
        }
        return hasChanged;
    },
    //#endregion

    //#region Show/Hide Accordions
    //Hide accordions if they are empty upon selection of folder/inbox
    hideAccordions: function () {
        var hideAccordion = false;
        // Hide preview image when going to a different folder/inbox
        $('.document_preview_image').hide();
        var dbfi = $('#field_search_container .database_field_input input');
        if (dbfi.hasClass('database_field_text') === true) {
            hideAccordion = $.trim($('#field_search_container .database_field_text').val()) === '';
        }
        if (dbfi.hasClass('date_picker') === true) {
            hideAccordion = $.trim($('#field_search_container .date_picker').val()) === '';
        }
        if ($('#field_search_container .database_field_input input').hasClass('earlier_date_picker') === true) {
            hideAccordion = $.trim($('#field_search_container .earlier_date_picker').val()) === '' || $.trim($('#field_search_container .later_date_picker').val()) === '';
        }
        if (hideAccordion === true) {
            var fieldSearch = '#field_search';
            $(fieldSearch + ' .accordion').animate('fast').hide();
            ShowHideUtil.closeAccordion(fieldSearch, false);
        }
        if ($('#text_word_phrase_text').val() !== undefined) {
            var textSearch = '#text_search';
            if ($.trim($('#text_word_phrase_text').val()) === '') {
                $('#text_search .accordion').animate('fast').hide();
                ShowHideUtil.closeAccordion(textSearch, false);
            }
        }
    },
    /*
        Open/close the fieldset based on its visibility
        @e: event that triggered the toggle
        @keepFieldsetBorder: whether to maintain a fieldsets normal border
    */
    toggleFieldset: function (e, keepFieldsetBorder) {
        var fs = $(e.currentTarget).parent();
        var fsContents = fs.find('> div');
        var fsIcon = fs.find('legend span.ui-icon-plus, legend span.ui-icon-minus');
        var state = '';
        var fsId = $(fs).attr('id');
        if (fsContents.is(':visible')) {
            fsContents.hide();
            fs.removeClass('open').addClass('closed');
            fsIcon.removeClass('ui-icon-minus').addClass('ui-icon-plus');
            if (!keepFieldsetBorder) {
                fs.css('border', 'hidden');
            }
            state = 'closed';
        }
        else {
            fsContents.show();
            fs.removeClass('closed').addClass('open');
            fsIcon.removeClass('ui-icon-plus').addClass('ui-icon-minus');
            if (!keepFieldsetBorder) {
                fs.css('border', '1px solid #000');
            }
            state = 'open';
        }
        if (fsId) {
            Utility.SetSingleUserPreference(fsId, state);
        }
    },
    showHideWfAccordion: function (e, contSelector, callback) {
        var $targ = $(e.target);
        var $currTarg = $(e.currentTarget);
        if ($targ.hasClass('noAccordionEvent') || $currTarg.hasClass('noAccordionEvent')) {   // Don't allow expand/collapse when the clicked item has this class
            return;
        }
        var $parent = $currTarg.parent();
        var $accContainers = $(contSelector).find('.WorkflowViewAccordions > div');
        var $currTargAccContainer = $accContainers.has($currTarg);
        var updateAccordionContainers = function () {
            var $firstNotClosed = $(contSelector).find('.WorkflowViewAccordions > div:not(.isClosed)').first();
            $accContainers.removeClass('isFirstOpen');
            $firstNotClosed.addClass('isFirstOpen');
            // If all closed make last accordion full height
            var allClosed = false;
            var idx = 0;
            var length = $accContainers.length;
            for (idx; idx < length; idx++) {
                if (!$accContainers.eq(idx).hasClass('isClosed')) {
                    allClosed = false;
                    break;
                }
                allClosed = true;
            }
            if (allClosed) {
                $accContainers.last().addClass('allClosed');
            }
            else {
                $accContainers.last().removeClass('allClosed');
            }            
            $('#workflow_layout').css('overflow', 'visible');
            if (callback) {
                Utility.executeCallback(callback);
            }
        };
        if (!$parent.hasClass('disabled_accordion')) {
            $('#workflow_layout').css('overflow', 'hidden');
            if (!$parent.find('.accordion').is(':visible')) {
                $parent.find('.accordion').animate({ height: 'toggle' }, 'fast', function () {
                    $parent.find('.accordion').show();
                    ShowHideUtil.openAccordion($currTargAccContainer, true);
                    $currTargAccContainer.removeClass('isClosed');
                    $parent.removeClass('disabled_accordion');
                    $parent.find('.accordion').removeClass('isOpen');

                    updateAccordionContainers();
                });
            }
            else {
                $parent.find('.accordion').animate({ height: 'toggle' }, 'fast', function () {
                    $parent.find('.accordion').hide();
                    ShowHideUtil.closeAccordion($currTargAccContainer, true);
                    $currTargAccContainer.addClass('isClosed');
                    $parent.removeClass('disabled_accordion');
                    updateAccordionContainers();
                });
            }
        }

    },
    showHideAccordion: function (event) {
        var parent = $(event.currentTarget).parent();
        event.preventDefault();
        var funcAccordionToggle = function () {
            Backbone.trigger('customGlobalEvents:accordionToggle');
        };
        if (!$(parent).hasClass('disabled_accordion')) {
            $(parent).addClass('disabled_accordion');
            var accSelector = $(parent).find('.accordion');
            if (accSelector.css('display') === 'none') {
                accSelector.animate({ height: 'toggle' }, 'fast', function () {
                    ShowHideUtil.openAccordion(parent, true);
                    $(parent).removeClass('disabled_accordion');
                    funcAccordionToggle();
                });
            }
            else {
                accSelector.animate({ height: 'toggle' }, 'fast', function () {
                    ShowHideUtil.closeAccordion(parent, true);
                    $(parent).removeClass('disabled_accordion');
                    funcAccordionToggle();
                });
            }
        }
    },
    /* Get the height of the grid for the search results page (what it needs to be set to to take up the rest of the page) */
    getSearchGridHeight: function () {
        this.searchBtnHeight = $('#accordion_container .search_btns').outerHeight();
        if ($('#items_location .accordion').css('display') === 'none') {
            this.itemHeight = $('#items_location .accordion_title').outerHeight();
        }
        else {
            this.itemHeight = $('#items_location .accordion_title').outerHeight() + $('#items_location .accordion').height();
        }
        if ($('#field_search .accordion').css('display') === 'none') {
            this.fieldHeight = $('#field_search .accordion_title').outerHeight();
        }
        else {
            this.fieldHeight = $('#field_search .accordion_title').outerHeight() + $('#field_search .accordion').height();
        }
        if ($('#text_search .accordion').css('display') === 'none') {
            this.textHeight = $('#text_search .accordion_title').outerHeight();
        }
        else {
            this.textHeight = $('#text_search .accordion_title').outerHeight() + $('#text_search .accordion').height();
        }
        var gridHeight = $('#accordion_container').height() - this.itemHeight - this.fieldHeight - this.textHeight - this.searchBtnHeight - 50;
        return gridHeight;
    },
    getCaptureGridHeight: function () {
        if ($('#scanAcc .accordion').css('display') === 'none') {
            this.scanAccHeight = $('#scanAcc .accordion_title').outerHeight();
        }
        else {
            this.scanAccHeight = $('#scanAcc .accordion_title').outerHeight() + $('#scanAcc .accordion').height();
        }
        if ($('#importAcc .accordion').css('display') === 'none') {
            this.importAccHeight = $('#importAcc .accordion_title').outerHeight();
        }
        else {
            this.importAccHeight = $('#importAcc .accordion_title').outerHeight() + $('#importAcc .accordion').height();
        }
        this.captureBtnsHeight = $('#capture_layout .captureBtns').outerHeight();
        var numGrids = 1;
        if ($('#capture_layout .processingGridCont').length > 0 && $('#capture_layout .processingGridCont').is(':visible')) {
            numGrids = 2;
        }
        return (($('#capture_layout').height() - this.scanAccHeight - this.importAccHeight - this.captureBtnsHeight) / numGrids) - 50;
    },
    toggleAccordion: function (element, setUserPreference, close) {
        var accState = close ? 'closed' : 'open';
        var notAccState = close ? 'open' : 'closed';
        var selector = $(element).attr('id') || $(element).data('accid') || $(element).selector;
        if (setUserPreference && selector) {
            Utility.SetSingleUserPreference(selector, accState);
        }
        $(element).find('.accordion_title').removeClass('accordion_title_' + notAccState).addClass('accordion_title_' + accState);
        if (!close) {
            $('.accordion').css('overflow', 'visible');
        }
    },
    closeAccordion: function (element, setUserPreference) {
        ShowHideUtil.toggleAccordion(element, setUserPreference, true);
    },
    openAccordion: function (element, setUserPreference) {
        ShowHideUtil.toggleAccordion(element, setUserPreference, false);
    },
    //#endregion

    /* Used for timing to close dropdowns/submenus */
    menuTimer: function (reset, callback) {
        var func = function () {
            ShowHideUtil.menuTimer();
        };
        if (reset) {
            $('body').data('view_actions_timer', null);
        }
        if ($('body').data('view_actions_timer') && $('body').data('view_actions_timer') < new Date() - 450) {
            if ($('.view_actions .children').is(':visible')) {
                ShowHideUtil.toggleNativeViewer(false); // Show native viewer when children are hidden
            }
            this.hideMenu(callback);
        }
        else if ($('body').data('view_actions_timer')) {
            setTimeout(func, 50);
        }
        else {
            return false;
        }
    },
    hideMenu: function (callback) {
        $('.children').hide();
        if (callback) {
            callback();
        }
        $('body').data('show', false);
        $('body').data('view_actions_timer', null);
        if (this.toggleFunction) {
            this.toggleFunction(false);
            delete this.toggleFunction;
        }
    },
    /* Used to show or hide native viewer for when menus are shown or dialogs are displayed */
    toggleNativeViewer: function (hideViewer, useCounter) {
        var $iframe = $('.fullIframe');
        var count = $('body').data('nativehidecount') || 0;
        if (hideViewer) {
            if (useCounter) {
                $('body').data('nativehidecount', ++count);
            }
            $iframe.addClass('hideNative');
        } else {
            if (useCounter) {
                count = Math.max(--count, 0);
                $('body').data('nativehidecount', count);
            }
            if (count > 0) {
                return; //Other items pending the require the native panel to be hidden.
            }
            $iframe.removeClass('hideNative');
        }
    }

};