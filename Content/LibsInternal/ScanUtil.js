/// <reference path="Utility.js" />
/// <reference path="ClientService.js" />
var ScanUtil = {
    showDialog: function (blkVwrMdl, pageNumber) {
        if (!ClientService.installed()) {
            ErrorHandler.displayGeneralDialogErrorPopup(Constants.c.clientServiceNotAvailable);
            return;
        }
        var info = blkVwrMdl.findPage(pageNumber);
        if (!info) {
            var msg = String.format(Constants.c.pageNotFound_T, pageNumber);
            ErrorHandler.displayGeneralDialogErrorPopup(msg);
            return;
        }
        var verId = blkVwrMdl.versionId();
        var scanDlg = $('#scan_dialog');
        DialogsUtil.generalDialog(scanDlg, {
            width: 550,
            minWidth: 550,
            height: 325,
            minHeight: 325,
            title: Constants.c.scan,
            buttons: [{
                text: Constants.c.scanAppend,
                click: function () {
                    ScanUtil.doClick(verId, 0, false, scanDlg);
                }
            },
            {
                text: Constants.c.scanInsert,
                click: function () {
                    ScanUtil.doClick(verId, pageNumber, false, scanDlg);
                }
            },
            {
                text: Constants.c.scanReplace,
                click: function () {
                    ScanUtil.doClick(verId, pageNumber, true, scanDlg);
                }
            },
            {
                text: Constants.c.close,
                click: function () {
                    $(scanDlg).dialog('close');
                }
            }],
            open: function () {
                $(scanDlg).find('.throbber').hide();
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                ScanUtil.setSettings(scanDlg);
                Utility.enableButtons([Constants.c.scanAppend, Constants.c.scanInsert, Constants.c.scanReplace]);
                ScanUtil.disableButtonsByPage(info);
            },
            close: function () {
                // Save these settings (and the scanner) in User preferences
                var settings = ScanUtil.getSettings();
                Utility.SetSingleUserPreference('scanAppendSettings', JSON.stringify(settings));
            }
        });
    },
    disableButtonsByPage: function (info) {
        // disable buttons based on page w/i its content item
        if (info.ciPages && info.ciPages.length > 1) {
            // any multipage content item cannot be replaced
            Utility.disableButton(Constants.c.scanReplace, Constants.c.cannotScanReplace);

            // insert allowed only before first page of multipage content item
            if (info.pageIdx > 0) {
                Utility.disableButton(Constants.c.scanInsert, Constants.c.cannotScanInsert);
            }

            // append is always allowed
        }
    },
    getSettings: function () {
        // reads settings from dialog
        var scanDlg = $('#scan_dialog');
        var settings = DTO.getDTO(scanDlg);
        return settings;
    },
    setSettings: function (selector) {        
        var $selector = $(selector);
        var scannersList = $selector.find('select[name="deviceId"]');
        ClientService.setDevicesSelect(scannersList);
        var settings = Utility.GetUserPreference('scanAppendSettings');
        var selectedItemId = Utility.GetUserPreference('selectedScanDevice') || '';
        if (settings) {
            settings = JSON.parse(settings);
            settings.deviceId = selectedItemId;
        }
        DTO.setDTO($selector, settings);
    },
    doClick: function (verId, beforePage, replacePage, selector) {
        // beforePage: page number of page beforewhich scan is inserted.  0 to append to end
        // replacePage: boolean; if true, the "beforePage" is deleted and pages are inserted in its place; ignored if beforePage = 0
        // NOTE: any attempt to insert within a content item will fail
        // Show throbber
        $(selector).find('.throbber').show();
        // Disable buttons
        Utility.disableButtons([Constants.c.scanAppend, Constants.c.scanInsert, Constants.c.scanReplace]);
        var settings = ScanUtil.getSettings();
        // these settings will be changed when the dialog closes
        ClientService.scanAppend(verId, settings.deviceId, settings, beforePage, replacePage);
    }
};