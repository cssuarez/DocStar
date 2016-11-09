var Send = {
    docProxy: DocumentServiceProxy({ skipStringifyWcf: true }),
    defaultSendOptions: {
        Password: '',
        IncludeAnnotations: false,
        IncludeRedactions: false,
        PageSelection: '',
        ExportType: 'Native'
    },
    defaultEmailOptions: {
        IsAttachment: false,
        IsLink: true,
        IsDirectLink: false,
        Subject: '',
        Addresses: '',
        Body: ''
    },
    getButtonsText: function () {
        return [Constants.c.send, Constants.c.save, Constants.c.print, Constants.c.cancel];
    },
    setEmailOptions: function (emailOptions) {
        var attach = emailOptions.IsAttachment;
        var link = emailOptions.IsLink;
        var attachAndLink = attach && link;
        var directLink = emailOptions.IsDirectLink;
        var choice = attachAndLink ? 'IsLinkAttachment' : (link ? 'IsLink' : (attach ? 'IsAttachment' : (directLink ? 'IsDirectLink' : '')));
        var emailChoiceSel = this.emailOptCont.find('input[name="emailChoice"]');
        var length = emailChoiceSel.length;
        var i = 0;
        for (i; i < length; i++) {
            var emailChoice = $(emailChoiceSel[i]);
            if (emailChoice.data('emailchoice') === choice) {
                emailChoice.prop('checked', true);
                break;
            }
        }
        $('#subject_link').val(emailOptions.Subject);
        $('#email_address').val(emailOptions.Addresses);
        $('#email_body').val(emailOptions.Body);
    },
    setSendOptions: function (sendOptions) {
        var pass = sendOptions.Password || '';
        var pageSel = sendOptions.PageSelection || '';
        var includeAnnos = sendOptions.IncludeAnnotations || false;
        var includeRedacts = sendOptions.IncludeRedactions || false;
        this.diagSel.find('input[type="password"]').val(pass);
        this.diagSel.find('.pageSelection').val(pageSel);
        this.diagSel.find('input[name="Annotations"]').prop('checked', includeAnnos);
        this.diagSel.find('input[name="Redactions"]').prop('checked', includeRedacts);
        var revEDT = Utility.reverseMapObject(Constants.edt);
        var exportTypeSel = this.diagSel.find('input[name="ExportType"][value="' + revEDT[sendOptions.ExportType] + '"]');
        if (exportTypeSel && exportTypeSel.length > 0) {
            exportTypeSel.prop('checked', true);
        }
        else {
            this.diagSel.find('input[name="ExportType"][value="Native"]').prop('checked', true);
        }
    },
    fillSendDialog: function (emailOptions, sendOptions) {
        // both emailOptions and sendOptions are optional
        this.setEmailOptions(emailOptions || this.defaultEmailOptions);
        this.setSendOptions(sendOptions || this.defaultSendOptions);
    },
    // Public Functions
    /*
        ids: (object) a mixture of entity ids (folder, inbox, document, document version)
    */
    toggleBusy: function (busy, keepOpen) {
        // busy: whether or not the dialog should appear busy
        // keepOpen: whether the dialog is allowed to close
        var src = Constants.Url_Base + 'Content/themes/default/throbber.gif';
        if (busy) {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            Utility.disableButtons(this.getButtonsText());
            if (this.throbber.attr('src') !== src) {
                this.throbber.attr('src', src);
            }
            this.throbber.show();
        } else {
            this.toggleSuccess(false, keepOpen);
            Utility.enableButtons(this.getButtonsText());
            this.throbber.hide();
        }
    },
    toggleSuccess: function (displaySuccess, keepOpen) {
        // displaySuccess: toggle whether the success message is displayed or not
        // keepOpen: whether the dialog can be closed or not
        if (displaySuccess) {
            this.diagSel.find('.success_message').show();
        } else {
            var that = this;
            this.diagSel.find('.success_message').fadeOut(2000, function () {
                if (!keepOpen) {
                    that.closeSendDialog();
                }
            });
        }
    },
    closeSendDialog: function () {
        this.throbber.hide();
        this.diagSel.dialog('close');
        Utility.enableButtons(this.getButtonsText());
    },
    fillPrintOptions: function () {
        var sendOptions = Utility.GetUserPreference('lastPrintOptions');
        if (sendOptions) {
            sendOptions = JSON.parse(sendOptions);
        }
        this.fillSendDialog(null, sendOptions);
    },
    fillSaveACopyOptions: function () {
        var sendOptions = Utility.GetUserPreference('lastDownloadOptions');
        if (sendOptions) {
            sendOptions = JSON.parse(sendOptions);
        }
        this.fillSendDialog(null, sendOptions);
    },
    fillEmailOptions: function () {
        var emailData = Utility.GetUserPreference('lastEmailOptions');
        var emailOptions;
        var sendOptions;
        if (emailData) {
            emailData = JSON.parse(emailData);
        }
        if (emailData) {
            emailOptions = emailData.emailOptions;
            sendOptions = emailData.sendOptions;
        }
        this.fillSendDialog(emailOptions, sendOptions);
    },
    addSendDialogErrors: function (message) {
        ErrorHandler.addErrors({ 'sendDialogError': message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
    },
    // Obtain email options for sending emails
    getEmailOptions: function () {
        // Email choice selector
        var emailData = {};
        var choice = this.diagSel.find('input[name="emailChoice"]:checked');
        var choiceData = $(choice).data('emailchoice');
        // Get email choice from selector
        emailData.IsAttachment = (choiceData === 'IsAttachment') || (choiceData === 'IsLinkAttachment');
        emailData.IsLink = (choiceData === 'IsLink') || (choiceData === 'IsLinkAttachment');
        emailData.IsDirectLink = (choiceData === 'IsDirectLink');
        emailData.Subject = $('#subject_link').val();
        emailData.Addresses = $('#email_address').val();
        emailData.Body = $('#email_body').val();
        return emailData;
    },
    // Obtain send options
    getSendOptions: function () {
        var data = {};
        var optDTO = DTO.getDTO(this.diagSel.find('.sendOptions, .exportType'));
        // Obtain password
        data.Password = this.diagSel.find('input[type="password"]').val();
        // Obtain whether to include annotations/redactions
        data.IncludeAnnotations = optDTO.Annotations;
        data.IncludeRedactions = optDTO.Redactions;
        // Obtain pages
        data.PageSelection = this.diagSel.find('.pageSelection').val();
        // Obtain Export Type, as an int
        data.ExportType = parseInt(optDTO.ExportType, 10) ? optDTO.ExportType : Constants.edt[optDTO.ExportType];
        data.IntViewForExportType = data.ExportType;
        return data;
    },
    getSaveACopyData: function () {
        // Get send options
        var saveACopyData = this.getSendOptions();
        saveACopyData.ActionType = Constants.at.Downloaded;
        return saveACopyData;
    },
    getPrintData: function (selector) {
        // Need to pass in a selector because web printing is in an iframe, and need to obtain the sendDialog from the iframes parent window
        var printData = this.getSendOptions();
        printData.ActionType = Constants.at.Printed;
        return printData;
    },
    changeExportType: function (jelm) {
        // Disable redactions, annotations and page selection if the selected Export Type is not PDF or TIFF
        // etd - exportTypeDependent
        var etd = this.diagSel.find('input[name="Annotations"], input[name="Redactions"], input.pageSelection');
        var expoType = Constants.edt[jelm.val()];
        if (expoType === Constants.edt.PDF || expoType === Constants.edt.TIFF) {
            etd.prop('disabled', false);
        } else {
            etd.prop('disabled', true);
            etd.prop('checked', false);
            etd.val('');
        }
    },
    // #region Dialogs
    emailDialog: function (options) {
        EmailLinkUtil.documentIds = options.docIds;
        var dlgOptions = {};
        dlgOptions.callbacks = {
            open: function (diagSel) {            
                Send.fillEmailOptions();
                diagSel.find('.emailChoiceContainer').show(); // link, attachment, both, or direct link
                diagSel.find('#created-link').show(); // This is parent of the other email controls
                diagSel.find('#linkVersioningWarning').show();
                diagSel.find('#email_link').show(); // this should probable be hidden based on .emailChoice
                if (!ClientService.installed('useClientForOutput')) {
                    diagSel.find('#created-link div.emailProps').show(); // emailProps = subject, body, and to-address
                } else {
                    diagSel.find('#created-link div.emailProps').hide();
                }
            },
            send: function (diagSel, progressFunc) {
                var emailData = EmailLinkUtil.getEmailData();
                // Set lastSendOptions User Preference
                if (diagSel.find('input[name="rememberSettings"]').is(':checked')) {
                    Utility.SetSingleUserPreference('lastEmailOptions', JSON.stringify(emailData));
                }
                var createEmailSF = function () {
                    Send.toggleSuccess(true);
                    Send.toggleBusy(false, false);
                }; // no longer busy, keep open
                var createEmailFF = function () { Send.toggleBusy(false, true); }; // no longer busy, close dialog
                EmailLinkUtil.createEmail(options, emailData, progressFunc, createEmailSF, createEmailFF);
            },
            close: function (diagSel) {
                EmailLinkUtil.documentIds = null;
            }
        };
        Send.sendDialog({ docIds: options.docIds, versionIds: options.versionIds }, dlgOptions);
    },
    printDialog: function (options) {
        $('#viewer_print-error').dialog({
            width: 300,
            height: 100,
            autoOpen: false,
            resizable: false,
            buttons: [{
                text: Constants.c.close,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
        if (options.itemCount < 1) {
            $('#viewer_print-error').dialog('open');
        }
        else {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            var dlgOptions = {}; // options for sendDialog
            var data = {}; // selections returned to caller via callback
            data.useClient = ClientService.installed('useClientForOutput');
            dlgOptions.callbacks = {
                open: function (diagSel) {
                    Send.fillPrintOptions();
                    diagSel.find('input[type="password"]').parent().hide();
                    if (!data.useClient) {
                        var reverseEDT = Utility.reverseMapObject(Constants.edt);
                        diagSel.find('.exportType input[value="' + reverseEDT[Constants.edt.PDF] + '"]').prop('checked', true);   // Check pdf when web printing
                        diagSel.find('.exportType').hide(); //WebPrint doesn't support choosing an export type.
                    }
                },
                send: function (diagSel, progressFunc) {
                    data.printData = Send.getPrintData();
                    if (!data.useClient) {  // Make web print
                        data.printData.ExportType = Constants.edt.WebPrint;
                        data.printData.IntViewForExportType = Constants.edt.WebPrint;
                    }
                    if (diagSel.find('input[name="rememberSettings"]').is(':checked')) {
                        Utility.SetSingleUserPreference('lastPrintOptions', JSON.stringify(data.printData));
                    }
                    data.printData.IntViewForActionType = data.printData.ActionType;
                    var sf = function () {
                        Send.toggleBusy(false, false);
                    };
                    var ff = function (closeDialog) {
                        if (closeDialog) {
                            Send.closeSendDialog();
                        }
                        else {
                            Send.toggleBusy(false, true);
                        }
                    };
                    var webPrint = function (pfsResult) {
                        var url = 'Imaging/PrintDocument?dlId=' + pfsResult;
                        $('#iprint').attr('src', url);
                    };
                    options.callback(data, progressFunc, sf, ff, webPrint);
                }
            };
            dlgOptions.title = Constants.c.print;
            dlgOptions.okText = Constants.c.print;
            Send.sendDialog({ versionIds: options.versionIds }, dlgOptions);
        }
    },
    downloadDialog: function (options) {
        options = options || {};
        options.data = options.data || {};
        options.data.callbacks = options.data.callbacks || {};
        if (options.itemCount.length < 1) {
            ErrorHandler.displayGeneralDialogErrorPopup(Constants.c.mustSelectOneDoc);
            return;
        }
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var dlgOptions = {};
        dlgOptions.callbacks = {
            open: function (diagSel) {
                Send.fillSaveACopyOptions();
                if (options.message) {
                    Send.fillPrintOptions();
                }
                $(diagSel).find('#downloadRedirectMessage').text(options.message || '');
                Utility.executeCallback(options.data.callbacks.open, diagSel);
            },
            close: function () {
                Send.toggleBusy(false, true);
            },
            send: function (diagSel, progressFunc) {
                var saveACopyData = Send.getSaveACopyData();
                if (diagSel && diagSel.find('input[name="rememberSettings"]').is(':checked')) {
                    Utility.SetSingleUserPreference('lastDownloadOptions', JSON.stringify(saveACopyData));
                }
                var sf = function (result) {
                    var zipHref = Constants.Server_Url + '/GetFile.ashx?functionName=DownloadZipToBrowser&path=' + encodeURIComponent(result);
                    $('#download').attr('src', zipHref);
                    Send.closeSendDialog();
                };
                var ff = function () {
                    Send.toggleBusy(false, true);
                };
                options.callback(progressFunc, sf, ff);
            }
        };
        dlgOptions.title = Constants.c.resultActionsDownload;
        dlgOptions.okText = Constants.c.save;
        Send.sendDialog({ documentIds: options.documentIds, versionIds: options.versionIds, inboxIds: options.inboxIds, folderIds: options.folderIds }, dlgOptions);
    },
    // sendDialog is common to Email, Download, and Print
    sendDialog: function (ids, options) {
        if (!options) {
            options = {};
        }
        this.diagSel = options.diagSel || $('#sendDialog');
        this.throbber = this.diagSel.find('#sendThrobber');
        this.emailOptCont = this.diagSel.find('.emailChoiceContainer');
        var callbacks = options.callbacks || {};
        var title = options.title || Constants.c.send;
        var okButtonText = options.okText || Constants.c.send;
        var cancelButtonText = options.cancelText || Constants.c.cancel;
        var docIds = ids.docIds || [];
        var versionIds = ids.versionIds || [];
        var folderIds = ids.folderIds || [];
        var inboxIds = ids.inboxIds || [];
        var idsLength = docIds.length + versionIds.length + folderIds.length + inboxIds.length;
        if (idsLength < 1) {
            ErrorHandler.addErrors(Constants.c.mustSelectOneDoc, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return false;
        }
        var that = this;
        DialogsUtil.generalDialog(that.diagSel, {
            title: title,
            width: 515,
            minWidth: 515,
            minHeight: 415,
            maxHeight: 415,
            open: function () {
                // TODO: scain check permissions to allow user to print with or without annotations/redactions, 
                // TODO: scain (continued) if the user doesn't have permissions for ALL of the documents, disable annotations / redactions
                // TODO: scain
                //   Determine if any of the docIds are native...
                //   If so: disable - page selection, annotations, redactions, and Send Document As

                // Reset dialog to default state
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                that.diagSel.find('#downloadRedirectMessage').text('');
                that.diagSel.find('#copyLink').val("");
                that.diagSel.find('#linkVersioningWarning').hide();
                that.diagSel.find('#created-link').hide();
                that.diagSel.find('.emailChoiceContainer').hide();
                that.diagSel.find('input[type="password"]').parent().show();
                that.diagSel.find('.exportType').show();
                that.throbber.hide();

                // Call caller's open method so it can adjust dialog state
                if (callbacks && callbacks.open) {
                    callbacks.open(that.diagSel);
                }

                // Set up common (download/email/print) dialog options
                that.changeExportType(that.diagSel.find('.exportType input[type="radio"]:checked'));
                var pageSelectionCont = that.diagSel.find('.pageSelectionContainer');
                if (idsLength > 1) { // Hide page selection if more than one document is selected
                    pageSelectionCont.hide();
                    // Reset page selection so it won't be included in send options
                    pageSelectionCont.find('input[type="checkbox"]').prop('checked', false);
                    pageSelectionCont.find('.pageSelection').val('');
                } else {
                    pageSelectionCont.show();
                    pageSelectionCont.find('.pageSelectionContainer').show();
                }

                // Create (once) progress bar for out-of-process operations, hidden.  It will be shown via progress function, defined up later.
                var progressContSelector = that.diagSel.find('.progressCont');
                if (progressContSelector.length === 0) {
                    var sibling = that.throbber;
                    var progressBarLayout = Templates.getCompiled('progressbarlayout');
                    sibling.after(progressBarLayout());
                } else {
                    progressContSelector.hide();
                }
                Utility.enableButtons(that.getButtonsText());
            },
            close: function () {
                if (callbacks) {
                    Utility.executeCallback(callbacks.close, that.diagSel);
                }
            },
            buttons: [
                {
                    text: okButtonText,
                    click: function () {
                        that.toggleBusy(true);
                        var progressFunc = function (method, percent) {
                            var progressContSelector = that.diagSel.find('.progressCont');
                            if (progressContSelector && method === 'PrepForSend') {
                                var progressData = {
                                    progressText: percent + '%',
                                    progressIndeterminate: '',
                                    progressValue: percent,
                                    progressVisible: 1
                                };
                                Utility.displayProgress(progressContSelector, progressData);
                            }
                            Utility.log(method + ' ' + Date() + ' ' + percent);
                        };
                        if (callbacks && callbacks.send) {
                            callbacks.send(that.diagSel, progressFunc);
                        }
                        Utility.executeCallback(callbacks.callback);
                    }
                },
                {
                    text: cancelButtonText,
                    click: function () {
                        // Cancel send operation
                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                        that.closeSendDialog();
                    }
                }]
        });
        return true;
    },
    // #endregion Dialogs
    // #region Utility Methods: UI independent; save to call from models; allow for headless testing
    prepForSend: function (prepForSendPkg, progressFunc, sfIn, ffIn, cfIn) {
        // Set up wrapper methods for handling extended downloads
        var isLongRunning = false; // out-of-process
        if (!prepForSendPkg) {
            prepForSendPkg = {};
        }
        if (!prepForSendPkg.SendOptions) {
            prepForSendPkg.SendOptions = {};
        }
        prepForSendPkg.SendOptions.ConnectionId = window.CompanyInstanceHubProxy.connection.id;
        var extResultFunc = function (result) {
            if (progressFunc) {
                window.CompanyInstanceHubProxy.onSendProgress(progressFunc, true);  // Unsubscribe from event
            }
            window.CompanyInstanceHubProxy.onSendResult(extResultFunc, true);   // Unsubscribe from event
            if (result.Succeeded) {
                Utility.executeCallback(sfIn, result.Result);
            }
            else {
                if (ffIn) {
                    ffIn(null, result.Message, result.Result);
                }
            }
        };
        var sf = function (result) {
            if (result === Constants.UtilityConstants.GONE_OOP) {
                Utility.log("Handling long-running send");
                isLongRunning = true;
                if (progressFunc) {
                    progressFunc('PrepForSend', 0); // show progress bar immediately
                    window.CompanyInstanceHubProxy.onSendProgress(progressFunc);
                }
                window.CompanyInstanceHubProxy.onSendResult(extResultFunc);
            }
            else if (sfIn) {
                sfIn.apply(this, arguments);
            }
        };
        var ff = function () {
            if (ffIn) {
                ffIn.apply(this, arguments);
            }
        };
        var cf = function () {
            if (cfIn) {
                cfIn.apply(this, arguments);
            }
        };
        Send.docProxy.prepForSend(prepForSendPkg, sf, ff, cf);
    },
    ///<summary>
    /// Downloads selected documents, folders, inboxes
    ///</summary>
    ///<param name="ids">an object including any or all of these four Guid arrays: documentIds, versionIds, folderIds, and inboxIds; no need to include docId of document whose versionId is already specified</param>
    ///<param name="dialogFunc">Should always be Send.downloadDialog, exception in unit tests where a UI will not be presented.</param>
    ///<param name="options">extra options to be passed to the dialogFunc - See print function below for example</param>
    download: function (ids, dialogFunc, options) {
        var opts = $.extend({}, options, {
            itemCount: Utility.safeLength(ids.documentIds) + Utility.safeLength(ids.versionIds) + Utility.safeLength(ids.folderIds) + Utility.safeLength(ids.inboxIds),
            documentIds: ids.documentIds,
            versionIds: ids.versionIds,
            folderIds: ids.folderIds,
            inboxIds: ids.inboxIds,
            callback: function (progress, success, failure) {
                var ff = function (jqXHR, textStatus, errorThrown) {
                    failure(jqXHR, textStatus, errorThrown);
                };
                var pfsSF = function (prepResult) {
                    success(prepResult);
                };
                var prepForSendPkg = {
                    DocumentIds: ids.documentIds,
                    VersionIds: ids.versionIds,
                    InboxIds: ids.inboxIds,
                    FolderIds: ids.folderIds,
                    SendOptions: Send.getSaveACopyData()
                };
                Send.prepForSend(prepForSendPkg, progress, pfsSF, ff);
            }
        });
        dialogFunc(opts);
    },
    ///<summary>
    /// Emails selected documents
    ///</summary>
    ///<param name="ids">an object including either or both Guid arrays: documentIds and versionIds.  No need to include docId of document whose versionId is already specified</param>
    ///<param name="dialogFunc">Should always be Send.emailDialog, exception in unit tests where a UI will not be presented.</param>
    email: function (ids, dialogFunc) {
        dialogFunc({
            itemCount: Utility.safeLength(ids.documentIds) + Utility.safeLength(ids.versionIds),
            docIds: ids.documentIds,
            versionIds: ids.versionIds,
            message: Constants.c.linkMessage,
            callback: function (emailData, progress, cleanup, failureCleanup) {
                var ff = function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.addErrors(errorThrown);
                    failureCleanup();
                };
                var pfsSF = function (prepResult) {
                    if (emailData.useClient) {
                        emailData.emailOptions.FileName = prepResult;
                        cleanup();
                        ClientService.email(emailData.emailOptions);
                    } else {
                        var emailPkg = {
                            Attachments: prepResult === null ? null : [prepResult],
                            EmailOptions: emailData.emailOptions
                        };
                        var emailSF = function () {
                            cleanup();
                        };
                        var adminProxy = AdminServiceProxy({ skipStringifyWcf: true });
                        adminProxy.emailMessage(emailPkg, emailSF, ff);
                    }
                };
                var prepForSendPkg = {
                    VersionIds: ids.versionIds,
                    SendOptions: emailData.sendOptions
                };
                if (emailData.emailOptions.IsAttachment) {
                    Send.prepForSend(prepForSendPkg, progress, pfsSF, ff);
                }
                else {
                    pfsSF(null);
                }
            }
        });
    },
    ///<summary>
    /// Prints selected documents
    ///</summary>
    ///<param name="ids">an object including either or both Guid arrays: documentIds and versionIds.  No need to include docId of document whose versionId is already specified</param>
    ///<param name="dialogFunc">Should always be Send.printDialog, exception in unit tests where a UI will not be presented.</param>
    print: function (ids, dialogFunc) {
        dialogFunc({
            docIds: ids.documentIds,
            versionIds: ids.versionIds,
            message: Constants.c.linkMessage,
            callback: function (data, progress, cleanup, failureCleanup, webPrintFunc) {
                var ff = function (jqXHR, textStatus, errorThrown) {
                    var closeDialog = false;
                    var options = {};
                    if (errorThrown && errorThrown.Message.startsWith(Constants.UtilityConstants.MAX_WEB_PRINT_PAGE_COUNT)) {
                        closeDialog = true;
                        var maxCount = parseInt(errorThrown.Message.replace(Constants.UtilityConstants.MAX_WEB_PRINT_PAGE_COUNT, ''), 10);
                        options.message = String.format(Constants.c.PrintExceededMaximumPageCount, maxCount);
                    }
                    else if (errorThrown && errorThrown.Message.startsWith(Constants.c.webPrintPageNotRendered)) {
                        closeDialog = true;
                        options.message = errorThrown.Message;
                        options.data = {};
                        options.data.callbacks = {};
                        options.data.callbacks.open = function (diagSel) {
                            var rev = Utility.reverseMapObject(Constants.edt);
                            // yes, the following lines references the UI, but they are harmless if the diagSel passed in to this callback doesn't have matching elements
                            $(diagSel).find('.exportType input[value="' + rev[Constants.edt.Native] + '"]').prop('checked', true);
                            $(diagSel).find('input[name="rememberSettings"]').prop('checked', false);
                        };
                    }
                    else {
                        ErrorHandler.addErrors(errorThrown);
                    }
                    Utility.executeCallback(failureCleanup, closeDialog);
                    if (options.message) {
                        Send.download(ids, Send.downloadDialog, options);
                    }
                };
                var pfsSF = function (prepResult) {
                    if (data.useClient) {
                        cleanup();
                        ClientService.print(prepResult);
                    } else {
                        webPrintFunc(prepResult);
                    }
                };
                var prepForSendPkg = {
                    VersionIds: ids.versionIds,
                    SendOptions: data.printData
                };
                Send.prepForSend(prepForSendPkg, progress, pfsSF, ff);
            }
        });
    }
    //#endregion Utility Methods
};