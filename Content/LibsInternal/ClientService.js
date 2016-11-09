/// <reference path="DialogsUtil.js" />
/// <reference path="../JSProxy/AdminServiceProxy.js" />
/// <reference path="Utility.js" />
var ClientService = {
    versionInfo: {},
    importDocs: null, //Reference to SimpleDocuments collection used by CaptureEditView and its subviews.
    progressDocs: null, //Reference to SimpleDocuments collection used by CaptureEditView and its subview CaptureProgressGridView.
    sysMaintProxy: null,
    browserConnectPackage: null,
    lastStatus: 0,
    send: null, // Send.js invocation holder
    // Pre-processing options, to be filled out with User Preference 'preProcessingOptions', or defaults if a user preference isn't found
    preProcessingOptions: {},
    // DocumentManifestItem Id, To know which events belong to which pre-processing grid item
    preProcessingSource: '',
    isScanning: false,  // Used to determine which action is being performed, importing or scanning
    capturePreviewer: {}, // CaptureViewerView instance for previewing documents in the capture tab
    previewSimpleDocId: '',  // Currently previewed simple document tid
    previewDictionary: {},  // Key: SimpleDocumentId, Value: [{Rotation: 0, 90, 180, 270, PreviewFileName: (string)}]
    previewMode: '', // Mode to preview capture documents (UserPreference - capturePreviewMode)
    scanDirectSimpleDoc: undefined, // An array of simpleDocuments representing documents importing using Direct Scan
    importDocuments: [],    // An array of rows being imported
    scanDirect: false,  // Used to determine if the last import was made using Direct Scan
    scanCompleted: false, // Used to determine when a scan has completed
    onScanAppend: false, // Used to determine when a scan ui event completed (Scan Append, Scan Insert, Scan Replae)
    systrayConnectionTimeoutTimer: '', // Timeout when connecting to a Systray
    failedConnection: '',   // Failed connection, test validation if user doesn't retry
    lastShowAllDevicesOption: null, // state of this user preferences last time GetAcquireData() was called; this determines if a new call is unnecessary
    progressData: {
        progressText: '',
        progressIndeterminate: '',
        progressValue: '',
        progressVisible: false
    },
    currentStatus: '', // Current connection status; Update connection status when the capture page is rendered
    connectionStatus: {
        Connecting: 0,
        Connected: 1,
        NoConnectionsAvailable: 2,
        NoConnectionSelected: 3,
        FailedConnecting: 4,
        Reconnecting: 5,
        Disconnected: 6,
        LostServerConnection: 7,
        VersionRequirements: 8
    },
    reportRunner: null,
    init: function () {
        this.scanDirectSimpleDoc = new SimpleDocuments();

        ClientService.sysMaintProxy = SystemMaintenanceServiceProxy();
        window.CompanyInstanceHubProxy.onBrowserSystrayConnected(ClientService.browserSystrayConnected);
        window.CompanyInstanceHubProxy.onSendProgressMessage(ClientService.sendProgressMessage);
        window.CompanyInstanceHubProxy.onSystrayConnect(ClientService.systrayConnect);
        window.CompanyInstanceHubProxy.onSendFileAcquired(ClientService.onSendFileAcquired);
        window.CompanyInstanceHubProxy.onMobileFileBrowseDataChange(ClientService.onMobileFileBrowseDataChange);

        ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.Connecting);
        $('body').on('click', 'span.systraySelection', function () {
            ClientService.systrayConnectionPrompt();
        });
        ClientService.handleSystrayConnections();
    },
    installed: function (userPref) {
        var installed = !!ClientService.browserConnectPackage;
        if (installed && userPref) {
            installed = Utility.GetUserPreference(userPref) !== "neverUseClient";
        }
        return installed;
    },
    hasBarcodeLicense: function () {
        var acquireData = ClientService.getAcquireDataHTML();
        return acquireData.Barcode1D || acquireData.Barcode2D;
    },
    fillVersionInfo: function () {
        try {
            var content = $('#slccobj')[0].content;
            //Try Catch Required as the test for content.ClientDetection will throw an exception in IE.
            if (content) {
                content.ClientDetection.GetClientVersionInfoCompleted = ClientService.fillVersionInfoCompleted;
                content.ClientDetection.GetClientVersionInfo();
            }
        }
        catch (ex) {
            Utility.OutputToConsole(ex);
        }
    },
    fillVersionInfoCompleted: function (s, a) {
        ClientService.versionInfo = JSON.parse(a.JSonString);
    },

    //#region Systray Connection Handling
    isSystrayConnected: function () {
        return ClientService.browserConnectPackage !== null && ClientService.currentStatus === ClientService.connectionStatus.Connected;
    },
    browserSystrayConnected: function (bCP) {
        clearTimeout(ClientService.systrayConnectionTimeoutTimer);   // Systray connected in alloted time
        delete ClientService.failedConnection;  // Clear failed connection

        if (bCP.Exception) {
            ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.FailedConnecting);
            ErrorHandler.addErrors(bCP.Exception.Message);
            return;
        }
        if (!ClientService.clientMeetsVersionRequirements(bCP)) {
            ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.VersionRequirements, bCP.ClientVersion);
            return;
        }
        ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.Connected);
        ClientService.browserConnectPackage = bCP;
        ClientService.getAcquireData();
    },
    clientMeetsVersionRequirements: function (bCP) {
        var result = false;
        if (!window.serverClientVersion) {
            result = true; //No version installed on the client, anything meets requirements. 
        }
        else if (window.serverClientVersion.Major === 0) {
            result = true; //No version installed on the client, anything meets requirements. 
        }
        else if (window.serverClientVersion.Major <= bCP.ClientVersion.Major) { //Check if the version connected is Greater then or equal to the version installed on the server.
            if (window.serverClientVersion.Major < bCP.ClientVersion.Major) {
                result = true;
            }
            else if (window.serverClientVersion.Minor <= bCP.ClientVersion.Minor) {
                if (window.serverClientVersion.Minor < bCP.ClientVersion.Minor) {
                    result = true;
                }
                else if (window.serverClientVersion.Build <= bCP.ClientVersion.Build) {
                    result = true;
                }
            }
        }

        return result;
    },
    getVersionString: function (astriaVersion) {
        if (!astriaVersion) {
            return 'v0.0.0';
        }
        return 'v' + astriaVersion.Major + '.' + astriaVersion.Minor + '.' + astriaVersion.Build;
    },
    systrayConnect: function (systrayConnection) {
        if (Page.currentUser.Id !== systrayConnection.UserId) {
            return;
        }
        ClientService.addSystrayConnection(systrayConnection);
        if (!ClientService.isSystrayConnected()) {
            ClientService.handleSystrayConnections();
        }
    },
    systrayConnectionTimeout: function () {
        // Systray Connection Timeout is in seconds (multiply by 1000 to make it milliseconds for setTimeout)
        clearTimeout(ClientService.systrayConnectionTimeoutTimer);
        ClientService.systrayConnectionTimeoutTimer = setTimeout(function () {
            // Systray has failed to connect in alloted time
            var conn = ClientService.getCurrentSystrayConnection();
            ClientService.failedConnection = conn;
            ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.FailedConnecting);
        }, parseInt(Utility.GetSystemPreferenceValue('signalrConnectionTimeout'), 10) * 1000);
    },
    handleSystrayConnections: function () {
        var systrayConnections = ClientService.getSystrayConnections();
        var length = systrayConnections.length;
        // If there are no systrayConnections (length === 0), display such to the user
        if (length === 0) {
            ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.NoConnectionsAvailable);
            return;
        }
        var upConn;
        var inKioskMode = !!window.kioskMachineId;
        if (inKioskMode) {
            var i = 0;
            var mid = window.kioskMachineId.toLowerCase();
            for (i; i < length; i++) {
                if (systrayConnections[i].MachineId.toLowerCase() === mid) {
                    upConn = systrayConnections[i];
                    Utility.SetSingleUserPreference('systrayConnection', JSON.stringify(upConn));
                }
            }
        } else {
            upConn = Utility.GetUserPreference('systrayConnection');
        }

        if (upConn && !upConn.MachineId) { //Only parse if it is a string.
            upConn = JSON.parse(upConn);
        }
        if (upConn) {
            if ($.isEmptyObject(upConn)) {
                ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.NoConnectionSelected);
                return;
            }
            // Attempt connection to the systray the user has previously selected
            var conn = ClientService.getSystrayConnection(upConn);
            if (conn && conn !== 'duplicatesFound') {
                ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.Connecting);
                window.CompanyInstanceHubProxy.browserConnectSystray(conn.ConnectionId);
                return;
            }
            ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.NoConnectionSelected);
        }
        if (!inKioskMode && length === 1) { // Automatically connect if there is a single systrayConnection (length === 1)
            Utility.SetSingleUserPreference('systrayConnection', JSON.stringify(systrayConnections[0]));
            if ($.isEmptyObject(systrayConnections[0])) {
                ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.NoConnectionSelected);
            }
            else {
                ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.Connecting);
            }
            window.CompanyInstanceHubProxy.browserConnectSystray(systrayConnections[0].ConnectionId);
        }
        else if (!inKioskMode && length > 1) {
            // Prompt User to select a connection if there is more than one connection to choose from (length > 1)
            ClientService.systrayConnectionPrompt();
        }
    },
    systrayConnectionPrompt: function (ev) {
        if (ev && ev.stopPropagation) {
            ev.stopPropagation();
        }
        var diagSel = '#systrayConnectionPrompt';
        var currConn = ClientService.getCurrentSystrayConnection();
        var options = {
            title: Constants.c.systrayConnection + ' <a class="ui-dialog-titlebar-help ui-corner-all"><span class="guidedHelpCapture ui-icon ui-icon-help" title="' + Constants.c.help + '"></span></a>',
            autoOpen: true,
            open: function () {
                var conn = ClientService.getSystrayConnection(currConn);
                if (conn === 'duplicatesFound' || $.isEmptyObject(conn)) {
                    // Unable to determine current systray to be selected from pool of available systrays
                    // Have a message to state the above
                    $(diagSel).find('span.connectionMessage').text(Constants.c.unableToDetermineSystray);
                }
                var divSel = $(diagSel).find('div');
                var menuTemplate = doT.template(Templates.get('systrayconnectionlayout'));
                var htmlData = menuTemplate(currConn);
                divSel.html(htmlData);
                $(diagSel).find('.guidedHelpCapture').hide(); // Will be displayed in the dialog's title bar next to the 'x' icon, 
            },
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    var $selectedConnection = $(diagSel).find('.systrayConnection :selected');
                    // No selection was truly made, so do nothing
                    if ($selectedConnection.val() === 'noSelection') {
                        $(diagSel).dialog('close');
                        return;
                    }
                    ClientService.removeExistingDocuments();
                    var selectedConnection = ClientService.transformSystrayConnectionData($selectedConnection);
                    if (ClientService.failedConnection && ClientService.failedConnection.ConnectionId !== selectedConnection.ConnectionId) {
                        // Send message to server to validate connection, if the user didn't choose to retry connection
                        ClientService.sysMaintProxy.testSignalRConnection(ClientService.failedConnection.ConnectionId);
                        delete ClientService.failedConnection;
                    }
                    else if (selectedConnection.ConnectionId) {
                        Utility.SetSingleUserPreference('systrayConnection', JSON.stringify(selectedConnection));
                        ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.Connecting);
                        window.CompanyInstanceHubProxy.browserConnectSystray(selectedConnection.ConnectionId);
                    }
                    else {
                        // No systray was selected don't attempt to connect, update connection status
                        Utility.SetSingleUserPreference('systrayConnection', JSON.stringify({}));
                        ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.NoConnectionSelected);
                    }
                    $(diagSel).dialog('close');
                }
            }, {
                text: Constants.c.disconnect,
                click: function () {
                    // No systray was selected don't attempt to connect, update connection status
                    ClientService.updateSystrayConnectionStatus(ClientService.connectionStatus.NoConnectionSelected);
                    ClientService.removeExistingDocuments();
                    $(diagSel).dialog('close');
                }
            }, {
                text: Constants.c.close,
                click: function () {
                    // Do nothing but close the dialog
                    $(diagSel).dialog('close');
                }
            }]
        };
        DialogsUtil.generalDialog(diagSel, options);
    },
    transformSystrayConnectionData: function ($selection) {
        var selVal = $selection.val();
        var selData = $selection.data();
        var systrayConnectionData = selVal === 'noSelection' ? '' : selData;
        var systrayConnection = '';
        if (systrayConnectionData) {
            if ($.isEmptyObject(systrayConnectionData)) {
                systrayConnection = {};
            }
            else {
                systrayConnection = {
                    ConnectionId: systrayConnectionData.connectionid,
                    MachineName: systrayConnectionData.machinename,
                    MachineId: systrayConnectionData.machineid,
                    IPAddress: systrayConnectionData.ipaddress,
                    UserId: systrayConnectionData.userid
                };
            }
        }
        if (!systrayConnection) {
            var pref = Utility.tryParseJSON(Utility.GetUserPreference('systrayConnection'));
            systrayConnection = pref || systrayConnection;
        }
        return systrayConnection;
    },
    getSystrayConnections: function () {
        var systrayConnections = $('#systrayConnections').val();
        if (systrayConnections) {
            systrayConnections = JSON.parse(systrayConnections);
        }
        else {
            systrayConnections = [];
        }
        return systrayConnections;
    },
    getCurrentSystrayConnection: function () {
        var connection = Utility.GetUserPreference('systrayConnection');
        if (connection) {
            connection = JSON.parse(connection);
        }
        else {
            connection = {};
        }
        return connection;
    },
    getSystrayConnection: function (connection) {
        if (!connection) {
            return;	// No connection passed in, so no connection will be found, return no results
        }
        var result = [];
        var conn = [];
        var systrayConnections = ClientService.getSystrayConnections();
        var i = 0;
        var length = systrayConnections.length;
        // Determine if there are duplicate machine names
        for (i; i < length; i++) {
            if (systrayConnections[i] && systrayConnections[i].MachineName === connection.MachineName) {
                conn.push(systrayConnections[i]);
            }
        }
        // No duplicates, return only connection found
        if (conn.length === 1) {
            return conn[0];
        }
        // If there are duplicate machine names, try to filter on IPAddress
        length = conn.length;
        for (i; i < length; i++) {
            if (conn[i] && conn[i].IPAddress === connection.IPAddress) {
                result.push(conn[i]);
            }
        }
        // No duplicates after filtering by IPAddress, return only connection found
        if (result.length === 1) {
            return result[0];
        }
        // Duplicates found
        return 'duplicatesFound';
    },
    addSystrayConnection: function (connection) {
        var systrayConnections = ClientService.getSystrayConnections();
        var i = 0, length = systrayConnections.length;
        var replaced = false;
        for (i; i < length; i++) {
            var sc = systrayConnections[i];
            if (sc.MachineId === connection.MachineId && sc.MachineName === connection.MachineName) {
                systrayConnections[i] = connection;
                replaced = true;
                break;
            }
        }
        if (!replaced) {
            systrayConnections.push(connection);
        }
        $('#systrayConnections').val(JSON.stringify(systrayConnections));
    },
    removeSystrayConnection: function (connectionId) {
        var systrayConnections = ClientService.getSystrayConnections();
        var i = 0;
        var length = systrayConnections.length;
        for (i; i < length; i++) {
            var connection = systrayConnections[i];
            if (connection && connection.ConnectionId === connectionId) {
                systrayConnections.splice(i, 1);
                break;
            }
        }
        $('#systrayConnections').val(JSON.stringify(systrayConnections));
    },
    systrayConnectionChanged: function (changedSystrayConn) { // Determine if user has changed their systray connection from their previous user preference
        var currSystrayConn = Utility.GetUserPreference('systrayConnection');
        if (currSystrayConn) {
            currSystrayConn = JSON.parse(currSystrayConn);
        }
        // Current systray connection exists, but systray being changed to doesn't
        if ((currSystrayConn && !$.isEmptyObject(currSystrayConn) && (!changedSystrayConn || $.isEmptyObject(changedSystrayConn)))) {
            return true;
        }
        // Current systray connection doesn't exist, but systray being changed to does
        if ((!currSystrayConn || $.isEmptyObject(currSystrayConn)) && changedSystrayConn && !$.isEmptyObject(changedSystrayConn)) {
            return true;
        }
        // Both current systray and systray being changed to, exist
        if ((currSystrayConn && !$.isEmptyObject(currSystrayConn)) && changedSystrayConn && !$.isEmptyObject(changedSystrayConn)) {
            // ConnectionId is the same; hasn't changed
            if (currSystrayConn.ConnectionId === changedSystrayConn.ConnectionId) {
                return false;
            }
            return true;
        }
    },
    updateSystrayConnectionStatus: function (status, data) {
        var cs = ClientService.connectionStatus;
        ClientService.systrayNotConnected();
        $('#systrayConnStatus').removeClass('systrayConnectionPrompt');
        $('#systrayConnStatusIcon').removeClass('throbber ui-icon ui-icon-alert');
        $('#systrayConnStatusIcon').hide();
        var conn = ClientService.getCurrentSystrayConnection();
        var machineName = '';
        var title = '';
        if (conn) {
            machineName = conn.MachineName || '';
            var ipAddress = conn.IPAddress || '';
            var machineId = conn.MachineId || '';
            title = Constants.c.clickToSelectConnection + '\n\n' + Constants.c.machineName + ': ' + machineName + '\n' + Constants.c.ipaddress + ': ' + ipAddress + '\n' + Constants.c.machineId + ': ' + machineId;
        }
        switch (status) {
            case cs.Connecting:
                // User is connecting to a systray
                // display throbber and connecting message
                $('#systrayConnStatusIcon').addClass('throbber');
                $('#systrayConnStatusIcon').show();
                $('#systrayConnStatusText').text(Constants.c.systrayConnecting).attr('title', Constants.c.systrayConnecting);
                ClientService.systrayConnectionTimeout();
                break;
            case cs.Connected:
                // User is properly connected to a systray
                // display connection
                $('#systrayConnStatus').addClass('systrayConnectionPrompt');
                $('#systrayConnStatusText').text(Constants.c.systrayConnected).attr('title', Constants.c.systrayConnected + '\n\n' + Constants.c.machineName + ': ' + machineName);
                ClientService.systrayConnected();
                break;
            case cs.NoConnectionsAvailable:
                // No systray connections are available to choose from
                // display no connections available
                $('#systrayConnStatus').addClass('systrayConnectionPrompt');
                $('#systrayConnStatusText').text(Constants.c.noSystrayConnectionsAvailable).attr('title', Constants.c.noSystrayConnectionsAvailable);
                clearTimeout(ClientService.systrayConnectionTimeoutTimer);
                ClientService.displayClientPairingHelp();
                break;
            case cs.NoConnectionSelected:
                // User has chosen not to connect to a systray
                // display Not connected to Systray
                $('#systrayConnStatus').addClass('systrayConnectionPrompt');
                $('#systrayConnStatusText').text(Constants.c.systrayNotSelected).attr('title', Constants.c.systrayNotSelected);
                delete ClientService.browserConnectPackage;
                clearTimeout(ClientService.systrayConnectionTimeoutTimer);
                break;
            case cs.FailedConnecting:
                // User was unable to connect to the selected systray
                // Allow user to click the message to retry connection, or select another systray to attempt connecting to
                // display failure to connect to systray
                $('#systrayConnStatus').addClass('systrayConnectionPrompt');
                $('#systrayConnStatusIcon').addClass('ui-icon ui-icon-alert');
                $('#systrayConnStatusIcon').show();
                $('#systrayConnStatusText').text(Constants.c.systrayFailedToConnect).attr('title', Constants.c.systrayFailedToConnect + '\n\n' + title);
                ClientService.displayClientPairingHelp();
                break;
            case cs.Reconnecting:
                $('#systrayConnStatusText').text(Constants.c.serverConnectionRetry).attr('title', Constants.c.serverConnectionRetry + '\n\n' + Constants.c.serverConnectionRetryDescription);
                break;
            case cs.Disconnected:
                $('#systrayConnStatus').addClass('systrayConnectionPrompt');
                $('#systrayConnStatusIcon').addClass('ui-icon ui-icon-alert');
                $('#systrayConnStatusIcon').show();
                $('#systrayConnStatusText').text(Constants.c.systrayDisconnected).attr('title', Constants.c.systrayDisconnected + '\n\n' + title);
                delete ClientService.browserConnectPackage;
                ClientService.removeExistingDocuments();
                break;
            case cs.LostServerConnection:
                $('#systrayConnStatusText').text(Constants.c.lostCommunicationWithServer).attr('title', Constants.c.lostCommunicationWithServer);
                break;
            case cs.VersionRequirements:
                var vrTitle = Constants.c.versionRequirmentsNotMet_d;
                vrTitle = String.format(vrTitle, ClientService.getVersionString(window.serverClientVersion), ClientService.getVersionString(data), '\n');
                vrTitle += title;
                $('#systrayConnStatus').addClass('systrayConnectionPrompt');
                $('#systrayConnStatusIcon').addClass('ui-icon ui-icon-alert');
                $('#systrayConnStatusIcon').show();
                $('#systrayConnStatusText').text(Constants.c.versionRequirmentsNotMet).attr('title', vrTitle);
                delete ClientService.browserConnectPackage;
                ClientService.removeExistingDocuments();
                break;
            default:
                break;
        }
        if (status !== cs.Reconnecting) { //Last status is used after a successful reconnection.
            ClientService.lastStatus = status;
        }
        ClientService.currentStatus = status;
        $('body').trigger('SystrayConnectionStatusChanged', ClientService.getSimpleSystrayInfo());
    },
    systrayConnected: function () {
        // Systray is connected: 
        // Show all browse Options, selecting user preference browse option
        var browseType = Utility.GetUserPreference('browseType') || 5;
        $('#importAcc .buttonOptions input[name="browseType"][value="' + browseType + '"]').prop('checked', true);
        $('#importAcc .buttonOptions input[name="browseType"][value="' + browseType + '"]').parent().show();
        $('#importAcc .buttonOptions input[name="browseType"]').parent().show();
        ClientService.enablePreProcess(browseType);
        // Enable scan accordion
        $('#scanAcc .disabled').removeClass('disabled');
        $('#scanAcc .disabledAccordion').hide();
        $('#scanAcc .custom_button').removeClass('disabled');
        // Enable menu options (Merge, Unmerge, Delete...)
        $('#captureListActions').find('.merge, .unmerge').parent().removeClass('disabled').attr('title', '');
    },
    systrayNotConnected: function () {
        // systray is not connected, disable preprocessing, browse options, and scan accordion (which is for everything except the status of Connected)
        // hide browse options other than html browse when systray isn't connected
        $('#importAcc .buttonOptions input[name="browseType"]').parent().hide();
        $('#importAcc .buttonOptions input[name="browseType"][value="-1"]').prop('checked', true).parent().show();
        ClientService.enablePreProcess(-1, true);
        // Disable scan accordion when systray isn't connected
        $('#scanAcc .accordion_title, #scanAcc .disabledAccordion').addClass('disabled');
        $('#scanAcc .disabledAccordion').show();
        $('#scanAcc .custom_button').addClass('disabled');
        // Disable menu options (Merge, Unmerge, Delete...)
        $('#captureListActions').find('.merge, .unmerge').parent().addClass('disabled').attr('title', Constants.c.noSystrayConnection);
    },
    getSimpleSystrayInfo: function () {
        var info = { connected: false, title: Constants.c.clickToSelectConnection };
        var connStatus = ClientService.currentStatus;
        if (connStatus === ClientService.connectionStatus.Connected) {
            var conn = ClientService.getCurrentSystrayConnection();
            if (!conn || $.isEmptyObject(conn)) {
                info.name = Constants.c.browser;
            }
            else {
                info.name = conn.MachineName;
                info.connected = true;
                info.title = Constants.c.clickToSelectConnection + '\n\n' + Constants.c.machineName + ': ' + conn.MachineName + '\n' + Constants.c.ipaddress + ': ' + conn.IPAddress + '\n' + Constants.c.machineId + ': ' + conn.MachineId;
            }
        }
        else {
            info.name = Constants.c.browser;
        }
        return info;
    },
    refreshSystrayConnections: function () {
        var proxy = SignalRServiceProxy();
        var sf = function (result) {
            $('#systrayConnections').val(JSON.stringify(result));
            ClientService.handleSystrayConnections();
        };
        proxy.getSystrayConnections(sf);
    },

    //#endregion Systray Connection Handling

    //#region Acquire Data
    // Get acquire data from html
    getAcquireDataHTML: function () {
        var data = $('#acquireData').val();
        if (data) {
            return JSON.parse(data);
        }
        return {};
    },
    // set acquire data in html
    setAcquireDataHTML: function (result) {
        $('#acquireData').val(JSON.stringify(result));
        var updateCaptureLayoutWithAcquireData = function () {
            // Set Devices           
            ClientService.setDevicesDropdown('#scanDevices .devices');  // render scan device dropdown
            ClientService.setDevicesSelect('#scan_dialog select[name="deviceId"]'); // render scan device select list
            ClientService.setSettingsHTML();    // filter scan settings based on selected scan device
            ClientService.addExistingDocuments(result); // Add any existing documents that were 'abandoned'
        };
        if ($('#capture_layout').length === 1) {
            updateCaptureLayoutWithAcquireData();
        }
        else {
            $('body').bind('captureLayoutRendered', function () {
                updateCaptureLayoutWithAcquireData();
            });
        }
    },
    addExistingDocuments: function (result) {
        // add existing documents to import grid, document recovery     (eg. page was refreshed and these documents weren't imported)
        // Add any AcquireData.ExistingDocuments into the grid for import
        var acquireData = result || ClientService.getAcquireDataHTML();
        if (acquireData && acquireData.ExistingDocuments) {
            var cb = function () {
                var existingDocs = acquireData.ExistingDocuments;
                var i = 0;
                var length = existingDocs.length;
                var isDraft = $('#captureImportTabs').find('input.draft').is(':checked');
                for (i; i < length; i++) {
                    var existingDoc = existingDocs[i];
                    if (existingDoc) {
                        var rowId = existingDoc.Id;
                        var ctId = $('#importContentType .importContentTypeDDText').attr('value');
                        var ct = window.contentTypes.get(ctId);
                        if (ct) {
                            existingDoc.ContentTypeId = ctId;
                            existingDoc.InboxId = ct.get('DefaultInboxId');
                            existingDoc.FolderId = ct.get('DefaultFolderId');
                            existingDoc.FolderPath = ct.get('DefaultFolderName');
                            existingDoc.WorkflowId = ct.get('DefaultWorkflowId');
                            existingDoc.SecurityClassId = ct.get('DefaultSecurityClassId');
                            existingDoc.IsDraft = isDraft;
                        }
                        var alreadyInGridData = ClientService.importDocs.get(rowId);
                        if (!alreadyInGridData) {  // Check to see if data is already in grid, if so don't add it
                            ClientService.importDocs.add(existingDoc);
                        }
                    }
                }
                if (length > 0) {
                    ClientService.resetCaptureButtonStates();
                }
            };
            if (ClientService.importDocs) {
                Utility.executeCallback(cb);
            }
            else {
                $('body').one('captureLayoutRenderedInit', function () {
                    Utility.executeCallback(cb);
                });
            }
        }
    },
    removeExistingDocuments: function () {
        // Remove any ExistingDocuments in the import grid that haven't been uploaded via 'Browser File Select'
        if (ClientService.importDocs) {
            ClientService.importDocs.removeNonIFrameDocuments();
        }
    },
    // get acquire data from signalR
    getAcquireData: function () {
        ClientService.lastShowAllDevicesOption = Utility.convertToBool(Utility.GetUserPreference('showConnectedOnly'));
        var args = [ClientService.lastShowAllDevicesOption];
        var success = function (result) {
            ClientService.setAcquireDataHTML(result);
        };
        var iMP = ClientService.setupInvokeMethod(Constants.im.GetAcquireData, args, success);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    //#endregion Acquire Data

    //#region Device Operations
    getDevices: function () {
        var acquireData = ClientService.getAcquireDataHTML();
        return acquireData.Devices;
    },
    setDevicesDropdown: function (dropdownListSelectors) {
        if ($(dropdownListSelectors).length > 0) {  // Don't need to attempt to render if the selectors don't exist yet
            var devices = ClientService.getDevices() || [];
            var menuTemplate = doT.template(Templates.get('dropdownlayout'));
            var ddList = new SlimEntities(devices);
            var selectedItemName = '';
            var selectedItemId = '';
            if (devices) {
                selectedItemId = Utility.GetUserPreference('selectedScanDevice') || '';
                if (selectedItemId) {
                    var selectedDevice = ddList.get(selectedItemId);
                    if (selectedDevice) {
                        selectedItemName = selectedDevice.get('Name');
                    }
                    // Can't find selected item in device list
                    if (!selectedItemName) {
                        selectedItemId = '';
                        selectedItemName = '';
                    }
                }
            }
            var ddData = {
                ddList: ddList,
                ddLabelClass: 'deviceText',
                selectedItemName: selectedItemName,
                selectedId: selectedItemId,
                firstItemInList: {
                    include: false
                }
            };
            var htmlData = menuTemplate(ddData);
            $(dropdownListSelectors).html(htmlData);
            // Disable the scan buttons until a device is selected
            ClientService.toggleScanButtons(true);
        }
    },
    setDevicesSelect: function (selectListSelectors) {
        var $selectListSelectors = $(selectListSelectors);
        var devices = ClientService.getDevices() || [];
        if ($selectListSelectors.length > 0 && $selectListSelectors.is(':visible')) {
            var selectedItemId = Utility.GetUserPreference('selectedScanDevice') || '';
            $selectListSelectors.empty();
            var length = devices.length;
            var i = 0;
            for (i; i < length; i++) {
                var device = devices[i];
                if (device) {
                    var id = device.Id;
                    var deviceName = device.Name;
                    var option = $('<option></option>').text(deviceName).val(id);
                    if (id === selectedItemId) {
                        option.prop('selected', true);
                    }
                    $selectListSelectors.append(option);
                }
            }
        }
    },
    getDeviceId: function () {
        return $('#scanDevices .deviceText').attr('value');
    },
    showScannerSettings: function () {
        var deviceId = ClientService.getDeviceId();
        var method = Constants.im.ShowScannerSettings;
        var args = [
            deviceId
        ];
        var iMP = ClientService.setupInvokeMethod(method, args);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    saveScannerSettings: function (scanSettings, success) {
        var method = Constants.im.SaveScannerSettings;
        var args = [
            JSON.stringify(scanSettings)
        ];
        var iMP = ClientService.setupInvokeMethod(method, args, success);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    loadScannerSettings: function (settingsId) {
        // Load advanced settings for the selected scanner
        var deviceId = ClientService.getDeviceId();
        if (!deviceId) {
            return;
        }
        if (!settingsId) {
            settingsId = $('#scanSettings .settingText').attr('value');
        }
        var setting = window.scanSettings.get(settingsId);
        if (!setting || !setting.attributes.ScannerName) {
            settingsId = Constants.c.emptyGuid;
        }
        var method = Constants.im.LoadScannerSettings;
        // args: 
        // deviceId - 
        // settingsId - if non-empty, settings are loaded from server and applied to scanner 
        //    if Guid.Empty, scanner is reset to default settings (settings are cleared)
        var args = [
            deviceId,
            settingsId
        ];
        var iMP = ClientService.setupInvokeMethod(method, args);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    getSettingsHTML: function () {
        var settings = new ScanSettings(window.scanSettings.toJSON());
        // Filter settings based on if they are advanced or not and on the selected scanner
        var scannerName = $('#scanDevices .deviceText').text();
        var i = 0;
        var length = settings.length;
        for (i; i < length; i++) {
            var setting = settings.at(i);
            if (setting && setting.get('ScannerName') && setting.get('ScannerName') !== scannerName) {
                settings.remove(setting.get('Id'));
                --length;
                --i;
            }
        }
        var menuTemplate = doT.template(Templates.get('dropdownlayout'));
        var selectedItemName = Constants.c.newTitle;
        var selectedItemId = Constants.c.emptyGuid;
        if (settings) {
            selectedItemId = Utility.GetUserPreference('selectedScanSetting');
            if (selectedItemId) {
                var selectedSetting = settings.get(selectedItemId);
                if (selectedSetting) {
                    selectedItemName = selectedSetting.get('Name');
                }                
            }
            // Can't find selected item in settings list
            // Make -- New -- selected
            if (selectedItemName === Constants.c.newTitle) {
                selectedItemId = Constants.c.emptyGuid;
                selectedItemName = Constants.c.newTitle;
            }
        }
        var ddData = {
            ddList: settings,
            ddLabelClass: 'settingText',
            selectedItemName: selectedItemName,
            selectedId: selectedItemId,
            firstItemInList: {
                include: true,
                text: Constants.c.newTitle,
                value: Constants.c.emptyGuid
            }
        };
        return menuTemplate(ddData);
    },
    setSettingsHTML: function () {
        $('#scanSettings .settings').html(ClientService.getSettingsHTML());
        var id = $('#scanSettings .settingText').attr('value');
        ClientService.loadScannerSettings(id || Constants.c.emptyGuid);
        if (id && id !== Constants.c.emptyGuid) {
            $('#deleteSetting').removeClass('disabled');
        } else {
            $('#deleteSetting').addClass('disabled');
        }
    },
    //#endregion Device Operations

    //#region Browse Files

    getPreProcessingOptions: function () {
        return JSON.stringify(ClientService.preProcessingOptions);
    },
    browse: function (method, success, failure) {
        // if preprocessing pass settings, otherwise pass empty array
        var args = [];
        // Preprocessing is checked and is not disabled
        if ($('#capture_layout .preProcessing').is(':checked') && !$('#capture_layout .preProcessing').is(':disabled')) {
            args[0] = ClientService.getPreProcessingOptions();
        }
        var iMP = ClientService.setupInvokeMethod(method, args, success, failure);
        if (iMP && !$.isEmptyObject(iMP)) {
            ClientService.isScanning = false;
            window.CompanyInstanceHubProxy.invokeMethod(iMP);
        }
    },
    webFileBrowse: function (args, success, failure) {
        var method = Constants.im.WebFileBrowse;
        var iMP = ClientService.setupInvokeMethod(method, args, success, failure);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    webFileSelect: function (args, success, failure) {
        var method = Constants.im.WebFileSelect;
        var iMP = ClientService.setupInvokeMethod(method, args, success, failure);
        ClientService.isScanning = false;
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    enablePreProcess: function (browseType, isDisconnected) {
        var isEnabled = parseInt(browseType, 10) !== -1;
        if (isEnabled) {
            // Enable preprocessing
            $('#importAcc .preProcessing').prop('disabled', false).attr('title', '');
            $('#importAcc .preProcessing').siblings().attr('title', '');
            if ($('#importAcc .preProcessing').is(':checked')) {
                $('#importAcc .preProcessingOptions').removeClass('disabled');
            }
        } else {
            // Disable preprocessing 
            var disabledMsg;
            if (isDisconnected) {
                disabledMsg = Constants.c.noSystrayConnection;
            } else {
                disabledMsg = Constants.c.noPreProForHtml;
            }
            $('#importAcc .preProcessing').prop('disabled', true).attr('title', disabledMsg);
            $('#importAcc .preProcessing').siblings().attr('title', disabledMsg);
            $('#importAcc .preProcessingOptions').addClass('disabled');
        }
    },
    //#endregion Browse Files

    //#region Preview 
    previewPage: function (pageNum, rowId, grid) {
        // If no simpleDocId, use the one that is stored in ClientService.previewSimpleDocId (viewing the same document)
        // Otherwise, set ClientService.previewSimpleDocId to simpleDocId (viewing a different document)
        if (rowId) {
            ClientService.previewSimpleDocId = rowId;
        }
        else {
            rowId = ClientService.previewSimpleDocId;
        }
        var previewMode = Utility.GetUserPreference('capturePreviewMode') === 'thumbnailPreview' ? false : true;
        if (ClientService.previewMode !== previewMode) {
            // Preview mode has changed, remove all PreviewFileNames from cache
            ClientService.clearPreviewFileNamesFromCache();
        }
        ClientService.previewMode = previewMode;
        var cachedPage = ClientService.findPageInCache(pageNum);
        // Can't preview an 'HTML File Select' document
        var iframeId = $(grid).jqGrid('getCell', rowId, 'iframeId');
        if (iframeId) {
            // Display the icon for the selected row, based on the file's extension    
            var iframeDocTitle = '';
            var iframeElem = $(iframeId)[0];
            if (iframeElem && iframeElem.contentWindow && iframeElem.contentWindow.document) {
                iframeDocTitle = $(iframeElem.contentWindow.document).find('#fid').val();
            }
            var previewFileName = Constants.UtilityConstants.HTMLFILEPREVIEW;
            ClientService.capturePreviewer.viewData = {
                previewFileName: previewFileName,
                totalPages: 1,
                pageNum: pageNum,
                cachedPage: cachedPage
            };
            ClientService.capturePreviewer.render();
            return;
        }
        // If page is cached, and it contains a PreviewFileName, no need to fetch it again, use the one that is cached.
        if (cachedPage && cachedPage.PreviewFileName) {
            ClientService.capturePreviewer.viewData = {
                previewFileName: cachedPage.PreviewFileName,
                totalPages: cachedPage.TotalPages,
                pageNum: pageNum,
                cachedPage: cachedPage
            };
            ClientService.capturePreviewer.render();
        }
        else {
            // Fetch a PreviewFileName for previewing
            var method = Constants.im.PreviewPage;
            var args = [JSON.stringify({
                SimpleDocumentId: rowId,
                PageNumber: pageNum,
                FullSizePreview: previewMode
            })];
            var success = function (result) {
                // Set preview viewdata and render the documents preview
                ClientService.capturePreviewer.viewData = {
                    previewFileName: result.PreviewFileName,
                    totalPages: result.PageCount,
                    pageNum: pageNum,
                    cachedPage: cachedPage
                };
                ClientService.capturePreviewer.render();
            };
            var iMP = ClientService.setupInvokeMethod(method, args, success);
            window.CompanyInstanceHubProxy.invokeMethod(iMP);
        }
    },
    //#endregion Preview

    //#region Signal R Methods, callbacks and supporting Functions
    /* invokeMethod: InvokeMethod Enum value
    // args: array of string values
    // successCallback: method to be invoked on success
    // errorCallback: method to be invoked on error/failure
    */
    setupInvokeMethod: function (invokeMethod, args, successCallback, errorCallback) {
        if (!ClientService.isSystrayConnected()) {
            return {};
        }
        return CompanyInstanceHubProxy.setupInvokeMethod(invokeMethod, args, successCallback, errorCallback);
    },
    onSendFileAcquired: function (simpleDocument, callback) {
        // Receive a SimpleDocument
        if (simpleDocument) {
            simpleDocument.PreProcessed = 1;
            if ($('#capture_layout .preProcessing')) {
                if (!$('#capture_layout .preProcessing').is(':checked')) {
                    simpleDocument.PreProcessed = 0;
                }
            }
            $('body').trigger('onSendFileAcquired', [simpleDocument, callback]);
        }
    },
    onMobileFileBrowseDataChange: function (webBrowseAccessSettings) {
        var $acquireDataSel = $('#acquireData');
        var data = $acquireDataSel.val();
        if (data) {
            data = JSON.parse(data);
        }
        data.WebBrowseAccessSettings = webBrowseAccessSettings;
        $acquireDataSel.val(JSON.stringify(data));
    },
    sendProgressMessage: function (actionResult, apiEvent) {
        var apiev = Constants.apiev;
        var ids = [];
        switch (apiEvent) {
            case apiev.ImportUploading:
                ClientService.showProgress(Constants.c.uploadText, -1);
                break;
            case apiev.ImportUploaded:
                $('#capture_layout .cancelImport').addClass('disabled'); // No longer able to cancel an import after the documents have been uploaded
                ClientService.showProgress(Constants.c.uploadedText, -1);
                break;
            case apiev.ImportStarted:
                ClientService.showProgress(Constants.c.importText, -1);
                break;
            case apiev.ImportCanceled:
                ClientService.importDocuments = [];
                ClientService.showProgress(Constants.c.importCancelled, 100);
                ClientService.resetCaptureButtonStates();
                break;
            case apiev.ImportException:
                ErrorHandler.addErrors(actionResult.Message);
                ClientService.hideProgress();
                ClientService.resetCaptureButtonStates();
                break;
            case apiev.ImportProgress:
                if (actionResult.Message === "0 %") {
                    break;
                }
                ClientService.showProgress(actionResult.Message);
                break;
            case apiev.ImportScheduled:
                ClientService.resetCaptureButtonStates();
                ClientService.hideProgress();
                break;
            case apiev.ImportCompleted:
                ClientService.onImportCompleted(actionResult);
                break;
            case apiev.PreProcessing:
                ClientService.showPreProcessingProgress(actionResult);
                break;
            case apiev.PreProcessingComplete:
                if (actionResult.Operation === 'File Acquired') {
                    ClientService.preProcessingSource = actionResult.Result;
                }
                if (ClientService.preProcessingSource) {
                    var progModel = ClientService.progressDocs.get(ClientService.preProcessingSource);
                    if (progModel) {
                        progModel.destroy();
                    }
                    ClientService.preProcessingSource = '';
                }
                break;
            case apiev.ScannersListChanged:
                var res = actionResult.Result;
                var acquireData = ClientService.getAcquireDataHTML();
                acquireData.Devices = res;
                ClientService.setAcquireDataHTML(acquireData);
                break;
            case apiev.ScannerOptionsChanged:
                $('#scanOptionsDialog input[name="ScannerName"]').val(actionResult.Result);
                // Disable 'Advanced Settings' that are in 'Basic Settings' dialog
                $('#scanOptionsDialog').find('.advancedSetting').addClass('ignore');
                $('#scanOptionsDialog').find('.advancedSetting').prop('disabled', true);
                $('#hasAdvancedSettings').show();
                $('#scanOptionsDialog > div.fright').addClass('hasAdvanced');
                break;
            case apiev.CaptureStarted:
                $('#capture_layout .custom_button').addClass('disabled');
                $('#cancelScan').removeClass('disabled');
                ClientService.isScanning = true;
                break;
            case apiev.CaptureCompleted: // really, this is "Scan" completed
                if (!actionResult.Succeeded) {
                    if (ClientService.onScanAppend) {
                        ClientService.onScanAppendComplete();
                    }
                    ErrorHandler.addErrors(actionResult.Result.Message);
                    ClientService.resetCaptureButtonStates();
                    return;
                }
                if (ClientService.onScanAppend) {
                    ClientService.onScanAppendSuccess();
                } else {
                    ClientService.resetCaptureButtonStates(); // reset states except when importing is occurring, in which case we wait for ImportCompleted
                }
                break;
            case apiev.CaptureFileAcquiredCloud:
                if (!actionResult.Succeeded) {
                    if (ClientService.onScanAppend) {
                        ErrorHandler.addErrors(actionResult.Result.Message);
                    }
                }
                break;
        }
    },
    onScanAppendComplete: function () {
        ClientService.onScanAppend = false;
        $('body').trigger('onScanAppendComplete');
    },
    onScanAppendSuccess: function () {
        $('body').trigger('onScanAppendSuccess');
        ClientService.onScanAppendComplete();
    },
    onImportCompleted: function (actionResult) {
        ClientService.showProgress();
        var models = ClientService.importDocuments;
        var i = 0;
        var length = 0;
        if (ClientService.scanDirectSimpleDoc && ClientService.scanDirectSimpleDoc.length > 0) {
            i = 0;
            length = ClientService.scanDirectSimpleDoc.length;
            for (i ; i < length; i++) {
                models.push(ClientService.scanDirectSimpleDoc.at(i));
            }
        }
        var failures = actionResult.Result.Failures ? JSON.parse(actionResult.Result.Failures) : [];
        //TODO: use import stats, display how many was imported and if one where it was imported to
        var results = actionResult.Result.Results ? JSON.parse(actionResult.Result.Results) : {}; //Contains Create and Update counts        
        i = 0;
        length = models.length;
        for (i = length - 1; i >= 0; i--) {
            try {
                if (models[i]) {
                    var failure = ClientService.getFailureItem(models[i], failures);
                    if (failure) {
                        models[i].set('ExceptionMessage', failure.ExceptionMessage);
                    } else {
                        models[i].destroy();
                    }
                }
            } catch (ex) {
                Utility.OutputToConsole(ex);
            }
        }
        ClientService.importDocuments = []; // reset collection of imported documents, they have been imported or have returned an error at this point
        $('#capture_layout .progressCont').fadeOut(2000);
        ClientService.resetCaptureButtonStates();
        var autoViewImport = $('.autoViewImport:first').is(':checked');
        if (autoViewImport) {
            ClientService.retrieveTabView(actionResult);
        }
    },
    retrieveTabView: function (actionResult) {
        //redirect to retrieve tab
        var sf = function (result) {
            $('.CaptureViewerView').addClass('hideNative');
            if (result && result.VersionIds && result.VersionIds.length > 0) {
                $('body').trigger('ViewDocuments', { versionIds: result.VersionIds });
            }
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        var importExportSvc = ImportExportServiceProxy();
        importExportSvc.getImportJob(actionResult.Result.Id, sf, ff);
    },
    getFailureItem: function (rowId, failures) {
        var length = failures ? failures.length : 0;
        var i = 0;
        for (i; i < length; i++) {
            if (failures[i].Id === rowId) {
                return failures[i];
            }
        }
    },
    resetCaptureButtonStates: function () {
        $('#capture_layout .custom_button').removeClass('disabled');
        ClientService.toggleScanButtons();
        if ($('#importAcc .preProcessingOptions').attr('title')) {  // Options button remains disabled if there is a title (reason for being disabled)
            $('#importAcc .preProcessingOptions').addClass('disabled');
        }
        if ($('.preProcessing').is(':checked')) {
            $('#importAcc .preProcessingOptions').removeClass('disabled');
        }
        else {
            $('#importAcc .preProcessingOptions').addClass('disabled');
        }

        $('#capture_layout .cancelImport').addClass('disabled');
        $('#cancelScan').addClass('disabled');
    },
    toggleScanButtons: function () {
        var deviceId = ClientService.getDeviceId();
        var selectedCT = $('#scanContentType .scanContentTypeDDText').attr('value');
        if (deviceId) {
            $('#scanPreview', '#scanAcc').removeClass('disabled').attr('title', '');
            if (!(selectedCT === undefined || selectedCT === "" || selectedCT === "None Selected")) {
                $('#scanDirect').removeClass('disabled').attr('title', '');
            } else {
                $('#scanDirect').addClass('disabled').attr('title', Constants.c.deviceSelection);
            }
            
        } else {
            $('#scanDirect, #scanPreview', '#scanAcc').addClass('disabled').attr('title', Constants.c.deviceSelection);
        }
        $('#cancelScan').addClass('disabled');
    },
    showProgress: function (text, percent) {
        text = text || null;
        percent = percent || 0;
        var progressData = ClientService.progressData;
        if (text !== null && percent === 0) {
            if (text === "?%") {
                // unknown percent: this is a signal for indeterminate progress
                text = progressData.progressText; // retain prior text (operation)
                percent = -1;
            }
            else {
                var progressValue = parseInt($.trim(text.replace('%', ' ')), 10);
                if (!isNaN(progressValue)) {
                    // if percent value is found, the text is retained but the percent is updated
                    text = progressData.progressText;
                    percent = progressValue;
                }
                else {
                    percent = 1; //If we have text without a defined percentage and it could not be parsed to an int, then we can assume the operation has changed, set the percent to 1.
                }
            }
        }
        //Do All updates in one invoke, otherwise each is its own update.
        progressData.progressText = text;
        progressData.progressValue = ClientService.progressIndeterminate ? 0 : percent;    // how far along
        progressData.progressIndeterminate = percent === -1;  // gif
        progressData.progressVisible = percent !== 0 ? /*show*/1 : /*hide*/0;
        var progressContSelector = $('#capture_layout .captureBtns .progressCont');
        Utility.displayProgress(progressContSelector, progressData);
    },
    hideProgress: function () {
        var progressContSelector = $('#capture_layout .captureBtns .progressCont');
        progressContSelector.hide();
    },
    showPreProcessingProgress: function (actionResult) {
        if (ClientService.progressDocs) {
            var progressData = $.extend(true, {}, ClientService.progressData); //Need to clone, otherwise the object is the same as in the model and a set will not trigger a change event.
            var percent = actionResult.Result;
            progressData.progressText = null;
            progressData.progressValue = ClientService.progressIndeterminate ? 0 : percent;    // how far along
            progressData.progressIndeterminate = percent === -1;  // gif

            var source = actionResult.Source;
            var message = [];
            ClientService.preProcessingSource = source;
            if (!$.isEmptyObject(ClientService.importDocs.get(source))) {
                return false; //Progress event post added to import grid. This can occur since order is not guarenteed in signal r.
            }

            var progressModel = ClientService.progressDocs.get(source);
            if ($.isEmptyObject(progressModel)) {
                if (actionResult.Message) {
                    message = actionResult.Message.split(':::');
                }
                progressModel = ClientService.progressDocs.add({ Id: source, Title: message[1], FileSize: message[0] });
            }
            if (actionResult.Operation === 'Rendering' && parseInt(progressData.progressValue, 10) >= 90) {
                progressData.progressValue = '100';
            }
            progressModel.set(actionResult.Operation + 'ProgressData', progressData);
        }
        return true;
    },
    print: function (fileName, success) {
        var args = [fileName];
        var sf = function () {
            Utility.executeCallback(success);
            Send.closeSendDialog();
        };
        var ff = function (errorThrown) {
            var msg = errorThrown && errorThrown.Exception ? errorThrown.Exception.Message : '';
            ErrorHandler.addErrors(msg);
        };
        var iMP = ClientService.setupInvokeMethod(Constants.im.Print, args, sf, ff);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    email: function (emailOptions, success) {
        // args - emailOptions including Filename
        var args = [JSON.stringify(emailOptions)];
        var sf = function () {
            Utility.executeCallback(success);
            Send.closeSendDialog();
        };
        var ff = function (errorThrown) {
            var msg = errorThrown && errorThrown.Exception ? errorThrown.Exception.Message : '';
            ErrorHandler.addErrors(msg);
        };
        var iMP = ClientService.setupInvokeMethod(Constants.im.Email, args, sf, ff);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    scan: function (parentSelector, submitResults) {
        // Only the start of a new scan can change the value of scanDirect to ensure we know the mode when acquiring the file
        ClientService.scanDirect = !!submitResults; // !! syntax ensures a proper bool
        var deviceId = ClientService.getDeviceId();
        if (!deviceId) {
            return;
        }
        var settingsId = $('#scanSettings .settingText').attr('value');
        var scanSettings = new ScanSettings(window.scanSettings.toJSON()).get(settingsId) || new ScanSetting();
        var overrideSplitMethodSel = $(parentSelector).find('input[name="ScanTypeSelection"]:checked');
        var overrideSplitMethodValue = parseInt(overrideSplitMethodSel.attr('value'), 10);
        if (scanSettings.get && scanSettings.get('SplitMethod') !== overrideSplitMethodValue) {
            scanSettings.set('SplitMethod', overrideSplitMethodValue);
        }
        var args = [
            deviceId,
            ClientService.scanDirect,
            JSON.stringify(scanSettings.attributes || {})
        ];
        if (ClientService.scanDirect) {
            var ctId = $('#scanContentType .scanContentTypeDDText').attr('value');
            args.push(ctId);
        } else {
            args.push(null);
        }
        var promptToContinue = $('#promptToContinue:checked').length !== 0;
        args.push(promptToContinue);
        var method = Constants.im.Scan;
        var iMP = ClientService.setupInvokeMethod(method, args);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    scanAppend: function (verId, deviceId, captureSettings, beforePage, replacePage, errorCallBack, completedCallBack) {
        ClientService.onScanAppend = true;
        var args = [
            deviceId,
            false,
            JSON.stringify(captureSettings),
            JSON.stringify({
                VersionId: verId,
                BeforePage: beforePage,
                ReplacePage: replacePage
            })
        ];
        var iMP = ClientService.setupInvokeMethod(Constants.im.Scan, args, completedCallBack, errorCallBack);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    split: function (args, success, failure) {
        if (args) {
            var argsDoc = JSON.parse(args);
            if (argsDoc.SimpleDocument) {
                if (argsDoc.SimpleDocument.PreProcessed && argsDoc.SimpleDocument.PreProcessed === "0") {
                    ErrorHandler.addErrors(Constants.c.unpProcessedDocForSplit);
                    return;
                }
            }
        }
        var invokeMethod = Constants.im.Split;
        var iMP = ClientService.setupInvokeMethod(invokeMethod, args, success, failure);
        window.CompanyInstanceHubProxy.invokeMethod(iMP);
    },
    //#endregion Signal R Callbacks and supporting Functions

    //#region Guided Help
    displayClientPairingHelp: function () {
        // Only display if the capture tab is visible
        if ($('#capture_layout').is(':visible')) {
            GuidedHelp.displayClientPairingHelp();
        }
        else {
            $('body').bind('captureLayoutRendered', function () {
                GuidedHelp.displayClientPairingHelp();
            });
        }
    },
    //#endregion Guided Help

    //#region Report Runner
    setReportRunner: function (rr) {
        ClientService.reportRunner = rr;
    },
    getReportRunner: function () {
        return ClientService.reportRunner;
    },
    reportRunnerExists: function () {
        var rr = ClientService.getReportRunner();
        return !!rr;
    }
    //#endregion Report Runner
};