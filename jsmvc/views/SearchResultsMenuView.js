var SearchResultsMenuView = Backbone.View.extend({
    model: undefined, // SearchResult
    tagName: 'dl',
    className: 'list_action dropdown shadow nested',
    events: {
        "click": "displayMenu",
        "click .view_results": "viewClick",
        "click .assign_workflow": "assignWorkflow",
        "click .emailSelectOptions": "emailSelectOptions",
        "click .exportToCSV": "exportToCSV",
        "click .merge_results": "mergeResults",
        "click .change_sec": "changeSecurity",
        "click .move_to": "moveTo",
        "click .print_results": "printGridItems",
        "click .cutoff_results": "cutoff",
        "click .freeze_results": "freeze",
        "click .unfreeze_results": "unfreeze",
        "click .remove_results": "removeItems",
        "click .removeFromInbox": "removeFromInbox",
        "click .removeFromFolder": "removeFromFolder",
        "click .request_approval": "requestApprovals",
        "click .download_results": "downloadResults",
        "click .due_date_results": "setDueDate",
        "click .priority_results": "setPriority",
        "click .watch_results": "changeWatches",
        "click .reassignWfDocument": "reassignWfDocument",
        "click .changeWfDocuments": "changeWfDocuments",
        "click .resetWfDocuments": "resetWfDocuments",
        "click .removeWfDocItems": "removeWfDocItems",
        "click .terminateItems": "terminateItems",
        "click .delete_results": "deleteItems",
        "click .excludeGroups": "excludeGroups"
        // Rendered here; bound in corresponding view
        //"click .column_chooser": "apColumnChooserActivate",
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('searchresultsmenulayout'));

        var that = this;
        this.listenTo(this.model.get('Results'), 'change:isSelected', function (model, value, options) {
            that.render();
        });
        this.listenTo(this.model.get('Results'), 'reset', function (model, collection, options) {
            that.render();
        });
        this.listenTo(window.userPreferences, 'add change remove', function (model, value, options) {
            var key = model.get('Key');
            if (that.options && that.options.userPrefexcludeGroupsKey===key)
            {
                that.options.excludeGroupsChecked = Utility.convertToBool(Utility.GetUserPreference(key)) || false;
                that.render();
            }    
        });
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        return this;
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = this.getBaseRenderObject();
        var isReadOnly = Utility.isReadOnlyUser();
        var searchableEntities = this.model.get('Results');
        if (searchableEntities) {
            var selected = searchableEntities.getSelected();
            var idx = 0;
            var length = selected.length;
            var showModifyOptions = false;
            var showExportOptions = false;
            var showMergeOption = false;
            var showSecurityOption = false;
            var showDeleteOption = false;
            if (length > 0) {
                for (idx; idx < length; idx++) {
                    //TODO: If any selected search results are lacking a permission required for a menu option, prompt the user with the overridable exception dialog as the initial dialog, rather than after the user submits it for a first time
                    var ep = selected[idx].get('EffectivePermissions');
                    if (!showExportOptions && Utility.hasFlag(ep, Constants.sp.Export_Output)) {
                        showExportOptions = true;
                    }
                    if (!showModifyOptions && Utility.hasFlag(ep, Constants.sp.Modify)) {
                        showModifyOptions = true;
                    }
                    if (!showMergeOption && Utility.hasFlag(ep, Constants.sp.Modify_Content)) {
                        showMergeOption = true;
                    }
                    if (!showSecurityOption && (Utility.hasFlag(ep, Constants.sp.Classify) || Utility.hasFlag(ep, Constants.sp.Modify_Permissions))) {
                        showSecurityOption = true;
                    }
                    if (!showDeleteOption && Utility.hasFlag(ep, Constants.sp.Delete)) {
                        showDeleteOption = true;
                    }
                }
                ro.showMergeOption = showMergeOption && ro.showMergeOption;
                ro.showSecurityOption = showSecurityOption;
                ro.showAssignWorkflowOption = showModifyOptions && ro.showAssignWorkflowOption;
                ro.showRequestApprovalOption = !isReadOnly && ro.showRequestApprovalOption;
                ro.showAllRemoveOptions = showModifyOptions && ro.showAllRemoveOptions;
                ro.showDeleteOption = showDeleteOption;
                if (showExportOptions && ro.showEmailOption) {
                    var menuTemplate = doT.template(Templates.get('emailmenulayout'));
                    ro.gridIdentifier = this.options.gridIdentifier || undefined;
                    ro.emailIsIndented = true;
                    ro.emailHtml = menuTemplate(ro);
                }
                ro.showExportToCSVOption = showExportOptions && ro.showExportToCSVOption;
                ro.showPrintOption = showExportOptions;
                ro.showRecordsManagementOption = showModifyOptions && ro.showRecordsManagementOption;
                ro.showDownloadOption = showExportOptions;
                ro.showDueDateOption = showModifyOptions && ro.showDueDateOption;
            }
        }
        return ro;
    },
    getBaseRenderObject: function () {
        return {
            showViewOption: true,
            showAssignWorkflowOption: this.options.showAssignWorkflowOption === false ? false : !!this.options.showAssignWorkflowOption || !this.options.showAllWorkflowOptions,
            showAllWorkflowOptions: !!this.options.showAllWorkflowOptions,
            showColumnChooserOption: true,
            emailHtml: "",
            showEmailOption: this.options.showEmailOption === false ? false : true,
            showExportToCSVOption: !!this.options.showExportToCSVOption,
            showMergeOption: !!this.options.showMergeOption,
            showSecurityOption: this.options.showSecurityOption === false ? false : true,
            showMoveToOption: !!this.options.showMoveToOption,
            showPrintOption: this.options.showPrintOption === false ? false : true,
            showRecordsManagementOption: !!this.options.showRecordsManagementOption,
            showAllRemoveOptions: !!this.options.showAllRemoveOptions,
            showRequestApprovalOption: !!this.options.showRequestApprovalOption,
            showDownloadOption: this.options.showDownloadOption === false ? false : true,
            showDueDateOption: this.options.showDueDateOption === false ? false : true,
            showPriorityOption: !!this.options.showPriorityOption,
            showWatchOption: !!this.options.showWatchOption,
            showDeleteOption: this.options.showDeleteOption === false ? false : true,
            deleteOptionLabel: this.options.deleteOptionLabel || Constants.c['delete'],
            showExcludeGroups: this.options.showExcludeGroups,
            excludeGroupsChecked: this.options.excludeGroupsChecked
        };
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    displayMenu: function (ev) {
        var $dt = this.$el.find('dt');
        var $targ = $(ev.target);
        var showMenu = $targ.is('dt') || $dt.has($targ).length > 0;
        this.$el.find('.children').toggle(showMenu);
    },
    viewClick: function () {
        var results = this.model.get('Results');
        var versionIds;
        if (results) {
            var ids = results.getEntityIds(); //Selected Ids
            if (ids) {
                versionIds = ids.versionIds;
            }
        }
        $('body').trigger('ViewDocuments', { versionIds: versionIds, resultId: this.model.get('ResultId') });
    },
    deleteItems: function () {
        this.model.deleteOrRemoveItems(SearchResultDialogs.deleteOrRemove, false);
    },
    removeItems: function () {
        this.model.deleteOrRemoveItems(SearchResultDialogs.deleteOrRemove, true);
    },
    cutoff: function () {
        this.model.cutoff(RecordsMgmtDialogs.cutoff);
    },
    freeze: function () {
        this.model.freeze(RecordsMgmtDialogs.freeze);
    },
    unfreeze: function () {
        this.model.unfreeze(RecordsMgmtDialogs.unFreeze);
    },
    emailSelectOptions: function () {
        this.model.email(Send.emailDialog);
    },
    exportToCSV: function () {
        this.model.exportToCSV(SearchResultDialogs.exportToCSV);
    },
    mergeResults: function () {
        this.model.mergeResults(SearchResultDialogs.mergeResults);
    },
    changeSecurity: function () {
        this.model.changeSecurity(SearchResultDialogs.changeSecurity);
    },
    printGridItems: function () {
        this.model.print(Send.printDialog);
    },
    downloadResults: function () {
        this.model.download(Send.downloadDialog);
    },
    removeFromInbox: function () {
        this.model.removeFromInbox(SearchResultDialogs.removeFromInbox);
    },
    removeFromFolder: function () {
        this.model.removeFromFolder(SearchResultDialogs.removeFromFolder);
    },
    assignWorkflow: function () {
        this.model.assignWorkflow(WorkflowDialogs.assignWorkflow);
    },
    requestApprovals: function () {
        this.model.requestApprovals(ApprovalDialogs.requestApproval);
    },
    setDueDate: function () {
        this.model.setDueDate(SearchResultDialogs.setDueDate);
    },
    moveTo: function () {
        this.model.moveTo(SearchResultDialogs.moveTo);
    },
    setPriority: function () {
        this.model.setPriority(SearchResultDialogs.setPriority);
    },
    changeWatches: function () {
        window.watches.fetch(); // ensure the watches are up to date before editing them
        window.watches.changeWatches(SearchResultDialogs.changeWatches);
    },
    reassignWfDocument: function () {
        this.model.setWorkflowAssignee(WorkflowDialogs.setAssignee);
    },
    changeWfDocuments: function () {
        this.model.changeWorkflows(WorkflowDialogs.assignWorkflow);
    },
    resetWfDocuments: function () {
        this.model.resetWfDocuments(WorkflowDialogs.reset);
    },
    removeWfDocItems: function () {
        this.model.removeFromWorkflow(WorkflowDialogs.removeOrTerminateWorkflow);
    },
    terminateItems: function () {
        this.model.terminateWorkflow(WorkflowDialogs.removeOrTerminateWorkflow);
    },
    excludeGroups: function (ev) {
        var currentTarget = $(ev.currentTarget);
        var userPrefKey = this.options.userPrefexcludeGroupsKey;

        if (currentTarget.parent().find('.search_result_check').hasClass('ui-icon-check')) {
            Utility.SetSingleUserPreference(userPrefKey, false);
        }
        else {
            Utility.SetSingleUserPreference(userPrefKey, true);
        }
        this.model.fetch();
    }
    //#endregion Event Handling
});