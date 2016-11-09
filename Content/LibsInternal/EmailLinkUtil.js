/// <reference path="ErrorHandler.js" />
/// <reference path="../LibsExternal/a_jquery.js" />
/// <reference path="ClientService.js" />
/// <reference path="Utility.js" />
/// <reference path="DateUtil.js" />
/// <reference path="DialogsUtil.js" />
// Utility for sending links to view documents
var EmailLinkUtil = {
    documentIds: null,
    versionIds: null,
    adminSvc: AdminServiceProxy(),
    /*
        Choices made about what to email
        @options: options passed to the emailDialog funtion containing document ids, version ids, message, and a callback.
        @emailData: object containing both emailOptions and sendOptions
    */
    createEmail: function (options, emailData, progressFunc, sf, ff) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);

        // #link-message no longer exists in the DOM (and hasn't since at least since 15.18.)  Therefore options.message is ignored and this calculation is not needed.
        // If we ever decide to show this message again, it should probably be done through a call-back or passed in jquery object so that this method remains UI independent.
        //if (options.message === Constants.c.linkMessage) {
        //    var count = (options.docIds ? options.docIds.length : 0) + (options.versionIds ? options.versionIds.length : 0);
        //    options.message = options.message.replace('{0}', count);
        //}
        //options.message = options.message.replace('{1}', Constants.c.send);
        //$('#link-message').text(options.message);

        emailData.useClient = ClientService.installed('useClientForOutput');
        emailData.emailOptions.Subject = EmailLinkUtil.getEmailSubject(emailData.emailOptions);
        if (emailData.useClient) {
            emailData.emailOptions.Addresses = '';// Empty the addresses - to be filled out in the email client
        }
        else {
            if (!this.validateEmailAddresses(emailData.emailOptions.Addresses)) {
                Send.toggleBusy(false, true);
                return;
            }
        }
        var getBodyCallback = function (body) {
            emailData.emailOptions.Body = body;
            emailData.sendOptions.IntViewForActionType = emailData.sendOptions.ActionType;
            options.callback(emailData, progressFunc, sf, ff);
        };
        EmailLinkUtil.getEmailBody(emailData, getBodyCallback);
    },
    generateLink: function (docIds, emailData, callback) {
        // send link in download controller
        // Perform actions to create link for selected documents
        var url = '';
        var baseUrl = window.location.href.replace(window.location.hash, '');
        if (!baseUrl.endsWith('/')) {
            baseUrl += '/';
        }
        var linkURLBase = "{0}?{1}={2}&{3}={4}&{5}={6}";
        var instanceId = $('#companySelect option:selected').val();

        if (emailData.emailOptions.IsDirectLink) {
            var links = [];
            var length = docIds.length;
            var i = 0;
            for (i; i < length; i++) {
                links.push(String.format(linkURLBase, baseUrl, Constants.UtilityConstants.INSTANCEID, instanceId,
                    Constants.UtilityConstants.TYPE, Constants.et.Document, Constants.UtilityConstants.ENTITYID, docIds[i]));
            }
            callback(links.join(','));
        } else {
            var sendOptions = emailData.sendOptions;
            var sf = function (result) {
                baseUrl += "Guest";
                url = String.format(linkURLBase, baseUrl, Constants.UtilityConstants.REQUESTID, result,
                    Constants.UtilityConstants.INSTANCEID, instanceId, Constants.UtilityConstants.AUTO, !sendOptions.Password);
                callback(url);
            };
            var ff = function (jqXHR, textStatus, errorThrown) {
                ErrorHandler.addErrors(errorThrown, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            var secProxy = SecurityServiceProxy();
            var req = {
                Token: Page.authToken,
                ExpirationType: Constants.ext.NoExpiration,
                Parameters: JSON.stringify({
                    DocumentIds: docIds,
                    SendOptions: sendOptions
                }),
                RequestType: Constants.part.DownloadFiles,
                Password: sendOptions.Password
            };
            secProxy.createProxyRequest(req, sf, ff);
        }
        return url;
    },
    setCopyLink: function () {
        var callback = function (url) {
            $('#created-link .generateLink').addClass('updating');
            $('#copyLink').val(url);
            $('#created-link .generateLink').removeClass('updating');
            $('#copyLink').focus().select();
        };
        var emailData = EmailLinkUtil.getEmailData();
        EmailLinkUtil.generateLink(EmailLinkUtil.getDocumentIds(), emailData, callback);
    },
    /*
        Obtain the Subject for an email
        If there is no Subject set it to the current Date Time
    */
    getEmailSubject: function (emailOptions) {
        var subject = emailOptions.Subject;
        if (!$.trim(subject)) {
            subject = new Date().toString();
        }
        return subject;
    },
    /*
        Obtain the Body for an email from templates
        The body changes if the email contains a Link or a Direct Link
    */
    getEmailBody: function (emailData, callback) {
        var data = {};
        var emailOptions = emailData.emailOptions;
        var linkCallback = function (urls) {
            data.Urls = []; // templates are expecting an array
            if (emailOptions.IsLink || emailOptions.IsDirectLink) {
                data.Urls = urls.split(',');   // urls are joined on ',' so split on ',' here to get the array of urls
            }
            data.Body = emailOptions.Body;
            var bodyText = '';
            if (emailOptions.IsDirectLink) {
                this.compiledTemplate = doT.template(Templates.get('directlinklayout'));
                bodyText = this.compiledTemplate(data);
            }
            else if (emailOptions.IsLink) {
                this.compiledTemplate = doT.template(Templates.get('downloadlinklayout'));
                bodyText = this.compiledTemplate(data);
            }
            callback(bodyText);
        };
        EmailLinkUtil.generateLink(EmailLinkUtil.getDocumentIds(), emailData, linkCallback);
    },
    getEmailData: function () {
        var emailOptions = Send.getEmailOptions();
        var sendOptions = Send.getSendOptions();
        sendOptions.ActionType = Constants.at.Emailed;
        var emailData = {
            emailOptions: emailOptions,
            sendOptions: sendOptions
        };
        return emailData;
    },
    getDocumentIds: function () {
        return EmailLinkUtil.documentIds;
    },
    validateEmailAddresses: function (toAddresses, errorElem) {
        if (!errorElem) {
            errorElem = 'sendDialogError';
        }
        if (!Utility.areValidEmailAddresses(toAddresses, errorElem, Constants.c.invalidEmailAddress)) {
            return false;
        }
        return true;
    },
    setupWorkflowHelp: function () {
        var $dialog;
        var $html = $('<div>').append($('<textarea>').addClass('sendMessage')).append($('<iframe>').addClass('sendMessage').attr('frameborder', 0));
        var options = {
            autoOpen: false,
            title: Constants.c.emailWorkflowDesigner,
            width: 400,
            minWidth: 400,
            minHeight: 350,
            modal: true,
            open: function () {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                Utility.changeButtonState([Constants.c.ok], 'disable', $dialog.parent());
                $dialog.find('textarea').bind('keyup', function (ev) {
                    var $targ = $(ev.currentTarget);
                    if (!$targ.val()) {
                        Utility.changeButtonState([Constants.c.ok], 'disable', $dialog.parent());
                    }
                    else {
                        Utility.changeButtonState([Constants.c.ok], 'enable', $dialog.parent());
                    }
                });
                $dialog.find('iframe').attr('src', Constants.Url_Base + 'SystemMaintenance/AddAttachment');
            },
            close: function () {
                $(this).find('textarea').val('');
                $(this).removeAttr('src');
            },
            html: $html.html()
        };
        var okFunc = function () {
            EmailLinkUtil.sendWorkflowDesignerMessage($dialog);
        };
        $dialog = DialogsUtil.generalPromptDialog('', okFunc, null, options);
        $dialog.dialog('open');
    },
    sendWorkflowDesignerMessage: function ($dialog) {
        Utility.changeButtonState([Constants.c.ok, Constants.c.close], 'disable', $dialog.parent());
        var sf = function (result) {
            $dialog.dialog('close');
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            Utility.changeButtonState([Constants.c.ok, Constants.c.cancel], 'enable', $dialog.parent());
            $dialog.find('.throbber').hide();
            ErrorHandler.popUpMessage(errorThrown);
        };
        var bodyTemplate = $('<html>').append($('<body>').append(doT.template(Templates.get('WorkflowDesignerEmailTemplate'))));
        var ideaMsgPkg = {
            Message: $dialog.find('textarea').val(),
            BodyTemplate: bodyTemplate.get(0).outerHTML,
            ContextURI: window.location.href
        };
        EmailLinkUtil.adminSvc.emailWorkflowDesignerMessage(ideaMsgPkg, sf, ff);
    }
};