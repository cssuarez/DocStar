/// <reference path="Tab.js" />
/**
 * Class Navigation
 * this is a centralized place for navigating through our custom interface.
 * rather than store css selectors all over the place we'll just use this to centralize
 * for navigation reasons
 */
var Navigation = {

    /**
    * showHomePanel - select the home panel in the tabs
    */
    lastPage: "",
    showHomePanel: function () {
        Tab.updateTabById('home_tab');
    },

    /**
    * showRetrievePanel - select the retrieve panel in the tabs
    */

    showRetrievePanel: function () {
        Tab.updateTabById('retrieve_tab');
    },

    /**
    * showCapturePanel - select the capture panel in the tabs
    */

    showCapturePanel: function () {
        Tab.updateTabById('capture_tab');
    },
    /**
    * showWorkflowPanel - select the workflow panel in the tabs
    */
    showWorkflowPanel: function (noNavigationCallback) {
        Tab.updateTabById('workflow_tab', noNavigationCallback);
    },
    /*
        showReportsPanel - select the Reports panel in the tabs
    */
    showReportsPanel: function () {
        Tab.updateTabById('reports_tab');
    },
    /**
    * showFormsPanel - select the forms panel in the tabs
    */
    showFormsPanel: function () {
        Tab.updateTabById('forms_tab');
    },
    /**
    * showAdminPanel - select the admin panel in the tabs
    */
    showAdminPanel: function () {
        Tab.updateTabById('admin_tab');
    },

    stopNavigationCallback: false,
    onNavigationCallback: undefined,
    onNavigationCallbackData: undefined,
    afterSaveCallback: undefined,   // to be performed after a save
    afterMetaSaveCallback: undefined, // to be performed after a meta save (not page changes, eg. Annotations/Rotations...)
    onNavigate: function (s) {
        if (this.onNavigationCallback && !this.stopNavigationCallback) {
            this.onNavigationCallback(this.onNavigationCallbackData, s);
            this.onNavigationCallback = undefined; // always, only one callback is allowed
        }
        this.stopNavigationCallback = false;
        this.lastPage = s;
    }
};