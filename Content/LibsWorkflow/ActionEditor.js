/// <reference path="StepEditor.js" />
/// <reference path="../Content/LibsInternal/ErrorHandler.js" />
/// <reference path="../Content/LibsExternal/a_jquery.js" />
var ActionEditor = {
    isActionLibraryItem: false, // If the current Action being edited is an Action Library Item or not
    hideSAPOpts: [],    // If there are any Sync Action Preference radio buttons that need be hidden
    currentActionListIndex: 0,
    currentActionId: '',
    currentActionXML: {},
    currentActionXMLClone: {},
    newActionXML: '',
    actionLibItems: [],
    errors: [],
    init: function () {
        $('#action_editor').on('change', 'input[name="SyncActionPreference"]', function (event) {
            var targ = $(event.currentTarget);
            ActionEditor.filterByActionType(targ);
        });
        $('#action_editor input[name="Name"]').bind('keyup', function () {
            var errors = ActionEditor.validateForm();
            ActionEditor.applyValidation(errors);
        });
        ActionEditor.createActionEditorDialog();
    },
    createActionEditorDialog: function (successFunc) {
        var cancelLibraryItemAction = function () {
            delete ActionEditor.currentActionXMLClone;
            delete ActionEditor.currentActionXML;
            delete ActionEditor.newActionXML;
            $('#action_editor').dialog('close');
        };
        var saveAction = function () {

            var errors = ActionEditor.validateForm();
            ActionEditor.applyValidation(errors);
            if ($.isEmptyObject(errors)) {
                this.flagSave = true;
                //Library item saves are async, so don't close until we have a successful save.
                if (ActionEditor.isActionLibraryItem) {
                    return ActionEditor.saveActionDialog(function (id, oldId) {
                        if (successFunc) {
                            successFunc(id, oldId);
                        }
                        $('#action_editor').dialog('close');
                    });
                }
                if (ActionEditor.okApply()) { // If the actioneditor saves without errors close it
                    $('#action_editor').dialog('close');
                }
            }
        };
        var cancelAction = function () {
            // Clear xml that was set
            this.flagSave = false;
            $('#action_editor').dialog('close');
        };
        //var applyAction = function () {
        //    var errors = ActionEditor.validateForm();
        //    ActionEditor.applyValidation(errors);
        //    if (!$.isEmptyObject(errors)) {
        //        return;
        //    }
        //    ActionEditor.okApply();
        //};
        var options = {
            width: 800,
            minWidth: 800,
            height: 400,
            minHeight: 400,
            maxHeight: $(window).height(),
            maxWidth: $(window).width(),
            modal: true,
            autoOpen: false,
            title: Constants.c.actionEditor,
            buttons: [{
                // Save changes, close dialog
                text: Constants.c.ok,
                click: saveAction
            },
            {
                // Clear changes, close dialog
                text: Constants.c.cancel,
                click: cancelAction
            }],
            open: function () {
                this.flagSave = false;
            },
            close: function () {
                if (!this.flagSave) {
                    ActionEditor.clearActionLibItem();
                    delete ActionEditor.currentActionXMLClone;
                    delete ActionEditor.currentActionXML;
                    delete ActionEditor.newActionXML;
                }

            }
        };
        $('#addTo_action_lib').show();
        $('#action_editor .sap').hide();
        if (ActionEditor.isActionLibraryItem) {
            options.title = Constants.c.actionLibraryItemEditor;
            options.close = function () {
                ActionEditor.isActionLibraryItem = false;
                ActionEditor.hideSAPOpts = [];
            };
            options.buttons = [{
                // Save changes, close dialog
                text: Constants.c.save,
                click: saveAction
            },
            {
                // Do Nothing, just close dialog
                text: Constants.c.cancel,
                click: cancelLibraryItemAction
            }];
            $('#addTo_action_lib').hide();
            ActionEditor.displaySyncActionPreference();
        }
        $('#action_editor').dialog(options);
    },
    okApply: function () {
        // Check for errors, save changes to step when Ok or Apply is clicked                
        // Save Action
        return ActionEditor.saveActionDialog();
    },
    validateForm: function () {
        // Check to see if Action name is blank
        var input = $('#action_editor input[name="Name"]');
        var val = input.val();
        var trimmedVal = $.trim(val);
        var errors = {};
        if (!trimmedVal) {
            errors.nameError = Constants.c.nameEmptyWarning;
        }
        else if (trimmedVal === Constants.c.newTitle) {
            errors.nameError = String.format(Constants.c.newNameWarning, Constants.t('newTitle'));
        }
        else if (trimmedVal.length >= 256) {
            errors.nameError = Constants.c.nameTooLong;
        }
        return errors;
    },
    // Apply the validation check (prevent user from progressing further if there are errors to be fixed, such as no action name, or -- New -- Action Name)
    applyValidation: function (errors) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        if (!$.isEmptyObject(errors)) {
            Utility.changeButtonState([Constants.c.ok, Constants.c.apply], 'disable', $('#action_editor').parent());
            if (errors.nameError) {
                ErrorHandler.addErrors({ 'Name': errors.nameError }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '#action_editor input[name="Name"]');
            }
        }
        else {
            Utility.changeButtonState([Constants.c.ok, Constants.c.apply], 'enable');
        }
    },
    // Get action changes   
    getXMLActionsIds: function () {
        // Get action ids that are in the xml file
        var actionIds = [];
        var actions = $(Workflow.currentStepXMLClone).find('Action');
        $.map(actions, function (action) {
            actionIds.push($(action).find('> ActionId').text());
        });
        return actionIds;
    },
    getCurrActionsIds: function () {
        // Get action ids that are in the action list
        var currActionIds = [];
        $.map($('#step_actions li'), function (item) {
            currActionIds.push($(item).find('input').val());
        });
        return currActionIds;
    },
    /*
        Calculate a name for a new Action
    */
    getNewActionName: function () {
        var actions = $('#step_actions li');
        var count = actions.length + 1;
        var name = Constants.t('action') + ' ' + count;
        var filterNames = function () {
            return $(this).text() === name;
        };
        while ($('#step_actions li span').filter(filterNames).length === 1) {
            name = Constants.t('action') + ' ' + (++count);
        }
        return name;
    },
    // Create Actions    
    addAction: function (name) {
        // Fetch new action
        ActionEditor.newActionXML = Workflow.fetchNewAction();
        var actionXML = ActionEditor.newActionXML;
        if (name) {
            $(actionXML).find('Name').text(name);
        }
        ActionEditor.currentActionId = $(actionXML).find('> ActionId').text();
        ActionEditor.fillActionEditor(actionXML);
        // Map tasks
        TaskEditor.setupTasks(actionXML, '#action_tasks');
        // Show Action Editor
        ActionEditor.currentActionListIndex = $('#step_actions li').length;
        ActionEditor.showActionEditor();
    },
    createAction: function () {
        if (ActionEditor.newActionXML) {

            // Find the WFStepActionDTO in the XML
            var actionXML = $(ActionEditor.currentActionXMLClone);
            // Get Name and Id of current action to update action ui in step editor
            var actionName = $('#action_editor').find('input[name="Name"]').val();
            var actionId = $(actionXML).find('> ActionId').text();
            $(actionXML).find('Name').text(actionName);
            $(actionXML).find('> Type').text(0);

            // Map sequence of tasks, to make sure the sequences are set properly
            TaskEditor.mapTasks(actionXML, '#action_tasks');
            // Map action to xml

            var action = $(actionXML).clone();
            var actions = $(Workflow.currentStepXMLClone).find('Actions');

            if (ActionEditor.currentActionListIndex === 0) {
                actions.prepend(action);
            }
            else {
                $($(Workflow.currentStepXMLClone).find('Action')[ActionEditor.currentActionListIndex - 1]).after(action);
            }
            ActionEditor.currentActionXMLClone = action;

            // Update UI
            $('.selected_action').removeClass('selected_action');

            var inner = $('<li></li')
                                .addClass('selected_action')
                                .append($('<span></span>')
                                    .attr('name', 'Name')
                                    .text(actionName)
                                )
                                .append($('<input type="hidden" />')
                                    .attr('class', 'ignore')
                                    .attr('name', 'ActionId')
                                    .val(actionId)
                                );
            if (ActionEditor.currentActionListIndex === 0) {
                $('#step_actions').prepend(inner);
            }
            else {
                $('#step_actions li:nth-child(' + ActionEditor.currentActionListIndex + ")").after(inner);
            }
        }
    },
    // Delete Actions
    getRemoveActionIds: function () {
        var xmlActionIds = this.getXMLActionsIds();
        var currActionIds = this.getCurrActionsIds();
        var delActionIds = [];
        var del = false;
        // If there were no actions in the step to begin with there are none to delete
        if (xmlActionIds.length <= 0) {
            return [];
        }
        // If there are no actions in the step being edited, delete every action from the xml
        if (currActionIds.length <= 0) {
            return xmlActionIds;
        }
        var id;
        var currId;
        for (id in xmlActionIds) {
            if (xmlActionIds.hasOwnProperty(id)) {
                for (currId in currActionIds) {
                    if (currActionIds.hasOwnProperty(currId)) {
                        if (currActionIds[currId] === xmlActionIds[id]) {
                            del = false;
                            break;
                        }
                        else {
                            del = true;
                        }
                    }
                }
                if (del === true) {
                    delActionIds.push(xmlActionIds[id]);
                }
                if (currActionIds.length <= 0) {
                    break;
                }
            }
        }
        return delActionIds;
    },
    removeAction: function (action) {
        // Remove Action from ui
        var confirmResult = confirm(Constants.c.deleteActionConfirm);
        if (!confirmResult) {
            return;
        }
        $(action).remove();
    },
    deleteAction: function (actionIds) {
        // Nothing to do if there are no actions to delete
        if (actionIds.length <= 0) {
            return;
        }
        // Remove action(s) from xml    
        $.map(actionIds, function (actionId) {
            var actionXML = $(Workflow.currentStepXMLClone).find('Action').filter(function () {
                var test_value = $(this).find('> ActionId').text();
                return actionId === test_value;
            });
            $(actionXML).remove();
        });
    },
    // Update Actions
    updateAction: function () {
        // Update action in xml finished being modified
        var actionId = ActionEditor.getCurrentActionId();
        var action = $(ActionEditor.currentActionXMLClone);
        var collection = $('#action_editor input');
        // Map action inputs back to xml
        $.map(collection, function (item) {
            if (!$(item).hasClass('ignore')) {
                action.find('> ' + $(item).attr('name')).text($(item).val());
            }
        });
        // Update tasks
        TaskEditor.mapTasks(action, '#action_tasks');
        // Update UI
        $.map($('#step_actions li'), function (item) {
            if ($(item).find('input').val() === actionId) {
                var actionName = action.find('> Name').text();
                $(item).find('span').text(actionName);
            }
        });
    },
    mapActions: function () {
        // Map Actions in ui to xml
        var keys = [];
        $.map($('#step_actions li'), function (item) {
            var actionId = $(item).find('input').val();
            var actionXML = $(Workflow.currentStepXMLClone).find('Action').filter(function () {
                var test_value = $(this).find('> ActionId').text();
                return actionId === test_value;
            });
            $(actionXML).find($(item).find('span').attr('name')).text($(item).find('span').text());
            // index is 0 based, sequence is 1 base
            var sequence = $(item).index() + 1;
            // Set Sequence based on list order
            $(actionXML).find('> Sequence').text(sequence);
            keys.push(actionXML);
        });
        // Sort xml by sequence
        var sortSequence = function (a, b) {
            return parseInt($(a).find('> Sequence').text(), 10) - parseInt($(b).find('> Sequence').text(), 10);
        };
        var sortedActions = keys.sort(sortSequence);
        if (sortedActions && sortedActions.length > 0) {
            var actionContXML = $(Workflow.currentStepXMLClone).find('Actions');
            $(actionContXML).empty();
            _.each(sortedActions, function (action) {
                $(actionContXML).append(action[0]);
            });
        }
    },
    setupActions: function (xml) {
        // Map Actions in xml to ui
        var actions = $(xml).find('Action');
        $('#step_actions').empty();
        if (actions.length > 0) {
            var sortedActions = Workflow.sortBySequence(actions);
            $(sortedActions).map(function (key, item) {
                var actionName = $(item).find('> Name').text();
                var actionId = $(item).find('> ActionId').text();
                $('#step_actions').append($('<li></li').append($('<span></span>').attr('name', 'Name').text(actionName)).append($('<input type="hidden" />').attr('class', 'ignore').attr('name', 'ActionId').val(actionId)));
            });
        }
    },
    /*
       Determine sticky fields from tasks
       If a task in the action has a setting of StickyField, set to true
    */
    getStickyFieldsValue: function (xml) {
        var tasks = $(xml).find('WFTasks > WFTaskDTO');
        var i;
        var length = tasks.length;
        var isStickyField = false;
        for (i = 0; i < length; i++) {
            var task = $(tasks[i]);
            var settings = task.find('> Settings').text();
            if (settings) {
                settings = JSON.parse(settings);
            }
            else {
                settings = {};
            }
            isStickyField = settings.StickyField || false;
            if (isStickyField) {
                break;
            }
        }
        return isStickyField;
    },
    fillActionEditor: function (xml) {
        // Fill out action editor with new action data
        var collection = $('#action_editor input');
        var stickyFields = ActionEditor.getStickyFieldsValue(xml);
        // Map inputs
        $.map(collection, function (item) {
            if (!$(item).hasClass('ignore')) {
                var input_value = $(xml).find('>' + $(item).attr('name')).text();
                $(item).val(input_value);
            }
            else if ($(item).attr('name') === 'StickyFields') {
                $(item).prop('checked', stickyFields);
            }
            else if ($(item).attr('name') === 'ActionId') {
                $(item).val($(xml).find('> ActionId').text());
            }
        });
        // Map tasks
        TaskEditor.setupTasks(xml, '#action_tasks');
    },
    fillExistingActionEditor: function (action) {
        // Find action in xml
        var actionId = $(action).find('input').val();
        var actionXML = $(Workflow.currentStepXMLClone).find('Action').filter(function () {
            var test_value = $(this).find('> ActionId').text();
            return test_value === actionId;
        });
        ActionEditor.fillActionEditor(actionXML);
    },
    // Edit Action
    editAction: function (action) {
        ActionEditor.fillExistingActionEditor(action);
        ActionEditor.showActionEditor(action);
    },
    // Save Action Dialog
    saveActionDialog: function (successFunc) {
        try {
            if (ActionEditor.isActionLibraryItem) {
                // Verify tasks are allowed in the Sync Action Type chosen.
                if (ActionEditor.verifyTaskByActionType($(ActionEditor.newActionXML))) {
                    TaskEditor.mapTasks($(ActionEditor.newActionXML), '#action_tasks');
                    ActionEditor.saveActionLibraryItem(false, successFunc);
                }
            }
            else {
                Workflow.workflowChanged();
                if ($('#action_editor .error').length !== 0) {
                    //do not save if there are errors showing.  
                    alert(Constants.c.errorFixMessage);
                    return false;
                }
                var delTaskIds = TaskEditor.getRemoveTaskIds();
                TaskEditor.deleteTask(delTaskIds);
                ActionEditor.createAction();
                if (!ActionEditor.newActionXML) {
                    ActionEditor.updateAction();
                    var actionId = ActionEditor.getCurrentActionId();
                    ActionEditor.currentActionXML = $(Workflow.currentStepXMLClone).find('Action').filter(function () {
                        var testValue = $(this).find('> ActionId').text();
                        return actionId === testValue;
                    });
                    TaskEditor.mapTasks($(ActionEditor.currentActionXMLClone), '#action_tasks');
                    var appAct = $(ActionEditor.currentActionXMLClone).clone();
                    var remAct = $(Workflow.currentStepXMLClone).find('Action').filter(function () {
                        var testValue = $(this).find('> ActionId').text();
                        return actionId === testValue;
                    });
                    $(remAct).replaceWith(appAct);
                }
                ActionEditor.newActionXML = '';
                this.clearActionLibItem();
            }
            return true;
        }
        catch (e) {
            alert(e);
            return false;
        }
    },
    // Show Action Editor
    showActionEditor: function (action, successFunc, hasSyncAction) {
        var actionName;
        var actionId;
        // Remove selection from task library
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        $('#tasks_lib li').removeClass(' selected_task');
        if (action) {
            actionName = $(action).find('span').text();
            actionId = $(action).find('input[name="ActionId"]').val();
            ActionEditor.currentActionId = actionId;
            ActionEditor.currentActionXML = $(Workflow.currentStepXMLClone).find('Action').filter(function () {
                var test_value = $(this).find('> ActionId').text();
                return actionId === test_value;
            });
            if ($($(ActionEditor.currentActionXML)[0].documentElement).length > 0) {
                ActionEditor.currentActionXMLClone = $($(ActionEditor.currentActionXML)[0].documentElement).clone();
            }
            else {
                ActionEditor.currentActionXMLClone = $(ActionEditor.currentActionXML).clone();
            }
        }
        else if (ActionEditor.newActionXML) {
            ActionEditor.currentActionXML = ActionEditor.newActionXML;
            ActionEditor.currentActionXMLClone = $.extend(true, {}, $(ActionEditor.currentActionXML));
        }
        ActionEditor.createActionEditorDialog(successFunc);
        if (actionName) {
            $('#action_editor').dialog('option', 'title', Constants.c.actionEditor + ': ' + actionName);
        }
        else {
            $('#action_editor').dialog('option', 'title', Constants.c.actionEditor);
        }
        if (!ActionEditor.hasShown) {
            var actionTasks = $('#action_tasks');
            var taskButtons = $('#action_editor .action_buttons');
            TaskEditor.displayTaskKey('#action_editor');
            // Edit Task
            actionTasks.delegate('li', 'dblclick', function (ev) {
                // Find currently selected task
                TaskEditor.editTask($(ev.currentTarget));
            });
            taskButtons.delegate('#edit_task', 'click', function () {
                // Find currently selected task
                var currTask = actionTasks.find('.selected_task');
                if (currTask.length > 0) {
                    TaskEditor.editTask($(currTask));
                }
            });
            // Change selection of task
            actionTasks.delegate('li', 'mousedown', function (ev) {
                // Remove selection from previous targets
                actionTasks.find('.selected_task').removeClass('selected_task');
                // Select current target
                $(ev.currentTarget).addClass('selected_task');
            });
            // Create new Task
            taskButtons.delegate('#add_task', 'click', function () {
                // Display Task Editor upon Adding a new task
                TaskEditor.showTaskEditor();
            });

            taskButtons.delegate('#del_task', 'click', function () {
                if (actionTasks.find('.selected_task').length > 0) {
                    TaskEditor.removeTask(actionTasks.find('.selected_task'));
                }
            });

            $('#addTo_action_lib').click(function () {
                ActionEditor.addToActionLibrary();
            });

        }
        ActionEditor.hasShown = true;
        var sapSelector = $('#action_editor input[name="SyncActionPreference"]:checked');
        if (sapSelector && hasSyncAction) {
            ActionEditor.filterByActionType(sapSelector);
        }
        else {
            TaskEditor.fillTaskLibrary(ActionEditor.getTaskTypeCount());
        }
        $('#action_editor').dialog('open');
    },
    getTaskTypeCount: function () {
        var taskTypeCount = {};
        taskTypeCount[Workflow.taskTypes.Auto] = 0;
        taskTypeCount[Workflow.taskTypes.UI] = 0;
        taskTypeCount[Workflow.taskTypes.Client] = 0;
        var myTasks = ActionEditor.currentActionXMLClone.find("TaskClassName");
        var i;
        for (i = 0; i < myTasks.length; i++ ) {
            var className = myTasks[i].innerHTML;
            taskTypeCount[className] = (taskTypeCount[className] || 0) + 1;
            var taskData = window.taskData[className];
            if (taskData) {
                taskTypeCount[taskData.Type]++;
            }
        }
        return taskTypeCount;
    },

    //#region Action Library
    fillActionLibraryItem: function (libItem, actionXML, successFunc, defaultSyncAction) {
        ActionEditor.newActionXML = actionXML;
        var actionId = $(actionXML).find('> ActionId').text();
        ActionEditor.currentActionId = actionId;
        // Fill out action editor with new action data
        var collection = $('#action_editor input');
        // Map inputs
        $.map(collection, function (item) {
            if (!$(item).hasClass('ignore')) {
                var input_value = $(actionXML).find($(item).attr('name')).text();
                $(item).val(input_value);
            }
            else if ($(item).attr('name') === 'SyncActionPreference') {
                var type = ActionEditor.getActionType(actionXML);
                // 'Check' the radio button that corresponds to the selected sync action type
                // If there is none selected leave alone
                var sap = parseInt($(window.parent.document).find('.contentTypeDefaultsLayout input[name="SyncActionPreference"]:checked').val(), 10);
                if (actionId === Constants.c.emptyGuid && ActionEditor.isActionLibraryItem && sap) {
                    type = sap === Constants.sap.SyncAndVerify ? Constants.wfat.SyncVerifyAction : Constants.wfat.SyncAction;
                }
                // Ensure that the newly added action has a type of Library Item and not Standard
                var actionType = defaultSyncAction || (type === Constants.wfat.Standard ? Constants.wfat.LibraryItem : type);
                $(item).prop('checked', parseInt($(item).val(), 10) === parseInt(actionType, 10));
            }
            else if ($(item).attr('name') === 'ActionId') {
                $(item).val(actionId);
            }
        });
        // Map tasks
        TaskEditor.setupTasks(actionXML, '#action_tasks');
        if (!this.isActionLibraryItem) {
            ActionEditor.currentActionListIndex = $('#step_actions li').index(libItem);
            this.actionLibItems.push(libItem);
        }
        // Show Action Editor
        ActionEditor.showActionEditor(null, successFunc, true);
    },
    /* 
    Drag and Drop library Item
    Using Library Item as a template for a new Action
    */
    dndActionLibraryItem: function (libItem) {
        // Fetch new action
        var libId = $(libItem).find('input').val();
        var newActionXML = Workflow.fetchActionLibItem(libId);
        ActionEditor.fillActionLibraryItem(libItem, newActionXML);
    },
    /*
    New Action Library Item
    Creating a New Action Library Item from an existing Item or from a New Item
    */
    addActionLibraryItem: function (libId, successFunc,defaultSyncAction) {
        var actionXML = Workflow.fetchExistingActionLibItem(libId);
        $(actionXML).find('ActionId').text(Constants.c.emptyGuid);
        $(actionXML).find('> Id').text(Constants.c.emptyGuid);
        $(actionXML).find('> Name').text(Constants.c.newTitle);
        ActionEditor.fillActionLibraryItem(null, actionXML, successFunc, defaultSyncAction);
    },
    /* 
    Edit Action Library Item
    Modifying an Action Library Item as it is saved in the Action Library
    */
    editActionLibraryItem: function (libId, successFunc) {
        var actionXML = Workflow.fetchExistingActionLibItem(libId);
        ActionEditor.fillActionLibraryItem(null, actionXML, successFunc);
    },
    verifyTaskByActionType: function (actionXML) {
        var actionType = ActionEditor.getActionType(actionXML);
        var tasks = $(actionXML).find('WFTaskDTO');
        var autoTasks = window.allData.AutoTasks;
        var uiTasks = window.allData.UITasks;
        var clientTasks = window.allData.ClientTasks;
        var invalidTasks = [];
        var taskLength = tasks.length;
        var i = 0;
        var revWFAT = Utility.reverseMapObject(Constants.wfat);
        for (i = 0; i < taskLength; i++) {
            var task = $(tasks[i]);
            var name = task.find('TaskClassName').text();
            var transName = Constants.c[name];
            var length = clientTasks.length;
            var j;
            for (j = 0; j < length; j++) {
                var clientTask = clientTasks[j];
                if (name === clientTask.TaskClassName && !Utility.checkSAT(clientTask.SupportedActionType, actionType)) {
                    // Add the tasks name to a list, to warn the user that those tasks won't work with the selected actionType
                    invalidTasks.push(transName);
                    break;
                }
            }
            length = uiTasks.length;
            for (j = 0; j < length; j++) {
                var uiTask = uiTasks[j];
                if (name === uiTask.TaskClassName && !Utility.checkSAT(uiTask.SupportedActionType, actionType)) {
                    // Add the tasks name to a list, to warn the user that those tasks won't work with the selected actionType
                    invalidTasks.push(transName);
                    break;
                }
            }
            length = autoTasks.length;
            for (j = 0; j < length; j++) {
                var autoTask = autoTasks[j];
                if (name === autoTask.TaskClassName && !Utility.checkSAT(autoTask.SupportedActionType, actionType)) {
                    // Add the tasks name to a list, to warn the user that those tasks won't work with the selected actionType
                    invalidTasks.push(transName);
                    break;
                }
            }
        }
        invalidTasks = _.uniq(invalidTasks);    // filter duplicates displayed to the user
        if (invalidTasks.length > 0) {
            var msg = Constants.c.invalidTaskWithSyncActionType.replace('{0}', invalidTasks.join(', ')).replace('{1}', Constants.c['wfat_' + revWFAT[actionType]]);
            msg = msg + '\n\n' + Constants.c.correctInvalidSyncAction;

            ErrorHandler.addErrors(msg);
            return false;
        }
        return true;
    },
    filterByActionType: function (libElem) {
        var currType = $(libElem).val();
        ActionEditor.setActionType(ActionEditor.newActionXML, currType);
        TaskEditor.fillTaskLibrary(ActionEditor.getTaskTypeCount(), null, currType);   // Filter out tasks that don't match the current Action Type
    },
    clearActionLibItem: function () {
        var i = 0;
        var length = this.actionLibItems.length;
        // Dragged action is empty when done editing (so remove because it adds a new one when editing is complete)
        for (i; i < length; i++) {
            $(this.actionLibItems[i]).remove();
        }
    },
    prepareActionLibraryItemSave: function () {
        var actionName = $('#action_editor').find('input[name="Name"]').val();
        var actionType = $('#action_editor input[name="SyncActionPreference"]:checked').val();
        if (!actionType) {  // If a Sync Action Preference isn't selected (eg. clicking the 'Add To Library' button)
            actionType = 1;
        }
        var aliClone = $(ActionEditor.currentActionXMLClone).clone();
        aliClone.find('Name').text(actionName);
        ActionEditor.setActionType(aliClone, actionType);
        var action = aliClone[0];
        Workflow.removeNil(action, true);
        var actionXML = Workflow.x2s(action);
        actionXML = encodeURIComponent(actionXML);
        return actionXML;
    },
    actionLibraryItemSaveSuccess: function (result, successFunction) {
        var action = result && result.Actions && result.Actions[0] ? result.Actions[0] : '';
        var currName = ActionEditor.currName;
        if (window.allData.ActionLibrary.length > 0) {
            // remove old action from action library listing
            var i = 0;
            var length = window.allData.ActionLibrary.length;
            for (i; i < length; i++) {
                if (window.allData.ActionLibrary[i].Name === action.Name ||
                    window.allData.ActionLibrary[i].Id === action.Id ||
                    (currName !== Constants.c.newTitle && currName === window.allData.ActionLibrary[i].Name)) {
                    window.allData.ActionLibrary.splice(i, 1);
                    i--;
                    length--;
                }
            }
        }
        window.allData.ActionLibrary.push(action);
        ActionEditor.fillActionLibrary();
        if (!ActionEditor.isActionLibraryItem) {
            $('#addActionSuccess').show().fadeOut(2000, function () {
                $('#addTo_action_lib').removeClass('disabled');
            });
        }
        Utility.executeCallback(successFunction, action.Id);
        ActionEditor.currName = undefined;
    },
    actionLibraryItemSaveFailure: function (errorThrown, sfCallback) {
        if (errorThrown && errorThrown.Type && errorThrown.Type.match('OverridableException')) {
            ActionEditor.currName = $(ActionEditor.currentActionXMLClone).find('Name').text();
            // Open dialog with yes/no cancel options
            $('#replace_action').dialog({
                modal: true,
                autoOpen: false,
                title: Constants.c.replaceAction,
                buttons: [{
                    text: Constants.c.ok,
                    click: function () {
                        Utility.executeCallback(sfCallback);
                    }
                },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        ActionEditor.currName = undefined;
                        $('#addTo_action_lib').removeClass('disabled');
                        $(this).dialog('close');
                    }
                }]
            });
            var msgCont = $('<div></div>');
            msgCont.append($('<div></div>').text(errorThrown.Message));
            msgCont.append($('<div></div>').text(Constants.c.replacePrompt));
            $('#replace_action').html(msgCont.html());
            $('#replace_action').dialog('open');
        }
        else {
            ErrorHandler.addErrors(errorThrown); 
        }
    },
    addToActionLibrary: function (replace, successFunction) {
        if ($('#addTo_action_lib').hasClass('disabled') && !replace) {
            return;
        }
        $('#addTo_action_lib').addClass('disabled');
        var errors = ActionEditor.validateForm();
        if (!$.isEmptyObject(errors)) {
            $('#addTo_action_lib').removeClass('disabled');
            ActionEditor.applyValidation(errors);
            return;
        }
        var actionId = ActionEditor.getCurrentActionId();
        var actionXML = ActionEditor.prepareActionLibraryItemSave();
        var sf = function (result) {
            ActionEditor.actionLibraryItemSaveSuccess(result, successFunction);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ActionEditor.actionLibraryItemSaveFailure(errorThrown, function () {
                ActionEditor.addToActionLibrary(true, function () {
                    $('#replace_action').dialog('close');
                    $('#action_editor').dialog('close');
                    Utility.executeCallback(successFunction, actionId);
                });
            });
        };
        var cf = function () {
            $('#addTo_action_lib').removeClass('disabled');
        };
        var overrideErrors = replace ? { "ds-options": Constants.sro.OverrideErrors } : '';
        Workflow.proxy.copyActionToLibrary(actionXML, sf, ff, cf, null, overrideErrors);
    },
    saveActionLibraryItem: function (replace, successFunction) {
        var errors = ActionEditor.validateForm();
        if (!$.isEmptyObject(errors)) {
            ActionEditor.applyValidation(errors);
            return;
        }
        var actionId = ActionEditor.getCurrentActionId();
        var actionXML = ActionEditor.prepareActionLibraryItemSave();
        var sf = function (result) {
            ActionEditor.actionLibraryItemSaveSuccess(result, successFunction);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ActionEditor.actionLibraryItemSaveFailure(errorThrown, function () {
                ActionEditor.saveActionLibraryItem(true, function (newActionId) {
                    $('#replace_action').dialog('close');
                    $('#action_editor').dialog('close');
                    if (successFunction) {
                        successFunction(newActionId, actionId);
                    }
                });
            });
        };
        var overrideErrors = replace ? { "ds-options": Constants.sro.OverrideErrors } : '';
        Workflow.proxy.saveActionLibraryItem(actionXML, sf, ff, null, null, overrideErrors);
    },
    fillActionLibrary: function () {
        $('#actions_lib').empty();
        var tmpLib = _.sortBy(window.allData.ActionLibrary, function (libItem) {
            return libItem.Name.toLowerCase();
        });
        //add --new-- to the action library as another way to create a new action
        tmpLib.unshift({ Id: Constants.c.emptyGuid, EffectivePermissions: Constants.sp.Full, Name: Constants.c.newTitle });
        var length = tmpLib.length;
        var i;
        for (i = 0; i < length; i++) {
            $('#actions_lib').append($('<li></li>')
                .attr('class', 'no_text_select actionLibItem')
                .append($('<span name="Name"></span>')
                    .text(tmpLib[i].Name))
                .append($('<input class="ignore" type="hidden" name="ActionId">')
                    .val(tmpLib[i].Id)));
        }
        $('#actions_lib li').draggable({
            connectToSortable: '#step_actions',
            helper: 'clone',
            revert: 'invalid',
            start: function (event, ui) {
                $(ui.helper).addClass('selected_item');
                $('#step_actions').css('border-color', 'red');
            },
            stop: function (event, ui) {
                $(ui.helper).removeClass('selected_item');
                $('#step_actions').css('border-color', 'black');
            }
        });
        $('#actions_lib li').contextMenu('actionLibContextMenu', {
            onContextMenu: function (e, menu) {
                return true;
            },
            onShowMenu: function (e, menu) {
                // Don't allow editing/deleting a New Action Library Item, allow adding one though
                if ($(e.currentTarget).find('input').val() === Constants.c.emptyGuid) {
                    $('#editALItem, #deleteALItem', menu).remove();
                }
                $(menu).css('z-index', 10000);
                return menu;
            },
            bindings: {
                // t: element that triggered showing the menu
                'addALItem': function (t, d, e) {
                    ActionEditor.isActionLibraryItem = true;
                    ActionEditor.addActionLibraryItem($(t).find('input').val());
                },
                'editALItem': function (t, d, e) {
                    ActionEditor.isActionLibraryItem = true;
                    ActionEditor.editActionLibraryItem($(t).find('input').val());
                },
                'deleteALItem': function (t, d, e) {
                    var confirmResult = confirm(Constants.c.deleteALIConfirm);
                    if (!confirmResult) {
                        return;
                    }
                    Workflow.deleteActionLibrary($(t).find('input').val());
                }
            }
        });
    },
    getCurrentActionId: function () {
        var actionId = $('#action_editor').find('input[name="ActionId"]').val();
        return actionId;
    },
    getActionType: function (xml) {
        var at = $(xml).find('Type').text();
        if (typeof at === 'string') {
            at = parseInt(at, 10);
        }
        if (isNaN(at)) {
            at = Constants.wfat[$(xml).find('Type').text()];
            at = parseInt(at, 10);
        }
        if (isNaN(at)) {
            at = undefined;
        }
        return at;
    },
    setActionType: function (xml, actionType) {
        $(xml).find('Type').text(actionType);
    },
    /*
        Open the Action Library Item Editor outside the workflow designer (e.g. Content Type Builder)
        Will be called either in the Workflow Designer ready event or in the corresponding backbone view
    */
    displayALIEditor: function (selector, wfActionEditor, syncActionId, successFunc,defaultSyncAction) {
        syncActionId = syncActionId || Constants.c.emptyGuid;
        // Find the iframe that contains the Workflow Designer
        var wfSelector = $(window.document);	// window corresponds to the container of ActionEditor.js
        var closeFunc = function () {
            // Hide inline workflow designer because we are done editing it
            selector.hide();
            wfSelector.hide();
        };
        wfSelector.find('#action_editor').on('dialogclose', closeFunc);
        wfSelector.find('#action_editor').on('dialogopen', function () {
            selector.find('.dialogOverlay, .modalThrobberCont').hide();   // Clear showing any throbbers because the data will soon be loaded
        });
        Utility.showWfDesigner(selector);
        wfActionEditor.isActionLibraryItem = true;
        // Display the Action Library Item Editor
        // Detect if there is a selected Sync Action
        if (syncActionId === Constants.c.emptyGuid) {   // Create Sync Action
            wfActionEditor.addActionLibraryItem(syncActionId, successFunc, defaultSyncAction);
        }
        else {  // Edit Sync Action
            wfActionEditor.editActionLibraryItem(syncActionId, successFunc);
        }
    },
    displaySyncActionPreference: function () {
        // Only display the sync action preferences that are not listed in the hideSAPOpts array
        $('#action_editor .sap').show();
        $('#action_editor .sap > div').show();
        var len = ActionEditor.hideSAPOpts.length;
        var i;
        for (i = 0; i < len; i++) {
            if (ActionEditor.hideSAPOpts[i]) {
                $('#action_editor .sap input[value="' + ActionEditor.hideSAPOpts[i] + '"]').parent().hide();
            }
        }
    }
    //#endregion
};
