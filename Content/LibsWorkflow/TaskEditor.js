var TaskEditor = {
    viewers: {},
    warnOutputConfirmResult: false,
    dataLinkSvc: DataLinkServiceProxy(),
    customFieldSvc: CustomFieldProxy(),
    editingTask: false, // For use with determining difference between editing a task and adding a task
    dropped: false, // For use with determining whether the task was dropped or not
    isLegacyRegion: false,
    searchModel: undefined,
    gridView: undefined,
    docModel: undefined,
    documentImageView: undefined,
    reverseCustomFieldMap: null,
    refreshArgsFunction: null,
    init: function () {
        // Setup Task Editor Dialog
        $('#task_editor').dialog({
            width: 605,
            minWidth: 625,
            height: 500,
            minHeight: 500,
            modal: true,
            autoOpen: false,
            title: Constants.c.taskEditor,
            buttons: [{
                // Save changes, close dialog
                text: Constants.c.ok,
                click: function () {
                    var messages = [];
                    var saveFunc = function () {
                        if (TaskEditor.okApply()) {
                            TaskEditor.flagSave = true;
                            $('#task_editor').dialog('close');
                        }
                    };
                    try {
                        if (TaskEditor.isFieldExistsInGroup()) {
                            messages.push(Constants.c.lineItemsWarning);
                        }
                        var fields = TaskEditor.missingFields();
                        if (fields) {
                            messages.push(String.format(Constants.c.missing_T, fields));
                        }
                    }
                    catch (ex) {
                        TaskEditor.errorHandler(ex);
                        return false;   // If there are any thrown error just return.
                    }
                    if (messages.length) {
                        TaskEditor.showWarningBox(messages.join('<br>'), saveFunc);
                    } else {
                        saveFunc();
                    }
                }
            }, {
                // Do Nothing, just close dialog
                text: Constants.c.cancel,
                click: function () {
                    TaskEditor.flagSave = false;
                    $('#task_editor').dialog('close');
                }
            }],
            open: function () {
                TaskEditor.flagSave = false;
            },
            close: function () {
                if (!TaskEditor.flagSave) {
                    if (TaskEditor.dropped) {
                        $('#action_tasks').find('.selected_task').remove();
                    }
                    TaskEditor.newTaskXML = '';
                    TaskEditor.dropped = false;
                }
                TaskEditor.editingTask = false;
            }
        });
        $('#get_region').dialog({
            width: 900,
            minWidth: 900,
            height: 650,
            minHeight: 650,
            modal: true,
            autoOpen: false,
            title: Constants.c.getRegion,
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    var regionValues;
                    if (TaskEditor.documentImageView.recognition) {
                        regionValues = TaskEditor.documentImageView.recognition.getRegionValues();
                    }
                    var page = 0;
                    if (regionValues && regionValues.Width) {
                        $('#task_editor input[name="Top"]').val(regionValues.Top);
                        $('#task_editor input[name="Left"]').val(regionValues.Left);
                        $('#task_editor input[name="Width"]').val(regionValues.Width);
                        $('#task_editor input[name="Height"]').val(regionValues.Height);
                        TaskEditor.isLegacyRegion = false;
                    }
                    if ($('input.currentPage').is(':checked')) {
                        page = parseInt($('input[name="viewer_results_counter"]').val(), 10);
                    }
                    if (isNaN(page)) {
                        page = TaskEditor.docModel.getCurrentPage() || 1;
                    }
                    $('#task_editor input[name="Page"]').val(page);
                    if (TaskEditor.documentImageView.pzr) {
                        var viewport = TaskEditor.documentImageView.pzr.getViewPort();
                        viewport.imgAreaSelect({ hide: true });
                    }
                    $(this).dialog('close');
                }
            }, {
                text: Constants.c.cancel,
                click: function () {
                    if (TaskEditor.documentImageView.pzr) {
                        var viewport = TaskEditor.documentImageView.pzr.getViewPort();
                        viewport.imgAreaSelect({ hide: true });
                    }
                    $(this).dialog('close');
                }
            }],
            open: function () {
                // If the task is a UI task, only allow Current Page as a selection for Get Region
                var currPage = parseInt($('#task_editor input[name="Page"]').val(), 10);
                $('body').off('ViewDocuments').on('ViewDocuments', TaskEditor.onSelectRow);
                TaskEditor.changeRegionPage(currPage);
                TaskEditor.searchModel = new SearchResultsCPX();
                TaskEditor.docModel = new BulkViewerDataPackageCPX();
                TaskEditor.documentImageView = new DocumentImageView({ model: TaskEditor.docModel, regionViewer: true });
                var svOptions = {
                    model: TaskEditor.searchModel,
                    regionMode: true,
                    defaultColumns: {}
                };
                svOptions.defaultColumns[Constants.UtilityConstants.SF_TITLE] = { width: 75, order: 0 };
                svOptions.defaultColumns[Constants.UtilityConstants.DF_PAGE_COUNT] = { width: 24, order: 1 };
                TaskEditor.gridView = new SearchResultsGridView(svOptions);
                $('#regResults').html(TaskEditor.gridView.render().$el);
                $('.document_preview_viewer').html(TaskEditor.documentImageView.$el);
                TaskEditor.documentImageView.$el.addClass('hideNative');
                TaskEditor.searchModel.get('Results').listenTo(TaskEditor.searchModel.get('Results'), 'change add remove reset', TaskEditor.viewResults);
            },
            close: function (event, ui) {
                if (TaskEditor.documentImageView.pzr) {
                    var viewport = TaskEditor.documentImageView.pzr.getViewPort();
                    if (viewport.length === 0) {
                        viewport = $('#get_region .img_container');
                    }
                    viewport.imgAreaSelect({ hide: true });
                    TaskEditor.documentImageView.recognition.endLasso();
                }

                TaskEditor.documentImageView.close();
                TaskEditor.documentImageView = undefined;
                TaskEditor.gridView.close();
                TaskEditor.gridView = undefined;
            },
            dragStart: function (event, ui) {
                if (TaskEditor.documentImageView.recognition) {
                    TaskEditor.documentImageView.recognition.endLasso();
                }
            },
            resizeStart: function (event, ui) {
                if (TaskEditor.documentImageView.recognition) {
                    TaskEditor.documentImageView.recognition.endLasso();
                }
            },
            resize: function (event, ui) {
                ShowHidePanel.resize();
            }
        });
    },
    viewResults: function () {
        var ids = TaskEditor.searchModel.get('Results').getEntityIds();
        if (ids.versionIds.length === 0) {
            TaskEditor.documentImageView.$el.addClass('hideNative');
            TaskEditor.docModel.unset('Id');
        } else if (ids.versionIds[0] !== TaskEditor.docModel.get('Id')) {
            var regionValues = {};
            regionValues = {};
            regionValues.Top = parseFloat($('#task_editor input[name="Top"]').val());
            regionValues.Left = parseFloat($('#task_editor input[name="Left"]').val());
            regionValues.Width = parseFloat($('#task_editor input[name="Width"]').val());
            regionValues.Height = parseFloat($('#task_editor input[name="Height"]').val());
            regionValues.Page = parseInt($('#task_editor input[name="Page"]').val(), 10);
            var callback = function (doc) {
                // Only unbind this event when rebinding it, this allows paging through a document to display the same selection area for each page
                $('body').off('imageLoadedRegionSelection.TaskEditor').on('imageLoadedRegionSelection.TaskEditor', function () {
                    // Resize the document in the viewer so the entire document is viewable (best fit)
                    TaskEditor.documentImageView.pzr.fitImage();
                    var opts = {
                        imgSelector: '#get_region img[name="image_full"]',
                        regionValues: regionValues
                    };
                    TaskEditor.documentImageView.recognition.displayPreviousSelection(opts);
                });
                TaskEditor.documentImageView.render();
                TaskEditor.documentImageView.$el.removeClass('hideNative');
                TaskEditor.documentImageView.pzr.getViewPort().imgAreaSelect({ hide: true, show: false });   // hide the img area select region so it isn't displayed between document views
                TaskEditor.resize = false;
                TaskEditor.changeRegionPage(regionValues.Page);
                if (regionValues.Page === 0) {
                    regionValues.Page = TaskEditor.docModel.getCurrentPage();
                }
                var maxPage = TaskEditor.docModel.getMaxPage();
                if (regionValues.Page <= maxPage) {
                    TaskEditor.docModel.setCurrentPage(regionValues.Page);
                } else if (regionValues.Page > maxPage) {
                    TaskEditor.docModel.setCurrentPage(maxPage);
                    ErrorHandler.addErrors(String.format(Constants.c.regionPageNumExceedMaxPage, regionValues.Page));
                }
            };
            TaskEditor.docModel.set({
                Id: ids.versionIds[0],
                CachedViewData: undefined,
                CachedViewId: undefined,
                viewIndex: undefined,
                currentPage: 1,
                versionIds: undefined
            });
            TaskEditor.docModel.fetch({ success: callback });
        }
    },
    changeRegionPage: function (currPage) {
        if ($('#taskType').attr('class').match(Workflow.taskTypes.UI)) {
            $('#get_region').find('.allPages').parent().hide();
            $('#get_region').find('.currentPage').prop('checked', true);
        }
        else {
            if (!currPage || currPage === 0) {
                $('#get_region').find('.allPages').prop('checked', true);
            }
            else {
                $('#get_region').find('.currentPage').prop('checked', true);
            }
            $('#get_region').find('.allPages').parent().show();
        }
    },
    showWarningBox: function (message, okFunc) {
        var html = String.format("{0}<br><br>{1}", message, Constants.c.continueYesNo);
        $("#warning_box").html(html);
        $("#warning_box").dialog({
            resizable: false,
            modal: true,
            title: "Warning",
            height: 200,
            width: 800,
            buttons: [{
                // Save changes, close dialog
                text: Constants.c.ok,
                click: function () {
                    $('#warning_box').dialog('close');
                    okFunc();
                }
            }, {
                // Do Nothing, just close dialog
                text: Constants.c.cancel,
                click: function () {
                    $('#warning_box').dialog('close');
                }
            }]
        });
    },
    applyEventHandlers: function () {
        $('body').on('click', '#task_editor div.item div.SelectorAboveArgumentsHeader .ui-icon-refresh', function (event) {
            if (TaskEditor.refreshArgsFunction) {
                TaskEditor.refreshArgsFunction(event, null, null, true);
            }
        });
        // extra arguments in these event functions come from programmatic .trigger() in mapSettings
        $('body').on('change', 'select[name="Datalink"]', function (event, inArgsList, outArgsList, fillWithSelectedTask) {
            TaskEditor.changeDatalinkSelection(event, inArgsList, outArgsList, fillWithSelectedTask);
        });
        $('body').on('change', 'select[name="CustomFieldGroupId"]', function (event, inArgsList, outArgsList, fillWithSelectedTask) {
            TaskEditor.changeCustomFieldGroupSelection(event, inArgsList, outArgsList, fillWithSelectedTask);
        });
    },

    okApply: function () {
        return TaskEditor.saveTaskEditor();
    },
    getArgumentsUI: function (label, minArgs, maxArgs, existingArgs) {
        var i;
        var existingArgsLength = 0;
        var renderCount;
        var argText;
        var content = "";
        var addContent = "";
        var template = $('#taskArgumentTemplate').clone();
        template.removeAttr('id');
        template.removeAttr('style');
        var contentDiv = template.find('.taskArguments');
        var addTaskDiv = template.find('.addTaskArgument');
        template.find('legend').text(label);
        if (!maxArgs && maxArgs !== 0) {
            maxArgs = 32;
        }
        if (maxArgs === 0) {
            content = Constants.c.notApplicable;
        } else {
            if (existingArgs) {
                existingArgsLength = (existingArgs.length > maxArgs) ? maxArgs : existingArgs.length;
            }
            renderCount = (minArgs < existingArgsLength) ? existingArgsLength : minArgs;
            for (i = 0; i < renderCount; i++) {
                argText = (i <= (existingArgsLength - 1)) ? TaskEditor.transformArg(existingArgs[i]) : "";
                content += "<div><input class='" + label + "ArgDropTarget' value='" + argText + "' />";
                if (i >= minArgs) {
                    content += "<a href='javascript:void(0)' onclick='TaskEditor.removeArgument(this);' >" + Constants.c.remove + "</a>";
                }
                content += "</div>";
            }
            if (minArgs < maxArgs) {
                addContent += "<a name='addLink' href='javascript:void(0)' onclick='TaskEditor.addArgument(this);' min='" + minArgs + "' max='" + maxArgs + "' label='" + label + "' >" + Constants.c.add + "</a>";
            }
        }
        contentDiv.html(content);
        addTaskDiv.html(addContent);
        return template;
    },
    getKeyedArgsUI: function (label, keyList, existingArgs) {
        // keyList: may be a simple array of strings or an array of key/value pairs, the values of which may be
        //    simple string Values or an object containing Value, Type, and Required properties.  In each case, the Value is default Value.
        // existingArgs: simple array of strings.
        var template = $('#taskArgumentTemplate').clone();
        template.removeAttr('id');
        template.removeAttr('style');
        var contentDiv = template.find('.taskArguments');
        template.find('legend').text(label);
        var renderCount = 0;
        if (keyList) {
            renderCount = keyList.length;
        }
        if (renderCount === 0) {
            contentDiv.html(Constants.c.notApplicable);
        } else {
            var existingArgsLength = 0;
            if (existingArgs) {
                existingArgsLength = existingArgs.length;
            }
            var i;
            var value;
            var defaultValue;
            var required;
            var anyRequired = false;
            var pType;
            for (i = 0; i < renderCount; i++) {
                var content = document.createElement('div');
                defaultValue = '';
                required = false;
                pType = undefined;
                // default value and parameter info
                if (keyList[i].Value) {
                    if (keyList[i].Value.Value === undefined) {
                        // simple default value
                        defaultValue = this.quoteArgIfNeeded(keyList[i].Value);
                    } else {
                        // default value with other parameter info
                        defaultValue = this.quoteArgIfNeeded(keyList[i].Value.Value);
                        required = keyList[i].Value.Required;
                        pType = keyList[i].Value.Type;
                    }
                }
                if (i < existingArgsLength) {
                    value = TaskEditor.transformArg(existingArgs[i]); // if there is an arg (even empty string, 0, whatever), use it
                } else {
                    value = defaultValue;
                }
                var key = keyList[i].Key || keyList[i];
                var span = document.createElement('span');
                span.setAttribute('title', key);
                span.textContent = key;
                content.appendChild(span);
                var input = document.createElement('input');
                input.className = label + 'ArgDropTarget';
                input.value = value;
                content.appendChild(input);
                if (required) {
                    anyRequired = true;
                    span = document.createElement('span');
                    span.className = 'lefttext required';
                    span.textContent = '*';
                    content.appendChild(span);
                }
                contentDiv.append(content);
            }
            if (anyRequired) {
                contentDiv.append('<div><span>&nbsp;</span><span class="lefttext">* ' + Constants.c.required + '</span></div>');
            }
        }
        return template;
    },
    quoteArgIfNeeded: function (a) {
        if (a && isNaN(a) && a[0] !== '$') {
            return "'" + a + "'";
        }
        return a;
    },
    addArgument: function (e) {
        var max = parseInt($(e).attr('max'), 10);
        var label = $(e).attr('label');
        var inAccept = 'li.selected_readOnlyArg, li.selected_arg';
        var outAccept = 'li.selected_arg';
        var taskSelector = $(e).parent().parent().find('div.taskArguments');
        var dropTarget = label + "ArgDropTarget";
        var content = "<div><input class='" + dropTarget + "' value='' />";
        content += "<a href='javascript:void(0)' onclick='TaskEditor.removeArgument(this);' >" + Constants.c.remove + "</a>";
        content += "</div>";
        taskSelector.append(content);
        var taskArg = taskSelector.children().last().find('.' + dropTarget);
        var count = taskSelector.children().length;
        if (max <= count) {
            $(e).hide();
        }
        if (label === Constants.c.inArgs) {
            TaskEditor.dragAndDropArg(taskArg, inAccept);
        } else {
            TaskEditor.dragAndDropArg(taskArg, outAccept);
        }
        return false;
    },
    removeArgument: function (e) {
        var addLink = $(e).parent().parent().parent().find('a[name="addLink"]');
        addLink.show();
        $(e).parent().find('input').droppable('destroy');
        $(e).parent().remove();
        return false;
    },
    getIndexArg: function (argString) {
        if (argString.indexOf('[') === -1 || argString.indexOf(']') === -1) {
            return '';
        }
        return argString.substring(argString.indexOf('['));
    },
    getArgumentData: function (argSelector) {
        var args = $('#task_editor ' + argSelector);
        var argLength = args.length;
        var argVals = [];
        var argKeys = [];
        var i;
        for (i = 0; i < argLength; i++) {
            var userArg = $(args[i]).val();
            var key = $(args[i]).parent().find('span').first().text();
            var argKey = key === undefined ? "" : key;  // Make sure a value is entered for argKey
            argKeys.push(argKey);
            if (userArg) {
                var idxArg = TaskEditor.getIndexArg(userArg);
                userArg = userArg.replace(idxArg, '');
                var transArg = window.argumentLibrary[userArg];
                if (idxArg.length > 0 && !transArg.Indexable) {
                    throw userArg + Constants.c.argumentIsNotIndexable;
                }
                if (userArg.startsWith('$') && userArg.indexOf('.') >= 0 && !transArg) {
                    var userArgSplit = userArg.split('.');
                    var startUserArg = window.argumentLibrary[userArgSplit[0]];
                    if (startUserArg) {
                        userArg = startUserArg.Name + '.' + userArgSplit[1]; // rejoin with .
                    }
                }
                if (transArg) {
                    if (argSelector === '.OutputArgDropTarget' && transArg.ReadOnly) {
                        throw userArg + Constants.c.argumentIsReadOnly;
                    }
                    transArg = transArg.Name;
                } else if (userArg.indexOf('$') !== -1 && !userArg.startsWith('$')) {
                    throw Constants.c.invalidBuiltInArg + userArg;
                } else if (argSelector === '.OutputArgDropTarget' && (!TaskEditor.isParam(userArg)) && TaskEditor.isFieldExists(userArg)) {
                    // output arg that isn't a literal (i.e. - "test" or 1234)
                    throw Constants.c.literalOutputArg + userArg;
                } else if (userArg.indexOf('.') >= 0 && TaskEditor.isParam(userArg)) {
                    throw Constants.c.parameterContainsInvalidChars + userArg;
                } else {
                    transArg = userArg;
                }

                argVals.push(transArg + idxArg);
            }
            else if (argKey) {
                argVals.push("");   // Allows length of argVals and argKeys to match
            }
        }
        return { argKeys: JSON.stringify(argKeys), argVals: JSON.stringify(argVals) };
    },
    addTask: function (task, noSelect) {
        // Get new Task based on taskName
        var taskName = $(task).find('span:last').val();
        if ($(task).find('span:last').attr('taskdata')) {
            taskName = JSON.parse($(task).find('span:last').attr('taskdata')).TaskClassName;
        }
        if (!taskName) {
            taskName = $(task).val();
        }
        TaskEditor.incrementTaskTypeCounts();
        var newTaskXML = Workflow.fetchNewTask(taskName);
        TaskEditor.newTaskXML = newTaskXML;
        // Select task with taskClassName from select
        if (!noSelect) {
            TaskEditor.selectTask(task);
        }
    },
    createTask: function (index) {
        if (TaskEditor.newTaskXML) {
            var actionTasks = $('#action_tasks');
            var sequence = actionTasks.find('li').last().index() + 2;
            var taskXML = TaskEditor.newTaskXML;
            var taskName = $('#tasks').find(':selected').val();
            var taskData = TaskEditor.getStringifiedTaskData(taskName);
            var taskId = $(taskXML).find('Id').text();
            var classes = $('#tasks').find(':selected').attr('class');
            $(taskXML).find('TaskClassName').text(taskName);
            $(taskXML).find('Settings').text(TaskEditor.getSettings());
            var taskDescription = TaskEditor.getTaskDescription($(taskXML));
            var taskText = taskDescription.td;
            var taskTitle = taskDescription.title;
            var inArgData = TaskEditor.getArgumentData('.InputArgDropTarget');
            var outArgData = TaskEditor.getArgumentData('.OutputArgDropTarget');

            $(taskXML).find('InArgNames').text(inArgData.argVals);
            $(taskXML).find('InArgKeys').text(inArgData.argKeys);
            $(taskXML).find('OutArgNames').text(outArgData.argVals);
            $(taskXML).find('OutArgKeys').text(outArgData.argKeys);


            $(ActionEditor.currentActionXMLClone).find('WFTasks').append($(taskXML).find('WFTaskDTO'));
            // map data of new task to ui
            if (TaskEditor.dropped) {
                actionTasks.find('.selected_task').remove();
            }
            actionTasks.find('.selected_task').removeClass('selected_task');
            actionTasks.append($('<li></li>')
                .attr('class', 'no_text_select')
                .append($('<span>&nbsp;</span>')
                    .addClass(classes)
                )
                .append($('<span></span>')
                    .attr('name', 'Name')
                    .attr('TaskData', taskData)
                    .attr('title', taskTitle)
                    .text(taskText)
                    .val(taskName)
                )
                .append($('<input type="hidden" />')
                    .attr('class', 'ignore')
                    .attr('name', 'Id')
                    .val(taskId)
                )
                .append($('<input type="hidden" />')
                    .attr('name', 'Sequence')
                    .val(sequence)
                )
                .addClass('selected_task')
            );
            if (index || index >= 0) {
                var selector = actionTasks.find('li').last();
                var other = $(selector);
                actionTasks.find('li:eq(' + index + ')').before(other.clone());
                other.remove();
            }
            TaskEditor.dropped = false;
            // reset new task xml
            TaskEditor.newTaskXML = '';
        }
    },
    selectTask: function (task) {
        var taskName = $(task).find('span:last').val();
        if ($(task).find('span:last').attr('taskdata')) {
            taskName = JSON.parse($(task).find('span:last').attr('taskdata')).TaskClassName;
        }
        if (!taskName) {
            taskName = $(task).val();
        }
        var taskTitle = $(task).text();
        $('#task_editor').dialog('option', 'title', Constants.c.taskEditor + ': ' + Utility.safeHtmlString(taskTitle));
        $('#tasks option').prop('selected', false);
        $('#tasks').find('option[value="' + taskName + '"]').prop('selected', 'selected');
        TaskEditor.fillTaskEditor($('#tasks :selected'));
    },
    editTask: function (task) {
        // Show Task Editor for editing the current task
        TaskEditor.editingTask = true;
        TaskEditor.showTaskEditor(task);
        // Fill out settings according to settings in xml
        TaskEditor.fillSettings(task);
    },
    fillSettings: function (task) {
        var tDTO = TaskEditor.getTaskDTO(task);
        if (tDTO) {
            var settings = tDTO.find('Settings').text();
            var inArgs = tDTO.find('InArgNames').text();
            var outArgs = tDTO.find('OutArgNames').text();
            if (settings) {
                settings = JSON.parse(settings);
            }
            if (inArgs) {
                inArgs = JSON.parse(inArgs);
            }
            if (outArgs) {
                outArgs = JSON.parse(outArgs);
            }
            var defaultFillFunc = function () {
                TaskEditor.mapSettings(settings, inArgs, outArgs);
                TaskEditor.mapArguments(inArgs, 'in');
                TaskEditor.mapArguments(outArgs, 'out');
            };
            var customTaskFillFunction = TaskEditor['fill' + tDTO.find('TaskClassName').text()];
            // If there is a custom fill function, call it and fill out the current Tasks settings and arguments using it
            // Otherwise use the defaultFillFunc to fill out the current Tasks settings and arguments
            if (customTaskFillFunction) {
                customTaskFillFunction(settings, inArgs, outArgs, defaultFillFunc);
            } else {
                defaultFillFunc();
            }
        }
    },
    fillAddToFolderTask: function (settings, inArgs, outArgs, fillSettingsFunc) {
        if (fillSettingsFunc) {
            fillSettingsFunc();
        }
        if (settings) {
            var mustExist = settings.MustExist;
            if (mustExist) {
                var secClass = $('#task_editor select[name="SecurityClassId"]');
                if (secClass.length > 0) {
                    secClass.parent('.item').hide(); // If it is checked hide the security class                    
                }
            }
        }
    },
    fillSendNotificationTask: function (settings, inArgs, outArgs, fillSettingsFunc) {
        if (fillSettingsFunc) {
            fillSettingsFunc();
        }
        if (settings) {
            var enableAttchment = settings.attachDocument || settings.allow;
            TaskEditor.setSendNotificationAttchmentSettings(enableAttchment);
            if (parseInt(settings.SendAs, 10) === Constants.edt.Native) {
                $(".notificationnative").prop("checked", true);
                $("input[name='IncludeRedactions'],input[name='IncludeAnnotations']").prop("disabled", true).prop("checked", false);

            }
            else if (parseInt(settings.SendAs, 10) === Constants.edt.PDF) {
                $(".notificationnative").prop("checked", false);
                $(".notificationpdf").prop("checked", true);
                $("input[name='IncludeRedactions'],input[name='IncludeAnnotations']").prop('disabled', false);
            }
        }
    },
    fillComboBoxTask: function (settings, inArgs, outArgs, fillSettingsFunc) {
        if (fillSettingsFunc) {
            fillSettingsFunc();
        }
        if (settings) {
            if (settings.ListName === "") {
                $(".radiolist").prop("checked", false);
                $(".radiodatalink").prop("checked", true);
                $("select[name='DataLinkTypeAhead']").prop('disabled', false);
                $("input[name='ListName']").val("").prop("disabled", true);
                $("input[name='UserCanAddToList']").prop("checked", false).prop("disabled", true);

            }
            else {
                $(".radiodatalink").prop("checked", false);
                $(".radiolist").prop("checked", true);
                $("select[name='DataLinkTypeAhead']").prop("disabled", true);
                $("input[name='ListName']").prop('disabled', false);
                $("input[name='UserCanAddToList']").prop('disabled', false);
            }
        }
    },
    fillDropDownTask: function (settings, inArgs, outArgs, fillSettingsFunc) {
        if (fillSettingsFunc) {
            fillSettingsFunc();
        }
        if (settings) {
            if (settings.ListName === "") {
                $(".radiolist").prop("checked", false);
                $(".radiodatalink").prop("checked", true);
                $("select[name='DataLinkDropdown']").prop('disabled', false);
                $("input[name='ListName']").val("").prop("disabled", true);

            }
            else {
                $(".radiodatalink").prop("checked", false);
                $(".radiolist").prop("checked", true);
                $("select[name='DataLinkDropdown']").prop("disabled", true);
                $("input[name='ListName']").prop('disabled', false);
            }
        }
    },
    //#region Custom Task Fill Functions
    fillOCRTask: function (settings, inArgs, outArgs, fillSettingsFunc) {
        TaskEditor.fillEnumCheckboxes('CleanupOptions', fillSettingsFunc);
    },
    fillImageCleanupTask: function (settings, inArgs, outArgs, fillSettingsFunc) {
        TaskEditor.fillEnumCheckboxes('CleanupOptions', fillSettingsFunc);
    },
    fillGrantPermissionsTask: function (settings, inArgs, outArgs, fillSettingsFunc) {
        TaskEditor.fillEnumCheckboxes('PermissionsOptions', fillSettingsFunc);
    },
    fillEnumCheckboxes: function (valueName, fillSettingsFunc, $template) {
        if (fillSettingsFunc) {
            fillSettingsFunc();
        }
        $template = $template || $('#task_editor');
        var optionsInput = $template.find('input[name="' + valueName + '"]');
        var value = optionsInput.val();
        var checkboxes = optionsInput.parent().find('input[type="checkbox"]');
        var cbValue;
        var i;
        var length = checkboxes.length;
        for (i = 0; i < length; i++) {
            cbValue = parseInt($(checkboxes[i]).val(), 10);
            $(checkboxes[i]).prop('checked', cbValue !== 0 && (cbValue & value) === cbValue);
        }
        // I think this would handle an 'all' enum value, but an extra line of code would be needed to handle a 'none'
    },
    fillUserVerifyCustomFieldGroupTask: function (settings, inArgs, outArgs, defaultFillFunc) {
        defaultFillFunc();

        var inlayColor = $('#task_editor input[name="InlayColor"]').val();
        $('#task_editor div.item div.InlayColor_' + inlayColor).trigger('click');
    },
    fillDatalinkTask: function (settings, inArgs, outArgs) {
        // call this directly to suppress the other stuff in the default fill function
        TaskEditor.mapSettings(settings, inArgs, outArgs);
    },
    fillSetFieldGroupValuesTask: function (settings, inArgs, outArgs) {
        // call this directly to suppress the other stuff in the default fill function
        TaskEditor.mapSettings(settings, inArgs, outArgs);
    },
    //#endregion End Custom Task Fill Functions
    getXMLTaskIds: function () {
        // Get action ids that are in the xml file
        var taskIds = [];
        var currAction = $(ActionEditor.currentActionXMLClone);
        var tasks = currAction.find('WFTaskDTO');
        $.map(tasks, function (task) {
            taskIds.push($(task).find('Id').text());
        });
        return taskIds;
    },
    getCurrTaskIds: function () {
        // Get action ids that are in the action list
        var currTaskIds = [];
        $.map($('#action_tasks li'), function (item) {
            currTaskIds.push($(item).find('input[name="Id"]').val());
        });
        return currTaskIds;
    },
    getRemoveTaskIds: function () {
        var xmlTaskIds = TaskEditor.getXMLTaskIds();
        var currTaskIds = TaskEditor.getCurrTaskIds();
        var delTaskIds = [];
        var del = false;
        // If there were no tasks in the action to begin with there are none to delete
        if (xmlTaskIds.length <= 0) {
            return [];
        }
        // If there are no tasks in the action being edited, delete every task from the xml
        if (currTaskIds.length <= 0) {
            return xmlTaskIds;
        }
        var id;
        var currId;
        for (id in xmlTaskIds) {
            if (xmlTaskIds.hasOwnProperty(id)) {
                for (currId in currTaskIds) {
                    if (currTaskIds.hasOwnProperty(currId)) {
                        if (currTaskIds[currId] === xmlTaskIds[id]) {
                            del = false;
                            break;
                        } else {
                            del = true;
                        }
                    }
                }
                if (del === true) {
                    delTaskIds.push(xmlTaskIds[id]);
                }
            }
        }
        return delTaskIds;
    },
    removeTask: function (task) {
        var confirmResult = confirm(Constants.c.deleteTaskConfirm);
        if (!confirmResult) {
            return;
        }
        var id = $(task).find("input[name='Id']").val();
        $(task).remove();
        TaskEditor.deleteTask([id]);
    },
    deleteTask: function (taskIds) {
        // Nothing to do if there are no tasks to delete
        if (taskIds.length <= 0) {
            return;
        }
        // Remove tasks from xml    
        $.map(taskIds, function (taskId) {
            var taskXML = $(ActionEditor.currentActionXMLClone).find('WFTaskDTO').filter(function () {
                var test_value = $(this).find('Id').text();
                return taskId === test_value;
            });
            $(taskXML).remove();
        });
        TaskEditor.fillTaskLibrary(ActionEditor.getTaskTypeCount());
    },
    updateTask: function () {
        var actionTasks = $('#action_tasks');
        // Get current task
        var currTask = actionTasks.find('.selected_task');
        var currTaskData = currTask.find('span:last').attr('taskdata');
        var taskClassName = '';
        var data;
        if (currTaskData) {
            data = JSON.parse(currTaskData);
            taskClassName = data.TaskClassName;
        }
        var currTaskIndex = $(currTask).index();
        var taskName = $('#tasks').find(':selected').val();
        var editTaskName = currTask.find('span[name="Name"]').text();
        var currTaskName = editTaskName.split(':');
        if (currTaskName.length > 1) {
            editTaskName = currTaskName[0];
        }
        // Check to see if the task was not changed to another task, from the task select list
        if (taskClassName !== taskName) {
            // Remove currently selected task in Action Editor
            $(currTask).remove();
            // Append currently modified/edited task to Action Editor task list
            TaskEditor.addTask($('#tasks').find(':selected'), true);
            // Create the task from TaskEditor.newTaskXML
            TaskEditor.createTask(currTaskIndex);
        }
        var tDTO = TaskEditor.getTaskDTO(currTask);
        if (tDTO) {
            var settings = TaskEditor.getSettings();
            var inArgData = TaskEditor.getArgumentData('.InputArgDropTarget');
            var inArgNames = inArgData.argVals;
            var inArgKeys = inArgData.argKeys;
            var outArgData = TaskEditor.getArgumentData('.OutputArgDropTarget');
            var outArgNames = outArgData.argVals;
            var outArgKeys = outArgData.argKeys;
            if ($(tDTO).find('OutArgNames').text()) {
                $.map(JSON.parse($(tDTO).find('OutArgNames').text()), function (arg) {
                    if (TaskEditor.isParam(arg)) {
                        if (window.argumentLibrary[arg] && window.argumentLibrary[arg].Count <= 1) {
                            window.argumentLibrary[arg] = null;
                            try {
                                delete window.argumentLibrary[arg];
                            } catch (e) {
                                Utility.OutputToConsole(e);
                            }
                        } else if (window.argumentLibrary[arg]) {
                            window.argumentLibrary[arg].Count -= 1;
                        }
                    }
                });
            }
            if (outArgNames) {
                $.map(JSON.parse(outArgNames), function (arg) {
                    if (TaskEditor.isParam(arg)) {
                        if (window.argumentLibrary[arg]) {
                            window.argumentLibrary[arg].Count += 1;
                        } else {
                            window.argumentLibrary[arg] = { Name: arg, PropertyType: 3, ReadOnly: false, Count: 1, SupportedActionType: Constants.wfat.SyncVerifyAction | Constants.wfat.AutoRun };
                        }
                    }
                });
            }
            //Notify the branches editor that the argumentLibrary has changed.
            BranchesEditor.autoComplete('#step_branches input[name="Condition"]', window.argumentLibrary);
            BranchesEditor.conditionLibrary('#conditions_lib', window.argumentLibrary);
            // Update XML
            $(tDTO).find('TaskClassName').text(taskName);
            $(tDTO).find('Settings').text(settings);
            $(tDTO).find('InArgNames').text(inArgNames);
            $(tDTO).find('InArgKeys').text(inArgKeys);
            $(tDTO).find('OutArgNames').text(outArgNames);
            $(tDTO).find('OutArgKeys').text(outArgKeys);

            var taskDescription = TaskEditor.getTaskDescription($(tDTO));
            var td = taskDescription.td;
            var title = taskDescription.title;
            currTask = actionTasks.find('.selected_task');
            $(currTask.find('span[name="Name"]').text(td)).attr('title', title);
        }
        TaskEditor.fillTaskLibrary(ActionEditor.getTaskTypeCount(), taskName);
    },
    mapTasks: function (xml, selector) {
        var tasks = $(selector + ' li');
        // Map tasks in ui back to xml
        var sequence = 0;
        var keys = [];
        var stickyFields = $('#action_editor').find('input[name="StickyFields"]').is(':checked');
        $.map(tasks, function (item) {
            var taskId = $(item).find('input').val();
            var taskXML = $(xml).find('WFTaskDTO').filter(function () {
                var test_value = $(this).find(' > Id').text();
                return taskId === test_value;
            });
            // index is 0 based, sequence is 1 base
            sequence = $(item).index() + 1;
            // Set Sequence based on list order
            $(taskXML).find('> Sequence').text(sequence);
            var settingsSel = $(taskXML).find('> Settings');
            var settings = settingsSel.text();
            if (settings) {
                settings = JSON.parse(settings);
            } else {
                settings = {};
            }
            settings.StickyField = stickyFields;
            settings = JSON.stringify(settings);
            settingsSel.text(settings);
            keys.push(taskXML);
        });
        // Sort xml by sequence
        var sortSequence = function (a, b) {
            return parseInt($(a).find('> Sequence').text(), 10) - parseInt($(b).find('> Sequence').text(), 10);
        };
        var sortedTasks = keys.sort(sortSequence);
        if (sortedTasks && sortedTasks.length > 0) {
            $(xml).find('WFTasks').empty();
            _.each(sortedTasks, function (tasks) {
                $(xml).find('WFTasks').append(tasks[0]);
            });
        }
    },
    mapArguments: function (args, argType) {
        // argType: is either 'in' or 'out'        
        var length = args.length;
        var i;
        var arg;
        var selector;
        var addBtnSelector;
        if (argType === 'in') {
            selector = 'input.InputArgDropTarget';
            addBtnSelector = 'a[label="Input"]';
        } else {
            selector = 'input.OutputArgDropTarget';
            addBtnSelector = 'a[label="Output"]';
        }
        for (i = 0; i < length; i++) {
            arg = $('#task_editor').find(selector);
            if (arg.length < length) {
                var addArg = $('#task_editor div.addTaskArgument').find(addBtnSelector);
                //TODO: scain fix this to use the method call rather than the event call
                $(addArg).click();
                arg = $('#task_editor').find(selector);
            }
            var transArg = TaskEditor.transformArg(args[i]);
            $($(arg)[i]).val(transArg);
        }
    },
    /*
    Transform @arg into a UI display argument (e.g. $.doc.Title, displays as $Title)
    @arg: a string representation of an input/output argument to be transformed for UI display purposes
    */
    transformArg: function (arg) {
        var argumentLibraryRM = Utility.reverseMapObject(window.argumentLibrary, 'Name');
        var idxArg = TaskEditor.getIndexArg(arg);
        arg = arg.replace(idxArg, '');
        var startTransArg;
        var transArg = argumentLibraryRM[arg];
        var argsSplit = arg.split('.');
        if (arg && arg.startsWith('$') && argsSplit.length > 2) {
            if (argsSplit[1].match(/\$folder/g)) { // Check to see if the argument contains $folder (special case argument)
                startTransArg = argsSplit[0] + '.' + argsSplit[1];
                transArg = argumentLibraryRM[startTransArg] + '.' + argsSplit[2];
            }
        }
        if (!transArg) {
            transArg = arg;
        }
        return transArg + idxArg;
    },
    mapSettings: function (settings, inArgs, outArgs) {
        // settings: task settings to be filled out
        // inArgs: input arguments to be set, upon a select list change event
        // outArgs: output arguments to be set, upon a select list change event
        var setFilter = function (idx, item) {
            return setting === $(item).attr('name');
        };
        var setMap = function (item) {
            if ($(item).val() === settings[setting]) {
                $(item).attr('selected', 'selected').trigger('change', [inArgs, outArgs, true]);
            }
        };
        var setMapMulti = function (item) {
            if ((parseInt($(item).val(), 10) & settings[setting]) !== 0) {
                $(item).attr('selected', 'selected');
            }
        };
        var set;
        var setListMap = function (item, isLastItem) {
            var val = $(set).val() + item;
            if (!isLastItem) {
                val += '\n';
            }
            $(set).val(val);
        };
        var setting;
        var newRegionFound = false;
        for (setting in settings) {
            if (settings.hasOwnProperty(setting)) {
                // Region setting -- a special case
                if (setting === 'Region') {
                    newRegionFound = true;
                    var regionValues = settings[setting];
                    $('#task_editor input[name="Top"]').val(regionValues.Top);
                    $('#task_editor input[name="Left"]').val(regionValues.Left);
                    $('#task_editor input[name="Width"]').val(regionValues.Width);
                    $('#task_editor input[name="Height"]').val(regionValues.Height);
                    $('#task_editor input[name="Page"]').val(regionValues.Page);
                }
                // Find an element with the same name as the setting
                var collection = $('#task_editor div.task_template input, #task_editor div.task_template select, #task_editor div.task_template textarea,#task_editor #override_settings input:checkbox');
                set = $(collection).filter(setFilter);
                if (set.is('input')) {
                    if (set.attr('type') === 'text' || set.attr('type') === 'hidden') {
                        set.val(settings[setting]);
                    }
                    else if (set.attr('type') === 'radio') {
                        set.filter('[value="' + settings[setting] + '"]').prop('checked', true);
                    }
                    else if (set.attr('type') === 'checkbox') {
                        $(set).prop('checked', settings[setting]);
                    }
                } else if (set.is('select')) {
                    if (set.prop('multiple')) {
                        $.map(set.find('option'), setMapMulti);
                    }
                    else {
                        $.map(set.find('option'), setMap);
                    }
                } else if (set.is('textarea')) {
                    if (set.hasClass('isList')) {
                        var idx = 0;
                        var length = settings[setting] ? settings[setting].length : 0;
                        for (idx; idx < length; idx++) {
                            var item = settings[setting][idx];
                            setListMap(item, idx === length - 1);
                        }
                    } else {
                        set.val(settings[setting]);
                    }
                }
            }
        }
        TaskEditor.isLegacyRegion = !newRegionFound;
    },
    setupTasks: function (xml, selector) {
        // Map Tasks in xml to ui
        var tasks = $(xml).find('WFTaskDTO');
        $(selector).empty();
        if (tasks.length > 0 && $(xml).find('> ActionId').text() !== Constants.c.emptyGuid) {
            var sortedTasks = Workflow.sortBySequence(tasks);
            $(sortedTasks).map(function (key, item) {
                var taskName = $(item).find('> TaskClassName').text();
                var taskDescription = TaskEditor.getTaskDescription($(item));
                var taskText = taskDescription.td;
                var taskTitle = taskDescription.title;
                var taskData = TaskEditor.getStringifiedTaskData(taskName);
                var taskId = $(item).find('> Id').text();
                $(selector).append($('<li></li>')
                    .attr('class', 'no_text_select')
                    .append($('<span>&nbsp;</span>').addClass(window.taskData[taskName].Type + ' sPng'))
                    .append($('<span></span>')
                        .attr('name', 'Name')
                        .attr('TaskData', taskData)
                        .attr('title', taskTitle)
                        .text(taskText)
                        .val(taskName)
                    )
                    .append($('<input type="hidden" />')
                        .attr('class', 'ignore')
                        .attr('name', 'Id')
                        .val(taskId)
                    )
                );
            });
        }
    },
    // Fill Task editor
    getCurrentTaskData: function () {
        var taskName = $('#tasks :selected').val();
        if (taskName) {
            return window.taskData[taskName];
        }
    },
    fillTaskEditor: function (task) {
        var $taskTemplateContainer = $('#task_editor div.task_template');
        $taskTemplateContainer.empty();
        $('.task_template').off('keyup change paste', 'input[type="text"], input[role="textbox"]').on('keyup change paste', 'input[type="text"], input[role="textbox"]', TaskEditor.checkLengthInput);
        var taskData = JSON.parse($(task).attr('TaskData'));
        var taskUIKey = taskData.SettingsUIKey;

        var taskUIKeys = [];
        if (taskUIKey) {
            taskUIKeys = taskUIKey.split(',');
        }
        // fill args
        var customArgsIndex = taskUIKeys.indexOf(Constants.UtilityConstants.CUSTOM_ARGUMENTS_KEY);
        if (customArgsIndex === -1) {
            // Normal implementation of inputs and outputs
            var inArgs = TaskEditor.getArgumentsUI(Constants.c.inArgs, taskData.InArgMin, taskData.InArgMax);
            var outArgs = TaskEditor.getArgumentsUI(Constants.c.outArgs, taskData.OutArgMin, taskData.OutArgMax);
            $taskTemplateContainer.append(inArgs);
            $taskTemplateContainer.append(outArgs);
        }
        TaskEditor.renderTaskSettings(taskUIKeys, $taskTemplateContainer);
        var $testDiv = $('#testdiv');
        if ($testDiv && $testDiv.length > 0) {
            if (taskData.IsTestable) {
                $taskTemplateContainer.append($testDiv.html());
            }
            else {
                $testDiv.hide();
            }
        }
        //fill out task info
        TaskEditor.fillTaskInfo(task.val());
        var setSettingsMethod = TaskEditor['set' + taskData.TaskClassName + 'Settings'];
        Utility.executeCallback(setSettingsMethod, taskData.TaskClassName);
    },
    renderTaskSettings: function (taskUIKeys, $taskTemplateContainer) {
        var id = '';
        var settings = '';
        var i;
        var length = taskUIKeys.length;
        var template;
        for (i = 0; i < length; i++) {
            var key = taskUIKeys[i];
            var args = key.split(":");
            var uiKey = args[0];
            var arg;
            if (args.length > 1) {
                arg = args[1];
            }
            template = $('#WFDTT_' + uiKey).clone();
            if (TaskEditor[uiKey]) {
                TaskEditor[uiKey](id, key, settings, template, arg);
            }
            $taskTemplateContainer.append($(template).children());
        }
    },
    setComboBoxTaskSettings: function (taskClassName) { TaskEditor.setComboBoxDropDownTaskSettings(taskClassName); },
    setDropDownTaskSettings: function (taskClassName) { TaskEditor.setComboBoxDropDownTaskSettings(taskClassName); },
    setComboBoxDropDownTaskSettings: function (taskClassName) {
        var $el = $('#task_editor');
        $el.find('div.task_template').find(".radiodatalink").click(function (event) {
            TaskEditor.toggleComboBoxDropDownLists(event, taskClassName);
        });
        $el.find('div.task_template').find(".radiolist").click(function (event) {
            TaskEditor.toggleComboBoxDropDownLists(event, taskClassName);
        });
        var ev = new $.Event();
        ev.currentTarget = $el.find('.radiodatalink');
        TaskEditor.toggleComboBoxDropDownLists(ev, taskClassName);
    },
    toggleComboBoxDropDownLists: function (ev, taskClassName) {
        var $targ = $(ev.currentTarget);
        var $el = $('#task_editor');
        if ($targ.hasClass('radiodatalink')) {
            $el.find("input[name='ListName']").val("").prop("disabled", true);
            $el.find("input[name='UserCanAddToList']").prop("checked", false).prop("disabled", true);
            if (taskClassName === "DropDownTask") {
                $el.find("select[name='DataLinkDropdown']").prop('disabled', false);
            }
            if (taskClassName === "ComboBoxTask") {
                $el.find("select[name='DataLinkTypeAhead']").prop('disabled', false);
            }
        }
        else if ($targ.hasClass('radiolist')) {
            $el.find("input[name='ListName']").prop('disabled', false);
            $el.find("input[name='UserCanAddToList']").prop('disabled', false);
            if (taskClassName === "DropDownTask") {
                $el.find("select[name='DataLinkDropdown']").val("").prop("disabled", true);
            }
            if (taskClassName === "ComboBoxTask") {
                $el.find("select[name='DataLinkTypeAhead']").val("").prop("disabled", true);
            }
        }
        $targ.prop('checked', true);
    },
    setSendNotificationTaskSettings: function (TaskClassName) {
        var $taskeditorattachmentSettings = $('#task_editor div.task_template').find("#fieldsetattachmentSettings");
        $taskeditorattachmentSettings.find("input[type='checkbox'],[type='radio']").prop("disabled", true).prop("checked", false);
        $('#task_editor div.task_template').find("input[name='attachDocument']").click(function () {
            if ($(this).is(':checked') || $('#task_editor div.task_template').find("input[name='allow']").is(':checked')) {
                TaskEditor.setSendNotificationAttchmentSettings(true);
            }
            else {
                TaskEditor.setSendNotificationAttchmentSettings(false);
            }
        });
        $('#task_editor div.task_template').find("input[name='allow']").click(function () {
            if ($(this).is(':checked') || $('#task_editor div.task_template').find("input[name='attachDocument']").is(':checked')) {
                TaskEditor.setSendNotificationAttchmentSettings(true);
            }
            else {
                TaskEditor.setSendNotificationAttchmentSettings(false);
            }
        });
        $taskeditorattachmentSettings.find(".notificationnative").click(function () {
            $taskeditorattachmentSettings.find("input[name='IncludeRedactions'],input[name='IncludeAnnotations']").prop("disabled", true).prop("checked", false);

        });
        $taskeditorattachmentSettings.find(".notificationpdf").click(function () {
            $taskeditorattachmentSettings.find("input[name='IncludeRedactions'],input[name='IncludeAnnotations']").prop('disabled', false);
        });
    },
    setSendNotificationAttchmentSettings: function (enableAttchmentSettings) {
        var $taskeditorattachmentSettings = $('#task_editor div.task_template').find("#fieldsetattachmentSettings");
        if (!enableAttchmentSettings) {
            $taskeditorattachmentSettings.find("[type='radio'],[type='checkbox']").prop("disabled", true).prop("checked", false);
        }
        else {
            if (!$(".notificationpdf").is(':checked')) {
                $(".notificationnative").prop("checked", true);
            }
            $taskeditorattachmentSettings.find("[type='radio']").prop('disabled', false);
        }
    },
    setSetFieldGroupValuesTaskSettings: function (TaskClassName) {
        $('#task_editor div.item div.SelectorAboveArgumentsHeader .ui-icon-refresh').trigger('click');
    },
    testTask: function (task) {
        var taskName = $('#tasks').find(':selected').val();
        var taskXML = TaskEditor.newTaskXML;
        if (!taskXML) {
            taskXML = Workflow.fetchNewTask(taskName);
        }
        $(taskXML).find('TaskClassName').text(taskName);
        $(taskXML).find('Settings').text(TaskEditor.getSettings());
        var tmp_xml = Workflow.x2s(taskXML).replace(/^<root/, '<root xmlns:i="http://www.w3.org/2001/XMLSchema-instance" ').replace(/xmlns:NS\d+="" +NS\d+:/g, '');
        var xml_data = { workflowXML: encodeURIComponent(tmp_xml) };
        $('#task_editor').find('span[name="txttestResult"]').text("");
        var sf = function (result) {
            if (result === undefined) {
                result = false;
            }
            $('#task_editor').find('span[name="txttestResult"]').text((result === "" || result === " ") ? Constants.c.noResult : result);
        };
        var ff = function (jqxhr, textStatus, messageObj) {
            var func = function () {
                ErrorHandler.popUpMessage(messageObj);
            };
            setTimeout(func, 1000);
        };
        Workflow.proxy.testTask(xml_data, sf, ff);
    },
    fillTaskInfo: function (task_name) {
        var txml = $(Workflow.helpXml).find('task[name="' + task_name + '"]');

        var taskinfo = $('<fieldset></fieldset>')
            .addClass('taskInfo')
            .append($('<legend></legend>')
                .addClass('taskInfoToggle')
                .text(Constants.t('taskInfo')
                ).append(
                    $('<span></span>').addClass('ui-icon ui-icon-minus')
                )
            );
        var tasklong = TaskEditor.stripSpaces(txml.find('long').text());
        taskinfo.append($('<p></p>').html('<b>' + Constants.t('description') + ': </b>' + tasklong));
        //add inputs (if applicable)
        var inputs = txml.find('input');
        var i_len = inputs.length;
        var i = 0;
        if (i_len) {
            //TODO add notification if this task accepts multiple outputs.  
            for (i; i < i_len; i++) {
                taskinfo.append($('<p></p>').append('<b>' + Constants.t('input') + ': </b>' + TaskEditor.stripSpaces($(inputs[i]).text())));
            }
        }
        //add outputs (if applicable)
        var outputs = txml.find('output');
        var o_len = outputs.length;
        var o = 0;
        if (o_len) {
            //TODO add notification if this task accepts multiple outputs.
            for (o; o < o_len; o++) {
                taskinfo.append($('<p></p>').append('<b>' + Constants.t('output') + ': </b>' + TaskEditor.stripSpaces($(outputs[o]).text())));
            }
        }
        //add each setting with name
        var settings = txml.find('setting');
        var s_len = settings.length;
        var s = 0;
        if (s_len) {
            for (s; s < s_len; s++) {
                //get setting name
                var s_name = Constants.c[$(settings[s]).attr('name')];
                if (!s_name) {
                    s_name = $(settings[s]).attr('name');
                }
                taskinfo.append($('<p></p>').append('<b>' + Constants.t('setting') + ' <i>' + s_name + '</i>: </b>' + TaskEditor.stripSpaces($(settings[s]).text())));
            }
        }

        var event = $.Event('click');
        event.currentTarget = taskinfo.find('.taskInfoToggle');
        event.data = {
            manuallyTriggered: true
        };
        this.toggleInfo(event);

        $('#task_editor div.task_template').append(taskinfo);
    },
    // Fill out Task Library
    fillTaskLibrary: function (taskTypeCount, editTaskName, actionType) {
        // Get selected item to be reset at the end
        actionType = ActionEditor.getActionType(ActionEditor.newActionXML) || actionType || 1; // If there is no Action Type default it to 1
        TaskEditor.isProgamattic = true;
        var selected = $('#tasks').find(':selected');
        var tasksLib = $('#tasks_lib');
        var tasksSel = $('#tasks');
        tasksLib.empty();
        tasksSel.empty();
        var actionTasks = $('#action_tasks');
        var allTasks = [];
        var task;
        var disabled = false;
        var disabledMsg = '';
        $('#tasks').append($('<optgroup class="auto_tasks" label="Auto"></optgroup'));
        var autoTask, clientTask, uiTask;
        var allData = window.allData;
        for (autoTask in allData.AutoTasks) {
            if (allData.AutoTasks.hasOwnProperty(autoTask)) {
                var autoTaskData = allData.AutoTasks[autoTask];
                if ((Workflow.advancedWf || !autoTaskData.IsAdvanced) && Utility.checkSAT(autoTaskData.SupportedActionType, actionType)) {
                    disabled = false;
                    // Allow only 1 of certain tasks; disable it in the task list unless currently editing that specific task
                    if (editTaskName !== autoTaskData.TaskClassName && taskTypeCount[autoTaskData.TaskClassName] > 0 && Utility.hasFlag(autoTaskData.Flags, Constants.wftf.OnePerAction)) {
                        disabled = true;
                        disabledMsg = Constants.c.disabledTask_OnePerAction;
                    }
                    TaskEditor.appendTask(autoTaskData, 'auto_tasks', disabled, disabledMsg);
                    allTasks.push(autoTaskData);
                }
            }
        }
        //UI and Client tasks are only added to the draggable library if there are no tasks of the other type in the current actions task list.
        $('#tasks').append($('<optgroup class="client_tasks" label="Client"></optgroup'));
        for (clientTask in allData.ClientTasks) {
            if (allData.ClientTasks.hasOwnProperty(clientTask)) {
                var clientTaskData = allData.ClientTasks[clientTask];
                if ((Workflow.advancedWf || !clientTaskData.IsAdvanced) && Utility.checkSAT(clientTaskData.SupportedActionType, actionType)) {
                    disabled = false;
                    if (taskTypeCount.UI > 0) {
                        disabled = true;
                        disabledMsg = Constants.c.disabledTask_Client + ' ' + Constants.c.disabledTask;
                    }
                    // Allow only 1 of certain tasks; disable it in the task list unless currently editing that specific task
                    if (editTaskName !== clientTaskData.TaskClassName && taskTypeCount[clientTaskData.TaskClassName] > 0 && Utility.hasFlag(clientTaskData.Flags, Constants.wftf.OnePerAction)) {
                        disabled = true;
                        disabledMsg = Constants.c.disabledTask_OnePerAction;
                    }
                    TaskEditor.appendTask(clientTaskData, 'client_tasks', disabled, disabledMsg);
                    allTasks.push(clientTaskData);
                }
            }
        }
        $('#tasks').append($('<optgroup class="ui_tasks" label="User Input"></optgroup'));
        for (uiTask in allData.UITasks) {
            if (allData.UITasks.hasOwnProperty(uiTask)) {
                var uiTaskData = allData.UITasks[uiTask];
                if ((Workflow.advancedWf || !uiTaskData.IsAdvanced) && Utility.checkSAT(uiTaskData.SupportedActionType, actionType)) {
                    disabled = false;
                    if (taskTypeCount.Client > 0) {
                        disabled = true;
                        disabledMsg = Constants.c.disabledTask_UI + ' ' + Constants.c.disabledTask;
                    }
                    // Allow only 1 of certain tasks; disable it in the task list unless currently editing that specific task
                    if (editTaskName !== uiTaskData.TaskClassName && taskTypeCount[uiTaskData.TaskClassName] > 0 && Utility.hasFlag(uiTaskData.Flags, Constants.wftf.OnePerAction)) {
                        disabled = true;
                        disabledMsg = Constants.c.disabledTask_OnePerAction;
                    }
                    TaskEditor.appendTask(uiTaskData, 'ui_tasks', disabled, disabledMsg);
                    allTasks.push(uiTaskData);
                }
            }
        }
        allTasks = _.sortBy(allTasks, function (task) { return task.TaskClassName; });
        var length = allTasks.length;
        var i;
        for (i = 0; i < length; i++) {
            task = allTasks[i];
            var isUI = task.NeedsUserInput;
            var isClient = task.NeedsClientService;
            disabled = false;
            /*
             Disabled if: 
                action contains Client task and current task is UI, 
                action contains UI task and current task is Client, 
                or action already contains this task and only one is allowed per action
            */
            if (taskTypeCount.UI > 0 && isClient) {
                disabled = true;
                disabledMsg = Constants.c.disabledTask_Client + ' ' + Constants.c.disabledTask;
            }
            if (taskTypeCount.Client > 0 && isUI) {
                disabled = true;
                disabledMsg = Constants.c.disabledTask_UI + ' ' + Constants.c.disabledTask;
            }
            if (taskTypeCount[task.TaskClassName] > 0 && Utility.hasFlag(task.Flags, Constants.wftf.OnePerAction)) {
                disabled = true;
                disabledMsg = Constants.c.disabledTask_OnePerAction;
            }
            TaskEditor.appendTask(task, null, disabled, disabledMsg);
        }
        // Change selection of task
        tasksLib.delegate('li', 'mousedown', function (ev) {
            // Remove selection from previous targets
            actionTasks.find('.selected_task').removeClass('selected_task');
            tasksLib.find('.selected_task').removeClass('selected_task');
            // Select current target
            $(ev.currentTarget).addClass('selected_task');
        });

        // Able to drag from tasks library list, to a action tasks list. Maintaining original lists order and contents. Don't allow disabledTasks to be draggable.
        $('#tasks_lib li:not(".disabledTask")').draggable({
            containment: '#action_editor',
            connectToSortable: '#action_tasks',
            helper: 'clone',
            revert: 'invalid',
            start: function (event, ui) {
                $(ui.helper).css('z-index', 10);
            }
        });
        // Able to sort action tasks list
        actionTasks.sortable({
            axis: 'y',
            containment: 'parent',
            tolerance: 'pointer',
            revert: true,
            receive: function (event, ui) {
                // Upon receiving an item, set the properties if they weren't set already. (Happens for an empty list)
                actionTasks.sortable('option', 'containment', 'parent');
                actionTasks.sortable('option', 'axis', 'y');
                actionTasks.sortable('option', 'tolerance', 'pointer');
                actionTasks.sortable('option', 'revert', 'true');
                // Upon receiving an item scroll to its position in the list
                actionTasks.scrollTop($('#action_tasks li.selected_task').index() * 25);
                // Upon receiving an item open the task editor for editing that newly added task
                task = actionTasks.find('.selected_task');
                $(task).append($('<input/>').attr('type', 'hidden').attr('name', 'Sequence').val($(task).index() + 1));
                TaskEditor.dropped = true;
                $('#tasks_lib').find('.selected_task').removeClass('selected_task');
                TaskEditor.showTaskEditor($(ui.item));
            }
        });
        // reset to previously selected item
        var taskData = selected.attr('taskdata');
        if (taskData) {
            var data = JSON.parse(taskData);
            _.each($('#tasks option'), function (item) {
                var itemData = $(item).attr('taskdata');
                if (itemData) {
                    var iData = JSON.parse(itemData);
                    if (iData.TaskClassName === data.TaskClassName) {
                        $(item).attr('selected', 'selected');
                    }
                }
            });
        }
        TaskEditor.isProgamattic = false;
    },
    // Fill out argument library
    fillArgsLibrary: function () {
        // Built in args
        var actionType = ActionEditor.getActionType(ActionEditor.newActionXML) || 1;
        var argLib = $('#args_lib');
        argLib.empty();
        var arg;
        var args = window.argumentLibrary;
        var argArr = [];
        for (arg in args) {
            if (args.hasOwnProperty(arg) && Utility.checkSAT(args[arg].SupportedActionType, actionType)) {
                // push to an array to ensure order by name
                argArr.push({
                    argument: {
                        argName: arg,
                        argData: args[arg]
                    }
                });
            }
        }
        // sort array by argument name
        argArr = argArr.sort(function (a, b) {
            var aName = a.argument.argName;
            var bName = b.argument.argName;
            if (aName < bName) {
                return -1;
            }
            if (aName > bName) {
                return 1;
            }
            return 0;
        });
        var i = 0;
        var length = argArr.length;
        for (i; i < length; i++) {
            var argument = argArr[i].argument;
            var argData = argument.argData;
            var argName = argument.argName;
            argLib.append($('<li></li')
                .append($('<span></span>')
                    .attr('name', 'Name')
                    .attr('title', argName)
                    .text(argName)
                    .val(argData.Name)
                )
                .append($('<input type="hidden" />')
                    .attr('name', 'ReadOnly')
                    .val(argData.ReadOnly)
                )
            );
        }
    },
    getSettings: function () {
        var settings = DTO.getDTO('#task_editor div.task_template');
        // Make Region a single setting if present and not legacy
        if (settings.Top && !TaskEditor.isLegacyRegion) {
            settings.Region = {
                Left: settings.Left,
                Top: settings.Top,
                Width: settings.Width,
                Height: settings.Height,
                Page: settings.Page
            };
            delete settings.Left;
            delete settings.Top;
            delete settings.Width;
            delete settings.Height;
            delete settings.Page;
        }
        delete settings.LegacyRegion;
        if (settings) {
            settings = JSON.stringify(settings);
        }
        return settings;
    },
    // getTaskData: Added back in to support getting task data for content type sync action editing (currently ocr/barcode tasks)
    getTaskData: function (taskName) {
        var taskData;
        var test_value = taskName;
        var allData = window.allData;
        var task = $(allData.AutoTasks).filter(function (idx, t) {
            return t.TaskClassName === test_value;
        });
        if (task.length <= 0) {
            task = $(allData.ClientTasks).filter(function (idx, t) {
                return t.TaskClassName === test_value;
            });
        }
        if (task.length <= 0) {
            task = $(allData.UITasks).filter(function (idx, t) {
                return t.TaskClassName === test_value;
            });
        }
        taskData = JSON.stringify(task[0]);
        return taskData;
    },
    getStringifiedTaskData: function (taskName) {
        var taskData = JSON.stringify(window.taskData[taskName]);
        return taskData;
    },
    getTaskDescription: function (task) {
        // Obtain the description to be displayed for the task in the action editor
        // TODO: scain make td an array and push elements into it, for truncating determine longest element and truncate it down by the number of chars needed to reach maximum, intelligent truncation
        var td = '';
        var title = '';
        var taskClassName = task.find('TaskClassName').text(); // get actual task class name

        var taskName = Constants.c[taskClassName]; // get name of task to display to user
        var i, length;
        var taskData = window.taskData[taskClassName];
        if (!taskData) {
            return taskName; // if there is no task data just return the task name
        }
        td = taskName + ': ';
        var descriptionFormat = taskData.DescriptionFormat; //  get the formatting for the task description
        var settings = $(task.find('Settings')).text(); //  get the settings for the task
        if (settings) {
            settings = JSON.parse(settings);
        } else {
            settings = {};
        }
        var descFormatRegEx = /\[\W*\w*\W*\]|\s\W*\w*\W*\s|\[\w*\:\w*\]|\[f\-\w*\:\w*\]/ig; // get each part of the description format
        var inArgRegEx = /\[i\]/ig; // Find any [i]
        var outArgRegEx = /\[o\]/ig; // Find any [o]
        var invSetRegEx = /\[\!\:\w*\]/ig; // Find any !:(settingName)
        var reqSetRegEx = /\[\*\:\w*\]/ig; // Find any *:(settingName)
        var preSetRegEx = /\[\w*\:\w*\]|\[f\-\w*\:\w*\]/ig; // Find any (prefix):(settingName)
        var dispSetRegEx = /[^oi\*\!\:\[\]\s\-\>]\w*/g; // Find any setting name
        var pfxRegEx = /\w*\:+/ig; // Find any prefix
        var postFixRegEx = /\:+\w*/ig; // Find any postfix
        var flaggedEnumRegEx = /f\-\w*\:+/ig; // Determine whether enum is flagged or not
        var descFormat = descriptionFormat.match(descFormatRegEx); // Split description format into each part, based on regex above
        var setDesc, isFlagged, pfx;
        var inDesc = TaskEditor.getArgDescription(task, 'InArgNames');
        var outDesc = TaskEditor.getArgDescription(task, 'OutArgNames');
        length = descFormat.length;
        for (i = 0; i < length; i++) { // Loop over descFormat, order the description should appear in, format the description as specified
            var desc = descFormat[i];
            if (desc.match(inArgRegEx)) { // is an input argument (display each input concatted with ', ')                
                td += inDesc;
            } else if (desc.match(outArgRegEx)) { // is an output argument (display each output concatted with ', ')  
                if (!outDesc) { // Remove ' -> ' if there are no OutArgs to display
                    td = td.replace(' -> ', '');
                }
                td += outDesc;
            } else if (desc.match(invSetRegEx)) { // !, if the setting value is non-false, non-null, non-empty, else nothing
                setDesc = desc.match(dispSetRegEx);
                if (setDesc) { // Setting name
                    if (settings[setDesc]) {
                        td += '! ';
                    }
                }
            } else if (desc.match(reqSetRegEx)) { // *, if the setting value is non-false, non-null, non-empty, else nothing
                setDesc = desc.match(dispSetRegEx);
                if (setDesc) { // Setting name
                    if (settings[setDesc]) {
                        td += '* ';
                    }
                }
            } else if (desc.match(preSetRegEx)) { // prefix followed by a setting name (enum prefix, possibly flagged)
                pfx = desc.match(pfxRegEx); // Obtain prefix
                setDesc = desc.match(postFixRegEx);
                isFlagged = desc.match(flaggedEnumRegEx);
                if (setDesc.length > 0 && pfx.length > 0) {
                    pfx = pfx[0].replace(':', '');
                    setDesc = setDesc[0].replace(':', '');
                    setDesc = settings[setDesc];
                    setDesc = TaskEditor.getEnumDescription(Constants[pfx], setDesc, isFlagged);
                    td += setDesc.join(', ');
                }
            } else if (desc.match(dispSetRegEx)) { // get setting name from description format, translate to display in UI
                setDesc = desc.match(dispSetRegEx);
                if (setDesc) { // Setting name
                    td += settings[setDesc];
                }
            } else { // Just a string at this point, add to description to be displayed (
                td += desc;
            }
        }
        length = td.length;
        title = td;
        var tooLong = '';
        if (length > 55) { // Limit the task data presented to 55 chars and ellipses '...'
            tooLong = td.substring(0, 52);
            tooLong += Constants.c.ellipses;
            td = tooLong;
        }
        // TODO: scain possibly have title only display the un-truncated version of td
        title = TaskEditor.getTitleDescription(inDesc, outDesc, settings);
        return { td: td, title: title };
    },
    getTitleDescription: function (inDesc, outDesc, settings) {
        // Obtain entire dump of InArgs, OutArgs, and Settings
        var title = [];
        var trans;
        if (inDesc) {
            title.push(' ' + Constants.c.inArgs + ': ' + inDesc);
        }
        if (outDesc) {
            title.push(' ' + Constants.c.outArgs + ': ' + outDesc);
        }
        var set;
        var setting;
        var enumTmp = [];
        var allData = window.allData;
        for (setting in settings) {
            if (settings.hasOwnProperty(setting)) {
                trans = Constants.c['set_' + setting];
                set = settings[setting];
                if (trans) {
                    switch (setting) {
                        case 'OpCode':
                            if (Constants.sop[set]) { // string operation
                                set = Constants.c['sop_' + set];
                            } else { // math operation
                                set = Constants.c['mop_' + set];
                            }
                            break;
                        case 'CleanupOptions':
                            // Flagged Enum
                            enumTmp = TaskEditor.getEnumDescription(Constants.co, set, true);
                            set = enumTmp.join(', ');
                            break;
                        case 'Permissions':
                            // Flagged Enum
                            enumTmp = TaskEditor.getEnumDescription(Constants.sp, set, true);
                            set = enumTmp.join(', ');
                            break;
                        case 'ContentType':
                            set = allData.ContentTypes[set];
                            break;
                        case 'Comparison':
                            set = Constants.c['cm_' + set];
                            break;
                        case 'SecurityClassId':
                            if (!set) { // Is null set to ''
                                set = '';
                            } else if (set === Constants.c.emptyGuid) { // Empty guid corresponds to (inherit)
                                set = Constants.c.inheritOption;
                            } else {
                                set = allData.SecurityClasses[set]; // Name for security class id
                            }
                            break;
                        case 'Type':
                            set = Constants.c['ty_' + set];
                            break;
                        case 'SplitMethod':
                            set = Constants.c['set_' + set];
                            break;
                    }
                    title.push(' ' + trans + ': ' + set);
                }
            }
        }
        return title.join(', ');
    },
    getEnumDescription: function (collection, value, flagged) {
        var tmp = [];
        if (!value) {
            value = 0;
        }
        value = parseInt(value, 10);
        if (flagged) { // Don't add a 'None' (0-property enum value if a value exists
            var item;
            for (item in collection) {
                if (collection.hasOwnProperty(item)) {
                    if ((value | collection[item]) === value) {
                        if ((value !== 0 && collection[item] !== 0) || value === 0) {
                            tmp.push(item);
                        }
                    }
                }
            }
        } else {
            tmp.push(collection[value]);
        }
        return tmp;
    },
    getArgDescription: function (task, argType) {
        // Used to obtain description for input args to display in UI
        // task: task containing the data to use for description
        // argType: 'InArgNames' for input args, 'OutArgNames' for output args
        var argSelector = '.InputArgDropTarget';
        if (argType === 'OutArgNames') {
            argSelector = '.OutputArgDropTarget';
        }
        var revArgs = Utility.reverseMapObject(window.argumentLibrary, 'Name');
        var desc = '';
        var argVals;
        var i;
        var length, trans;
        var transArgVals = [];
        var args = task.find(argType).text();
        if (args) {
            argVals = JSON.parse(args);
            length = argVals.length;
            for (i = 0; i < length; i++) {
                trans = revArgs[argVals[i]]; //  translate arg for display in UI
                if (trans) {
                    transArgVals.push(trans); //  if the translation exists
                } else {
                    if (argVals[i].startsWith('$')) { // currently only $doc.$folders.a/ (folders for removing from folders, will need this)
                        var a = argVals[i].split('.');
                        if (a.length > 1) {
                            trans = a.splice(0, 2).join('.');
                            trans = revArgs[trans] + '.' + a.join('');
                        }
                    }
                    if (trans) {
                        transArgVals.push(trans); //  if the translation exists
                    } else {
                        transArgVals.push(argVals[i]); // if there is no translation, meaning it is a literal/parameter
                    }
                }
            }
            desc += transArgVals.join(', ');
        }
        return desc;
    },
    stripSpaces: function (s, ignoreBreaks) {
        var breaks = '<br/>';
        if (ignoreBreaks) {
            breaks = '';
        }
        s = s.replace(/[\t ]+/g, ' ');
        return $.trim(s.replace(/\n /g, breaks)); //newlines without <pre> tags :(...can't this of a better way.  
    },
    // Append task to select list or library depending on if task type is passed in
    appendTask: function (task, groupType, disabled, disabledMessage) {
        // task: the task to append to the UI, either a select list (with optgroups) or a drag and drop list, depending on if groupType is present
        // groupType: selector for the option group (.ui_tasks, .auto_tasks, .client_tasks)
        // disabled: is the task disabled
        // disabledMessage: should be specified if the task is disabled
        var taskName = task.TaskClassName;
        var taskHelp = TaskEditor.stripSpaces($(Workflow.helpXmlPointers[task.TaskClassName]).find('long').text(), true);
        var disabledClass = '';
        if (disabled) { // Add a disabled message to the task, to show why it is disabled
            disabledClass = 'disabledTask';
            if (disabledMessage) {
                taskHelp = disabledMessage + ' (' + taskHelp + ')'; // UI option Bug 10229; the tooltip with all this gets pretty wordy.
            }
        }
        task = JSON.stringify(task);
        var taskData = window.taskData;
        if (Constants.c[taskName]) {
            if (groupType) {
                $('#tasks ' + '.' + groupType).append($('<option></option')
                    .attr('title', taskHelp)
                    .text(Constants.c[taskName])
                    .addClass(taskData[taskName].Type + ' sPng')
                    .val(taskName)
                    .attr('TaskData', task)
                    .prop('disabled', !!disabled)
                );
            } else {
                $('#tasks_lib').append($('<li></li>')
                    .attr('title', taskHelp)
                    .attr('class', 'no_text_select')
                    .addClass(disabledClass)
                    .append($('<span>&nbsp;</span')
                        .addClass(taskData[taskName].Type + ' sPng')
                    )
                    .append($('<span></span>')
                        .addClass(taskName)
                        .text(Constants.c[taskName])
                        .val(taskName)
                        .attr('TaskData', task)
                    )
                );
            }
        } else {
            Utility.OutputToConsole(taskName);
        }
    },
    showTaskEditor: function (task) {
        var taskName = $(task).find('span:last').text();
        var taskClassName = $(task).find('span:last').val();
        var that = this;
        $('#args_lib li').removeClass('selected_arg').removeClass('selected_readOnlyArg');
        if (taskName) {
            TaskEditor.fillTaskLibrary(ActionEditor.getTaskTypeCount(), taskClassName);
            $('#task_editor').dialog('option', 'title', Constants.c.taskEditor + ': ' + Utility.safeHtmlString(taskName));
        } else {
            TaskEditor.incrementTaskTypeCounts();
            $('#task_editor').dialog('option', 'title', Constants.c.taskEditor);
        }
        TaskEditor.fillArgsLibrary();
        // Able to drag from tasks library list, to a action tasks list. Maintaining original lists order and contents.
        if ($('#args_lib li').draggable('instance')) {
            $('#args_lib li').draggable('destroy');
        }
        $('#args_lib li').draggable({
            containment: '#task_editor',
            helper: 'clone',
            revert: 'invalid',
            start: function (event, ui) {
                $(ui.helper).css('z-index', 10);
            }
        });
        if (!TaskEditor.hasShown) {
            // event handlers for dynamic adjustment of Task Editor UI
            var argsLib = $('#args_lib');
            TaskEditor.displayTaskKey('#task_editor');
            // Change event for selecting a task in the task editor
            $('#tasks').bind('change', function (e) {
                if (TaskEditor.isProgamattic) {
                    return;
                }
                if (!TaskEditor.editingTask) {
                    TaskEditor.addTask($(e.currentTarget).find(':selected'));
                }
                $('#taskType').attr('class', $('#tasks').find(':selected').attr('class'));

                TaskEditor.fillTaskEditor($(e.currentTarget).find(':selected'));
                TaskEditor.setInandOutArguments();
            });
            $('#task_editor').on('click', '.taskInfoToggle', function (e) { // Used for showing / hiding the task information
                that.toggleInfo(e);
            });
            $('#task_editor').on('click', 'input[name="MustExist"]', function (e) {
                // Toggle showing / hiding the security class if must exist is checked or not
                var targ = $(e.target);
                var taskEditor = $(document.getElementById('task_editor'));
                var secClass = taskEditor.find('select[name="SecurityClassId"]');
                if (secClass.length > 0) {
                    if (targ.prop('checked')) { // If it is checked hide the security class                        
                        secClass.parent('.item').hide();
                    } else { // Otherwise show the security class
                        secClass.parent('.item').show();
                    }
                }
            });
            // Change selection of task
            argsLib.delegate('li', 'mousedown', function (ev) {
                argsLib.find('.selected_arg').removeClass('selected_arg');
                argsLib.find('.selected_readOnlyArg').removeClass('selected_readOnlyArg');
                // Select current target
                if ($(ev.currentTarget).find('input[name="ReadOnly"]').val() === 'true' ||
                    $(ev.currentTarget).find('input[name="ReadOnly"]').val() === true) {
                    $(ev.currentTarget).addClass('selected_readOnlyArg');
                } else {
                    $(ev.currentTarget).addClass('selected_arg');
                }
            });
            $('#task_editor').delegate('.sel_reg', 'click', function (ev) {
                // Get Region dialog
                $('#get_region').dialog('open');
            });
            $('#get_region').delegate('.header a.custom_button', 'click', function () {
                var text = $('#get_region .header > input').val();
                TaskEditor.searchModel.reset();
                TaskEditor.searchModel.setDotted('Request.IncludeFolders', false);
                TaskEditor.searchModel.setDotted('Request.IncludeInboxes', false);
                TaskEditor.searchModel.setDotted('Request.IncludeDocuments', true);
                TaskEditor.searchModel.setDotted('Request.TextCriteria', text);
                TaskEditor.searchModel.fetch();
            });
            $('#get_region').on('keyup', '.header > input', function (ev) {
                if (ev.which === 13) {
                    var text = $(ev.currentTarget).val();
                    TaskEditor.searchModel.reset();
                    TaskEditor.searchModel.setDotted('Request.IncludeFolders', false);
                    TaskEditor.searchModel.setDotted('Request.IncludeInboxes', false);
                    TaskEditor.searchModel.setDotted('Request.IncludeDocuments', true);
                    TaskEditor.searchModel.setDotted('Request.TextCriteria', text);
                    TaskEditor.searchModel.fetch();
                }
            });
            $('body').on('keyup', function (ev) {
                if (ev.which === 46) {
                    TaskEditor.documentImageView.recognition.setRegionValues({});
                    TaskEditor.documentImageView.recognition.initAreaSelect();
                    TaskEditor.documentImageView.recognition.lasso('region');
                }
            });
            TaskEditor.hasShown = true;
        }
        $('#task_editor').dialog('open');
        if (!TaskEditor.editingTask && task) {
            // Get new task with task class name
            TaskEditor.addTask(task);
        } else if (task) {
            TaskEditor.selectTask(task);
        } else {
            task = $('#tasks_lib li').first(); // Use First item in the task library as default for adding a task
            TaskEditor.addTask(task);
        }
        $('#taskType').attr('class', $('#tasks').find(':selected').attr('class')); // Set the type of the task (UI, Auto, Client) upon opening the task editor        
        TaskEditor.setInandOutArguments();

    },
    setInandOutArguments: function () {
        var inTaskArgs = $('#task_editor .taskArguments input.InputArgDropTarget');
        var outTaskArgs = $('#task_editor .taskArguments input.OutputArgDropTarget');
        var inAccept = 'li.selected_readOnlyArg, li.selected_arg';
        var outAccept = 'li.selected_arg';
        TaskEditor.dragAndDropArg(inTaskArgs, inAccept);
        TaskEditor.dragAndDropArg(outTaskArgs, outAccept);
    },
    // Dragging and dropping of argument library items into input/output argument inputs
    // Accept needs to be a draggable element
    dragAndDropArg: function (argsSelector, accept) {
        var argText = '';
        TaskEditor.autoComplete(argsSelector, window.argumentLibrary);
        argsSelector.droppable({
            accept: accept,
            activate: function (event, ui) {
                $(this).addClass('arg_border');
            },
            deactivate: function (event, ui) {
                $(this).removeClass('arg_border');
            },
            drop: function (event, ui) {
                // Make inputs text equivalent to dropped items text
                argText = $(ui.helper).find('span[name="Name"]').text();
                $(this).val(argText);
                $(this).change();
            }
        });
    },
    autoComplete: function (inputSelector, tagObj) {
        var actionType = ActionEditor.getActionType(ActionEditor.newActionXML) || 1;
        var tagList = [];
        var i;
        var tagText;
        for (tagText in tagObj) {
            if (tagObj.hasOwnProperty(tagText) && Utility.checkSAT(tagObj[tagText].SupportedActionType, actionType)) {
                if (!inputSelector.hasClass('OutputArgDropTarget') || !tagObj[tagText].ReadOnly) {
                    tagList.push(tagText);
                }
            }
        }
        if (inputSelector.hasClass('InputArgDropTarget')) {
            var length = window.allData.Workflows.length;
            var users = Workflow.getUsers();
            var item;
            for (i = 0; i < length; i++) {
                tagList.push('"' + window.allData.Workflows[i].Name + '"');
            }
            length = users.length;
            for (i = 0; i < length; i++) {
                tagList.push('"' + users[i].name + '"');
            }
            for (item in window.allData.Inboxes) {
                if (window.allData.Inboxes.hasOwnProperty(item)) {
                    tagList.push('"' + window.allData.Inboxes[item] + '"');
                }
            }
            for (item in window.allData.ContentTypes) {
                if (window.allData.ContentTypes.hasOwnProperty(item)) {
                    tagList.push('"' + window.allData.ContentTypes[item] + '"');
                }
            }
            for (item in window.allData.SecurityClasses) {
                if (window.allData.SecurityClasses.hasOwnProperty(item)) {
                    tagList.push('"' + window.allData.SecurityClasses[item] + '"');
                }
            }
            for (item in window.allData.Roles) {
                if (window.allData.Roles.hasOwnProperty(item)) {
                    tagList.push('"' + window.allData.Roles[item] + '"');
                }
            }
            tagList = _.uniq(tagList);
        }
        $(inputSelector).autocomplete({
            source: tagList,
            open: function (event, ui) {
                $('.ui-autocomplete').scrollTop(0);
            }
        });
    },
    saveTaskEditor: function () { // returns false on failure to save        
        try {
            if ($('#task_editor .' + css.warningErrorClass).length !== 0) {
                //do not save if there are errors showing.  
                alert(Constants.c.errorFixMessage);
                return false;
            }
            TaskEditor.createTask();
            TaskEditor.updateTask();
            return true;
        } catch (e) {
            TaskEditor.errorHandler(e);
            return false;
        }
    },
    ///<summary>
    /// Handle any errors generated via saving the task editor
    ///</summary>
    ///<param name="error">error object with a message, or just a string that is the message to be displayed.
    errorHandler: function (error) {
        var msg = error;
        if (error.message) {
            msg = error.message;
        }
        if (msg !== Constants.c.wfSaveCanceled) {
            ErrorHandler.addErrors(msg);
        }
    },
    enumOptionChanged: function (eventTarget) {
        var selectedValue = parseInt($(eventTarget).val(), 10);
        var options = $(eventTarget).parent().parent().siblings('input.enumValue');
        var currentValue = parseInt(options.val(), 10);
        if ($(eventTarget).prop('checked')) {
            currentValue |= selectedValue;
        } else {
            currentValue &= ~selectedValue;
        }
        options.val(currentValue);
    },
    //#region Fill out select lists
    fillType: function (template) {
        // fill out Type select
        var type;
        var types = Constants.ty;
        for (type in types) {
            if (types.hasOwnProperty(type)) {
                var text = Constants.c['ty_' + type];
                if (text && text !== Constants.c.ty_Object) {
                    // Default to text for UI tasks
                    if (type === Constants.c.string) {
                        template.find('select[name="Type"]').append($('<option></option>').text(text).val(type).attr('selected', 'selected'));
                    } else {
                        template.find('select[name="Type"]').append($('<option></option>').text(text).val(type));
                    }
                }
            }
        }
    },
    fillContentType: function (template, appendCurrent) {
        // fill out Content Type select
        var $select = template.find('select[name="ContentType"]');
        var option;
        if (appendCurrent) {
            option = document.createElement('option');
            option.textContent = Constants.c.splitTaskBlankContentType;
            option.value = Constants.c.emptyGuid;
            $select.append(option);
        }
        var ctId;
        for (ctId in window.allData.ContentTypes) {
            if (window.allData.ContentTypes.hasOwnProperty(ctId)) {
                option = document.createElement('option');
                option.textContent = window.allData.ContentTypes[ctId];
                option.value = ctId;
                $select.append(option);
            }
        }
    },
    fillSecurityClass: function (template) {
        // fill out security class select
        var sortSecClasses = _.map(window.allData.SecurityClasses, function (a, b) {
            return { id: b, value: a };
        });
        sortSecClasses.sort(function (a, b) {
            return a.value.toLowerCase() > b.value.toLowerCase() ? 1 : -1;
        });
        var i;
        for (i = 0; i < sortSecClasses.length; i++) {
            template.find('select[name="SecurityClassId"]').append($('<option></option>').val(sortSecClasses[i].id).text(sortSecClasses[i].value));
        }
    },
    fillGroupValidationOptions: function (template) {
        var gvo;
        var gvos = Constants.gvo;
        for (gvo in gvos) {
            if (gvos.hasOwnProperty(gvo)) {
                var text = Constants.c['gvo_' + gvo];
                if (text && text !== Constants.c.gvo_None) {
                    template.find('select[name="CustomFieldGroupOptions"]').append($('<option></option>').text(text).val(gvos[gvo]));
                }
            }
        }
    },
    fillCustomFieldGroup: function (template, isOptional) {
        var length = window.allData.CustomFieldGroups.length;
        var count = 0;
        var $select = template.find('select[name="CustomFieldGroupId"]');
        if (isOptional) {
            $select.append($('<option></option>').val(null).html("&nbsp;"));
        }
        for (count; count < length; count++) {
            var customFieldGroup = window.allData.CustomFieldGroups[count].CustomFieldGroup;
            $select.append($('<option></option>').val(customFieldGroup.Id).text(customFieldGroup.Name));
        }
    },
    taskHasFlag: function (wftf) {
        var taskName = $('#tasks :selected').val();
        var taskData = window.taskData[taskName];
        return taskData && Utility.hasFlag(taskData.Flags, Constants.wftf.OutputToFieldGroup);
    },
    isFieldExistsInGroup: function () {
        if (window.allData.CustomFieldGroups) {
            if (this.taskHasFlag(Constants.wftf.OutputToFieldGroup)) {
                return false;
            }
            var outArgData = TaskEditor.getArgumentData('.OutputArgDropTarget');
            var argVals = Utility.tryParseJSON(outArgData.argVals, true);
            if (argVals.length > 0) {
                var outputIdx;
                for (outputIdx = 0; outputIdx < argVals.length; outputIdx++) {
                    var customFieldID = null;
                    var field = argVals[outputIdx].split('.');
                    if (field.length > 2 && field[1] === Constants.c.argFields) {
                        var customFields = window.allData.CustomFields;
                        var fieldValue = field[2];
                        var fieldItem;
                        for (fieldItem in customFields) {
                            if (customFields.hasOwnProperty(fieldItem) && customFields[fieldItem] === fieldValue) {
                                customFieldID = fieldItem;
                                break;
                            }
                        }
                        if (customFieldID) {
                            var grp;
                            for (grp in window.allData.CustomFieldGroups) {
                                if (window.allData.CustomFieldGroups.hasOwnProperty(grp)) {
                                    var customFieldGroupTemplate = window.allData.CustomFieldGroups[grp].CustomFieldGroupTemplates;
                                    var countGrpTemplate = 0;
                                    var lengthGrpTemplate = customFieldGroupTemplate.length;
                                    for (countGrpTemplate; countGrpTemplate < lengthGrpTemplate; countGrpTemplate++) {
                                        if (customFieldGroupTemplate[countGrpTemplate].CustomFieldMetaId === customFieldID) {
                                            return true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    },
    missingFields: function () {
        // reports any required fields that are missing
        var $requiredArgs = $('#task_editor div.taskArguments input~span.required').prev();
        var fields = [];
        var i;
        for (i = 0; i < $requiredArgs.length; i++) {
            var $arg = $requiredArgs.eq(i);
            if ($arg.val() === '') {
                fields.push($arg.prev().text());
            }
        }
        return fields.join(', ');
    },
    datalinkAjaxKey: true,
    fillDatalink: function (template) {
        var $dlSelect = template.find('select[name="Datalink"]');
        $dlSelect.prop('disabled', true);
        if (TaskEditor.datalinkAjaxKey) {
            TaskEditor.datalinkAjaxKey = false;
            // fill out data link select
            //TODO: scain made this SYNC for Bug 4062, fix it so it can be ASYNC
            $.ajax(Constants.Url_Base + 'DataLink/GetDataLinkQueries' + Workflow.getCacheBusterStr(), {
                async: false,
                type: 'get',
                success: function (res, status) {
                    if (res.status === 'ok') {
                        window.allData.Datalinks = res.result;
                        TaskEditor.fillDatalinkWithData(template);
                    } else {
                        ErrorHandler.addErrors(res.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    }
                },
                complete: function () {
                    TaskEditor.datalinkAjaxKey = true;
                }
            });
        }
    },
    fillDatalinkWithData: function (template) {
        var dataLink,
            dataLinks = window.allData.Datalinks,
            len = dataLinks.length,
            j = 0,
            dlSelect = template.find('select[name="Datalink"]');
        dlSelect.empty();
        dlSelect.append($('<option></option>'));//blank option

        if (len > 0) {
            for (j; j < len; j += 1) {
                dataLink = dataLinks[j];
                dlSelect.append($('<option></option>').text(dataLink.Name).attr('datalinkData', (JSON.stringify(dataLink))).val(dataLink.Id));
            }
            dlSelect.prop('disabled', false);
        }
    },
    //#endregion End filling out select lists
    //#region Workflow UI Tasks
    Type: function (id, key, settings, template) {
        TaskEditor.fillType(template);
    },
    // uniform method for creating two columns of checkboxes corresponding to distinct enum values
    createEnumSettings: function (optionDiv, enumPrefix, arg) {
        var markup;
        optionDiv.removeAttr('id');
        var option;
        var options = Constants[enumPrefix];
        var argN = parseInt(arg, 10);
        for (option in options) {
            if (options.hasOwnProperty(option)) {
                var text = Constants.c[enumPrefix + '_' + option];
                var intVal = options[option];
                if (text && intVal > 0 && (intVal & argN) === intVal) {
                    markup = '<div class="item enumSettings"> <span style="font-weight: normal;">' + text + '</span><input type="checkbox" value="' + intVal + '" /></div>';
                    optionDiv.append(markup);
                }
            }
        }
        var $enumSettings = optionDiv.find('.enumSettings');
        $enumSettings.off('change', 'input[type="checkbox"]').on('change', 'input[type="checkbox"]', function () {
            TaskEditor.enumOptionChanged(this);
        });
    },
    ImageCleanup: function (id, key, settings, template, arg) {
        var optionDiv = template.find("#WFDTT_ImageCleanup_Options");
        TaskEditor.createEnumSettings(optionDiv, "co", arg);
    },
    Permissions: function (id, key, settings, template, arg) {
        var optionDiv = template.find("#WFDTT_Permissions_Options");
        TaskEditor.createEnumSettings(optionDiv, "sp", arg);
    },
    ComboBoxTask: function (id, key, settings, template) {
        TaskEditor.createDataLinkDropDown(template, 'TypeAhead');
        var listNames = [];
        $.map(window.allData.CustomLists, function (list) {
            listNames.push(list.Name);
        });
        template.find('input[name="ListName"]').autocomplete({
            source: listNames,
            open: function (event, ui) {
                $('.ui-autocomplete').scrollTop(0);
            }
        });
    },
    DropDownTask: function (id, key, settings, template) {
        TaskEditor.createDataLinkDropDown(template, 'DropDown');
        var listNames = [];
        $.map(window.allData.CustomLists, function (list) {
            listNames.push(list.Name);
        });
        template.find('input[name="ListName"]').autocomplete({
            source: listNames,
            open: function (event, ui) {
                $('.ui-autocomplete').scrollTop(0);
            }
        });

    },
    /* UI Settings for Barcode Task */
    BarcodeOptions: function (id, key, settings, template) {
        var barcodeType = window.allData.RecognitionOptions.BarcodeType;
        var enhancement = window.allData.RecognitionOptions.Enhancement;
        Utility.fillBarcodeType(template.find('select[name="BarcodeType"]'), barcodeType);
        Utility.fillEnhancementOption(template.find('select[name="EnhancementOption"]'), enhancement);
    },
    SplitOnBarcodesTask: function (id, key, settings, template) {
        $selectMethod = template.find('select[name="SplitMethod"]');
        $selectMethod.change(function (e) {
            var $targ = $(e.currentTarget);
            var specificText = $targ.val() === 'SpecificBarcodeSeparator';
            $targ.parent().parent().find('input[name="Text"]').prop('disabled', !specificText);
        });
    },
    /* UI Settings for Verify Tasks */
    CompareVerifyTask: function (id, key, settings, template) {
        var type;
        var types = Constants.cm;
        for (type in types) {
            if (types.hasOwnProperty(type)) {
                var text = Constants.c['cm_' + type];
                if (text) {
                    // Default to text for UI tasks
                    if (text === Constants.c.cm_EQ) {
                        template.find('select[name="Comparison"]').append($('<option></option>').text(text).val(type).attr('selected', 'selected'));
                    } else {
                        template.find('select[name="Comparison"]').append($('<option></option>').text(text).val(type));
                    }
                }
            }
        }
    },
    MathTask: function (id, key, settings, template) {
        var operation;
        var operations = Constants.mop;
        for (operation in operations) {
            if (operations.hasOwnProperty(operation)) {
                var text = Constants.c['mop_' + operation];
                if (text) {
                    template.find('select[name="OpCode"]').append($('<option></option>').text(text).val(operation));
                }
            }
        }
        TaskEditor.fillCustomFieldGroup(template, true);
    },
    AggregateMathTask: function (id, key, settings, template) {
        var operation;
        var operations = Constants.amop;
        for (operation in operations) {
            if (operations.hasOwnProperty(operation)) {
                var text = Constants.c['amop_' + operation];
                if (text) {
                    template.find('select[name="OpCode"]').append($('<option></option>').text(text).val(operation));
                }
            }
        }
    },
    StringFormatTask: function (id, key, settings, template) {
        var operation;
        var operations = Constants.sop;
        for (operation in operations) {
            if (operations.hasOwnProperty(operation)) {
                var text = Constants.c['sop_' + operation];
                var number = operations[operation];
                if (text) {
                    template.find('select[name="OpCode"]').append($('<option></option>').text(text).val(number));
                }
            }
        }
    },
    ContentType: function (id, key, settings, template) {
        TaskEditor.fillContentType(template);
    },
    ContentTypeWithCurrent: function (id, key, settings, template) {
        TaskEditor.fillContentType(template, true);
    },
    VerifyCustomFieldGroupTask: function (id, key, settings, template) {
        TaskEditor.fillCustomFieldGroup(template);
        TaskEditor.fillGroupValidationOptions(template);
    },
    InlayColor: function (id, key, settings, template) {
        var input = template.find('input[name="InlayColor"]');
        $('body').off('click', '#task_editor div.item div.InlayColor').on('click', '#task_editor div.item div.InlayColor', function (ev) {
            var $targ = $(ev.currentTarget);
            var all = $('#task_editor div.item div.InlayColor');
            all.removeClass('InlaySelected');
            var classes = $targ.attr('class').split(' ');
            var length = classes.length;
            var i = 0;
            for (i; i < length; i++) {
                if (classes[i].startsWith('InlayColor_')) {
                    var color = classes[i].substring(11);
                    input.val(color);
                    break;
                }
            }
            $targ.addClass('InlaySelected');
        });
        //Default Selection
        var inlayColor = 'ffffaa';
        input.val(inlayColor);
        template.find('.InlayColor_' + inlayColor).addClass('InlaySelected');
    },
    AddToFolderTask: function (id, key, settings, template) {
        TaskEditor.fillSecurityClass(template);
        // Folder picker for selecting folder path
        template.find('input[name="Path"]').click(function (e) {
            DialogsUtil.folderSelection(false, false, '',
                function (btnText, uiState, foldId, foldTitle, foldPath) {
                    var output = $(e.currentTarget);
                    switch (btnText) {
                        case Constants.c.ok:
                            output.val(foldPath);
                            break;
                        case Constants.c.clear:
                            output.val('');
                            break;
                    }
                }, this, { singleSelect: true });
        });
    },
    PromptForFolderTask: function (id, key, settings, template) {
        // Add a folder picker for selecting a starting folder id
        var options = {
            singleSelect: true,
            includeParent: true
        };
        template.find('input[name="wfFolderSelection"]').click(function (e) {
            DialogsUtil.folderSelection(false,
                false,
                '',
                function (btnText, uiState, foldId, foldTitle, foldPath) {
                    var display = $(e.currentTarget);
                    var output = $(display).siblings('input[name="StartingFolderId"]');
                    switch (btnText) {
                        case Constants.c.ok:
                            output.val(foldId);
                            display.val(foldPath);
                            break;
                        case Constants.c.clear:
                            output.val('');
                            display.val('');
                            break;
                    }
                },
                this,
                options
            );
        });
    },
    FolderPicker: function (id, key, settings, template) {
        var inputArgSel = $('#task_settings input.InputArgDropTarget');
        inputArgSel.parent().append($('<span></span').addClass('folder_icon'));
        var options = {
            singleSelect: true
        };
        $('#task_settings span.folder_icon').click(function (e) {
            DialogsUtil.folderSelection(false,
                false,
                '',
                function (btnText, uiState, foldId, foldTitle, foldPath) {
                    var display = inputArgSel;
                    switch (btnText) {
                        case Constants.c.ok:
                            if (foldPath) {
                                display.val(Constants.c.argDocFolder + '.' + foldPath);
                            }
                            else {
                                display.val('');
                            }
                            break;
                        case Constants.c.clear:
                            display.val('');
                            break;
                    }
                },
                this,
                options
            );
        });
    },
    DatalinkFieldGroupTask: function (id, key, settings, template) {
        TaskEditor.fillCustomFieldGroup(template);
    },
    DatalinkTask: function (id, key, settings, template) {
        TaskEditor.refreshArgsFunction = TaskEditor.changeDatalinkSelection;
        TaskEditor.insertSelectAboveKeyedArguments(Constants.c.dataLink, 'Datalink', TaskEditor.fillDatalink);
    },
    SetFieldGroupValuesTask: function (id, key, settings, template) {
        TaskEditor.refreshArgsFunction = function () {
            $throbber = $("#task_editor div.item div.SelectorAboveArgumentsHeader > img");
            var args = arguments;
            var sf = function (result) {
                window.allData.CustomFieldGroups = result;
                TaskEditor.changeCustomFieldGroupSelection.apply(this, args);
            };
            var ff = function (jqXHR, textStatus, error) {
                ErrorHandler.popUpMessage(error);
            };
            $throbber.show();
            TaskEditor.customFieldSvc.getGroups(sf, ff, function () { $throbber.hide(); });
        };
        TaskEditor.insertSelectAboveKeyedArguments(Constants.c.set_CustomFieldGroup, 'CustomFieldGroupId', TaskEditor.fillCustomFieldGroup);
    },
    insertSelectAboveKeyedArguments: function (label, selectName, fillfunction) {
        // Add the special template for a setting (selector) above arguments and name/label it
        var selectorAboveTemplate = $('#SelectorAboveArgumentsTemplate').clone();
        var template = $('#task_editor div.task_template').append($(selectorAboveTemplate).children());
        var $header = $(template).find('div.SelectorAboveArgumentsHeader');
        $header.find('span').first().text(label);
        $header.find('select').first().attr('name', selectName);
        // Populate the selector
        if (fillfunction) {
            fillfunction(template);
        }
        var tDTO;
        if (TaskEditor.newTaskXML) {
            tDTO = $("");
        }
        else {
            var task = $('#action_tasks').find('.selected_task');
            var selectedTask = $('#tasks :selected');
            if (task.find('span[name="Name"]')) {
                if (task.find('span[name="Name"]').val() !== selectedTask.val()) {
                    task = selectedTask;
                }
            }
            tDTO = TaskEditor.getTaskDTO(task);
        }
        var args = TaskEditor.getTaskArgKeyValues(tDTO);
        TaskEditor.showKeyedArgs($header, args);
    },
    // Shows keyed args, optionally specifying new inputKeys and/or outputKeys.
    // keys will be inserted into the dom appended to the element specified as 'container'.
    // provide taskData if it is available -- otherwise it will be gotten.
    // This method recognizes Verify tasks and uses standard, non-keyed outputs for them.
    // inputKeys: may be a simple array of strings or an array of key/value pairs, the values of which may be
    //    simple string values or an object containing Value, Type, and Required properties.
    // outputKeys: may be a simple array of strings or an array of key/value pairs, the values of which may be
    //    simple string values or an object containing Value, Type, and Required properties.
    showKeyedArgs: function (container, args, inputKeys, outputKeys, taskData) {
        var length;
        var i;
        var inArgsList = [];
        var outArgsList = [];
        if (args.inArgKeys && args.inArgVals) {
            length = args.inArgKeys.length;
            if (inputKeys) {
                // new input keys: find list of values which match up with these keys; ignore any other values
                var inArgKv = {};
                for (i = 0; i < length; i++) {
                    inArgKv[args.inArgKeys[i]] = args.inArgVals[i];
                }
                length = inputKeys.length;
                for (i = 0; i < length; i++) {
                    var param = inArgKv[inputKeys[i].Key || inputKeys[i]];
                    param = param || "";
                    inArgsList.push(param);
                }
            }
            else {
                // input keys unchanged: retain original values list 
                inputKeys = args.inArgKeys;
                inArgsList = args.inArgVals;
            }
        }
        if (args.outArgKeys && args.outArgVals) {
            length = args.outArgKeys.length;
            if (outputKeys) {
                // new output keys: remake arg list as above, for inputs
                var outArgKv = {};
                for (i = 0; i < length; i++) {
                    outArgKv[args.outArgKeys[i]] = args.outArgVals[i];
                }
                length = outputKeys.length;
                for (i = 0; i < length; i++) {
                    var col = outArgKv[outputKeys[i].Key || outputKeys[i]];
                    col = col || "";
                    outArgsList.push(col);
                }
            }
            else {
                // output keys unchanged: retain original values list 
                outputKeys = args.outArgKeys;
                outArgsList = args.outArgVals;
            }
        }
        var inArgs = TaskEditor.getKeyedArgsUI(Constants.c.inArgs, inputKeys, inArgsList);
        var outArgs;
        // first, get taskData if needed
        if (!taskData) {
            taskData = TaskEditor.getCurrentTaskData();
        }
        // show standard outArgs on any Verify task; otherwise show keyed args
        if (taskData.SettingsUIKey && taskData.SettingsUIKey.contains('Verify')) {
            outArgs = TaskEditor.getArgumentsUI(Constants.c.outArgs, taskData.OutArgMin, taskData.OutArgMax, args.outArgVals);
        } else {
            outArgs = TaskEditor.getKeyedArgsUI(Constants.c.outArgs, outputKeys, outArgsList);
        }
        container.append(inArgs).append(outArgs);
        TaskEditor.setInandOutArguments();
    },
    //#endregion
    incrementTaskTypeCounts: function () {
        var ttc = ActionEditor.getTaskTypeCount();
        if (ttc.UI >= 1) {
            ttc.UI += 1;
        } else if (ttc.Client >= 1) {
            ttc.Client += 1;
        }
        TaskEditor.fillTaskLibrary(ttc);
    },
    displayTaskKey: function (selector) { // Used to display the key for tasks (color codes and what they correspond to)
        $(selector).siblings('.ui-dialog-buttonpane')
            .append($('<div></div>').addClass('taskKeys')
                .append($('<span>&nbsp;</span>').addClass('UI sPng taskKey'))
                .append($('<span></span>').text(Constants.c.uiTasks))
                .append($('<span>&nbsp;</span>').addClass('Client sPng taskKey'))
                .append($('<span></span>').text(Constants.c.clientTasks))
                .append($('<span>&nbsp;</span>').addClass('Auto sPng taskKey'))
                .append($('<span></span>').text(Constants.c.autoTasks))
            );
    },
    toggleInfo: function (e) { // Toggle showing and hiding task info inside the task editor
        var manualTrigger = false;
        var fsContents = $(e.currentTarget).siblings('p'); // the contents to show/hide
        var fs = $(e.currentTarget).parent(); // fieldset containing the legend and contents
        var fsIcon = $(e.currentTarget).find('> span'); // icon to represent being shown/hidden
        var showTaskInfo = Utility.GetUserPreference('showTaskInfo'); // Used for showing / hiding Task info for each user
        if (showTaskInfo === undefined) {
            showTaskInfo = fsContents.is(':visible');    // If there are no user preferences, still allow the task info to be expanded / collapsed
        }
        if (e.data && e.data.manuallyTriggered) { // Determine if manually triggered, if so don't set the user preference
            manualTrigger = true;
        } else {
            if (showTaskInfo !== undefined && showTaskInfo !== null && showTaskInfo.toString().toLowerCase() === 'false') { // If its not a manual trigger reset the use preferences, to be checked below
                Utility.SetSingleUserPreference('showTaskInfo', true);
                showTaskInfo = 'true';
            } else {
                Utility.SetSingleUserPreference('showTaskInfo', false);
                showTaskInfo = 'false';
            }
        }
        if (showTaskInfo !== undefined && showTaskInfo !== null && showTaskInfo.toString().toLowerCase() === 'false') {
            fsIcon.removeClass('ui-icon-minus').addClass('ui-icon-plus');
            fs.css('border', 'hidden');
            fsContents.hide();
        } else {
            fsIcon.removeClass('ui-icon-plus').addClass('ui-icon-minus');
            fs.css('border', '1px solid #999');
            fsContents.show();
        }
    },
    getTasksAction: function (taskId) {
        var actions = $(Workflow.xml).find('Actions > Action');
        var actionLoc = '';
        var len = actions.length;
        var i, j;
        for (i = 0; i < len; i++) {
            var action = $(actions[i]);
            var tasks = action.find('WFTaskDTO');
            var taskLen = tasks.length;
            for (j = 0; j < taskLen; j++) {
                if ($(tasks[j]).find('> Id').text() === taskId) {
                    actionLoc = action;
                    break;
                }
            }
            if (actionLoc.length === 1) { // If action has been found break out of loop
                break;
            }
        }
        return $(actionLoc);
    },
    getTasksStep: function (taskId) {
        var steps = $(Workflow.xml).find('WFStepDTO');
        var len = steps.length;
        var i, j;
        var stepLoc = '';
        for (i = 0; i < len; i++) {
            var step = $(steps[i]);
            var tasks = step.find('WFTaskDTO');
            var taskLen = tasks.length;
            for (j = 0; j < taskLen; j++) {
                if ($(tasks[j]).find('> Id').text() === taskId) {
                    stepLoc = step;
                    break;
                }
            }
            if (stepLoc.length === 1) { // If step has been found break out of loop                
                break;
            }
        }
        return $(stepLoc);
    },
    /*
        Determines whether the passed in arg is a parameter and NOT a literal ('test', "test"), a number (1234), or a built in argument ($AccessedOn)
        @param - arg : Task's input or output argument
    */
    isParam: function (arg) {
        return arg && !arg.startsWith('$') && !arg.startsWith('\'') && !arg.startsWith('"') && isNaN(arg);
    },
    isFieldExists: function (arg) {
        var isExists = true;
        if (arg && arg.startsWith('$')) {
            var userArgSplit = arg.split('.');
            var length = userArgSplit.length;
            if (length && userArgSplit.indexOf('$fields') >= 0) {
                if (!TaskEditor.reverseCustomFieldMap) {
                    TaskEditor.reverseCustomFieldMap = Utility.reverseMapObject(window.allData.CustomFields); // build when needed
                }
                if (!TaskEditor.reverseCustomFieldMap[userArgSplit[length - 1]]) {
                    isExists = false;
                }
            }
        }
        return isExists;
    },
    // #region Event Handlers
    changeDatalinkSelection: function (event, inArgsList, outArgsList, fillWithSelectedTask) {
        var $selectedDL = $('#task_editor').find('select[name="Datalink"]').find(':selected');
        var data;
        var query;
        var paramList = []; // List of ParameterInfo
        var columnList = []; // List of Columns returned by query (An Update query only has one, Row Count)
        var mappings;
        var isUpdate = false;
        var completeFunc = function (getColumnsXHR) {
            $("#task_editor div.item div.SelectorAboveArgumentsHeader > img").hide(); // throbber
            var args = {};
            if (getColumnsXHR && getColumnsXHR.responseText) {
                var getColumnsResult = JSON.parse(getColumnsXHR.responseText).Result;
                var i;
                var length = getColumnsResult.length;
                for (i = 0; i < length; i++) {
                    var col = getColumnsResult[i];
                    // TODO 10441 show type icon: this col.Value is a string type name (SqlDbType) wheres those in input args are ints.
                    var value = { Value: '', Type: col.Value, Required: false };
                    TaskEditor.applyMapping(mappings, col.Key, value);
                    columnList.push({ Key: col.Key, Value: value });
                }
            }
            // If there is a change between datalinks allow the change and don't use the selected task's arguments to fill the new datalink's arguments.
            // Likewise, if no datalink is selected, don't fill the arguments.
            // Do fill the arguments for another event type (i.e. click) or if fillWithSelectedTask is explicitly set
            if ((event.type !== 'change' || fillWithSelectedTask) && $selectedDL.length > 0) {
                var task = $('#action_tasks').find('.selected_task');
                var tDTO = TaskEditor.getTaskDTO(task);
                args = TaskEditor.getTaskArgKeyValues(tDTO);
            }
            var template = $('#task_editor div.task_template');
            template.find('.taskArguments').parent().parent().remove();
            var $header = $(template).find('div.SelectorAboveArgumentsHeader');
            TaskEditor.showKeyedArgs($header, args, paramList, columnList);
        };
        var datalinkData = $selectedDL.attr('datalinkData');
        if (datalinkData) {
            data = JSON.parse(datalinkData);
            var connDef = Utility.tryParseJSON(data.DataLinkConnection.Definition);
            if (connDef) {
                mappings = connDef.Mappings;
                if (connDef.ConnectionString && connDef.ConnectionString.indexOf('@DBName') >= 0) { // EC2: #11194 Multi-company support
                    paramList.push({ Key: '@DBName', Value: { Type: 22, Required: true, Value: connDef.DefaultDBName || '' } });
                }
            }
            var queryId = data.Id;
            query = data.QueryDefinition;
            if (!query) {
                query = data.UpdateDefinition;
                isUpdate = true;
            }
            if (query) { // TODO: scain the selected Data link doesn't have an associated query, warn user?
                query = JSON.parse(query);
                var valueFunc;
                var params;
                if (query.Params === undefined) {
                    // legacy parameters
                    params = query.Parameters;
                    valueFunc = function (paramName) {
                        var paramValue = query.ParameterValues.hasOwnProperty(paramName) ? query.ParameterValues[paramName] : '';
                        return { Value: paramValue, Type: params[paramName], Required: false };
                    };
                } else {
                    params = query.Params;
                    valueFunc = function (paramName) {
                        return params[paramName];
                    };
                }
                var paramName;
                for (paramName in params) { // Obtain parameter Names and Info (use Values as default values, overridden by any that have been entered)
                    if (params.hasOwnProperty(paramName)) {
                        //These parameters are filled in automatically by the datalink engine. Do not show these in the editor.
                        var displayParams = paramName !== Constants.UtilityConstants.EXPORTED_CONTENT_PARAM && paramName !== Constants.UtilityConstants.EXPORTED_META_PARAM;
                        if (displayParams) {
                            var value = valueFunc(paramName);
                            TaskEditor.applyMapping(mappings, paramName, value);
                            paramList.push({ Key: paramName, Value: value });
                        }
                    }
                }
                if (isUpdate) { // Update queries only have one output, Row Count
                    columnList.push({ Key: Constants.c.rowCount, Value: '' });
                } else { // Obtain columns returned by the executing query (not an Update query)
                    $("#task_editor div.item div.SelectorAboveArgumentsHeader > img").show(); // throbber
                    // TODO currently, getColumns() returns dictionary of name and type
                    TaskEditor.dataLinkSvc.getColumns(queryId, null, function (jqXHR, textStatus, message) {
                        ErrorHandler.displayGeneralDialogErrorPopup(Constants.c.dataLinkErrorMessage + message.Message, null, Constants.c.dataLinkError);
                    }, completeFunc);
                    return;
                }
            }
        }
        completeFunc();
    },
    changeCustomFieldGroupSelection: function (event, inArgsList, outArgsList, fillWithSelectedTask) {
        var taskData = TaskEditor.getCurrentTaskData();
        if (!taskData || !Utility.hasFlag(taskData.Flags, Constants.wftf.FieldGroupKeyedInputs)) {
            return;
        }
        var columnList = [];
        var args = {};
        var $selectedGroup = $('#task_editor').find('select[name="CustomFieldGroupId"]').find(':selected');
        if ($selectedGroup.length !== 0) {
            var groupId = $selectedGroup.val();
            var groups = window.allData.CustomFieldGroups;
            var cfm = window.allData.CustomFields;
            var grp;
            var idx;
            var length = groups.length;
            for (idx = 0; idx < length; idx++) {
                grp = groups[idx];
                if (grp.CustomFieldGroup.Id === groupId) {
                    var idx2;
                    var fieldCount = grp.CustomFieldGroupTemplates.length;
                    for (idx2 = 0; idx2 < fieldCount; idx2++) {
                        var fldName = cfm[grp.CustomFieldGroupTemplates[idx2].CustomFieldMetaId];
                        columnList.push(fldName);
                    }
                    break;
                }
            }
        }
        if ((event.type !== 'change' || fillWithSelectedTask)) {
            var task = $('#action_tasks').find('.selected_task');
            var tDTO = TaskEditor.getTaskDTO(task);
            args = TaskEditor.getTaskArgKeyValues(tDTO);
        }
        var template = $('#task_editor div.task_template');
        template.find('.taskArguments').parent().parent().remove();
        var $header = $(template).find('div.SelectorAboveArgumentsHeader');
        TaskEditor.showKeyedArgs($header, args, columnList, [], taskData);
        return;
    },
    applyMapping: function (mappings, paramName, parameterInfo) {
        if (mappings) {
            var cfName = mappings[paramName];
            if (cfName) {
                if (!TaskEditor.reverseCustomFieldMap) {
                    TaskEditor.reverseCustomFieldMap = Utility.reverseMapObject(window.allData.CustomFields); // build when needed
                }
                if (TaskEditor.reverseCustomFieldMap[cfName]) { // ignore mappings to fields that don't (or no longer) exist
                    parameterInfo.Value = "$Field." + cfName;
                    return;
                }
            }
        }
    },
    // #endregion

    getTaskDTO: function (task) {
        var tasks = $(ActionEditor.currentActionXMLClone).find('WFTaskDTO');
        var tDTO = tasks.filter(function (idx, taskDTO) {
            return $(taskDTO).find('Id').text() === $(task).find('input.ignore').val();
        });
        return tDTO;
    },
    getTaskArgKeyValues: function (tDTO) {
        var inArgKeys = tDTO.find('InArgKeys').text();
        if (inArgKeys) {
            inArgKeys = JSON.parse(inArgKeys);
        }
        var outArgKeys = tDTO.find('OutArgKeys').text();
        if (outArgKeys) {
            outArgKeys = JSON.parse(outArgKeys);
        }
        var inArgVals = tDTO.find('InArgNames').text();
        if (inArgVals) {
            inArgVals = JSON.parse(inArgVals);
        }
        var outArgVals = tDTO.find('OutArgNames').text();
        if (outArgVals) {
            outArgVals = JSON.parse(outArgVals);
        }
        return { inArgKeys: inArgKeys, inArgVals: inArgVals, outArgKeys: outArgKeys, outArgVals: outArgVals };
    },
    checkLengthInput: function (event) {
        ErrorHandler.removeErrorTagsElement($(event.target).parent(), css.warningErrorClass, css.inputErrorClass);
        if ($(event.target).val().length > 256) {
            $(event.target).after('<' + css.warningErrorClassTag + ' class="' + css.warningErrorClass + '">' + Constants.c.valueTooLong + '</' + css.warningErrorClassTag + '>');
            $(event.target).addClass(css.inputErrorClass);
        }
    },
    createDataLinkDropDown: function (template, dataLinkType) {
        // populates select element in template with all datalink queries which support specified dataLinkType: TypeAhead or DropDown
        var sf = function (r) {
            var cfFormat = "<option></option>";
            var i = 0;
            var DataLinkQueries = r.DataLinkQueries;
            var length = DataLinkQueries.length;
            var queryDefinition;
            if (length > 0) {
                for (i = 0; i < length; i++) {
                    queryDefinition = Utility.tryParseJSON(DataLinkQueries[i].QueryDefinition, true);
                    if (queryDefinition && queryDefinition[dataLinkType]) {
                        cfFormat += '<option value=' + DataLinkQueries[i].Id + '>' + DataLinkQueries[i].Name + '</option>';
                    }
                }
                template.find('select').html(cfFormat);
            }
        };
        var ff = function (jqXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        var proxy = BulkDataServiceProxy({ sync: true });
        proxy.getDataLinkData(sf, ff);
    }

};