/// <reference path="../../Content/JSProxy/AutomationHubProxy.js" />
/// <reference path="~/Content/LibsInternal/ClientService.js" />
var DataLinkEditView = Backbone.View.extend({
    dataLinkSvc: DataLinkServiceProxy(),
    automationHub: AutomationHubProxy(false),
    testGrid: undefined,
    hubStarted: false,
    viewData: {},
    isThirdParty: false,
    events: {
        // Data link connection events
        "change input[name='DataLinkType']": "changeDataLinkType",
        "change #allQueries": "changeAllQuerySelection",
        "change #allConnections": "changeAllConnSelection",
        "click #saveDataLinkConn": "saveDLC",
        "click #saveDataLinkConnAs": "saveDLCAs",
        "click #deleteDataLinkConn": "killConnection",
        "click #testAll": "test",
        "click #testLive": "test",
        "click #testSaved": "test",
        "change #dataLinkConnections input": "isDirty",
        "keyup #dataLinkConnections input": "isDirty",
        // Data link query events
        "click #deleteDataLinkQuery": "killQuery",
        "click #saveDataLinkQuery": "saveDLQ",
        "click #saveDataLinkQueryAs": "saveDLQAs",
        "click #saveDLQParam": "saveParameter",
        "click #delDLQParam": "deleteParameter",
        "change select[name='Parameters']": "changeParamSelection",
        "keyup #parameterDef input": "validateParameter",
        "change #parameterDef input": "validateParameter",
        "change #parameterDef select[name='ParameterType']": "validateParameter",
        "change input[name='dataLinkAction']": "changeQueryType",
        "change input[name='IncludeDocs']": "changeIncludeDocs",
        "change input[name='ConnectionString']": "changeConnectionString",
        "keyup input[name='ConnectionString']": "changeConnectionString",
        "focus #dataLinkLayout input": "selectText",
        "click #buildConnection": "buildConnection",
        "change #selectDLService": "selectDLService",
        "mousedown #dataLinkLayout select[name=\"ConnectionString\"] ~ .ui-combobox": "fillDSNNames",
        "mousedown #dataLinkLayout select[name=\"ExecutableName\"] ~ .ui-combobox": "fillExecutableNames",
        "mousewheel #dataLinkLayout": "closeAutocomplete",
        "click input[name='TypeAhead']": "changeTypeAheadDropDown",
        "click input[name='Dropdown']": "changeTypeAheadDropDown",
        "keyup input[name='ParameterValue']": "changeParameterValue"
    },
    initialize: function () {
        var that = this;
        this.compiledTemplate = doT.template(Templates.get('editdatalinklayout'));
        this.compiledConnTemplate = doT.template(Templates.get('datalinkconnectionlayout'));
        this.automationHub.onAutomationSvcConnect(function (newConn) { that.onAutomationSvcConnect(newConn, that); });
        this.automationHub.onAutomationSvcDisconnect(function (connId) { that.onAutomationSvcDisconnect(connId, that); });
        return this;
    },
    changeTypeAheadDropDown: function (e) {
        var $currentTarget = $(e.currentTarget);
        var isChecked = $currentTarget.is(':checked');
        this.resetTypeAheadDropDown($currentTarget.attr("name"), isChecked);
    },
    onAutomationSvcConnect: function (newConnection, that) {
        var length = window.automationConnections.length;
        var exists = false;
        var i = 0;
        for (i; i < length; i++) {
            if (window.automationConnections[i].ConnectionId === newConnection.ConnectionId) {
                window.automationConnections[i] = newConnection;
                exists = true;
                break;
            }
            else if (window.automationConnections[i].MachineId === newConnection.MachineId) {
                window.automationConnections[i] = newConnection;
                exists = true;
                break;
            }
        }
        if (!exists) {
            window.automationConnections.push(newConnection);
        }
        window.automationConnections.sort(function (a, b) { return a.MachineName < b.MachineName ? 1 : -1; });
        that.renderClients();
    },
    onAutomationSvcDisconnect: function (connectionId, that) {
        var length = window.automationConnections.length;
        var exists = false;
        var i = 0;
        for (i; i < length; i++) {
            if (window.automationConnections[i].ConnectionId === connectionId) {
                window.automationConnections.splice(i, 1);
                exists = true;
                break;
            }
        }
        if (exists) {
            that.renderClients();
        }
    },
    renderClients: function (selectionOnly) {
        var select = $('#automationServiceSelect');
        var serverDL = $('#selectDLService').val() === "Server";
        if (serverDL) {
            select.find('option').remove();
            return;
        }
        if (!selectionOnly) {
            select.find('option').remove();
            var acs = window.automationConnections;
            var length = acs.length;
            if (length === 0) {
                select.append($('<option></option>').attr('value', "-1").text(Constants.c.noAutomationConnectionsAvailable));
            }
            else {
                select.append($('<option></option>').attr('value', "-1").text(Constants.c.chooseAnAutomationConnection));
                var i = 0;
                for (i; i < length; i++) {
                    select.append($('<option></option>').attr('value', acs[i].MachineId).text(acs[i].MachineName));
                }
            }
        }
        $('#automationDLConnStatusIcon').removeAttr('class');
        var machineId = this.viewData.selected.get('MachineId') || "-1";
        var option = select.find('option[value="' + machineId + '"]');
        if (option.length === 0) {
            select.append($('<option></option>').attr('value', machineId).text(Constants.c.configuredAutomationConnectionNotFound));
            $('#automationDLConnStatusIcon').addClass('connectionIndicator ui-icon ui-icon-alert');
        }
        else {
            $('#automationDLConnStatusIcon').addClass('connectionIndicator');
        }
        select.val(machineId);
    },
    onNavigateAway: function (that) {
        if (that.hubStarted) {
            that.hubStarted = false;
            that.automationHub.stop();
        }
        Navigation.onNavigationCallback = null;
    },
    render: function (filterConnections) {
        var that = this;
        if (!that.hubStarted) {
            that.hubStarted = true;
            that.automationHub.start();
        }
        Navigation.onNavigationCallback = function () { that.onNavigateAway(that); };
        this.viewData.errorMsg = window.dataLinksCC.errorMsg;
        // filterQueries: boolean, whether to filter the queries or not

        var newDL = new DataLink({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle, MachineId: '-1', DataLinkType: Constants.dlt.MSSQL, Definition: '{}' });
        var newQuery = new DataLinkQuery({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle });
        this.viewData.list = window.dataLinks.getNewList(newDL);
        this.viewData.dlq = window.dataLinkQueries.getNewList(newQuery);
        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }
        if (this.viewData.selectedQuery === undefined) {
            this.setNewQueryClass();
        }
        this.isThirdParty = this.viewData.selected.get('DataLinkType') === Constants.dlt.ThirdParty;
        if (this.isThirdParty && this.viewData.selectedQuery.get('Id') === Constants.c.emptyGuid) {
            // don't allow third party connection to be selected when query is -- New --
            this.setNewClass();
            this.isThirdParty = false;
        }
        $(this.el).html(this.compiledTemplate(this.viewData));
        this.renderConnection(filterConnections);
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        // Start Setup Combobox
        if (this.viewData.selected && !this.viewData.errorMsg) {
            $('#dataLinkQueryList').combobox();
            $('#dataLinkQueryList').parent().find('.isCombo').autocomplete({
                select: function (event, ui) {
                    that.changeQuerySelection(event, ui.item.option);
                },
                change: function (event, ui) {
                    if (!ui.item) {
                        var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex($(this).val()) + "$", "i"),
                            valid = false;
                        $('#dataLinkQueryList').children("option").each(function () {
                            if ($(this).text().match(matcher)) {
                                this.selected = valid = true;
                                that.changeQuerySelection(event, this);
                                return false;
                            }
                        });
                    }

                }
            });
            // End Setup Combobox
            var dataLinkActionEv = new $.Event();
            dataLinkActionEv.currentTarget = $('input[name="dataLinkAction"]:checked');
            this.changeQueryType(dataLinkActionEv);
            Utility.toggleCssClass('#deleteDataLinkQuery', 'disabledIcon', (this.viewData.selectedQuery.get('Id') === Constants.c.emptyGuid));
            if (!this.isThirdParty) {
                if ($("input[name='Dropdown']").is(':checked')) {
                    this.resetTypeAheadDropDown('Dropdown', true);
                }
                if ($("input[name='TypeAhead']").is(':checked')) {
                    this.resetTypeAheadDropDown('TypeAhead', true);
                }
            }
        }
        return this;
    },
    selectDLService: function () {
        if ($('#selectDLService').val() === "Client") {
            $('#clientConnectionHideContainer').show();
        } else {
            $('#clientConnectionHideContainer').hide();
        }
        this.renderClients();
    },
    renderConnection: function (filterConnections) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var that = this;
        var connId = this.viewData.selected.get('Id');
        // TODO: scain filter connections based on selected query...
        //var selectedQuery = this.viewData.selectedQuery;
        //if (selectedQuery && this.viewData.errorMsg === null) {
        //    var queryConnId = selectedQuery.get('ConnectionId');
        //    if (filterConnections) {
        //        this.viewData.filteredConnections = this.filterConnections(queryConnId);
        //    } else {
        //        delete this.viewData.filteredConnections;
        //    }
        //}
        if (this.viewData.EncryptedPassword) {
            this.viewData.ConfirmEncryptedPassword = this.viewData.EncryptedPassword;
        }
        $('#dataLinkConnectionsContainer').html(this.compiledConnTemplate(this.viewData));
        $('#dataLinkConnectionList').combobox();
        $('#dataLinkConnectionList').parent().find('.isCombo').autocomplete({
            select: function (event, ui) {
                that.changeConnSelection(event, ui.item.option);
            },
            change: function (event, ui) {
                if (!ui.item) {
                    var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex($(this).val()) + "$", "i"),
                        valid = false;
                    $('#dataLinkConnectionList').children("option").each(function () {
                        if ($(this).text().match(matcher)) {
                            this.selected = valid = true;
                            that.changeConnSelection(event, this);
                            return false;
                        }
                    });
                }

            }
        });
        this.changeDataLinkType();
        Utility.toggleCssClass('#deleteDataLinkConn', 'disabledIcon', (connId === Constants.c.emptyGuid));
        Utility.toggleCssClass('#saveDataLinkConn', 'disabledIcon', connId === Constants.c.emptyGuid || !this.viewData.dirtyConnection);
        Utility.toggleCssClass('#saveDataLinkConnAs', 'disabledIcon', connId === Constants.c.emptyGuid || !this.viewData.dirtyConnection);

        this.renderClients();
        var isServerDL = !this.viewData.selected.get('MachineId');
        if (!Utility.isSuperAdmin() && isServerDL) {
            $('#dataLinkLayout .left').find('input, select').prop('disabled', true);
        }

    },
    selectText: function (ev) {
        InputUtil.selectText($(ev.currentTarget));
    },

    //#region Data link Connections
    /*
        new class is fetched from the controller
    */
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(window.dataLinks);
        return this;
    },
    changeConnSelection: function (event, selection) {
        var id = $(selection).val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        } else {
            var model = window.dataLinks.get(id);
            this.viewData.selected = model;
            // TODO: scain solve issue where typing a new name throws javascript error, on blur
        }
        this.viewData.selectedQuery = undefined;
        this.changed(false);
        this.renderConnection();
    },
    filterConnections: function (queryConnId) {
        var conns = $.extend(true, {}, window.dataLinks);
        var filteredConnections = new DataLinks();
        if (queryConnId === Constants.c.emptyGuid) {
            return conns;
        }
        conns.each(function (conn) {
            if (conn.get('Id') === queryConnId || conn.get('Id') === Constants.c.emptyGuid) {
                filteredConnections.add(conn);
            }
        });
        return filteredConnections;
    },
    changeAllConnSelection: function (event) {
        var targ = $(event.currentTarget);
        var id = targ.val();
        this.viewData.selected = window.dataLinks.get(id);
        this.viewData.selectedQuery = undefined;
        this.renderConnection();
    },
    changeAllQuerySelection: function (event) {
        var targ = $(event.currentTarget);
        var query = window.dataLinkQueries.get(targ.val());
        var connId = query.get('ConnectionId');
        if (connId) {
            this.viewData.selected = window.dataLinks.get(connId);
        }
        this.viewData.selectedQuery = query;
        this.render(true);
    },
    /*
    * isUnique check the new against the existing.  do not allow same names on two data link connections
    * if there is an update and the guid is the same then it is considered unique...
    * @return boolean
    */
    isUnique: function (datalink) {
        var unique = true;
        window.dataLinks.each(function (item) {
            if ($.trim(datalink.Name).toLowerCase() === $.trim(item.get('Name')).toLowerCase()) {
                if (datalink.Id !== item.get('Id')) {
                    unique = false;
                    return unique;
                }
            }
        });
        return unique;
    },
    isDirty: function (ev) {
        this.changed(true);
    },
    changed: function (dirty) {
        this.viewData.dirtyConnection = dirty;
        Utility.toggleCssClass('#saveDataLinkConn', 'disabledIcon', !dirty);
        Utility.toggleCssClass('#saveDataLinkConnAs', 'disabledIcon', !dirty);
    },
    saveDLC: function (event, saveDLQuery) {
        var attrs = this.getConnectionDataFromUI();
        attrs.Id = $('#dataLinkConnectionList :selected').val();
        this.saveDataLinkConnection(event, attrs, saveDLQuery);
    },
    saveDLCAs: function (event) {
        var attrs = this.getConnectionDataFromUI();
        this.saveDataLinkConnection(event, attrs);
    },
    saveDataLinkConnection: function (event, attrs, callback) {
        // event: event from click of save button
        // attrs: passed in obtained attibutes for the connection DTO
        // callback: passed in function to perform at the end of a Data Link Connection save, (e.g. save a Data Link Query)
        // save changes to data links
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var dataLink = new DataLink();
        if (!attrs) {
            attrs = this.getConnectionDataFromUI();
        }
        if (attrs.MachineId === '-1') {
            attrs.MachineId = undefined;
        }
        // Validate Name
        if (!this.isNameValidHandling(attrs.Name, 'DLCName')) {
            return false;
        }
        var originalPassword = $('input[name="OriginalPassword"]').val();
        var pass1 = $('#dataLinkConnections input[name="EncryptedPassword"]').val();
        var pass2 = $('#dataLinkConnections input[name="ConfirmEncryptedPassword"]').val();
        if (pass1 !== pass2) {  // Confirm that the passwords match
            ErrorHandler.addErrors({ 'ConfirmEncryptedPassword': Constants.c.passwordsMustMatch }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return false;
        }
        if (pass1 && attrs.DataLinkType === Constants.dlt.ODBC && attrs.ConnectionString.indexOf(Constants.UtilityConstants.PASSWORD_TOKEN) < 0) {
            ErrorHandler.addErrors({ 'pwdComment': String.format(Constants.c.noPwdInConnectString_T, Constants.UtilityConstants.PASSWORD_TOKEN) },
                css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'span', 'class');
            return false;
        }
        var that = this;
        var data = attrs;
        var connId = attrs.Id;
        var isNewConnection = (connId === Constants.c.emptyGuid);
        if (this.isUnique(attrs)) {
            if (isNewConnection || this.viewData.dirtyConnection || (event && $(event.currentTarget).length > 0)) { // Save connection if the connection is dirty or there is a new connection
                if (originalPassword) {
                    data = {
                        dataLink: attrs,
                        originalPassword: originalPassword
                    };
                }
                dataLink.save(data, {
                    success: function (result, response) {
                        var saveSucceeded = that.saveSuccess(result, response, attrs.Id, window.dataLinks, that);
                        if (saveSucceeded) {
                            that.changed(false);
                            connId = response.result.Id;
                            Utility.executeCallback(callback, connId);
                        }
                    }
                });
            }
            else {  // If the connection isn't dirty or new just perform the callback
                if (callback) {
                    callback(connId);
                }
            }
        } else {
            ErrorHandler.addErrors(Constants.c.duplicateNameError, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
    },
    killConnection: function (e, canDelete, closeFunc) {
        //do nothing if you try and delete -- New --
        var that = this;
        var name = $('#dataLinkConnections input[name="Name"]').val();
        var id = this.getComboBoxIdByName(name, $('#dataLinkConnection').find('select[name="Name"]'));
        if (id === Constants.c.emptyGuid) {
            return;
        }
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var model = window.dataLinks.get(id);
        var success = function (response) {
            // Need to also remove any data link queries associated with the connection
            var queries = $.extend(true, {}, window.dataLinkQueries);
            queries.each(function (dlq) {
                if (dlq.get('ConnectionId') === id) {
                    var query = window.dataLinkQueries.get(dlq.get('Id'));
                    window.dataLinkQueries.remove(query);
                }
            });
            window.dataLinks.remove(model);
            if (closeFunc) {
                closeFunc();
            }
        };
        var failure = function (jqXHR, textStatus, businessException) {
            if (businessException.Message && businessException.Type.match('OverridableException')) {
                ErrorHandler.displayOverridableDialogErrorPopup(businessException.Message, function (closeFunc) {
                    that.killConnection(null, true, closeFunc);
                }, { title: Constants.c.deleteConnection, okText: Constants.c.yes, closeText: Constants.c.no });
            } else {
                ErrorHandler.addErrors(businessException.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            }
        };
        this.dataLinkSvc.deleteDataLinkConnection(id, canDelete || false, success, failure);
    },
    getDataLinkType: function (getName) {
        var targ = $('input[name="DataLinkType"]:checked');         // Get the selected data link type radio.
        if (!targ || targ.length <= 0) {
            targ = $('input[name="DataLinkType"][type="hidden"]'); // If none, get the hidden input instead
        }
        if (getName) {
            return targ.attr('class');  // for both the radio buttons and the hidden input, the name stores the name of the type
        }
        return parseInt(targ.val(), 10); // and for both the radio buttons and the hidden input, the value is the integer value of the enum
    },
    changeDataLinkType: function (e) {
        var type = this.getDataLinkType(true);

        /******* DataLink Connection Definition ******/
        var template = $('#DLTT_' + type).clone(true, true);  // clone the corresponding dlt
        var settings = this.viewData.selected.get('Definition');
        if (settings) {
            settings = JSON.parse(settings);
        }
        var dltt = $('#dataLinkTypeTemplate');   // data link type template
        dltt.empty();   // Clear out data link type template of old settings
        var setting;
        for (setting in settings) {
            if (settings.hasOwnProperty(setting)) {
                var set = settings[setting];
                var settingInput = template.find('[name="' + setting + '"]');
                settingInput.val(set);
                settingInput.prop("checked", set);

                if (setting === 'EncryptedPassword') {
                    // Set original password to encrypted password as well as confirm password
                    template.find('input[name="OriginalPassword"]').val(set);
                    template.find('.confirmPass').val(set);
                }
            }
        }
        dltt.append($(template).children());  // Fill out data link type template with new settings
        if (Constants.dlt[type] === Constants.dlt.ODBC) {
            var connString = settings.ConnectionString || '';
            if (!connString && settings.DSNName) {
                connString = 'DSN=' + settings.DSNName;
            }
            $('#dataLinkLayout select[name="ConnectionString"]').combobox();
            $('#dataLinkLayout select[name="ConnectionString"]').parent().find('.isCombo').val(connString);
        }
        if (Constants.dlt[type] === Constants.dlt.Executable) {
            var executableName = '';
            if (settings.ExecutableName) {
                executableName = settings.ExecutableName;
            }
            $('#dataLinkLayout select[name="ExecutableName"]').combobox();
            $('#dataLinkLayout select[name="ExecutableName"]').parent().find('.isCombo').val(executableName);
        }

        /******* DataLink Query Definition ******/
        var templates = $('#DatalinkQueryTemplates .DLQT_' + type);
        var dlqt = $('#dataLinkQueryContainer ol');
        dlqt.empty();
        var templateLength = templates.length;
        var i = 0;
        for (i; i < templateLength; i++) {
            template = $(templates[i]).clone(true, true);  // clone the corresponding dlqt
            var li = $('<li></li>').append($(template).children()); //Crate a new list item that contains the template
            dlqt.append(li);  //Append li to OL
        }

        var isServerDL = !this.viewData.selected.get('MachineId');
        if (!Utility.isSuperAdmin() && isServerDL) {
            $('#dataLinkLayout .left').find('input, select, textarea').prop('disabled', true);
        }

        // advanced vs legacy parameters
        var useLegacyParameters = Constants.dlt[type] === Constants.dlt.Executable;
        $('#parameterDef input[name="ParameterRequired"]').attr('disabled', useLegacyParameters);
    },
    //#endregion

    //#region Connection Wizard
    buildConnection: function (e) {
        var connWiz = $('#connectionWizard');
        var that = this;
        if (!that.validateCanExecuteServerCall(that)) {
            return;
        }
        DialogsUtil.generalDialog(connWiz, {
            title: Constants.c.connectionWizard,
            width: 400,
            minWidth: 400,
            height: 250,
            minHeight: 250,
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    // Fill out Connection String, and passwords
                    var dto = DTO.getDTO(connWiz);
                    var serverName = dto.ServerName[0];
                    var dbName = dto.DBName[0];
                    var userName = dto.UserName[0];
                    var password = dto.Password;
                    var connString = Constants.UtilityConstants.SQL_CONNECTION_CREDENTIALS;
                    if (!userName) {
                        connString = Constants.UtilityConstants.SQL_CONNECTION_TRUSTED;
                    }
                    var connectionString = String.format(connString, serverName, dbName, userName);
                    $('#dataLinkTypeTemplate input[name="ConnectionString"]').val(connectionString);
                    $('#dataLinkTypeTemplate input[type="password"]').val(password);
                    $('#saveDataLinkConn').removeClass('disabledIcon');
                    $(connWiz).dialog('close');
                }
            },
            {
                text: Constants.c.close,
                click: function () {
                    $(connWiz).dialog('close');
                }
            }],
            open: function () {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                $('#serverList').combobox();
                $('#dbList').combobox();
                $('#dbList ~ .ui-combobox input').attr('readonly', "readonly");
                $('#dbList ~ .ui-combobox').on('mousedown', 'a', that.fillDatabases);
                var serverCombo = $('#serverList').parent().find('.isCombo');
                var serverIcon = $('#serverList').parent().find('.ui-icon');
                serverIcon.addClass('comboThrobber');
                connWiz.find('input').val('');
                var sf = function (data) {
                    var length = data.length;
                    var i = 0;
                    var source = [];
                    for (i; i < length; i++) {
                        var serverName = data[i].ServerName;
                        source.push(serverName);
                    }
                    // Fill out server dropdown
                    serverCombo.autocomplete({
                        source: source,
                        delay: Constants.TypeAheadDelay
                    });
                };
                var ff = function (result) {
                    ErrorHandler.displayGeneralDialogErrorPopup(JSON.parse(result.responseText).Error.Message);
                    $(connWiz).dialog('close');
                    serverCombo.autocomplete({
                        source: [],
                        delay: Constants.TypeAheadDelay
                    });
                };
                var cf = function () {
                    // Remove combothrobber to show list is done being loaded
                    serverIcon.removeClass('comboThrobber');
                };

                var svrDL = $('#selectDLService').val() === 'Server';
                var machineId = svrDL ? '' : $('#automationServiceSelect').val();
                that.dataLinkSvc.getSQLServers(machineId, sf, ff, cf);

            }
        });
    },
    fillDatabases: function (e) {
        // Fill out database dropdown
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var dto = DTO.getDTO($('#connectionWizard'));
        var dbCombo = $('#dbList').parent().find('.isCombo');
        var dbIcon = $('#dbList').parent().find('.ui-icon');
        var serverName = dto.ServerName[0];
        if (serverName) {
            var userName = dto.UserName[0];
            var password = dto.Password;

            dbIcon.addClass('comboThrobber');
            dbCombo.autocomplete({
                open: function () {
                    dbIcon.data('open', true);
                    dbCombo.focus();
                },
                close: function () {
                    dbIcon.data('open', false);
                },
                source: function (request, response) {
                    var sf = function (data) {
                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                        dbCombo.removeAttr('readonly');
                        response(data);
                    };
                    var ff = function (jqXHR, textStatus, bizEx) {
                        // Clear autocomplete list if there is an error
                        response([]);
                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                        ErrorHandler.addErrors({ 'connectionWizardError': bizEx.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    };
                    var cf = function () {
                        dbIcon.removeClass('comboThrobber');
                    };
                    var svrDL = $('#selectDLService').val() === 'Server';
                    var machineId = svrDL ? '' : $('#automationServiceSelect').val();
                    DataLinkServiceProxy().getSQLDatabases(machineId, serverName, userName, password, sf, ff, cf);

                },
                delay: Constants.TypeAheadDelay
            });
        } else {
            dbCombo.attr('readonly', "readonly");
            dbIcon.data('open', false);
        }
    },
    fillDSNNames: function (e) {
        var that = this;
        if (!that.validateCanExecuteServerCall(that)) {
            return;
        }
        var connStr = $('#dataLinkLayout select[name="ConnectionString"]');
        var connStrCombo = connStr.parent().find('.isCombo');
        var connStrIcon = connStr.parent().find('.ui-icon');
        connStrCombo.autocomplete({
            select: function () {
                $('#saveDataLinkConn').removeClass('disabledIcon');
            },
            source: function (request, response) {
                var sf = function (data) {
                    var idx;
                    var length = data.length;
                    for (idx = 0; idx < length; idx++) {
                        data[idx] = 'DSN=' + data[idx];
                    }
                    response(data);
                };
                var ff = function (jqXHR, textStatus, bizEx) {
                    // Clear autocomplete list if there is an error
                    response([]);
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    ErrorHandler.addErrors(bizEx.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                };
                var cf = function () {
                    connStrIcon.removeClass('comboThrobber');
                };
                connStrIcon.addClass('comboThrobber');
                var svrDL = $('#selectDLService').val() === 'Server';
                var machineId = svrDL ? '' : $('#automationServiceSelect').val();
                that.dataLinkSvc.getDSNNames(machineId, sf, ff, cf);

            },
            delay: Constants.TypeAheadDelay
        });
    },
    fillExecutableNames: function (e) {
        var that = this;
        if (!that.validateCanExecuteServerCall(that)) {
            return;
        }
        var exe = $('#dataLinkLayout select[name="ExecutableName"]');
        var exeCombo = exe.parent().find('.isCombo');
        var exeIcon = exe.parent().find('.ui-icon');
        exeCombo.autocomplete({
            select: function () {
                $('#saveDataLinkConn').removeClass('disabledIcon');
            },
            source: function (request, response) {
                var sf = function (data) {
                    response(data);
                };
                var ff = function (jqXHR, textStatus, bizEx) {
                    // Clear autocomplete list if there is an error
                    response([]);
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    ErrorHandler.addErrors(bizEx.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                };
                var cf = function () {
                    exeIcon.removeClass('comboThrobber');
                };
                exeIcon.addClass('comboThrobber');
                var svrDL = $('#selectDLService').val() === 'Server';
                var machineId = svrDL ? '' : $('#automationServiceSelect').val();
                that.dataLinkSvc.getDatalinkExecutables(machineId, sf, ff, cf);

            },
            delay: Constants.TypeAheadDelay
        });

    },
    //#endregion

    //#region Data link queries
    setNewQueryClass: function () {
        this.viewData.selectedQuery = this.getNewClass(window.dataLinkQueries);
        return this;
    },
    changeQuerySelection: function (event, selection) {
        var id = $(selection).val();
        if (id === Constants.c.emptyGuid) {
            this.setNewQueryClass();
        }
        else {
            var model = window.dataLinkQueries.get(id);
            this.viewData.selectedQuery = model;
            this.viewData.selected = window.dataLinks.get(model.get('ConnectionId'));
            // TODO: scain solve issue where typing a new name throws javascript error, on blur
        }
        this.render(true);
    },
    changeQueryType: function (ev) {
        if (!this.isThirdParty) {
            var targ = $(ev.currentTarget);
            var inputs = targ.parent().siblings().find('input');
            inputs.prop('disabled', '');
            if (targ.hasClass('readData')) {
                return;
            }

            var disableTargs = $('#dataLinkQueries').find('input[name="dataLinkAction"]:not(:checked)');
            var disableInputs = disableTargs.parent().siblings().find('input');
            disableInputs.prop('disabled', 'disabled').prop('checked', '');
            var includeDocsSel = $('input[name="IncludeDocs"]');
            var event = new $.Event();
            event.currentTarget = includeDocsSel;
            this.changeIncludeDocs(event);
        }
    },
    changeIncludeDocs: function (e) { // Whether to include documents or not, show/hide document format selection
        var targ = $(e.currentTarget);
        var docFormat = $('#dataLinkLayout .docFormat');
        var isChecked = targ.is(':checked');
        Utility.toggleCssClass(docFormat, 'hideData', (!isChecked));
        docFormat.find('input').attr('disabled', docFormat.hasClass('hideData'));

        //Automatically add / remove parameters for content and meta paths.
        var paramDefSel = $('#parameterDef');
        var paramSel = paramDefSel.find('select[name="Parameters"]');
        if (isChecked) {
            var data = {
                parameter_name: Constants.UtilityConstants.EXPORTED_CONTENT_PARAM,
                parameter_type: Constants.sqldbt.NVarChar,
                parameter_required: true,
                parameter_value: ' '
            };
            var option = paramSel.find('option:contains("' + data.parameter_name + '")');
            if (option.length === 0) {
                paramSel.append($('<option></option>').addClass("builtInParam").data(data).text(data.parameter_name));
            }

            data = {
                parameter_name: Constants.UtilityConstants.EXPORTED_META_PARAM,
                parameter_type: Constants.sqldbt.NVarChar,
                parameter_required: true,
                parameter_value: ' '
            };
            option = paramSel.find('option:contains("' + data.parameter_name + '")');
            if (option.length === 0) {
                paramSel.append($('<option></option>').addClass("builtInParam").data(data).text(data.parameter_name));
            }
        }
        else {
            paramSel.find('.builtInParam').remove();
        }
    },
    changeParameterValue: function (e) {
        var paramDefSel = $('#parameterDef');
        var paramSel = paramDefSel.find('select[name="Parameters"] :selected');
        if (paramSel.text() !== Constants.c.newTitle) {
            //paramSel.data('parameter_value', $(e.currentTarget).val());
            //paramSel.attr('data-parameter_value', $(e.currentTarget).val());
            var data = paramSel.data();
            data.parameter_value = $(e.currentTarget).val();
            paramSel.data(data);
        }
    },
    changeConnectionString: function (e) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        // ConnectionString validation present in prior versions has been removed, to allow arbitrary ones for ODBC or for future SQL implementations.
        // It is better to allow people to enter a bad one, which can be discovered through Test Live, then be unable to enter
        // the unusual but valid one they need.
    },
    /*
    * isUnique check the new against the existing.  do not allow same names on two data link connections
    * if there is an update and the guid is the same then it is considered unique...
    * @return boolean
    */
    isUniqueQuery: function (datalink) {
        var unique = true;
        window.dataLinkQueries.each(function (item) {
            if ($.trim(datalink.Name).toLowerCase() === $.trim(item.get('Name')).toLowerCase()) {
                if (datalink.Id !== item.get('Id')) {
                    unique = false;
                    return unique;
                }
            }
        });
        return unique;
    },
    saveDLQ: function () {
        // Save DLQ with a different name, but as the same DLQ
        var attrs = this.getQueryDataFromUI();
        if (attrs === null) {
            return;
        }
        attrs.Id = $('#dataLinkQueryList :selected').val();
        this.saveDataLinkQueryChanges(attrs);
    },
    saveDLQAs: function () {
        // Save DLQ with a different name and as a different DLQ
        var that = this;
        var attrs = this.getQueryDataFromUI();
        if (attrs === null) {
            return;
        }
        if (attrs.Id !== Constants.c.emptyGuid) {
            DialogsUtil.generalDialog('#saveAsDataLinkDialog',
                {
                    modal: true,
                    title: Constants.c.saveAs,
                    buttons: [{
                        text: Constants.c.ok,
                        click: function () {
                            if (attrs.Name !== $('#saveAsDataLinkDialog input[name="new_name"]').val()) {
                                attrs.Name = $('#saveAsDataLinkDialog input[name="new_name"]').val();
                                attrs.Id = Constants.c.emptyGuid;
                            }
                            $('#saveAsDataLinkDialog').dialog('close');
                            that.saveDataLinkQueryChanges(attrs);
                        }
                    },
                    {
                        text: Constants.c.close,
                        click: function () {
                            $('#saveAsDataLinkDialog').dialog('close');
                        }
                    }],
                    open: function () {
                        $('#saveAsDataLinkDialog input[name="new_name"]').val(attrs.Name);
                    },
                    close: function () {

                    }
                });
        } else {
            that.saveDataLinkQueryChanges(attrs);
        }

    },
    saveDataLinkQueryChanges: function (attrs) {
        // Make sure there is a connection selected before saving the query
        // If not throw an error as such
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var dataLinkQuery = new DataLinkQuery();
        if (!attrs) {
            attrs = this.getQueryDataFromUI();
        }
        if (!this.isNameValidHandling(attrs.Name, 'DLQName')) {
            return false;
        }
        if (this.isUniqueQuery(attrs)) {
            var that = this;
            var saveDLQuery = function (connId) {
                attrs.ConnectionId = connId;
                dataLinkQuery.save(attrs, {
                    success: function (result, response) {
                        that.saveSuccess(result, response, attrs.Id, window.dataLinkQueries, that, null, null, 'selectedQuery');
                    }
                });
            };
            that.saveDLC(null, saveDLQuery);
        } else {
            ErrorHandler.addErrors(Constants.c.duplicateNameError, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
    },
    killQuery: function (e) {
        var name = $('#dataLinkQueries input[name="Name"]').val();
        var id = this.getComboBoxIdByName(name, $('#dataLinkQueries').find('select[name="Name"]'));
        if (id === Constants.c.emptyGuid) {
            return;
        }
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var model = window.dataLinkQueries.get(id);
        var success = function (response) {
            window.dataLinkQueries.remove(model);
        };
        var failure = function (jqXHR, textStatus, businessException) {
            ErrorHandler.addErrors(businessException.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        };
        this.dataLinkSvc.deleteDataLinkQuery(id, success, failure);
    },
    // Parameter Functionality
    saveParameter: function (e) {
        if ($(e.currentTarget).hasClass('disabled')) {
            return;
        }
        // Add / Edit a Parameter
        var paramDefSel = $('#parameterDef');
        var paramSel = paramDefSel.find('select[name="Parameters"]');
        var attrs = DTO.getDTO(paramDefSel);
        var name = attrs.ParameterName;
        if (!this.validateParameterName()) {
            return false;
        }
        var isEdit = false;
        var param = paramSel.find(':selected');
        if (param.text() !== Constants.c.newTitle) {
            isEdit = true;
        }
        var data = {
            parameter_name: name,
            parameter_type: Constants.sqldbt[attrs.ParameterType],
            parameter_value: attrs.ParameterValue,
            parameter_required: attrs.ParameterRequired
        };
        if (isEdit) {
            param.attr('data-parameter_value', attrs.ParameterValue).data(data);
            // Edit Parameter - Modify an already existing parameters values
            param.text(name);
        }
        else {
            // Add Parameter - Add parameter to parameter select list
            paramSel.append($('<option></option>').attr('data-parameter_value', attrs.ParameterValue).data(data).text(name));
        }
        paramSel.find('option:first').prop('selected', 'selected');
        var that = this;
        this.triggerParamSelection(paramSel, function (ev) {
            that.changeParamSelection(ev);
        });
        $('#saveDLQParam').addClass('disabled');    // Successful save, disable save button
    },
    deleteParameter: function (e) {
        var paramSel = $('#parameterDef').find('select[name="Parameters"]');
        if ($('#delDLQParam').hasClass('disabled') || paramSel.find('option').first().is(':selected')) {
            return;
        }
        // Remove selected parameter from the parameter select list
        paramSel.find('option:selected').remove();
        // Select first item in the select list
        paramSel.find('option:first').prop('selected', true);
        var that = this;
        this.triggerParamSelection(paramSel, function (ev) {
            that.changeParamSelection(ev, true);
        });
    },
    triggerParamSelection: function (selectList, change) {
        // Trigger select list change
        // selectList: select list in which to trigger the change event
        // change: function that would occur on a normal change event
        var ev = new $.Event();
        ev.currentTarget = selectList;
        if (change) {
            change(ev);
        }
    },
    changeParamSelection: function (e, skipValidation) {
        this.changingParamSelection = true;
        var targ = $(e.currentTarget).find(':selected');
        var paramDefSel = $('#parameterDef');
        var paramNameSel = paramDefSel.find('input[name="ParameterName"]');
        var paramValSel = paramDefSel.find('input[name="ParameterValue"]');
        var paramReqSel = paramDefSel.find('input[name="ParameterRequired"]');
        if (targ.text() === Constants.c.newTitle) { // If query parameter is --New--, clear any data that is set
            $('#saveDLQParam').html(Constants.c.add);
            paramNameSel.val('');
            paramDefSel.find('select[name="ParameterType"] option:first').attr('selected', 'selected');
            paramValSel.val('');
            paramReqSel.removeAttr('checked');
            $('#delDLQParam, #saveDLQParam').addClass('disabled');
            this.changingParamSelection = false;
            return;
        }
        $('#saveDLQParam').html(Constants.c.save);
        $('#delDLQParam').removeClass('disabled');
        var attrs = targ.data();
        if (!attrs) {
            this.changingParamSelection = false;
            return;
        }
        // select list of types
        var types = paramDefSel.find('select[name="ParameterType"]').find('option');
        var i = 0;
        var length = types.length;
        for (i; i < length; i++) {
            var type = $(types[i]);
            if (Constants.sqldbt[type.text()] === attrs.parameter_type) {
                type.prop('selected', 'selected');  // select proper type from select list
                break;
            }
        }
        // fixed type
        paramDefSel.find('input[name="ParameterType"]').val(Utility.reverseMapObject(Constants.sqldbt)[attrs.parameter_type]);
        paramNameSel.val(attrs.parameter_name);
        paramValSel.val(attrs.parameter_value);
        // required
        paramReqSel.prop('checked', attrs.parameter_required);
        // validate
        if (!skipValidation) {
            var validateParam = new $.Event();
            validateParam.currentTarget = paramNameSel;
            this.validateParameter(validateParam);
        }
        this.changingParamSelection = false;
    },
    validateParameterName: function () {    // Validate a query parameter name, so it isn't empty, -- New --, or a duplicate
        var paramName = $('#dataLinkQueries input[name="ParameterName"]').val();
        var params = $('#dataLinkQueries select[name="Parameters"] option');
        var length = params.length;
        var errObj = {};
        var errDispName = 'ParameterName';
        if (!paramName) {
            errObj[errDispName] = Constants.c.blankParameterName;
            ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return false;
        }
        if (!paramName.startsWith('@') && paramName.length > 0) {
            errObj[errDispName] = Constants.c.invalidParameterName;
            ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return false;
        }
        var i;
        for (i = 0; i < length; i++) {
            var param = $(params[i]);
            if (param.text().trim().toLowerCase() === paramName.trim().toLowerCase() && !param.is(':selected')) { // query parameter names match and it isn't the selected parameter
                errObj[errDispName] = Constants.c.duplicateNameError;
                ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                return false;
            }
        }
        return true;
    },
    validateParameter: function (e) {   // Validate query parameter so it can be saved
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var targ = $(e.currentTarget);
        var validParamName = this.validateParameterName();
        Utility.toggleCssClass('#saveDLQParam', 'disabled', this.changingParamSelection || !targ.val() || !validParamName);
    },
    //#endregion

    //#region Grid Functionality
    /*
        Fill a grid with test data returned from a SQL statement Query
        @data: tabular data arranged in columns
    */

    fillQueryTestGrid: function (data) {
        var gridRO = {
            headers: [],
            rows: []
        };
        var column;
        var numRows;
        var columnData;
        var columns = data.Columns;
        var minColWidth = 50;
        var style = '';
        if (columns.length * minColWidth > this.$el.width()) {
            style = 'width:' + minColWidth + 'px;';
        }
        for (column in columns) {
            if (columns.hasOwnProperty(column)) {
                columnData = columns[column];
                var columnName;
                var columnValue;
                if (columnData.Key !== undefined) {
                    columnName = columnData.Key;
                    columnValue = columnData.Value;
                } else {
                    columnName = column;
                    columnValue = columnData;
                }
                // each column in data has the same length
                numRows = columnValue.length;
                gridRO.headers.push({ columnId: columnName, value: Utility.safeHtmlString(columnName), style: style });
            }
        }
        for (i = 0; i < numRows; i++) {
            gridRO.rows[i] = { values: [] };
            var col;
            for (col in columns) {   // Determine column data for a single row
                if (columns.hasOwnProperty(col)) {
                    columnData = columns[col];
                    if (columnData.Key !== undefined) {
                        gridRO.rows[i].values.push(Utility.safeHtmlString(columnData.Value[i]));//from server
                    }
                    else {
                        gridRO.rows[i].values.push(Utility.safeHtmlString(columnData[i]));//from client
                    }
                }
            }
        }
        this.showGrid(gridRO);
    },
    /*
        Fill a grid with test data returned from a SQL statement Update
        @affectedRows: number of rows affected by the SQL statement
    */
    fillUpdateTestGrid: function (affectedRows) {
        var gridRO = {
            headers: [{ columnId: Constants.c.numAffectedRows, value: Constants.c.numAffectedRows }],
            rows: [{ values: [affectedRows] }]
        };
        this.showGrid(gridRO);
    },
    fillTestAllGrid: function (data) {
        var gridRO = {
            headers: [
                { columnId: Constants.c.dataLinkConnection, value: Constants.c.dataLinkConnection },
                { columnId: Constants.c.dataLinkQuery, value: Constants.c.dataLinkQuery },
                { columnId: Constants.c.testStatus, value: Constants.c.testStatus }],
            rows: []
        };
        var getQuery = function (item) {    // Find corresponding query
            if (item.get('Id') === data[datum].Key) {
                return item;
            }
        };
        var getConnection = function (item) {   // Find corresponding connection
            if (item.get('Id') === query.get('ConnectionId')) {
                return item;
            }
        };
        var datum;
        for (datum in data) {   // Determine column data for a single row
            if (data.hasOwnProperty(datum)) {
                var queries = window.dataLinkQueries;
                var query = queries.find(getQuery);
                var connections = window.dataLinks;
                var connection = connections.find(getConnection);
                gridRO.rows.push({
                    values: [
                        Utility.safeHtmlString(connection.get('Name')),
                        Utility.safeHtmlString(query.get('Name')),
                        Utility.safeHtmlString(data[datum].Value)
                    ]
                });
            }
        }
        this.showGrid(gridRO);
    },
    /*
        Shows the grid already filled in the gridRO
        @gridRO: grid rendering object
    */
    showGrid: function (gridRO) {
        this.testGrid = new StaticDataGridView({ renderObject: gridRO });
        $('#dataLinkTestResults').html(this.testGrid.render().$el);

        DialogsUtil.generalCloseDialog('#dataLinkDialog',
        {
            title: Constants.c.testData,
            width: 700,
            height: 'auto',
            maxHeight: $(window).height()
        });
    },
    //#endregion

    //#region Test Functionality
    test: function (e) {
        if (this.testGrid) {
            this.testGrid.close();
            this.testGrid = undefined;
        }
        var that = this;
        if (!that.validateCanExecuteServerCall(that)) {
            return;
        }
        var targ = $(e.currentTarget);
        if (targ.hasClass('disabled')) {
            return false;
        }
        targ.addClass('disabled');
        var id = targ.attr('id');   // id of event target is the name of the function to call
        var isQuery = $('input[name="dataLinkAction"]:checked').hasClass('readData');
        var queryType = isQuery ? 'Query' : 'Update';
        var success = function (data, skipfill) {
            targ.removeClass('disabled');
            if (isQuery && !skipfill) {
                that.fillQueryTestGrid(data);
            }
            else if (!skipfill) {
                that.fillUpdateTestGrid(data);
            }
        };
        var failure = function (jqXHR, textStatus, businessException) {
            targ.removeClass('disabled');
            ErrorHandler.addErrors(businessException.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        };
        that[id](success, failure, queryType);

    },
    testAll: function (success, failure, queryType) {
        var that = this;
        var s2 = function (data) {
            that.fillTestAllGrid(data);
            success(data, true);
        };
        this.dataLinkSvc.executeAllTests(s2, failure);
    },
    testLive: function (success, failure, queryType) {
        var connection = this.getConnectionDataFromUI();
        var query = this.getQueryDataFromUI();
        if (query) {
            query.DataLinkConnection = connection;
            this.dataLinkSvc['executeLive' + queryType + 'Test'](connection, query, success, failure);
        }
        else {
            $('#testLive').removeClass('disabled');
        }
    },
    testSaved: function (success, failure, queryType) {
        var query = this.viewData.selectedQuery;
        if (query) {
            var queryId = query.get('Id');
            this.dataLinkSvc['execute' + queryType + 'Test'](queryId, success, failure);
        }
    },
    //#endregion

    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (model, error) {
        var errors = {};
        if (error.statusText === undefined) {
            errors = error;
        }
        else {
            errors = error.statusText;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    },
    getConnectionDataFromUI: function () {
        var connection = DTO.getDTOCombo($('#dataLinkConnections'));
        if (connection.ConnectionString && typeof connection === "object" && connection.ConnectionString[0]) { // if it is a combo, get the selected value
            connection.ConnectionString = connection.ConnectionString[0];
        }
        connection.DataLinkType = parseInt(connection.DataLinkType, 10);
        var dlttSettings = DTO.getDTO($('#dataLinkTypeTemplate'));  // Obtain data link settings for data link types
        if (dlttSettings.ConnectionString && typeof dlttSettings.ConnectionString === "object" && dlttSettings.ConnectionString[0]) { // and do this again for Definition
            dlttSettings.ConnectionString = dlttSettings.ConnectionString[0];
        }
        if (dlttSettings.ExecutableName) {
            dlttSettings.ExecutableName = dlttSettings.ExecutableName[0];
        }
        delete dlttSettings.ConfirmEncryptedPassword;
        connection.Definition = JSON.stringify(dlttSettings);    // Fill out Definition with settings
        connection.MachineId = $('#automationServiceSelect').val();
        if (connection.MachineId === "-1") {
            connection.MachineId = undefined;
        }
        return connection;
    },
    getQueryDataFromUI: function () {
        var attrs = DTO.getDTOCombo($('#dataLinkQueries')); // Fetch query DTO
        var queryDef = DTO.getDTO($('#dataLinkQueryDef'));  // Fetch query definition

        var parameters = $('#dataLinkQueryContainer #parameterDef select[name="Parameters"] option'); //#parameterDef exists both in template and display, #dataLinkQueryContainer contains the one we want.
        var i = 0;
        var length = parameters.length;
        var paramCount = 0;
        var dataLinkType = this.getDataLinkType();
        var useLegacyParameters = dataLinkType === Constants.dlt.Executable; // Only Executable uses legacy types.  We may add way for executables to use advanced types some day.
        var legacyParams;
        var paramVals;
        var params;
        if (useLegacyParameters) {
            legacyParams = {};
            paramVals = {};
        } else {
            params = {};
        }
        for (i; i < length; i++) {
            var parameter = $(parameters[i]);
            if (parameter && parameter.text() !== Constants.c.newTitle) {
                var data = parameter.data();
                //data.parameter_type = parameter.attr('data-parameter_type');
                //data.parameter_value = parameter.attr('data-parameter_value');
                //data.parameter_required = parameter.attr('data-parameter_required');
                //data.parameter_name = parameter.attr('data-parameter_name');
                if (useLegacyParameters) {
                    // Set Parameters
                    legacyParams[data.parameter_name] = data.parameter_type;
                    // Set Parameter Values
                    paramVals[data.parameter_name] = data.parameter_value; // TODO parameter.attr('data-parameter_value');
                } else {
                    // Parameter type, value, and required flag are set in same dictionary
                    params[data.parameter_name] = { Type: data.parameter_type, Value: data.parameter_value, Required: data.parameter_required };
                }
                if (data.parameter_name !== Constants.UtilityConstants.EXPORTED_CONTENT_PARAM && data.parameter_name !== Constants.UtilityConstants.EXPORTED_META_PARAM) {
                    paramCount++;
                }
            }
        }

        // validate
        if (attrs.Dropdown) {
            if (paramCount !== 0) {
                ErrorHandler.addErrors(Constants.c.dropDownParametersError, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                return null;
            }
        }
        if (attrs.TypeAhead) {
            if (paramCount !== 1) {
                ErrorHandler.addErrors(Constants.c.typeAheadParametersError, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                return null;
            }
        }

        var includeDocs = attrs.IncludeDocs;
        if ($('input[name="dataLinkAction"]:checked').hasClass('readData')) {
            // Set QueryDefinition if ReadData
            attrs.UpdateDefinition = undefined;
            attrs.QueryDefinition = {
                CommandText: queryDef.CommandText,
                ExportPath: includeDocs ? attrs.ExportPath : '',
                Params: params,
                Parameters: legacyParams,
                ParameterValues: paramVals,
                DropDown: attrs.Dropdown,
                TypeAhead: attrs.TypeAhead
            };
        }
        if ($('input[name="dataLinkAction"]:checked').hasClass('populateData')) {
            // Set UpdateDefinition if PopulateData
            attrs.UpdateDefinition = {
                CommandText: queryDef.CommandText,
                ExportPath: includeDocs ? attrs.ExportPath : '',
                Params: params,
                Parameters: legacyParams,
                ParameterValues: paramVals
            };
            attrs.QueryDefinition = undefined;
        }
        attrs.QueryDefinition = JSON.stringify(attrs.QueryDefinition);
        attrs.UpdateDefinition = JSON.stringify(attrs.UpdateDefinition);

        var connAttrs = DTO.getDTOCombo($('#dataLinkConnections'));  // Fetch connection DTO
        attrs.ConnectionId = connAttrs.Id;
        attrs.ConnectionName = connAttrs.Name;
        return attrs;
    },
    validateCanExecuteServerCall: function (that) {
        var isNew = that.viewData.selected.get('Id') === Constants.c.emptyGuid;
        if (isNew) {
            return true;
        }
        var machineId = that.viewData.selected.get('MachineId');
        var isServerConnection = true;
        if (machineId && machineId !== "-1") {
            isServerConnection = false;
        }

        if (isServerConnection && !Utility.isSuperAdmin()) {
            ErrorHandler.addErrors(Constants.c.serverDatalinkSuperAdminOnly);
            return false;
        }
        return true;
    },
    closeAutocomplete: function () {
        var $acInput = $("input.ui-autocomplete-input");
        if ($acInput.autocomplete('instance')) {
            $acInput.autocomplete("close");
        }
    },
    resetTypeAheadDropDown: function (Type, isChecked) {
        if (!this.isThirdParty) {
            if (Type === 'TypeAhead') {
                if (isChecked) {
                    $("input[name='Dropdown']").attr("disabled", true).attr("title", Constants.c.typeAheadDropDownBothSelectedError);
                }
                else {
                    $("input[name='Dropdown']").attr("disabled", false).attr("title", "");
                }
            }
            else {
                if (isChecked) {
                    $("input[name='TypeAhead']").attr("disabled", true).attr("title", Constants.c.typeAheadDropDownBothSelectedError);
                }
                else {
                    $("input[name='TypeAhead']").attr("disabled", false).attr("title", "");
                }
            }
        }
    }
});