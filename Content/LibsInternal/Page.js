/// <reference path="../JSProxy/DocumentServiceProxy.js" />
/// <reference path="../LibsExternal/a_jquery.js" />
/// <reference path="ShowHidePanel.js" />
/// <reference path="ClientService.js" />
/// <reference path="Utility.js" />
var Page = {
    /**
    * init for page specific content
    */
    //Workaround for IE8 Infinite resize loop.      
    recentlyResized: false,
    prevSuggLength: -1,
    suggLength: -1,
    wfProxy: undefined,
    maxRequestLength: 52428800, // int - obtain from web.config httpruntime maxRequestLength, default to 50 MB; measured in Bytes
    currentUser: undefined,
    authToken: undefined,
    scheduleData: [],
    scheduleView: undefined,
    routers: null,  // store of backbone routers
    init: function () {
        Page.maxRequestLength = ($('#maxRequestLength').val() * 1024) || Page.maxRequestLength;  // convert to bytes, the web.config setting is in KB
        //TODO: Replace all parsing of $('#currentUser').val() to use Page.currentUser instead.
        Page.currentUser = JSON.parse($('#currentUser').val());
        Tab.init();
        CustomFieldSetup.init();
        Page.setupCollections();
        Page.supportTextAreaMaxLength();
        Page.loadSystrayHelper();
        Page.setupQuickSavedSearches();
        Page.setupCompanySwitcher();
        if (!window.isGuest) {
            CompanyInstanceHubProxy.init();
            CompanyInstanceHubProxy.start(function () {
                ClientService.init();
            });
            Page.setupMyAlerts();
            Page.setupInboxes();
            Page.setupFolders();
        }
        Page.windowResizeEvent();
        Page.setupScrollBars();
        Page.setupResizing();
        Page.initLayout();
        Page.applyEventHandler();
        Page.setupNavTooltips();
        Page.setupWorkflowHelp();
        Page.setupHelp();
        Page.setupHelpDocs();
        Page.setupIdea();
        Page.setupUserPreferences();
        if (!window.isGuest) {
            Page.setupWalkMe();
            Page.startWFPolling();
            Page.ShowSystemNotifications();
            Page.renderWEDSSchedule();
            Page.hookLogout();
            Page.getRecognitionOptions();
        }
    },
    getRecognitionOptions: function () {
        var success = function (result) {
            if (result) {
                Utility.fillBarcodeType($('#recognitionPreferencesFS').find('select[name="BarcodeType"]'), result.BarcodeType);
                Utility.fillEnhancementOption($('#recognitionPreferencesFS').find('select[name="EnhancementOption"]'), result.Enhancement);
            }
        };
        var failure = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        var docProxy = new DocumentServiceProxy();
        docProxy.getRecognitionOptions(success, failure);
    },
    supportTextAreaMaxLength: function () {
        $('textarea[maxlength]').on('keyup blur', function () {
            var maxlength = $(this).attr('maxlength');
            var val = $(this).val();
            if (val.length > maxlength) {
                $(this).val(val.slice(0, maxlength));
            }
        });
    },
    loadSystrayHelper: function () {
        var pluginExists = false;
        try {
            if (window.navigator) {
                var wnp = window.navigator.plugins;
                var len = wnp.length;
                while (len--) {
                    if (wnp[len].filename === 'npE3SystrayHelper.dll') {
                        pluginExists = true;
                        break;
                    }
                }
            }
            if (window.ActiveXObject) {
                var control = new ActiveXObject('AstriaSolutionsGroup.E3SystrayHelper');
                if (control) {
                    pluginExists = true;
                }
            }
        }
        catch (ex) { }
        if (pluginExists) {
            $('#slcc').after('<object id="sysTrayHelper" type="application/x-e3systrayhelper" height="0" width="0" ><param name="onload" value="pluginLoaded" /></object>');
        }
    },
    startWFPolling: function () {
        setInterval(function () {
            var that = this;
            var lastUpdated = Utility.GetUserPreference(Constants.UtilityConstants.WORKFLOW_LAST_CHECKED);
            if (!lastUpdated) {
                lastUpdated = dateFormat(new Date(0));
            }
            lastUpdated = new Date(lastUpdated);
            var sf = function (result) {
                var contents;
                var valueSet = false;
                if (result && result.NewWorkflows > 0) {
                    valueSet = true;
                    contents = $('#' + Constants.c.myWorkflows).contents();
                    contents[contents.length - 1].nodeValue = Constants.c.myWorkflows + ' (' + result.NewWorkflows + ')';
                    $('#' + Constants.c.myWorkflows).parent().css('font-weight', 'bolder');
                }
                if (result && result.NewApprovals > 0) {
                    valueSet = true;
                    contents = $('#' + Constants.c.myApprovals).contents();
                    contents[contents.length - 1].nodeValue = Constants.c.myApprovals + ' (' + result.NewApprovals + ')';
                    $('#' + Constants.c.myApprovals).parent().css('font-weight', 'bolder');
                }
                if (valueSet) {
                    Utility.SetSingleUserPreference(Constants.UtilityConstants.WORKFLOW_LAST_CHECKED, new Date());
                }
            };
            var ff = function (jqXHR, textStatus, bizEx) {
                ErrorHandler.addErrors(bizEx.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                clearInterval(that);
            };
            WorkflowUtil.wfProxy.getAlertCounts({ LastUpdated: lastUpdated.toMSJSON() }, sf, ff);
        }, 60000);
    },
    ShowSystemNotifications: function () {
        var notificationdata = "";
        if (Utility.GetUserPreference('systemNotificationsneverAgain')) {
            notificationdata = Utility.GetUserPreference('systemNotificationsneverAgain');
        }
        var currentNotificationId = "";
        var companySettingsProxy = CompanySettingsProxy();
        var sf = function (result) {
            var j = 0;
            var length = result.length;
            if (notificationdata !== "" && notificationdata !== undefined) {
                for (j; j < length; j++) {
                    if (notificationdata.indexOf(result[j].Id) !== -1) {
                        result.splice(j, 1);
                        j--;
                        length--;
                    }
                }
            }
            if (!result || result.length === 0) {
                return false;
            }
            $('#systemNotifications').append(result[0].Content.replace('../', './'));
            currentNotificationId = result[0].Id;
            var notificationPosition = 0;
            $('#mainsystemNotifications').dialog({
                resizable: true,
                title: Constants.c.systemNotifications,
                modal: true,
                width: 'auto',
                minWidth: 490,
                open: function () {
                    $('#systemNotifications').css({
                        'max-width': $('body').width() - 50,
                        'max-height': $('body').height() - 150
                    });
                    $('#systemNotifications').css('overflow', 'auto');
                    Utility.disableButtons([Constants.c.previous]);
                    if (notificationPosition === result.length - 1) {
                        Utility.disableButtons([Constants.c.next]);
                    }
                    $('#systemNotificationsneverAgain').click(function (e) {
                        if ($(this).is(':checked')) {
                            if (notificationdata) {
                                notificationdata = notificationdata + currentNotificationId;
                            }
                            else {
                                notificationdata = currentNotificationId;
                            }
                        }
                        if (!$(this).is(':checked')) {
                            if (notificationdata.indexOf(currentNotificationId) === 0) {
                                notificationdata = notificationdata.replace(currentNotificationId, "");
                            } else {
                                notificationdata = notificationdata.replace(currentNotificationId, "");
                            }
                        }
                        var kvPairs = [];
                        kvPairs.push({ Key: 'systemNotificationsneverAgain', Value: notificationdata });
                        Utility.SetUserPreference(kvPairs);
                    });
                },
                resize: function () {
                    $('#systemNotifications').css({
                        'max-width': $(this).width(),
                        'max-height': $(this).height() - 25
                    });
                },
                buttons: [
                    {
                        text: Constants.c.previous,
                        click: function () {
                            $('#systemNotifications').html("");
                            notificationPosition--;
                            if (notificationdata.indexOf(result[notificationPosition].Id) !== -1) {
                                $("#systemNotificationsneverAgain").prop('checked', true);
                            } else {
                                $("#systemNotificationsneverAgain").prop('checked', false);
                            }
                            $('#systemNotifications').append(result[notificationPosition].Content.replace('../', './'));
                            currentNotificationId = result[notificationPosition].Id;
                            if (notificationPosition === 0) {
                                Utility.disableButtons([Constants.c.previous]);
                            }
                            if (notificationPosition < result.length - 1) {
                                Utility.enableButtons([Constants.c.next]);
                            }

                        }
                    },
                    {
                        text: Constants.c.next,
                        click: function () {
                            $('#systemNotifications').html("");
                            notificationPosition++;
                            if (notificationdata.indexOf(result[notificationPosition].Id) !== -1) {
                                $("#systemNotificationsneverAgain").prop('checked', true);
                            } else {
                                $("#systemNotificationsneverAgain").prop('checked', false);
                            }
                            $('#systemNotifications').append(result[notificationPosition].Content.replace('../', './'));
                            currentNotificationId = result[notificationPosition].Id;
                            if (notificationPosition >= 1) {
                                Utility.enableButtons([Constants.c.previous]);
                            }
                            if (notificationPosition === result.length - 1) {
                                Utility.disableButtons([Constants.c.next]);
                            }
                        }
                    },
                    {
                        text: Constants.c.close,
                        click: function () {
                            $(this).dialog('close');
                        }
                    }
                ]
            });
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.addErrors(errorThrown.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        };
        var currentCompanyId = $('#companySelect option:selected').data("companyid");
        companySettingsProxy.GetCompanySystemNotification(currentCompanyId, sf, ff);
    },
    renderWEDSSchedule: function () {
        var $targ = $("#wedsSchedule");
        var schedule;
        if (this.scheduleData) {
            schedule = new Schedule(this.scheduleData);
        }
        else {
            schedule = undefined;
        }
        if (this.scheduleView && this.scheduleView.close) {
            this.scheduleView.close();
        }
        this.scheduleView = new SchedulingView({
            schedules: this.scheduleData,
            executionTypes: [Constants.ef.Daily],
            recurEvery: Constants.c.every + ':',
            displayScheduleName: false,
            displayNewSchedule: false,
            displayActive: false,
            model: schedule
        });
        $targ.append(this.scheduleView.render().$el);
        var wf_NotificationFlags = Utility.GetUserPreference('wf_NotificationFlags') || 'MailNormally';
        this.enableDisableWEDSFS(wf_NotificationFlags);
    },
    setupHelpDocs: function () {
        $('#helpDocs').click(function () {
            var parts = window.location.hash.split('#');
            var link = Constants.Url_Help;
            if (parts.length > 1) {
                var part = parts[1];
                var slices = part.split('/');
                //check for indexOf admin
                slices[0] = slices[0].indexOf('Admin') === 0 ? 'Admin' : slices[0];
                if (Constants.c['hd_' + slices[0]] !== undefined) {
                    link = link + Constants.t('hd_' + slices[0]);
                }
            }
            var w = window.open(link, 'dstarHelp', 'menubar=no,height=700,width=965,titlebar=no,scrollbars=yes,resizable=yes');
            var func = function () { w.focus(); };
            setTimeout(func, 500);
        });
    },
    setupWorkflowHelp: function () {
        $('#emailWorkflowDesigner').click(function (e) {
            EmailLinkUtil.setupWorkflowHelp();
        });
    },
    setupHelp: function () {
        $('#helpDialogLiveChat').click(function () {
            window.open(Constants.Url_Base + 'SystemMaintenance/LiveChat', Constants.c.liveChatNoSpace, 'toolbar=no,status=no,menubar=no,titlebar=no,location=no,scrollbars=no,resizable=no,height=500,width=400');
        });
        $('#requestHelp').click(function (e) {
            ClientService.fillVersionInfo();
            $('#helpDialogIFrame').attr('src', Constants.Url_Base + 'SystemMaintenance/AddAttachment');
            $('#helpDialog').dialog('open');
        });
        $('#helpDialog').dialog({
            autoOpen: false,
            resizable: true,
            width: 400,
            minWidth: 400,
            minHeight: 350,
            title: Constants.c.requestHelp,
            modal: true,
            open: function () {
                $(this).css('height', 'auto');
            },
            buttons: [
                {
                    text: Constants.c.ok,
                    click: function () {
                        Page.sendHelpMessage();
                    }
                },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ],
            close: function () {
                $('#helpDialogIFrame').removeAttr('src');
            }
        });
    },
    sendHelpMessage: function () {
        var postData = {};
        var diag = $('#helpDialog');
        postData.message = $('#helpDialogMessage').val();
        postData.clientData = JSON.stringify(ClientService.versionInfo);
        postData.contextURI = document.location.href;
        Utility.changeButtonState([Constants.c.ok, Constants.c.cancel], 'disable', diag.parent());
        diag.find('.throbber').show();
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        $.ajax({
            type: 'post',
            url: Constants.Url_Base + 'SystemMaintenance/SendHelpMessage',
            data: postData,
            success: function (result) {
                if (result.status === "ok") {
                    $('#helpDialogMessage').val('');
                    $('#helpDialog').dialog("close");
                }
                else {
                    ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            },
            complete: function () {
                Utility.changeButtonState([Constants.c.ok, Constants.c.cancel], 'enable', diag.parent());
                diag.find('.throbber').hide();
            }
        });
    },
    setupWalkMe: function (idx) {
        idx = idx || 0;
        // The walkme library loads additional javascript files that are required to call toggleMenu.
        // Since these files are loaded asynchronously, using a timeout to calculate if walkme has loaded so that toggleMenu can be called
        if (idx < 15) {
            setTimeout(function () {
                var wmpAPI = window.WalkMePlayerAPI;
                if (wmpAPI) {
                    $('#walkMe').click(function () {
                        wmpAPI.toggleMenu();
                    });
                    $('#walkMe').show();
                }
                else {
                    Page.setupWalkMe(++idx);
                    $('#walkMe').hide();
                }
            }, 1000);
        }
    },
    setupIdea: function () {
        $('#submitIdea').click(function (e) {
            $('#ideaDialogIFrame').attr('src', Constants.Url_Base + 'SystemMaintenance/AddAttachment');
            $('#ideaDialog').dialog('open');
        });
        $('#ideaDialog').dialog({
            autoOpen: false,
            title: Constants.c.submitIdea,
            width: 400,
            minWidth: 400,
            minHeight: 350,
            modal: true,
            open: function () {
                $(this).css('height', 'auto');
            },
            buttons: [
                {
                    text: Constants.c.ok,
                    click: function () {
                        Page.sendIdeaMessage();
                    }
                },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ],
            close: function () {
                $('#ideaDialogIFrame').removeAttr('src');
            }
        });
    },
    setupUserPreferences: function () {
        var that = this;
        $('#userPrefs').click(function (e) {
            $('#userPrefsDialog').dialog('open');
        });
        $('#userPrefsDialog').dialog({
            autoOpen: false,
            title: Constants.c.userPreferences,
            width: 400,
            minWidth: 400,
            minHeight: 350,
            maxHeight: 600,
            modal: true,
            open: function () {
                $(this).css('height', 'auto');
                $('#wfSubmitOptionsList').hide();
                Utility.enableButtons([Constants.c.ok, Constants.c.cancel]);
                var wfAssignVal = Utility.GetUserPreference('wfAddAction');
                if (wfAssignVal) {
                    $('#assignWFActionsFS .' + wfAssignVal).prop('checked', true);
                }
                else {
                    $('#assignWFActionsFS .addActNone').prop('checked', true);
                }
                var wfSubmitVal = Utility.GetUserPreference('subOpt');
                if (wfSubmitVal) {
                    $('#submitWFActionFS .' + wfSubmitVal).prop('checked', true);
                }
                else {
                    $('#submitWFActionFS .submitNext').prop('checked', true);
                }
                var clientUsage = Utility.GetUserPreference('useClientForOutput');
                if (clientUsage) {
                    $('#useClientForOutputFS .' + clientUsage).prop('checked', true);
                }
                else {
                    $('#useClientForOutputFS .clientWhenAvailable').prop('checked', true);
                }
                var gridInlineEdit = Utility.GetUserPreference('rowEditChange');
                if (gridInlineEdit) {
                    $('#gridInlineEditFS .' + gridInlineEdit).prop('checked', true);
                }
                else {
                    $('#gridInlineEditFS .restoreRow').prop('checked', true);
                }
                var searchOrderBy = Utility.GetUserPreference('searchOrderBy');
                if (searchOrderBy) {
                    $('#searchSortingFS [value="' + searchOrderBy + '"]').prop('selected', true);
                }
                else {
                    $('#searchSortingFS [value="' + Constants.c.title.toLowerCase() + '"]').prop('selected', true);
                }
                var searchOrder = Utility.GetUserPreference('searchOrder');
                if (searchOrder) {
                    $('#searchSortingFS .' + searchOrder).prop('checked', true);
                }
                else {
                    $('#searchSortingFS .desc').prop('checked', true);
                }
                var showConnectedOnly = Utility.convertToBool(Utility.GetUserPreference('showConnectedOnly'));
                $('#captureScannersFS .showConnectedOnly').prop('checked', showConnectedOnly);
                var capturePreviewMode = Utility.GetUserPreference('capturePreviewMode');
                if (capturePreviewMode) {
                    $('#capturePreviewModeFS .' + capturePreviewMode).prop('checked', true);
                }
                else {
                    $('#capturePreviewModeFS .fullSizePreview').prop('checked', true);
                }
                var alwaysInAnnotationEditMode = Utility.GetUserPreference('annotationEditMode');
                if (alwaysInAnnotationEditMode) {
                    $('#annotationEditModeFS .' + alwaysInAnnotationEditMode).prop('checked', true);
                }
                else {
                    $('#annotationEditModeFS .exitEditMode').prop('checked', true);
                }
                var relatedDocumentAlignmentOption = Utility.GetUserPreference('relatedDocumentAlignmentOption');
                if (relatedDocumentAlignmentOption) {
                    $('#relatedDocumentAlignment').find('input[value="' + relatedDocumentAlignmentOption + '"]').prop('checked', true);
                }
                else {
                    // default to right aligned as per Bug 12603 - http://pedro.docstar.com/b/show_bug.cgi?id=12603
                    $('#relatedDocumentAlignment').find('input[value="right"]').prop('checked', true);  
                }
                var thumbnails = Utility.GetUserPreference('thumbnails');
                if (thumbnails) {
                    $('#thumbnailFS .' + thumbnails).prop('checked', true);
                } else {
                    $('#thumbnailFS .thumbnailoff').prop('checked', true);
                }

                var workflowTabRefreshOption = Utility.GetUserPreference('workflowTabRefreshOption');
                if (workflowTabRefreshOption) {
                    $('#workflowTabRefresh .' + workflowTabRefreshOption).prop('checked', true);
                } else {
                    $('#workflowTabRefresh .None').prop('checked', true);
                }

                var zoomlevelval = Utility.GetUserPreference('zoomlevel');
                $("#zoomlevelFS select").val(zoomlevelval || 'width');   // Default to 5%

                var wf_NotificationFlags = Utility.GetUserPreference('wf_NotificationFlags') || 'MailNormally';
                $('#workflowNotificationFS .' + wf_NotificationFlags).prop('checked', true);
                that.enableDisableWEDSFS(wf_NotificationFlags);

                var instanceId = $('#defaultCompanyInstance').val();
                $('#defaultSite [value="' + instanceId + '"]').prop('selected', true);

                var isCollapsed = Utility.convertToBool(Utility.GetUserPreference('previewerCollapsed'));
                var previewResizeWidth = parseInt(Utility.GetUserPreference('previewResizeWidth'), 10);
                $("#previewResizeFS input").numeric({ negative: false, decimal: 0 });
                if (isCollapsed) {
                    $("#previewResizeFS input").val(0);
                }
                else if (!isNaN(previewResizeWidth)) {
                    $("#previewResizeFS input").val(previewResizeWidth);
                }
                else {
                    $("#previewResizeFS input").val(ShowHidePanel.getAvailablePreviewWidth());
                }

                var wedsValue = Utility.GetUserPreference('WEDS');
                if (wedsValue !== undefined && wedsValue !== '') {
                    var wedsVal = Utility.tryParseJSON(wedsValue, true);
                    that.scheduleData.Frequency = wedsVal ? wedsVal.Days : 1;
                    that.scheduleData.ExecutionTime = wedsVal ? wedsVal.Time : '00:00';
                    that.renderWEDSSchedule();
                }
                var mouseWheelBehavior = Utility.GetUserPreference('mouseWheelBehavior');
                if (mouseWheelBehavior) {
                    $('#mouseWheelBehaviorFS .' + mouseWheelBehavior).prop('checked', true);
                } else {
                    $('#mouseWheelBehaviorFS .zoom').prop('checked', true);
                }
                var alwaysInFormEditMode = Utility.GetUserPreference('formEditMode');
                if (alwaysInFormEditMode !== undefined) {
                    $('#formEditModeFS .remainInEditMode').prop('checked', Utility.convertToBool(alwaysInFormEditMode));
                }
                var systrayConnection = Utility.GetUserPreference('systrayConnection');
                if (systrayConnection) {
                    systrayConnection = JSON.parse(systrayConnection);
                }
                var menuTemplate = doT.template(Templates.get('systrayconnectionlayout'));
                var htmlData = menuTemplate(systrayConnection);
                // Will select the systrayConnection found as a user preference if it can be selected (eg. No duplicate MachineNames)
                // Otherwise the 'No connection' option is selected
                $('#systrayConnectionCont').html(htmlData);
                var qsPrefs = SearchUtil.getQuickSearchPreferences();
                var qsPref;
                for (qsPref in qsPrefs) {
                    if (qsPrefs.hasOwnProperty(qsPref)) {
                        $('#includeInQuickSearchFS .' + qsPref).prop('checked', qsPrefs[qsPref]);
                    }
                }

                var barcodeType = Utility.GetUserPreference('barcodeType');
                if (barcodeType) {
                    barcodeType = JSON.parse(barcodeType);
                    $('#recognitionPreferencesFS select[name="BarcodeType"]').val(barcodeType);
                }

                var enhancementOption = Utility.GetUserPreference('enhancementOption');
                if (enhancementOption) {
                    enhancementOption = JSON.parse(enhancementOption);
                    $('#recognitionPreferencesFS select[name="EnhancementOption"]').val(enhancementOption);
                }

                var autoSelectFirstDocPrefs = Utility.getAutoSelectFirstDocPreferences();
                var autoSelectFirstDocPref;
                for (autoSelectFirstDocPref in autoSelectFirstDocPrefs) {
                    if (autoSelectFirstDocPrefs.hasOwnProperty(autoSelectFirstDocPref)) {
                        $('#autoSelectFirstDocFS .' + autoSelectFirstDocPref).prop('checked', autoSelectFirstDocPrefs[autoSelectFirstDocPref]);
                    }
                }
                if (!Page.userPrefOpened) {
                    Page.userPrefOpened = true;
                    $('#userPrefsDialog').delegate('fieldset legend', 'click', function (e) {
                        ShowHideUtil.toggleFieldset(e, true);
                    });
                }
            },
            buttons: [
                {
                    text: Constants.c.ok,
                    click: function () {
                        Page.saveUserPreferences();
                        $(this).dialog("close");
                    }
                },
                {
                    text: Constants.c.cancel,
                    click: function () {
                        $(this).dialog("close");
                    }
                },
                {
                    'class': 'dialogLeftButton',
                    text: Constants.c.reset,
                    click: function () {
                        Page.resetUserPreferences($(this));
                    }
                }
            ]
        });
    },
    sendIdeaMessage: function () {
        var postData = {};
        var diag = $('#ideaDialog');
        postData.message = $('#ideaDialogMessage').val();
        postData.url = window.location.href;
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        Utility.changeButtonState([Constants.c.ok, Constants.c.cancel], 'disable', diag.parent());
        diag.find('.throbber').show();
        $.ajax({
            type: 'POST',
            url: Constants.Url_Base + 'SystemMaintenance/SendIdeaMessage',
            data: postData,
            success: function (result) {
                if (result.status === "ok") {
                    $('#ideaDialogMessage').val('');
                    $('#ideaDialog').dialog("close");
                }
                else {
                    ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            },
            complete: function () {
                Utility.changeButtonState([Constants.c.ok, Constants.c.cancel], 'enable', diag.parent());
                diag.find('.throbber').hide();
            }
        });
    },
    saveUserPreferences: function () {
        var kvPairs = [];
        var assignAction = $('#assignWFActionsFS').find('input:checked').attr('class');
        var submitAction = $('#submitWFActionFS').find('input:checked').attr('class');
        var clientUsage = $('#useClientForOutputFS').find('input:checked').attr('class');
        var gridInlineEdit = $('#gridInlineEditFS').find('input:checked').attr('class');
        var defaultSite = $('#defaultSite').find('option:selected').val();
        var foldersInQS = $('#includeInQuickSearchFS .foldersInQS').is(':checked');
        var inboxesInQS = $('#includeInQuickSearchFS .inboxesInQS').is(':checked');
        var documentsInQS = $('#includeInQuickSearchFS .documentsInQS').is(':checked');
        var autoSelectFirstDocRetrive = $('#autoSelectFirstDocFS .autoSelectFirstDocRetrive').is(':checked');
        var autoSelectFirstDocWorkFlow = $('#autoSelectFirstDocFS .autoSelectFirstDocWorkFlow').is(':checked');
        var enableAutoWildcardQuickSearch = $('#includeInQuickSearchFS .enableAutoWildcardQuickSearch').is(':checked');
        var searchOrderBy = $('#searchSortingFS option:selected').val();
        var searchOrder = $('#searchSortingFS input:checked').attr('class');
        var showConnectedOnly = $('#captureScannersFS .showConnectedOnly').is(':checked');
        var capturePreviewMode = $('#capturePreviewModeFS input:checked').attr('class');
        var annotationEditMode = $('#annotationEditModeFS input:checked').attr('class');
        var thumbnails = $('#thumbnailFS input:checked').attr('class');
        var formEditMode = $('#formEditModeFS .remainInEditMode').is(':checked');
        var relatedDocumentAlignmentOption = $('#relatedDocumentAlignment').find('[name="relatedDocumentsAlign"]:checked').val();
        var workflowTabRefreshOption = $('#workflowTabRefresh input:checked').attr('class');
        var defaultzoomlevel = $.trim($('#zoomlevelFS select').val());
        var workflowNotification = $('#workflowNotificationFS input:checked').attr('class');
        var $selectedSystray = $('#systrayConnectionFS option:selected');
        var selectedBarcodeType = $('#recognitionPreferencesFS select[name="BarcodeType"]').val();
        var selectedEnhancementOption = $('#recognitionPreferencesFS select[name="EnhancementOption"]').val();
        var systrayConnection = ClientService.transformSystrayConnectionData($selectedSystray);
        var previewResizeWidth = parseInt($("#previewResizeFS input").val().trim(), 10);
        if (isNaN(previewResizeWidth)) {
            previewResizeWidth = ShowHidePanel.getAvailablePreviewWidth();
        } else if (previewResizeWidth > 0 && previewResizeWidth < 280) {
            previewResizeWidth = 280;
        }
        if (previewResizeWidth === 0) {
            kvPairs.push({ Key: 'previewerCollapsed', Value: true });
            previewResizeWidth = ShowHidePanel.getAvailablePreviewWidth();
        } else {
            kvPairs.push({ Key: 'previewerCollapsed', Value: false });
        }
        var scheduleUIData = this.scheduleView.getCurrentUIData();
        var wedsValue = {};
        if (workflowNotification === "MailDigest") {
            var wedsDays = scheduleUIData.Frequency;
            var wedsTime = scheduleUIData.ExecutionTime;
            if (wedsDays === '0' || wedsDays === '') {
                wedsValue.Days = 1;
            }
            else {
                wedsValue.Days = wedsDays;
            }
            if (wedsTime !== '') {
                wedsValue.Time = wedsTime;
            }
            else {
                wedsValue.Time = "00:00";

            }
        } else {
            wedsValue.Days = '';
            wedsValue.Time = '';
        }
        var mouseWheelBehavior = $('#mouseWheelBehaviorFS input:checked').attr('class');


        kvPairs.push({ Key: 'wfAddAction', Value: assignAction });
        kvPairs.push({ Key: 'subOpt', Value: submitAction });
        kvPairs.push({ Key: 'useClientForOutput', Value: clientUsage });
        kvPairs.push({ Key: 'rowEditChange', Value: gridInlineEdit });
        kvPairs.push({
            Key: 'includeInQS',
            Value: JSON.stringify({
                foldersInQS: foldersInQS,
                inboxesInQS: inboxesInQS,
                documentsInQS: documentsInQS,
                enableAutoWildcardQuickSearch: enableAutoWildcardQuickSearch
            })
        });
        kvPairs.push({
            Key: 'autoSelectFirstDoc',
            Value: JSON.stringify({
                autoSelectFirstDocRetrive: autoSelectFirstDocRetrive,
                autoSelectFirstDocWorkFlow: autoSelectFirstDocWorkFlow
            })
        });
        kvPairs.push({ Key: 'searchOrderBy', Value: searchOrderBy });
        kvPairs.push({ Key: 'searchOrder', Value: searchOrder });
        kvPairs.push({ Key: 'capturePreviewMode', Value: capturePreviewMode });
        kvPairs.push({ Key: 'showConnectedOnly', Value: showConnectedOnly });
        kvPairs.push({ Key: 'annotationEditMode', Value: annotationEditMode });
        kvPairs.push({ Key: 'thumbnails', Value: thumbnails });
        kvPairs.push({ Key: 'formEditMode', Value: formEditMode });
        kvPairs.push({ Key: 'relatedDocumentAlignmentOption', Value: relatedDocumentAlignmentOption });
        kvPairs.push({ Key: 'workflowTabRefreshOption', Value: workflowTabRefreshOption });
        kvPairs.push({ Key: 'zoomlevel', Value: defaultzoomlevel });
        kvPairs.push({ Key: 'wf_NotificationFlags', Value: workflowNotification });
        kvPairs.push({ Key: 'systrayConnection', Value: JSON.stringify(systrayConnection) });
        kvPairs.push({ Key: 'barcodeType', Value: JSON.stringify(selectedBarcodeType) });
        kvPairs.push({ Key: 'enhancementOption', Value: JSON.stringify(selectedEnhancementOption) });
        kvPairs.push({ Key: 'previewResizeWidth', Value: previewResizeWidth });
        kvPairs.push({ Key: 'WEDS', Value: JSON.stringify(wedsValue) });
        kvPairs.push({ Key: 'mouseWheelBehavior', Value: mouseWheelBehavior });
        var systrayConnectionChanged = ClientService.systrayConnectionChanged(systrayConnection);
        var cb = function () {
            if (systrayConnectionChanged) {
                if (systrayConnection) {
                    if ($.isEmptyObject(systrayConnection)) {
                        ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.NoConnectionSelected);
                    }
                    else {
                        ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.Connecting);
                        if (systrayConnection.ConnectionId) {
                            window.CompanyInstanceHubProxy.browserConnectSystray(systrayConnection.ConnectionId);
                        }
                    }
                }
            }
            else if (ClientService.isSystrayConnected() && showConnectedOnly !== ClientService.lastShowAllDevicesOption) {
                ClientService.getAcquireData(); // reget scanners list only if connected and if this option has changed -- and only if we aren't reconnecting anyway
            }
        };
        Utility.SetUserPreference(kvPairs, cb, true);
        if (defaultSite) {
            $.ajax({
                url: Constants.Url_Base + 'Company/SetDefaultInstance',
                data: JSON.stringify({ instanceId: defaultSite }),
                type: "POST",
                contentType: "application/json",
                success: function (result) {
                    if (result.status !== 'ok') {
                        ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    }
                    else {
                        $('#defaultCompanyInstance').val(defaultSite);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.addErrors(errorThrown, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            });
        }
        // Only display thumbnails if the document is not native and is the main viewer
        if ($('#entityViewer:visible').length > 0 && $('#nativeViewerLayout:visible').length === 0) {
            //TODO: FORMS thumbnails don't display properly when changed from the user preference dialo
            var documentViewer = new DocumentViewerView({ el: "#entityViewer" });
            var zoomlevelval = Utility.GetUserPreference('zoomlevel');
            if (zoomlevelval) {
                $('body').data('fit', zoomlevelval);
                documentViewer.removeCheckedClass(zoomlevelval);
            } else {
                $('body').data('fit', 'width');
            }
        }
        ShowHidePanel.resize();
    },
    resetUserPreferences: function ($dlg) {
        var $promptDlg;
        var okFunc = function (cleanup) {
            var sf = function () {
                window.userPreferences.reset();
                $promptDlg.dialog("close");
                $dlg.dialog("close");
            };
            var ff = function (j, s, errorThrown) {
                ErrorHandler.popUpMessage(errorThrown);
            };
            var userProxy = new UserServiceProxy();
            userProxy.DeleteAllPreferences(sf, ff);
        };
        var cancelFunc = function (cleanup) {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            Utility.executeCallback(cleanup);
        };
        var diagOpts = {
            modal: true,
            resizable: false,
            autoOpen: false,
            width: 250,
            height: 150
        };
        $promptDlg = DialogsUtil.generalPromptDialog(Constants.c.confirmUserPreferenceReset, okFunc, cancelFunc, diagOpts);
        $promptDlg.dialog('open');
    },
    setupQuickSavedSearches: function () {
        var that = this;
        var i = 0;
        var val;
        if ($(window).width() <= parseInt($('body').css('min-width'), 10)) {
            $('#qtext').width(215);
            $('#qs_suggested').width(215);
        }
        else {
            $('#qtext').width(235);
            $('#qs_suggested').width(235);
        }
        if (window.savedSearches && window.savedSearches.length > 0) {
            // Fill out the saved search dropdown, which is used for selecting a saved search only
            var $savedSearchListSel = $('#qs .buttonOptions .savedSearchList');
            $('#qs .savedSearchSelection').show();
            var length = window.savedSearches.length;
            $savedSearchListSel.empty();
            $savedSearchListSel.append($('<option></option>'));
            for (i = 0; i < length; i++) {
                var savedSearch = window.savedSearches.at(i);
                $savedSearchListSel.append($('<option></option>').attr('id', savedSearch.get('Id')).text(savedSearch.get('Name')));
            }
            Page.setupSavedSearchCombo($savedSearchListSel);
        }
        $('#qs').show();
        // To have tab in quick search box append the selected item to the search box and re-suggest
        $('#qtext').bind('keydown', function (event) {
            if (event.which === 9) {
                event.preventDefault();
                val = $('#qs_suggested').find('.selected').text();
                if (val) {
                    $('#qtext').val(val);
                    VocabUtil.vocabTimer($('#qtext').val(), '#qs_suggested', true);
                }
                else {
                    $('#qtext').val($('#qtext').val());
                }
                return false;
            }
        });
        $('#qtext').keyup(function (event) {
            var suggSelector = '#qs_suggested';
            if (event.which === 27) {
                $(suggSelector).hide();
                return false;
            }
            var resetTimer = true;
            var opts = { event: event, inputSelector: '#qtext', buttonSelector: '#qsbutton', length: that.suggLength };
            that.prevSuggLength = that.suggLength;
            that.suggLength = KeyboardNavUtil.arrowNav($(suggSelector), opts);
            if (event.which === 13) {
                clearTimeout($(suggSelector).data('timeout'));
            } else if (that.prevSuggLength === that.suggLength) {
                VocabUtil.vocabTimer($('#qtext').val(), suggSelector, resetTimer);
            }
        });
        $('#qsbutton').click(function () {
            SearchUtil.performQS();
        });
        $('#qs_suggested').delegate('li', 'mousedown', function (event) {
            if ($(this).hasClass('ignore')) {
                return;
            }
            $('#qtext').val('');
            $('#qtext').focus();
            $('#qtext').val(event.currentTarget.textContent);
            $('#qs_suggested').hide();
            $('#qsbutton').trigger('click');

        });
        $('#qs').on('click', '.savedSearchSelection', function () {
            var $buttonOptsSel = $('#qs .buttonOptions');
            if ($buttonOptsSel.is(':visible')) {
                $buttonOptsSel.fadeOut();
            }
            else {
                $buttonOptsSel.show();
                $buttonOptsSel.find('.isCombo').focus();
                $buttonOptsSel.find('.isCombo').autocomplete('search', '');
            }
            $(".ui-autocomplete").css('z-Index', 99999);
        });
        $('body').on('click', function (ev) {
            var $targ = $(ev.target);
            if ($('#qs .savedSearchSelection').find($targ).length === 0 && !$targ.hasClass('.savedSearchSelection') && $('#qs .ui-combobox').find($targ).length === 0) {
                var $buttonOptsSel = $('#qs .buttonOptions');
                if ($buttonOptsSel.is(':visible')) {
                    $buttonOptsSel.find('.isCombo').blur();
                    $buttonOptsSel.fadeOut();
                }
            }
        });
        $('#qtext').blur(function (event) {
            that.suggLength = -1;
            $('#qs_suggested').hide();
        });
        $('#qtext').focus(function (event) {
            if ($.trim($('#qtext').val()) !== '') {
                VocabUtil.getVocab($('#qtext').val(), '#qs_suggested');
            }
            var length = $('#qs_suggested li').length;
            for (i = 0; i < length; i++) {
                if ($('#qs_suggested li')[i] && $($('#qs_suggested li')[i]).hasClass('selected')) {
                    $($('#qs_suggested li')[i]).removeClass('selected');
                }
            }
        });
    },
    setupSavedSearchCombo: function (savedSearchListSel) {
        $(savedSearchListSel).combobox({
            onSelect: function (data) {
                var id = $(savedSearchListSel).find(':selected').attr('id');
                Utility.navigate('Retrieve/SavedSearch/' + id, Page.routers.Retrieve, true, false);
                $('#qs .buttonOptions').fadeOut();
            }
        });
    },
    initLayout: function () {
        if ($(window).width() <= parseInt($('body').css('min-width'), 10) + 120) {
            $('#qtext').width(115);
        }
        else {
            $('#qtext').width(235);
        }
        $('ul.children').attr('tabindex', 1000);
        $('#main').show();
        $('#browse').show();
        $('#tabs').width($(window).width() - $('#browse').width());
        if ($('body').width() <= parseInt($('body').css('min-width'), 10) &&
                $('body').height() > parseInt($('body').css('min-height'), 10)) {
            $('#two_col').height($('body').height() - $('#header').outerHeight(true) - $('#col_border_top').outerHeight(true) - 12);
        }
        else if ($('body').height() <= parseInt($('body').css('min-height'), 10)) {
            $('#tabs').width($(window).width() - $('#browse').width());
            $('#tab_panel_container').width($('#tabs').width() - 5);
        }
        else if ($('body').width() <= parseInt($('body').css('min-width'), 10) &&
                $('body').height() <= parseInt($('body').css('min-height'), 10)) {
            $('#two_col').height($('body').height() - $('#header').outerHeight(true) - $('#col_border_top').outerHeight(true) - 29);
        }
        else {
            $('#two_col').css('height', '100%');
        }
        $('#browse').height($(window).height() - $('#header').height() - $('#col_border_top').outerHeight() - $('#browse').outerHeight() + $('#browse').height());
        $('#tab_panel_container').css('min-width',
            -($('#tab_panel_container').outerWidth(true) - $('#tab_panel_container').width()) -
            $('#browse').width() + parseInt($('body').css('min-width'), 10)
        );
        setTimeout(function () {
            ShowHidePanel.resize();
        }, 5);
    },
    setupNavTooltips: function () {
        // Setup tooltips for the jstree context menu
        //TODO: scain set local variables to reused selectors
        $('#vakata-contextmenu').hover(function (event) {
            if ($('#vakata-contextmenu li a[rel="createItem"]').text() === Constants.c.createInbox) {
                // If user doesn't have permission certain context menu options insufficient permissions will be displayed
                if ($('#vakata-contextmenu li a[rel="createItem"]').text() === Constants.c.createInbox) {
                    if ($('#vakata-contextmenu li a[rel="createItem"]').parent().hasClass('jstree-contextmenu-disabled') === true) {
                        $('#vakata-contextmenu a[rel="createItem"]').attr('title', Constants.c.insufficientPermissions);
                    }
                    else {
                        $('#vakata-contextmenu a[rel="createItem"]').attr('title', Constants.c.createInboxMsg);
                    }
                }
                if ($('#vakata-contextmenu li a[rel="securityItem"]').text() === Constants.c.changeSecurity) {
                    if ($('#vakata-contextmenu li a[rel="securityItem"]').parent().hasClass('jstree-contextmenu-disabled') === true) {
                        $('#vakata-contextmenu a[rel="securityItem"]').attr('title', Constants.c.insufficientPermissions);
                    }
                    else {
                        $('#vakata-contextmenu a[rel="securityItem"]').attr('title', Constants.c.changeInboxSecurityMsg);
                    }
                }
                if ($('#vakata-contextmenu li a[rel="renameItem"]').text() === Constants.c.renameInbox) {
                    if ($('#vakata-contextmenu li a[rel="renameItem"]').parent().hasClass('jstree-contextmenu-disabled') === true) {
                        $('#vakata-contextmenu a[rel="renameItem"]').attr('title', Constants.c.insufficientPermissions);
                    }
                    else {
                        $('#vakata-contextmenu a[rel="renameItem"]').attr('title', Constants.c.renameInboxMsg);
                    }
                }
                if ($('#vakata-contextmenu li a[rel="deleteItem"]').text() === Constants.c.deleteInbox) {
                    if ($('#vakata-contextmenu li a[rel="deleteItem"]').parent().hasClass('jstree-contextmenu-disabled') === true) {
                        $('#vakata-contextmenu a[rel="deleteItem"]').attr('title', Constants.c.insufficientPermissions);
                    }
                    else {
                        $('#vakata-contextmenu a[rel="deleteItem"]').attr('title', Constants.c.deleteAInbox);
                    }
                }
            }
            else {
                // If user doesn't have permission certain context menu options insufficient permissions will be displayed
                if ($('#vakata-contextmenu li a[rel="createItem"]').text() === Constants.c.createFolder) {
                    if ($('#vakata-contextmenu li a[rel="createItem"]').parent().hasClass('jstree-contextmenu-disabled') === true) {
                        $('#vakata-contextmenu a[rel="createItem"]').attr('title', Constants.c.insufficientPermissions);
                    }
                    else {
                        $('#vakata-contextmenu a[rel="createItem"]').attr('title', Constants.c.createFolderMsg);
                    }
                }
                if ($('#vakata-contextmenu li a[rel="securityItem"]').text() === Constants.c.changeSecurity) {
                    if ($('#vakata-contextmenu li a[rel="securityItem"]').parent().hasClass('jstree-contextmenu-disabled') === true) {
                        $('#vakata-contextmenu a[rel="securityItem"]').attr('title', Constants.c.insufficientPermissions);
                    }
                    else {
                        $('#vakata-contextmenu a[rel="securityItem"]').attr('title', Constants.c.changeFolderSecurityMsg);
                    }
                }
                if ($('#vakata-contextmenu li a[rel="renameItem"]').text() === Constants.c.renameFolder) {
                    if ($('#vakata-contextmenu li a[rel="renameItem"]').parent().hasClass('jstree-contextmenu-disabled') === true) {
                        $('#vakata-contextmenu a[rel="renameItem"]').attr('title', Constants.c.insufficientPermissions);
                    }
                    else {
                        $('#vakata-contextmenu a[rel="renameItem"]').attr('title', Constants.c.renameFolderMsg);
                    }
                }
                if ($('#vakata-contextmenu li a[rel="deleteItem"]').text() === Constants.c.deleteFolder) {
                    if ($('#vakata-contextmenu li a[rel="deleteItem"]').parent().hasClass('jstree-contextmenu-disabled') === true) {
                        $('#vakata-contextmenu a[rel="deleteItem"]').attr('title', Constants.c.insufficientPermissions);
                    }
                    else {
                        $('#vakata-contextmenu a[rel="deleteItem"]').attr('title', Constants.c.deleteAFolder);
                    }
                }
            }
        });
    },
    setupCollections: function () {
        Page.setupInstanceBulkData();
        if (!window.isGuest) {
            Page.setupHostBulkData();
        }
    },
    setupInstanceBulkData: function () {
        var bulkData = $('#bulkData').val();

        var data = {};
        var result = {};
        if (bulkData) {
            data = JSON.parse(bulkData);
        }
        if (data && !$.isEmptyObject(data)) {
            result = data.Result;
        }
        if (result && $.isEmptyObject(result)) {
            ErrorHandler.addErrors(Constants.c.noDataReturnedFromServer);
            return;
        }
        // Slim Data
        var slimInboxes = {};
        slimInboxes.status = "ok";
        slimInboxes.result = result.Inboxes;
        var slimSecurityClasses = {};
        slimSecurityClasses.status = "ok";
        slimSecurityClasses.result = result.SecurityClasses;
        var slimRecCats = {};
        slimRecCats.status = "ok";
        slimRecCats.result = result.RecordCategories;
        var slimRoles = {};
        slimRoles.status = "ok";
        slimRoles.result = result.Roles;
        var slimWorkflows = result.Workflows;
        var slimFreezes = {};
        slimFreezes.status = 'ok';
        slimFreezes.result = result.Freezes;
        var folders = {};
        folders.status = 'ok';
        folders.result = result.RootFolders;
        var slimFormTemplates = {};
        slimFormTemplates.status = 'ok';
        slimFormTemplates.result = result.FormTemplates;
        if (!window.slimInboxes || window.slimInboxes.length <= 0) {
            window.slimInboxes = new SlimEntities();
        }
        if (!window.slimSecurityClasses || window.slimSecurityClasses.length <= 0) {
            window.slimSecurityClasses = new SlimEntities();
        }
        if (!window.slimRecordCategories || window.slimRecordCategories.length <= 0) {
            window.slimRecordCategories = new SlimEntities();
        }
        if (!window.slimRoles || window.slimRoles.length <= 0) {
            window.slimRoles = new SlimRoles();
        }
        if (!window.slimFreezes || window.slimFreezes.length <= 0) {
            window.slimFreezes = new SlimEntities();
        }
        if (!window.slimWorkflows || window.slimWorkflows.length <= 0) {
            window.slimWorkflows = new SlimEntities();
        }
        if (!window.folders || window.folders.length <= 0) {
            window.folders = new Folders();
        }
        if (!window.slimFormTemplates || window.slimFormTemplates.length === 0) {
            window.slimFormTemplates = new SlimFormTemplates();
        }

        window.slimInboxes.reset(window.slimInboxes.parse(slimInboxes), { silent: true });
        window.slimSecurityClasses.reset(window.slimSecurityClasses.parse(slimSecurityClasses), { silent: true });
        window.slimRecordCategories.reset(window.slimRecordCategories.parse(slimRecCats), { silent: true });
        window.slimRoles.reset(window.slimRoles.parse(slimRoles), { silent: true });
        window.slimWorkflows.reset(window.slimWorkflows.parse(slimWorkflows), { silent: true });
        window.slimFreezes.reset(window.slimFreezes.parse(slimFreezes), { silent: true });
        window.folders.reset(window.folders.parse(folders), { silent: true });
        window.slimFormTemplates.reset(window.slimFormTemplates.parse(slimFormTemplates), { silent: true });
        // Non-slim data
        var users = {};
        users.status = "ok";
        users.result = result.Users;
        var databaseFields = {};
        databaseFields.status = "ok";
        databaseFields.result = result.Fields;
        var customFields = {};
        customFields.status = "ok";
        customFields.result = result.CustomFields;
        var contentTypes = {};
        contentTypes.status = "ok";
        contentTypes.result = result.ContentTypes;
        var scanSettings = {};
        scanSettings.status = "ok";
        scanSettings.result = result.ScanSettings;
        var savedSearches = {};
        savedSearches.status = "ok";
        savedSearches.result = result.SavedSearches;
        var customFieldGroupPackages = {};
        customFieldGroupPackages.status = "ok";
        customFieldGroupPackages.result = result.CustomFieldGroupPackages;
        if (!window.users || window.users.length <= 0) {
            window.users = new Users();
        }
        if (!window.databaseFields || window.databaseFields.length <= 0) {
            window.databaseFields = new DatabaseFields(databaseFields);
        }
        if (!window.customFieldMetas || window.customFieldMetas.length <= 0) {
            window.customFieldMetas = new CustomFieldMetas();
        }
        if (!window.formElements || window.formElements.length <= 0) {
            window.formElements = new FormElements();
        }
        if (!window.contentTypes || window.contentTypes.length <= 0) {
            window.contentTypes = new ContentTypes();
        }
        if (!window.scanSettings || window.scanSettings.length <= 0) {
            window.scanSettings = new ScanSettings();
        }
        if (!window.savedSearches || window.savedSearches.length <= 0) {
            window.savedSearches = new SavedSearches();
        }
        if (!window.customFieldMetaGroupPackages || window.customFieldMetaGroupPackages.length <= 0) {
            window.customFieldMetaGroupPackages = new CustomFieldMetaGroupPackages();
        }
        window.users.reset(window.users.parse(users), { silent: true });
        window.databaseFields.reset(window.databaseFields.parse(databaseFields), { silent: true });
        window.customFieldMetas.reset(window.customFieldMetas.parse(customFields), { silent: true });
        window.contentTypes.reset(window.contentTypes.parse(contentTypes));
        if (!window.isGuest) {
            window.scanSettings.reset(window.scanSettings.parse(scanSettings));
            window.savedSearches.reset(window.savedSearches.parse(savedSearches));
        }
        window.customFieldMetaGroupPackages.reset(window.customFieldMetaGroupPackages.parse(customFieldGroupPackages), { silent: true });
        window.clientServiceInstallUri = result.ClientServiceURI;
        window.serverClientVersion = result.ServerClientVersion;
        //$('#bulkData').val('');
    },
    setupHostBulkData: function () {
        var bulkData = $('#hostBulkData').val();
        var data = {};
        var result = {};
        if (bulkData) {
            data = JSON.parse(bulkData);
        }
        if (data && !$.isEmptyObject(data)) {
            result = data.Result;
        }
        if (result && $.isEmptyObject(result)) {
            ErrorHandler.addErrors(Constants.c.noDataReturnedFromServer);
            return;
        }
        var companies = {};
        companies.status = 'ok';
        companies.result = result.UserCompanyInstances;
        if (!window.companies || window.companies.length <= 0) {
            window.companies = new Companies();
        }
        window.companies.reset(window.companies.parse(companies), { silent: true });

        // Setup User Preferences
        var userPrefs = {};
        userPrefs.status = 'ok';
        userPrefs.result = Utility.keyValueObjectToArray(result.UserSettings);
        if (!window.userPreferences || window.userPreferences.length <= 0) {
            window.userPreferences = new UserPreferences();
        }
        window.userPreferences.reset(window.userPreferences.parse(userPrefs), { silent: true });

        //Obtain watches - they exist as part of user preferences, so they need to be obtained after setting user preferences
        window.watches = new Watches();
        window.watches.fetch();
        ClientService.setReportRunner(result.ReportRunner);
    },
    navigateToRetrieveTab: function () {
        // This is so an inbox/folder navigation will be properly navigated to
        // If viewing the retrieve tab with the search results, don't navigate
        // If viewing the retrieve tab's main viewer, navigate
        var onRetrieve = window.location.hash.match(/#Retrieve/ig) && !window.location.hash.match(/#Retrieve\/view/ig);
        Utility.navigate('Retrieve', Page.routers.Retrieve, !onRetrieve);
    },
    setupInboxes: function () {
        var inbox_data = {};
        var depth;
        var i;
        var inbox_str = $('#inboxData').val();
        if (inbox_str !== undefined && inbox_str !== null && inbox_str.length > 0) {
            inbox_data = JSON.parse($("#inboxData").val());
        }
        $('#inbox_list').containers('inboxList', inbox_data).bind("select_node.jstree", function (event, data) {
            $('#folder_list').jstree('deselect_all');
            $('#workflow_tree').jstree('deselect_all');
            $('#approval_tree').jstree('deselect_all');
            $('#alerts_tree').jstree('deselect_all');
            var inboxId;
            var containerName;
            if ($(data.rslt.obj).attr('Id') !== 'Root') {
                containerName = $(data.rslt.obj).attr('Title');
                inboxId = $(data.rslt.obj).attr('Id').replace('jstree-', '');
            }
            else {
                containerName = $(data.rslt.obj).attr('Title');
                inboxId = Constants.c.emptyGuid;
            }
            Page.navigateToRetrieveTab();

            $('body').trigger('searchInContainer', [{ InboxId: inboxId, ContainerName: containerName, IncludeInboxes: true, IncludeFolders: false }]);
            ShowHideUtil.hideAccordions();
        });
        $("#inboxData").val("");
        $('#slimInboxData').val('');
        $('#inbox_list').bind('open_node.jstree close_node.jstree', function () {
            if ($('#inbox_list #Root').hasClass('jstree-closed')) {
                $('#inbox_list').animate({
                    height: 19 + 'px'
                }, 0);
            }
            else {
                $('#inbox_list').animate({
                    height: $('#inbox_list').height('100%') + 'px'
                }, 0);
            }
            var length = $('#inbox_list #Root ul li a').length;
            depth = $('#folder_list #Root ul').parents('*').not('.jstree-closed,.jstree-last').length - 8;
            var width = 0;
            for (i = 0; i < length; i++) {
                if (width < $($('#inbox_list #Root ul li a')[i]).width()) {
                    width = $($('#inbox_list #Root ul li a')[i]).width() + 40 * depth;
                }
            }
        });
        $('#inbox_list').bind('after_open.jstree', function () {
            $('#inbox_list_scroll').perfectScrollbar('update');
        });
        $('#inbox_list').bind('after_close.jstree', function () {
            var length = $('#inbox_list #Root ul li a').length;
            depth = $('#folder_list #Root ul').parents('*').not('.jstree-closed,.jstree-last').length - 8;
            var width = 0;
            for (i = 0; i < length; i++) {
                if (width < $($('#inbox_list #Root ul li a')[i]).width()) {
                    width = $($('#inbox_list #Root ul li a')[i]).width() + 40 * depth;
                }
            }
            $('#folder_list_scroll').perfectScrollbar('update');
        });
        $('#inbox_list').bind('loaded.jstree', function () {
            if ($('#inbox_list ul').height() >= parseInt($('#inbox_list').css('max-height'), 10)) {
                $('#inbox_list').height(parseInt($('#inbox_list').css('max-height'), 10));
            }
            else {
                $('#inbox_list').height('100%');
            }
            var length = $('#inbox_list #Root ul li a').length;
            var width = 0;
            for (i = 0; i < length; i++) {
                if (width < $($('#inbox_list #Root ul li a')[i]).width()) {
                    width = $($('#inbox_list #Root ul li a')[i]).width() + 40;
                }
            }
        });
        $("#inbox_list").bind("rename.jstree", function (e, data) {
            var contents = $(data.rslt.obj).children("a").contents();
            contents[contents.length - 1].nodeValue = $.trim(data.rslt.new_name);
        });
    },
    setupFolders: function () {
        var folder_data = {};
        var depth;
        var length = 0;
        var width = 0;
        var i = 0;
        var folder_str = $('#folderData').val();
        if (folder_str !== undefined && folder_str !== null && folder_str.length > 0) {
            folder_data = JSON.parse($('#folderData').val());
        }
        $('#folder_list').containers('folderList', folder_data).bind("select_node.jstree", function (event, data) {
            $('#inbox_list').jstree('deselect_all');
            $('#workflow_tree').jstree('deselect_all');
            $('#approval_tree').jstree('deselect_all');
            $('#alerts_tree').jstree('deselect_all');
            var folderId;
            var containerName;
            if ($(data.rslt.obj).attr('Id') !== 'Root') {
                containerName = $(data.rslt.obj).attr('Title');
                folderId = $(data.rslt.obj).attr('Id').replace('jstree-', '');
            }
            else {
                // Currently don't search through root
                containerName = $(data.rslt.obj).attr('Title');
                folderId = Constants.c.emptyGuid;
            }
            Page.navigateToRetrieveTab();
            $('body').trigger('searchInContainer', [{ FolderId: folderId, ContainerName: containerName, IncludeFolders: true, IncludeInboxes: false }]);
            ShowHideUtil.hideAccordions();
        });
        $('#folder_list').bind('open_node.jstree close_node.jstree', function () {
            if ($('#folder_list #Root').hasClass('jstree-closed')) {
                $('#folder_list').animate({
                    height: 19 + 'px'
                }, 50);
            }
            else {
                $('#folder_list').animate({
                    height: $('#folder_list').height('100%') + 'px'
                }, 0);
            }
            length = $('#folder_list #Root ul li').length;
            depth = $('#folder_list #Root ul').parents('*').not('.jstree-closed,.jstree-last').length - 8;
            width = 0;
            i = 0;
            for (i = 0; i < length; i++) {
                if (width < $($('#folder_list #Root ul li a')[i]).width()) {
                    width = $($('#folder_list #Root ul li a')[i]).width() + 40 * depth;
                }
            }
        });
        $('#folder_list').bind('after_open.jstree', function (event, data) {
            $('#folder_list_scroll').perfectScrollbar('update');
            length = $('#folder_list #Root ul li').length;
            depth = $('#folder_list #Root ul').parents('*').not('.jstree-closed,.jstree-last').length - 8;
            width = 0;
            i = 0;
            for (i = 0; i < length; i++) {
                if (width < $($('#folder_list #Root ul li a')[i]).width()) {
                    width = $($('#folder_list #Root ul li a')[i]).width() + 40 * depth;
                }
            }
        });
        $('#folder_list').bind('after_close.jstree', function (event, data) {
            length = $('#folder_list #Root ul li').length;
            depth = $('#folder_list #Root ul').parents('*').not('.jstree-closed,.jstree-last').length - 8;
            width = 0;
            i = 0;
            for (i = 0; i < length; i++) {
                if (width < $($('#folder_list #Root ul li a')[i]).width()) {
                    width = $($('#folder_list #Root ul li a')[i]).width() + 40 * depth;
                }
            }
            $('#folder_list_scroll').perfectScrollbar('update');
        });
        $('#folder_list').bind('loaded.jstree', function () {
            if ($('#folder_list ul').height() > parseInt($('#folder_list').css('max-height'), 10)) {
                $('#folder_list').height(parseInt($('#folder_list').css('max-height'), 10));
            }
            else {
                $('#folder_list').height('100%');
            }
            length = $('#folder_list #Root ul li').length;
            width = 0;
            for (i = 0; i < length; i++) {
                if (width < $($('#folder_list #Root ul li a')[i]).width()) {
                    width = $($('#folder_list #Root ul li a')[i]).width() + 40;
                }
            }
            $('#folder_list_scroll').perfectScrollbar('update');
        });
        $("#folder_list").bind("rename.jstree", function (e, data) {
            var contents = $(data.rslt.obj).children("a").contents();
            contents[contents.length - 1].nodeValue = $.trim(data.rslt.new_name);
        });
        $("#folderData").val("");
    },
    setupMyAlerts: function () {
        var options = {
            themes: {
                theme: "default",
                url: Constants.Url_Base + "Content/themes/default/style.css"
            }
        };
        $('#alerts_tree').jstree(options).bind("select_node.jstree", Page.alertsClick);
        $('#workflow_tree').jstree(options).bind("select_node.jstree", Page.alertsClick);
        $('#approval_tree').jstree(options).bind("select_node.jstree", Page.alertsClick);
    },
    alertsClick: function (event, data) {
        var name = $(data.rslt.obj).find('a').attr('id');
        var pdso = {};
        pdso.PredefinedSearch = Constants.pds.None; // No filter; search all documents
        var isMyAlerts = name === Constants.c.myAlerts;
        // Deselect navigation lists
        $('#folder_list').jstree('deselect_all');
        $('#inbox_list').jstree('deselect_all');
        if (isMyAlerts) {
            $('#workflow_tree').jstree('deselect_all');
            $('#approval_tree').jstree('deselect_all');
        }
        else {
            $('#alerts_tree').jstree('deselect_all');
        }
        // Filter to Approvals
        if (name === Constants.c.myApprovals || isMyAlerts) {
            $('#workflow_tree').jstree('deselect_all');
            pdso.PredefinedSearch = pdso.PredefinedSearch | Constants.pds.MyApprovals;
            WorkflowUtil.markNewItemsViewed(false, true);
        }
        // Filter to workflows
        if (name === Constants.c.myWorkflows || isMyAlerts) {
            $('#approval_tree').jstree('deselect_all');
            pdso.PredefinedSearch = pdso.PredefinedSearch | Constants.pds.MyWorkflows;
            WorkflowUtil.markNewItemsViewed(true, false);
        }
        Page.navigateToRetrieveTab();
        $('body').trigger('searchInContainer', [pdso]);
    },
    setupCompanySwitcher: function () {
        var currentCompanyId = $('#companySelect option:selected').data("companyid");
        var changeCompany = function (id) {
            //if already in own company do not change companies
            if (currentCompanyId === id) {
                return;
            }
            $.ajax({
                url: Constants.Url_Base + "Home/Instance",
                data: JSON.stringify({ id: id }),
                type: "POST",
                async: false,
                contentType: "application/json",
                success: function (result) {
                    if (result.status === 'ok') {
                        // Prevent invalid urls on switching: Retrieve and Workflow
                        if (window.location.hash.match(/#Retrieve/ig)) {
                            Backbone.history.navigate('#Retrieve');
                        } else if (window.location.hash.match(/#Workflow/ig)) {
                            Backbone.history.navigate('#Workflow');
                        }
                        window.location.reload(true);
                    }
                    else {
                        if (!result.message.match("NetworkError: A network error occurred.")) {
                            ErrorHandler.addErrors(result.message);
                        }
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    if (!errorThrown.Message.match("NetworkError: A network error occurred.")) {
                        ErrorHandler.popUpMessage(errorThrown);
                    }
                }
            });
        };
        $("#companySelect").combobox();
        $('#companyList .isCombo').autocomplete({
            select: function (event, ui) {
                var id = ui.item.option.value;
                changeCompany(id);
            },
            change: function (event, ui) {
                if (ui.item) {
                    var id = ui.item.option.value;
                    changeCompany(id);
                }
            }
        });
        var os = navigator.userAgent;
        if (os.indexOf('Android') !== -1) {
            $(".ui-autocomplete").removeClass('ui-autocomplete');
        }
        $('#companyList input').on('focus', function (e) {
            e.target.select();
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        $('#dropdown').hover(
            function (e) {
                //change the background of parent menu				
                $('#dropdown li span.parent').addClass('hover');
                // display email workflow designer if: workflow tab, workflow designer, or document meta panel's workflow accordion are showing
                if ($('#wf_acc_title').is(':visible') || $('#workflow_tab_panel').hasClass('show_tabs') || $('#wf_designer_container').is(':visible')) {
                    $('#dropdown').find('#emailWorkflowDesigner').show();
                }
                else {
                    $('#dropdown').find('#emailWorkflowDesigner').hide();
                }
                //display the submenu
                $('#dropdown ul.children').show();
                ShowHideUtil.toggleNativeViewer(true);
            },
            function (e) {
                var instanceList = $('#instanceList'),
                position = instanceList.offset();
                var xPos = e.clientX;
                var yPos = e.clientY;
                var dropDownWidth = instanceList.width();
                var dropDownHeight = instanceList.height();
                if (xPos < position.left || xPos > position.left + dropDownWidth || yPos < position.top || yPos > position.top + dropDownHeight) {
                    //change the background of parent menu
                    $('#dropdown li span.parent').removeClass('hover');
                    //display the submenu
                    $('#dropdown ul.children').hide();
                    ShowHideUtil.toggleNativeViewer(false);
                    $('#dropdown_vert_scroll').hide();
                    $('#dropdown ul.children').scrollTop(0);
                    $('.ui-autocomplete').hide();
                }
            }
        );
    },
    applyEventHandler: function () {
        var that = this;
        $(window).bind('beforeunload', function (ev, a) {    // Prompt a user if there are any unsaved changes on a page reload, to either leave the page or stay where they are
            var event = $.Event('getDirty');
            $('body').trigger(event);
            if (event.result) {
                return Constants.c.unsavedChangesAlert;
            }
        });

        $('body').delegate('.dropdown', 'mouseleave', function (e) {
            $('body').data('view_actions_timer', new Date());
            if ($(e.currentTarget).find('.children').css('display') !== 'none') {
                ShowHideUtil.menuTimer();
            }
        });
        $('body').delegate('.dropdown .children', 'mouseenter', function (e) {
            ShowHideUtil.menuTimer(true);
        });
        $('body').keyup(function (e) {
            Backbone.trigger('customGlobalEvents:keyup', e);
        });
        // This needs to be bound here, otherwise we can't prevent the backspace default behavior, when attempting to delete an annotation/redaction
        $('body').keydown(function (e) {
            Backbone.trigger('customGlobalEvents:keydown', e);
            var selectedAnno = $(e.currentTarget).find('.selectedAnno, .redaction.selected');
            if (selectedAnno.length > 0) {
                if (e.which === 8) {    // Prevent backspace from navigating
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        });
        // Dropdown text key events
        $('body').delegate('.dropdown', 'focus', function (event) {
            //Opens list action dropdowns in IE
            that.dropdownLength = -1;
            $('.children').hide();
            $(event.currentTarget).find('ul.children li').removeClass('selected');
            $(event.currentTarget).find('ul.children').show();
            if ($('.view_actions .children').is(':visible')) {
                ShowHideUtil.toggleNativeViewer(true); // Hide native viewer when children are shown
            }
            $(event.currentTarget).unbind('keyup');
            $(event.currentTarget).bind('keyup', function (e) {
                var opts = { event: e, dropdownTextSelector: $(e.currentTarget).find('.parent>span').first(), length: that.dropdownLength, letterNav: true };
                var $navObj = $(e.currentTarget).find('ul.children');
                that.dropdownLength = KeyboardNavUtil.arrowNav($navObj, opts);
                e.preventDefault();
            });
        });
        // Prevent user from being able to click around while the modal throbber container is visible
        $('.modalThrobberCont').mousedown(function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        $('.modalThrobberCont').mouseup(function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        $('.modalThrobberCont').click(function (e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        $('#admin_menu .contentTypeBuilder').on('click', '> span', function (ev) {
            var ctbView = new ContentTypeBuilderEditView({
                dialogOptions: {
                    position: {
                        my: 'left top',
                        at: 'right top',
                        of: $('#admin_menu .contentTypeBuilder').find('.gearIconSmall')
                    }
                },
                dialogCallbacks: {
                    saveCallback: function (cleanup) {
                        Utility.executeCallback(cleanup);
                    }
                }
            });
            ctbView.render();
        });
        $('#wfDesignerLink .popoutWfDesigner').click(function () { // Apply click event to allow popping out the workflow designer into another window/tab            
            window.open(Constants.Url_Base + 'WorkflowDesigner', 'WorkflowDesigner');
            //TODO: check dirty flag before popping out, open window to currently selected workflow
        });
        $('#workflow_selection').delegate('.workflow_dd', 'click',
            {
                dropdownSelector: '#workflow_selection .dropdown',
                parentSelector: '#workflow_selection',
                childHoverSelector: '.workflow_dd li span.parent',
                childShowHideSelector: '.workflow_dd ul.children'
            }, ShowHideUtil.showHideDropdownMenu);
        $('#workflow_selection').delegate('.workflow_dd li span.anchor', 'click',
        {
            dropdownSelector: '#workflow_selection .dropdown',
            containerSelector: '#workflow_selection',
            dropdownFieldTextSelector: '.workflow_dd .wf_dropdown_text'
        }, ShowHideUtil.setSelectedDropdownText);
        $('#pageOptionsDialog').delegate('.contentType', 'click',
            {
                dropdownSelector: '#pageOptionsDialog .dropdown',
                parentSelector: '#pageOptionsDialog',
                childHoverSelector: '.contentType li span.parent',
                childShowHideSelector: '.contentType ul.children'
            }, ShowHideUtil.showHideDropdownMenu);
        $('#pageOptionsDialog').delegate('.contentType li span.anchor', 'click',
        {
            dropdownSelector: '#pageOptionsDialog .dropdown',
            containerSelector: '#pageOptionsDialog',
            dropdownFieldTextSelector: '.contentType .contentTypeDDText'
        }, ShowHideUtil.setDropdownTextGeneric);
        $('body').on('click', '.accordion_title', function (event) {    // General click function for basic accordions (e.g. Workflow Accordions, Retrieve Accordions, Admin Accordions)
            var $targ = $(event.target);
            var $currTarg = $(event.currentTarget);
            if ($targ.hasClass('noAccordionEvent') || $currTarg.hasClass('noAccordionEvent')) {    // don't expand/collapse 
                return;
            }
            if ($('#workflow_layout').find($currTarg).length === 0) {
                // Is a general accordion
                ShowHideUtil.showHideAccordion(event);
            }
        });
        $('body').on('click', '.fsAccordion legend', function (event) {
            ShowHideUtil.toggleFieldset(event, true);
            ShowHidePanel.toggleAdminScrollbar();
        });
        $('#admin_menu').on('click', '#adminToggleBtn', function (event) {
            var menu = $('#admin_menu');
            var targ = $(event.currentTarget);
            if (menu.hasClass('collapsed')) {
                $('#admin_menu').removeClass('collapsed');
                targ.removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-n');
            }
            else {
                $('#admin_menu').addClass('collapsed');
                targ.removeClass('ui-icon-triangle-1-n').addClass('ui-icon-triangle-1-s');
            }
            ShowHidePanel.resizeAdminPage();
        });
        $('#sendDialog').on('click', '.generateLink', function (event) {
            EmailLinkUtil.setCopyLink();
        });
        $('#sendDialog').on('change', '.exportType input[type="radio"]', function (event) {
            var targ = $(event.currentTarget);
            Send.changeExportType(targ);
        });
        $('body').on('click', '.guidedHelpCapture', function () {
            GuidedHelp.displayClientPairingHelp(true);
        });
        $('body').on({
            mouseenter: function (ev) {
                $(ev.currentTarget).parent().addClass('ui-state-hover');
            },
            mouseleave: function (ev) {
                $(ev.currentTarget).parent().removeClass('ui-state-hover');
            }
        }, '.ui-dialog-titlebar .guidedHelpCapture');
        SecurityUtil.applyEventHandler();
    },
    setupScrollBars: function () {
        $('#inbox_list_scroll').perfectScrollbar({
            wheelSpeed: 20,
            wheelPropagation: true,
            minScrollbarLength: 20,
            useKeyboard: false,
            notInContainer: true
        });
        $('#inbox_list_scroll').hover(function () {
            $('#inbox_list_scroll').perfectScrollbar('update');
        });
        $('#folder_list_scroll').perfectScrollbar({
            wheelSpeed: 20,
            wheelPropagation: true,
            minScrollbarLength: 20,
            useKeyboard: false,
            notInContainer: true
        });
        $('#folder_list_scroll').hover(function () {
            $('#folder_list_scroll').perfectScrollbar('update');
        });
    },
    setupResizing: function () {
        ShowHidePanel.init('#browse', '#tabs', '#show_hide_panel');
        ShowHidePanel.slidePanel({
            left: '#browse',
            slide: '#show_hide_panel',
            minWidth: 15,
            maxWidth: ShowHidePanel.getMaxWidthFromMiddlePanelWidth($('.show_tabs .document_preview:visible'), 400),
            resize: function (event, ui, options) {
                var slide = options.slide;
                var minWidth = options.minWidth;
                var maxWidth = ShowHidePanel.getMaxWidthFromMiddlePanelWidth($('.show_tabs .document_preview:visible'), 400);
                $('#browse').resizable('option', 'maxWidth', maxWidth);
                $('#browse').css('height', ui.originalSize.height - 5);
                $('#tabs').css('min-width', 980 - $('#browse').width());
                $('#tabs').css('height', ui.originalSize.height - 5);
                if ($('.document_preview')) {
                    $('.document_preview').height($('#browse').height());
                }

                $('#tabs').width($(window).width() - $('#browse').width());
                $('#tab_panel_container').width($('#tabs').width() - 5);
                if ($('body').height() <= parseInt($('body').css('min-height'), 10)) {
                    $('#tabs').width($(window).width() - $('#browse').width());
                    $('#tab_panel_container').width($('#tabs').width() - 5);
                }
                ShowHidePanel.scrollChanges('#browse', minWidth);
                ShowHidePanel.slideChanges(slide, $('#browse').width() - 12, $('#browse').width() <= minWidth);
                ShowHidePanel.resizeNavScrollBars();
                ShowHidePanel.resizing = false;
                ShowHidePanel.resize();
            },
            start: function (event, ui, options) {
                $('body').css('overflow', 'hidden');
                $('body div.resizePageCover').show();
            },
            stop: function (event, ui, options) {
                var slide = options.slide;
                var minWidth = options.minWidth;
                ShowHidePanel.resizeNavScrollBars();
                ShowHidePanel.resizing = false;
                ShowHidePanel.resize();
                $('body div.resizePageCover').hide();
                $('body').css('overflow', 'visible');
                ShowHidePanel.saveInDbCollapse($('#browse').width() <= minWidth, slide);
                // Set a user preference for the navigation panel width.
                // TODO: implement for the folder/inbox navigation panel, currently only implemented for the reports navigation panel
                Utility.SetSingleUserPreference('navigationLayoutWidth', ui.size.width);
            }
        });
    },
    windowResizeEvent: function () {
        var that = this;
        $(window).resize(function (e) {
            //IE 8 Infinite Loop workaround. If any element on the page is resized that will fire a window.resize event. Since in this function we resize elements manually
            //this was causing an infinite loop.            
            // Check to see if the thing being resized is the window or a jquery ui resizable
            // If its a jquery ui resizable do nothing below
            var isUiResizable = e.target !== window && e.target !== document; // Detect elements to not trigger the resize event when resizing
            if (!that.recentlyResized && !isUiResizable) {
                that.recentlyResized = true;
                ShowHidePanel.init('#browse', '#tabs', '#show_hide_panel');
                var func = function () {
                    $('#admin_action').css('min-height', $('#admin_tab_panel').height() - $('#admin_menu').outerHeight(true));
                    ShowHidePanel.resize();
                    $('.ps-container').perfectScrollbar('update');
                    var bodyEvents = $._data($('body')[0], 'events');
                    if (bodyEvents) {
                        if (bodyEvents.windowResize) {
                            $('body').trigger('windowResize');
                        }
                    }
                };
                var clearFlag = function () {
                    that.recentlyResized = false;
                };
                if ($('body').width() <= parseInt($('body').css('min-width'), 10) &&
                $('body').height() > parseInt($('body').css('min-height'), 10)) {
                    $('#two_col').height($('body').height() - $('#header').outerHeight(true) - $('#col_border_top').outerHeight(true) - 12);
                }
                else if ($('body').width() <= parseInt($('body').css('min-width'), 10) &&
                        $('body').height() <= parseInt($('body').css('min-height'), 10)) {
                    $('#two_col').height($('body').height() - $('#header').outerHeight(true) - $('#col_border_top').outerHeight(true) - 29);
                }
                else if ($('body').height() <= parseInt($('body').css('min-height'), 10) + 10) {
                    $('#tabs').width($(window).width() - $('#browse').width());
                    $('#tab_panel_container').width($('#tabs').width() - 5);
                }
                else {
                    $('#two_col').css('height', '100%');
                    $('#tabs').width($(window).width() - $('#browse').width());
                    $('#tab_panel_container').width($('#tabs').width() - 5);
                }
                func();
                setTimeout(clearFlag, 10);
                $('body').focus();
            }
        });
    },
    showMsgs: function (str) {
        $('#system_messages').html(str);
        $('#system_messages').dialog({
            modal: true,
            title: Constants.t('systemMsgs'),
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
    },
    getSystemMessages: function () {
        return $('#systemMessages').val();
    },
    showTimeMsg: function () {
        var exp = $('#systemExpired');
        if (exp.val() === 'True') {
            Page.showMsgs(Constants.t('sysExpired'));
        }
    },
    refreshCollections: function (callback) {
        var proxy = BulkDataServiceProxy();
        var sf = function (result) {
            if (result && $.isEmptyObject(result)) {
                ErrorHandler.addErrors(Constants.c.noDataReturnedFromServer);
                return;
            }
            // Slim Data
            var slimInboxes = {};
            slimInboxes.status = "ok";
            slimInboxes.result = result.Inboxes;
            var slimSecurityClasses = {};
            slimSecurityClasses.status = "ok";
            slimSecurityClasses.result = result.SecurityClasses;
            var slimRecCats = {};
            slimRecCats.status = "ok";
            slimRecCats.result = result.RecordCategories;
            var slimRoles = {};
            slimRoles.status = "ok";
            slimRoles.result = result.Roles;
            var slimWorkflows = result.Workflows;
            var slimFreezes = {};
            slimFreezes.status = 'ok';
            slimFreezes.result = result.Freezes;
            var folders = {};
            folders.status = 'ok';
            folders.result = result.RootFolders;

            if (!window.slimInboxes || window.slimInboxes.length <= 0) {
                window.slimInboxes = new SlimEntities();
            }
            if (!window.slimSecurityClasses || window.slimSecurityClasses.length <= 0) {
                window.slimSecurityClasses = new SlimEntities();
            }
            if (!window.slimRecordCategories || window.slimRecordCategories.length <= 0) {
                window.slimRecordCategories = new SlimEntities();
            }
            if (!window.slimRoles || window.slimRoles.length <= 0) {
                window.slimRoles = new SlimRoles();
            }
            if (!window.slimFreezes || window.slimFreezes.length <= 0) {
                window.slimFreezes = new SlimEntities();
            }
            if (!window.slimWorkflows || window.slimWorkflows.length <= 0) {
                window.slimWorkflows = new SlimEntities();
            }
            if (!window.folders || window.folders.length <= 0) {
                window.folders = new Folders();
            }
            window.slimInboxes.reset(window.slimInboxes.parse(slimInboxes), { silent: true });
            window.slimSecurityClasses.reset(window.slimSecurityClasses.parse(slimSecurityClasses), { silent: true });
            window.slimRecordCategories.reset(window.slimRecordCategories.parse(slimRecCats), { silent: true });
            window.slimRoles.reset(window.slimRoles.parse(slimRoles), { silent: true });
            window.slimWorkflows.reset(window.slimWorkflows.parse(slimWorkflows), { silent: true });
            window.slimFreezes.reset(window.slimFreezes.parse(slimFreezes), { silent: true });
            window.folders.reset(window.folders.parse(folders), { silent: true });
            // Non-slim data
            var users = {};
            users.status = "ok";
            users.result = result.Users;
            var databaseFields = {};
            databaseFields.status = "ok";
            databaseFields.result = result.Fields;
            var customFields = {};
            customFields.status = "ok";
            customFields.result = result.CustomFields;
            var formElements = {};
            formElements.status = "ok";
            formElements.result = result.FormElements;
            var contentTypes = {};
            contentTypes.status = "ok";
            contentTypes.result = result.ContentTypes;
            if (!window.users || window.users.length <= 0) {
                window.users = new Users();
            }
            if (!window.databaseFields || window.databaseFields.length <= 0) {
                window.databaseFields = new DatabaseFields(databaseFields);
            }
            if (!window.customFieldMetas || window.customFieldMetas.length <= 0) {
                window.customFieldMetas = new CustomFieldMetas();
            }
            if (!window.contentTypes || window.contentTypes.length <= 0) {
                window.contentTypes = new ContentTypes();
            }
            if (!window.formElements || window.formElements.length <= 0) {
                window.formElements = new FormElements();
            }
            window.users.reset(window.users.parse(users), { silent: true });
            window.databaseFields.reset(window.databaseFields.parse(databaseFields), { silent: true });
            window.customFieldMetas.reset(window.customFieldMetas.parse(customFields), { silent: true });
            window.formElements.reset(window.formElements.parse(formElems), { silent: true });
            window.contentTypes.reset(window.contentTypes.parse(contentTypes));
            Page.setupInboxes();
            Page.setupFolders();
            if (callback) {
                callback();
            }
        };
        var ff = function (jqXHR, textStatus, bizEx) {
            ErrorHandler.addErrors(bizEx.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        };
        proxy.get(null, sf, ff);

    },
    onDatePickerClose: function (text) {
        if (text) {
            if (text.length > 5) {
                var timeOnly = new Date(text).format("hh:MM");
                this.value = timeOnly;
            }
        }
    },
    enableDisableWEDSFS: function (className) {
        $('#WEDSFS input').prop('disabled', className !== "MailDigest");
        Page.checkBlankValueWEDSFS();
    },
    checkBlankValueWEDSFS: function () {
        var wedsValue = Utility.GetUserPreference('WEDS');
        var wedsVal = Utility.tryParseJSON(wedsValue, true);
        var wedsDays = wedsVal ? wedsVal.Days : '1';
        var wedsTime = '00:00';
        if (wedsVal) {
            var date = JSON.parseWithDate(JSON.stringify(wedsVal.Time));
            if (DateUtil.isDate(date)) {
                wedsTime = wedsDays === '1' ? new Date(date).format('shortTime') : new Date(date).format('general');
            }
        }
        $('#WEDSFS input[name=Frequency]').val(wedsDays);
        $('#WEDSFS input[name=ExecutionTime]').val(wedsTime);

    },
    hookLogout: function () {
        $('#logout a').on('click', function () {
            $.cookie('useSSO', false, { expires: 1, path: '/', domain: Constants.ProxyCookieDomain }); //Don't go into a loop, explicit logouts should not automatically log you back in.
        });
    }
};

