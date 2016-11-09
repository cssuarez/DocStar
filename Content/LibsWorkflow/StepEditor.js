/// <reference path="../Content/LibsExternal/a_jquery.js" />
/// <reference path="../Content/LibsInternal/Utility.js" />
var StepEditor = {
    jsp: {},
    hasShown: false,
    stepName: '',
    init: function () {
        $('#dialog').dialog({
            width: 679,
            minWidth: 679,
            height: 500,
            minHeight: 500,
            modal: true,
            autoOpen: false,
            title: Constants.c.stepEditor,
            buttons: [{
                // Save changes, close dialog
                text: Constants.c.ok,
                click: function () {
                    try {
                        if ($('#step_errors li').length <= 0) {
                            StepEditor.okApply();
                            this.flagSave = true;
                            $(this).dialog('close');
                        }
                    }
                    catch (ex) {
                        //Errors thrown to prevent the dialog from closing.
                        //Do not show the message as the message has already been displayed next to the input that caused it.
                        Utility.OutputToConsole(ex);
                    }
                }
            },
            {
                // Do Nothing, just close dialog
                text: Constants.c.cancel,
                click: function () {
                    this.flagSave = false;
                    $(this).dialog('close');
                }
            }],
            open: function () {
                this.flagSave = false;
            },
            close: function () {
                if (!this.flagSave) {
                    $('.error').removeClass('error');
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    // Clear Branches to be added upon cancel
                    BranchesEditor.newBranchesXML = [];
                    Utility.changeButtonState([Constants.c.ok, Constants.c.apply], 'enable', $('#dialog').parent());
                }
            }
        });
        $('#step_actions').sortable({
            axis: 'y',
            containment: '#step_actions',
            tolerance: 'pointer',
            start: function (event, ui) {
                $(ui.item).addClass('sorting');
            },
            stop: function (event, ui) {
                $(ui.item).removeClass('sorting');
            },
            update: function (event, ui) {
                if ($(ui.item).hasClass('actionLibItem')) {
                    $(ui.item).removeClass('actionLibItem');
                    ActionEditor.dndActionLibraryItem($(ui.item));
                }
            }
        });
        $('#step_branches').sortable({ axis: 'y', containment: 'parent', tolerance: 'pointer' });
        $('#dialog input[name="Name"]').bind('keyup', function () {
            var titles = [Constants.c.ok, Constants.c.apply];
            var errors = StepEditor.validateForm();
            var selector = $('#dialog').parent();
            if (errors) {
                Utility.changeButtonState(titles, 'disable', selector);
            }
            else {
                Utility.changeButtonState(titles, 'enable', selector);
            }
        });
        $('#dialog select[name="SetAssignee_"]').bind('change', function () { StepEditor.showHideAssigneeMode(); });
        $('#dialog input[name="num_of_approvals_cb"]').bind('click', function () {
            if ($('#dialog input[name="num_of_approvals_cb"]').is(':checked')) {
                $('#approvalsrequired').show();
            } else {
                $('#approvalsrequired').find('input').val('0');
                $('#approvalsrequired').hide();
            }
        });

        //only allow integers
        Workflow.allowIntOnly('#dialog input[name="SetApprovalsRequired_"]');
        $('#isauto').dialog({
            width: 590,
            modal: true,
            autoOpen: false,
            buttons: {
                'Ok': function () {
                    StepEditor.fixLogicErrors();
                    $('#isauto').dialog('close');
                }
            }
        });
    },
    okApply: function () {
        // Check for errors, save changes to step when Ok or Apply is clicked
        var errors = false;
        var logic_errors = StepEditor.isAutoValid($('#dialog input[name="IsAuto"]').is(':checked'), $('#dialog select[name="BranchMode"]'));
        if (logic_errors.length > 0) {
            $('#auto_errors').html('');
            $.map(logic_errors, function (e) {
                $('#auto_errors').append('<li>' + e.message + '</li>');
            });
            errors = true;
        }
        if (errors) {
            $('#isauto').dialog('open');
            return;
        }
        //save to xml in data of the window
        StepEditor.saveStepDialog();
    },
    fixLogicErrors: function () {
        /*Workflow.overrideAutoLogic = true;
        var elb = '';
        if ($('#dialog').parent().css('display') === 'block') {
        elb = $('#dialog select[name="BranchMode"]');
        } else {
        elb = $('#branch_editor select[name="BranchMode"]');
        }
        $('#dialog input[name="IsAuto"]').attr('checked', true);        
        Workflow.overrideAutoLogic = false;
        var data = $('#isauto').data('errors');
        //check for Template errors
        //uncheck run template if the template is not autonomous
        $('#dialog input[name="RunTemplate"]').attr('checked', false);
        */
    },
    isAutoValid: function (isauto, el) {
        var errors = [];
        if (isauto) {
            //validate that the right options are set
            var branch_mode = $(el).val();
            if (branch_mode !== '0') {
                errors.push({ type: 'BranchMode', message: 'Branch Mode needs to be single for Auto to work' });
            }
            //check templates here. 
            //native templates
            var runTemplate = $('#dialog input[name="RunTemplate"]').is(':checked');
            var ntid = parseInt($('#dialog select[name="NativeTemplateId_"]').val(), 10);
            if (runTemplate && ntid !== 0) {
                //check that it doesn't require user input
                $.map(window.allData.NativeTemplates, function (nt) {
                    if (ntid === nt.id && nt.hasUserInput) {
                        errors.push({
                            type: 'NativeTemplateId_',
                            message: 'Native Template ' + nt.name + ' requires user input.  Auto and this Native Template conflict.'
                        });
                    }
                });
            }
            //templates
            var tid = parseInt($('#dialog select[name="TemplateId_"]').val(), 10);
            if (runTemplate && tid !== 0) {
                //check that it doesn't require user input
                $.map(window.allData.Templates, function (nt) {
                    if (tid === nt.id && nt.hasUserInput) {
                        errors.push({
                            type: 'TemplateId_',
                            message: 'Template ' + nt.name + ' requires user input.  Auto and this template conflict.'
                        });
                    }
                });
            }
        }
        //do nothing because anything goes.  
        return errors;
    },
    validateForm: function () {
        var errors = false;
        //clear out errors
        $('#error_list').children().remove();
        //remove error classes
        $('#dialog .error').removeClass('error');
        //check name field if it is different than the original
        var input = $('#dialog  input[name="Name"]').val();
        var orig = $(Workflow.currentStepXMLClone).find('> Name').text();
        var addError = function (text) {
            errors = true;
            $('#dialog input[name="Name"]').addClass('error').siblings().addClass('error');
            $('#error_list').append('<li>' + text + '</li>');
        };
        if (input !== orig) {
            if (!Workflow.isValidStepName(input)) {
                //add error class to input and span
                addError(Constants.c.nameEmptyWarning);
            }
            if (input.length > 40) {
                addError(Constants.c.nameTooLong);
            }
        }
        if (errors) {
            $('#step_errors').show();
        }
        else {
            $('#step_errors').hide();
        }
        return errors;
    },
    saveStepDialog: function () {
        Workflow.workflowChanged();
        // Get name value to set the step name too
        var newName = $('#dialog input[name="Name"]').val();
        var oldName = $(Workflow.currentStepXMLClone).find('> Name').text();
        // Rename step with new name
        if (oldName !== newName) {
            Workflow.renameStep(oldName, newName);
        }
        // Delete Actions
        var delActionIds = ActionEditor.getRemoveActionIds();
        ActionEditor.deleteAction(delActionIds);
        // Delete Branches
        // If it is an advanced workflow, otherwise, don't allow branch modification
        if (Workflow.advancedWf) {
            var delBranchIds = BranchesEditor.getRemoveBranchIds();
            BranchesEditor.deleteBranch(delBranchIds);
            BranchesEditor.createBranches();
        }
        // Get old name of step, before updating the xml

        //check to see if step name changed. 
        if ($('#dialog .error').length !== 0) {
            //do not save if there are errors showing.  
            alert('please correct the errors before proceeding');
            return;
        }
        var collection = $('#dialog .editor > .item input, #dialog .editor > .item select');
        // Map inputs, selects
        $.map(collection, function (item) {
            if (!$(item).hasClass('ignore')) {
                $(Workflow.currentStepXMLClone).find('> ' + $(item).attr('name')).text($(item).val());
            }
        });
        ActionEditor.mapActions();
        BranchesEditor.mapBranches();
        $(Workflow.currentStepXML).replaceWith(Workflow.currentStepXMLClone);
        Workflow.redrawStep($(Workflow.currentStepXMLClone).find('> Name').text());
    },
    showHideAssigneeMode: function (selection) {
        // Check Assignee Mode
        var defAssignee = $('#dialog select[name="DefaultAssignee"]');
        var groups = defAssignee.find('optgroup.og_groups');
        var users = defAssignee.find('optgroup.og_users');
        switch (selection.val()) {
            // If value is none or Owner hide set assignee                                                                                                                                                                                                                 
            case Constants.am.None.toString():
            case Constants.am.Owner.toString():
                groups.hide();
                groups.appendTo(groups.parent());
                groups.children().hide();
                $(groups).children().each(function () {
                    $(groups).attr("disabled", "disabled").removeAttr("selected");
                });
                users.hide();
                users.children().hide();
                $(users).children().each(function () {
                    $(users).attr("disabled", "disabled").removeAttr("selected");
                });
                defAssignee.attr('disabled', 'disabled');
                defAssignee.parent().hide();
                break;
                // If value is User hide groups in set assignee select
            case Constants.am.User.toString():
                users.appendTo(users.parent());
                users.show();
                users.children().show();
                $(users).children().each(function () {
                    $(users).removeAttr("disabled").removeAttr("selected");
                });
                groups.hide();
                groups.appendTo(groups.parent());
                groups.children().hide();
                $(groups).children().each(function () {
                    $(groups).attr("disabled", "disabled").removeAttr("selected");
                });
                defAssignee.removeAttr('disabled');
                defAssignee.parent().show();
                break;
                // If value is RoundRobin, Random, LoadBalance, Whole Group, etc. hide users in set assignee select
            default:
                groups.show();
                groups.appendTo(groups.parent());
                groups.children().show();
                $(groups).children().each(function () {
                    $(groups).removeAttr("disabled").removeAttr("selected");
                });
                users.appendTo(users.parent());
                users.hide();
                users.children().hide();
                $(users).children().each(function () {
                    $(users).attr("disabled", "disabled").removeAttr("selected");
                });
                defAssignee.removeAttr('disabled');
                defAssignee.parent().show();
                break;
        }
    },
    fillAssigneeMode: function (el) {
        // Sort assignee modes by value
        var sortedAM = Utility.sortObjectByValue(Constants.am);
        $.map(sortedAM, function (value, key) {
            // Get key in constants 
            var am = Constants.c['am_' + key];
            el.append($('<option/>').val(value).text(am));
        });
    },
    fillLineType: function (el) {
        el.append($('<option></option>')
                .text(Constants.c.straight).val("Straight"))
            .append($('<option></option>')
                .text(Constants.c.flowChart).val("Flowchart"))
            .append($('<option></option>')
                .text(Constants.c.bezier).val("Bezier"));
        var length = el.length;
        var i;
        for (i = 0; i < length; i++) {
            var lineId = $(el[i]).siblings('input[name="LineTypeId"]').val();
            if (!lineId) {
                lineId = 'Straight';
            }
            $(el[i]).val(lineId);
        }
        el.change(function (e) {
            $.cookie('LineType', $(e.currentTarget).val());
        });
    },
    fillNextSteps: function (el, destName, destId) {
        if (destName === '') {
            destName = Constants.t('end');
        }
        // Find steps to choose from
        var steps = $(Workflow.xml).find('WFStepDTO');
        steps.push($('<WFStepDTO><Name>' + Constants.c.end + '</Name><Id>' + Constants.c.emptyGuid + '</Id></WFStepDTO>'));
        var srtByName = function (a, b) {
            var aName = $(a).find('> Name').text().toLowerCase();
            var bName = $(b).find('> Name').text().toLowerCase();
            if (aName < bName) {
                return -1;
            }
            if (aName > bName) {
                return 1;
            }
            return 0;
        };
        steps.sort(srtByName);
        // Map step names and step ids to options in select        
        $.map(steps, function (item, key) {
            var stepName = $(item).find('> Name').text();
            var stepId = $(item).find('> Id').text();
            if (stepId !== destId) {
                el.append($('<option></option>').val(stepId).text(stepName).attr('title', stepName));
            }
            else {
                el.append($('<option></option>').val(destId).text(destName).attr('title', destName).attr('selected', 'selected'));
            }
        });
        // If there is no destination step id make the end step selected (end is the destination).
        if (!destId || destId === Constants.c.emptyGuid) {
            el.find('option[value="' + Constants.c.emptyGuid + '"]').attr('selected', 'selected');
        }
    },
    showStepEditor: function (ev, name, value) {
        $('.error').removeClass('error');
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        Utility.changeButtonState([Constants.c.ok, Constants.c.apply], 'enable', $('#dialog').parent());
        if (name) {
            $('#dialog').dialog('option', 'title', Constants.c.stepEditor + ': ' + name);
        }
        else {
            $('#dialog').dialog('option', 'title', Constants.c.stepEditor);
        }
        //clear out any errors on show
        $('#error_list').html('');
        //var sel = 'Step[Name="' + $(ev.target).parent().find('div > strong').text() + '"]';
        name = $(ev.target).parent().find('div > strong').text();
        var xml = Workflow.currentStepXMLClone;
        // Map to each input the corresponding value found in the xml
        $('#dialog div.item > input').map(function (key, item) {
            // Find WFStepDTO name            
            var input_value = $(xml).find('>' + $(item).attr('name')).text();
            $(item).val(input_value);
        });
        // Map Actions
        ActionEditor.setupActions(xml);
        // Map Branches
        BranchesEditor.setupBranches(xml, true);
        if (!StepEditor.hasShown) {
            $('#wf_tab').tabs();
            if (!Workflow.advancedWf) {
                // Remove the tab from the DOM manually (an update to jquery ui's tabs widget removed the 'remove' method - Bug 13363)
                var tab = $("#wf_tab").find(".ui-tabs-nav li:eq(1)").remove();  // remove the 'Branches' tab, since we only allow branching in Advanced Workflow
                // Refresh the tabs widget to reflect the above removal
                $("#wf_tab").tabs("refresh");
            }
            var stepActions = $('#step_actions');
            var stepBranches = $('#step_branches');
            var assigneeMode = $('#dialog select[name="AssigneeMode"]');
            var defAssignee = $('#dialog select[name="DefaultAssignee"]');
            // fill in set assignee select with users and groups
            Workflow.fillUserGroupSelect(defAssignee);
            ActionEditor.fillActionLibrary();
            // fill in set assignee mode select with assignee mode options
            StepEditor.fillAssigneeMode(assigneeMode);
            assigneeMode.bind('change', function (ev) {
                var selection = $(this).find('option:selected');
                // Reset selection of default assignee when changing assignee mode
                defAssignee.find('option:selected').removeProp('selected');
                StepEditor.showHideAssigneeMode(selection);
            });
            // Edit Action
            stepActions.delegate('li', 'dblclick', function (ev) {
                // Find currently selected action
                ActionEditor.editAction($(ev.currentTarget));
            });
            // Change selection of action
            stepActions.delegate('li', 'mousedown', function (ev) {
                // Remove selection from previous targets
                stepActions.find('.selected_action').removeClass('selected_action');
                stepBranches.find('.selected_branch').removeClass('selected_branch');
                // Select current target
                $(ev.currentTarget).addClass('selected_action');
            });
            // Create new action
            $('#dialog').delegate('#add_action', 'click', function () {
                // Display Action Editor upon Adding a new action
                var name = ActionEditor.getNewActionName();
                ActionEditor.addAction(name);
            });
            // Edit currently selected action
            $('#dialog').delegate('#edit_action', 'click', function () {
                // Find currently selected action                
                var currAction = stepActions.find('.selected_action');
                if (currAction.length > 0) {
                    ActionEditor.editAction($(currAction));
                }
            });
            // Delete Currently Selected Action
            $('#dialog').delegate('#del_action', 'click', function (ev) {
                if (stepActions.find('.selected_action').length > 0) {
                    ActionEditor.removeAction(stepActions.find('.selected_action'));
                }
            });
            // Change selection of branch
            stepBranches.delegate('li', 'mousedown', function (ev) {
                // Remove selection from previous targets
                stepBranches.find('.selected_branch').removeClass('selected_branch');
                stepActions.find('.selected_action').removeClass('selected_action');
                // Select current target
                $(ev.currentTarget).addClass('selected_branch');
            });
            // Create new branch
            $('#dialog').delegate('#add_branch', 'click', function () {
                BranchesEditor.addBranch();
                $('input[name="Condition"]').parent().parent().droppable({
                    accept: '#conditions_lib li',
                    activate: function (a, ui) {
                        $('input[name="Condition"]').addClass('arg_border');
                    },
                    deactivate: function (a, ui) {
                        $('input[name="Condition"]').removeClass('arg_border');
                    },
                    drop: function (a, ui) {
                        // Make inputs text equivalent to dropped items text
                        var argText = $(ui.helper).find('span').text();
                        $(this).find('input[name="Condition"]').val(argText);
                    }
                });
                stepBranches.scrollTop(99999); // scroll to bottom to show newly-added branch
            });
            // Delete currently selected branch
            $('#dialog').delegate('#del_branch', 'click', function (ev) {
                if (stepBranches.find('.selected_branch').length > 0) {
                    BranchesEditor.removeBranch(stepBranches.find('.selected_branch'));
                }
            });
        }
        // Map to each select the corresponding value found in the xml
        $('#dialog div.item > select').map(function (key, item) {
            var select_value = $(xml).find('>' + $(item).attr('name')).text();
            var selection;
            if (select_value) {
                $(item).find('option[value="' + select_value + '"]').prop('selected', 'selected');
            }
            else {
                $(item).find('option').first().prop('selected', 'selected');
            }
            selection = $(item).find('option:selected');
            StepEditor.showHideAssigneeMode(selection);
        });

        StepEditor.hasShown = true;
        $('#dialog').dialog('open');
        // Show/Hide assigneeMode based on selected option
        StepEditor.showHideAssigneeMode($('#dialog select[name="AssigneeMode"] option:selected'));

        BranchesEditor.conditionLibrary('#conditions_lib', window.argumentLibrary);
        $('input[name="Condition"]').parent().parent().droppable({
            accept: '#conditions_lib li',
            activate: function (a, ui) {
                $('input[name="Condition"]').addClass('arg_border');
            },
            deactivate: function (a, ui) {
                $('input[name="Condition"]').removeClass('arg_border');
            },
            drop: function (a, ui) {
                // Make inputs text equivalent to dropped items text
                var argText = $(ui.helper).find('span').text();
                $(this).find('input[name="Condition"]').val(argText);
            }
        });
    }
};