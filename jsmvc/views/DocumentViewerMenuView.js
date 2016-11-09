var DocumentViewerMenuView = Backbone.View.extend({
    model: undefined, // BulkViewerDataPackageCPX
    viewerType: Constants.vt.Native,
    approvalsView: undefined,
    parentView: undefined,
    tagName: 'dl',
    className: 'DocumentViewerMenuView view_actions dropdown nested shadow',
    events: {
        "click ": "toggleMenu",
        "click div.editForm": "editForm",
        "click div.completeForm": "completeForm",
        "click div.uncompleteForm": "uncompleteForm",
        "click div.approval:not(.disabled, .executingDisabled)": "setMyApproval",
        "click div.denial:not(.disabled, .executingDisabled)": "setMyApproval",
        "click div.request_approval": "requestApprovals",
        "click div.set_required": "setNumReqApprovals",
        "click div.assign_workflow": "assignWorkflow",
        "click div.view_audit": "viewAuditInfo",
        "click div.view_auditTrail": "viewAuditTrail",
        "click div.changeAssignee": "reassignWfDocument",
        "click div.removeFromWorkflow": "removeFromWorkflow",
        "click .reset_Workflow": "resetWfDocuments",
        "click div.showHits": "showDocHits",
        "click div.showDocText": "showDocText",
        "click div.show_thumbs_left": "showThumbsLeft",
        "click div.show_thumbs_right": "showThumbsRight",
        "click div.show_hide_thumbnails": "showHideThumbnails",
        "click .documentZoomLevelContainer .submenu li > div": "setZoomLevel",
        "click .emailSelectOptions": "emailSelectOptions",
        "click div.change_sec": "changeSecurity",
        "click div.move_To": "move_To",
        "click div.print_view": "printItems",
        "click div.freeze_view": "freeze",
        "click div.unfreeze_view": "unfreeze",
        "click div.cutoff_view": "cutoff",
        "click div.save_view": "saveACopy",
        "click div.scan_view": "scan",
        "click div.DueDate_view": "setDueDate",
        "click div.set_start_page": "setStartPage",
        "click div.barcodeShortcut_view": "barcodeShortcut",
        "click div.ocrShortcut_view": "ocrShortcut",
        "click div.requeueImaging_view": "requeueImaging",
        "click div.view_meta": "viewMeta",
        "click div.view_native": "viewAsNative",
        "click div.checkOut": "checkOut",
        "click div.checkIn": "checkIn",
        "click div.changeDraftOwner": "changeDraftOwner",
        "click div.downloadDraft": "downloadDraft",
        "click div.delete": "deleteDocument",
        "click div.deletePages": "deletePages",
        "click div.reorderPages": "reorderPages"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentviewermenulayout'));
        this.viewerType = options.viewerType;
        this.approvalView = options.approvalView;
        this.parentView = options.parentView;
        this.model.set('viewAuditInfo', !!$.cookie('viewAuditInfo'));
        this.listenTo(this.model, 'change:thumbnails', function (model, value, options) {
            // Only display page options menu option if thumbnails are being displayed
            var $pageOptions = this.$el.find('.pageOptionsContainer');
            $pageOptions.toggle(!!value);
        });
        this.listenTo(this.model, 'change:showMetaView', this.render);
        this.listenTo(this.model.get('DocumentPackage'), 'change:Approval', function (model, value, options) {
            this.$el.find('.approval, .denial').removeClass('disabled');
            if (value) {
                if (value.isApproved()) {
                    this.$el.find('.approval').addClass('disabled');
                }
                else if (value.isDenied()) {
                    this.$el.find('.denial').addClass('disabled');
                }
            }
        });
        this.listenTo(this.model.getDotted('DocumentPackage.Approvals'), 'reset', this.render);
        this.listenTo(this.model, 'change:showDocumentText', function (model, value, options) {
            this.render();
        });
        this.listenTo(this.model, 'change:showDocumentHits', function (model, value, options) {
            this.render();
        });
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        return this;
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var ro = this.getBaseRenderObject();
        var isReadOnly = Utility.isReadOnlyUser();
        var docGetPkg = this.model.get('DocumentPackage');
        var doc = docGetPkg.get('Document');
        var ver = docGetPkg.get('Version');
        var vsi = docGetPkg.get('VersionStateInfo');
        var hasModify = this.model.canI(Constants.sp.Modify);
        var hasModifyContent = this.model.canI(Constants.sp.Modify_Content);
        var hasExport = this.model.canI(Constants.sp.Export_Output);
        var isPreview = this.viewerType === Constants.vt.ImagePrevew;
        var zoomlevelval = Utility.GetUserPreference('zoomlevel');
        if (zoomlevelval) {
            ro.fitValue = zoomlevelval;
        }
        else {
            ro.fitValue = "width";
        }
        if (hasExport) {
            var menuTemplate = doT.template(Templates.get('emailmenulayout'));
            ro.emailIsIndented = true;
            ro.emailHtml = menuTemplate(ro);
        }
        var recUserPref = Utility.GetUserPreference('viewocrShortcut');
        var r;
        if (recUserPref) {
            r = JSON.parse(recUserPref);
            if (r === 'viewocrShortcut') {
                ro.ocrShortCut = true;
                $('Body').trigger('setRecShortCutParameters', { isocrShortcutOn: true });
            }
            else if (r === 'hideocrShortcut') {
                ro.ocrShortCut = false;
                $('Body').trigger('setRecShortCutParameters', { isocrShortcutOn: false });
            }
        }
        recUserPref = Utility.GetUserPreference('viewbarcodeShortcut');
        if (recUserPref) {
            r = JSON.parse(recUserPref);
            if (r === 'viewbarcodeShortcut') {
                ro.barcodeShortCut = true;
                $('Body').trigger('setRecShortCutParameters', { isbarcodeShortcutOn: true });
            }
            else if (r === 'hidebarcodeShortcut') {
                ro.barcodeShortCut = false;
                $('Body').trigger('setRecShortCutParameters', { isbarcodeShortcutOn: false });
            }
        }
        var vmUserPref = Utility.GetUserPreference('viewMeta');
        if (vmUserPref) {
            r = JSON.parse(vmUserPref);
            if (r === 'viewMeta') {
                ro.showMetaPanel = true;
            }
            else if (r === 'hideMeta') {
                ro.showMetaPanel = false;
            }
        }
        else {
            ro.showMetaPanel = true;
        }
        var thumbPref = Utility.GetUserPreference('thumbnails');
        if (thumbPref && thumbPref !== 'thumbnailoff') {
            if (thumbPref === 'thumbnailright') {
                ro.thumbnailsRight = true;
            }
            else if (thumbPref === 'thumbnailleft') {
                ro.thumbnailsLeft = true;
            }
        }
        else {
            ro.thumbnailsHide = true;
        }
        if (this.viewerType === Constants.vt.Image) {
            menuTemplate = doT.template(Templates.get('pageoptionsmenulayout'));
            ro.pageOptionsHtmlData = menuTemplate(ro);
        }
        var hasFormPart = this.model.hasFormPart();
        var isFormComplete = this.model.isFormComplete();
        var isDraft = this.model.currentVersionIsDraft();
        var isInWorkflow = this.model.isInWorkflow();
        ro.showEditForm = window.formsLicensed && hasModify && hasModifyContent && !isPreview && hasFormPart && !isFormComplete;
        ro.showCompleteForm = window.formsLicensed && hasModify && hasModifyContent && !isPreview && hasFormPart && !isFormComplete;
        ro.showUncompleteForm = window.formsLicensed && hasModify && hasModifyContent && !isPreview && isDraft && hasFormPart && isFormComplete;
        ro.isInEditForm = !!this.model.get('inFormEdit');
        ro.showAllApprovalOptions = !isPreview;
        ro.showAssignWorkflowOption = hasModify;
        ro.showViewAuditOption = !isPreview;
        ro.viewAudit = !isPreview && !!this.model.get('viewAuditInfo');
        ro.showAuditTrailOption = !isReadOnly;
        ro.showChangeAssigneeOption = hasModify && isInWorkflow;
        ro.showRemoveFromWorkflow = hasModify && isInWorkflow;
        ro.showResetWorkflow = hasModify && isInWorkflow;
        ro.showDocumentHits = !!this.model.get('showDocumentHits');
        ro.showHitsOption = this.viewerType === Constants.vt.Image && this.model.get('searchResultId');
        ro.showDocumentText = !!this.model.get('showDocumentText');
        ro.showDocumentTextOption = this.viewerType === Constants.vt.Image;
        ro.showZoomLevelOption = this.viewerType === Constants.vt.Image;
        ro.fitWidth = ro.fitValue === "width";
        ro.fitHeight = ro.fitValue === "height";
        ro.showSecurityOption = this.model.canI(Constants.sp.Classify) || this.model.canI(Constants.sp.Modify_Permissions);
        ro.showMoveToOption = !isPreview && hasModify;
        ro.showPrintOption = hasExport;
        ro.showRecordsManagementOption = hasModify;
        ro.showDownloadOption = hasExport;
        ro.showScanOption = this.viewerType === Constants.vt.Image && hasModifyContent;
        ro.showDueDateOption = hasModify;
        ro.showStartPageOption = this.viewerType === Constants.vt.Image;
        ro.showRecognitionOption = this.viewerType === Constants.vt.Image;
        ro.showReQueueImagingOption = hasModify;
        ro.showRequestApprovalOption = isPreview;
        ro.showMetaPanelOption = !isPreview;
        ro.showThumbnailOption = this.viewerType === Constants.vt.Image;
        ro.showVersioningOption = window.versioningLicensed;
        if (window.versioningLicensed) {
            ro.isDraft = docGetPkg.get('Version').get('CurrentState') === Constants.ds.Draft;
        }
        ro.showDeleteOption = this.model.canI(Constants.sp.Delete);
        var myApproval = this.model.getMyApproval();
        ro.isApproved = !!(myApproval && myApproval.isApproved());
        ro.isDenied = !!(myApproval && myApproval.isDenied());
        ro.showViewNativeOption = !isPreview;
        return ro;
    },
    getBaseRenderObject: function () {
        return {
            showEditForm: false,
            showCompleteForm: false,
            showUncompleteForm: false,
            showAllApprovalOptions: false,
            showAssignWorkflowOption: false,
            showViewAuditOption: false,
            viewAudit: false,
            showAuditTrailOption: false,
            showChangeAssigneeOption: false,
            showRemoveFromWorkflow: false,
            showResetWorkflow: false,
            showHitsOption: false,
            showZoomLevelOption: false,
            fitWidth: false,
            fitHeight: false,
            fitValue: "",
            emailHtml: "",
            showSecurityOption: false,
            showMoveToOption: false,
            showPrintOption: false,
            showRecordsManagementOption: false,
            showDownloadOption: false,
            showScanOption: false,
            showDueDateOption: false,
            showStartPageOption: false,
            showRecognitionOption: false,
            barcodeShortCut: false,
            ocrShortCut: false,
            showReQueueImagingOption: false,
            pageOptionsHtmlData: "",
            showRequestApprovalOption: false,
            showMetaPanelOption: false,
            showMetaPanel: false,
            showThumbnailOption: false,
            thumbnailsLeft: false,
            thumbnailsRight: false,
            thumbnailsHide: false,
            showViewNativeOption: true,
            showVersioningOption: false,
            isDraft: false,
            showDeleteOption: false
        };
    },
    toggleMenu: function (ev) {
        var $dt = this.$el.find('dt');
        var $targ = $(ev.target);
        var showMenu = $targ.is('dt') || $dt.has($targ).length > 0;
        this.$el.find('.children').toggle(showMenu);
        if (showMenu) {
            ShowHideUtil.toggleNativeViewer(true);
        }
    },
    editForm: function () {
        var current = !!this.model.get('inFormEdit');
        Utility.SetSingleUserPreference("formEditMode", !current);
        this.model.set('inFormEdit', !current);
    },
    completeForm: function () {
        this.model.completeForm(FormDialogs.completeForm);
    },
    uncompleteForm: function () {
        var that = this;
        var okFunc = function (cleanup) {
            that.model.uncompleteForm();
            that.model.get('DocumentPackage').save(null, {
                success: function () {
                    Utility.executeCallback(cleanup);
                },
                failure: function () {
                    Utility.executeCallback(cleanup);
                }
            });
        };
        var diagOpts = {
            title: Constants.c.uncompleteForm,
            width: 300,
            height: 150
        };
        DialogsUtil.generalPromptDialog(Constants.c.uncompleteFormPrompt, okFunc, null, diagOpts);
    },
    setMyApproval: function (ev) {
        var approving = $(ev.currentTarget).hasClass('approval');
        this.model.setMyApproval(ApprovalDialogs.setMyApproval, { approving: approving, mayDelaySave: true });
    },
    requestApprovals: function () {
        this.model.requestApproval(ApprovalDialogs.requestApproval);
    },
    setNumReqApprovals: function () {
        this.model.setNumRequired(ApprovalDialogs.setNumRequired);
    },
    assignWorkflow: function () {
        this.model.assignWorkflow(WorkflowDialogs.assignWorkflow);
    },
    viewAuditInfo: function () {
        if ($.cookie('viewAuditInfo')) {
            $.cookie('viewAuditInfo', null);                                            // We were viewing audit info, remove the cookie
            $('.menu_item .view_audit_check').removeClass('ui-icon ui-icon-check');          // Remove the check mark, to show you are no longer viewing audit info. (Non-native Viewer)
        } else {
            $.cookie('viewAuditInfo', true);                                         // We were viewing audit info, remove the cookie
            $('.menu_item .view_audit_check').addClass('ui-icon ui-icon-check');   // Add the check mark, to show you are no longer viewing audit info. (Non-Native Viewer)            
        }
        this.model.set('viewAuditInfo', !!$.cookie('viewAuditInfo'));
    },
    viewAuditTrail: function () {
        this.model.get('DocumentPackage').viewAuditTrail(DocumentMetaDialogs.viewAuditTrail);
    },
    reassignWfDocument: function () {
        // Change a wf document to another group / user (workflow utility)
        this.model.setWorkflowAssignee(WorkflowDialogs.setAssignee);
    },
    removeFromWorkflow: function () {
        var that = this;
        var wfData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');
        wfData.removeWorkflow(WorkflowDialogs.remove, function () {
            that.model.fetch();
        });
    },
    resetWfDocuments: function () {
        var that = this;
        var wfData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');
        wfData.resetWorkflow(WorkflowDialogs.reset, function () {
            that.model.fetch();
        });
    },
    showDocHits: function () {
        this.model.set('showDocumentHits', !this.model.get('showDocumentHits'));
    },
    showDocText: function () {
        this.model.set('showDocumentText', !this.model.get('showDocumentText'));
    },
    setZoomLevel: function (event) {
        var $target = $(event.currentTarget);
        var val = $target.find('input').val();
        if (!val) {
            val = 'width';
        }

        this.$el.find('.documentZoomLevelContainer .submenu').find('.ui-icon').removeClass('ui-icon');

        if (!val || val === 'width') {
            this.$el.find('.view_width_check').addClass('ui-icon');
            this.$el.find('.view_width_check').addClass('ui-icon-check');
        }
        else if (val === 'height') {
            this.$el.find('.view_fit_check').addClass('ui-icon');
            this.$el.find('.view_fit_check').addClass('ui-icon-check');
        }
        else {
            var uiVal = val * 100;
            this.$el.find('.view_zoom' + uiVal + '_check').addClass('ui-icon');
            this.$el.find(' .view_zoom' + uiVal + '_check').addClass('ui-icon-check');
        }

        $('body').data('fit', val);
        Utility.SetSingleUserPreference("zoomlevel", val);
        this.model.trigger('zoomLevelChanged');
    },
    emailSelectOptions: function () {
        this.model.email(Send.emailDialog);
    },
    changeSecurity: function () {
        var that = this;
        var docId = this.model.documentId();
        var isPreview = this.viewerType === Constants.vt.ImagePrevew;
        SecurityUtil.toggleDialogSecClassDropdown($('#container_security'), !!isPreview);
        SecurityUtil.getSecPermData(docId, 'Document', undefined, function (esi) { that.securityChanged(esi); });
    },
    securityChanged: function (entitySecurityInformation) {
        var docGetPkg = this.model.get('DocumentPackage');
        docGetPkg.set('RolePermissions', entitySecurityInformation.RolePermissions);
        docGetPkg.set('UserPermissions', entitySecurityInformation.UserPermissions);
        docGetPkg.set('ModifiedTicks', entitySecurityInformation.ModifiedTicks);
    },
    move_To: function () {
        this.model.get('DocumentPackage').moveTo(DocumentMetaDialogs.moveTo);
    },
    printItems: function () {
        this.model.print(Send.printDialog);
    },
    freeze: function () {
        this.model.freeze(RecordsMgmtDialogs.freeze);
    },
    unfreeze: function () {
        this.model.unfreeze(RecordsMgmtDialogs.unFreeze);
    },
    cutoff: function () {
        this.model.cutoff(RecordsMgmtDialogs.cutoff);
    },
    saveACopy: function () {
        this.model.get('DocumentPackage').download(Send.downloadDialog);
    },
    scan: function () {
        var that = this;
        ClientService.onScanAppend = true;
        var docGetPkg = this.model.get('DocumentPackage');
        var documentId = this.model.documentId();
        var versionId = this.model.versionId();
        $('body').unbind('onScanAppendSuccess').bind('onScanAppendSuccess', function (ev, data) {
            that.model.fetch();
            $('body').trigger('MassDocumentUpdated', { ids: [documentId] });
        }).unbind('onScanAppendComplete').bind('onScanAppendComplete', function (ev, data) {
            $('#scan_dialog').find('.throbber').hide();
            $('#scan_dialog').dialog('close');
            ClientService.resetCaptureButtonStates();
        });

        var pageNum = this.model.getCurrentPage();
        ScanUtil.showDialog(docGetPkg, pageNum);
    },
    setDueDate: function () {
        this.model.setDueDate(SearchResultDialogs.setDueDate);
    },
    setStartPage: function (event) {
        var that = this;
        var selector = '#setStartPageDialog';
        var input = $(selector + '  input[name="startPage"]');
        var number = this.model.getDotted('DocumentPackage.Document.StartPage');
        if (number <= 0) {
            number = 1;
        }
        $(selector).dialog({
            autoOpen: false,
            resizable: false,
            width: 450,
            height: 190,
            modal: true,
            open: function () {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                input.numeric({ negative: false, decimal: false }).val(number);
            },
            close: function () {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            },
            buttons: [
                {
                    text: Constants.c.ok,
                    click: function () {
                        value = input.val();
                        if (value < 1) {
                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                            ErrorHandler.addErrors({ errorLocator: Constants.c.previewPageOutOfRange });
                        } else {
                            that.model.setDotted('DocumentPackage.Document.StartPage', value);
                            that.model.setCurrentPage(value);
                            $(this).dialog("close");
                        }
                    }
                },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ]
        });
        $(selector).dialog('open');
    },
    barcodeShortcut: function () {
        $('Body').trigger('setRecShortCutParameters', { toggleBarcodeShortCut: true });
        this.render();
    },
    ocrShortcut: function () {
        $('Body').trigger('setRecShortCutParameters', { toggleOcrShortCut: true });
        this.render();
    },
    requeueImaging: function (event) {
        this.model.requeueImaging();
    },
    viewMeta: function () {
        this.model.toggleMetaViewer();
    },
    viewAsNative: function () {
        if ($.cookie('useNative')) {
            $.cookie('useNative', null);
        } else {
            $.cookie('useNative', true, 365);
        }
        $('body').trigger('desiredViewerChanged');
    },
    checkOut: function () {
        this.model.checkOut(VersioningDialogs.checkOut, VersioningDialogs.checkOutFileDownload);
    },
    checkIn: function () {
        this.model.checkIn(VersioningDialogs.checkIn);
    },
    changeDraftOwner: function () {
        this.model.checkOut(VersioningDialogs.checkOut, VersioningDialogs.checkOutFileDownload);
    },
    downloadDraft: function () {
        this.model.downloadDraft(VersioningDialogs.checkOutFileDownload);
    },
    deleteDocument: function () {
        // All content items are selected
        // Prompt user to delete document instead of
        $('#action-message pre').text(String.format(Constants.c.deleteAllContent, '\r\n', Constants.c.continueYesNo));
        this.model.deleteDocument(SearchResultDialogs.deleteOrRemoveDialog);
    },
    showThumbsLeft: function (ev) {
        var $targ = $(ev.currentTarget);
        var checkClasses = 'ui-icon ui-icon-check';
        this.$el.find('.thumbs_menu_item').find('.thumb_left_check, .thumb_right_check, .thumb_off_check').removeClass(checkClasses);
        $targ.find('span.thumb_left_check').addClass(checkClasses);
        this.model.set('thumbnails', 'thumbnailleft');
    },
    showThumbsRight: function (ev) {
        var $targ = $(ev.currentTarget);
        var checkClasses = 'ui-icon ui-icon-check';
        this.$el.find('.thumbs_menu_item').find('.thumb_left_check, .thumb_right_check, .thumb_off_check').removeClass(checkClasses);
        $targ.find('span.thumb_right_check').addClass(checkClasses);
        this.model.set('thumbnails', 'thumbnailright');
    },
    showHideThumbnails: function (ev) {
        var $targ = $(ev.currentTarget);
        var checkClasses = 'ui-icon ui-icon-check';
        this.$el.find('.thumbs_menu_item').find('.thumb_left_check, .thumb_right_check, .thumb_off_check').removeClass(checkClasses);
        $targ.find('span.thumb_off_check').addClass(checkClasses);
        this.model.set('thumbnails', '');
        this.model.trigger('zoomLevelChanged');
    },
    ///<summary>
    /// Delete the selected page(s) or entire document if all pages are selected
    ///</summary>
    deletePages: function () {
        var docPkg = this.model.get('DocumentPackage');
        var pageRanges = docPkg.getPageRangesFromSelectedThumbs(docPkg.getSelectedThumbs());
        // Check for a simple delete condition. If we are deleting all the pages then delete document.
        var fullRange = docPkg.isFullPageRange(pageRanges.actualSelectedPages, docPkg.get('Pages').length);
        if (fullRange) {
            this.deleteDocument();
        }
        else if (!pageRanges.burstRequired) {
            docPkg.deletePagesSimple(PageOptionsDialogs.deletePagesSimple);
        }
        else {
            docPkg.burstAndDeletePages(PageOptionsDialogs.burstAndDeletePages);
        }
    },
    ///<summary>
    /// Reorder documents pages
    ///</summary>
    reorderPages: function (event, cmTarget) {
        this.model.get('DocumentPackage').reorderPages(PageOptionsDialogs.reorderPages);
    }
});