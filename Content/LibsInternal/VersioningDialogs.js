/// <reference path="DialogsUtil.js" />
var VersioningDialogs = {
    validFileSelected: false,
    uploadedFileId: undefined,
    fileUploadRestrictions: {
        fileTypes: [], //no type restrictions.
        fileSize: 15000000 //15mb
    },
    messageReceived: function (event, pmh) {
        if (!event.dataObj) {
            return;
        }
        var selected;
        switch (event.dataObj.Action) {
            case 'initialized':
                pmh.sendMessage({
                    Action: 'setRestrictions',
                    Restrictions: VersioningDialogs.fileUploadRestrictions
                });
                break;
            case 'fileSelected':
                VersioningDialogs.validFileSelected = event.dataObj.Valid;
                if (!VersioningDialogs.validFileSelected) {
                    if (event.dataObj.Reason === 'filesize') {
                        ErrorHandler.addErrors(String.format(Constants.c.fileTooLarge_T, VersioningDialogs.fileUploadRestrictions.fileSize, event.dataObj.Size));
                    }
                }
                break;
            case 'postResult':
                var result = event.dataObj.Result;
                if (result.Error) {
                    ErrorHandler.addErrors(result.Error.Message);
                    VersioningDialogs.uploadedFileId = -1; //Error indicator.
                    return;
                }
                VersioningDialogs.uploadedFileId = result.Result;
                break;
        }
    },
    promote: function (options) {
        var message = options.hasDraft ? Constants.c.promoteToDraft : Constants.c.promoteToPublished;
        DialogsUtil.generalPromptDialog(message, function (cleanup) {
            Utility.executeCallback(options.callback, cleanup);
        });
    },
    checkIn: function (options) {
        options = options || {};
        var postMessageHelper;
        VersioningDialogs.uploadedFileId = undefined;
        VersioningDialogs.validFileSelected = false;

        var closePostMessageHelper = function () {
            if (postMessageHelper) {
                postMessageHelper.close();
                postMessageHelper = undefined;
            }
        };
        var waitUntilUploadComplete = function (cleanup, settings) {
            if (VersioningDialogs.uploadedFileId === -1) {  //Upload completed with error (error handled in messageReceived)
                Utility.executeCallback(cleanup);
                closePostMessageHelper();
            } else if (VersioningDialogs.uploadedFileId) {  //Upload completed.
                settings.FileName = VersioningDialogs.uploadedFileId;
                options.callback(settings, cleanup);
                closePostMessageHelper();
            } else {                                        //Upload still in progress.
                setTimeout(function () { waitUntilUploadComplete(cleanup, settings); }, 1000);
            }
        };
        var compiledTemplate = doT.template(Templates.get('checkindialoglayout'));
        var enableComplete = options.hasFormPart && !options.isFormComplete;
        var completeFormTooltip = '';
        if (!options.hasFormPart) {
            completeFormTooltip = Constants.t('notAssociatedWithForm');
        }
        else if (options.isFormComplete) {
            completeFormTooltip = Constants.t('formIsComplete');
        }
        var html = compiledTemplate({
            iframeSource: Constants.Server_Url + '/GeneralUpload.ashx?uploadType=GetFileId',
            draftOwners: VersioningDialogs.getDraftOwners(options.currentOwner),
            enableComplete: enableComplete,
            completeFormTooltip: completeFormTooltip,
            hasIncompleteWorkflow: options.hasIncompleteWorkflow
        });

        var $dialog;
        var cleanupEventBindings = function () {
            $dialog.off('change', 'input[type="radio"][name="RemainAsDraft"]');
        };
        $dialog = DialogsUtil.generalPromptDialog(Constants.c.comment,
            function (cleanup) {
                var newCleanup = function () {
                    cleanupEventBindings();
                    Utility.executeCallback(cleanup);
                };
                var settings = {
                    RemainAsDraft: $dialog.find('input[name="RemainAsDraft"][value="true"]').is(':checked'),
                    RestartWorkflow: $dialog.find('input[name="RestartWorkflow"]').is(':checked'),
                    NewDraftOwnerId: $dialog.find('select[name="NewDraftOwnerId"] option:selected').val() || undefined,
                    VersionComment: $dialog.find('textarea[name="VersionComment"]').val(),
                    Complete: $dialog.find('input[name="Complete"]').is(':checked')
                };
                if (VersioningDialogs.validFileSelected) {
                    postMessageHelper.sendMessage({ Action: 'postFile', AdditionalData: undefined });
                    setTimeout(function () { waitUntilUploadComplete(newCleanup, settings); }, 1000);
                } else {
                    closePostMessageHelper();
                    options.callback(settings, newCleanup);
                }
            },
            function (cleanup) {
                closePostMessageHelper();
                cleanupEventBindings();
                cleanup();
            },
            {
                title: Constants.c.checkIn,
                autoOpen: false,
                html: html,
                width: 475,
                height: 350,
                minWidth: 475,
                minHeight: 350,
                open: function () {
                    var contentWindow = $dialog.find('iframe')[0].contentWindow;
                    postMessageHelper = PostMessageHelper({
                        messageReceived: VersioningDialogs.messageReceived,
                        target: contentWindow,
                        targetDomain: '*',
                        messageId: Utility.getSequentialGuids(1)[0]
                    });
                    $dialog.find('pre').addClass('removeMargin');
                }
            }
        );
        $dialog.on('change', 'input[type="radio"][name="RemainAsDraft"]', function (ev) {
            var remainAsDraft = Utility.convertToBool($(ev.currentTarget).val());
            if (enableComplete) {
                var $complete = $dialog.find('input[name="Complete"]');
                $complete.prop('checked', false);
                $complete.prop('disabled', remainAsDraft);
                var tt = remainAsDraft ? Constants.t('onlyCompleteOnPublish') : '';
                $complete.parent().attr('title', tt);
            }
            if (remainAsDraft) {
                $dialog.find('.newDraftOwnerIdContainer').removeClass('displayNone');
            } else {
                $dialog.find('.newDraftOwnerIdContainer').addClass('displayNone');
            }
        });
        $dialog.on('click', '.takeOwnership', function (ev) {
            $dialog.find('.newDraftOwnerIdContainer select').val(Page.currentUser.Id);
        });
        $dialog.dialog('open');
    },
    checkOut: function (options) {
        var systrayInfo = ClientService.getSimpleSystrayInfo();
        var compiledTemplate = doT.template(Templates.get('checkoutdialoglayout'));
        var uncompleteFormTooltip = '';
        if (!options.hasFormPart) {
            uncompleteFormTooltip = Constants.t('notAssociatedWithForm');
        }
        else if (!options.isFormComplete) {
            uncompleteFormTooltip = Constants.t('formIsUncomplete');
        }
        var templateOpts = {
            draftExists: options.draftExists,
            systrayTitle: systrayInfo.title,
            systrayName: systrayInfo.name,
            draftOwners: VersioningDialogs.getDraftOwners(options.currentOwner),
            enableUncomplete: options.hasFormPart && options.isFormComplete,
            uncompleteFormTooltip: uncompleteFormTooltip
        };
        var html = compiledTemplate(templateOpts);
        var $dialog;
        $('body').on('SystrayConnectionStatusChanged', function (event, args) {
            var $systray = $dialog.find('span.systraySelection');
            var systrayLabel = ' ' + args.name;
            $systray.text(systrayLabel).attr('title', args.title);
            var $dl = $dialog.find('[name="Download"]');
            if ($dl.is('[disabled]')) {
                var title = String.format(Constants.t('notOwnerSpecificOperation'), Constants.t('downloadTo') + systrayLabel);
                $dl.parent('label').attr('title', title);
            }
        });
        var diagHeight = options.draftExists ? 210 : 300;
        $dialog = DialogsUtil.generalPromptDialog(
            options.draftExists ? Constants.c.changeLockAndDownload : Constants.c.comment,
            function (cleanup) {
                var settings = {
                    comment: $dialog.find('textarea').val(),
                    download: $dialog.find('input[name="Download"]').is(':checked'),
                    newDraftOwnerId: $dialog.find('select[name="NewDraftOwnerId"] :selected').val(),
                    Uncomplete: $dialog.find('input[name="Uncomplete"]').is(':checked')
                };
                options.callback(settings, cleanup);
            },
            null,
            {
                title: Constants.c.checkOut,
                autoOpen: false,
                html: html,
                width: 400,
                height: diagHeight,
                minWidth: 400,
                minHeight: diagHeight,
                open: function () {
                    var $do = $dialog.find('select[name="NewDraftOwnerId"]');
                    VersioningDialogs.toggleNonDraftOwnerOperations($do.val(), $dialog, templateOpts);
                    $do.on('change', function (ev) {
                        VersioningDialogs.toggleNonDraftOwnerOperations($do.val(), $dialog, templateOpts);
                    });
                    $dialog.find('pre').addClass('removeMargin');
                    $dialog.find('.takeOwnership').on('click', function () {
                        $do.val(Page.currentUser.Id);
                        VersioningDialogs.toggleNonDraftOwnerOperations($do.val(), $dialog, templateOpts);
                    });
                },
                close: function () {
                    $('body').off('SystrayConnectionStatusChanged');
                }
            }
        );
        $dialog.dialog('open');
    },
    toggleNonDraftOwnerOperations: function (draftOwnerId, $dialog, templateOpts) {
        templateOpts = templateOpts || {};
        // Disable Uncomplete and Download to browser if the draft owner is NOT the current user
        var $uc = $dialog.find('[name="Uncomplete"]');
        var $ucPar = $uc.parent('label');
        var $dl = $dialog.find('[name="Download"]');
        var $dlPar = $dl.parent('label');
        if (draftOwnerId && draftOwnerId !== Page.currentUser.Id) {
            $uc.prop('checked', false);
            $uc.prop('disabled', true);
            var ucTitle = $ucPar.attr('title');
            ucTitle = ucTitle ? ucTitle + '\n\r' : '';
            $ucPar.attr('title', ucTitle + String.format(Constants.t('notOwnerSpecificOperation'), Constants.t('uncompleteForm')));
            $dl.prop('checked', false);
            $dl.prop('disabled', true);
            var dlTitle = $dlPar.attr('title');
            var $dlLabel = $dl.next('span');
            var $systray = $dialog.find('span.systraySelection');
            dlTitle = dlTitle ? dlTitle + '\n\r' : '';
            $dlPar.attr('title', dlTitle + String.format(Constants.t('notOwnerSpecificOperation'), $dlLabel.text() + ' ' + $systray.text()));
        }
        else {
            $ucPar.attr('title', templateOpts.uncompleteFormTooltip || '');
            if (templateOpts.enableUncomplete) {
                $uc.prop('disabled', false);
            }
            $dl.prop('disabled', false);
            $dlPar.attr('title', '');
        }
    },
    checkOutFileDownload: function (fileId) {
        var zipHref = Constants.Server_Url + '/GetFile.ashx?functionName=DownloadZipToBrowser&path=' + encodeURIComponent(fileId);
        $('#download').attr('src', zipHref);
    },
    cancelCheckOut: function (options) {
        DialogsUtil.generalPromptDialog(Constants.c.cancelCheckOutConfirmation, function (cleanup) {
            Utility.executeCallback(options.callback, cleanup);
        });
    },
    unpublishVersion: function (options) {
        var compiledTemplate = doT.template(Templates.get('unpublishdialoglayout'));
        var html = compiledTemplate({});
        var hasDraft = options.hasDraft;
        var currentVer = options.currentVersion;
        var title = Constants.c.unpublishVersionTitle + currentVer.get('Major') + '.' + currentVer.get('Minor');

        var $dialog;
        $dialog = DialogsUtil.generalPromptDialog(title, function (cleanup) {
            var promotePrior = $dialog.find("input").is(':checked');
            var priorVersionId = $dialog.find('.priorVersionIdDiv select option:selected').val();
            options.callback({ promotePrior: promotePrior, priorVersionId: priorVersionId }, cleanup);
        }, null, {
            title: Constants.c.unpublish,
            autoOpen: false,
            html: html,
            width: 400,
            height: 'auto',
            minWidth: 400,
            minHeight: 180,
            open: function () {
                var $lbl = $dialog.find('.priorVersionIdDiv span');
                var $chkBox = $dialog.find("input[type='checkbox']");
                var clickFunc = function () {
                    var draftFunc = function () {
                        $lbl.text(Constants.c.selectVersionToMakeDraft);
                        if (hasDraft) {
                            $dialog.find(".priorVersionIdDiv").hide();
                            $dialog.find('.priorVersionIdDiv select').empty();
                        }
                        else {
                            VersioningDialogs.fillVersionSelect($dialog, false, currentVer, options.versions);
                        }
                    };
                    var promoteFunc = function () {
                        $lbl.text(Constants.c.selectVersionToPromote);
                        if (VersioningDialogs.fillVersionSelect($dialog, true, currentVer, options.versions)) {
                            $dialog.find(".priorVersionIdDiv").show();
                        }
                        else {
                            draftFunc();
                        }
                    };

                    if ($chkBox.is(':checked')) {
                        promoteFunc();
                    }
                    else {
                        draftFunc();
                    }
                };
                $chkBox.change(clickFunc);
                clickFunc();
            }
        });
        $dialog.dialog('open');

    },
    deleteVersion: function (options) {
        var dlgOptions = {
            title: Constants.c.deleteVersion,
            width: 400,
            minWidth: 400,
            height: 150,
            minHeight: 150
        };
        DialogsUtil.generalPromptDialog(Constants.c.deleteVersionConfirmation, function (cleanup) {
            Utility.executeCallback(options.callback, cleanup);
        }, null, dlgOptions);
    },
    deleteVersionComment: function (options) {
        var $dialog;
        var divContainer = document.createElement('div');
        var input = document.createElement('input');
        input.setAttribute('class', 'fullWidth inlineblock fleft');
        input.setAttribute('maxlength', '256');
        divContainer.appendChild(input);
        var okFunc = function (cleanup) {
            var replacement = $dialog.find('input').val();
            options.callback(replacement, cleanup);
        };
        var dlgOptions = {
            autoOpen: false,
            title: Constants.c.deleteVersionComment,
            html: divContainer.innerHTML,
            width: 400,
            height: 200,
            minWidth: 400,
            minHeight: 200,
            open: function () {
                $dialog.find('input').focus();
            }
        };
        $dialog = DialogsUtil.generalPromptDialog(Constants.c.deleteVersionCommentConfirmation + '\n\n' + Constants.c.replaceVersionComment, okFunc, null, dlgOptions);
        $dialog.dialog('open');

    },
    getDraftOwners: function (currentDraftOwner) {
        var isAdmin = Utility.convertToBool($('#isSuperAdmin').val()) || Utility.convertToBool($('#isInstanceAdmin').val());
        // Filter out proxy users
        var excludeFlags = [Constants.uf.Proxy]; // Always filter out proxy users
        // If the current user is not a super admin, filter out all super admin users
        if (!isAdmin) {
            excludeFlags.push(Constants.uf.SuperAdmin);
        }
        var users = new Users(Utility.getUsers(excludeFlags, window.users, !isAdmin, true));
        // If the current Draft owner is a super admin and it was filtered out of the user list, add it back into the list of users
        if (currentDraftOwner) {
            var currentDraftOwnerInUsersList = !!users.get(currentDraftOwner);
            if (!currentDraftOwnerInUsersList) {
                users.add(window.users.get(currentDraftOwner));
            }
        }
        var i = 0;
        var length = users.length;
        var returnVal = [{ name: '', value: '', selected: '' }];
        for (i = 0; i < length; i++) {
            var user = users.at(i);
            var id = user.get('Id');
            var username = user.get('Username');
            if (id && username) {
                var u = { name: username, value: id, selected: '' };
                if (currentDraftOwner === id) { // Maintain the current draft owner as the new draft owner
                    u.selected = 'selected="selected"';
                }
                returnVal.push(u);
            }
        }
        return returnVal;
    },
    fillVersionSelect: function ($dialog, promoteVersion, curVer, documentVersions) {
        var i;
        var include = false;
        var $select = $dialog.find('.priorVersionIdDiv select');
        $select.empty();
        var length = documentVersions.length;
        var anyAdded = false;
        for (i = 0; i < length; i++) {
            var dv = documentVersions.at(i);
            include = !promoteVersion || VersioningDialogs.compare(curVer, dv) > 0;
            if (include) {
                var option = $('<option></option>').attr('value', dv.get('Id')).text(dv.get('Major') + '.' + dv.get('Minor'));
                if (curVer.get('Id') === dv.get('Id')) {
                    option.attr('selected', 'selected');
                }
                $select.append(option);
                anyAdded = true;
            }
        }

        if (!anyAdded) {
            ErrorHandler.addErrors(Constants.c.unpublishNoPromotableVersions);
            var $ckkBox = $dialog.find("input[type='checkbox']");
            $ckkBox.prop('checked', false);
            return false;
        }
        return true;
    },
    compare: function (version1, version2) {
        return version1.compareTo(version2);
    }
};