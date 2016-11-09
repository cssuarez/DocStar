// Utility for workflow functionality
var WorkflowUtil = {
    lastWorkflowItems: undefined,
    lastApprovalItems: undefined,
    wfProxy: WorkflowServiceProxyV2({ raiseOverridableException: true }),
    refreshView: '',
    clearCache: '',
    wfAddAction: 'wfAddAction',
    fillWorkflows: function () {
        var slimWfs = window.slimWorkflows;
        $('#workflow_selection .workflow_dd .children').empty();
        var length = slimWfs.length;
        var i = 0;
        for (i; i < length; i++) {
            var wf = slimWfs.at(i);
            if(Utility.checkSP(wf.get('EffectivePermissions'), Constants.sp.Add_To)){
                $('#workflow_selection .workflow_dd .children').append(
                        $(document.createElement('li')).append(
                            $(document.createElement('span'))
                                .addClass('anchor')
                                .attr('name', wf.get('Id'))
                                .text(wf.get('Name'))
                        )
                    );
            }
        }
    },
    fillAssignees: function () {
        var isAdmin = Utility.convertToBool($('#isSuperAdmin').val());
        var slimUsers = Utility.getUsersDictionary(null, null, !isAdmin);
        var slimRoles = window.slimRoles;

        $('#reassignWfDoc .reassign .children').empty();

        var user;
        for (user in slimUsers) {
            if (slimUsers.hasOwnProperty(user)) {
                $('#reassignWfDoc .reassign .children').append(
                        $(document.createElement('li')).append(
                            $(document.createElement('span'))
                                .addClass('anchor')
                                .attr('name', user)
                                .text(slimUsers[user])
                        )
                    );
            }
        }

        var lengthRoles = slimRoles.length;
        var i = 0;
        for (i; i < lengthRoles; i++) {
            var roles = slimRoles.at(i);
            $('#reassignWfDoc .reassign .children').append(
                    $(document.createElement('li')).append(
                        $(document.createElement('span'))
                            .addClass('anchor')
                            .attr('name', roles.get('Id'))
                            .text(roles.get('Name'))
                    )
                );
        }
    },
    markNewItemsViewed: function (markWFItems, markApprovalItems) {
        Utility.SetSingleUserPreference(Constants.UtilityConstants.WORKFLOW_LAST_CHECKED, new Date());
        var contents;
        if (markWFItems) {
            contents = $('#' + Constants.c.myWorkflows).contents();
            contents[contents.length - 1].nodeValue = Constants.c.myWorkflows;
            $('#' + Constants.c.myWorkflows).parent().css('font-weight', 'normal');
        }
        if (markApprovalItems) {
            contents = $('#' + Constants.c.myApprovals).contents();
            contents[contents.length - 1].nodeValue = Constants.c.myApprovals;
            $('#' + Constants.c.myApprovals).parent().css('font-weight', 'normal');
        }

    },
    closeWorkflowDialog: function (disableButtons, closeDialog, noAdditionalAction, versionIds) {
        var wfAddAction = 'wfAddAction';
        var wfSelector = '#workflow_selection';
        if (disableButtons) {
            disableButtons();
        }
        $(wfSelector + ' .wf_dropdown_text').val('');
        $(wfSelector + ' .wf_dropdown_text').text('');
        $(wfSelector + ' .wf_dropdown_text').css('title', '');
        if (closeDialog) {
            DialogsUtil.isDialogInstanceDestroyDialog($(wfSelector));
        }
        if (!noAdditionalAction) {
            var additionalAction = Utility.GetUserPreference(wfAddAction);
            if (!additionalAction) {
                var $selector = $(wfSelector).find('input:checked');
                additionalAction = $selector.attr('class');
                WorkflowUtil.assignWorkflowAddAction($selector);
            }
            if (additionalAction) {
                if (additionalAction === 'addActViewItems' && (!$('#entityMeta').is(':visible') || !$('#entityViewer').is(':visible'))) {
                    // Call proper clickView to view the document(s)
                    // Currently this can occur from the Retrieve Tab or the Workflow Tab
                    WorkflowUtil.viewItemsOnAssignWorkflow(versionIds);
                }
                else if (additionalAction === 'addActViewQueue') {
                    // Open Work Item Accordion
                    var workItems = 'work_items';
                    Utility.SetUserPreferenceWithoutAjax(workItems, 'open');
                    var cb = function () {
                        var ev = new $.Event('click', { currentTarget: $('#' + workItems).find('.accordion').get(0) });
                        if (!$(ev.currentTarget).is(':visible')) {
                            ShowHideUtil.showHideWfAccordion(ev, '#workflow_layout');
                        }
                    };
                    Navigation.showWorkflowPanel(cb);
                }
            }
        }
    },
    assignWorkflowAddAction: function (selector) {
        var kvPairs = [];
        kvPairs.push({ Key: this.wfAddAction, Value: $(selector).attr('class') });
        Utility.SetUserPreference(kvPairs);
    },
    viewItemsOnAssignWorkflow: function (versionIds) {
        $('body').trigger('ViewDocuments', { versionIds: versionIds });
    },
    setDropDownText: function (selected, specname) {
        if (selected) {
            var value = function (additional) { return '#wfItems_filter .select_' + additional; },
                id = value(specname),
                mid = id + "_dropdown_text",
                li = $(id).find('ul.children li span[name="' + selected + '"]'),
                text = $.trim(li.text());
            $(mid).text(text);
            $(mid).val($(li).attr('name'));
            $(mid).attr('title', text);
        }
    },
    enableButtons: function (titles) {
        Utility.enableButtons(titles);
    },
    disableButtons: function (titles, that) {
        return Utility.disableButtons(titles, that);
    },
    // Gets the status text for a workflow
    getStatusText: function (wfstate) {
        var stateText = [];
        var val;
        var rev_wfs = Utility.reverseMapObject(Constants.wfs);
        if (rev_wfs[wfstate]) {
            stateText.push(Constants.c['wfs_' + rev_wfs[wfstate]]);
        }
        else {
            for (val in rev_wfs) {
                if (rev_wfs.hasOwnProperty(val)) {
                    var intVal = parseInt(val, 10);
                    if (rev_wfs.hasOwnProperty(val) && (wfstate & intVal) === intVal) {
                        if (intVal !== 0 || wfstate <= 0) {
                            stateText.push(Constants.c['wfs_' + rev_wfs[val]]);
                        }
                    }
                }
            }
        }
        return stateText;
    },
    //Gets the label, condition, and description (if they exist) to display to the user when the workflow is in the MetaHold state, and the Automatic branch condition is not met
    getMetaHoldDisplayMessage: function (workflow, wfBranches) {
        var i = 0;
        var length = wfBranches.length;
        var html = '';
        var autoBranchDisplay = '';
        if (!workflow || !wfBranches || wfBranches.length === 0) {
            return html;
        }
        autoBranchDisplay = $('<div></div>').append(
            $('<span></span>').text(Constants.c.branchConditionNotMet)
        ).append(
            $('<ul></ul>')
        );
        for (i = 0; i < length; i++) {
            var branch = wfBranches[i];
            // Append each branches data that matches the current steps id
            if (workflow.CurrentStepId === branch.StepId) {
                var condition = branch.Condition.replace('doc.', '');
                var description = branch.Description;
                var label = branch.Label;
                $(autoBranchDisplay).find('ul').append(
                    $('<li></li>').text(condition + (label !== '' ? ' | ' + label : '')).attr('title', description)
                );
            }
        }
        return autoBranchDisplay.html();
    },
    // called once before all render() calls.
    // renders a workflow UI template for one task
    render: function ($container, id, key, settings, exception, data, effectivePermissions, actionId) {
        var val;
        var template;
        // Handle task exceptions
        if (exception) {
            template = $('#WFTT_Exception').clone(true, true);
            var $exception = template.find('.exception');
            $exception.addClass(css.warningErrorClass);
            $exception.text(exception.Message);
        }
        else {
            template = $('#WFTT_' + key).clone(true, true);
            if (key === 'UserApprovalTask') { // Note: Bug 10229, there could be a special permissions property for each user input task, but at this time I can't forsee any others needing one
                // Check User Perms
                var hasApprovePerms = Utility.checkGP(effectivePermissions, Constants.sp.Approve);
                if (!hasApprovePerms) {
                    var rmoSP = Utility.reverseMapObject(Constants.sp);
                    template.children().find('a, input').remove();
                    template.children().append($('<span></span>').addClass('wfInsufficientPermissions').text(String.format(Constants.c.insufficientPermissionsRight, rmoSP[Constants.sp.Approve])));
                }
            }
            var output = template.find('[name="output"]');
            output.attr('name', id);
            if (settings) {
                if (typeof settings === 'string') {
                    settings = JSON.parse(settings);
                }
                for (val in settings) {
                    if (settings.hasOwnProperty(val) && val && val.indexOf('$') < 0) {
                        if (val === 'IsRequired' && settings[val]) {  // If the settings is IsRequired 
                            template.children().append($('#WFTT_IsRequired span').clone(true, true));
                        }
                        else if (val === 'StickyField' && settings[val]) {
                            template.children().append($('#WFTT_StickyField input').clone(true, true).val(settings[val]));
                        }
                        else {
                            var el = template.find('.' + val);
                            el.attr('title', settings[val]);
                            el.text(settings[val]);
                            el.val(settings[val]);
                        }
                    }
                }
            }
            if (this[key]) {
                this[key](id, key, settings, template, data);
            }
            WorkflowUtil.setStickyFields(id, output, actionId);
        }
        $container.append($(template).children());
    },
    /*
        Set the values of a Sticky Field Task obtained from User Preferences
    */
    setStickyFields: function (taskId, output, actionId) {
        var stickyFieldsPref = Utility.GetUserPreference('stickyFields');
        var stickyFields;
        // Obtain Sticky Fields User Preference
        if (stickyFieldsPref) {
            stickyFieldsPref = JSON.parse(stickyFieldsPref);
            stickyFields = stickyFieldsPref[actionId];
        }
        /*  Special cases -
              Folder Selection - Use the Id in User Preferences to obtain folder path
                                 Set the input[name="wfFolderSelection"] value to the folder path obtained
                                 Set 'output' value to the Id in User Preferences
              Combobox -  Search for the Value from User Preferences in the select list and select that option
                          Set the combo box's input value to the Value from the User preference, but only if an option is selected
        */
        if (!stickyFields) {
            return;
        }
        var parent = output.parent();
        var folderTaskSel = parent.find('input[name="wfFolderSelection"]');
        var stickyValue = stickyFields[taskId];
        // If stickyValue is an object, as is the case for dropdowns and comboboxes, then set the sticky to just the value of the first key value pair
        if ($.isPlainObject(stickyValue)) {
            var key;
            for (key in stickyFields[taskId]) {
                if (stickyFields[taskId].hasOwnProperty(key)) {
                    stickyValue = stickyFields[taskId][key];
                    break;  // exit after the first item is found
                }
            }
        }
        if (stickyFields && stickyValue) {

            if (output.is('select')) {
                // Find the option in the select list whose Id matches the one in stickyFields
                var option = output.find('option[value="' + stickyValue + '"]').first();
                if (option.length === 1) {
                    option.prop('selected', true);
                }
                if (output.hasClass('combo')) {
                    // Set the value of the combo box input as well
                    parent.find('.isCombo').val(stickyValue);
                }
            }
            else if (output.is('input')) {
                // check / uncheck the checkbox
                if (output.attr('type') === 'checkbox') {
                    output.prop('checked', output.val() === stickyValue);
                }
                else if (output.attr('type') === 'radio') {
                    // Uncheck each of the radio buttons
                    output.prop('checked', false);
                    // Check the radio button that has the matching value to one stored in stickyFields
                    parent.find('input[value="' + stickyValue + '"]').prop('checked', true);
                }
                else if (folderTaskSel.length === 1) {
                    output.val(Constants.c.loadText);
                    // Obtain folder path from folder Id
                    if (stickyValue) { // Don't try to get path if there is no Id to obtain path from
                        var successFunc = function (path) {
                            output.val(stickyFields[taskId]);
                            folderTaskSel.val(path);
                        };
                        var folderProxy = FolderServiceProxy();
                        if (stickyValue !== Constants.c.loadText) {
                            folderProxy.getPath(stickyValue, successFunc);
                        }
                    }
                }
                else {
                    // Default input, just set its value to that of the one stored in stickyFields
                    output.val(stickyValue);
                }
            }
        }
    },
    DisplayMessageTask: function (id, key, settings, template, data) {
        var el = template.find('.UserPromptString');
        if (el) {
            el.attr('title', data);
            el.text(data);
            el.val(data);
        }
    },
    UserPromptTask: function (id, key, settings, template) {
        var output = template.find('[name="' + id + '"]');
        switch (settings.Type) {
            case "Boolean":
                $(output).replaceWith(
                    $('<input type="checkbox" />')
                        .attr('name', $(output).attr('name')).addClass('uiOutput')
                    );
                break;
            case "Date":
                $(output).datepicker();
                break;
            case "DateTime":
                $(output).datetimepicker();
                break;
            case "Decimal":
            case "Double":
                $(output).numeric();
                break;
            case "Int32":
            case "Int64":
                $(output).numeric({ decimal: false });
                break;
            default:
                break;
        }
    },
    PromptForFolderTask: function (id, key, settings, template) {
        $('body').on('click', 'input[name="wfFolderSelection"]', function (ev) {
            var $targ = $(ev.currentTarget);
            var outputSibling = $targ.siblings("input[name='" + id + "']");
            if (!outputSibling || outputSibling.length === 0) {
                return;
            }
            var func = function (btnText, uiState, foldId, foldTitle, foldPath) {
                var display = $targ;
                var output = $(display).siblings("input[name='" + id + "']");
                if (btnText === Constants.c.ok) {
                    output.val(foldId);
                    display.val(foldPath);
                }
                else if (btnText === Constants.c.clear) {
                    output.val('');
                    display.val(Constants.c.clickFolderSelect);
                }
            };
            var options = {
                includeParent: true
            };
            DialogsUtil.folderSelection(false, false, settings.StartingFolderId, func, this, options);
        });
    },
    verifyTaskForUser: function (id, key, settings, template) {
        var radios = template.find('.radios'); //.buttonset();
        var positive = radios.find('#wftt_radio1');
        var netagative = radios.find('#wftt_radio2');

        positive.attr('id', 'wftt_radio1_' + id);
        var posLabel = $(positive).next();
        posLabel.attr('for', 'wftt_radio1_' + id);

        netagative.attr('id', 'wftt_radio2_' + id);
        var negLabel = $(netagative).next();
        negLabel.attr('for', 'wftt_radio2_' + id);
    },
    UserVerifyTask: function (id, key, settings, template) {
        WorkflowUtil.verifyTaskForUser(id, key, settings, template);
    },
    UserVerifyCustomFieldGroupTask: function (id, key, settings, template) {
        WorkflowUtil.verifyTaskForUser(id, key, settings, template);
    },
    PromptForInboxTask: function (id, key, settings, template) {
        var ibxs = window.slimInboxes;
        var i = 0;
        if (!ibxs || ibxs.length <= 0) {
            template.find("option[value='default']").val(Constants.c.inboxesNotFound);
            return;
        }
        var len = ibxs.length;
        var select = template.find("select");
        select.empty();
        select.append($('<option></option>'));
        for (i = 0; i < len; i++) {
            var ibx = ibxs.at(i);
            select.append('<option value="' + ibx.get('Name') + '">' + ibx.get('Name') + '</option>');
        }
    },
    PromptForWorkflowTask: function (id, key, settings, template) {
        var wfs = window.slimWorkflows;
        var i = 0;
        if (!wfs || wfs.length <= 0) {
            template.find("option[value='default']").val(Constants.c.workflowNotFound);
            return;
        }
        var len = wfs.length;
        var select = template.find("select");
        select.empty();
        select.append($('<option></option>'));
        for (i = 0; i < len; i++) {
            var wf = wfs.at(i);
            // Submit Workflow name to workflow engine rather than workflow Id
            select.append('<option value="' + wf.get('Name') + '">' + wf.get('Name') + '</option>');
        }
    },
    PromptForContentTypeTask: function (id, key, settings, template) {
        var cts = window.contentTypes;
        if (!cts || cts.length <= 0) {
            template.find("option[value='default']").val(Constants.c.contentTypesNotFound);
            return;
        }
        var len = cts.length;
        var i;
        var select = template.find("select");
        select.empty();
        select.append($('<option></option>'));
        for (i = 0; i < len; i++) {
            var model = cts.at(i);
            var ctName = model.get('Name');
            select.append('<option value="' + ctName + '">' + ctName + '</option>');
        }
    },
    PromptForRecordCategoryTask: function (id, key, settings, template) {
        var recCats = window.recordcategories;
        var select = template.find("select");
        if (!recCats) {
            recCats = window.slimRecordCategories;
        }
        if (!recCats) {
            template.find("option[value='default']").val(Constants.c.recordCategoriesNotFound);
            return;
        }
        var len = recCats.length;
        var i;
        select.empty();
        select.append($('<option></option>'));
        for (i = 0; i < len; i++) {
            var recCat = recCats.at(i);
            if (recCat.get('Id') !== Constants.c.emptyGuid) {
                select.append('<option value="' + recCat.get('Name') + '">' + recCat.get('Name') + '</option>');
            }
        }
    },
    PromptForSecurityClassTask: function (id, key, settings, template) {
        var scs = window.securityClasses;
        var i = 0;
        var select = template.find("select");
        if (!scs) {
            scs = window.slimSecurityClasses;
        }
        if (!scs) {
            template.find("option[value='default']").val(Constants.c.securityClassesNotFound);
            return;
        }
        var len = scs.length;
        select.empty();
        select.append($('<option></option>'));
        for (i = 0; i < len; i++) {
            var sc = scs.at(i);
            if (sc.get('Id') !== Constants.c.emptyGuid) {
                select.append('<option value="' + sc.get('Name') + '">' + sc.get('Name') + '</option>');
            }
        }
    },
    PromptForUserTask: function (id, key, settings, template) {
        var val;
        var isAdmin = Utility.isSuperAdmin() || Utility.isInstanceAdmin();
        var users = new Users(Utility.getUsers(null, window.users, !isAdmin, true));
        var select = template.find("select");
        if (users) {
            var len = users.length;
            select.empty();
            select.append($('<option></option>'));
            var i;
            for (i = 0; i < len; i++) {
                var user = users.at(i);
                if (user.get('Id') !== Constants.c.emptyGuid) {
                    select.append('<option value="' + user.get('Username') + '">' + user.get('Username') + '</option>');
                }
            }
        }
        else {
            if (!window.users) {
                template.find("option[value='default']").val(Constants.c.usersNotFound);
                return;
            }
            select.empty();
            select.append($('<option></option>'));
            users = Utility.getUsersDictionary(null, null, true);
            for (val in users) {
                if (users.hasOwnProperty(val)) {
                    // Submit user name to engine rather than user id
                    select.append('<option value="' + users[val] + '">' + users[val] + '</option>');
                }
            }
        }
    },
    SimpleDropDownTask: function (id, key, settings, template) {
        var select = template.find("select");
        select.empty();
        if (settings.DataLinkDropdownTypeAhead !== undefined && settings.DataLinkDropdownTypeAhead !== "") {
            WorkflowUtil.fillDataFromDataLink(id, key, settings, template);
        }
        else {
            _.each(settings.ListItems, function (setting) {
                select.append('<option value="' + setting.replace(/&nbsp;/g, '') + '">' + setting.replace(/&nbsp;/g, '') + '</option>');
            });
        }
    },
    SimpleComboBoxTask: function (id, key, settings, template) {
        var select = template.find('select');
        select.empty();
        _.each(settings.ListItems, function (setting) {
            select.append('<option value="' + setting.replace(/&nbsp;/g, '') + '">' + setting.replace(/&nbsp;/g, '') + '</option>');
        });
        select.addClass('combo');
        $(select).combobox();
    },
    DropDownTask: function (id, key, settings, template) {
        var select = template.find("select");
        select.empty();
        if (settings.DataLinkDropdown !== undefined && settings.DataLinkDropdown !== "") {
            WorkflowUtil.fillDataFromDataLink(settings, template);
        }
        else {
            var items = Utility.GetOrAddCachedItem(settings.ListName, 20000, WorkflowUtil.GetListContents, settings.ListName);
            if (items) {
                var length = items.length;
                var i;
                for (i = 0; i < length; i++) {
                    select.append('<option value="' + items[i].replace(/&nbsp;/g, '') + '">' + items[i].replace(/&nbsp;/g, '') + '</option>');
                }
            }
        }
    },
    ComboBoxTask: function (id, key, settings, template) {
        if (settings.DataLinkTypeAhead !== undefined && settings.DataLinkTypeAhead !== "") {
            WorkflowUtil.fillDataFromDataLink(settings, template);
        }
        else {
            var select = template.find("select");
            select.empty();
            var items = Utility.GetOrAddCachedItem(settings.ListName, 20000, WorkflowUtil.GetListContents, settings.ListName);
            if (items) {
                var length = items.length;
                var i;
                for (i = 0; i < length; i++) {
                    select.append('<option value="' + items[i].replace(/&nbsp;/g, '') + '">' + items[i].replace(/&nbsp;/g, '') + '</option>');
                }
            }
            select.addClass('combo');
            $(select).combobox();
        }
    },
    GetListContents: function (listName) {
        var results;
        $.ajax({
            url: Constants.Url_Base + 'CustomList/GetCustomList',
            data: { "listName": listName },
            type: "GET",
            async: false,
            success: function (result) {
                if (result) {
                    if (result.status === 'ok') {
                        if (result.result) {
                            results = result.result.Items;
                        }
                    }
                    else {
                        ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    }
                }
            }
        });
        return results;
    },
    updateNotApprovedAndNotDenied: function (wfHasApprovalTask) {
        var app = $('.approve');
        var deny = $('.deny');
        // Is not approved or denied
        app.text(Constants.c.approve).attr('title', Constants.c.approve);
        deny.text(Constants.c.deny).attr('title', Constants.c.deny);
        app.addClass('isNotApproved').removeClass('isApproved');
        deny.addClass('isNotDenied').removeClass('isDenied');
        app.siblings('span').removeClass('ui-icon ui-icon-check');
        deny.siblings('span').removeClass('ui-icon ui-icon-check');
        $('.wfApprove')
            .addClass('isNotApproved')
            .removeClass('isApproved')
            .prop('title', '')
            .text(Constants.c.approve);
        $('.wfDeny')
            .addClass('isNotDenied')
            .removeClass('isDenied')
            .prop('title', '')
            .text(Constants.c.deny);
    },
    displayApprovalState: function (cellvalue) {
        var revAppState = Utility.reverseMapObject(Constants.as);
        if ((cellvalue & (Constants.as.Approved | Constants.as.Was)) === Constants.as.Approved) {
            return "<div class='item_type_icon " + revAppState[Constants.as.Approved].toLowerCase() + "'></div>";
        }
        if ((cellvalue & (Constants.as.Denied | Constants.as.Was)) === Constants.as.Denied) {
            return "<div class='item_type_icon " + revAppState[Constants.as.Denied].toLowerCase() + "'></div>";
        }
        if ((cellvalue & Constants.as.WasApproved) === Constants.as.WasApproved) {
            return "<div class='item_type_icon " + revAppState[Constants.as.WasApproved].toLowerCase() + "'></div>";
        }
        if ((cellvalue & Constants.as.WasDenied) === Constants.as.WasDenied) {
            return "<div class='item_type_icon " + revAppState[Constants.as.WasDenied].toLowerCase() + "'></div>";
        }
        if ((cellvalue & Constants.as.Requested) === Constants.as.Requested) {
            return "<div class='item_type_icon " + revAppState[Constants.as.Requested].toLowerCase() + "'></div>";
        }
        return "<div></div>";
    },
    displayApproval: function (cellvalue) {
        var userGroupIcon;
        var appState;
        if (cellvalue && cellvalue.approvalState) {
            appState = WorkflowUtil.displayApprovalState(cellvalue.approvalState);
        }
        else {
            return '';
        }
        if (cellvalue && cellvalue.isUser) {
            userGroupIcon = '<div class="userIcon item_type_icon"></div>';
        }
        else {
            userGroupIcon = '<div class="groupIcon item_type_icon"></div>';
        }
        userGroupIcon = '';

        var date = cellvalue.date;
        var dateCont = '<div class="reason">' + cellvalue.reason + ' (' + date + ')</div>';
        var name = '<div class="name">' + cellvalue.name + ': </div>';

        return $('<li></li>').attr('id', cellvalue.id).attr('title', cellvalue.reason).html(appState + userGroupIcon + name + dateCont);
    },
    showHideApprovalAccordion: function (removeClasses) {
        var elem = $('#app_acc').parent();
        // Show ad-hoc approval accordion, otherwise hide it
        if (elem.hasClass('wfHasApprovalTask') || elem.hasClass('userHasNoApprovalRequest')) {
            elem.hide();
        }
        else {
            elem.show();
            elem.css('display', 'block');
        }
        if (removeClasses) {
            elem.removeClass();
        }
    },
    fillDataFromDataLink: function (settings, template) {
        var dataLinkSvc = DataLinkServiceProxy();
        var $select = template.find("select.isCombo");
        var ff = function (jqXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        var appendOption = function (data) {
            if (data && data.ui && data.ui.item) {
                template.find('input.isCombo').data('selectedItemData', data.ui.item);
                var opt = document.createElement('option');
                opt.value = data.ui.item.value;
                $select.append(opt);
            }
        };
        if (settings.DataLinkDropdown) {
            var sf = function (result) {
                _.each(result.Columns[0].Value, function (value) {
                    $select.append('<option value="' + value + '">' + value + '</option>');
                });
            };
            dataLinkSvc.executeQuery(settings.DataLinkDropdown, null, null, sf, ff);
        }
        else if (settings.DataLinkTypeAhead) {
            var that = this;
            $select.combobox({
                onSelect: function (data) {
                    if (appendOption) {
                        appendOption(data);
                    }
                },
                onChange: function (data) {
                    if (appendOption) {
                        appendOption(data);
                    }
                },
                source: function (request, response) {
                    var sf = function (data) {
                        response(data.Columns[0].Value);
                    };
                    if (!that[settings.DataLinkTypeAhead]) {
                        that[settings.DataLinkTypeAhead] = {};
                    }
                    else if (that[settings.DataLinkTypeAhead].cancel) {
                        that[settings.DataLinkTypeAhead].cancel();
                    }
                    dataLinkSvc.executeQuery(settings.DataLinkTypeAhead, null, [{ Key: "param1", Value: request.term }], sf, ff, null, that[settings.DataLinkTypeAhead]);
                },
                minLength: 2,
                delay: Constants.TypeAheadDelay
            });
            template.find('input.isCombo').val('');
        }
    },
    getNewActionName: function () {
        var idx = 0;
        var length = window.syncActions.length;
        var exists = true;
        var count = length + 1;
        var name = Constants.t('action') + ' ' + count;
        if (length > 0) {
            while (exists) {
                for (idx = 0; idx < length; idx++) {
                    exists = false;
                    if (window.syncActions.at(idx).get('Name') === name) {
                        name = Constants.t('action') + ' ' + (++count);
                        exists = true;
                        break;
                    }
                }
            }
        }
        return name;
    },
    getNewTaskXml: function (wfTaskGetArgs, successCallback) {
        var sf = function (result) {
            var task = $.parseXML(result);
            Utility.executeCallback(successCallback, task);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        WorkflowUtil.wfProxy.getNewTaskXml(wfTaskGetArgs, sf, ff);
    },
    getNewActionXml: function (wfActionGetArgs, successCallback) {
        var sf = function (result) {
            var syncAction = $($.parseXML(result)).find('Action');
            Utility.executeCallback(successCallback, syncAction);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        WorkflowUtil.wfProxy.getNewActionXml(wfActionGetArgs, sf, ff);
    },
    getSyncActionXml: function (saId, successCallback) {
        var getActionLibraryItemXmlPkg = {
            ActionId: saId
        };
        var sf = function (result) {
            var syncAction = $($.parseXML(result)).find('Action');
            Utility.executeCallback(successCallback, syncAction);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        WorkflowUtil.wfProxy.getActionLibraryItemXml(getActionLibraryItemXmlPkg, sf, ff);
    },
    getFieldTaskInfoFromActionXml: function ($action, fieldId, taskNames) {
        var info = {};
        var field = window.customFieldMetas.get(fieldId);
        var fieldName = field ? field.get('Name') || '' : '';
        var fieldKey;
        if (!fieldName) {
            return info;
        }
        fieldKey = '$doc.$fields.' + $.trim(fieldName);
        var $wfTaskDTOs = $action.find('WFTaskDTO');
        var $task;
        var idx = 0;
        var length = $wfTaskDTOs.length;
        var foundKey = false;
        var taskName;
        for (idx; idx < length; idx++) {
            $task = $wfTaskDTOs.eq(idx);
            taskName = $task.find('TaskClassName').text();
            // Check if task is OCR/Barcode
            if (!taskNames || taskNames[taskName]) {
                // Determine if the task contains an output to the corresponding fieldKey
                var outArgNames = $task.find('OutArgNames').text();
                if (outArgNames) {
                    outArgNames = Utility.tryParseJSON(outArgNames, true) || [];
                    var outArgIdx = 0;
                    var outArgLen = outArgNames.length;
                    for (outArgIdx; outArgIdx < outArgLen; outArgIdx++) {
                        if (outArgNames[outArgIdx] === fieldKey) {
                            foundKey = true;
                            break;
                        }
                    }
                }
                if (foundKey) {
                    break;
                }
            }
        }
        if (!foundKey || !$task) {
            return {};
        }
        var settings = $task.find('Settings');
        info.Settings = Utility.tryParseJSON(settings.text(), true) || {};
        info.TaskClassName = taskName;
        info.$task = $task;
        return info;
    },
    mapSAPToWFAT: function (sap) {
        // Map SyncActionPreference to WFActionType
        sap = parseInt(sap, 10);
        var syncType = Constants.wfat.SyncAction;
        if (sap === Constants.sap.SyncAndVerify) {
            syncType = Constants.wfat.SyncVerifyAction;
        }
        else if (sap === Constants.sap.AutoSync) {
            syncType = Constants.wfat.SyncAutoRunAction;
        }
        return syncType;
    },
    mapWFATToSAP: function (wfat) {
        wfat = parseInt(wfat, 10);
        var sap = Constants.sap.SyncAndSave;
        if (wfat === Constants.wfat.SyncVerifyAction) {
            sap = Constants.sap.SyncAndVerify;
        }
        else if (wfat === Constants.wfat.SyncAutoRunAction) {
            sap = Constants.sap.AutoSync;
        }
        return sap;
    }
};
