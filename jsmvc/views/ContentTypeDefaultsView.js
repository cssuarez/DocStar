/// <reference path="../../Content/LibsInternal/DialogsUtil.js" />
/// <reference path="../../Content/LibsInternal/Utility.js" />
var ContentTypeDefaultsView = Backbone.View.extend({
    viewData: {},
    prevFolder: {},
    events: {
        "click input[name='DefaultFolderName']": "openSelectFolder",
        "click .folder_icon": "openSelectFolder"
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('contenttypedefaultslayout'));
        this.viewData.selectedContentType = options.selected;
        this.viewData.displaySyncAction = options.displaySyncAction;
        return this;
    },
    render: function (syncActionId) {
        this.viewData = this.getRenderObject();
        this.viewData.syncActionId = syncActionId || this.viewData.syncActionId || '';
        this.$el.html(this.compiledTemplate(this.viewData));
        if (this.syncActionEdiView && this.syncActionEditView.close) {
            this.syncActionEditView.close();
        }
        if (this.viewData.displaySyncAction && Utility.hasFlag(window.gatewayPermissions, Constants.gp.ContentType_Edit_Advanced)) {
            this.syncActionEditView = new SyncActionEditView({ selectedContentType: this.viewData.selectedContentType });
            this.$el.find('.syncActionContainer').append(this.syncActionEditView.render());
        }
        var that = this;
        DialogsUtil.generalDialog('#selectFolder', {
            autoOpen: false,
            height: 300,
            width: 300,
            maxWidth: $(window).width(),
            maxHeight: $(window).height(),
            modal: true,
            buttons: [
                {
                    text: Constants.c.ok,
                    click: function () {
                        $(this).dialog("close");
                    }
                },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        var $defaultFolderName = that.$el.find('input[name="DefaultFolderName"]');
                        var $defaultFolderId = that.$el.find('input[name="DefaultFolderId"]');
                        if (that.prevFolder.Id && that.prevFolder.Title) {
                            $defaultFolderName.val(that.prevFolder.Title);
                            $defaultFolderId.val(that.prevFolder.Id);
                        } else {
                            $defaultFolderId.val('');
                            $defaultFolderId.val('');
                        }
                        $(this).dialog("close");
                    }
                },
                {
                    text: Constants.c.clear,
                    click: function () {
                        var $defaultFolderName = that.$el.find('input[name="DefaultFolderName"]');
                        $defaultFolderName.val('');
                        that.prevFolder.Id = null;
                        that.prevFolder.Title = null;
                        $(this).dialog("close");
                    }
                }
            ]
        });

        var $defaultFolderName = this.$el.find('input[name="DefaultFolderName"]');
        var defaultFolderName = $defaultFolderName.val();
        if (!defaultFolderName || defaultFolderName === 'undefined') {
            $defaultFolderName.val('');
        }
        return this.$el;
    },
    getRenderObject: function () {
        var ro = {};
        ro.listsc = window.slimSecurityClasses || window.securityClasses;
        ro.listi = window.slimInboxes || window.inboxes;
        ro.listf = window.slimFolders || window.folders;
        ro.listw = window.slimWorkflows;
        ro.listrcs = window.slimRecordCategories || window.recordcategories;
        ro.selectedContentType = this.viewData.selectedContentType;
        ro.displaySyncAction = this.viewData.displaySyncAction === false ? false : true;
        return ro;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    getSelectedData: function () {
        return DTO.getDTO(this.$el.find(".contentTypeDefaultsLayout"));
    },

    //#region Events
    openSelectFolder: function () {
        var $defaultFolderId = this.$el.find('input[name="DefaultFolderId"]');
        var defFolderId = $defaultFolderId.val();
        if (defFolderId) {
            this.prevFolder.Id = defFolderId;
        }
        var $selectedFolder = this.$el.find('input[name="DefaultFolderName"]');
        var selectedFolder = $selectedFolder.val();
        if (selectedFolder) {
            this.prevFolder.Title = selectedFolder;
        }
        var that = this;
        var callback = function (btnText, uiState, foldId, foldTitle, foldPath) {
            var $defaultFolderName = that.$el.find('input[name="DefaultFolderName"]');
            var $defaultFolderId = that.$el.find('input[name="DefaultFolderId"]');
            switch (btnText) {
                case Constants.c.ok:
                    if (foldPath) {
                        $defaultFolderName.val(foldPath);
                    }
                    else {
                        $defaultFolderName.val(foldTitle);
                    }
                    $defaultFolderId.val(foldId);
                    break;
                case Constants.c.clear:
                    $defaultFolderName.val('');
                    $defaultFolderId.val(Constants.c.emptyGuid);
                    uiState.prevFolder.Id = null;
                    uiState.prevFolder.Title = null;
                    break;
                case Constants.c.cancel:
                    if (uiState.prevFolder.Id && uiState.prevFolder.Title) {
                        $defaultFolderName.val(uiState.prevFolder.Title);
                        $defaultFolderId.val(uiState.prevFolder.Id);
                    }
                    else {
                        $defaultFolderName.val('');
                        $defaultFolderId.val('');
                    }
                    break;
                default:
                    var defaultFolderId = $defaultFolderId.val();
                    if (defaultFolderId && defaultFolderId !== Constants.c.emptyGuid) {
                        var folder = window.slimFolders.get(defaultFolderId);
                        if (!folder && window.folders) {
                            folder = window.folders.get(defaultFolderId);
                        }
                        if (folder) {
                            $defaultFolderName.val(folder.get('Name'));
                        }
                        else {
                            $defaultFolderId.val(Constants.c.emptyGuid);
                            $defaultFolderName.val('');
                        }
                    }
            }
        };
        // Dialogs util folder selection pass in this to set prevFolder.Id and prevFolder.Title
        var position = { my: 'left top', at: 'right top', of: this.$el.find('input[name="DefaultFolderName"]').parent() };
        DialogsUtil.folderSelection(false, false, '', callback, this, {
            singleSelect: true,
            position: position
        });
    }
    //#endregion Events


});