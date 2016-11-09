/// <reference path="../Content/LibsInternal/ErrorHandler.js" />
var Workflow = {
    overrideAutoLogic: false,
    proxy: WorkflowServiceProxyV2(),
    jsp: {},
    currentStepName: '',
    currentStepId: '',
    currentStepXML: '',
    advancedWf: false,
    id: 'choose',
    isNew: false,
    delegates: true,
    hash: {},
    fudge: 10,
    connectors: {},
    auto_loaded_count: 0,
    numPerRow: 10,
    rheight: 122, //pix
    cwidth: 122, //px
    wf_default: { height: '600px', width: '600px' },
    uncommitted_changes: false,
    xml: false,
    helpXml: false,
    helpXmlPointers: {},
    taskTypes: {    // Constants for task types
        UI: "UI",
        Auto: "Auto",
        Client: "Client"
    },
    init: function () {
        //init workflow here
        //listen to which workflow is selected
        ErrorHandler.bindOnCompleteOnSuccess();
        ErrorHandler.bindOnCompleteOnError();
        var data = Workflow.fetchAllData();
        this.advancedWf = data.AdvancedWF;
        if (!this.advancedWf) {
            $('#addstep').remove();
        }
        //load WorkProcess names
        window.argumentLibrary = null;
        window.allData = data;
        window.databaseFields = new DatabaseFields(data.DatabaseFields);
        window.userPreferences = new UserPreferences(data.UserPreferences);
        Workflow.helpXml = $.parseXML(data.HelpXMLString);
        Workflow.setHelpXmlPointers();
        window.taskData = {};
        var task;
        var taskData;
        for (task in allData.AutoTasks) {
            if (allData.AutoTasks.hasOwnProperty(task)) {
                taskData = allData.AutoTasks[task];
                taskData.Type = Workflow.taskTypes.Auto;
                window.taskData[taskData.TaskClassName] = taskData;
            }
        }
        for (task in allData.ClientTasks) {
            if (allData.ClientTasks.hasOwnProperty(task)) {
                taskData = allData.ClientTasks[task];
                taskData.Type = Workflow.taskTypes.Client;
                window.taskData[taskData.TaskClassName] = taskData;
            }
        }
        for (task in allData.UITasks) {
            if (allData.UITasks.hasOwnProperty(task)) {
                taskData = allData.UITasks[task];
                taskData.Type = Workflow.taskTypes.UI;
                window.taskData[taskData.TaskClassName] = taskData;
            }
        }
        Workflow.loadNames(data.Workflows);
        WorkflowEditor.setupCreateDialogs();
        TaskEditor.applyEventHandlers();
        $('#wf_name').bind('change', function () {
            Workflow.loadName();
        });
        $('#edit_process').bind('click', function () {
            WorkflowEditor.showWorkflowEditor();
        });
        $('input[name="Save"]').bind('click', function () {
            Workflow.saveWorkflow();
        });
        $('input[name="SaveAs"]').bind('click', function () {
            Workflow.openSaveAs();
        });
        $('input[name="Delete"]').bind('click', function () {
            if (Workflow.id === Constants.c.emptyGuid || Constants.c.emptyGuid === $('#wf_name').val()) {
                ErrorHandler.addErrors(Constants.c.cannotDeleteNew, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                return;
            }
            Workflow.addDeleteNames();
            Workflow.toggleHeaderActions(true);
            $('#delete_form').dialog('open');
        });
        $('input[name="Email"]').bind('click', function () {
            EmailLinkUtil.setupWorkflowHelp();
        });
        if (window.parent === window.self) {
            $(document.getElementById('userLogout')).show();
        }
        $('#userLogout').click(function () {    // Allow user to log out
            window.location.href = Constants.Url_Base + 'Account/Logout';
        });
        // Create on the fly event handlers
        $('body').on('click', 'span.createContentType', WorkflowEditor.createContentType);
        $('body').on('click', 'span.createCustomList', WorkflowEditor.createCustomList);
        $('body').on('click', 'span.createCustomField', WorkflowEditor.createCustomField);
        $('body').on('click', 'span.createInbox', WorkflowEditor.createInbox);
        $('body').on('click', 'span.createSecurityClass', WorkflowEditor.createSecurityClass);
        $('#main_panel').delegate('a', 'click', function (ev, name, value) {
            Workflow.currentStepName = $(ev.target).parents('.window').find('div strong').text();
            Workflow.currentStepId = Workflow.getStepIdByName(Workflow.currentStepName);
            Workflow.currentStepXML = $(Workflow.xml).find('WFStepDTO').filter(function () { return Workflow.currentStepId === $(this).find('>Id').text(); });
            Workflow.currentStepXMLClone = Workflow.currentStepXML.clone();
            if ($(ev.target).hasClass('process')) {
                if ($(ev.target).hasClass('add_step')) {
                    Workflow.addStepAfter();
                } else {
                    WorkflowEditor.showWorkflowEditor(ev, name, value);
                }
            } else if ($(ev.target).hasClass('delete_step')) {
                Workflow.deleteStep($(ev.target).parents('.window').find('div strong').text());
            } else if ($(ev.target).hasClass('add_step')) {
                Workflow.addStepAfter();
            } else {
                StepEditor.showStepEditor(ev, Workflow.currentStepName, value);
            }

            /* Sample code showing calls to CopyStep and PasteStep

            var post = {
            stepXML: encodeURIComponent(Workflow.x2s(Workflow.currentStepXML[0]))
            };
            $.ajax(Constants.Url_Base + 'WorkflowDesigner/CopyStep' + Workflow.getCacheBusterStr(), {
            async: false,
            type: 'post',
            data: post,
            success: function (dt) {
            if ($(dt).find('root').attr('Status') === 'ok') {
            data = dt;
            } else {
            alert($(dt).find('root').attr('Message'));
            }
            }
            });

            var post = {
            workflowXML: encodeURIComponent(Workflow.x2s(Workflow.xml))
            };
            $.ajax(Constants.Url_Base + 'WorkflowDesigner/PasteStep' + Workflow.getCacheBusterStr(), {
            async: false,
            type: 'post',
            data: post,
            success: function (dt) {
            if ($(dt).find('root').attr('Status') === 'ok') {
            data = dt;
            } else {
            alert($(dt).find('root').attr('Message'));
            }
            }
            });
            */

        });
        var bdngs = {
            'saveworkflow': function (t) {
                Workflow.saveWorkflow();
            },
            'saveas_context': function (t) {
                Workflow.openSaveAs();
            },
            'close': function (t) {
                $('#wf_name').val(Constants.c.emptyGuid);
                Workflow.loadName();
                window.location.hash = '';
                $('#edit_process').hide();
            }
        };
        if (Workflow.advancedWf) {
            bdngs.addstep = function (t, d, e) {
                Workflow.addNewStep(e);
                var xml = $(Workflow.xml).find('WFStepDTO > Name').filter(function (index) { return $(this).text() === BranchesEditor.stepName; }).parent();
                Workflow.addNewBranch(xml);
                Workflow.redrawStep(BranchesEditor.stepName);
            };
        }
        $('#main_panel, #main_container').contextMenu('myMenu1', {
            onShowMenu: function (e, menu) {
                if ($('#wf_name').val() === 'choose') {
                    return false;
                }
                return menu;
            },
            bindings: bdngs
        });
        Workflow.addDialogs();
        var id = $('#wf_name').find(':selected').val();
        if (!window.location.hash) {
            window.location.hash = id;
        }
        if (window.location.hash) {
            $('#section_container').show();
        }
    },
    addStepAfter: function () {
        var redrawSteps = [];
        try {
            //start is a special case :)  
            //add step to screen right below this one.  
            var e = {};
            var step = Workflow.getStepByName(Workflow.currentStepName);
            e.clientY = parseInt($(step).css('top'), 10) + Workflow.rheight + 100;
            e.clientX = parseInt($(step).css('left'), 10) + 8;
            //get the first branch from the current step and point the added steps pointer to there
            var first;
            var newStepName = 'End';
            var addBranchs = function () {
                xml = $(Workflow.xml).find('WFStepDTO > Name').filter(function (index) { return $(this).text() === BranchesEditor.stepName; }).parent();
                if (Workflow.currentStepName === 'Start') {
                    first = Workflow.getStepNameById($(Workflow.xml).find('WorkflowDTO > StartingStepId').text());
                    Workflow.addNewBranch(xml, first);
                } else {
                    //get xml step
                    var xstep = $(Workflow.xml).find('WFStepDTO').filter(function () { return Workflow.currentStepName === $(this).find('>Name').text(); });
                    //get first branch
                    var fbranchs = $(xstep).find('WFBranchDTO');
                    //get nextstepid
                    var i = 0;
                    var length = fbranchs.length;
                    for (i; i < length; i++) {
                        var nid = $(fbranchs[i]).find('>DestinationStepId').text();
                        Workflow.addNewBranch(xml, Workflow.getStepNameById(nid));
                    }
                }
                Workflow.redrawStep(BranchesEditor.stepName);
            };
            newStepName = Workflow.addNewStep(e, true);
            addBranchs();
            if (Workflow.currentStepName === 'Start') {
                $(Workflow.xml).find('WorkflowDTO > StartingStepId').text(Workflow.getStepIdByName(newStepName));
            } else {
                //get step xml
                var fstep = $(Workflow.xml).find('WFStepDTO').filter(function () { return Workflow.currentStepName === $(this).find('>Name').text(); });
                //get first branch                
                var f_branch = $(fstep).find('WFBranchDTO:first');
                //set DestinationStepId
                redrawSteps.push(Workflow.getStepNameById($(f_branch).find('DestinationStepId').text()));
                $(f_branch).find('DestinationStepId').text(Workflow.getStepIdByName(newStepName));
                $(fstep).find('WFBranchDTO:not(:first)').remove();
            }
            redrawSteps.push(Workflow.currentStepName);
            Workflow.redrawStep(redrawSteps);
            //update current steps point to point to the new step that was just added.  
        } catch (err) {
            alert(err.message);
        }
    },
    addNewStep: function (e, negateFudge) {
        if (!Workflow.advancedWf) {
            alert(Constants.c.advancedWorkflowRequired + Constants.c.step);
            return;
        }
        var xml;
        var offsets = $('#main_panel').offset();
        var f = Workflow.fudge;
        if (negateFudge) {
            f = 0;
        }
        var pos = { top: e.clientY - offsets.top - f, left: e.clientX - offsets.left - f };
        //get auto generated new name
        var name = Workflow.getNewName();
        Workflow.addStepToPanel(name, 'wfs_' + Workflow.auto_loaded_count++, pos, true, 'Edit Step');
        //addStepData to the dom
        try {
            xml = Workflow.fetchNewStep();
        } catch (err) {
            $('#logout').dialog('open');
            return;
        }
        $(xml).find('WFStepDTO > Name').text(name);
        var tmp = Workflow.xml.getElementsByTagName('Steps')[0];
        tmp.appendChild(xml.getElementsByTagName('WFStepDTO')[0]);
        BranchesEditor.stepName = name;
        return name;
    },
    addNewBranch: function (xmlstep, nextStep, overrideAdvanced) {
        if (!Workflow.advancedWf && !overrideAdvanced) {
            alert(Constants.c.advancedWorkflowRequired + Constants.c.branch);
            return;
        }
        var xml;
        var stepid;
        var nextid = Workflow.getStepIdByName(nextStep);
        try {
            stepid = $(xmlstep).find('> Id').text();
            xml = Workflow.fetchNewBranch(stepid, nextid);
        } catch (e) {
            $('#logout_error').text('Error fetching new branch. You may be logged out or there is an error with the server right now.  Try again later. ');
            $('#logout').dialog('open');
            return;
        }
        var id = $(xml).find('WFBranchDTO > Id').text();
        $(xml).find('WFBranchDTO > DestinationStepId').text(nextid);
        $(xml).find('WFBranchDTO Sequence').text($(xmlstep).find('WFBranchDTO').length);
        var st = $(Workflow.xml).find('WFStepDTO').filter(function (index) {
            return stepid === $(this).find('> Id').text();
        });
        var branches = $(st).find('WFBranches');
        $(branches).append(xml.getElementsByTagName('WFBranchDTO')[0]);
        return $(Workflow.xml).find('WFBranchDTO').filter(function (index) { return id === $(this).find('> Id').text(); });
    },
    addConnectorToPanel: function (name, nextStep, branchDesignerData) {
        var connector;
        var label;
        if (branchDesignerData) {
            connector = branchDesignerData.LineType;
            label = branchDesignerData.Label;
        }
        if (!connector) {
            connector = 'Straight';
        }
        if (!label) {
            label = ' ';
        }

        //check that name and nextStep exist as nodes...otherwise this errors out.  
        var name_node = $('#' + Workflow.hash[name]);
        var nextStep_node = $('#' + Workflow.hash[nextStep]);
        if ($(name_node).length === 0 || $(nextStep_node).length === 0) {
            return;
        }
        var hoverPaintStyle = { lineWidth: 13, strokeStyle: "#7ec3d9" };
        var endPointOptions = { isSource: true, isTarget: true };
        var srcEndpoint = Workflow.jsp.addEndpoint(Workflow.hash[name], { anchor: "AutoDefault" }, endPointOptions);
        var trgEndpoint = Workflow.jsp.addEndpoint(Workflow.hash[nextStep], { anchor: "AutoDefault" }, endPointOptions);
        var connection1 = Workflow.jsp.connect({
            source: srcEndpoint,
            target: trgEndpoint,
            connector: connector,
            cssClass: "c1",
            endpointClass: "c1Endpoint",
            anchors: ["AutoDefault", [0.75, 0, 0, -1]],
            paintStyle: {
                lineWidth: 5,
                strokeStyle: "blue",
                outlineWidth: 1,
                outlineColor: "#666"/*,
					dashstyle:"2 2"*/
            },
            endpointStyle: { fillStyle: "#a7b04b" },
            hoverPaintStyle: hoverPaintStyle,
            overlays: [
                ["Arrow", {
                    location: 0.2, width: 25,
                    events: {}

                }],
                ["Label", {
                    label: label,
                    cssClass: "branchLabel"
                }]
            ]
        });
        //jsPlumb.setDraggable(connection1);
        Workflow.connectors[name].push(connection1);
    },
    addDialogs: function () {
        WorkflowEditor.init();
        StepEditor.init();
        ActionEditor.init();
        TaskEditor.init();
        Workflow.saveChangesDialog();
        Workflow.sendToLoginDialog();
        Workflow.advancedWFDialog();
        Workflow.saveAsDialog();
        Workflow.deleteDialog();
        Workflow.saveFailureDialog();
        $('#saveas input[type="text"]').bind('keyup', function () {
            Workflow.validateSaveAs();
        });

    },
    addDeleteNames: function () {
        var children = $('#delete_form select').children();
        $.map(children, function (el) {
            if ($(el).val() !== 'deleteprocess') {
                $(el).remove();
            }
        });
        var id = Workflow.id;
        $.map(window.allData.Workflows, function (p) {
            if (id !== p.Id && p.Id !== Constants.c.emptyGuid) {
                $('#delete_form select').append($('<option/>').val(p.Id).text(p.Name));
            }
        });
    },
    addStepToPanel: function (name, id, pos, bind_editor, editName) {
        //store name to id in hash
        Workflow.hash[name] = id;
        var sdiv = $('<div id="' + id + '" class="component window ui-draggable"><div><strong>' + name + '</strong></div></div>').first();
        $(sdiv).css({ left: pos.left, top: pos.top });
        $('#main_panel').append(sdiv);
        //bind editor to each window
        if (bind_editor) {
            Workflow.bindEditor(sdiv, editName);
        }
        $(sdiv).draggable({
            drag: function (event, ui) {
                //do not animate if there are more than 5 connections
                var id = $(ui.helper).attr('id');
                var connections1 = Workflow.jsp.getConnections({ target: id });
                var connections2 = Workflow.jsp.getConnections({ source: id });

                if ((connections1.length + connections2.length) < 5) {
                    Workflow.jsp.repaintEverything();
                }
            },
            stop: function (event, ui) { Workflow.checkBounds(event, ui); }
        });
        return sdiv;
    },
    allowIntOnly: function (selector) {
        $(selector).keydown(function (event) {
            // Allow only backspace and delete
            // Ensure that it is a number and stop the keypress
            if (event.keyCode !== 46 && event.keyCode !== 8 && (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105)) {
                event.preventDefault();
            }
        });
    },
    bindEditor: function (sdiv, editName) {
        $(sdiv).append('<a class="editlink" href="javascript:void(0);">' + editName + '</a>');
        if ($(sdiv).attr('id') !== 'wfs_0') {
            $(sdiv).append('<div></div><a class="editlink delete delete_step" href="javascript:void(0);">' + Constants.t('deleteStep') + '</a>');
        }
        if (Workflow.advancedWf) {
            $(sdiv).append('<div></div><a class="editlink add_step" href="javascript:void(0);">' + Constants.t('addStep') + '</a>');
        }
        $(sdiv).hover(
            function () {
                var steps = Workflow.getOnScreenRealSteps();
                if (steps.length > 1) {
                    $(this).find('.delete').addClass('editlink').show();
                } else {
                    $(this).find('.delete').removeClass('editlink').hide();
                }
                $(this).find('.editlink').fadeIn(500);
            },
            function () {
                $(this).find('.editlink').fadeOut(100);
            }
        );
    },
    checkBounds: function (event, ui) {
        var top = parseInt($(ui.helper).css('top'), 10);
        if (top <= 0) {
            var func = function () {
                Workflow.jsp.repaintEverything();
            };
            $(ui.helper).animate({ top: '0' }, { step: func, duration: 1000, complete: func });
        }
        Workflow.jsp.repaintEverything();
    },
    deleteStep: function (name) {
        Workflow.workflowChanged();
        //TODO need to remove the connectors and endpoints 1 by 1
        var confirmResult = confirm(Constants.c.deleteStepConfirm);
        if (!confirmResult) {
            return;
        }
        var step_el = Workflow.getStepByName(name);
        var tmpStep = $(Workflow.xml).find('WFStepDTO').filter(function () { return name === $(this).find('>Name').text(); });
        var currStepId = Workflow.getStepIdByName(name);
        var nextStep = $(tmpStep).find('WFBranchDTO:first > DestinationStepId').text();
        var nextStepName = Workflow.getStepNameById(nextStep);
        //check if start was pointing to this step and redraw it. 
        var start_id = $(Workflow.xml).find('StartingStepId').text();
        if (Workflow.getStepNameById(start_id) === name) {
            $(Workflow.xml).find('WorkflowDTO').find('StartingStepId').text(Workflow.getStepIdByName(nextStepName));
            Workflow.redrawStep('Start');
        }
        // Remove all connections and endpoints for deleted step        
        Workflow.jsp.removeAllEndpoints(step_el);
        // Remove deleted step from UI
        $(Workflow.getStepByName(name)).remove();
        // Remove deleted step from xml
        $(tmpStep).remove();
        var redrawSteps = $(Workflow.xml).find('WFBranchDTO').filter(function () {
            return currStepId === $(this).find('DestinationStepId').text();
        }).parent().parent();
        $(Workflow.xml).find('WFBranchDTO').filter(function () {
            return currStepId === $(this).find('> DestinationStepId').text();
        }).find('> DestinationStepId').text(nextStep);
        //redraw all steps that were pointing to the deleted step.
        $.map(redrawSteps, function (v) {
            Workflow.redrawStep($(v).find('>Name').text());
        });
    },
    deleteWorkflow: function () {
        var delname = $('#delete_form select[name="process_replacement"]').val();
        var data = {};
        var replaceId = $('#delete_form select[name="process_replacement"]').val();
        if (!replaceId || delname === 'deleteprocess') {
            replaceId = Constants.c.emptyGuid;
        }
        var id = $('#wf_name').val();
        data = { workflowId: id, replacementWorkflowId: replaceId };
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/Delete', {
            async: false,
            data: data,
            success: function (resp) {
                // resp is returned xml, get the root and find the status returned
                if (resp.status === 'ok') {
                    $("#" + Constants.c.ok).attr("disabled", "disabled");
                    window.location.hash = replaceId;
                    Workflow.updateSlimWorkflows(false, id);
                    window.location.reload();
                }
                else {
                    var msg = resp.message;
                    ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            },
            complete: function () {
                Workflow.toggleHeaderActions(false);
            }
        });
    },
    toggleHeaderActions: function (disable) {
        $('#header input[type="button"], #header select').prop('disabled', disable);  // Enable/Disable buttons and select list
    },
    disableSaveDeleteButtons: function (id) {
        var effPerms = parseInt($('#wf_name').find(':selected').attr('eff-perm'), 10);
        var canModify = Utility.checkSP(effPerms, Constants.sp.Modify);
        var canDelete = Utility.checkSP(effPerms, Constants.sp.Delete);
        if (!canModify) {
            //disable the save and save as buttons
            $('#section input[name="Save"]').attr('disabled', 'disabled').attr('title', Constants.c.noModify);
            $('#section input[name="SaveAs"]').attr('disabled', 'disabled').attr('title', Constants.c.noModify);
            $('#edit_process').attr('disabled', 'disabled').attr('title', Constants.c.noModify);

        } else {
            //enabled the save button
            $('#section input[name="Save"]').removeAttr('disabled').removeAttr('title');
            $('#section input[name="SaveAs"]').removeAttr('disabled').removeAttr('title');
            $('#edit_process').removeAttr('disabled').removeAttr('title');
        }
        if (!canDelete) {
            //disable delete button
            $('#section input[name="Delete"]').attr('disabled', 'disabled').attr('title', Constants.c.noDelete);
        } else {
            //enable delete button
            $('#section input[name="Delete"]').removeAttr('disabled').removeAttr('title');
        }
    },
    fetchAllData: function () {
        var data = {};
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/GetData' + Workflow.getCacheBusterStr(), {
            async: false,
            type: 'get',
            success: function (res, status) {
                if (res.status === 'ok') {
                    data = res.result;
                } else {
                    ErrorHandler.addErrors(res.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
        return data;
    },
    fetchNewStep: function () {
        var tmp = '';
        id = Workflow.id;
        var data = { 'workflowId': id };
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/NewStep', {
            async: false,
            data: data,
            success: function (resp) {
                if (resp.status === 'ok') {
                    tmp = $.parseXML(resp.result);
                } else {
                    var msg = resp.message;
                    ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
        return tmp;
    },
    fetchNewAction: function () {
        var tmp = '';
        var sequence = Workflow.determineSequence($('#step_actions li'));
        var data = { 'stepId': Workflow.currentStepId, 'sequence': sequence };
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/NewAction', {
            async: false,
            data: data,
            success: function (resp) {
                if (resp.status === 'ok') {
                    tmp = $($.parseXML(resp.result)).find('Action');
                } else {
                    var msg = resp.message;
                    ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
        return tmp;
    },
    deleteActionLibrary: function (libId) {
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/DeleteActionLibraryItem', {
            data: { actionId: libId },
            type: 'post',
            success: function (resp) {
                if (resp.status === 'ok') {
                    var item = _.find(window.allData.ActionLibrary, function (ali) { return ali.Id === libId; });
                    var idx = _.indexOf(window.allData.ActionLibrary, item);
                    if (idx !== -1) {
                        window.allData.ActionLibrary.splice(idx, 1);
                    }
                    ActionEditor.fillActionLibrary();
                } else {
                    ErrorHandler.addErrors(resp.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            },
            complete: function () {
                $('#addTo_action_lib').removeClass('disabled');
            }
        });
    },
    fetchActionLibItem: function (libId) {
        var tmp = '';
        var sequence = Workflow.determineSequence($('#step_actions li'));
        var data = { 'actionLibId': libId, 'stepId': Workflow.currentStepId, 'sequence': sequence };
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/NewActionFromLibrary', {
            async: false,
            data: data,
            success: function (resp) {
                if (resp.status === 'ok') {
                    tmp = $($.parseXML(resp.result)).find('Action');
                } else {
                    var msg = resp.message;
                    ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
        return tmp;
    },
    fetchExistingActionLibItem: function (libId) {
        var tmp = '';
        var data = { 'actionLibId': libId, 'stepId': Constants.c.emptyGuid, 'sequence': 0 };
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/EditActionFromLibrary', {
            async: false,
            data: data,
            success: function (resp) {
                if (resp.status === 'ok') {
                    tmp = $($.parseXML(resp.result)).find('Action');
                } else {
                    var msg = resp.message;
                    ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
        return tmp;
    },
    fetchNewTask: function (taskClassName, actionId) {
        var tmp = '';
        var sequence = Workflow.determineSequence($('#action_tasks li'));
        // Get current action id
        actionId = actionId || ActionEditor.currentActionId;
        var data = { 'actionId': actionId, 'taskClass': taskClassName, 'sequence': sequence };
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/NewTask', {
            async: false,
            data: data,
            success: function (resp) {
                if (resp.status === 'ok') {
                    tmp = $.parseXML(resp.result);
                } else {
                    var msg = resp.message;
                    ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
        return tmp;
    },
    fetchNewBranch: function (currentStepId, nextStepId) {
        var tmp = '';
        var seq = Workflow.determineSequence($('#step_branches li'));
        var post = {
            sourceStep: currentStepId,
            destinationStep: nextStepId,
            sequence: seq
        };
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/NewBranch', {
            async: false,
            data: post,
            success: function (resp) {
                if (resp.status === 'ok') {
                    tmp = $.parseXML(resp.result);
                } else {
                    var msg = resp.message;
                    ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
        return tmp;
    },
    fetchWorkflow: function () {
        $('#edit_process').show();
        Workflow.isNew = Workflow.id === Constants.c.emptyGuid;
        Workflow.proxy.getXmlById(Workflow.id, Workflow.continueLoadingName, function (qxhr, textStatus, error) { ErrorHandler.addErrors(error.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, ''); }, null);
    },
    //TODO this doesn't seem to be called at all.  Does any server-side validation occur when editing tasks?  Should it?  
    validateTask: function (taskXML) {  // returns true if valid; returns false and displays problem if not
        var tmp = true;
        var post = {
            taskXML: taskXML
        };
        $.ajax(Constants.Url_Base + 'WorkflowDesigner/ValidateTask', { // This method does not exist.
            async: false,
            data: post,
            success: function (resp) {
                // TODO ValidateTask can run successfully and return a non-empty string, which needs to be displayed as a validation error.
                // it could also, potentially, return an error message, such as due to a comm. failure
                if ($(resp).find('root').attr('Status') === 'ok') {
                    if (resp !== '') {
                        alert(resp); // TODO this is ugly -- or it would be if it were ever called.
                        tmp = false;
                    }
                } else {
                    var msg = $(resp).find('root').attr('Message');
                    ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
        return tmp;
    },
    flipKV: function (obj) {
        var x;
        var tmp = {};
        for (x in obj) {
            if (obj.hasOwnProperty(x)) {
                tmp[obj[x]] = x;
            }
        }
        return tmp;
    },
    getCacheBusterStr: function () {
        return Utility.getCacheBusterStr();
    },
    getNewName: function () {
        var i = 1;
        var name = Constants.t('step');
        while (!Workflow.isValidStepName(name)) {
            name = Constants.t('step') + ' ' + (++i);
        }
        return name;
    },
    getNewProcessName: function () {
        var name = $('#process_editor input[name="Name"]').val(), i = 0;
        if (!name) {
            name = 'New';
        }
        while (!Workflow.isValidProcessName(name)) {
            name = 'New ' + (++i);
        }
        return name;
    },
    getOnScreenSteps: function (currStep) {
        var steps = $('.window div strong');
        var tmp = [];
        $.map(steps, function (value) {
            value = $(value).text();
            tmp.push(value);
        });
        return tmp;
    },
    getUniqueWorkflowName: function () {
        var names = {};
        $.map(window.allData.Workflows, function (value, key) {
            names[value.Name] = true;
        });
        var i;
        var tmp = Constants.c.workflow + ' ' + 1;
        for (i = 2; names[tmp]; i++) {
            tmp = Constants.c.workflow + ' ' + i;
        }
        return tmp;
    },
    //Collections must be unique for backbone users
    //Hacked in since our views may get altered.  
    uniqueUsers: function (userArr) {
        var len = userArr.length, i = 0, uObj = {}, uArr = [];
        for (i; i < len; i++) {
            var tmp = userArr[i];
            if (uObj[tmp.Username] === undefined) {
                uArr.push(tmp);
                uObj[tmp.Username] = 1;
            }
        }
        return uArr;
    },
    getUsers: function (excludeFlagArray) {
        if (!excludeFlagArray) {
            excludeFlagArray = [Constants.uf.SuperAdmin, Constants.uf.BuiltIn, Constants.uf.Proxy];
        }
        return Utility.getUsers(excludeFlagArray, new Users(Workflow.uniqueUsers(window.allData.Users)), true);
    },
    getGroups: function () {
        var g = [];
        $.map(window.allData.Roles, function (value, i) {
            g.push({ id: i, name: value });

        });
        return g;
    },
    fillUserGroupSelect: function (el) {
        // Fills a passed in select with users and groups
        var groups = Workflow.getGroups();
        var users = Workflow.getUsers([Constants.uf.Proxy]);
        var usersgroup = $('<optgroup class="og_users" label="' + Constants.c.users + '"></optgroup>');
        var groupsgroup = $('<optgroup class="og_groups" label="' + Constants.c.groups + '"></optgroup>');
        // Append a blank selection (no selection) to the top of the select
        $(el).append($('<option/>').val('').text(''));
        if (groups.length > 0) {
            $.map(groups, function (g) { $(groupsgroup).append($('<option/>').val(g.id).text(g.name)); });
            $(el).append(groupsgroup);
        }
        $.map(users, function (u) { $(usersgroup).append($('<option/>').val(u.id).text(u.name)); });
        $(el).append(usersgroup);
    },
    fillStartingStepSelect: function (el) {
        $(el).empty();
        var steps = $(Workflow.xml).find('WFStepDTO');
        var destId = $(Workflow.xml).find('StartingStepId').text();
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
            el.append($('<option></option>').val(stepId).text(stepName).attr('title', stepName));
        });
        // If there is no destination step id make the end step selected (end is the destination).
        if (!destId || destId === Constants.c.emptyGuid) {
            el.find('option[value="' + Constants.c.emptyGuid + '"]').attr('selected', 'selected');
        }
        else {
            el.find('option[value="' + destId + '"]').attr('selected', 'selected');
            el.val(destId);
        }
    },
    getName: function () {
        return $(Workflow.xml).find('WorkflowDTO > Name').text();
    },
    getOnScreenRealSteps: function () {
        var steps = $('.window div strong');
        var tmp = [];
        $.map(steps, function (value) {
            value = $(value).text();
            if (value !== 'Start' && value !== 'End') {
                tmp.push(value);
            }
        });
        return tmp;
    },
    getStepNameById: function (id) {
        return $(Workflow.xml).find('WFStepDTO').filter(function (index) { return $(this).find('> Id').text() === id; }).find('> Name').text();
    },
    getStepIdByName: function (name) {
        return $(Workflow.xml).find('WFStepDTO').filter(function (index) { return $(this).find('> Name').text() === name; }).find('> Id').text();
    },
    getStepByName: function (name) {
        var steps = $('.window div strong');
        var i = 0, len = steps.length;
        for (i; i < len; i++) {
            if ($(steps[i]).text() === name) {
                return $(steps[i]).parents('.window');
            }
        }
        return false;
    },
    getStepPosition: function (step) {
        var dtext = $(step).find('> DesignerData').text();
        var data = false;
        if (dtext && dtext.length > 0 && dtext.charAt(0) === '{') {
            data = Workflow.getDesignerDataObject(dtext);
        }
        if (!data || !data.top || !data.left) {
            var count = Workflow.auto_loaded_count;
            //determin row;
            var row = Math.floor(count / Workflow.numPerRow);
            //determin column
            var column = count % Workflow.numPerRow;
            return { top: (Workflow.rheight * row) + 'px', left: (Workflow.cwidth * column) + 'px' };
        }
        return data;
    },
    getDesignerDataObject: function (str) {
        if (str.substr(0, 1) !== '{') {
            return {};
        }
        try {
            return JSON.parse(str);
        } catch (e) {
            return {};
        }
    },
    getStepName: function (step) {
        $(step).find('div strong').text();
    },
    isDocumentWorkflow: function () {
        return $(Workflow.xml).find('Process').attr('UnitType') === '0';
    },
    isValidProcessName: function (name) {
        var valid = true;
        name = name.toLowerCase();
        $.map(window.allData.Workflows, function (item) {
            if (item.Name.toLowerCase() === name) {
                valid = false;
            }
        });
        return valid;
    },
    isValidStepName: function (name, oldname) {
        if (name === oldname) {
            return true;
        }
        if (!$.trim(name) || $.trim(name).length === 0) {
            return false;
        }
        var steps = Workflow.getOnScreenSteps();
        return $.inArray(name, steps) === -1;
    },
    loadNames: function (names, selectedId) {
        if (!selectedId) {
            selectedId = Constants.c.emptyGuid;
        }
        if (names) {
            $('#wf_name').empty();
            $.map(names, function (value, key) {
                if (value.Id === selectedId) {
                    $('#wf_name').append('<option selected="selected" value="' + value.Id + '" eff-perm="' + value.EffectivePermissions + '">' + value.Name + '</option>');
                }
                else {
                    $('#wf_name').append('<option value="' + value.Id + '" eff-perm="' + value.EffectivePermissions + '">' + value.Name + '</option>');
                }
            });
        }
    },
    loadName: function (wfXml) {
        Workflow.id = $('#wf_name').val();
        //check for uncommited changes
        if (Workflow.uncommitted_changes) {
            $('#save_changes').dialog('open');
        } else {
            Workflow.jsp = jsPlumb.getInstance();
            Workflow.hash = {};
            Workflow.jsp.Defaults.Container = $('#main_panel');
            //fetch the xml and load it.  
            Workflow.jsp.Defaults.DragOptions = { cursor: 'pointer', zIndex: 2000 };
            Workflow.resetRenderMode(Workflow.jsp.SVG);
            //Workflow.jsp.setMouseEventsEnabled(true);
            $('#main_panel').children('*').remove();
            Workflow.auto_loaded_count = 0;
            if (!wfXml) {
                try {
                    Workflow.fetchWorkflow(Workflow.id);
                    return;
                } catch (e) {
                    $('#logout_error').text(Constants.c.openWfError);
                    $('#logout').dialog('open');
                }
            }
            Workflow.xml = wfXml;
            Workflow.id = $(wfXml).find('WorkflowDTO > Id').text();
            Workflow.loadWF(wfXml);
            window.location.hash = Workflow.id;
            Workflow.toggleHeaderActions(false);
            Workflow.disableSaveDeleteButtons(Workflow.id);
            Workflow.setArgumentLibrary();
        }
    },
    continueLoadingName: function (result) {
        Workflow.xml = $.parseXML(result);
        var branches = $(Workflow.xml).find('WFBranchDTO');
        // There are no branches and there should be at least one branch going to end
        if (!Workflow.advancedWf && (!branches || branches.length <= 0)) {  // The workflow is a simple workflow and it has now branches
            // Append the new branch to the Workflow.xml
            // User needs to explicitly save for this change to occur
            Workflow.addNewBranch($(Workflow.xml).find('WFStepDTO:last'), 'End', true);
        }
        Workflow.loadWF(Workflow.xml);
        window.location.hash = Workflow.id;
        Workflow.disableSaveDeleteButtons(Workflow.id);
        Workflow.setArgumentLibrary();
        Workflow.id = $(Workflow.xml).find('WorkflowDTO > Id').text();
    },
    addArgumentsToArgumentLibrary: function (node) {
        if ($(node).text()) {
            var args = JSON.parse($(node).text());
            $.map(args, function (arg) {
                if (!arg.startsWith('$') && !arg.startsWith('\'') && !arg.startsWith('"')) {
                    //For the purposes of the argument library all Parameters are type Boolean so they are eligible for branch conditions.
                    if (window.argumentLibrary[arg]) {
                        window.argumentLibrary[arg].Count += 1;
                    }
                    else {
                        window.argumentLibrary[arg] = { Name: arg, PropertyType: 3, ReadOnly: false, Count: 1 };
                    }
                }
            });
        }
    },
    setArgumentLibrary: function () {
        window.argumentLibrary = {};
        window.argumentLibrary = $.extend(true, {}, window.allData.BuiltInArgs);
        var outArgNamesFound = false;
        $.map($(Workflow.xml).find('OutArgNames'), function (node) {
            outArgNamesFound = true;
            Workflow.addArgumentsToArgumentLibrary(node);
        });
        if (!outArgNamesFound) {
            Workflow.setActionArgumentLibrary();
        }
    },
    // setActionArgumentLibrary: Set the argument library by finding out arg names in the current action xml
    setActionArgumentLibrary: function () {
        window.argumentLibrary = {};
        window.argumentLibrary = $.extend(true, {}, window.allData.BuiltInArgs);
        $.map($(ActionEditor.currentActionXMLClone).find('OutArgNames'), function (node) {
            Workflow.addArgumentsToArgumentLibrary(node);
        });
    },
    loadSteps: function (steps) {
        var len = steps.length;
        var i = 0;
        for (i; i < len; i++) {
            var s = steps[i];
            var pos = Workflow.getStepPosition(s);
            var name = $(s).find(' > Name').text();
            var id = 'wfs_' + (Workflow.auto_loaded_count++);
            Workflow.addStepToPanel(name, id, pos, true, 'Edit Step');
        }
    },
    loadVirtualStep: function (name, options, bind_editor) {
        var pos = {};
        if (!options) {
            pos = Workflow.getStepPosition();
        } else {
            pos = options;
        }
        var id = 'wfs_' + Workflow.auto_loaded_count++;
        //connectors are stored by Step Name
        Workflow.connectors[name] = [];
        return Workflow.addStepToPanel(name, id, pos, bind_editor, Constants.c.editWorkflow);
    },
    checkAdvancedWF: function (xml) {
        if (!Workflow.advancedWf) {
            var flags = $(xml).find('WorkflowDTO > AdvancedWFFlags').text();
            if (flags !== "Simple") {
                flags = flags.split(' | ');
                var length = flags.length;
                $('#advancedWFDetected ul').empty();
                var i;
                for (i = 1; i < length; i++) {
                    $('#advancedWFDetected ul').append($("<li></li>").text(flags[i]));
                }
                $('#advancedWFDetected').dialog('open');
            }
        }

    },
    loadWF: function (xml) {
        Workflow.checkAdvancedWF(xml);
        var defaults = Workflow.getDesignerDataObject($(xml).find('WorkflowDTO > DesignerData').text());
        defaults = defaults || Workflow.wf_default;
        var steps = $(xml).find('WFStepDTO');
        //set size/background
        $('#main_panel').css({ 'height': defaults.height, 'width': defaults.width });
        $('#main_panel').addClass('dotted');
        //load Start they only exist in concept.
        var options = false;
        if (defaults.start_pos) {
            options = defaults.start_pos;
        }
        var start = Workflow.loadVirtualStep('Start', options, true); //TODO get options for position top and left
        //add behavior class to trigger the process editor when editing the start node.  
        $(start).find('.editlink').addClass('process');
        //draw each node
        Workflow.loadSteps(steps);
        options = false;
        if (defaults.end_pos) {
            options = defaults.end_pos;
        }
        //load End they only exist in concept
        var end = Workflow.loadVirtualStep('End', options); //TODO get options for position top and left
        end.css('background-color', '#ff3333');
        start.css('background-color', '#00cc11');
        Workflow.makeVirtualShape(end);
        Workflow.makeVirtualShape(start);
        //go back through and add all connectors.  
        Workflow.redrawStep('Start');
        //Added setSuspendDrawing as recommended in jsPlumb documentation.
        Workflow.jsp.setSuspendDrawing(true);
        Workflow.loadBranches(steps);
        Workflow.jsp.setSuspendDrawing(false, true);
        //add edit click binding (only do this once)
        if (!Workflow.delegates) {
            Worflow.loadDelegates();
            Workflow.delegates = true;
        }
    },
    loadBranches: function (steps) {
        $.map(steps, function (n) {
            //get branches
            var branches = $(n).find('WFBranchDTO');
            var name = $(n).find(' > Name').text();
            if (!Workflow.connectors[name]) {
                Workflow.connectors[name] = [];
            }
            $.map(branches, function (b) {
                var nextStep = Workflow.getStepNameById($(b).find('DestinationStepId').text());
                if (nextStep === '') {
                    nextStep = 'End';
                }
                var designerData = {};
                var designerStr = $(b).find('DesignerData').text();
                if (designerStr) {
                    designerData = JSON.parse(designerStr);
                }
                designerData.Label = $(b).find('Label').text();
                Workflow.addConnectorToPanel(name, nextStep, designerData);
            });
        });
    },
    mapAttributes: function (data, xmlElem) {
        $.map(data, function (value) {
            var selector = ' > ' + $(value).attr('name');
            if ($(value).attr('name') === 'TriggerMode') {
                if ($(value).prop('checked')) {
                    $(xmlElem).find(selector).text($(value).attr('class'));
                }
            }
            else {
                var val = $(value).val();
                $(xmlElem).find(selector).text(val);
            }
        });
        return xmlElem;
    },
    makeVirtualShape: function (sdiv) {
        $(sdiv).css('border-radius', '28px').css('text-align', 'center');
        $(sdiv).css('height', '45px');

    },
    openSaveAs: function () {
        var name = Workflow.getNewProcessName();
        Workflow.toggleHeaderActions(true);
        $('#saveas .new_name').val(name);
        $('#saveas').dialog('open');
        $('#saveas .new_name').focus().select();
    },
    redrawStep: function (name) {
        if (name === "") {
            return;
        }
        //clear connectors
        if (name instanceof Array) {
            $.map(name, function (item) {
                Workflow.redrawStep(item);
            });
            return;
        }
        var start = Workflow.getStepByName(name);
        var id = $(start).attr('id');
        // only if you want to hose everything do this -> jsPlumb.detachAllConnections(id);
        var c = Workflow.jsp.getConnections({ source: id });
        $.map(c, function (item) {
            //remove the source endpoint which will in turn remove the connection.
            var ep = item.endpoints[0];
            Workflow.jsp.deleteEndpoint(ep);
        });
        if (name === 'Start') {
            //get first step id
            var first_id = $(Workflow.xml).find('StartingStepId').text();
            //get first step name
            var first_name = $(Workflow.xml).find('WFStepDTO > Id').filter(function (index) { return $(this).text() === first_id; }).parent().find('> Name').text();
            //draw connector
            Workflow.addConnectorToPanel(Constants.c.start, first_name, { Label: Constants.c.start, LineType: 'Straight' });
        } else {
            //load branches for that step
            var one_step = $(Workflow.xml).find('WFStepDTO').filter(function (index) { return $(this).find('>Name').text() === name; });
            Workflow.loadBranches(one_step);
        }
    },
    renameStep: function (orig, dest) {
        //        //check process
        //        if ($(Workflow.xml).find('Process').attr('FirstStep') === orig) {
        //            $(Workflow.xml).find('Process').attr('FirstStep', dest)
        //        }
        //        //check all branches
        //        $.map($(Workflow.currentStepXMLClone).find('WFBranchDTO'), function (value) {
        //            if ($(value).attr('NextStep') === orig) {
        //                $(value).attr('NextStep', dest)
        //            }
        //        });
        // Rename the step in UI
        var step = Workflow.getStepByName(orig);
        $(step).find('div > strong').text(dest);
        // Rename the step in XML
        Workflow.currentStepXMLClone.find('> Name').text(dest);
        delete (Workflow.hash[orig]);
        Workflow.hash[dest] = $(step).attr('id');
    },
    resetRenderMode: function (desiredMode) {
        Workflow.jsp.setRenderMode(desiredMode);
    },
    advancedWFDialog: function () {
        $('#advancedWFDetected').dialog({
            title: Constants.c.advancedWfRequired,
            width: 'auto',
            modal: true,
            autoOpen: false
        });
    },
    deleteDialog: function () {
        $('#delete_form').dialog({
            width: 400,
            minWidth: 400,
            minHeight: 150,
            modal: true,
            autoOpen: false,
            close: function () {
                Workflow.toggleHeaderActions(false);
            },
            buttons: [{
                text: Constants.c.ok,
                id: Constants.c.ok,
                click: function () {
                    $("#" + Constants.c.ok).attr("disabled", "disabled");
                    Workflow.deleteWorkflow();
                    $('#delete_form').dialog('close');
                }
            },
                {
                    text: Constants.c.cancel,
                    id: Constants.c.cancel,
                    click: function () {
                        $("#" + Constants.c.ok).removeAttr("disabled");
                        $('#delete_form').dialog('close');
                    }
                }]
        });
    },
    saveAsDialog: function () {
        $('#saveas').dialog({
            width: 400,
            minWidth: 400,
            minHeight: 150,
            modal: true,
            autoOpen: false,
            resizable: false,
            open: function () {
                $('#saveas .error').removeClass('error');
                $('#saveas .errors').html('');
            },
            close: function () {
                $('#saveas .throbber').hide();
                Workflow.toggleHeaderActions(false);
            },
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    var value = $.trim($('#saveas input[type="text"]').val());
                    if ($('#saveas .errors').children().length === 0) {
                        $(Workflow.xml).find('WorkflowDTO > Name').text(value);
                        $('#saveas .throbber').show();
                        Workflow.saveWorkflowAs();
                        $('#saveas').dialog('close');
                    }
                }
            },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        $('#saveas').dialog('close');
                    }
                }]
        });
    },
    warningsDialog: function (callback) {
        $('#wfWarnings').dialog({
            width: 'auto',
            minWidth: 400,
            maxWidth: 750,
            minHeight: 150,
            modal: false,
            resizable: false,
            buttons: [{
                text: Constants.c.save,
                click: function () {
                    $('#wfWarnings').dialog('close');
                    Workflow.toggleHeaderActions(true);
                    if (callback) {
                        callback();
                        Workflow.toggleHeaderActions(false);
                    }
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    Workflow.toggleHeaderActions(false);
                    $('#wfWarnings').dialog('close');
                }
            }]
        });
    },
    saveFailureDialog: function () {
        $('#saveFailure').dialog({
            width: 'auto',
            minWidth: 600,
            minHeight: 150,
            modal: true,
            autoOpen: false,
            close: function () {
                Workflow.toggleHeaderActions(false);
            },
            buttons: [{
                text: Constants.c.saveAs,
                click: function () {
                    $('#saveFailure').dialog('close');
                    Workflow.openSaveAs();
                }
            }, {
                text: Constants.c.returnToWf,
                click: function () {
                    $('#saveFailure').dialog('close');
                }
            }, {
                text: Constants.c.abandonChanges,
                click: function () {
                    window.location.reload();
                }
            }]
        });
    },
    saveChangesDialog: function () {
        $('#save_changes').dialog({
            width: 'auto',
            modal: true,
            autoOpen: false,
            resizable: false,
            close: function () {
                Workflow.toggleHeaderActions(false);
            },
            buttons: {
                'Save': function () {
                    if (Workflow.saveWorkflow()) {
                        if (Workflow.logoff === true) {
                            Workflow.logoff = false;
                            $('input[name="Logout"]').trigger('click');
                        }
                        else {
                            Workflow.loadName();
                        }
                    }
                    $(this).dialog('close');
                },
                'Discard': function () {
                    Workflow.workflowChangesCommitted();
                    if (Workflow.logoff === true) {
                        Workflow.logoff = false;
                        $('input[name="Logout"]').trigger('click');
                    }
                    else {
                        Workflow.loadName();
                    }
                    $(this).dialog('close');
                }
            }
        });
    },
    sendToLoginDialog: function () {
        $('#logout').dialog({
            width: 'auto',
            modal: true,
            autoOpen: false,
            resizable: false,
            buttons: {
                'Ok': function () {
                    $('#logout').dialog('close'); // window.location.reload()
                }
            }
        });
    },
    saveStepDesignerData: function (name, step) {
        var designerData = $(Workflow.xml).find('WFStepDTO').filter(function () { return name === $(this).find('>Name').text(); }).find('> DesignerData');
        var ddata = Workflow.getDesignerDataObject($(designerData).text());
        ddata.top = $(step).css('top');
        ddata.left = $(step).css('left');
        $(designerData).text($.toJSON(ddata));
    },
    saveToDom: function () {
        $('#input[name="Save"], #input[name="SaveAs"]').attr('disable', 'disable');
        var steps = Workflow.getOnScreenRealSteps();
        //loop through each step and update DesignerData
        $.map(steps, function (value) {
            Workflow.saveStepDesignerData(value, Workflow.getStepByName(value));
        });
        //save the start and end coordinates in the Process > DesignerData tag
        var start = Workflow.getStepByName('Start');
        var end = Workflow.getStepByName('End');
        var ddstart = { top: $(start).css('top'), left: $(start).css('left') };
        var ddend = { top: $(end).css('top'), left: $(end).css('left') };
        var designerData = $(Workflow.xml).find('WorkflowDTO > DesignerData');
        var obj = Workflow.getDesignerDataObject($(designerData).text());
        obj.start_pos = ddstart;
        obj.end_pos = ddend;
        $(designerData).text($.toJSON(obj));
    },
    saveWorkflow: function () {
        var id = $('#wf_name').val();
        Workflow.toggleHeaderActions(true);
        if (id === Constants.c.emptyGuid) {
            Workflow.openSaveAs();
            return;
        }
        Workflow.saveWF(false);
    },
    removeNil: function (xml, alwaysRemoveNil) {
        $.map($(xml).find('*'), function (item) {
            var inil = $(item).attr('i:nil');
            var txt = $(item).text();
            if (alwaysRemoveNil) {
                $(item).removeAttr('i:nil');
            }
            else {
                if (inil === "true" && txt !== '' && txt !== Constants.c.emptyGuid) {
                    $(item).removeAttr('i:nil');
                }
                if (txt === '' || txt === Constants.c.emptyGuid) {
                    $(item).text('');
                    $(item).attr('i:nil', 'true');
                }
            }
        });
    },
    saveWF: function (isSaveAs, overrideValidate) {
        // overrideValidate: bool - optional, use to override the save validation for Parameter Warnings
        var that = this;
        // Doesn't pass validation, display warnings
        if (!overrideValidate && !Workflow.validateSave()) {
            var callback = function () {
                Workflow.saveWF(isSaveAs, true);
            };
            Workflow.warningsDialog(callback);
            return false;
        }
        Workflow.saveToDom();
        Workflow.removeNil(Workflow.xml);
        $('#saveas .errors').hide();
        //save xml to the server and reload the page
        //TODO Remove ROOT tag encapsulation and you will not need the following line. this is needed to work in ie10.  all other browsers accept sub root level namespaces.  
        //TODO If root tag is removed remove the replaces and fix the saveworkflow function to not strip off the root tag.  Attributes status and message will need to be added to 
        //TODO ticket number http://thedude.docstar.com/b/show_bug.cgi?id=2460
        var tmp_xml = Workflow.x2s(Workflow.xml).replace(/^<root/, '<root xmlns:i="http://www.w3.org/2001/XMLSchema-instance" ').replace(/xmlns:NS\d+="" +NS\d+:/g, '');
        var xml_data = { workflowXML: encodeURIComponent(tmp_xml) };
        var sf = function (result) {
            try {
                var resp = $.parseXML(result);
                var xml = resp;
                var selectedId = $('#wf_name').val();
                var effPerm = $(xml).find('WorkflowDTO > EffectivePermissions').text();
                var id = $(xml).find('WorkflowDTO > Id').text();
                var name = $(xml).find('WorkflowDTO > Name').text();
                var newWF;
                var idx;
                var workflow = _.find(window.allData.Workflows, function (wf) { return wf.Id === id; });
                if (selectedId === Constants.c.emptyGuid || isSaveAs || !workflow) {
                    newWF = { Id: id, Name: name, EffectivePermissions: effPerm };
                    idx = _.sortedIndex(window.allData.Workflows, newWF, function (wf) { return wf.Name.toLowerCase(); });
                    window.allData.Workflows.splice(idx, 0, newWF);
                }
                else {
                    workflow.Name = name;
                    workflow.EffectivePermissions = effPerm;
                }
                that.loadNames(window.allData.Workflows, id);
                that.workflowChangesCommitted();
                that.loadName(xml);
                Workflow.updateSlimWorkflows(true, id);
            } catch (e) {
                // Add local storage for xml that was created, but you were logged out during creation
                //TODO: scain add local storage usage for a user that gets logged off when trying to save
                //                    if ("localStorage" in window && window["localStorage"] != null) {
                //                        // Local storage supported
                //                        localStorage.setItem("tempWfXML", JSON.stringify({ time: new Date(), xml: Workflow.x2s(Workflow.xml) }));
                //                    }
                var func = function () {
                    $('#saveFailure .errors').text(e.message);
                    $('#saveFailure').dialog('open');
                };
                setTimeout(func, 1000);
            }
        };
        var ff = function (jqxhr, textStatus, messageObj) {
            var func = function () {
                $('#saveFailure .errors').text(messageObj.Message);
                $('#saveFailure').dialog('open');
            };
            setTimeout(func, 1000);
        };
        if (isSaveAs || Workflow.isNew) {
            Workflow.proxy.saveAsWorkflowXml(xml_data, sf, ff);
            Workflow.isNew = false;
        } else {
            Workflow.proxy.saveWorkflowXml(xml_data, sf, ff);
        }
        $('#input[name="Save"], #input[name="SaveAs"]').attr('disable', 'disable');
    },
    saveWorkflowAs: function () {
        Workflow.saveWF(true);
    },
    updateSlimWorkflows: function (isAdd, id) {
        // isAdd: whether it is an add or a remove

        // Attempt to update slimWorkflows
        try {
            // Make sure that slim workflows is up to date with created workflows in the designer!
            var windowOpener = window.opener;
            var parentWindow = window.parent;
            // If editing workflows in a separate window/tab (outside the admin tab)
            if (windowOpener && !$.isEmptyObject(windowOpener) && windowOpener.slimWorkflows) {
                Workflow.updateSlimWfs(windowOpener, isAdd, id);
            }
            else if (parentWindow && !$.isEmptyObject(parentWindow) && parentWindow !== window.self && parentWindow.slimWorkflows) {  // Editing workflows inline (inside the admin tab)
                Workflow.updateSlimWfs(parentWindow, isAdd, id);
            }
        } catch (e) {
            // The error from attempting to update workflows should not display an error to the user
            Utility.OutputToConsole(e.toString() + ' - ' + Constants.c.slimWorkflowUpdateError);
        }
    },
    updateSlimWfs: function (collectionWindow, isAdd, id) {
        var wfs = window.allData.Workflows;
        var wfsLength = wfs.length;
        var i;
        for (i = 0; i < wfsLength; i++) {
            var wf = wfs[i];
            if (wf.Id === id) {
                var alreadyIn = collectionWindow.slimWorkflows.get(wf.Id);   // If the collection already contains the workflow remove it, and re-add it as an update
                if (isAdd) {
                    if (wf.Id !== Constants.c.emptyGuid) {
                        if (alreadyIn) {
                            collectionWindow.slimWorkflows.remove(alreadyIn);
                        }
                        collectionWindow.slimWorkflows.add(wf);
                    }
                }
                else {
                    collectionWindow.slimWorkflows.remove(alreadyIn);
                }
                break;
            }
        }
        if (collectionWindow.WorkflowUtil && collectionWindow.WorkflowUtil.refreshView) {
            collectionWindow.WorkflowUtil.refreshView();    // If viewing a document in retrieve tab, refresh its data
        }
    },
    selectGenericMapper: function (el, data) {
        var x = {};
        for (x in data) {
            if (data.hasOwnProperty(x)) {
                $(el).append('<option value="' + x + '">' + data[x] + '</option>');
            }
        }
    },
    setHelpXmlPointers: function () {
        var tasks = $(Workflow.helpXml).find('task');
        var t_len = tasks.length;
        while (t_len--) {
            Workflow.helpXmlPointers[$(tasks[t_len]).attr('name')] = tasks[t_len];
        }
    },
    validateSaveAs: function () {
        var errors = [];
        $('#saveas .error').removeClass('error');
        $('#saveas .errors').html('');
        var good_name = true;
        //always loved cloak and dagger (still do 2011)
        var suspected_name = $('#saveas input[name="new_name"]').val();
        if (!suspected_name || $.trim(suspected_name).length === 0) {
            good_name = false;
            errors.push('Name cannot be blank');
        }
        if (good_name) {
            if (suspected_name.length > 256) {
                good_name = false;
                errors.push('Name too long');
            }
        }
        if (good_name) {
            $.map(window.allData.Workflows, function (item) {
                if ($.trim(item.Name).toLowerCase() === $.trim(suspected_name).toLowerCase()) {
                    good_name = false;
                    errors.push('Name already exists');
                }
            });
        }

        if (!good_name) {
            var list = $('<ul/>').addClass('error');
            $.map(errors, function (item) {
                $(list).append($('<li/>').text(item));
            });
            $('#saveas .errors').append(list).show();
        }

    },
    validateSave: function () {
        var warningSel = $('#wfWarnings .warnings');
        warningSel.html('');
        warningSel.off('click', 'span');
        warningSel.on('click', 'span', function (e) {
            var targ = $(e.currentTarget);
            var locs = targ.parent().find('.locations');
            if (locs.is(':visible')) {
                locs.hide();
            }
            else {
                locs.show();
            }
        });
        var warnings = Workflow.validateParameters();
        if (warnings.length > 0) {
            warningSel.append($('<div></div>').text(Constants.c.warningsMessage));
            var warningList = $('<ul></ul>').addClass('warning');
            $.map(warnings, function (item) {
                var msg = item.warningMessage;
                var locations = item.locations;
                var locLen = locations.length;
                var locMessage = Constants.c.paramLocationLink + ' [' + locLen + ']';
                var locContainer = ($('<ul></ul').addClass('locations').hide());
                var i;
                for (i = 0; i < locLen; i++) {
                    var location = locations[i];
                    var stepName = location.stepData.stepName;
                    var actionName = location.actionData.actionName;
                    var taskName = location.taskData.taskName;
                    var locText = Constants.c.paramLocation.replace('{0}', stepName).replace('{1}', actionName).replace('{2}', taskName);
                    locContainer.append($('<li></li>').text(locText).attr('title', locText));
                }
                $(warningList).append($('<li></li>').text(msg).append($('<span></span>').addClass('clickableLink').text(locMessage)).append(locContainer));
            });
            $('#wfWarnings .warnings').append(warningList);
            warningSel.append($('<div></div>').text(Constants.c.saveAnyway));
            return false;
        }
        return true;
    },
    sortBySequence: function (sequences) {
        var hash = {};
        var keys = [];
        var sorted = [];
        var i;
        // Sort by sequence value        
        $.map(sequences, function (value) {
            var sequence = $(value).find('> Sequence');
            var tmp = sequence.text();
            // If hash[tmp] already exists don't overwrite it, instead increment tmp until there is a free spot and insert the value there
            if (hash[tmp]) {
                var length = 0;
                _.each(hash, function (item) {
                    length++;
                });
                for (i = 0; i < length; i++) {
                    tmp++;
                    if (hash[tmp]) {
                        length++;
                    }
                    else {
                        break;
                    }
                }
            }
            hash[tmp] = value;
            keys.push(tmp);
        });
        var sortNumber = function (a, b) {
            return a - b;
        };
        keys.sort(sortNumber);
        $.map(keys, function (item) {
            sorted.push(hash[item]);
        });
        return sorted;
    },
    determineSequence: function (items) {
        var sequence = 0;
        var i = 0;
        var length = items.length;
        var itemSeq = parseInt($(items[i]).find('input[name="Sequence"]').val(), 10);
        var test_value = 0;
        for (i = 0; i < length; i++) {
            if (itemSeq) {
                test_value = itemSeq;
            }
            else {
                test_value = $(items[i]).index();
            }
            if (sequence < test_value) {
                sequence = test_value;
            }
        }
        sequence++;
        return sequence;
    },
    workflowChanged: function () {
        Workflow.uncommitted_changes = true;
        //set the wf name to italics
        $('#wf_name').css('font-style', 'italic');
        //set onpageunload
        $('body').off('click', 'a');
        $('body').on('click', 'a', function (e) {
            e.preventDefault();
        });
        $(window).bind('beforeunload', function () {
            if (window.self === window.top) {
                return Constants.c.unsavedChangesAlert;
            }
        });
        //if child window tell the parent not to leave this page
    },
    workflowChangesCommitted: function () {
        Workflow.uncommitted_changes = false;
        $('#wf_name').css('font-style', 'normal');
        $(window).unbind('beforeunload');
    },
    xFormat: function (xml) {
        var reg = /(>)(<)(\/*)/g;
        var wsexp = / *(.*) +\n/g;
        var contexp = /(<.+>)(.+\n)/g;
        xml = xml.replace(reg, '$1\n$2$3').replace(wsexp, '$1\n').replace(contexp, '$1\n$2');
        var formatted = '';
        var lines = xml.split('\n');
        var indent = 0;
        var lastType = 'other';
        // 4 types of tags - single, closing, opening, other (text, doctype, comment) - 4*4 = 16 transitions 
        var transitions = {
            'single->single': 0,
            'single->closing': -1,
            'single->opening': 0,
            'single->other': 0,
            'closing->single': 0,
            'closing->closing': -1,
            'closing->opening': 0,
            'closing->other': 0,
            'opening->single': 1,
            'opening->closing': 0,
            'opening->opening': 1,
            'opening->other': 1,
            'other->single': 0,
            'other->closing': -1,
            'other->opening': 0,
            'other->other': 0
        };
        var i = 0;
        var length = lines.length;
        for (i = 0; i < length; i++) {
            var ln = lines[i];
            var single = Boolean(ln.match(/<.+\/>/)); // is this line a single tag? ex. <br />
            var closing = Boolean(ln.match(/<\/.+>/)); // is this a closing tag? ex. </a>
            var opening = Boolean(ln.match(/<[^!].*>/)); // is this even a tag (that's not <!something>)
            var type = single ? 'single' : closing ? 'closing' : opening ? 'opening' : 'other';
            var fromTo = lastType + '->' + type;
            lastType = type;
            var padding = '';

            indent += transitions[fromTo];
            var j = 0;
            for (j = 0; j < indent; j++) {
                padding += '  ';
            }
            if (fromTo === 'opening->closing') {
                formatted = formatted.substr(0, formatted.length - 1) + ln + '\n'; // substr removes line break (\n) from prev loop
            }
            else {
                formatted += padding + ln + '\n';
            }
        }
        return formatted;
    },
    x2s: function (data) {
        return Workflow.xFormat($.trim(data.xml || (new XMLSerializer()).serializeToString(data)));
    },
    /*Identify parameters used as an Output but never as an Input and vice-versa.*/
    validateParameters: function () {
        var paramData = {};
        var param;
        // Find input and output parameters among all tasks
        var tasks = $(Workflow.xml).find('WFTaskDTO');
        var warnings = [];
        var i = 0;
        var taskLen = tasks.length;
        for (i; i < taskLen; i++) {
            var task = $(tasks[i]);
            var inArgs = task.find('InArgNames');
            var outArgs = task.find('OutArgNames');
            if (inArgs && inArgs.text()) {
                inArgs = JSON.parse(inArgs.text());
            }
            else {
                inArgs = '';
            }
            if (outArgs && outArgs.text()) {
                outArgs = JSON.parse(outArgs.text());
            }
            else {
                outArgs = '';
            }
            var taskId = task.find('> Id').text();
            var step = TaskEditor.getTasksStep(taskId);
            var action = TaskEditor.getTasksAction(taskId);
            var stepName = step.find('> Name').text();
            var actionName = action.find('Action > Name').text();
            var taskName = task.find('> TaskClassName').text();
            var location = {
                stepData: {
                    stepName: stepName,
                    step: step
                },
                actionData: {
                    actionName: actionName,
                    action: action
                },
                taskData: {
                    taskName: taskName,
                    task: task
                }
            };
            var params = Workflow.detectParameter(inArgs, 'input');
            params = params.concat(Workflow.detectParameter(outArgs, 'output'));
            for (param in params) {
                if (params.hasOwnProperty(param)) {
                    var tmpParam = params[param];
                    var paramVal = tmpParam.arg;
                    var paramType = tmpParam.type;
                    var msg = Constants.c[paramType + 'ParameterWarning'].replace('{0}', paramVal);
                    if (paramData[paramVal]) {
                        paramData[paramVal].locations.push(location);
                        if (paramType === 'input') {
                            paramData[paramVal].isInput = true;
                        }
                        if (paramType === 'output') {
                            paramData[paramVal].isOutput = true;
                        }
                    }
                    else {
                        paramData[paramVal] = {
                            locations: [location],
                            isInput: (paramType === 'input'),
                            isOutput: (paramType === 'output'),
                            warningMessage: msg
                        };
                    }
                }
            }
        }
        // now check all branch conditions; any parameter which appears in one is effectively used as an input.
        var branchConditions = $(Workflow.xml).find('WFBranchDTO Condition');
        i = 0;
        var length = branchConditions.length;
        for (i; i < length; i++) {
            var condition = $(branchConditions[i]);
            var conditionText = condition.text();
            if (conditionText && TaskEditor.isParam(conditionText) && paramData[conditionText]) {
                paramData[conditionText].isInput = true;
            }
        }

        var pData;
        for (pData in paramData) {
            if (paramData.hasOwnProperty(pData)) {
                if (!paramData[pData].isInput || !paramData[pData].isOutput) {
                    // Either not an input or not an output
                    warnings.push(paramData[pData]);
                }
            }
        }
        return warnings;
    },
    detectParameter: function (args, type) {
        // args: input/output arguments for a task
        // type: optional type of args passed in ('output', or 'input')
        var argLength = args.length;
        var argVals = [];
        var i;
        for (i = 0; i < argLength; i++) {
            var arg = args[i];
            if (arg) {
                var idxArg = TaskEditor.getIndexArg(arg);
                arg = arg.replace(idxArg, '');
                var transArg = window.argumentLibrary[arg];
                if (transArg) { // If it is in window.argumentLibrary
                    transArg = transArg.Name;
                }
                else {  // Not in library?  WTH, let's check in anyway
                    transArg = arg;
                }
                var isParam = TaskEditor.isParam(transArg);
                var isFieldExists = TaskEditor.isFieldExists(transArg);
                if (isParam) {
                    if (type) {
                        argVals.push({ arg: transArg, type: type });
                    }
                    else {
                        argVals.push(transArg);
                    }
                }
                else if (!isFieldExists) {
                    if (type) {
                        argVals.push({ arg: transArg, type: type });
                    }
                    else {
                        argVals.push(transArg);
                    }
                }
            }
        }
        return argVals;
    }
};
function e(str) {
    $('#dev').prepend('<div>' + new Date() + str + '</dev>');
}