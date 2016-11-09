/// <reference path="DialogsUtil.js" />
/// <reference path="Utility.js" />
var FormDialogs = {
    saveDirty: function (options) {
        var model = options.model;
        var callback = options.callback;
        var saveDirtyOk = function (saveDirtyCleanup) {
            model.save(null, {
                success: function (results) {
                    Utility.executeCallback(saveDirtyCleanup);
                    Utility.executeCallback(callback, false);
                },
                failure: function () {
                    Utility.executeCallback(saveDirtyCleanup);
                }
            });
        };
        var saveDirtyClose = function (saveDirtyCleanup) {
            Utility.executeCallback(callback, true);
            Utility.executeCallback(saveDirtyCleanup);
        };
        var msg = String.format(Constants.t('unsavedChanges'), options.name);
        var saveDirtyDiagOpts = {
            resizable: false
        };
        DialogsUtil.generalSaveDirtyPromptDialog(msg, saveDirtyOk, saveDirtyClose, saveDirtyDiagOpts);
    },
    createDocument: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ message: '' }, options);
        var selector = '#createFormDocument';
        var $dlg;
        var dlgOptions = { msg: options.message, html: $(selector).html(), title: Constants.c.createDocumentFromForm, autoOpen: false, hideButton: true };
        $dlg = DialogsUtil.generalLoadingDialog(dlgOptions);
        $dlg.dialog('open');
        options.callback(function () {
            DialogsUtil.cleanupDialog($dlg, null, false);
        });
    },
    completeForm: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var docPkg = options.docPkg;
        var cis = docPkg.get('ContentItems');
        var completeFunc = function (cleanup) {
            cis.completeForm();
            docPkg.save(null, {
                success: function () {
                    options.callback(cleanup);  // Only execute passed in callback when the form is 'Complete'
                },
                failure: function () {
                    // Failure message handled in sync method
                    Utility.executeCallback(cleanup);
                }
            });
        };
        var okFunc = function (cleanup) {
            if (options.isDirty) { //Said yes to complete but no to saving changes:
                docPkg.fetch({
                    success: function () {
                        completeFunc(cleanup);
                    },
                    failure: function () {
                        // Failure message handled in sync method
                        Utility.executeCallback(cleanup);
                    }
                });
            } else {
                completeFunc(cleanup);
            }
        };
        var cfDiagOpts = {
            title: Constants.c.completeForm,
            width: 300,
            height: 150
        };
        var completeFormCB = function (stillDirty) {
            options.isDirty = stillDirty;
            DialogsUtil.generalPromptDialog(Constants.c.completeFormPrompt, okFunc, null, cfDiagOpts);
        };
        // Prompt for a save if the document is dirty, before attempting to complete the form
        // otherwise the form is already 'Complete' by the time it gets to be re-rendered, so the changes aren't in the rendered form
        if (options.isDirty) {
            FormDialogs.saveDirty({ model: docPkg, name: docPkg.getDotted('Version.Title'), callback: completeFormCB });
        }
        else {
            completeFormCB(false);
        }
    },
    createPublicLink: function (options) {
        var ff = function (jqXHR, textStatus, errorThrown) {
            DialogsUtil.enableButtons([Constants.c.send, Constants.c.close]);
            ErrorHandler.addErrors(errorThrown);
        };
        var $dlg = DialogsUtil.generalDialog('#createFormPublicLink', {
            autoOpen: false,
            width: 500,
            open: function () {
                $dlg.find('input[name="expireDate"]').val(new Date().format('general'));
                $dlg.find('input[name="createLimit"]').numeric({ negative: false });
                Utility.addDatePicker($dlg.find('input[name="expireDate"]'));
                $dlg.find('input[name="linkUrl"],input[name="email_address"],input[name="subject_link"],textarea[name="emailBody"]').val('');
                $dlg.find('input[name="expirationMode"]').off().on('change', function (e) {
                    var $radio = $(e.currentTarget);
                    var val = $radio.val();
                    switch (val) {
                        case "createLimit":
                            $dlg.find('input[name="createLimit"]').prop('disabled', false);
                            $dlg.find('input[name="expireDate"]').prop('disabled', true);
                            break;
                        case "date":
                            $dlg.find('input[name="createLimit"]').prop('disabled', true);
                            $dlg.find('input[name="expireDate"]').prop('disabled', false);
                            break;
                        // case "none": treat as default
                        default:
                            $dlg.find('input[name="createLimit"]').prop('disabled', true);
                            $dlg.find('input[name="expireDate"]').prop('disabled', true);
                            break;

                    }
                });
                $dlg.find('.createPublicLink').off().on('click', function () {
                    var args = FormDialogs.getPublicLinkArgs($dlg, options);
                    var clsf = function (url) {
                        $dlg.find('input[name="linkUrl"]').val(url);
                        $dlg.find('input[name="linkUrl"]').select();
                    };
                    options.callback(args, clsf, ff);
                });
            },
            buttons: [
                {
                    text: Constants.c.send,
                    click: function () {
                        DialogsUtil.disableButtons([Constants.c.send, Constants.c.close]);
                        var args = FormDialogs.getPublicLinkArgs($dlg, options);
                        args.sendEmail = true;
                        var sendSF = function () {
                            DialogsUtil.isDialogInstanceDestroyDialog($dlg);
                        };
                        options.callback(args, sendSF, ff);
                    }
                },
                {
                    text: Constants.c.close,
                    click: function () {
                        DialogsUtil.isDialogInstanceDestroyDialog($dlg);
                    }
                }
            ]
        });
        $dlg.dialog('open');
    },
    getPublicLinkArgs: function ($dlg) {
        var args = {
            UseRecaptcha: $dlg.find('input[name="recaptcha"]').is(':checked'),
            DisplayMeta: $dlg.find('input[name="displayMeta"]').is(':checked'),
            UseEclipseLayout: $dlg.find('input[name="eclipseLayout"]').is(':checked'),
            EmailArgs: {
                Addresses: $dlg.find('input[name="email_address"]').val(),
                Subject: $dlg.find('input[name="subject_link"]').val(),
                Body: $dlg.find('textarea[name="emailBody"]').val()
            }
        };
        var val = $dlg.find('input[name="expirationMode"]:checked').val();
        switch (val) {
            case "createLimit":
                args.ExpirationType = Constants.ext.CustomCount;
                args.ExpirationValue = $dlg.find('input[name="createLimit"]').val();
                break;
            case "date":
                args.ExpirationType = Constants.ext.AbsoluteExpiration;
                args.ExpirationValue = $dlg.find('input[name="expireDate"]').val();
                break;
            // case "none": treat as default
            default: 
                args.ExpirationType = Constants.ext.NoExpiration;
                break;

        }
        return args;
    }
};