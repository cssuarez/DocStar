var SyncActionEditView = Backbone.View.extend({
    className: 'syncActionEditView',
    viewData: {},
    events: {
        "click #newSyncAction, #editSyncAction": "updateSyncAction",
        "change select[name='SyncActionId']": "disableSyncActionPref",
        "change input[name='SyncActionPreference']": "filterSyncAction"
    },
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('syncactionlayout'));
        this.viewData.selectedContentType = options.selectedContentType;
    },
    getRenderObject: function () {
        var ro = {};
        ro.selectedContentType = this.viewData.selectedContentType;
        ro.syncActionId = ro.selectedContentType !== undefined ? ro.selectedContentType.get('SyncActionId') : '';
        ro.sap = ro.selectedContentType.get('SyncActionPreference');
        ro.syncType = WorkflowUtil.mapSAPToWFAT(ro.sap);
        return ro;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        this.setSyncActionPref();
        this.disableSyncActionPref();
        return this.$el;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    
    setSyncActionPref: function () {
        this.$el.find('[name="SyncActionPreference"][value="' + this.viewData.sap + '"]').prop('checked', true);
    },
    disableSyncActionPref: function () {
        var $syncActionId = this.$el.find('select[name="SyncActionId"]');
        var option = $syncActionId.find('option:selected');
        var sapSel = this.$el.find('input[name="SyncActionPreference"]');
        var length = sapSel.length;
        var i;
        var syncType = WorkflowUtil.mapSAPToWFAT(Constants.sap.SyncAndVerify);
        var sap = option.data() ? option.data().type : '';
        // Enable sync action preference if the sync type is at least SyncVerifyAction
        if (!sap || Utility.checkSAT(sap, syncType)) {
            sapSel.prop('disabled', false);
        }
        else {
            // Disable sync action preference radio buttons if the type is sync and save, and check sync and save as preference
            for (i = 0; i < length; i++) {
                var item = $(sapSel[i]);
                if (WorkflowUtil.mapSAPToWFAT(item.val()) === sap) {
                    item.prop('checked', true);
                    break;
                }
            }
            sapSel.prop('disabled', true);
        }
    },
    filterSyncAction: function (e) {
        var targ = $(e.currentTarget);
        // Map SyncActionPreference to WFActionType
        var sap = parseInt(targ.val(), 10);
        var syncType = WorkflowUtil.mapSAPToWFAT(sap);
        var $syncActionsSel = this.$el.find('select[name="SyncActionId"]');
        var selectedId = $syncActionsSel.find('option:selected').val();
        $syncActionsSel.empty();
        $syncActionsSel.append($('<option></option>').prop('selected', true));
        var length = window.syncActions.length;
        var i;
        for (i = 0; i < length; i++) {
            var item = window.syncActions.at(i);
            var type = item.get('Type');
            if (Utility.checkSAT(type, syncType)) {
                var opt = $('<option></option>').data('type', type).val(item.get('Id')).text(item.get('Name'));
                if (opt.val() === selectedId) {
                    opt.prop('selected', true);
                }
                $syncActionsSel.append(opt);
            }
        }
    },
    renderSyncAction: function (syncActionId) {
        var ev = new $.Event();
        ev.currentTarget = this.$el.find('select[name="SyncActionId"]');
        ev.currentTarget.empty().append('<option value=""></option>');
        this.viewData.syncActionId = syncActionId || this.viewData.selectedContentType.get('SyncActionId');
        var i;
        var length = window.syncActions.length;
        for (i = 0; i < length; i++) {
            var sa = window.syncActions.at(i);
            var $opt = $(document.createElement('option'));
            var id = sa.get('Id');
            $opt.val(id);
            $opt.data('type', sa.get('Type'));
            $opt.prop('selected', syncActionId === id);
            $opt.text(sa.get('Name'));
            ev.currentTarget.append($opt);
        }
        var createdSyncAction;
        for (i = 0; i < length; i++) {
            if (syncActionId === window.syncActions.at(i).get('Id')) {
                createdSyncAction = window.syncActions.at(i);
                break;
            }
        }
        if (createdSyncAction) {
            this.viewData.sap = WorkflowUtil.mapWFATToSAP(createdSyncAction.get('Type'));
            this.setSyncActionPref();
        }
        var filterEv = new $.Event();
        filterEv.currentTarget = this.$el.find('input[name="SyncActionPreference"]:checked')[0];
        this.filterSyncAction(filterEv);
        this.disableSyncActionPref(ev);
    },
    /*
        Allow creation of a New Sync Action or the modification of a selected Sync Action
    */
    updateSyncAction: function (event) {
        var that = this;
        var callback = function () {
            var selector = $(window.parent.document).find('#inlineWorkflowDesigner');
            var $syncActionSelect = that.$el.find('select[name="SyncActionId"]');
            var syncActionId = $syncActionSelect.find('option:selected').val();
            var wfSelector = selector.find('iframe');
            var wfWindow = wfSelector[0].contentWindow;
            var wfActionEditor = wfWindow.ActionEditor;
            var successFunc = function (syncActiId, oldActionId) {
                syncActiId = syncActiId || syncActionId;
                wfActionEditor.hideSAPOpts = [];
                var updateFunc = function () {
                    if (oldActionId && oldActionId !== syncActiId) {
                        var i;
                        var cts = window.contentTypes;
                        for (i = 0; i < cts.length; i++) {
                            if (cts.at(i).get("SyncActionId") === oldActionId) {
                                cts.at(i).set("SyncActionId", actionId, { silent: true });
                            }
                        }
                    }
                    that.renderSyncAction(syncActiId);
                };
                Utility.actionLibraryItemSuccess(updateFunc, syncActiId, oldActionId);
            };
            if (wfActionEditor) {
                wfActionEditor.hideSAPOpts = [Constants.wfat.LibraryItem];
                if (wfWindow) {
                    wfWindow.allData = wfWindow.Workflow.fetchAllData(); // Re-fetch data on displaying the action library item editor (after the initial edit)
                    wfWindow.Workflow.setArgumentLibrary();
                }
                wfActionEditor.displayALIEditor(selector, wfActionEditor, syncActionId, successFunc, Constants.wfat.SyncAction);
                if (wfWindow) {
                    wfWindow.Workflow.setActionArgumentLibrary();
                }
            }
            var selectPosition = $syncActionSelect.offset();
            selector.find('iframe').contents().find('#action_editor').parent().css({ top: selectPosition.top - 10, left: selectPosition.left + $syncActionSelect.width() });
        };
        Utility.setupWfDesigner(callback);
    }
});