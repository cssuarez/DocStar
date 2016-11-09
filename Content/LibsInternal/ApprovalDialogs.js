/// <reference path="DialogsUtil.js" />
/// <reference path="Utility.js" />
var ApprovalDialogs = {
    setMyApproval: function (options) {
        var withDraw = false;
        if (options.myApproval) {
            if (options.approving && options.myApproval.isApproved()) {
                withDraw = true;
            } else if (!options.approving && options.myApproval.isDenied()) {
                withDraw = true;
            }
        }
        if (withDraw) {
            ApprovalDialogs.withdrawApprovalOrDenial(options);
        } else {
            ApprovalDialogs.approveOrDeny(options);
        }
    },
    approveOrDeny: function (options) {
        var ma = options.myApproval;
        var reason = ma ? ma.get('Reason') || '' : '';
        var $dialogClone = $('#approveDenyDialog').clone();
        $dialogClone.find('textarea').val('');
        var state;
        if (options.approving) {
            state = Constants.as.Approved;
            btnText = Constants.c.approve;
            $dialogClone.find('.explanation').html(Constants.c.approveReason);
        }
        else {
            state = Constants.as.Denied;
            btnText = Constants.c.deny;
            $dialogClone.find('.explanation').html(Constants.c.denyReason);
        }
        var $dlg;
        // Dialog to prompt for reason of approval / denial
        var okFunc = function (cleanup) {
            // Set approval / denial for current user on current entity
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            reason = $dlg.find('textarea').val();
            var scup = { State: state, Reason: reason };
            options.callback(scup, function () {
                Utility.executeCallback(cleanup);
            });
        };
        var cancelFunc = function (cleanup) {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            Utility.executeCallback(cleanup);
        };
        var diagOpts = {
            modal: true,
            resizable: false,
            autoOpen: false,
            width: 400,
            height: 250,
            title: btnText,
            okText: btnText,
            html: $dialogClone.html(),
            open: function () {
                $dlg.find('span:not(.explanation)').show();
                $dlg.find('textarea').val('');
                $dlg.find('textarea').show();
            }
        };
        $dlg = DialogsUtil.generalPromptDialog('', okFunc, cancelFunc, diagOpts);
        $dlg.dialog('open');
    },
    withdrawApprovalOrDenial: function (options) {
        // Withdraw approval / denial
        var ma = options.myApproval;
        var btnText = Constants.c.recall;
        var $dialog = $('#approveDenyDialog');
        var $dlgClone = $dialog.clone();
        var replaceText = ma.isApproved() ? Constants.c.approval : Constants.c.denial;
        var signText = String.format(Constants.c.recallReason, replaceText);
        $dlgClone.find('.explanation').html(signText);
        var $dlg;
        var okFunc = function (cleanup) {
            // Set approval / denial for current user on current entity
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            var scup = { State: Constants.as.None, Reason: '' };
            var that = this;
            options.callback(scup, function () {
                Utility.executeCallback(cleanup);
            });
        };
        var cancelFunc = function (cleanup) {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            Utility.executeCallback(cleanup);
        };
        var diagOpts = {
            modal: true,
            resizable: false,
            autoOpen: false,
            width: 510,
            height: 100,
            title: btnText,
            okText: btnText,
            html: $dlgClone.html(),
            open: function () {
                $dlg.find('span:not(.explanation)').hide();
                $dlg.find('textarea').val('');
                $dlg.find('textarea').hide();
            }
        };
        $dlg = DialogsUtil.generalPromptDialog('', okFunc, cancelFunc, diagOpts);
        $dlg.dialog('open');
    },
    requestApproval: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ numRequired: 1 }, options);
        options = $.extend({ displaySetRequired: false }, options);
        var $dlg;
        var selector = '#requestApprovals';
        var open = function () {
            var $usersAndGroups = $dlg.find('select');
            var i;
            var roles = window.slimRoles;
            var rlength = roles.length;
            var isAdmin = Utility.isSuperAdmin() || Utility.isInstanceAdmin();
            var users = Utility.getUsers(null, window.users, !isAdmin);
            var ulength = users.length;
            for (i = 0; i < ulength; i++) {
                var user = users[i];
                var userName = user.name;
                var userId = user.id;
                $usersAndGroups.append($('<option></option>').attr('Value', userId).text(userName));
            }
            for (i = 0; i < rlength; i++) {
                var role = roles.at(i);
                var roleName = role.get('Name');
                var roleId = role.get('Id');
                $usersAndGroups.append($('<option></option>').attr('Value', roleId).text(roleName));
            }
            if (options.displaySetRequired) {
                $dlg.find('#approvalRequired').show();                
                $dlg.find('input[name="setRequired"]').numeric({ negative: false, decimal: false, max: Constants.IntMax }).val(options.numRequired);                
            }
            else {
                $dlg.find('#approvalRequired').hide();
            }
            // Bind events for dialog actions here
            $dlg.off('click', '.approvals').on('click', '.approvals',
            {
                dropdownSelector: $dlg.find('.dropdown'),
                parentSelector: $dlg,
                childHoverSelector: '.approvals li span.parent',
                childShowHideSelector: '.approvals ul.children'
            }, ApprovalDialogs.showHideDropdownMenu);
            $dlg.off('click', '.dropdown li span.anchor').on('click', '.dropdown li span.anchor',
            {
                dropdownSelector: '.approvals.dropdown',
                containerSelector: $dlg,
                dropdownFieldTextSelector: '.dropdown .approvals_dropdown_text'
            }, ApprovalDialogs.setSelectedDropdownText);
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            $dlg.parent('.ui-dialog').css('overflow', 'visible');
            $dlg.find('.parent span:first').text('');
            $dlg.find('.parent span:first').val('');
            $dlg.find('input[name="Notify"]').removeAttr('checked');
        };
        var okFunc = function (cleanup) {
            var req = { Notify: false, UserOrGroupId: '' };
            req.Notify = $dlg.find('input[name="Notify"]').is(':checked');
            if ($dlg.find('option:selected').length === 1) {
                req.UserOrGroupId = $dlg.find('option:selected').val();
            }
            else {
                // Check to see if there is a user or group selected, if not display message, to pick one
                msg = Constants.c.selectUserOrRole;
                ErrorHandler.addErrors({ 'app_err_msg': msg }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                $dlg.find('.warningErrorClass').show();
                return;
            }
            if (options.displaySetRequired) {
                var num=$dlg.find('input[name="setRequired"]').val();
                req.NumberRequired = num === "" ? 0 : num;
            }
            var cleanupFull = function () {
                $dlg.off('click', '.approvals');
                $dlg.off('click', '.dropdown li span.anchor');
                Utility.executeCallback(cleanup);
            };
            options.callback(req, cleanupFull);
        };
        var html = Templates.get('approvallayout');
        var dlgOptions = { html: html, title: Constants.c.requestApproval, open: open, autoOpen: false };
        $dlg = DialogsUtil.generalPromptDialog(null, okFunc, null, dlgOptions);
        $dlg.dialog('open');
    },
    setNumRequired: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ numRequired: 0 }, options);              
        var selector = '#setRequiredDialog';
        var input = 'input[name="setRequired"]';        
        var $dlg;
        var okFunc = function (cleanup) {
            var value = $dlg.find(input).val();
            value = value === "" ? 0 : value;
            if (value >= Math.pow(2, 32) - 1) {
                Utility.disableButton(Constants.c.ok, Constants.c.maxValueError);
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                ErrorHandler.addErrors({ setRequired: Constants.c.maxValueError });
            }
            else {
                options.callback(value, cleanup);
            }
        };
        var open = function () {           
            $dlg.find(input).numeric({ negative: false, decimal: false, max: Constants.IntMax }).val(options.numRequired);            
        };
        var dlgOptions = { html: $(selector).html(), title: Constants.c.setRequired, open: open, autoOpen: false };
        $dlg = DialogsUtil.generalPromptDialog(null, okFunc, null, dlgOptions);
        $dlg.dialog('open');
    },
    showHideDropdownMenu: function (event) {
        ShowHideUtil.showHideDropdownMenu(event);
        $(event.data.parentSelector).find('ul.children').scrollTop(0);
    },
    setSelectedDropdownText: function (event) {
        ShowHideUtil.setDropdownTextGeneric(event);
        $(event.data.containerSelector).find('ul.children').hide();
    }
};