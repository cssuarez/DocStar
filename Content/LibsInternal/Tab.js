/// <reference path="Utility.js" />
/*
*   Tab functions
*/
var Tab = {
    init: function () {
        if (window.location.hash === '') {
            window.location.hash = '#Home';
        }
        $('#tabs_list_container').delegate('#tabs_list .tab', 'click', function (ev) {
            if (!$(ev.currentTarget).hasClass('disabled')) {
                Tab.updateTab(ev);
            }
            return false;
        });

    },
    updateTab: function (ev) {
        Tab.updateTabById(ev.currentTarget.id, undefined, true);
    },
    updateTabById: function (id, noNavigationCallback, fromUserClick) {
        $('body').css('overflow', 'hidden');
        // Checks to see if the current id panel is visible if so exit early
        if ($('#' + id + '_panel').hasClass('show_tabs') === true) {
            if (id === 'retrieve_tab' && fromUserClick) {
                var retrieveRouter = Page.routers.Retrieve;
                retrieveRouter.showSearch();
            }
            $('body').css('overflow', 'visible');
            Utility.executeCallback(noNavigationCallback);

            return;
        }

        // Hide the left hand navigation panel and its collapse/expand button when viewing the reports tab
        var isTabWithOwnNavigation = id === 'reports_tab' || id === 'forms_tab';
        $('#browse, #show_hide_panel').toggle(!isTabWithOwnNavigation);

        $('.document_preview_viewer').addClass('hideNative');
        // Adds and removes classes depending on which tab was clicked
        $('#tab_panel_container .show_tabs').addClass('hide_tabs').removeClass('show_tabs');
        $('#tabs_list li.tab').addClass('tab_unselected');
        $('#tabs_list li.tab').removeClass('tab_selected');
        $('#' + id).addClass('tab_selected');
        $('#' + id).removeClass('tab_unselected');
        $('#' + id + '_panel').removeClass('hide_tabs');
        $('#' + id + '_panel').addClass('show_tabs');
        // Obtaining Hash from id
        var hrefID = id.split('_', 1).toString();
        hrefID = hrefID.charAt(0).toUpperCase() + hrefID.slice(1);
        var arr = hrefID.split('_');
        hrefID = arr[0];
        //only update the Hash if it does not contain the hrefID.  
        //otherwise you may wipe out data that is bookmarked in the url hash :-o no!
        var idx = window.location.hash.indexOf(hrefID, 0);
        var triggerRoute = true;
        if (idx !== 0 && idx !== 1) {
            if (hrefID === 'Workflow' && window.loadedWorkflowOnce) {
                var workflowTabRefreshOption = Utility.GetUserPreference('workflowTabRefreshOption') || 'None';
                triggerRoute = workflowTabRefreshOption === 'None' ? false : true;
            }
            Utility.navigate(hrefID, Page.routers[hrefID], triggerRoute);
        }
        var isHomeTab = id === 'home_tab';
        if (isHomeTab) {
            ShowHidePanel.resize();
        }
        $('body').css('overflow', 'visible');
    }
};