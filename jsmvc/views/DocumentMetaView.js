var DocumentMetaView = Backbone.View.extend({
    model: undefined, // BulkViewerDataPackageCPX
    className: 'DocumentMetaView',
    approvalsView: undefined,
    fieldView: undefined,
    fieldGroupsView: undefined,
    historyView: undefined,
    relatedItemsView: undefined,
    versioningView: undefined,
    workflowView: undefined,
    ctbView: undefined,
    bound: false,
    displayNone: 'displayNone',
    events: {
        'click .gearIcon': 'enterContentTypeBuilder',
        'click .meta_accordion_title': 'accordionClick',
        'click .saveDocumentButton': 'saveDocument'
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentmetaviewlayout'));
        this.ctbPosition = options.ctbPosition;
        this.listenTo(this.model, 'change:isDirty', this.dirtyChanged);
        this.listenTo(this.model, 'change:DocumentPackage.saveExecuting', this.saveExecutingChanged);
        var that = this;
        /// OCR or Barcode shortcut reading is complete, so move find and move to the next input or text area that allows for a shortcut value
        $('body').on('recShortCutdone.' + this.cid, function (event, data) {
            var $inputs = that.$el.find('input[type="text"]:visible:not(.versChatInput):not(.wfChatInput)');  // exclude hidden inputs, version chat box, and workflow chat box
            var $txtAreas = that.$el.find('textarea:visible');
            var $combos = that.$el.find('input.isCombo:visible');
            var $cfvvs = that.$el.find('.CustomFieldValueView');
            var $cfvElems = $cfvvs.find('div.cf_displayVal:visible:not(.cf_displayDisabled)'); // exclude disabled 
            // Combine above selections
            // Exclude radios, checkboxes, hidden, disabled, and readonly elements
            var $allInputs = $inputs.add($txtAreas).add($combos).add($cfvElems).not('[readonly], [disabled], [type="hidden"], [type="checkbox"], [type="radio"]');
            var length = $allInputs.length;
            var i = 0;
            for (i = 0; i < length; i++) {
                if ($allInputs[i] === data.currentTarget[0]) {
                    var $nextSelectable = $($allInputs[i + 1] || $allInputs[0]);
                    $nextSelectable.focus().select();
                    break;
                }
            }
        });
        $('body').on('UpdatePerfectScollbars.' + this.cid, function () { that.$el.find('.view_document_data_scroll').perfectScrollbar('update'); });
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        var $fvc = this.$el.find('.fieldsContainer');
        var $fgvc = this.$el.find('.fieldGroupsContainer');
        var $rdvc = this.$el.find('.relatedDocsContainer');
        var $vvc = this.$el.find('.versioningContainer');
        var $wvc = this.$el.find('.workflowContainer');

        this.closeSubViews();
        if (ro.loaded) {
            if (!this.bound) {
                this.listenTo(this.model.getDotted('DocumentPackage.Approvals'), 'reset', this.approvalsReset);
                var wfDataPkg = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');
                if (wfDataPkg) {
                    this.listenTo(wfDataPkg, 'change:ChatLog', this.renderHistoryView);
                }
                this.listenTo(this.model.getDotted('DocumentPackage.Document'), 'change:ContentTypeId', function (model, value, options) {
                    this.inlineCTBView.setContentTypeId(value);
                });
                this.bound = true;
            }
            if (ro.appAccClass !== this.displayNone) {
                this.renderApprovalView();
            }
            if (ro.fieldsAccClass !== this.displayNone) {
                this.fieldView = new DocumentMetaFieldsView({ model: this.model, position: this.ctbPosition });
                $fvc.html(this.fieldView.render().$el);
            }
            if (ro.fgAccClass !== this.displayNone) {
                this.fieldGroupsView = new DocumentMetaFieldGroupsView({ model: this.model });
                $fgvc.html(this.fieldGroupsView.render().$el);
            }
            if (ro.histAccClass !== this.displayNone) {
                this.renderHistoryView();
            }
            if (ro.rdAccClass !== this.displayNone) {
                this.relatedItemsView = new DocumentMetaRelatedItemsView({ model: this.model });
                $rdvc.html(this.relatedItemsView.render().$el);
                if (ro.rd_acc.val !== 'closed') {
                    this.relatedItemsView.searchRelatedItems();
                }
            }
            if (ro.verAccClass !== this.displayNone) {
                this.versioningView = new DocumentMetaVersioningView({ model: this.model });
                $vvc.html(this.versioningView.render().$el);
            }
            if (ro.wfAccClass !== this.displayNone) {
                this.workflowView = new DocumentMetaWorkflowView({ model: this.model });
                $wvc.html(this.workflowView.render().$el);
            }
            this.renderInlineCTBView();
        }
        this.setupPage();
        return this;
    },
    renderHistoryView: function () {
        // Show or hide history accordion and render it
        if (this.model.hasHistoryItems()) {
            this.$el.find('.historyAccordion').show();
        }
        else {
            this.$el.find('.historyAccordion').hide();
        }
        var $hvc = this.$el.find('.historyContainer');
        this.historyView = new DocumentMetaHistoryView({ model: this.model });
        $hvc.html(this.historyView.render().$el);
    },
    renderApprovalView: function () {
        var $avc = this.$el.find('.approvalsContainer');
        if (this.model.get('DocumentPackage').userHasApprovals()) {
            this.$el.find('.approvalAccordion').show();
        }
        else {
            this.$el.find('.approvalAccordion').hide();
        }
        this.approvalsView = new DocumentMetaApprovalView({ model: this.model });
        $avc.html(this.approvalsView.render().$el);
    },
    renderInlineCTBView: function () {
        var that = this;
        var currentCTId = this.model.getDotted('DocumentPackage.Document.ContentTypeId');
        var inlineCTBView = new ContentTypeBuilderInlineView({
            model: window.contentTypes.get(currentCTId),
            bulkViewerDataPkg: that.model,
            dialogOptions: {
                position: this.ctbPosition
            },
            dialogCallbacks: {
                saveCallback: function (cleanup) {
                    var newCt = that.inlineCTBView.getCT();
                    var canModify = that.model.hasRights(Constants.sp.Modify);
                    var canModifyVersioning = that.model.canModifyVersioning();
                    if (canModify && canModifyVersioning && that.model.getDotted('DocumentPackage.Document.ContentTypeId') !== newCt.get('Id')) {
                        that.model.setDotted('DocumentPackage.Document.ContentTypeName', newCt.get('Name'));
                        that.model.setDotted('DocumentPackage.Document.ContentTypeId', newCt.get('Id'));
                        // Save the changed documents content type
                        that.model.get('DocumentPackage').save(null, {
                            success: function (response) {
                                Utility.executeCallback(cleanup);
                            },
                            failure: function () {
                                Utility.executeCallback(cleanup);
                            }
                        });
                    }
                    else {
                        that.fieldView.render();
                        Utility.executeCallback(cleanup);
                    }
                }
            },
            getDialogMaxHeight: function () {
                return that.$el.height() - that.$el.find('.meta_accordion_title:visible').outerHeight(true) - 10;
            }
        });
        this.inlineCTBView = inlineCTBView;
        this.$el.find('.buttonContainer').html(this.inlineCTBView.render().$el);
    },
    setupPage: function () {
        var that = this;
        this.$el.find('.view_document_data_scroll').perfectScrollbar({
            wheelSpeed: 20,
            wheelPropagation: true,
            minScrollbarLength: 20,
            useKeyboard: false,
            notInContainer: true
        });
        that.$el.find('.meta_accordions').sortable({
            axis: 'y',
            containment: 'parent',
            tolerance: 'pointer',
            distance: 10,
            handle: '.meta_accordion_title',
            helper: function (event, ui) {
                return $(ui).find('.meta_accordion_title').clone().height(16);
            },
            revert: true,
            start: function () {
                $(this).sortable('refreshPositions');
            },
            update: function (event, ui) {
                that.updateAccordionPrefs();
            }
        });
        this.$el.find('.ps-scrollbar-x-rail').remove();
    },
    close: function () {
        this.cleanupEvents();
        this.closeSubViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    cleanupEvents: function () {
        $('body').off('.' + this.cid);  // Remove all events bound with the namespace of this views cid
    },
    closeSubViews: function () {
        if (this.inlineCTBView) {
            this.inlineCTBView.close();
        }
        if (this.approvalsView) {
            this.approvalsView.close();
        }
        if (this.fieldView) {
            this.fieldView.close();
        }
        if (this.fieldGroupsView) {
            this.fieldGroupsView.close();
        }
        if (this.historyView) {
            this.historyView.close();
        }
        if (this.relatedItemsView) {
            this.relatedItemsView.close();
        }
        if (this.versioningView) {
            this.versioningView.close();
        }
        if (this.workflowView) {
            this.workflowView.close();
        }
    },
    getRenderObject: function () {
        var ro = this.getDefaultRenderObject();
        if (this.model && this.model.get('DocumentPackage')) {
            var ct = window.contentTypes.get(this.model.getDotted('DocumentPackage.Document.ContentTypeId'));
            var dp = this.model.get('DocumentPackage');
            ro.loaded = true;
            ro.saveClass = this.model.allowSave() ? '' : 'disabled';
            ro.hasContentTypePermissions = Utility.checkGP(window.gatewayPermissions, Constants.gp.ContentType_Edit_Basic) || Utility.checkGP(window.gatewayPermissions, Constants.gp.ContentType_Edit_Advanced);
            ro.app_acc = Utility.tryParseJSON(Utility.GetUserPreference('app_acc')) || ro.app_acc;
            ro.cfg_acc = Utility.tryParseJSON(Utility.GetUserPreference('cfg_acc')) || ro.cfg_acc;
            ro.field_acc = Utility.tryParseJSON(Utility.GetUserPreference('field_acc')) || ro.field_acc;
            ro.hist_acc = Utility.tryParseJSON(Utility.GetUserPreference('hist_acc')) || ro.hist_acc;
            ro.rd_acc = Utility.tryParseJSON(Utility.GetUserPreference('rd_acc')) || ro.rd_acc;
            ro.vers_acc = Utility.tryParseJSON(Utility.GetUserPreference('vers_acc')) || ro.vers_acc;
            ro.wf_acc = Utility.tryParseJSON(Utility.GetUserPreference('wf_acc')) || ro.wf_acc;
            ro.saveExecuting = this.model.getDotted('DocumentPackage.saveExecuting');
            ro.appAccClass = dp.userHasApprovals() ? '' : this.displayNone;
            ro.fgAccClass = customFieldMetaGroupPackages.length > 0 ? '' : this.displayNone;
            ro.fieldsAccClass = '';
            ro.histAccClass = this.model.hasHistoryItems() ? '' : this.displayNone;
            ro.rdAccClass = ct && ct.hasRelatedFields() ? '' : this.displayNone;
            ro.verAccClass = window.versioningLicensed ? '' : this.displayNone;
            ro.wfAccClass = this.model.isInWorkflow() ? '' : this.displayNone;

            if (window.isGuest) {
                ro.appAccClass = ro.histAccClass = ro.rdAccClass = ro.verAccClass = ro.wfAccClass = this.displayNone;
                ro.submitFormClass = '';
            }
            if (!this.model.canI(Constants.sp.Modify, Constants.sp.View, "savebutton")) {
                ro.saveClass = this.displayNone;
            }
        } else {
            ro.loaded = false;
        }
        return ro;
    },
    getDefaultRenderObject: function () {
        return {
            app_acc: { pos: 0, val: 'closed' },
            cfg_acc: { pos: 1, val: 'closed' },
            field_acc: { pos: 2, val: 'open' },
            hist_acc: { pos: 3, val: 'closed' },
            rd_acc: { pos: 4, val: 'closed' },
            vers_acc: { pos: 5, val: 'closed' },
            wf_acc: { pos: 6, val: 'closed' },
            appAccClass: this.displayNone,
            fgAccClass: this.displayNone,
            fieldsAccClass: this.displayNone,
            histAccClass: this.displayNone,
            rdAccClass: this.displayNone,
            verAccClass: this.displayNone,
            wfAccClass: this.displayNone,
            submitFormClass: this.displayNone
        };
    },
    updateAccordionPrefs: function () {
        var accs = this.$el.find('ul.meta_accordions > li:visible');
        var kvPairs = [];
        // Update user preferences with what is open/closed
        _.each(accs, function (acc) {
            var $accTitle = $(acc).find('.meta_accordion_title');
            var $accCont = $accTitle.next();
            var id = $accCont.data('accid');
            var userPrefVal = 'closed';

            if ($accCont.is(':visible')) {
                userPrefVal = 'open';
            }
            var value = JSON.stringify({ pos: $(acc).index(), val: userPrefVal });
            kvPairs.push({ Key: id, Value: value });
        });
        Utility.SetUserPreference(kvPairs);
    },
    accordionClick: function (e) {
        var $elem = $(e.currentTarget);
        var $target = $(e.target);
        // Add any checks for classes of elements or elements that are clicked within 
        // an accordion title bar that shouldn't trigger an accordions open/close
        if ($target.hasClass('gearIcon') || $target.hasClass('ui-icon-cancel')) {
            return;
        }
        var userPrefVal = this.changeMetaAccordion($elem);
        this.updateAccordionPrefs();
    },
    changeMetaAccordion: function ($title) {
        var $container = $title.next();
        var userPrefVal = {};
        var state = $title.hasClass('meta_accordion_title_closed') ? 'closed' : 'open';
        // If it is currently visible, hide it
        if (state === 'open') {
            $title.addClass('meta_accordion_title_closed').removeClass('meta_accordion_title_open');
            $container.addClass('closed').removeClass('open');
        }
        else {
            $title.addClass('meta_accordion_title_open').removeClass('meta_accordion_title_closed');
            $container.addClass('open').removeClass('closed');
            // Check to see if accordion is 'Related Documents', if so re-fetch the related docs
            if ($container.hasClass('relatedDocsContainer')) {
                this.relatedItemsView.searchRelatedItems();
            }
        }
        $('body').trigger('UpdatePerfectScollbars');
        return userPrefVal;
    },
    saveDocument: function (ev) {        
        var $ct = $(ev.currentTarget);
        if (!$ct.hasClass('disabled')) {
            if ($ct.hasClass('submitFormButton')) {
                this.submitForm();
            } else {
                this.model.get('DocumentPackage').save();
            }
        }               
    },
    submitForm: function () {
        var requestIds = [];
        var id = this.model.guestOption('ViewRequestId');
        if (id) {
            requestIds.push(id);
        }
        id = this.model.guestOption('FormRequestId');
        if (id) {
            requestIds.push(id);
        }
        var complete = Utility.hasFlag(this.model.getDotted('DocumentPackage.FormProperties'), Constants.fp.CompleteOnSubmit);
        this.model.get('DocumentPackage').submitForm(complete, requestIds, function () {
            if (window.isGuest) {
                var options = JSON.parse($('#viewerOptions').val());
                window.location = Constants.Url_Base + 'Guest/FormComplete?id=' + id + '&embedded=' + options.EmbeddedViewer;
            }
        });
    },
    dirtyChanged: function () {
        if (this.model.allowSave()) {
            this.$el.find('.saveDocumentButton').removeClass('disabled');
            var that = this;
            Navigation.stopNavigationCallback = false;
            Navigation.onNavigationCallback = function () {
                if (confirm(Constants.t('confirmSave'))) {
                    that.model.get('DocumentPackage').save();
                }
                that.clearDirtyNavigationCheck();
            };
        } else {
            //Submit button is enabled regardless of dirty
            this.$el.find('.saveDocumentButton:not(".submitFormButton")').addClass('disabled');
            this.clearDirtyNavigationCheck();
        }
    },
    clearDirtyNavigationCheck: function () {
        Navigation.stopNavigationCallback = true;
        Navigation.onNavigationCallback = undefined;
    },
    saveExecutingChanged: function () {
        var saveBtn = this.$el.find('.saveDocumentButton:visible');
        var executing = this.model.getDotted('DocumentPackage.saveExecuting');
        if (executing) {
            saveBtn.text('');
            var throbber = document.createElement('span');
            Utility.setElementClass(throbber, 'throbber');
            saveBtn.append(throbber);
            saveBtn.addClass('disabled');
        } else {
            saveBtn.removeClass('disabled');
            saveBtn.empty();
            saveBtn.text(saveBtn.hasClass('submitFormButton') ? Constants.c.submit : Constants.c.save);
        }
    },
    approvalsReset: function () {
        this.renderApprovalView();
        this.renderHistoryView();
    },
    enterContentTypeBuilder: function (ev) {
        // Expand the accordion if it isn't visible already
        var accEvent = new $.Event();
        var $title = this.$el.find('.fieldsAccordion .meta_accordion_title');
        accEvent.currentTarget = $title.get(0);
        var $container = $title.next();
        if (!$container.is(':visible')) {
            this.accordionClick(accEvent);
        }
    },
    metaMouseWheel: function () {
        var $acInput = $("input.ui-autocomplete-input");
        if (acInput.autocomplete('instance')) {
            $acInput.autocomplete("close");
        }
        $(".hasDatepicker").datepicker("hide").datetimepicker("hide").blur();
    }
});