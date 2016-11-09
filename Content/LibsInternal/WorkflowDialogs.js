var WorkflowDialogs = {
    reset: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ wfDocumentIds: [] }, options);
        var wfDocIds = options.wfDocumentIds;
        if (wfDocIds.length < 1) {
            DialogsUtil.invalidSelection();
            return;
        }
        var selector = '#resetWfDoc';
        $(selector).dialog({
            title: Constants.c.resetWorkflow,
            modal: true,
            autoOpen: true,
            resizable: false,
            open: function () {
                $(this).css('height', 'auto');
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            },
            buttons: [{
                text: Constants.c.reset,
                click: function () {
                    $('#reset_throbber').show();
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    DialogsUtil.disableButtons([Constants.c.reset, Constants.c.cancel]);
                    var successCleanup = function (result) {
                        $(selector).find('.success_message').show();
                        $(selector).find('.success_message').fadeOut(2000, function () {
                            DialogsUtil.enableButtons([Constants.c.reset, Constants.c.cancel]);
                            $(selector).dialog('close');
                        });
                        if (WorkflowUtil.refreshView) {
                            WorkflowUtil.refreshView();
                        }
                    };
                    var failureCleanup = function (jqXHR, textStatus, errorThrown) {
                        ErrorHandler.addErrors({ 'reset_err_msg': errorThrown.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                        $(selector).find('.warningErrorClass').show();
                    };
                    var cleanup = function () {
                        $('#reset_throbber').hide();
                        DialogsUtil.enableButtons([Constants.c.reset, Constants.c.cancel]);
                    };
                    var resetWorkflowPkg = {
                        WFDocumentIds: wfDocIds,
                        ClearChat: document.getElementById("clearChatCheckbox").checked
                    };
                    options.callback(resetWorkflowPkg, successCleanup, failureCleanup, cleanup);
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    WorkflowUtil.enableButtons([Constants.c.assign, Constants.c.close, Constants.c.cancel]);
                    $(selector).dialog('close');
                }
            }]
        });
    },
    terminate: function (options) {
        var wfSelector = '#workflow_removal';
        var title = Constants.c.terminate;
        var message = Constants.c.terminateWfMessage;
        $(wfSelector + ' .wf_suc_msg').text(Constants.c.wfTerminateSuccess);
        message = String.format(message, options.count);
        $(wfSelector + ' .wf_msg').text(message);
        $(wfSelector).dialog({
            resizable: false,
            width: 400,
            autoOpen: false,
            minWidth: 200,
            maxWidth: $(window).width(),
            height: 'auto',
            minHeight: 100,
            maxHeight: $(window).height(),
            modal: true,
            title: title,
            buttons: [{
                text: title,
                click: function () {
                    var that = this;
                    var disableButtons = WorkflowUtil.disableButtons([title, Constants.c.close, Constants.c.cancel], this);
                    var cleanup = function () {
                        // Display success message
                        $(wfSelector + ' .wf_suc_msg').show();
                        $(wfSelector + ' .wf_suc_msg').fadeOut(2000, disableButtons);
                        $(that).dialog('close');
                    };
                    Utility.executeCallback(options.callback, cleanup);
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    $(this).dialog('close');
                }
            }]
        });
        $(wfSelector).dialog('open');
    },
    remove: function (options) {
        var wfSelector = '#workflow_removal';
        var title = Constants.c.remove;
        var message = Constants.c.removeFromWfMessage;
        $(wfSelector + ' .wf_suc_msg').text(Constants.c.wfRemoveSuccess);
        message = String.format(message, options.count);
        $(wfSelector + ' .wf_msg').text(message);
        $(wfSelector).dialog({
            resizable: false,
            width: 400,
            autoOpen: false,
            minWidth: 200,
            maxWidth: $(window).width(),
            height: 'auto',
            minHeight: 100,
            maxHeight: $(window).height(),
            modal: true,
            title: title,
            buttons: [{
                text: title,
                click: function () {
                    var that = this;
                    var disableButtons = WorkflowUtil.disableButtons([title, Constants.c.close, Constants.c.cancel], this);
                    var cleanup = function () {
                        // Display success message
                        $(wfSelector + ' .wf_suc_msg').show();
                        $(wfSelector + ' .wf_suc_msg').fadeOut(2000, disableButtons);
                        $(that).dialog('close');
                    };
                    Utility.executeCallback(options.callback, cleanup);
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    $(this).dialog('close');
                }
            }]
        });
        $(wfSelector).dialog('open');
    },
    assignWorkflow: function (options) {
        var wfAddAction = 'wfAddAction';
        var wfSelector = '#workflow_selection';
        if (options.versionIds.length < 1) {
            DialogsUtil.invalidSelection();
            return false;
        }
        $(wfSelector).dialog({
            autoOpen: false,
            resizable: false,
            width: 350,
            minWidth: 350,
            maxWidth: $(window).width(),
            maxHeight: $(window).height(),
            modal: true,
            title: options.title,
            open: function () {
                $(wfSelector + ' .wf_dropdown_text').val('');
                $(wfSelector + ' .wf_dropdown_text').text('');
                $(wfSelector + ' .wf_dropdown_text').css('title', '');
                if (options.noAdditionalAction) {
                    // hide additional actions if it is a change workflow
                    $(wfSelector).find('.additionalAction').parent().hide();
                }
                else {
                    $(wfSelector).find('.additionalAction').parent().show();
                    var additionalAction = Utility.GetUserPreference(wfAddAction) || 'addActNone';
                    var newAddAction;
                    if (!additionalAction) {
                        newAddAction = $(wfSelector).find('input:checked');
                        WorkflowUtil.assignWorkflowAddAction(newAddAction);
                        additionalAction = newAddAction.attr('class');
                    }
                    $(wfSelector).find('.' + additionalAction).prop('checked', true);
                    $(wfSelector).find('.' + additionalAction).focus().select();
                }
                $('#assign_throbber').hide();
                $(wfSelector + ' .wf_suc_msg').hide();
                $(wfSelector).css('height', 'auto');
                $(wfSelector).css('width', '95%');
                $(wfSelector).parent('.ui-dialog').css('overflow', 'visible');
                $(wfSelector + ' .dropdown ul.children').hide();
                WorkflowUtil.fillWorkflows();
                if (!$.trim($(wfSelector + ' .wf_dropdown_text').text())) {
                    WorkflowUtil.disableButtons([Constants.c.assign], this);
                }
                if (!WorkflowUtil.bound) {
                    $(wfSelector).delegate('input[name="wf_add_action"]', 'click', function (e) {
                        WorkflowUtil.assignWorkflowAddAction($(e.currentTarget));
                    });
                    $(wfSelector).delegate('fieldset legend', 'click', function (e) {
                        //TODO: scain refactor to use ShowHideUtil.toggleFieldset()...
                        var fs = $(wfSelector).find('fieldset');
                        var fsContents = fs.find('div');
                        var fsIcon = fs.find('legend span');
                        if (fsContents.is(':visible')) {
                            fsContents.hide();
                            fsIcon.removeClass('ui-icon-minus').addClass('ui-icon-plus');
                            fs.css('border', 'hidden');
                        }
                        else {
                            fsContents.show();
                            fsIcon.removeClass('ui-icon-plus').addClass('ui-icon-minus');
                            fs.css('border', '1px solid #000');
                        }
                    });
                    $(wfSelector + ' fieldset legend').click();
                    $(wfSelector).delegate('.workflow_dd li span.anchor', 'click', function () {
                        if ($.trim($(wfSelector + ' .wf_dropdown_text').text())) {
                            WorkflowUtil.enableButtons([Constants.c.assign]);
                        }
                    });
                    WorkflowUtil.bound = true;
                }
                $(wfSelector).css('height', 'auto');
                $(wfSelector).css('width', '95%');
            },
            close: function () {
                ErrorHandler.removeErrorTagsElement(wfSelector, css.warningErrorClass, css.inputErrorClass);
            },
            buttons: [{
                text: Constants.c.assign,
                click: function () {
                    ErrorHandler.removeErrorTagsElement(wfSelector, css.warningErrorClass, css.inputErrorClass);
                    $('#assign_throbber').show();
                    var workflowId = $(wfSelector + ' .dropdown .wf_dropdown_text').val();
                    var disableButtons = WorkflowUtil.disableButtons([Constants.c.assign, Constants.c.close, Constants.c.cancel], this);
                    var cleanup = function (errorThrown) {
                        $('#assign_throbber').hide();
                        $(wfSelector + ' .wf_suc_msg').show();
                        $(wfSelector + ' .wf_suc_msg').fadeOut(2000, function () { WorkflowUtil.closeWorkflowDialog(disableButtons, true, options.noAdditionalAction, options.versionIds); });

                    };
                    var failureCleanUp = function (errorThrown) {
                        $('#assign_throbber').hide();
                        if (errorThrown) {
                            if (errorThrown.Message === Constants.c.workflowDeleted) {
                                // remove the workflow from the collection
                                window.slimWorkflows.remove(workflowId);
                                $(wfSelector + ' .wf_dropdown_text').text('');
                                $(wfSelector + ' .wf_dropdown_text').val('');
                                WorkflowUtil.disableButtons([Constants.c.assign], $(wfSelector));
                                WorkflowUtil.fillWorkflows();
                            }
                            ErrorHandler.addErrors({ 'wf_err_msg': errorThrown.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                            $(wfSelector + ' .warningErrorClass').show();
                        }
                        disableButtons(true);
                    };
                    if (workflowId) {
                        options.callback(workflowId, cleanup, failureCleanUp);
                    }
                }
            }, {
                text: Constants.c.close,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
        $(wfSelector).dialog('open');
    },
    removeOrTerminateWorkflow: function (options) {
        var wfSelector = '#workflow_removal';
        if (options.wfDocIds.length < 1) {
            DialogsUtil.invalidSelection();
            return false;
        }
        $(wfSelector + ' .wf_suc_msg').text(options.successMsg);
        $(wfSelector + ' .wf_msg').text(options.operationMsg);
        $(wfSelector).dialog({
            resizable: false,
            width: 400,
            autoOpen: false,
            minWidth: 200,
            maxWidth: $(window).width(),
            height: 'auto',
            minHeight: 100,
            maxHeight: $(window).height(),
            modal: true,
            title: options.title,
            buttons: [{
                text: options.title,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var that = this;
                    options.callback(function () { $(that).dialog('close'); });
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    $(this).dialog('close');
                }
            }]
        });
        $(wfSelector).dialog('open');
    },
    setAssignee: function (options) {
        var that = this;
        if (options.versionIds.length < 1) {
            DialogsUtil.invalidSelection();
            return false;
        }
        var selector = '#reassignWfDoc';
        $(selector + ' .dropdown .reassign_dropdown_text').val('');
        $(selector + ' .dropdown .reassign_dropdown_text').text('');
        $(selector + ' .dropdown .reassign_dropdown_text').attr('name', '');
        var disableButtons = function () {
            WorkflowUtil.disableButtons([Constants.c.assign, Constants.c.close, Constants.c.cancel], this);
        };
        var func = function (enableButtons) {
            $(selector).dialog('close');
            $(selector + ' .dropdown .reassign_dropdown_text').val('');
            $(selector + ' .dropdown .reassign_dropdown_text').text('');
            $(selector + ' .dropdown .reassign_dropdown_text').attr('name', '');
            WorkflowUtil.enableButtons([Constants.c.close, Constants.c.cancel], this);
        };
        var cleanup = function () {
            $('#reassign_throbber').hide();
            $(selector + ' .updation_message').fadeOut(2000, func);
            $(selector + ' .success_message').show();
            $(selector + ' .success_message').fadeOut(2000, func);
            WorkflowUtil.enableButtons([Constants.c.assign, Constants.c.close]);
            $(selector).dialog('close');
        };
        var progress = function (msg) {
            $(selector + ' .updation_message').text(msg);
            $(selector + ' .updation_message').show();
        };
        var failureCleanup = function (xhr, status, errorThrown) {
            disableButtons(true);
            if (errorThrown) {
                ErrorHandler.addErrors({ 'reassign_err_msg': errorThrown.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            }
            $('#reassign_throbber').hide();
            $(selector + ' .warningErrorClass').show();
        };
        $(selector).dialog({
            title: Constants.c.changeAssignee,
            width: 400,
            modal: true,
            autoOpen: false,
            resizable: false,
            open: function () {
                WorkflowUtil.fillAssignees();
                $('#reassign_throbber').hide();
                $(selector + ' .success_message').hide();
                $(this).parent('.ui-dialog').css('overflow', 'visible');
                if (!$.trim($(selector + ' .reassign_dropdown_text').text())) {
                    WorkflowUtil.disableButtons([Constants.c.assign], this);
                }
                $(selector + ' .reassign li span.anchor').off('click');
                $(selector + ' .reassign li span.anchor').on('click', function (e) {
                    if ($.trim(e.target.textContent)) {
                        WorkflowUtil.enableButtons([Constants.c.assign]);
                    }
                });
                $(selector).delegate('.reassign', 'click',
                    {
                        dropdownSelector: selector + ' .dropdown',
                        parentSelector: selector,
                        childHoverSelector: '.reassign li span.parent',
                        childShowHideSelector: '.reassign ul.children'
                    }, ShowHideUtil.showHideDropdownMenu);
                $(selector).delegate('.reassign li span.anchor', 'click',
                    {
                        dropdownSelector: selector + ' .dropdown',
                        containerSelector: selector,
                        dropdownFieldTextSelector: '.reassign .reassign_dropdown_text'
                    }, ShowHideUtil.setDropdownTextGeneric);
            },
            close: function () {
                $(selector).unbind();
            },
            buttons: [{
                text: Constants.c.assign,
                click: function () {
                    var assigneeId = $(selector + ' .dropdown .reassign_dropdown_text').val();
                    if (!assigneeId) {  // Don't allow a null assignee to be sent up
                        return;
                    }
                    $('#reassign_throbber').show();
                    disableButtons();

                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    options.callback(assigneeId, cleanup, failureCleanup, progress);
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    WorkflowUtil.enableButtons([Constants.c.assign, Constants.c.close]);
                    $(selector).dialog('close');
                }
            }]
        });
        $(selector).dialog('open');

    }
};