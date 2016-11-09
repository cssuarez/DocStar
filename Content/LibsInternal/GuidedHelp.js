/// <reference path="Utility.js" />
var GuidedHelp = {
    /*
        Used for general display of guided help
        htmlData: data to display to user
        helpType: type of help to display, used as key for user preference
        overrideDisplayPreference: will override the preference of the user to still display the help
    */
    displayGuidedHelp: function (htmlData, helpType, overrideDisplayPreference, options) {
        var userPref = Utility.GetUserPreference('neverAgain_' + helpType);
        var neverDisplay = (Utility.convertToBool(userPref) || false) && !overrideDisplayPreference;
        if (neverDisplay) {
            return;
        }
        var $diagSel = $('#guidedHelp');
        $diagSel.find('.guidedHelpContents').html(htmlData);
        DialogsUtil.isDialogInstanceDestroyDialog($diagSel);
        $diagSel.dialog({
            minWidth: 850,
            width: 850,
            minHeight: 500,
            height: $(window).height() - 100,
            title: options && options.title ? options.title : '',
            buttons: [{
                text: Constants.c.close,
                click: function () {
                    $diagSel.dialog('close');
                }
            }],
            open: function () {
                var userPref = Utility.GetUserPreference('neverAgain_' + helpType);
                $diagSel.find('input[name="neverAgain"]').prop('checked', Utility.convertToBool(userPref) || false);
            },
            close: function () {
                // Set user preference for displaying guided help
                // Check to see if the do not show again option is checked
                var neverAgain = $diagSel.find('input[name="neverAgain"]').is(':checked');
                if (neverAgain) {
                    Utility.SetSingleUserPreference('neverAgain_' + helpType, true);
                }
                else {
                    Utility.SetSingleUserPreference('neverAgain_' + helpType, false);
                }
            }
        });
    },
    displayClientPairingHelp: function (overrideDisplay) {
        var menuTemplate = doT.template(Templates.get('guidedhelp_capture'));
        var htmlData = menuTemplate();
        var helpType = 'ClientPairing';
        var userPref = Utility.GetUserPreference('neverAgain_' + helpType);
        overrideDisplay = overrideDisplay || !((Utility.convertToBool(userPref) || false) || ClientService.isSystrayConnected());
        var options = {
            title: Constants.c.clientConnectionHelp
        };
        GuidedHelp.displayGuidedHelp(htmlData, helpType, overrideDisplay, options);
    }
};