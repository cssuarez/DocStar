var ContentTypeBuilderFieldRegionView = Backbone.View.extend({
    viewData: {},
    dialogClosed: false,
    $dialog: undefined,
    executingRegionSelection: false,
    wfWindow: undefined,
    fieldData: {},
    $selectedRegion: undefined,
    $currentSyncAction: undefined,
    $currentTask: undefined,
    defaultRegion: {
        Width: 0.5,
        Height: 0.3,
        Top: 0.05,
        Left: 0.25
    },
    isDirty: false,
    isNew: false,
    className: 'fieldRegionSelectionContainer',
    events: {
        'change input[type="radio"][name="regionType"]': 'changeRegionType',
        'click span.executeRegionSelection': 'executeRegion',
        'change .settings input, .settings select': 'changeSettings'
    },
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('ctbfieldregionselectionlayout'));
        this.viewData.selectedContentType = this.options.selectedContentType;
        this.pzr = options.pzr;
        // Should never get here without a pzr, but just in case
        if (!this.pzr) {
            Utility.log('No PanZoomRotate instance provided');
            return;
        }
        this.drawing = new Drawing(this.pzr, this.pzr.getModel());
        this.recognition = new Recognition(this.pzr, this.drawing);
        this.recognition.init();
        this.$currentSyncAction = $(this.options.syncAction).clone();
        this.fieldData = this.options.fieldData;
        var $viewPort = this.pzr.getViewSelector();
        var that = this;
        $viewPort.off('click.ContentTypeBuilderFieldRegionView').on('click.ContentTypeBuilderFieldRegionView', '.regionContainer .region', function (ev) {
            var callback = function () {
                var $targ = $(ev.currentTarget);
                var $selectedRegion = that.$selectedRegion;
                DialogsUtil.isDialogInstanceClose(that.$dialog);
                that.drawing.screenToRegion($selectedRegion, 'fieldId');
                that.setupFieldRegionSelection({
                    fieldId: $targ.attr('fieldId'),
                    fieldName: $targ.attr('fieldName')
                });
            };
            if (that.getDirty()) {
                that.savePrompt(callback);
            }
            else {
                callback();
            }

        });
        // Reconstruct the color palette so that the colors alternate in contrast
        this.colorPalette = [];
        var idx = 0;
        var length = Constants.colorPalette.length;
        var i = parseInt(length / 2, 10);
        // Only use the first 4 colors
        for (idx = 0; idx < 4; idx++) {
            if (idx % 2 === 0) {
                this.colorPalette[idx] = Constants.colorPalette[idx / 2];
            }
            else {
                this.colorPalette[idx] = Constants.colorPalette[idx + i--];
            }
        }
        return this;
    },
    getRenderObject: function () {
        var ro = {};
        ro.selectedContentType = this.viewData.selectedContentType;
        ro.taskInfo = this.getTaskInfo(this.fieldData.fieldId);
        this.$currentTask = ro.taskInfo.$task;
        ro.lassoType = this.viewData.lassoType || (ro.taskInfo.TaskClassName === 'BarcodeTask' ? 'barcode' : 'ocr');
        var isBarcode = ro.lassoType === 'barcode';
        var isOCR = ro.lassoType === 'ocr' || !isBarcode;
        ro.barcodeChecked = isBarcode ? 'checked="checked"' : '';
        ro.ocrChecked = isOCR ? 'checked="checked"' : '';
        ro.regionResults = this.viewData.regionResults;
        return ro;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        this.renderTaskSettings();
        return this.$el;
    },
    setupWorkflowDesigner: function (callback, displayOverlay) {
        var that = this;
        Utility.setupWfDesigner(function () {
            $('#inlineWorkflowDesigner').hide();
            that.wfWindow = $('#inlineWorkflowDesigner').find('iframe').get(0).contentWindow;
            Utility.executeCallback(callback);
        }, displayOverlay);
    },
    renderTaskSettings: function () {
        var that = this;
        this.setupWorkflowDesigner(function () {
            $('#inlineWorkflowDesigner').hide();
            that.wfWindow = $('#inlineWorkflowDesigner').find('iframe').get(0).contentWindow;
            that.$el.find('.settings').empty();
            var taskInfo = that.viewData.taskInfo;
            var taskClassName = that.viewData.lassoType === 'barcode' ? 'BarcodeTask' : (that.viewData.lassoType === 'ocr' ? 'OCRTask' : taskInfo.TaskClassName || 'OCRTask');
            var taskData = Utility.tryParseJSON(that.wfWindow.TaskEditor.getTaskData(taskClassName), true) || {};
            var uiKeys = taskData.SettingsUIKey ? taskData.SettingsUIKey.split(',') : [];
            var idx = 0;
            var length = uiKeys.length;
            for (idx; idx < length; idx++) {
                var key = uiKeys[idx];
                var args = key.split(":");
                var uiKey = args[0];
                if (uiKey === 'ImageRegionSelection') { // Don't want to render ImageRegionSelection
                    uiKeys.splice(idx, 1);
                    idx--;
                    length--;
                }
                else if (uiKey === 'ImageCleanup') {

                    key = uiKey + ':' + (taskInfo.Settings ? taskInfo.Settings.CleanupOptions : 0);
                }
            }
            that.wfWindow.TaskEditor.renderTaskSettings(uiKeys, that.$el.find('.settings'));
            if (that.$currentTask) {
                var taskSettings = Utility.tryParseJSON(that.$currentTask.find('Settings').text(), true) || {};
                var $template = that.$el;
                $template.find('input[name="CleanupOptions"]').val(taskSettings.CleanupOptions);
                that.wfWindow.TaskEditor.fillEnumCheckboxes('CleanupOptions', null, $template);
                if (taskSettings.BarcodeType) {
                    $template.find('select[name="BarcodeType"]').val(taskSettings.BarcodeType);
                }
                if (taskSettings.EnhancementOption) {
                    $template.find('select[name="EnhancementOption"]').val(taskSettings.EnhancementOption);
                }
            }
        });
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    changeSettings: function (ev) {
        this.setDirty(true);
        var $currentTask = this.$currentTask;
        var regionSelection = this.getRegionSelection(this.$selectedRegion);
        var newSettings = DTO.getDTO(this.$el.find('.settings'));   // Contains task specific options, such as CleanupOptions or BarcodeType
        newSettings.Region = this.pzr.getRegion(regionSelection);    // Transform region (% based) into screen coords - px
        newSettings.Region.Page = this.pzr.getModel().getCurrentPage();   // Obtain currently viewed page from viewer
        var taskData = {
            Settings: JSON.stringify(newSettings)
        };
        this.setTaskData($currentTask, { Settings: '' });   // Clear settings, to be reset to new settings
        this.setTaskData($currentTask, taskData);
    },
    changeRegionType: function (ev) {
        this.setDirty(true);
        var $targ = $(ev.currentTarget);
        var lassoType = $targ.val();
        this.viewData.lassoType = lassoType;
        this.recognition.setLassoType(lassoType);
        if (this.$currentTask) {
            var isBarcode = lassoType === 'barcode';
            var taskClassName = isBarcode ? 'BarcodeTask' : 'OCRTask';
            this.setTaskData(this.$currentTask, { TaskClassName: taskClassName });
        }
        this.executeRegion();
    },
    cleanupRegionSelection: function (cleanup) {
        var that = this;
        var callback = function () {
            var $viewport = that.pzr.getViewPort();
            var $img = $viewport.find('img[name="image_full"]');
            // remove the region
            that.recognition.hideAreaSelect();
            // Recreate the context menu for regions/zooming
            //TODO: scain shouldn't have to recreate context menu, the viewer itself should take care of this
            //that.imgViewer.setupContextMenu('#' + that.imgViewer.$el.attr('id'), $img.width(), $img.height());
            // clean up the region selection dialog
            DialogsUtil.isDialogInstanceClose(that.$dialog);
            Utility.executeCallback(cleanup);
            // re-expand the content type builder
            Utility.executeCallback(that.options.endSelectionCallback);
            //PZR.enablePan();
            that.viewData.lassoType = undefined; // reset lasso type for next 'new' task
            that.drawing.setCurrentlyDrawing(false);
            that.isNew = false;
        };
        if (this.getDirty()) {
            this.savePrompt();
        }
        else {
            callback();
        }
    },
    setupFieldRegionDialog: function () {
        var that = this;
        var okFunc = function (cleanup) {
            var successCallback = function () {
                that.cleanupRegionSelection(cleanup);
            };
            that.saveChanges(successCallback);
        };
        var closeFunc = function (cleanup) {
            that.cleanupRegionSelection(cleanup);
        };
        var diagOpts = {
            title: this.fieldData.fieldName || '',
            html: this.render(),
            dialogClass: 'limitTitleWidth',
            modal: false,
            resizable: false,
            autoOpen: false,
            minWidth: 400,
            height: 300,
            minHeight: 250,
            width: 400,
            position: {
                my: 'left top',
                at: 'left bottom',
                of: this.$selectedRegion
            },
            beforeClose: function (event, ui) {
                var $targ = $(event.currentTarget);
                if ($targ.hasClass('ui-dialog-titlebar-close')) {
                    that.cleanupRegionSelection();
                }
            },
            open: function (event, ui) {
                // Events are lost on close of dialog, rebind them on open of the dialog
                that.delegateEvents();
                that.checkDialogPosition();
            },
            close: function (event, ui) {
            },
            buttons: [{
                text: Constants.t('delete'),
                click: function (cleanup) {
                    that.deleteTask();
                }
            }]
        };
        if (!DialogsUtil.isDialogInstance(that.$dialog)) {
            that.$dialog = DialogsUtil.generalPromptDialog('', okFunc, closeFunc, diagOpts);
        }
        else {
            that.$dialog.dialog('open');
        }
    },
    checkDialogPosition: function () {
        var $selectArea = this.$selectedRegion;
        var selectAreaPos = $selectArea.offset();
        var dialogPos = this.$dialog.offset();
        var position = {
            my: 'left top',
            at: 'left bottom',
            of: $selectArea
        };
        if (dialogPos.top < selectAreaPos.top + $selectArea.height()) {
            position.my = 'left bottom';
            position.at = 'left top';
        }
        this.$dialog.dialog('option', 'position', position);
    },
    setupFieldRegionSelection: function (fieldData) {
        var model = this.pzr.getModel();
        var pageInfo = model.getCurrentPageInfo();
        if (!pageInfo) {
            //TODO: display an error if the image isn't rendered yet, stating the user can't draw a region on a non-imaged document : NOTE: ViewerUtil.onlyNative no longer exists, test the content item you are viewing (or something).
            ErrorHandler.addErrors(String.format(Constants.t('pageNotRendered'), model.getCurrentPage()));
            this.cleanupRegionSelection();
            return;
        }
        var that = this;
        var taskInfo = this.viewData.taskInfo = this.getTaskInfo(fieldData.fieldId);
        var page = taskInfo && taskInfo.Settings && taskInfo.Settings.Region ? taskInfo.Settings.Region.Page : this.pzr.getModel().getCurrentPage();
        var $viewport = that.pzr.getViewPort();
        var imageRenderedCallback = function () {
            that.fieldData = fieldData;
            //Find region, if it doesn't exist allow the user to draw one                    
            var $region = $viewport.find('.regionContainer').find('[fieldId="' + fieldData.fieldId + '"]');
            that.pzr.fitImage();
            that.dialogClosed = false;   // Used to prevent opening the region dialog and displaying the region
            if ($region.length <= 0) {
                that.drawing.setCurrentlyDrawing(false);
                that.drawing.startDrawingRegion({
                    onSelectStart: function (img, selection) {
                        DialogsUtil.isDialogInstanceClose(that.$dialog);
                    },
                    onSelectEnd: function (img, selection) {
                        that.drawing.stopDrawing();
                        var regionData = {
                            Id: fieldData.fieldId,
                            Name: fieldData.fieldName,
                            Rectangle: that.pzr.getRegion(selection),
                            Page: that.pzr.getModel().getCurrentPage()
                        };
                        that.renderNewRegion(regionData);
                        // Create a new task to append to the sync action
                        that.setupWorkflowDesigner(function () {
                            var getTaskCallback = function (newTask) {
                                that.$currentTask = $(newTask).find('WFTaskDTO');
                                // Append task to sync action
                                that.appendNewTask(that.$currentSyncAction, that.$currentTask);
                                that.setTaskData(that.$currentTask, {
                                    Sequence: that.$currentSyncAction.find('WFTaskDTO').length,
                                    OutArgNames: JSON.stringify(['$doc.$fields.' + that.fieldData.fieldName])
                                });
                                that.isNew = true;
                                $region = $viewport.find('.regionContainer').find('[fieldid="' + that.fieldData.fieldId + '"]');
                                that.regionCreated($region);
                                that.changeSettings();
                                that.executeRegion();
                            };
                            var wfTaskGetArgs = {
                                ActionId: that.$currentSyncAction.find('> Id').text(),
                                TaskClassName: 'OCRTask',
                                Sequence: 0
                            };
                            WorkflowUtil.getNewTaskXml(wfTaskGetArgs, getTaskCallback);
                        });

                    }
                });
            }
            else {
                that.drawing.setCurrentlyDrawing(true);
                that.regionCreated($region);
                that.executeRegion();
            }
        };

        var imgLoadedCallback = function () {
            // automatically switch to viewing the document non-natively, if it can be
            if ($.cookie('useNative')) {
                $('body').one('imageLoadedRegionSelection.ContentTypeBuilderFieldRegionView', function () {
                    imageRenderedCallback();
                });
                $.cookie('useNative', null);
                $('body').trigger('desiredViewerChanged');
            }
            else {
                imageRenderedCallback();
            }
        };
        // Navigate to regions page, or maintain current page, if no page specified
        var currPage = this.pzr.getModel().getCurrentPage();
        var totalPages = this.pzr.getModel().get('DocumentPackage').getNumPages().pages;
        if (parseInt(page, 10) !== currPage && parseInt(page, 10) !== 0) {
            if (page > totalPages) {
                var cleanup = function () {
                    that.cleanupRegionSelection();
                };
                var message = String.format(Constants.t('regionsPageOutOfRange'), page) + '\r\n\n' + Constants.c.deleteRegions;
                $('#invalidRegion-message pre').html(message);
                var $diag = $("#invalidRegionPage");
                var length;
                $diag.dialog({
                    resizable: false,
                    width: 'auto',
                    height: 140,
                    modal: true,
                    close: function () {
                        if (cleanup) {
                            cleanup();
                        }
                    },
                    buttons: [{
                        text: Constants.c.yes,
                        click: function () {
                            //remove task and region
                            that.$currentSyncAction.find('WFTasks').find(taskInfo.$task).remove();
                            $viewport.find('.regionContainer').find('[fieldId="' + fieldData.fieldId + '"]').remove();
                            //make image drawable
                            imgLoadedCallback();
                            cleanup = undefined;
                            $diag.dialog("close");
                        }
                    },
                    {
                        text: Constants.c.no,
                        click: function () {
                            $diag.dialog("close");
                        }
                    }]
                });
            }
            else {
                $('body').one('imageLoadedRegionSelection.ContentTypeBuilderFieldRegionView', function () {
                    imgLoadedCallback(true);
                });
                this.pzr.getModel().setCurrentPage(page);
            }
        }
        else {
            imgLoadedCallback();
        }
    },
    regionCreated: function ($region) {
        var that = this;
        if (!this.drawing) {
            return;
        }

        this.$selectedRegion = this.drawing.regionToScreen($region, {
            editRegionContainer: that.getEditMarkContainer(),
            classList: 'region',
            idKV: { fieldId: this.fieldData.fieldId }
        });
        // Select the region, allowing the user to resize/drag
        var resizeOptions = {
            start: function (event, ui) {
                DialogsUtil.isDialogInstanceClose(that.$dialog);
            },
            stop: function (event, ui) {
                that.setDirty(true);
                that.changeSettings(null);
                that.executeRegion();
            }
        };
        var dragOptions = {
            stack: '.region',
            start: function (event, ui) {
                DialogsUtil.isDialogInstanceClose(that.$dialog);
            },
            stop: function (event, ui) {
                that.setDirty(true);
                that.changeSettings(null);
                that.executeRegion();
            }
        };
        this.drawing.setupReposition(this.$selectedRegion, resizeOptions, dragOptions);
    },
    getEditMarkContainer: function () {
        var $viewPort = this.pzr.getViewPort();
        return $viewPort.find('.editMarkContainer');
    },
    executeRegion: function () {
        if (this.executingRegionSelection) {
            return;
        }
        this.viewData = this.getRenderObject();
        var $viewport = this.pzr.getViewPort();
        var $img = $viewport.find('img[name="image_full"]');
        var imgSelector = $img.selector;
        var that = this;
        this.$selectedRegion.find('.region').append($('<img />').attr('id', 'lasso_load').attr('src', Constants.Url_Base + 'Content/themes/default/throbber.gif'));
        $viewport.imgAreaSelect({ disable: true, movable: false, resizable: false });
        that.executingRegionSelection = true;
        var rect = this.getRegionRect(this.$selectedRegion);
        var recogOpts = DTO.getDTO(this.$el.find('.settings'));
        var recognitionOptions = {
            selection: {
                width: rect.Width,
                height: rect.Height,
                x1: rect.Left,
                y1: rect.Top
            },
            barcodeType: JSON.stringify(recogOpts.BarcodeType),
            enhancementOption: JSON.stringify(recogOpts.EnhancementOption),
            cleanupOptions: recogOpts.CleanupOptions    //TODO: Currently not a part of recogniseText
        };
        this.recognition.setLassoType(this.viewData.lassoType || 'ocr');
        var callbacks = {
            success: function (result) {
                that.viewData.regionResults = result ? result.result || '' : '';
                that.setupFieldRegionDialog();
                if (!that.dialogClosed) {
                    that.$dialog.dialog('open');
                    var $dialogContainer = $('.ui-dialog').has(that.$dialog);
                    that.$selectedRegion.css('z-index', $dialogContainer.css('z-index') - 1);
                }
            },
            error: function (message) {
                ErrorHandler.addErrors(message);
            },
            complete: function () {
                that.executingRegionSelection = false;
                that.$selectedRegion.find('#lasso_load').remove();
            }
        };
        this.recognition.recognise(callbacks, recognitionOptions);
    },
    getTaskInfo: function (fieldId) {
        var info = WorkflowUtil.getFieldTaskInfoFromActionXml(this.$currentSyncAction, fieldId, {
            OCRTask: true,
            BarcodeTask: true
        });
        if (!info.Settings || !info.Settings.Region) {
            return {};
        }
        return info;
    },
    setTaskData: function ($task, taskData) {
        if (taskData.TaskClassName) {
            $task.find('TaskClassName').text(taskData.TaskClassName);
        }
        if (taskData.OutArgKeys) {
            $task.find('OutArgKeys').text(taskData.OutArgKeys);
        }
        if (taskData.OutArgNames) {
            $task.find('OutArgNames').text(taskData.OutArgNames);
        }
        if (taskData.Settings) {
            $task.find('Settings').text(taskData.Settings);
        }
        if (taskData.Sequence) {
            $task.find('Sequence').text(taskData.Sequence);
        }
    },
    updateOutArgNames: function ($task, oldFieldName, newFieldName) {
        if ($task && $task.length > 0) {
            var key = '$doc.$fields.' + oldFieldName;
            var newKey = '$doc.$fields.' + newFieldName;
            var outArgNames = Utility.tryParseJSON($task.find('OutArgNames').text(), true);
            if (!outArgNames) {
                outArgNames = [key];
            }
            else {
                var idx;
                var length = outArgNames.length;
                for (idx = 0; idx < length; idx++) {
                    if (outArgNames[idx] === key) {
                        outArgNames[idx] = newKey;
                        break;
                    }
                }
            }
            this.setTaskData($task, {
                OutArgNames: JSON.stringify(outArgNames)
            });
        }
    },
    appendNewTask: function ($action, $task) {
        $action.find('WFTasks').append($task);
    },
    saveChanges: function (successCallback) {
        var that = this;
        var actionName = this.$currentSyncAction.find('Name').text();
        if (actionName === '{0}') {
            var ctName = this.viewData.selectedContentType.get('Name');
            if (ctName === Constants.c.newTitle) {
                ctName = Constants.c['new'];
            }
            var newActionName = ctName + ' ' + WorkflowUtil.getNewActionName();
            this.$currentSyncAction.find('Name').text(String.format(actionName, newActionName));
        }
        var actionXML = this.$currentSyncAction.get(0);
        this.setupWorkflowDesigner(function () {
            that.wfWindow.Workflow.removeNil(actionXML, true);
            var overrideErrors = false;//{ "ds-options": Constants.sro.OverrideErrors };
            var sf = function (workflowPackage) {
                that.clearDirty();
                var saId = that.$currentSyncAction.find('> Id').text();
                var sa = window.syncActions.get(saId);
                if (!sa) {
                    var syncAction = {
                        EffectivePermissions: 0,
                        Id: saId,
                        Name: that.$currentSyncAction.find('> Name').text(),
                        Type: Constants.wfat.SyncAutoRunAction,  // New sync action from content type builder is a SyncAutoRunAction
                        Permissions: 0
                    };
                    window.syncActions.add(new SyncAction(syncAction));
                }
                // Set the sync action preference to be Auto Sync when using the content type builder to create regions for fields
                that.viewData.selectedContentType.set('SyncActionPreference', Constants.sap.AutoSync);
                that.viewData.selectedContentType.set('SyncActionId', saId);
                Utility.executeCallback(successCallback);
            };
            var ff = function (jqXHR, textStatus, errorThrown) {
                if (errorThrown) {
                    ErrorHandler.popUpMessage(errorThrown);
                }
            };
            actionXML = that.wfWindow.Workflow.x2s(actionXML);
            actionXML = encodeURIComponent(actionXML);
            that.wfWindow.Workflow.proxy.saveActionLibraryItem(actionXML, sf, ff, null, null, overrideErrors);
        }, false);
    },
    // deleteTask - delete the corresponding task from the sync action
    deleteTask: function () {
        // Remove the task from the sync action, then save the sync action
        var that = this;
        var okFunc = function (cleanup) {
            that.$currentTask.remove();
            var $transCon = that.pzr.getTransformCont();
            var $regionCon = $transCon.find('.regionContainer');
            var fieldSelector = '[fieldId="' + that.fieldData.fieldId + '"]';
            $regionCon.find(fieldSelector).remove();
            var $editCon = that.getEditMarkContainer();
            $editCon.find(fieldSelector).remove();
            that.saveChanges(function () {
                WorkflowUtil.getSyncActionXml(that.$currentSyncAction.find('> Id').text(), function (result) {
                    that.$currentSyncAction = result;
                    that.clearDirty();
                    that.cleanupRegionSelection(cleanup);
                });
            });
        };
        var closeFunc = function (cleanup) {
            Utility.executeCallback(cleanup);
            that.cleanupRegionSelection(cleanup);
        };
        var diagOpts = {
            closeText: Constants.c.no,
            okText: Constants.c.yes
        };
        DialogsUtil.generalPromptDialog(Constants.c.deleteTaskConfirm, okFunc, closeFunc, diagOpts);
    },

    //#region Dirty Bit Handling
    savePrompt: function (cleanupAfterPromptCallback) {
        var that = this;
        var okFunc = function (cleanup) {
            var successCallback = function () {
                if (Utility.executeCallback(cleanupAfterPromptCallback)) {
                    Utility.executeCallback(cleanup);
                }
                else {
                    that.cleanupRegionSelection(cleanup);
                }
            };
            that.saveChanges(successCallback);
        };
        var cancelFunc = function (cleanup) {
            that.clearDirty();
            if (that.isNew) {
                that.$currentTask.remove();
            }
            if (Utility.executeCallback(cleanupAfterPromptCallback)) {
                Utility.executeCallback(cleanup);
            }
            else {
                that.cleanupRegionSelection(cleanup);
            }
        };
        var opts = {};
        DialogsUtil.generalSaveDirtyPromptDialog(String.format(Constants.c.unsavedChanges, this.fieldData.fieldName), okFunc, cancelFunc, opts);
    },
    getDirty: function () {
        return this.isDirty;
    },
    setDirty: function (isDirty) {
        this.isDirty = isDirty;
    },
    clearDirty: function () {
        this.isDirty = false;
    },
    //#region Dirty Bit Handling

    //#region Region Rendering
    // getRegionRect: Obtain rectangle for passed in region, in image coords
    getRegionRect: function ($region) {
        var pos = $region.position();
        var rect = {
            Width: $region.width(),
            Height: $region.height(),
            Top: pos.top,
            Left: pos.left
        };
        return rect;
    },
    // getRegionRect: Obtain selection for passed in region, in image coords
    getRegionSelection: function ($region) {
        var pos = $region.position();
        var selection = {
            width: $region.width(),
            height: $region.height(),
            y1: pos.top,
            x1: pos.left
        };
        return selection;
    },
    getExistingRegions: function () {
        var cfs = window.customFieldMetas;
        var idx = 0;
        var length = cfs.length;
        var regions = [];
        var colors = this.colorPalette;
        // Find regions to be rendered
        for (idx = 0; idx < length; idx++) {
            var cf = cfs.at(idx);
            var cfId = cf.get('Id');
            var taskInfo = this.getTaskInfo(cfId);
            if (!$.isEmptyObject(taskInfo) && taskInfo.Settings && taskInfo.Settings.Region) {
                var colorIdx = $('#ctb_' + cfId).index() + 1;
                var color = '#' + colors[colorIdx % colors.length];
                var page = parseInt(taskInfo.Settings.Region.Page, 10);
                regions.push({
                    Id: cfId,
                    Name: cf.get('Name'),
                    Rectangle: {
                        Width: taskInfo.Settings.Region.Width,
                        Height: taskInfo.Settings.Region.Height,
                        Top: taskInfo.Settings.Region.Top,
                        Left: taskInfo.Settings.Region.Left
                    },
                    Page: page,
                    Opacity: 0.7,
                    Color: color,
                    Display: page === this.pzr.getModel().getCurrentPage() || page === 0
                });
            }
        }
        return regions;
    },
    setRegionsData: function ($region, regionData) {
        $region.attr('fieldId', regionData.Id);
        $region.attr('fieldName', regionData.Name);
        $region.attr('page', regionData.Page);
        $region.data('color', regionData.Color.split('#')[1]);
        $region.addClass('region');
    },
    transformRegionDataCoords: function (regionData) {
        // Transform region (% based) into screen coords - px
        var selectionArea = this.pzr.getSelectionArea(regionData.Rectangle);
        regionData.Rectangle = {
            Width: selectionArea.width,
            Height: selectionArea.height,
            Left: selectionArea.x1,
            Top: selectionArea.y1
        };
        // Transform region into image coords- px
        regionData.Rectangle = this.pzr.screenToImageRect(regionData.Rectangle);
    },
    renderNewRegion: function (regionData) {
        var $transCon = this.pzr.getTransformCont();
        var $regionCon = $transCon.find('.regionContainer');
        regionData.Opacity = 0.7;
        regionData.Display = true;
        var idx = $('#ctb_' + this.fieldData.fieldId).index() + 1;
        var colorIdx = idx % this.colorPalette.length;
        regionData.Color = '#' + this.colorPalette[colorIdx];
        this.transformRegionDataCoords(regionData);
        var $region = this.drawing.createRegion(regionData);
        this.setRegionsData($region, regionData);
        $regionCon.append($region);
        this.setDirty(true);
    },
    renderRegions: function () {
        if (!this.pzr) {
            return;
        }
        this.pzr.fitImage();
        var regions = this.getExistingRegions();
        var $transCon = this.pzr.getTransformCont();
        var $regionCon = $transCon.find('.regionContainer');
        $regionCon.empty();
        var idx = 0;
        var length = regions.length;
        var tmpCont = document.createElement('div');
        for (idx; idx < length; idx++) {
            var regionData = regions[idx];
            this.transformRegionDataCoords(regionData);
            var $region = this.drawing.createRegion(regionData);
            this.setRegionsData($region, regionData);
            if (!regionData.Display) {
                $region.hide();
            }
            $(tmpCont).append($region);
        }
        $regionCon.append($(tmpCont).children());
    }
    //#endregion Region Rendering
});