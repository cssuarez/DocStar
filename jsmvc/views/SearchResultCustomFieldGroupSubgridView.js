var SearchResultCustomFieldGroupSubgridView = Backbone.View.extend({
    model: undefined, //SearchableEntityCPX
    tagName: 'tr',
    className: 'SearchResultCustomFieldGroupSubgridView',
    events: {
        'click .refreshCFG:not(.disabled)': 'refreshCFG',
        'click .next:not(.disabled)': 'submitWorkflow'
    },
    initialize: function (options) {
        this.options = options;
        this.numColsToIndent = options.numColsToIndent;
        this.numColsToSpan = options.numColsToSpan;
        this.compiledTemplate = doT.template(Templates.get('customfieldgroupsubgridviewlayout'));
        this.subviewModel = new BulkViewerDataPackageCPX();
        this.listenTo(this.subviewModel, 'sync', this.renderSubView);
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.numColsToIndent = this.numColsToIndent;
        ro.numColsToSpan = this.numColsToSpan;
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.loadSubviewModel();
        return this;
    },
    renderSubView: function () {
        this.closeChildViews();
        this.toggleWFButtons();
        this.subview = new DocumentMetaFieldGroupsView({
            model: this.subviewModel,
            canAdd: false,
            canDelete: true,
            canDeleteGroup: false,
            canSave: true,
            displayWFButtons: true
        });
        this.$el.find('td.SubgridViewContainer').html(this.subview.render().$el);
    },
    loadSubviewModel: function () {
        this.subviewModel.set({
            Id: this.model.versionId(),
            CachedViewData: undefined
        });
        this.subviewModel.fetch();
    },
    toggleWFButtons: function () {
        var wfDocDataPkg = this.subviewModel.getDotted('DocumentPackage.WFDocumentDataPackage');
        if (wfDocDataPkg) {
            var taskUIData = wfDocDataPkg.getTaskUIData();
            var taskUIDataHasFlag = wfDocDataPkg.taskUIDataHasFlag(Constants.wftf.UserCustomFieldCompare);
            var hasTaskUIData = taskUIData && taskUIData.length > 0;
            var displayWFButtons = hasTaskUIData && taskUIDataHasFlag;
            this.$el.find('.cfvWFButtonContainer').toggle(displayWFButtons);
        }
    },
    closeChildViews: function () {
        if (this.subview) {
            this.subview.close();
        }
    },
    close: function () {
        this.closeChildViews();
        this.unbind();
        this.remove();
    },

    //#region Event Handling
    ///<summary>
    /// Refresh the custom field groups
    ///</summary>
    refreshCFG: function (ev) {
        this.render();
    },
    ///<summary>
    /// Submit the document to Process Workflow Document UI
    ///</summary>
    submitWorkflow: function (ev) {
        var wfDocDataPkg = this.subviewModel.getDotted('DocumentPackage.WFDocumentDataPackage');
        this.listenToOnce(wfDocDataPkg, 'change:executing', function (model, value, options) {
            var $customBtns = this.$el.find('.custom_button');
            if (value) {
                $customBtns.addClass('disabled');
            }
            else {
                $customBtns.removeClass('disabled');
            }
        });
        // Submit an empty object for the Inputs
        // this will move the workflow along if the verification doesn't fail, or the task doesn't have an Output, which is used to catch possible failures
        var dto = {};
        var that = this;
        wfDocDataPkg.submitUIPromptValues(dto, {
            success: function (result) {
                that.render();
            },
            failure: function (errorThrown) {
                ErrorHandler.popUpMessage(errorThrown);
            }
        });
    }
    //#endregion Event Handling
});