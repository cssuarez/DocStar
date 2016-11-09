var DocumentMetaWorkflowView = Backbone.View.extend({
    model: undefined, // BulkViewerDataPackageCPX
    className: 'DocumentMetaWorkflowView',
    clickCount: 0,
    backCountTimer: undefined,
    events: {
        "click .wfUIPromptSubmit:not(.disabled, .executingDisabled)": "wfUIPromptSubmitClick",
        "click .wfFailedRetry:not(.disabled, .executingDisabled)": "wfFailedRetryClick",
        "click .wfFailedRestart:not(.disabled, .executingDisabled)": "wfFailedRestartClick",
        "click .wfFailedTerminate:not(.disabled, .executingDisabled)": "wfFailedTerminateClick",
        "click .wfFailedRemove:not(.disabled, .executingDisabled)": "wfFailedRemoveClick",
        "click .wfRestore:not(.disabled, .executingDisabled)": "wfRestoreClick",
        "click .wfBack:not(.disabled, .executingDisabled)": "wfBackClick",
        "click .submitNone:not(.disabled, .executingDisabled)": "submitNoneClick",
        "click .submitNext:not(.disabled, .executingDisabled)": "submitNextClick",
        "click .wfUISubmitOptions:not(.disabled, .executingDisabled)": "wfUISubmitOptionsClick",
        "click .wfSubmitOptionsClose": "wfSubmitOptionsCloseClick",
        "click .wfBranch:not(.disabled, .executingDisabled)": "wfBranchClick",
        "click .wfApprove:not(.disabled, .executingDisabled)": "setApprovalClick",
        "click .wfDeny:not(.disabled, .executingDisabled)": "setApprovalClick",
        "keyup .wfChatInput": "wfChatInputKeyUp",
        "focus .uiOutput, .isCombo": "zoomToRegion",
        "focus input[type='text'],.isCombo": "setRecShortCutParameters",
        "blur .uiOutput, .isCombo": "cleanupZoomHighlights",
        "keyup :focus:not(textarea)": "submitClickOnKey"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentmetaworkflowviewlayout'));
        this.listenTo(this.model, 'change:DocumentPackage.WFDocumentDataPackage.executing', this.executingChanged);
        this.listenTo(this.model, 'change:submitWorkflowOnApprovalStampSave', function (model, value, options) {
            // The model is in workflow then save and submit workflow
            if (value && this.model.isInWorkflow(true)) {
                this.wfUIPromptSubmitClick(null, true);
                this.model.set('submitWorkflowOnApprovalStampSave', false);
            }
        });
        this.listenTo(this.model, 'change:submitWorkflowOnFormSubmit', function (model, value, options) {
            if (value && this.model.isInWorkflow(true)) {
                // Submit the workflow UI
                this.wfUIPromptSubmitClick(null, true);
                // Reset the model property, after execution
                this.model.set('submitWorkflowOnFormSubmit', false);
            }
        });
        this.listenTo(this.model.get('DocumentPackage'), 'change:Approval', function (model, value, options) {
            // Update the approval state of the UserApprovalTask's buttons and display the submit button if need be.
            this.$el.find('.wfApprove, .wfDeny').removeClass('disabled');   // remove disabled from both buttons before applying it to either of the buttons
            if (value) {
                this.setApprovalState(value.get('State'), value.get('Reason'), true);
                var taskUIData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage.TaskUIData');
                var isApprovedOrDenied = (Utility.hasFlag(value.get('State'), Constants.as.Approved) || Utility.hasFlag(value.get('State'), Constants.as.Denied));
                var was = Utility.hasFlag(value.get('State'), Constants.as.Was);
                if (taskUIData && taskUIData.IsUserApprovalOnlyInput() && (isApprovedOrDenied && !was)) {
                    this.$el.find('.submitCont').show();
                }
                // Disable the 'Approve' or 'Deny' buttons when the approval for the approval stamp has changed.
                // Disable the button that was used to change the state of the approval
                if (value.isApproved()) {
                    this.$el.find('.wfApprove').addClass('disabled');
                }
                else if (value.isDenied()) {
                    this.$el.find('.wfDeny').addClass('disabled');
                }
            }
        });
        this.listenTo(this.model.getDotted('DocumentPackage.Approvals'), 'reset', function (collection, options) {
            // The code here had many modifications over time, if you have to change it, please review bug #13789 and all the related tickets in the comments
            if (this.model.isInWorkflow()) {
                // If there was a change on my approval, we need to update the workflow metapanel to reflect it.
                // Do not render here as we could loose user prompts not yet saved
                // Do not fetch the model again as that bring different problems. For example if the workflow was autosubmited and we moved to the next document, fetch will display the previous document again.
                var myApproval = this.model.getMyApproval();
                if (myApproval) {
                    this.setApprovalState(myApproval.get('State'), myApproval.get('Reason'));
                } else {
                    this.setApprovalState(Constants.as.None, ''); // If there is no myApproval, just clear the state (works for recalls)
                }
            }
        });
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        var i = 0;
        var length = ro.taskUIData && !ro.notPermitted ? ro.taskUIData.length : 0;
        var $container = this.$el.find('.wfUIPrompts');
        var ep = this.model.effectivePermissions();
        var curActionId = this.model.getDotted('DocumentPackage.WFDocumentDataPackage.WFDocument.CurrentActionId');
        for (i; i < length; i++) {
            var td = ro.taskUIData.at(i);
            WorkflowUtil.render($container, td.get('TaskId'), td.get('UIKey'), td.get('Settings'), td.get('Exception'), td.get('Data'), ep, curActionId);
        }
        var $appCont = this.$el.find('.userApprovalTaskButtons');
        if ($appCont.length > 0) {
            var myApproval = this.model.getMyApproval();
            if (myApproval) {
                this.setApprovalState(myApproval.get('State'), myApproval.get('Reason'));
            }
        }
        this.focusInput();
        return this;
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var wfData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');
        var wfDoc = wfData.get('WFDocument');
        var wfId = wfDoc.get('WorkflowId');
        var wf = window.slimWorkflows.get(wfId);
        var notPermitted = (!wf || !Utility.hasFlag(wf.get('EffectivePermissions'), Constants.sp.View));

        var state = wfDoc.get('State');
        var pref = Utility.GetUserPreference('subOpt');
        if (!pref) {
            pref = 'submitNext';
        }
        var ro = {
            workflowName: wfDoc.get('WorkflowName'),
            stepName: wfDoc.get('CurrentStepName') || '',
            actionName: wfDoc.get('CurrentActionName') || '',
            assigneeName: wfDoc.get('AssigneeName'),
            suspended: (state & Constants.wfs.Suspended) === Constants.wfs.Suspended,
            exceptionMarkup: '',
            noCurrentActionExists: false,
            isUITask: false,
            isUIBranch: false,
            stateTexts: [],
            branchMessageDisplayHtml: '',
            terminated: (state & Constants.wfs.Terminated) === Constants.wfs.Terminated,
            canProcess: Utility.canProcess(wfDoc.get('IsAssignee'), wfDoc.get('IsOwner')),
            submitStyle: '',
            currStepStyle: '',
            currActionStyle: '',
            goBackClass: wfData.get('WFHasHistory') ? '' : 'disabled',
            submitNoneChecked: pref === 'submitNext' ? '' : 'checked="checked"',
            submitNextChecked: pref === 'submitNext' ? 'checked="checked"' : '',
            branchMsg: '',
            wfBranches: [],
            taskUIData: wfData.get('TaskUIData'),
            notPermitted: notPermitted
        };
        var i = 0;
        var branches = wfData.get('WFBranches');
        var length = branches ? branches.length : 0;
        ro.branchMsg = length === 1 ? Constants.c.selectWFBranchSingle : Constants.c.selectWFBranch;
        if (ro.canProcess && ro.taskUIData && ro.taskUIData.length > 0) {
            ro.isUITask = true;
        } else if (ro.canProcess && length > 0) {
            ro.isUIBranch = true;
            ro.actionName = Constants.c.notApplicable;
            for (i; i < length; i++) {
                var b = branches.at(i);
                ro.wfBranches.push({
                    description: b.get('Description') || '',
                    label: b.get('Label') || b.get('DestinationStepName'),
                    addClass: b.get('IsEnabled') ? '' : 'disabled',
                    id: b.get('Id')
                });
            }
        } else {
            ro.stateTexts = WorkflowUtil.getStatusText(state);
        }
        if (!ro.isUITask && (state & Constants.wfs.MetaHold) === Constants.wfs.MetaHold) {
            isUIBranch = false;
            branchMessageDisplayHtml = WorkflowUtil.getMetaHoldDisplayMessage(wfDoc.toJSON(), branches.toJSON());
        }
        if ((state & Constants.wfs.Complete) === Constants.wfs.Complete) {
            ro.currStepStyle = "style='display: none'";
            ro.currActionStyle = "style='display: none'";
        }
        var exceptionState = (state & Constants.wfs.Exception) === Constants.wfs.Exception;
        if (exceptionState) {
            var exceptionLayout = doT.template(Templates.get('wfexceptionlayout'));
            var templateData = {
                exception: wfDoc.get('Exception') || ''
            };
            ro.exceptionMarkup = exceptionLayout(templateData);
        }
        ro.noCurrentActionExists = wfDoc.get('Exception') === Constants.c.noCurrentActionExists;
        if (ro.taskUIData && ro.taskUIData.IsUserApprovalOnlyInput()) {
            // special treatment if User Approval Task is only user input
            var alreadyApproved = false;
            var currentUser = Page.currentUser;
            var roles = window.slimRoles;
            var approvals = this.model.getDotted('DocumentPackage.Approvals');
            if (approvals && approvals.length > 0) {
                i = approvals.length;
                while (i--) {
                    var a = approvals.at(i);
                    var appId = a.get('UserId');
                    var role = roles.get(appId);
                    var appState = a.get('State');
                    if ((Utility.hasFlag(appState, Constants.as.Approved) || Utility.hasFlag(appState, Constants.as.Denied)) &&
                        !Utility.hasFlag(appState, Constants.as.Was) &&
                        ((currentUser && currentUser.Id === appId) || (role && role.get('IsMember')))) {
                        alreadyApproved = true;
                        break;
                    }
                }
            }

            var stampsEnabled = Utility.convertToBool(Utility.GetSystemPreferenceValue('enableApprovalStamps'));
            var settings = ro.taskUIData.at(0).get('Settings') ? JSON.parse(ro.taskUIData.at(0).get('Settings')) : {};
            ro.submitStyle = alreadyApproved ? '' : 'display: none;';
            ro.submitStyle = !settings.IsRequired || stampsEnabled ? '' : ro.submitStyle;
        }
        return ro;
    },
    focusInput: function () {
        var wfTT = this.$el.find('.workflowTaskTemplate:first');
        var fput = wfTT.find('input, select, textarea').not('.ignore').first();
        var funcPulse = function (earlyExit) {
            fput.blur();
            var func = function () {
                fput.trigger('focus', [earlyExit]);
            };
            setTimeout(func, 300);
        };
        setTimeout(function () {
            funcPulse(false);
        }, 900);
    },
    setRecShortCutParameters: function (event) {
        $('body').trigger('setRecShortCutParameters', {
            lassoShortcutTarget: {
                setValue: function (result) {
                    var $currTarg = $(event.currentTarget);
                    $currTarg.val(result);
                    $('body').trigger('recShortCutdone', { currentTarget: $currTarg });
                }
            }
        });
    },
    highlightMissingFields: function (missingReq) {
        var i = 0;
        var length = (missingReq && missingReq.length) || 0;
        var $container = this.$el.find('.wfUIPrompts');
        $container.find('.isRequiredEmpty').removeClass('isRequiredEmpty');
        $container.find('.isRequired').css('color', '#000');

        for (i; i < length; i++) {
            var taskId = missingReq[i];
            var $taskEl = $container.find('[name="' + taskId + '"]');
            $taskEl.addClass('isRequiredEmpty');
            if ($taskEl.siblings('.isRequired').length > 0) {
                $taskEl.siblings('.isRequired').css('color', '#a60000');
            } else {
                $taskEl.parent().siblings('.isRequired').css('color', '#a60000');
            }
            if ($taskEl.hasClass('isCombo')) {
                $taskEl.siblings('.ui-button').addClass('isRequiredEmpty');
            }
            if ($taskEl.attr('type') === 'hidden') {
                $taskEl.siblings('.ignore').addClass('isRequiredEmpty');
            }
            var $userApprovalBtns = $taskEl.parent('.userApprovalTaskButtons');
            if ($userApprovalBtns.length) {
                $userApprovalBtns.find('.short_btn').addClass('isRequiredEmpty');
            }
        }
        var anyMissing = (length > 0);
        if (anyMissing) {
            this.$el.find('.isRequiredMsg').show();
        } else {
            this.$el.find('.isRequiredMsg').hide();
        }
        return anyMissing;
    },
    uiActionSuccess: function (result, currentActionId, ignoresubOptPref) {
        var state = result.WFDocument.State;
        var isCurrentAction = result.WFDocument.CurrentActionId === currentActionId;
        if (isCurrentAction && (state & Constants.wfs.Exception) === Constants.wfs.Exception) { //Error from the UI action, just display the message so the user can correct.
            var exceptionLayout = doT.template(Templates.get('wfexceptionlayout'));
            var templateData = {
                exception: result.WFDocument.Exception || ''
            };
            // Determine if an exception is already being displayed
            // If so replace it, otherwise prepend it to before the workflows ui prompts
            var markup = exceptionLayout(templateData);
            var $container = this.$el.find('.wfUIPrompts');
            if ($container.find('.wfExceptionLayout').length > 0) {
                $container.find('.wfExceptionLayout').replaceWith(markup);
            }
            else {
                $container.prepend(markup);
            }
            // Remove the executingDisabled class, so the buttons are re-enabled if they should be.
            // Don't remove the 'disabled' class if it is present.
            // The 'disabled' class means the button should remain disabled, even after the executing operation completed
            this.$el.find('.custom_button').removeClass('executingDisabled');
        }
        else {
            if (this.model.performPostSubmitAction(ignoresubOptPref)) {
                this.model.setDotted('DocumentPackage.burningInAnnotations', undefined); // hide burningInAnnotations div after performing post submit action
            }
        }
    },
    uiActionFailure: function (err) {
        ErrorHandler.popUpMessage(err);
    },
    setApprovalState: function (approvalState, reason, skipSettingButtonState) {
        var $appOut = this.$el.find('.approvalOutput');
        if (!skipSettingButtonState) {
            this.setApprovalButtonState(approvalState, reason);
        }
        var isApproved = Utility.hasFlag(approvalState, Constants.as.Approved);
        var isDenied = Utility.hasFlag(approvalState, Constants.as.Denied);
        var appState = isApproved ? Constants.as.Approved : isDenied ? Constants.as.Denied : '';
        if (appState && (isApproved || isDenied) && !Utility.hasFlag(approvalState, Constants.as.Was)) {
            var appRD = Utility.reverseMapObject(Constants.as);
            var scuApproval = {
                ApprovalState: appRD[appState], // approval state - either 'Approved' or 'Denied'
                Reason: reason
            };
            $appOut.val(JSON.stringify(scuApproval));
        }
        else {
            $appOut.val('');    // Clear the value when the approval state is 'None'
        }
    },
    setApprovalButtonState: function (approvalState, reason) {
        var $appCont = this.$el.find('.userApprovalTaskButtons');
        $appCont.find('.wfApprove')
            .addClass('isNotApproved')
            .removeClass('isApproved')
            .prop('title', '')
            .text(Constants.c.approve);
        $appCont.find('.wfDeny')
            .addClass('isNotDenied')
            .removeClass('isDenied')
            .prop('title', '')
            .text(Constants.c.deny);

        $appCont.find('.depress').removeClass('depress');
        if (Utility.hasFlag(approvalState, Constants.as.Approved) && !Utility.hasFlag(approvalState, Constants.as.Was)) {
            $appCont.find('.wfApprove')
                .addClass('isApproved')
                .removeClass('isNotApproved')
                .prop('title', reason)
                .text(Constants.c.recall)
                .addClass('depress');
        }
        else if (Utility.hasFlag(approvalState, Constants.as.Denied) && !Utility.hasFlag(approvalState, Constants.as.Was)) {
            $appCont.find('.wfDeny')
                .addClass('isDenied')
                .removeClass('isNotDenied')
                .prop('title', reason)
                .text(Constants.c.recall)
                .addClass('depress');
        }
    },
    resolveWFExcepion: function (resolutionMethod) {
        var that = this;
        var wfData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');

        var submitFunc = function () {
            wfData.resolveException(resolutionMethod, function () {
                that.model.fetch();
            });
        };
        //Save the document first if it is dirty.
        if (this.model.get('isDirty')) {
            this.model.get('DocumentPackage').save({}, {
                ignoreChange: true, // Don't allow set to trigger a dirty, the change here is the success method below, nothing else.
                success: function () {
                    submitFunc();
                }
            });
        } else {
            submitFunc();
        }
    },
    goBackSteps: function (stepCount) {
        var that = this;
        var wfData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');

        var submitFunc = function () {
            wfData.backSteps(stepCount, function () {
                that.model.fetch();
            });
        };
        //Save the document first if it is dirty.
        if (this.model.get('isDirty')) {
            this.model.get('DocumentPackage').save({}, {
                ignoreChange: true, // Don't allow set to trigger a dirty, the change here is the success method below, nothing else.
                success: function () {
                    submitFunc();
                }
            });
        } else {
            submitFunc();
        }
    },
    wfURLPush: function (param, value) {
        // Set the document workflow panel based on the param and value passed in        
        var par;
        var uiOutput;
        var $container = this.$el.find('.wfUIPrompts');
        var $wftts = $container.find('.workflowTaskTemplate');
        var len = $wftts.length;
        var i = 0, j = 0;
        var wfParam = decodeURI(param.split('.').pop());   // Get UserPromptString from the passed in parameter
        var wfParamFound = false;
        var ff = function (xhr, statusText, error) {
            ErrorHandler.popUpMessage(error);
        };
        /* 
            wftt: workflow task template
        */
        var func = function (wftt) {
            // the correct Task Template has been found, fill out its values            
            uiOutput = wftt.find('.uiOutput');
            // Detect what type of html element the value needs to be put in
            if (uiOutput.is('input')) {
                // Obtain type of html input (radio, checkbox...)
                var type = uiOutput.attr('type');
                // Determine if value is a boolean that equates to true, otherwise it is false
                var isTrue = false;
                if (parseInt(value, 10) === 1 || value.toLowerCase() === 'true' || value === true) {
                    isTrue = true;
                }
                if (type === 'radio') {
                    // is a radio
                    var radLen = uiOutput.length;
                    var radTrue, radFalse;
                    // Get the true radio and the false radio inputs
                    for (j = 0; j < radLen; j++) {
                        var rad = $(uiOutput[j]);
                        if (rad.val() === 'true') {
                            radTrue = rad;
                        }
                        else if (rad.val() === 'false') {
                            radFalse = rad;
                        }
                    }
                    // Select the correct radio
                    if (isTrue) {
                        radTrue.attr('checked', 'checked');
                    }
                    else {
                        radFalse.attr('checked', 'checked');
                    }
                }
                else if (type === 'checkbox') {
                    // is a checkbox
                    // Check/Uncheck the checkbox depending on value
                    if (isTrue) {
                        uiOutput.attr('checked', 'checked');
                    }
                    else {
                        uiOutput.removeAttr('checked');
                    }
                }
                else if (type === 'hidden') {
                    // Determine if it is a folder
                    par = uiOutput.parent().find('input[name="wfFolderSelection"]');
                    if (par.length > 0) {
                        // Fetch folder Id from folder path
                        value = value.replace(/\\/ig, '/');   // replace all \ with /
                        var folderProxy = FolderServiceProxy();
                        var sf = function (folder) {
                            if (folder) {   // If folder is found, set workflow values
                                uiOutput.val(folder.Id);
                                par.val(value); // Set value of display input for folder to display the folder path
                            }
                        };
                        folderProxy.getByPath(value, sf, ff);
                    }
                }
                else {
                    // is just an input                        
                    uiOutput.val(value);
                }
            }
            else if (uiOutput.is('select')) {
                var opts = uiOutput.find('option');
                var selLen = opts.length;
                for (j = 0; j < selLen; j++) {
                    var opt = $(opts[j]);
                    if (opt.text() === value) {
                        opt.attr('selected', 'selected');
                        break;
                    }
                }
                if (uiOutput.hasClass('combo')) {
                    // is a combobox
                    wftt.find('.ui-combobox input').val(value); // Find the input                        
                }
            }
            else if (uiOutput.is('textarea')) {
                // is textarea
                uiOutput.val(value).text(value);
            }
            wfParamFound = true;
        };
        for (i = 0; i < len; i++) {
            var wftt = $($wftts[i]);
            var ups = wftt.find('.UserPromptString').text();
            // Detect if the User Prompt String passed in matches any of the Workflows User Prompt Strings
            if (ups.indexOf(wfParam) !== -1) {
                func(wftt);
                break;
            }
        }
        return wfParamFound;
    },

    wfUIPromptSubmitClick: function (e, reloadPage) {
        var that = this;
        var $container = this.$el.find('.wfUIPrompts');
        var dto = DTO.getDTO($container);
        var wfData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');
        var missingReq = wfData.verifyAllRequired(dto);
        if (this.highlightMissingFields(missingReq)) {
            return;
        }
        var currActionId = wfData.getDotted('WFDocument.CurrentActionId');
        this.$el.find('.custom_button').addClass('executingDisabled');
        var submitFunc = function () {
            wfData.submitUIPromptValues(dto, {
                wfExHandledInSuccess: true,
                ignoreChange: true, // Don't allow set to trigger a dirty
                success: function (result) { that.uiActionSuccess(result, currActionId); },
                failure: function (err) { that.uiActionFailure(err); },
                complete: function () { if (reloadPage) { that.model.trigger('change:currentPage', that); } }
            });
        };
        //Save the document first if it is dirty.
        if (this.model.get('isDirty')) {
            var taskUIData = that.model.getDotted('DocumentPackage.WFDocumentDataPackage.TaskUIData');
            var performSubmit = !taskUIData || !taskUIData.IsUserApprovalOnlyInput();
            this.model.get('DocumentPackage').save({}, {
                ignoreChange: true, // Don't allow set to trigger a dirty, the change here is the success method below, nothing else.
                success: function () {
                    // Don't call the submitFunc if there is only a UserApprovalTask, before saving the document
                    // If there is only a UserApprovalTask and the document is saved, then the workflow is progressed by the save
                    if (performSubmit) {
                        submitFunc();
                    } else {
                        if (that.model.performPostSubmitAction(false, true)) { //submit and next if needed
                            that.model.setDotted('DocumentPackage.burningInAnnotations', undefined); // hide burningInAnnotations div after fatch .
                        }
                    }
                },
                failure: function () {
                    that.$el.find('.custom_button').removeClass('executingDisabled');
                }
            });
        } else {
            submitFunc();
        }
    },
    submitClickOnKey: function (e) {
        var $currTarg = $(e.currentTarget);
        var isSpace = e.keyCode === 32;
        var submitHasFocusAndClick = ($currTarg.hasClass('wfUIPromptSubmit') && isSpace); // space was pressed and the submit button is focused
        if (e.keyCode === 13 || submitHasFocusAndClick) {
            var $submit = this.$el.find('.wfUIPromptSubmit');
            // Show that the 'Submit' button is being pressed
            var that = this;
            Utility.customButtonClick($submit, function () {
                that.wfUIPromptSubmitClick(e);
            });
        }
    },
    wfFailedRetryClick: function (e) {
        this.resolveWFExcepion(Constants.wfrm.Retry);
    },
    wfFailedRestartClick: function (e) {
        this.resolveWFExcepion(Constants.wfrm.Restart);
    },
    wfFailedTerminateClick: function (e) {
        this.resolveWFExcepion(Constants.wfrm.Terminate);
    },
    wfFailedRemoveClick: function (e) {
        var that = this;
        var submitFunc = function () {
            var wfData = that.model.getDotted('DocumentPackage.WFDocumentDataPackage');
            wfData.removeWorkflow(WorkflowDialogs.remove, function () {
                that.model.fetch();
            });
        };
        //Save the document first if it is dirty.
        if (this.model.get('isDirty')) {
            this.model.get('DocumentPackage').save({}, {
                ignoreChange: true, // Don't allow set to trigger a dirty, the change here is the success method below, nothing else.
                success: function () {
                    submitFunc();
                }
            });
        } else {
            submitFunc();
        }
    },
    wfRestoreClick: function (e) {
        this.resolveWFExcepion(Constants.wfrm.Retry);
    },
    wfBackClick: function (e) {
        var that = this;
        that.clickCount += 1;
        if (that.backCountTimer) {
            clearTimeout(that.backCountTimer);
        }
        that.backCountTimer = setTimeout(function () {
            that.goBackSteps(that.clickCount);
            that.clickCount = 0;
        }, 300);
    },
    wfUISubmitOptionsClick: function (e) {
        var menu = this.$el.find('.wfSubmitOptionsList');
        menu.toggle();
    },
    wfSubmitOptionsCloseClick: function (e) {
        var menu = this.$el.find('.wfSubmitOptionsList');
        menu.fadeOut(1000);
    },
    submitNoneClick: function (e) {
        Utility.SetSingleUserPreference('subOpt', 'submitNone');
        var menu = this.$el.find('.wfSubmitOptionsList');
        menu.fadeOut(1000);
    },
    submitNextClick: function (e) {
        Utility.SetSingleUserPreference('subOpt', 'submitNext');
        var menu = this.$el.find('.wfSubmitOptionsList');
        menu.fadeOut(1000);
    },
    wfBranchClick: function (e) {
        var that = this;
        var $sel = $(e.currentTarget);
        var branchId = $sel.data('branchid');
        var wfData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');

        var currActionId = wfData.getDotted('WFDocument.CurrentActionId');
        var submitFunc = function () {
            wfData.selectUIBranch(branchId, {
                ignoreChange: true, // Don't allow set to trigger a dirty,
                success: function (result) { that.uiActionSuccess(result, currActionId, true); },
                failure: function (err) { that.uiActionFailure(err); }
            });
        };
        //Save the document first if it is dirty.
        if (this.model.get('isDirty')) {
            this.model.get('DocumentPackage').save({}, {
                ignoreChange: true, // Don't allow set to trigger a dirty, the change here is the success method below, nothing else.
                success: function () {
                    submitFunc();
                }
            });
        } else {
            submitFunc();
        }
    },
    setApprovalClick: function (e) {
        var that = this;
        var $sel = $(e.currentTarget);
        var $appOut = $sel.siblings('.approvalOutput');
        var approving = $sel.hasClass('wfApprove');
        var recalling = $sel.hasClass('isApproved') || $sel.hasClass('isDenied');
        if (recalling) {
            this.model.setMyApproval(ApprovalDialogs.setMyApproval, { approving: approving }); //mayDelaySave argument is not relevent here, because a recall is never delayed
            return;
        }

        if ($sel.hasClass('isNotApproved')) {
            approving = true;
        } else if ($sel.hasClass('isNotDenied')) {
            approving = false;
        } else {
            if ($sel.hasClass('isApproved')) {
                approving = true;
            }
            if ($sel.hasClass('isDenied')) {
                approving = false;
            }
        }
        var options = {
            approving: approving,
            mayDelaySave: true,
            callback: function (scuApproval, cleanup, fetchExecuted) {
                var stampsEnabled = Utility.convertToBool(Utility.GetSystemPreferenceValue('enableApprovalStamps'));
                if (!fetchExecuted && !stampsEnabled) {
                    that.setApprovalState(scuApproval.State, scuApproval.Reason);
                }
                Utility.executeCallback(cleanup);
            }
        };
        this.model.setMyApproval(ApprovalDialogs.setMyApproval, options);
    },
    wfChatInputKeyUp: function (e) {
        if (e.keyCode === 13) {
            var that = this;
            var wfData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage');
            var $chatInput = this.$el.find('.wfChatInput');
            var chatText = $chatInput.val();
            var chatType = Utility.GetUserPreference('histTab');
            if (!chatType) {
                chatType = 'allChat';
            }
            $chatInput.attr('disabled', true);
            var cf = function () { $chatInput.attr('disabled', false).val('').focus(); };

            wfData.addChatMessage(chatText, chatType, cf);
        }
    },
    executingChanged: function (m, o) {
        if (this.model.getDotted('DocumentPackage.WFDocumentDataPackage.executing')) {
            this.$el.find('.wf_button').addClass('executingDisabled');
        } else {
            this.$el.find('.wf_button').removeClass('executingDisabled');
        }
    },
    zoomToRegion: function (e) {
        var $sel = $(e.currentTarget);
        var data = this.model.getDotted('DocumentPackage.WFDocumentDataPackage.TaskUIData');
        if (!data) {
            return;
        }
        var taskId = $sel.attr('name');
        var td = data.get(taskId);
        if (!td) {
            return;
        }
        var val;
        var region = {};
        var regionFound = false;
        var settings = td.get('Settings');
        if (settings) {
            if (typeof settings === 'string') {
                settings = JSON.parse(settings);
            }
            for (val in settings) {
                if (settings.hasOwnProperty(val)) {
                    if (val === 'Region') {
                        region = settings[val];
                        regionFound = true; // Region supersedes individual properties
                    }
                    else if (val === 'Top' || val === 'Left' || val === 'Width' || val === 'Height' || val === 'Page') {
                        if (!regionFound) {
                            region[val] = settings[val];
                        }
                    }
                }
            }
            if (!regionFound) {
                region.isLegacyRegion = true;
            }
        }
        if (!$.isEmptyObject(region)) {
            this.model.trigger('zoomToRegion', region);
        }
    },
    cleanupZoomHighlights: function (e) {
        this.model.trigger('cleanupHighlights');
    }
});