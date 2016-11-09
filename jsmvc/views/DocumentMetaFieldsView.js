var DocumentMetaFieldsView = Backbone.View.extend({
    model: undefined, // BulkViewerDataPackageCPX
    className: 'DocumentMetaFieldsView',
    augmentedCFMs: undefined,
    bound: false,
    rendering: false,
    dqCompletedId: undefined,
    adminSvc: AdminServiceProxy(),
    dataLinkSvc: DataLinkServiceProxy(),
    workflowSvc: WorkflowServiceProxyV2({ skipStringifyWcf: true }),
    events: {
        'click .addField': 'addField',
        'click .saveDocumentCFButton': 'saveDocument',
        'click .syncActionExecute:not(.disabled, .executingDisabled)': 'executeSyncAction',
        'change .contenttypeid': 'contentTypeSelected'
    },
    fieldViews: undefined,
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentmetafieldsviewlayout'));
        this.ctbPosition = options.ctbPosition;
        this.listenTo(window.contentTypes, 'add', this.render);
        this.listenTo(window.contentTypes, 'remove', function (model, collection, options) {
            if (options && options.replacementId) {
                var newCT = window.contentTypes.get(options.replacementId);
                this.model.setDotted('DocumentPackage.Document.ContentTypeId', newCT.get('Id'));
            }
            this.render();
        });
        this.listenTo(window.slimSecurityClasses, 'add', this.render);
        this.listenTo(window.slimSecurityClasses, 'remove', this.render);
        this.listenTo(window.slimRecordCategories, 'add', this.render);
        this.listenTo(window.slimRecordCategories, 'remove', this.render);
        this.listenTo(window.slimInboxes, 'add', this.render);
        this.listenTo(window.slimInboxes, 'remove', this.render);

        this.listenTo(this.model, 'change:isDirty', this.dirtyChanged);
        this.listenTo(this.model, 'change:syncActionNotification', this.syncActionNotificationChanged);
        this.listenTo(this.model, 'change:DocumentPackage.Document.ContentTypeId', this.contentTypeChanged);
        this.listenTo(this.model, 'change:DocumentPackage.saveExecuting', this.saveExecutingChanged);
        this.fieldViews = [];
        this.dataLinkSvc.setCacheDuration(30000);
        this.adminSvc.setCacheDuration(30000);
        return this;
    },
    render: function () {
        this.rendering = true;
        if (this.model && this.model.get('DocumentPackage')) {
            if (!this.bound) { //Cannot bind in init, models do not exist then
                this.listenTo(this.model.getDotted('DocumentPackage.Version.CustomFieldValues'), 'add', this.customFieldValuesChanged);
                this.listenTo(this.model.getDotted('DocumentPackage.Version.CustomFieldValues'), 'remove', this.customFieldValuesChanged);
                this.bound = true;
            }
            var ro = this.getRenderObject();
            this.closeFieldViews();
            this.$el.html(this.compiledTemplate(ro));
            this.setupSyncAction();
            this.renderFieldViews(ro);
        }
        this.rendering = false;
        return this;
    },
    close: function () {
        this.closeFieldViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var ro = {
            documentId: this.model.documentId(),
            versionId: this.model.versionId(),
            saveClass: this.model.allowSave() ? '' : 'disabled',
            contTypeId: this.model.getDotted('DocumentPackage.Document.ContentTypeId') || '',
            contentTypes: [],
            secClasses: [],
            recCats: [],
            inboxes: [],
            workflows: [],
            augmentedCFMs: [],
            addFieldsClass: window.customFieldMetas.length === 0 ? 'displayNone' : '',
            saveExecuting: this.model.getDotted('DocumentPackage.saveExecuting'),
            syncActionClass: this.model.hasSyncAction() ? '' : 'displayNone',
            syncActionExecuting: this.model.get('syncActionExecuting'),
            readOnlyContentType: !this.model.canI(Constants.sp.Modify, Constants.sp.Modify, Constants.et.ContentType)
        };
        if (!this.model.canI(Constants.sp.Modify, Constants.sp.View, Constants.et.CustomFieldMeta)) {            
            ro.addFieldsClass = 'displayNone';
        }
        if (!this.model.canI(Constants.sp.Modify, Constants.sp.View, 'savebutton')) {
            ro.saveClass = 'displayNone';
        }
        this.fillEntityArrays(ro);
        return ro;
    },
    fillEntityArrays: function (ro) {
        var i = 0;
        var entities = window.contentTypes.getViewable(ro.contTypeId);
        var length = entities.length;
        var ct;
        var e;
        for (i; i < length; i++) {
            e = entities.at(i);
            selected = '';
            if (e.get('Id') === ro.contTypeId) {
                selected = 'selected="selected"';
                ct = e;
                ro.contentTypeName = e.get('Name');
            }
            ro.contentTypes.push({ Name: e.get('Name'), Id: e.get('Id'), selected: selected });
        }
        i = 0;
        entities = window.slimSecurityClasses;
        length = entities.length;
        for (i; i < length; i++) {
            e = entities.at(i);
            ro.secClasses.push({ Name: e.get('Name'), Id: e.get('Id') });
        }
        i = 0;
        entities = window.slimRecordCategories;
        length = entities.length;
        for (i; i < length; i++) {
            e = entities.at(i);
            ro.recCats.push({ Name: e.get('Name'), Id: e.get('Id') });
        }
        i = 0;
        entities = window.slimInboxes;
        length = entities.length;
        for (i; i < length; i++) {
            e = entities.at(i);
            ro.inboxes.push({ Name: e.get('Name'), Id: e.get('Id') });
        }
        i = 0;
        entities = window.slimWorkflows;
        length = entities.length;
        for (i; i < length; i++) {
            e = entities.at(i);
            ro.workflows.push({ Name: e.get('Name'), Id: e.get('Id') });
        }
        ro.augmentedCFMs = ct ? ct.getAugmentedMetas() : [];
        this.augmentedCFMs = ro.augmentedCFMs; //Maintained for adds.
    },
    renderFieldViews: function (ro) {
        var guidRx = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/;
        var i = 0;
        var length = 0;
        var cfm;
        var ct = window.contentTypes.get(ro.contTypeId);
        var ctdm = ct ? ct.getDisplayMask() : { DisplayOrder: [], IsDisplayed: [] };
        var cfCol = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        var fldOptions;
        //Step 1: Iterate through all fields in the display mask
        length = ctdm.DisplayOrder.length;
        for (i; i < length; i++) {
            var key = Object.keys(ctdm.DisplayOrder[i])[0];
            cfm = undefined;
            if (guidRx.test(key)) { //Check is this a guid, standard fields are stored by name and customfields are stored by Id
                cfm = window.customFieldMetas.get(key);
            }
            var hidden = !ctdm.IsDisplayed[key];
            if (cfm) {
                this.addCustomFieldViews(cfm, cfCol, ro.customFieldMetas, hidden, ct.metaIdIsDefaultField(key));
            } else if (key === "Folder") {
                this.fieldViews.push(new DocumentMetaFolderView({ model: this.model, hidden: hidden }));
            } else {
                fldOptions = this.getOptionsForKey(key, ro, hidden);
                if (fldOptions) {
                    this.fieldViews.push(new DocumentMetaFieldView(fldOptions));
                }
            }
        }

        //Step 2: Iterate through all standard fields that are not in the display mask
        var stndFields = this.standardFieldsNotInDisplayMask(ctdm);
        i = 0;
        length = stndFields.length;
        for (i; i < length; i++) {
            var stdf = stndFields[i];
            if (stdf === "Folder") {
                this.fieldViews.push(new DocumentMetaFolderView({ model: this.model, hidden: hidden }));
            } else {
                fldOptions = this.getOptionsForKey(stdf, ro, false);
                if (fldOptions) {
                    this.fieldViews.push(new DocumentMetaFieldView(fldOptions));
                }
            }
        }

        //Step 3: Interate though all document custom field values that are not in the display mask
        var cfvs = cfCol.allNotInMask(ctdm);
        i = 0;
        length = cfvs.length;
        for (i; i < length; i++) {
            this.fieldViews.push(new CustomFieldValueView(this.getOptionsForCFView(cfvs[i], false)));
        }

        //Step 4: Iterate through all content type default fields that are not in the display mask and not a current value.
        var metaIds = cfCol.getMetaIds();
        var defaultCFS = ct ? ct.defaultsNotInDisplayMaskOrCFValues(metaIds) : [];
        i = 0;
        length = defaultCFS.length;
        for (i; i < length; i++) {
            var dcf = defaultCFS[i];
            cfm = window.customFieldMetas.get(dcf.CustomFieldMetaID);
            var newCF = cfCol.add(cfm.createValueObject(), { ignoreChange: true });
            this.fieldViews.push(new CustomFieldValueView(this.getOptionsForCFView(newCF, false)));
        }

        //Step 5: Render each view into this view
        var $fieldsContainer = this.$el.find('.fieldsContainer');
        i = 0;
        length = this.fieldViews.length;
        for (i; i < length; i++) {
            $fieldsContainer.append(this.fieldViews[i].render().$el);
        }
    },
    closeFieldViews: function () {
        if (this.fieldViews) {
            var fv = this.fieldViews.pop();
            while (fv) {
                fv.close();
                fv = undefined;
                fv = this.fieldViews.pop();
            }
        }
    },
    standardFieldsNotInDisplayMask: function (ctdm) {
        var result = [];
        if (ctdm.IsDisplayed.Title === undefined) { result.push('Title'); }
        if (ctdm.IsDisplayed.Keywords === undefined) { result.push('Keywords'); }
        if (ctdm.IsDisplayed.Created === undefined) { result.push('Created'); }
        if (ctdm.IsDisplayed.Modified === undefined) { result.push('Modified'); }
        if (ctdm.IsDisplayed.Accessed === undefined) { result.push('Accessed'); }
        if (ctdm.IsDisplayed.DueDate === undefined) { result.push('DueDate'); }
        if (ctdm.IsDisplayed.Workflow === undefined) { result.push('Workflow'); }
        if (ctdm.IsDisplayed.SecurityClass === undefined) { result.push('SecurityClass'); }
        if (ctdm.IsDisplayed.RecordCategory === undefined) { result.push('RecordCategory'); }
        if (ctdm.IsDisplayed.Inbox === undefined) { result.push('Inbox'); }
        if (ctdm.IsDisplayed.Folder === undefined) { result.push('Folder'); }
        return result;
    },
    getOptionsForKey: function (key, ro, hidden) {
        var options = {
            model: this.model,
            entities: undefined,
            valuePath: undefined,
            idPath: undefined,
            label: '',
            hidden: hidden,
            tag: 'textarea',
            fieldName: key.toLowerCase(),
            auditInfo: false
        };
        switch (key) {
            case 'Title':
                options.valuePath = 'DocumentPackage.Version.Title';
                options.label = Constants.c.title;
                break;
            case 'Keywords':
                options.valuePath = 'DocumentPackage.Version.Keywords';
                options.label = Constants.c.keywords;
                break;
            case 'Created':
                options.valuePath = 'DocumentPackage.Document.CreatedOn';
                options.label = Constants.c.created;
                options.tag = 'span';
                options.auditInfo = true;
                break;
            case 'Modified':
                options.valuePath = 'DocumentPackage.Version.ModifiedOn';
                options.label = Constants.c.modified;
                options.tag = 'span';
                options.auditInfo = true;
                break;
            case 'Accessed':
                options.valuePath = 'DocumentPackage.Version.AccessedOn';
                options.label = Constants.c.accessed;
                options.tag = 'span';
                options.auditInfo = true;
                break;
            case 'DueDate':
                options.valuePath = 'DocumentPackage.Version.DueDate';
                options.label = Constants.c.dueDate;
                options.tag = 'datepicker';
                break;
            case 'SecurityClass':
                options.valuePath = 'DocumentPackage.Document.SecurityClassName';
                options.label = Constants.c.securityClass;
                options.idPath = 'DocumentPackage.Document.SecurityClassId';
                options.entities = ro.secClasses;
                break;
            case 'RecordCategory':
                options.valuePath = 'DocumentPackage.Document.RecordCategoryName';
                options.label = Constants.c.recordCategory;
                options.idPath = 'DocumentPackage.Document.RecordCategoryId';
                options.entities = ro.recCats;
                break;
            case 'Inbox':
                options.modelPath = 'DocumentPackage.Inbox';    // used to track changes to the Inbox model, rather than just the models properties
                options.valuePath = 'DocumentPackage.Inbox.Name';
                options.label = Constants.c.inbox;
                options.idPath = 'DocumentPackage.Inbox.Id';
                options.entities = ro.inboxes;
                options.unsetPath = 'DocumentPackage.Inbox';
                break;
            default:
                options = null;
                break;
        }
        return options;
    },
    getOptionsForCFView: function (model, hidden, isDefaultField) {
        var options = {
            hasModifyPermissions: this.model.canI(Constants.sp.Modify),
            hidden: hidden,
            augmentedCFMs: this.augmentedCFMs,
            dataLinkSvc: this.dataLinkSvc, //Passed in so we can take advantage of caching in the service proxy core.
            adminSvc: this.adminSvc,
            isDefaultField: isDefaultField
        };
        if (model) {
            options.model = model;
            // Do not hide the custom field value until it is saved, the isNew property is set on the model when it is added, and is no longer present when the field is saved
            // Do not confuse this with the isNew method on the model, which is part of backbone, they are not the same
            // This is specified here instead of the model's view because the issue is specific to this view and how it displays field values, as specified by the content type for the document
            options.hidden = hidden && !model.get('isNew');
        }
        return options;
    },
    addCustomFieldViews: function (cfMeta, cfCol, plainCfMetas, hidden, isDefaultField) {
        var cfs = cfCol.allByMetaId(cfMeta.get('Id'));
        if (cfs.length === 0 && !hidden && isDefaultField) { //Add a blank meta entry if no values were found, it is a default field, and not hidden.
            var newCF = cfCol.add(cfMeta.createValueObject(), { ignoreChange: true });//Don't trigger dirty.
            cfs.push(newCF);
        }
        var i = 0;
        var length = cfs.length;
        for (i; i < length; i++) {
            this.fieldViews.push(new CustomFieldValueView(this.getOptionsForCFView(cfs[i], hidden, isDefaultField)));
        }
    },
    addField: function () {
        var cfm = window.customFieldMetas.at(0);
        var newField = cfm.createValueObject(true);
        newField.isNew = true; // this allows field name selection in CustomFieldValueView
        var model = this.model.getDotted('DocumentPackage.Version.CustomFieldValues').add(newField);
    },
    saveDocument: function (ev) {
        if (!$(ev.currentTarget).hasClass('disabled')) {
            this.model.get('DocumentPackage').save();
        }
    },
    dirtyChanged: function () {
        if (this.model.allowSave()) {
            this.$el.find('.saveDocumentCFButton').removeClass('disabled');
        } else {
            this.$el.find('.saveDocumentCFButton').addClass('disabled');
        }
    },
    saveExecutingChanged: function () {
        var saveBtn = this.$el.find('.saveDocumentCFButton');
        var executing = this.model.getDotted('DocumentPackage.saveExecuting');

        if (executing) {
            saveBtn.text('');
            var throbber = document.createElement('span');
            Utility.setElementClass(throbber, 'throbber');
            saveBtn.append(throbber);
            saveBtn.addClass('disabled');
        } else {
            if (this.model.allowSave()) {
                saveBtn.removeClass('disabled');
            } else {
                saveBtn.addClass('disabled');
            }

            saveBtn.empty();
            saveBtn.text(Constants.c.save);
        }
    },
    customFieldValuesChanged: function (model, collection, options) {
        //Don't rerender if the add / remove was a group value.
        var isInGroup = model.isInGroup ? model.isInGroup() : false;
        if (!this.rendering && !isInGroup) {
            this.render();
        }
    },
    contentTypeSelected: function (ev) {
        var $sel = $(ev.currentTarget);
        var $op = $sel.find(':selected');
        var val = $op.val();
        var text = $op.text();
        this.model.setDotted('DocumentPackage.Document.ContentTypeName', text);
        this.model.setDotted('DocumentPackage.Document.ContentTypeId', val);
    },
    contentTypeChanged: function () {
        //Remove default fields added from prior custom field.
        var cfCol = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        var nonEmptyValues = cfCol.onlyNonEmptyValues();
        cfCol.reset(nonEmptyValues);
        this.render();
    },
    executeSyncAction: function (ev) {
        var that = this;
        var performSync = function () {
            that.displaySyncActionErrorMessages(null); //null passed in for readablity.
            that.setSyncActionEnableState(false);
            var failureFunc = function (jqXHR, textStatus, bizEx) {
                that.setSyncActionEnableState(true);
                ErrorHandler.popUpMessage(bizEx);
            };
            var successFunc = function (executeSyncActionResults) {
                if (executeSyncActionResults && executeSyncActionResults.AwaitsVerification) {
                    that.model.set('DocumentPackage', executeSyncActionResults.DocPkg);
                    that.setSyncActionEnableState(true);
                }
                else if (executeSyncActionResults && executeSyncActionResults.WasQueued) {
                    that.asyncSyncActionStarted(Constants.c.syncActionInQueuePending);
                }
                else {
                    // Sync action was to Sync and Save
                    that.setSyncActionEnableState(true);
                    that.model.fetch(); //Refresh data from the server.
                }
            };
            var executeSyncActionArgs = {
                DocPkg: that.model.get('DocumentPackage').getUpdatePackage(),
                Verify: null    // Allow content type's sync action preference to conrol verification
            };
            that.workflowSvc.executeSyncAction(executeSyncActionArgs, successFunc, failureFunc, null, null, { "ds-options": Constants.sro.NotifyVerbosely });
        };

        if (this.model.get('isDirty')) {
            // Save changes before performing a sync
            this.model.get('DocumentPackage').save(undefined, { success: performSync });
        }
        else {
            performSync();
        }
    },
    setupSyncAction: function () {
        if (this.model.hasSyncAction()) {
            var dqSa;
            var statusMsg;
            var errMsg;
            var dqEntries = this.model.get('DQEntries');
            if (dqEntries) {
                dqSa = dqEntries.getSyncActionEntry();
                if (dqSa) {
                    if (this.model.documentId() !== this.dqCompletedId) {
                        this.setSyncActionStatusMessage(dqSa.getSyncActionMessage());
                    }
                    else {
                        dqSa = undefined;   // the dq item has been completed for this document so reset the dqSa
                    }
                }
            }
            var messages = this.model.getDotted('DocumentPackage.Messages');
            if (messages) {
                msg = messages.getSyncExceptionMessage();
            }
            this.setSyncActionEnableState(!dqSa);
            this.displaySyncActionErrorMessages(errMsg);
        }
    },
    setSyncActionEnableState: function (enabled) {
        this.model.set('syncActionExecuting', !enabled);
        var $saeButton = this.$el.find('.syncActionExecute');
        var $saveDocButton = this.$el.find('.saveDocumentCFButton');
        this.dirtyChanged(); //Enable / Disable the save button.
        if (enabled) {
            $saveDocButton.removeProp('title');

            $saeButton.empty();
            $saeButton.removeClass('disabled');
            $saeButton.text(Constants.c.syncActionExecute);
            this.setSyncActionStatusMessage("", "");
        }
        else {
            $saveDocButton.attr('title', Constants.c.saveDisabledWhileSyncActionRunning);
            $saeButton.addClass('disabled');
            $saeButton.text('');
            var throbber = document.createElement('span');
            Utility.setElementClass(throbber, 'throbber');
            $saeButton.append(throbber);
        }
    },
    setSyncActionStatusMessage: function (message, percentage) {
        var $saeButton = this.$el.find('.syncActionExecute');
        $saeButton.prop('title', message);
        var $sam = this.$el.find('.syncActionMessage');
        $sam.text(message);
        $sam.prop('title', message);
        var $sap = this.$el.find('.syncActionPercentage');
        if (!percentage) {
            $sap.text('');
        }
        else {
            $sap.text(percentage + '%');
        }
    },
    syncActionNotificationChanged: function (model, options) {
        //dqn = DQNotificationEventArgs
        var dqn = this.model.get('syncActionNotification');
        switch (dqn.NotificationType) {
            case Constants.dqnt.Start:
                this.setSyncActionEnableState(false);
                this.setSyncActionStatusMessage(Constants.c.syncActionInQueueProcessing);
                break;
            case Constants.dqnt.End:
                this.setSyncActionEnableState(true);
                this.dqCompletedId = dqn.DocumentId;
                if (!dqn.JResult.Succeeded) {
                    ErrorHandler.addErrors([Constants.c.syncActionFailedDocReloading]);
                }
                this.model.fetch(); //reload after sync action has completed.
                break;
            case Constants.dqnt.Progress:
                this.setSyncActionStatusMessage(dqn.Message, dqn.PercentDone);
                break;
            case Constants.dqnt.Debug:
                //Future Dev
                break;
        }
    },
    displaySyncActionErrorMessages: function (msg) {
        var $err = this.$el.find('.syncActionMessageContainer .syncActionError');
        var $errDel = this.$el.find('.syncActionMessageContainer .syncActionErrorDelete');

        if (msg) {
            var tt = String.format("{0}: {1}", msg.CreatedDate, msg.Message);
            $err.text(msg.Message);
            $err.attr('title', tt);
            $errDel.show();
        }
        else {
            $err.text('');
            $err.removeProp('title');
            $errDel.hide();
        }
    },
    deleteSyncActionMessages: function () {
        var that = this;
        var m = messages.getSyncException();
        if (m) {
            m.destroy({ DocumentId: that.model.documentId() });
        }
        else {
            that.displaySyncActionErrorMessages(null);
        }
    },
    asyncSyncActionStarted: function (msg) {
        this.setSyncActionEnableState(false);
        this.setSyncActionStatusMessage(msg);
    }
});