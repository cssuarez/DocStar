var Voice = {
    voicereceived: function (sender, args) {
        var text = JSON.parse(args.JSonString).Data.toLowerCase();
        switch (text) {
            case "search": case "find":
                // go to quick search box (and expect more input)
                $('#qtext').focus();
                break;
            case "open all":
                // opens all selected items in result; otherwise ignored
                if (window.location.hash.match(/searchid/ig)) {
                    var grid = $('#retrieve_layout_results_list');
                    grid.jqGrid('resetSelection');
                    var ids = grid.getDataIDs();
                    if (ids.length > 0) {
                        // Select each item in the grid
                        var i = 0;
                        var il;
                        for (i = 0, il = ids.length; i < il; i++) {
                            // id: id of row to be selected
                            // boolean: whether to trigger onSelectRow event or not
                            grid.jqGrid('setSelection', ids[i], false);
                        }
                        // View selected documents
                        $('#view_results').click();
                        // Hide the action list (opens after calling click)
                        $('#results_actions .list_action .children').hide();
                    }
                }
                break;
            case "prior document":
                // assumes one is now viewing a collection of documents; moves to prior one.
                // bonus: move selection up one in result list, if not currently viewing
                //TODO: scain do the bonus described above
                Voice.documentNavigation('prev');
                break;
            case "next document":
                // assumes one is now viewing a collection of documents; moves to next one,
                // but if you're already on the last, "wrap around" -- go to first.
                // bonus: move selection down one in result list, if not currently viewing
                //TODO: scain do the bonus described above
                Voice.documentNavigation('next');
                break;
            case "prior page":
                // assumes one is now viewing a multi-page document; moves to prior page
                if (Voice.isMultiPage()) {
                    Voice.pageNavigation('prev');
                }
                break;
            case "next page":
                // assumes one is now viewing a multi-page document; moves to next page
                // but if you're already on the last, "wrap around" -- go to first.
                if (Voice.isMultiPage()) {
                    Voice.pageNavigation('next');
                }
                break;
            case "next":
                // same as "next page"
                // bonus: if not viewing a multi-page document, treat as "next document"                
                if (Voice.isMultiPage()) {
                    Voice.pageNavigation('next');
                }
                else {
                    Voice.documentNavigation('next');
                }
                break;
            case "prior":
                // if most recent "next" command was "next document", treat this as "prior document".
                // if most recent "next" command was "next page", treat this as "prior page".
                //TODO: scain keep track of last next command call ?
                if (Voice.isMultiPage()) {
                    Voice.pageNavigation('prev');
                }
                else {
                    Voice.documentNavigation('prev');
                }
                break;
            default:
                // assumes "search" or "find" has just been recognized;
                // this text is directed to the quick search box, and the search is initiated after this text.
                // (usability testing may suggest that an explicit "GO" command is needed, but for now, it is not.)
                // bonus: this text could be issued to keywords, title, or perhaps other text input controls.
                // If it starts with search or find do a search
                if (text.startsWith('search') || text.startsWith('find')) {
                    var searchText = text.split(' ');
                    searchText[0] = '';
                    searchText = $.trim(searchText.join(' '));
                    $('#qtext').val(searchText);
                    $('#qsbutton').click();
                }
                //TODO: scain do the bonus described above
                break;
        }
    },
    isMultiPage: function () {
        var selector;
        if (window.location.hash.match(/view/ig)) {
            selector = 'span.viewer_results_max';
        }
        else if (window.location.hash.match(/native/ig)) {
            selector = 'span.nativeViewer_results_max';
        }
        if ($(selector) && $(selector).text() && $(selector).text().split(' ').length > 1) {
            var val = parseInt($(selector).text().split(' ')[1], 10);
            return val > 1;
        }
    },
    pageNavigation: function (operation) {

        var selector;
        if (window.location.hash.match(/view/ig)) {
            selector = 'span[name="viewer_navigation_' + operation + '"]';
        }
        else if (window.location.hash.match(/native/ig)) {
            selector = 'span[name="nativeViewer_navigation_' + operation + '"]';
        }
        $(selector).click();

    },
    documentNavigation: function (operation) {
        var viewerOpSelector = '#metadata_navigation_' + operation;
        var grid = $('#retrieve_layout_results_list');
        var ids = grid.getDataIDs();
        var lastId;
        if (ids) {
            lastId = ids[ids.length - 1];
        }
        // Viewing document in viewer
        if (window.location.hash.match(/view/ig) || window.location.hash.match(/native/ig)) {
            $(viewerOpSelector).click();
        }
        else if (window.location.hash.match(/searchid/ig)) {
            // Viewing search results
            grid.jqGrid('setSelection', lastId, true);
        }
    },
    init: function () {
        //TODO: need to determine connection to systray
        //ClientService.subscribedInstalled(Voice.installStateChanged);
    },
    installStateChanged: function (sender, args) {
        var jsObj = JSON.parse(args.JSonString);
        if (jsObj && ClientService.navigatorPluginInstalled()) {
            var content = $('#slccobj')[0].content;
            if (content.ClientVoiceInput) {
                content.ClientVoiceInput.Connect();
                content.ClientVoiceInput.Error = Voice.onSilverlightError;
                content.ClientVoiceInput.VoiceReceived = Voice.voicereceived;
            }
        }
    },
    onSilverlightError: function (sender, args) {
        var appSource = "";
        if (sender !== null && sender !== 0) {
            appSource = sender.getHost().Source;
        }

        var errorType = args.ErrorType;

        if (errorType === "ImageError" ||
				errorType === "MediaError") {
            return;
        }
        ErrorHandler.report(window.location.href, "Voice.onSilverlightError", args.ErrorMessage);
    }
};