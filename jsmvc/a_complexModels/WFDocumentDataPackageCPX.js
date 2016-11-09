var WFDocumentDataPackageCPX = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        var attr;
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.WFDocument) {
            attr = attrs.WFDocument;
            if (this.get('WFDocument') instanceof Backbone.Model) {
                this.get('WFDocument').set(attr, options);
                delete attrs.WFDocument;
            }
            else {
                attrs.WFDocument = new WFDocument();
                attrs.WFDocument.set(attr, options);
                this.bindSubModelEvents(attrs.WFDocument, 'WFDocument');
            }
        }
        if (attrs.WFBranches) {
            attr = attrs.WFBranches;
            if (this.get('WFBranches') instanceof Backbone.Collection) {
                this.get('WFBranches').set(attr, options);
                delete attrs.WFBranches;
            }
            else {
                attrs.WFBranches = new WFBranches();
                attrs.WFBranches.set(attr, options);
                this.bindSubModelEvents(attrs.WFBranches, 'WFBranches');
            }
        }
        if (attrs.TaskUIData) {
            attr = attrs.TaskUIData;
            if (this.get('TaskUIData') instanceof Backbone.Collection) {
                this.get('TaskUIData').set(attr, options);
                delete attrs.TaskUIData;
            }
            else {
                attrs.TaskUIData = new TaskUIData();
                attrs.TaskUIData.set(attr, options);
                this.bindSubModelEvents(attrs.TaskUIData, 'TaskUIData');
            }
        }
        if (key === "ChatLog") {
            options.setDirty = false;
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    toJSON: function () {
        return this.toJSONComplex();
    },
    /// <summary>
    /// Validates that all required fields have a value in the uiPromptValues
    /// </summary>
    /// <param name="uiPromptValues">Object representing the values obtained from the UI</param>
    verifyAllRequired: function (uiPromptValues) {
        var result = [];
        var uiTasks = this.get('TaskUIData');
        var i = 0;
        var length = uiTasks ? uiTasks.length : 0;
        for (i; i < length; i++) {
            var t = uiTasks.at(i);
            var s = Utility.tryParseJSON(t.get('Settings'));
            if (s && s.IsRequired) {
                var val = uiPromptValues[t.get('TaskId')];
                if ((!val && val !== false) || val === Constants.c.emptyGuid) {
                    result.push(t.get('TaskId'));
                }
            }
        }
        return result;
    },
    /// <summary>
    /// Submits the given values to the server
    /// </summary>
    /// <param name="uiPromptValues">Object representing the values obtained from the UI</param>
    /// <param name="options">May contain success / failure functions, also passed in as model.set options.</param>
    submitUIPromptValues: function (uiPromptValues, options) {
        options = options || {};
        this.setStickyFieldsPref(uiPromptValues);
        var wfProxy = WorkflowServiceProxyV2();
        var that = this;
        var ff = function (xhr, status, err) {
            that.set('executing', false);
            Utility.executeCallback(options.failure, err);
        };
        var sf = function (result) {
            that.set('executing', false);
            var state = result.WFDocument.State;
            if ((state & Constants.wfs.Exception) !== Constants.wfs.Exception) {
                that.set(result, options);
            }
            else if (!options.wfExHandledInSuccess) {
                ff(null, null, { Message: result.WFDocument.Exception });
            }
            $('body').trigger('MassDocumentUpdated', {
                ids: [that.get('DocumentId')],
                callback: function () {
                    Utility.executeCallback(options.success, result);
                }
            });
        };
        var cf = function () {
            Utility.executeCallback(options.complete);
        };
        that.set('executing', true);
        var updateWFDocumentUIPkg = { WFDocumentId: that.getDotted('WFDocument.Id'), Inputs: JSON.stringify(uiPromptValues) };
        wfProxy.processWorkflowDocumentUI(updateWFDocumentUIPkg, sf, ff, cf, null, { "ds-options": Constants.sro.NotifyVerbosely });
    },
    /// <summary>
    /// Sets the sticky fields user preference based on the users input values and if the task supports sticky fields.
    /// </summary>
    /// <param name="uiPromptValues">Object representing the values obtained from the UI</param>
    setStickyFieldsPref: function (uiPromptValues) {
        var result = [];
        var uiTasks = this.get('TaskUIData');
        var actionId = this.getDotted('WFDocument.CurrentActionId');
        var stickyObj = {};
        stickyObj[actionId] = {};
        var sfPref = Utility.GetUserPreference('stickyFields');
        if (sfPref) {
            sfPref = JSON.parse(sfPref);
        } else {
            sfPref = {};
        }
        var i = 0;
        var length = uiTasks ? uiTasks.length : 0;
        for (i; i < length; i++) {
            var t = uiTasks.at(i);
            var s = Utility.tryParseJSON(t.get('Settings'));
            if (s && Utility.convertToBool(s.StickyField)) {
                var val = uiPromptValues[t.get('TaskId')];
                if (val instanceof Array) {
                    val = val[0];
                }
                stickyObj[actionId][t.get('TaskId')] = val;
            }
        }
        $.extend(sfPref, stickyObj);
        // Set user preference
        Utility.SetSingleUserPreference('stickyFields', JSON.stringify(sfPref));
    },
    /// <summary>
    /// Submits a UI branch selection to the server.
    /// </summary>
    /// <param name="branchId">Branch id selected</param>
    /// <param name="options">May contain success / failure functions, also passed in as model.set options.</param>
    selectUIBranch: function (branchId, options) {
        var that = this;
        var args = { WFDocumentId: this.getDotted('WFDocument.Id'), WFBranchId: branchId };
        var sf = function (result) {
            that.set('executing', false);
            var state = result.WFDocument.State;
            if ((state & Constants.wfs.Exception) !== Constants.wfs.Exception) {
                that.set(result, options);
            }
            $('body').trigger('MassDocumentUpdated', { ids: [that.get('DocumentId')] });
            Utility.executeCallback(options.success, result);
        };
        var ff = function (jqXHR, textStatus, err) {
            that.set('executing', false);
            Utility.executeCallback(options.failure, err);
        };
        this.set('executing', true);
        var wfProxy = WorkflowServiceProxyV2();
        wfProxy.selectBranch(args, sf, ff, null, null, { "ds-options": Constants.sro.NotifyVerbosely });
    },
    /// <summary>
    /// Terminates the current workflow
    /// </summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.terminate, exception in unit tests where a UI will not be presented.</param>
    terminateWorkflow: function (dialogFunc) {
        var that = this;
        var args = [this.getDotted('WFDocument.Id')];
        dialogFunc({
            count: 1,
            callback: function (cleanup) {
                var sf = function (result) {
                    that.set('executing', false);
                    that.setDotted('WFDocument.State', Constants.wfs.Terminated);
                    that.set({ WFBranches: undefined, TaskUIData: undefined });
                    $('body').trigger('MassDocumentUpdated', { ids: [that.get('DocumentId')] });
                    Utility.executeCallback(cleanup, result);
                };
                var ff = function (jqXHR, textStatus, err) {
                    that.set('executing', false);
                    ErrorHandler.popUpMessage(err);
                    Utility.executeCallback(cleanup, err);
                };
                that.set('executing', true);
                var wfProxy = WorkflowServiceProxyV2();
                wfProxy.terminateWorkflow(args, sf, ff, null, null, { "ds-options": Constants.sro.NotifyVerbosely });
            }
        });
    },
    /// <summary>
    /// Removes the current workflow
    /// </summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.remove, exception in unit tests where a UI will not be presented.</param>
    /// <param name="successCallback">On completion of a successful workflow termination this method is invoked.</param>
    removeWorkflow: function (dialogFunc, successCallback) {
        var that = this;
        var args = [this.getDotted('WFDocument.Id')];
        dialogFunc({
            count: 1,
            callback: function (cleanup) {
                var sf = function (result) {
                    that.set('executing', false);
                    that.set({ WFDocument: undefined, WFBranches: undefined, TaskUIData: undefined });
                    Utility.executeCallback(cleanup, result);
                    $('body').trigger('MassDocumentUpdated', { ids: [that.get('DocumentId')] });
                    Utility.executeCallback(successCallback);
                };
                var ff = function (jqXHR, textStatus, err) {
                    that.set('executing', false);
                    ErrorHandler.popUpMessage(err);
                    Utility.executeCallback(cleanup, err);
                };
                that.set('executing', true);
                var wfProxy = WorkflowServiceProxyV2();
                wfProxy.removeDocumentFromWorkflow(args, sf, ff, null, null, { "ds-options": Constants.sro.NotifyVerbosely });
            }
        });
    },
    /// <summary>
    /// Resets the workflow to start from the beginning
    /// </summary>
    /// <param name="dialogFunc">Should always be WorkflowDialogs.reset, exception in unit tests where a UI will not be presented.</param>
    /// <param name="successCallback">On completion of a successful workflow reset this method is invoked.</param>
    resetWorkflow: function (dialogFunc, successCallback) {
        var that = this;
        var o = {
            wfDocumentIds: [this.getDotted('WFDocument.Id')],
            callback: function (resetArgs, successCleanup, failureCleanup, cleanup) {
                var sf = function (result) {
                    that.set('executing', false);
                    Utility.executeCallback(successCleanup, result);
                    Utility.executeCallback(cleanup);
                    $('body').trigger('MassDocumentUpdated', { ids: [that.get('DocumentId')] });
                    if (successCallback) {
                        Utility.executeCallback(successCallback);
                    }
                };
                var ff = function (jqXHR, textStatus, errorThrown) {
                    that.set('executing', false);
                    if (failureCleanup) {
                        failureCleanup(jqXHR, textStatus, errorThrown);
                    }
                    Utility.executeCallback(cleanup);
                };
                that.set('executing', true);
                var wfProxy = WorkflowServiceProxyV2();
                wfProxy.resetWorkflow(resetArgs, sf, ff);
            }
        };
        dialogFunc(o);
    },
    /// <summary>
    /// Resolves a workflow using one of the WFExceptionResolutionMethods.
    /// Although this object will be updated in all cases, you should provide a success callback on a restart / retry as it may have caused a document meta change.
    /// </summary>
    /// <param name="resolutionMethod">WFExceptionResolutionMethods: Retry, Remove, Restart, or Terminate</param>
    /// <param name="successCallback">On completion of a successful workflow resolution this method is invoked.</param>
    resolveException: function (resolutionMethod, successCallback) {
        var that = this;
        var args = { WFDocumentId: this.getDotted('WFDocument.Id'), Method: resolutionMethod };
        var sf = function (result) {
            that.set('executing', false);
            if (result) {
                that.set(result);
            }
            else {
                that.set({ WFDocument: undefined, WFBranches: undefined, TaskUIData: undefined });
            }
            $('body').trigger('MassDocumentUpdated', { ids: [that.get('DocumentId')] });
            Utility.executeCallback(successCallback);
        };
        var ff = function (jqXHR, textStatus, error) {
            that.set('executing', false);
            that.setDotted('WFDocument.Exception', error.Message);
        };
        this.set('executing', true);
        var wfProxy = WorkflowServiceProxyV2();
        wfProxy.resolveException(args, sf, ff, null, null, { "ds-options": Constants.sro.NotifyVerbosely });

    },
    /// <summary>
    /// Moves the workflow back the number of steps passed
    /// </summary>
    backSteps: function (stepCount, successCallback) {
        var that = this;
        var args = {
            WFDocumentId: this.getDotted('WFDocument.Id'),
            StepCount: stepCount
        };
        var sf = function (result) {
            that.set('executing', false);
            if (result) {
                that.set(result);
            }
            else {
                that.set({ WFDocument: undefined, WFBranches: undefined, TaskUIData: undefined });
            }
            Utility.executeCallback(successCallback);
            $('body').trigger('MassDocumentUpdated', { ids: [that.get('DocumentId')] });
        };
        var ff = function (jqXHR, textStatus, error) {
            that.set('executing', false);
            ErrorHandler.popUpMessage(error);
        };
        this.set('executing', true);
        var wfProxy = WorkflowServiceProxyV2();
        wfProxy.documentBackSteps(args, sf, ff, null, null, { "ds-options": Constants.sro.NotifyVerbosely });
    },
    /// <summary>
    /// Retrieves a formated chat log based on the type of chat log passed.
    /// </summary>
    /// <param name="chatLog">This may be userChat, sysChat, or allChat.</param>
    getFormattedChatLog: function (chatLog) {
        var that = this;
        var args = {
            WFDocumentId: this.getDotted('WFDocument.Id'),
            IncludeUserChat: chatLog === 'userChat' || chatLog === 'allChat',
            IncludeSystemChat: chatLog === 'sysChat' || chatLog === 'allChat'
        };
        var sf = function (result) {
            that.set('ChatLog', result);
        };
        var ff = function (jqXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        var wfProxy = WorkflowServiceProxyV2();
        wfProxy.getFormattedChat(args, sf, ff);

    },
    ///<summary>
    /// Obtain TaskUIData from package
    ///</summary>
    getTaskUIData: function () {
        return this.get('TaskUIData') || [];
    },
    ///<summary>
    /// Determine if the taskUIData has the specified flag
    /// <param name="flagToCheck">The Constants.wftf (workflow task flag) to check for
    /// </summary>
    taskUIDataHasFlag: function (flagToCheck) {
        var hasFlag = false;
        var taskUIData = this.getTaskUIData();
        var idx = 0;
        var length = taskUIData.length;
        for (idx; idx < length; idx++) {
            var taskUIDatum = taskUIData.at(idx);
            hasFlag = Utility.hasFlag(taskUIDatum.get('Flags'), flagToCheck);
            if (!hasFlag) {
                break;
            }
        }
        return hasFlag;
    },
    addChatMessage: function (chatMsg, chatType, completeCB) {
        var that = this;
        var wfData = this.get('WFDocument');
        if (chatMsg.length === 0) {
            Utility.executeCallback(completeCB);
            return;
        }
        if (!wfData) {
            Utility.executeCallback(completeCB);
            return;
        }
        var workflowChatPkg = {
            WFDocumentId: wfData.get('Id'),
            Message: chatMsg,
            IncludeUserChat: chatType === 'userChat' || chatType === 'allChat',
            IncludeSystemChat: chatType === 'sysChat' || chatType === 'allChat'
        };
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var success = function (result) {
            if (chatType !== 'approvals') {
                that.set('ChatLog', result, { ignoreChange: true });
                $('body').trigger('MassDocumentUpdated', { ids: [that.get('DocumentId')] });
            }
        };
        var failure = function (jqXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        var complete = function () {
            Utility.executeCallback(completeCB);
        };
        var wfProxy = WorkflowServiceProxyV2();
        wfProxy.addToChat(workflowChatPkg, success, failure, complete);
    }
});