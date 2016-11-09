/// <reference path="../Content/LibsExternal/a_jquery.js" />
/// <reference path="../Content/LibsInternal/ErrorHandler.js" />
/// <reference path="Workflow.js" />
var WorkflowEditor = {
    //all dom inserts only have to happen once. 
    hasShown: false,
    inboxSvc: null,
    customFieldSvc: CustomFieldProxy(),
    securitySvc: SecurityServiceProxy(),
    adminSvc : AdminServiceProxy(),
    init: function () {
        $('#process_editor').dialog({
            width: 600,
            minWidth: 600,
            modal: true,
            autoOpen: false,
            buttons: {
                'Ok': function () {
                    if (WorkflowEditor.validateExceptionAssignee()) {
                        WorkflowEditor.saveProcessDialog();
                        $(this).dialog('close');
                    }
                }
            }
        });
        $('#unittype_warning').dialog({
            width: 'auto',
            modal: true,
            autoOpen: false,
            resizable: false,
            buttons: {
                'Ok': function () {
                    $(this).dialog('close');
                }
            }
        });
        $('#process_editor select[name="UnitType"]').bind('change', function () {
            //warn the user this causes major changes to the workflow engine
            $('#unittype_warning').dialog('open');
        });
        $('#process_editor select[name="StartingStep"]').bind('change', function (e) {
            //get first step id
            var first_id = $(e.currentTarget).find(':selected').val();
            //get first step name            
            var first_name = 'Start';
            $(Workflow.xml).find("StartingStepId").text(first_id);
            var step = Workflow.getStepByName(first_name);
            var id = $(step).attr('id');
            var c = Workflow.jsp.getConnections({ source: id });
            $.map(c, function (item) {
                //remove the source endpoint which will in turn remove the connection.
                Workflow.jsp.deleteEndpoint(id, item.endpoints[0]);
            });
            var newStartStepName = $(e.currentTarget).find(':selected').text();
            //draw connector
            Workflow.addConnectorToPanel(Constants.c.start, newStartStepName, { Label: Constants.c.start, LineType: 'Straight' });
        });
    },
    showWorkflowEditor: function () {
        var process = $(Workflow.xml).find('WorkflowDTO');
        $('#process_editor').dialog('option', 'title', Constants.c.workflow + ': ' + $(process).find(' > Name').text());
        Workflow.workflowChanged();
        WorkflowEditor.setTriggerMode(process);
        $('#process_editor').dialog('open');
        if (!WorkflowEditor.hasShown) {
            //fill in the exceptions assignee
            Workflow.fillUserGroupSelect($('#process_editor select[name="ExceptionAssignee"]'));
            WorkflowEditor.hasShown = true;
        }
        //fill in security class
        var sc_select = $('#process_editor select[name="SecurityClassId"]');
        $(sc_select).html('');
        var sortSecClasses = _.map(window.allData.SecurityClasses, function (a, b) {
            return { id: b, value: a };
        });
        sortSecClasses.sort(function (a, b) {
            return a.value.toLowerCase() > b.value.toLowerCase() ? 1 : -1;
        });
        $.map(sortSecClasses, function (value, key) {
            $(sc_select).append($('<option/>').attr('value', value.id).text(value.value));
        });
        //fill in each field from the Workflow.has
        $('#process_editor input, #process_editor textarea, #process_editor select').each(function (index, value) {
            var tagname = $(value).attr('name');
            var selector = ' > ' + tagname;
            if ($(value).is('select')) {
                $(value).find('option[value="' + $(process).find(selector).text() + '"]').attr('selected', 'selected');
            } else {
                $(value).val($(process).find(selector).text());
            }
        });
        //fill in steps to choose for starting step
        // also select starting step that corresponds to the workflows starting step
        Workflow.fillStartingStepSelect($('#process_editor select[name="StartingStep"]'));
    },
    saveProcessDialog: function () {
        var process = $(Workflow.xml).find('WorkflowDTO');
        //save all selects and inputs based on name attribute
        var data = $('#process_editor select, #process_editor input, #process_editor textarea');
        Workflow.mapAttributes(data, process);
        //save DesignerData for the start node      
        Workflow.redrawStep('Start');
    },
    selectClass: function (el) {
        if (!WorkflowEditor.hasShown) {
            var classes = window.allData.Classes;
            $.map(classes, function (value, i) {
                $(el).append('<option value="' + value.id + '">' + value.name + '</option>');
            });
        }
    },
    selectDefaultPriority: function (el) {
        if (!WorkflowEditor.hasShown) {
            //needs to be flipped to match the standard.
            window.allData.Priorities = Workflow.flipKV(window.allData.Priorities);
            Workflow.selectGenericMapper(el, window.allData.Priorities);
        }
    },
    selectFirstStep: function (el) {
        $(el).html('');
        var steps = Workflow.getOnScreenRealSteps();
        $.map(steps, function (value) {
            $(el).append('<option value="' + value + '">' + value + '</option>');
        });
    },
    selectUnitType: function (el) {
        if (!WorkflowEditor.hasShown) {
            //needs to be flipped to match the standard
            window.allData.UnitTypes = Workflow.flipKV(window.allData.UnitTypes);
            Workflow.selectGenericMapper(el, window.allData.UnitTypes);
        }
    },
    selectExceptionAssignee_: function (el) {
        if (!WorkflowEditor.hasShown) {
            var groups = Workflow.getGroups();
            var users = Workflow.getUsers();
            var usersgroup = $('<optgroup label="Users"></optgroup>');
            var groupsgroup = $('<optgroup label="Groups"></optgroup>');
            $.map({ 'None': '0' }, function (value, key) {
                $(el).append($('<option/>').val(value).text(key));
            });
            if (groups.length > 0) {
                $.map(groups, function (g) { $(groupsgroup).append($('<option/>').val(g.id).text(g.name)); });
                $(el).append(groupsgroup);
            }
            $.map(users, function (u) { $(usersgroup).append($('<option/>').val(u.id).text(u.name)); });
            $(el).append(usersgroup);
        }
    },
    createContentType: function () {
        $('#simpleCreate').find('select[name="securityClass"]').parent().show();
        $('#simpleCreate').dialog({
            width: 400,
            minWidth: 400,
            title: Constants.c.contentType,
            open: function () {
                $(this).find('input[name="entityName"]').val("");
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            },
            modal: true,
            buttons: [{
                text: Constants.c.create,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var that = this;
                    var name = $(this).find('input[name="entityName"]').val();
                    var sc = $(this).find('select[name="securityClass"]').val();
                    if (WorkflowEditor.validateName(name, window.allData.ContentTypes)) {
                        $.ajax({
                            url: Constants.Url_Base + "ContentType/SimpleCreate",
                            data: JSON.stringify({ name: name, securityClassId: sc }),
                            type: "POST",
                            async: false,
                            contentType: "application/json",
                            success: function (result) {
                                if (result.status === 'ok') {
                                    window.allData.ContentTypes[result.result.Id] = result.result.Name;
                                    TaskEditor.setInandOutArguments();
                                    $(that).find('input[name="entityName"]').val('');
                                    WorkflowEditor.setupCreateDialogs();
                                    $(that).dialog('close');
                                } else {
                                    ErrorHandler.addErrors(result.message);
                                }
                            }
                        });
                    }
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
    },
    createCustomList: function () {
        $('#customListCreate').dialog({
            title: Constants.c.customList,
            width: 400,
            minWidth: 400,
            open: function () {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            },
            modal: true,
            buttons: [{
                text: Constants.c.create,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var that = this;
                    var name = $(this).find('input[name="entityName"]').val();
                    var readOnly = $(this).find('input[name="readOnly"]').is(':checked');
                    var listItems = $(this).find('textarea[name="items"]').val().split('\n');
                    if (WorkflowEditor.validateName(name, _.map(window.allData.CustomLists, function (e, key) { return e.Name; }))) {
                    
                        var sf = function (result) {
                            window.allData.CustomLists.push({ Id: Constants.c.newGuid, Name: name, EffectivePermissions: 2147483647 });
                            window.allData.CustomLists.sort(function (a, b) {
                                return a.Name.toLowerCase() > b.Name.toLowerCase() ? 1 : -1;
                            });
                            var listNames = [];
                            $.map(window.allData.CustomLists, function (list) {
                                listNames.push(list.Name);
                            });
                            $(document).find('input[name="ListName"]').autocomplete({
                                source: listNames,
                                open: function (event, ui) {
                                    $('.ui-autocomplete').scrollTop(0);
                                }
                            });
                            $(that).find('input[name="entityName"]').val('');
                            $(that).find('textarea[name="items"]').val('');
                            WorkflowEditor.setupCreateDialogs();
                            $(that).dialog('close');
                        };
                        ff = function (xhr, status, error) {
                            ErrorHandler.popUpMessage(error);
                        };
                        var customListItem={ Name: name, ReadOnly: readOnly, Items: listItems, Id: Constants.c.newGuid };
                        WorkflowEditor.adminSvc.setCustomList(customListItem, sf, ff);
                    }
                }
            },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        $(this).find('input[name="entityName"]').val('');
                        $(this).find('textarea[name="items"]').val('');
                        $(this).dialog('close');
                    }
                }]
        });
    },
    createCustomField: function () {
        var $diag = $('#customFieldCreate');
        $diag.dialog({
            width: 400,
            minWidth: 400,
            open: function () {
                $(this).find('input[name="entityName"]').val("");
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            },
            modal: true,
            buttons: [{
                text: Constants.c.create,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var name = $(this).find('input[name="entityName"]').val();
                    var type = $(this).find('select[name="type"]').val();
                    var listName = $(this).find('select[name="listName"]').val();
                    if (WorkflowEditor.validateName(name, window.allData.CustomFields)) {
                        var sf = function (result) {
                            var transName = Constants.c.argDocCustomField.replace('{0}', name);
                            var docFieldName = Constants.c.argDoc + '.' + Constants.c.argFields + '.' + name;
                            var newCFObject = { Name: docFieldName, ReadOnly: false, PropertyType: parseInt(type, 10), SupportedActionType: Constants.wfat.SyncVerifyAction | Constants.wfat.AutoRun };
                            window.allData.CustomFields[result.Id] = result.Name;
                            window.allData.BuiltInArgs[transName] = newCFObject;
                            Workflow.setArgumentLibrary();
                            TaskEditor.setInandOutArguments();
                            TaskEditor.fillArgsLibrary();
                            if ($('#args_lib li').draggable('instance')) {
                                $('#args_lib li').draggable('destroy');
                            }
                            $('#args_lib li').draggable({
                                helper: 'clone',
                                revert: 'invalid'
                            });
                            TaskEditor.setInandOutArguments();
                            BranchesEditor.autoComplete('#step_branches input[name="Condition"]', window.argumentLibrary);
                            $diag.find('input[name="entityName"]').val('');
                            WorkflowEditor.setupCreateDialogs();
                            $diag.dialog('close');
                        };
                        var ff = function (jqXHR, textStatus, errorThrown) {
                            ErrorHandler.popUpMessage(errorThrown);
                        };
                        var cfPkg = {
                            Name: name,
                            Type: type,
                            ListName: listName
                        };
                        WorkflowEditor.customFieldSvc.createCustomField(cfPkg, sf, ff);
                    }
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
    },
    createInbox: function () {
        var that = this;
        if (!that.inboxSvc) {
            that.inboxSvc = InboxServiceProxy();
        }
        var diag = $('#simpleCreate');
        diag.find('select[name="securityClass"]').parent().show();
        diag.dialog({
            width: 400,
            minWidth: 400,
            modal: true,
            open: function () {
                $(this).find('input[name="entityName"]').val("");
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            },
            title: Constants.c.inbox,
            buttons: [{
                text: Constants.c.create,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var name = diag.find('input[name="entityName"]').val();
                    if (WorkflowEditor.validateName(name, window.allData.Inboxes)) {
                        var secId = diag.find('select[name="securityClass"]').val();
                        var createPkg = {
                            Inboxes: [{
                                Id: Constants.c.emptyGuid,
                                Name: name,
                                CreatedBy: Constants.c.emptyGuid,
                                SecurityClassId: secId
                            }]
                        };
                        var success = function (result) {
                            window.allData.Inboxes[result[0].Id] = result[0].Name;
                            TaskEditor.setInandOutArguments();
                            diag.find('input[name="entityName"]').val('');
                            WorkflowEditor.setupCreateDialogs();
                            diag.dialog('close');
                        };
                        var failure = function (jqXHR, textStatus, errorThrown) {
                            ErrorHandler.popUpMessage(errorThrown);
                        };
                        that.inboxSvc.createInbox(createPkg, success, failure, null);
                    }
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
    },
    createSecurityClass: function () {
        $('#simpleCreate').find('select[name="securityClass"]').parent().hide();
        $('#simpleCreate').dialog({
            width: 400,
            minWidth: 400,
            modal: true,
            title: Constants.c.securityClass,
            open: function () {
                $(this).find('input[name="entityName"]').val("");
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            },
            close: function () {
                $('#simpleCreate').find('select[name="securityClass"]').show();
            },
            buttons: [{
                text: Constants.c.create,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var that = this;
                    var name = $(this).find('input[name="entityName"]').val();
                    if (WorkflowEditor.validateName(name, window.allData.SecurityClasses)) {
                        var sf = function (result) {
                            window.allData.SecurityClasses[result.Id] = result.Name;
                            if ($('#task_editor select[name="SecurityClassId"]').length > 0) {
                                var options = $('#task_editor select[name="SecurityClassId"] option').toArray();
                                var l = $('#task_editor select[name="SecurityClassId"] option').toArray().length;
                                var sortFunction = function (a, b) {
                                    if (a.text.toLocaleLowerCase() < b.text.toLocaleLowerCase()) {
                                        return -1;
                                    }
                                    return 1;
                                };
                                options = options.slice(2, l); //remove (inherit) and empty
                                options.push({ value: result.Id, text: result.Name });
                                options.sort(sortFunction);
                                $('#task_editor select[name="SecurityClassId"]').empty();
                                $('#task_editor select[name="SecurityClassId"]').append($("<option></option>").attr("value", Constants.c.emptyGuid).text('(inherit)'));
                                $('#task_editor select[name="SecurityClassId"]').append($("<option></option>").attr("value", '').text(''));
                                options.forEach(function (obj) {
                                    $('#task_editor select[name="SecurityClassId"]').append($("<option></option>").attr("value", obj.value).text(obj.text));
                                });
                            }
                            TaskEditor.setInandOutArguments();
                            $(that).find('input[name="entityName"]').val('');
                            WorkflowEditor.setupCreateDialogs();
                            $(that).dialog('close');
                        };
                        var ff = function (jqXHR, textStatus, errorThrown) {
                            ErrorHandler.popUpMessage(errorThrown);
                        };
                        var secClass = {
                            Name: name,
                            Id: Constants.c.emptyGuid
                        };
                        WorkflowEditor.securitySvc.createSecurityClass(secClass, sf, ff);
                    }
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    $(this).dialog('close');
                    $('#simpleCreate').find('select[name="securityClass"]').parent().show();
                }
            }]
        });
    },
    setupCreateDialogs: function () {
        var li;
        var select = $('#simpleCreate').find('select');
        select.empty();
        var sortSecClasses = _.map(window.allData.SecurityClasses, function (a, b) {
            return { id: b, value: a };
        });
        sortSecClasses.sort(function (a, b) {
            return a.value.toLowerCase() > b.value.toLowerCase() ? 1 : -1;
        });
        var i;
        for (i = 0; i < sortSecClasses.length; i++) {
            $(select).append($('<option></option>').val(sortSecClasses[i].id).text(sortSecClasses[i].value));
        }

        select = $('#customFieldCreate').find('select[name="listName"]');
        select.empty();
        for (li in window.allData.CustomLists) {
            if (window.allData.CustomLists.hasOwnProperty(li)) {
                $(select).append($('<option></option>').val(window.allData.CustomLists[li].Name).text(window.allData.CustomLists[li].Name));
            }
        }
        select = $('#customFieldCreate').find('select[name="type"]');
        if (!this.changeBound) {
            $(select).change(function () {
                if ($(this).find(':selected').text() === Constants.c.ty_Object) {
                    $('#customFieldCreate').find('select[name="listName"]').show();
                }
                else {
                    $('#customFieldCreate').find('select[name="listName"]').hide();
                }
            });
            this.changeBound = true;
        }
    },
    validateName: function (name, list) {
        if (!$.trim(name)) {
            ErrorHandler.addErrors({ entityName: Constants.c.nameEmptyWarning }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return false;
        }
        if ($.trim(name).toLowerCase() === $.trim(Constants.c.newTitle).toLowerCase()) {
            ErrorHandler.addErrors({ entityName: String.format(Constants.c.newNameWarning, Constants.t('newTitle')) }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return false;
        }
        if (_.detect(list, function (e) { return $.trim(e).toLowerCase() === $.trim(name).toLowerCase(); })) {
            ErrorHandler.addErrors({ entityName: Constants.c.duplicateNameError }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return false;
        }
        return true;
    },
    validateExceptionAssignee: function (data) {
        if ($('#process_editor input:checked').attr('class') !== '0') {
            if ($('#process_editor').find('[name="ExceptionAssignee"]').val() === '') {
                ErrorHandler.addErrors(Constants.c.triggerAssigneeBlank);
                return false;
            }
        }
        return true;
    },
    setTriggerMode: function (process) {
        var trigger = process.find(' > TriggerMode').text();
        $('#process_editor input[type=radio][class=' + trigger + ']').prop('checked', true);
    }
};