/// <reference path="../../Content/LibsInternal/Utility.js" />
/// <reference path="../../Content/LibsInternal/ErrorHandler.js" />
var LDAPEditView = Backbone.View.extend({
    viewData: {},
    collection: undefined,
    gridView: undefined,
    gvOptions: undefined,
    instanceData: {},
    className: 'LDAPEditView',
    events: {
        "keyup input[name='Port']": "setCustomPort",
        "change input[name='ldapPort']": "updatePort",
        "click #saveLDAPConn": "saveChanges",
        "click #deleteLDAPConn": "kill",
        "keyup .slapBoxProps input": "updateInstanceData",
        "change #ldapSlapBox .inclusionList": "displayInstanceProps",
        "click #ldapSlapBox .addToInclusion": "updateInstanceData",
        "click #ldapSlapBox .removeFromInclusion": "updateInstanceData"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editldapconnectionlayout'));
        this.slapboxview = new SlapBoxView({ el: '#ldapSlapBox' });
        this.gvOptions = {};
        return this;
    },
    render: function () {
        var newItem = new LDAPConnection({ Id: Constants.c.emptyGuid, Connection: { Id: Constants.c.emptyGuid, Domain: Constants.c.newTitle }, Instances: [{ Id: Constants.c.emptyGuid, Priority: 1, Filter: '', InstanceId: window.InstanceId }] });
        this.collection = window.ldapConnections.getNewList(newItem);
        this.viewData.list = this.collection;
        this.viewData.proxies = window.ldapProxies || [];
        var html_data = this.compiledTemplate(this.viewData);
        this.$el.html(html_data);
        if (this.gridView && this.gridView.close) {
            this.gridView.close();
        }
        this.initGrid();
        this.gridView = new StaticDataGridView(this.gvOptions);
        $('#ldapDTO').before(this.gridView.render().$el);
        this.gvOptions.onRowSelect({ rowId: newItem.get('Id') });
        this.delegateEvents(this.events);
        return this;
    },
    initGrid: function () {
        var that = this;
        this.gvOptions.renderObject = { rows: [] };
        //Not sortable at this time, could be easily by removing the commented out columnId below and adding a onSortGrid to the gvOptions.
        this.gvOptions.renderObject.headers = [
            { columnId: 'Domain', value: Constants.c.domain },
            { columnId: 'Host', value: Constants.c.host },
            { columnId: 'RootDN', value: Constants.c.rootDN },
            { columnId: 'Port', value: Constants.c.port },
            { columnId: 'Instances', value: Constants.c.instances }
        ];
        var idx = 0;
        var length = this.gvOptions.renderObject.headers.length;
        // Set a width for the headers
        for (idx; idx < length; idx++) {
            this.gvOptions.renderObject.headers[idx].style = 'width: ' + ((100 / length) + '%');
        }
        this.gvOptions.onRowSelect = function (options) {
            that.collection.setSelected(options.rowId);
            var model = that.collection.get(options.rowId);
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            that.displaySelectionData(model);
            that.slapboxview.render(that.getSlapBoxData, window.companyInstances);
            that.setLDAPInstanceGrid(model);
            that.setLDAPConnectionGrid();
            var $inList = $('#ldapSlapBox .inclusionList');
            $inList.find('option:first').attr('selected', 'selected');
            $inList.trigger('change');
        };
    },
    displaySelectionData: function (model) {
        var data = model.get('Connection');
        // Upon selection fill out the corresponding data for each field
        $('#ldapDTO input[name="Id"]').val(data.Id);
        $('#ldapDTO input[name="Domain"]').val(data.Domain);
        $('#ldapDTO input[name="Host"]').val(data.Host);
        $('#ldapDTO input[name="RootDN"]').val(data.RootDN);
        $('#ldapDTO input[name="Port"]').val(data.Port);
        $('#ldapDTO input[name="Username"]').val(data.Username);
        if (data.ProxyMachineId) {
            var option = $('#ldapDTO select[name="ProxyMachineId"]').find('option[value="' + data.ProxyMachineId + '"]');
            if (option.length === 0) {
                option = $('<option></option>').attr('value', data.ProxyMachineId).text(data.Domain + ' - ' + Constants.c.ldapProxyOffline);
                $('#ldapDTO select[name="ProxyMachineId"]').append(option);
            }
        }
        $('#ldapDTO select[name="ProxyMachineId"]').val(data.ProxyMachineId);
        // Set port for editing
        var portEv = new $.Event();
        portEv.currentTarget = 'input[name="Port"]';
        this.setCustomPort(portEv);
        this.initInstanceData();
    },
    setLDAPConnectionGrid: function () {
        var rows = [];
        this.gvOptions.renderObject.rows = rows;
        var len = this.collection.length;
        var i = 0, j = 0, k = 0;
        var compInsts = window.companyInstances;
        var compInstLen = compInsts.length;
        var compInstName = '';
        for (i = 0; i < len; i++) {
            var model = this.collection.at(i);
            var entity = model.get('Connection');
            var row = {
                rowClass: model.get('selected') ? 'customGridHighlight' : '',
                id: entity.Id,
                values: [
                     Utility.safeHtmlString(entity.Domain),
                     Utility.safeHtmlString(entity.Host),
                     Utility.safeHtmlString(entity.RootDN),
                     entity.Port
                ]
            };
            var instances = model.get('Instances');
            var instLen = instances.length;
            var instanceNames = [];
            for (j = 0; j < instLen; j++) { // join instances, comma separated, to display in grid
                for (k = 0; k < compInstLen; k++) {
                    var instId = compInsts.at(k).get('Id');
                    if (instId === instances[j].InstanceId) {
                        compInstName = compInsts.at(k).get('Name');
                    }
                }
                instanceNames.push(compInstName);
            }
            row.values.push(Utility.safeHtmlString(instanceNames.join(', ')));
            rows.push(row);
        }
        this.gridView.render();
    },
    setLDAPInstanceGrid: function (model) {
        var instances = model.get('Instances');
        var length = instances.length;
        var i = 0, j = 0;
        var primary = $('#ldapSlapBox .primaryList');
        var opts = primary.find('option');
        var optLength = opts.length;
        for (i = 0; i < length; i++) {
            var id = instances[i].InstanceId;
            for (j = 0; j < optLength; j++) {
                var opt = $(opts[j]);
                if (id === opt.attr('id')) {
                    opt.attr('selected', 'selected');   // select option to be moved to inclusion list
                    break;
                }
            }
        }
        $('#ldapDTO input[name="Priority"]').val(1);
        $('#ldapDTO input[name="Filter"]').val('');
        this.slapboxview.addToInclusion();  // Add to inclusion list, whilst removing it from the primary list
    },
    displayInstanceProps: function () {
        // Display the properties for the selected instance list   
        var i = 0;
        var opts = $('#ldapSlapBox .inclusionList option:selected');
        var instanceData = this.instanceData;
        var instance;
        // get data from selected row in ldap connections grid
        if (opts.length === 1) {
            var id = opts.attr('id');
            var length = instanceData.length;
            for (i = 0; i < length; i++) {
                if (id === instanceData[i].InstanceId) {
                    instance = instanceData[i];
                    break;
                }
            }
        }
        if (instance) {
            $('#ldapDTO input[name="Priority"]').val(instance.Priority);
            $('#ldapDTO input[name="Filter"]').val(instance.Filter);
            var instanceModel = window.companyInstances.get(instance.InstanceId);
            $('#ldapDTO .selectedSite').text((instanceModel && instanceModel.get('Name')) || '');
            $('#ldapDTO .slapBoxProps').show();
        }
        else {
            $('#ldapDTO .slapBoxProps').hide();
        }
    },
    initInstanceData: function () { // initialize instance data for the selected connection
        var i = 0;
        this.instanceData = [];
        var instanceData;
        var model = this.collection.getSelected();
        if (model) {
            instanceData = model.get('Instances');
        }
        if (instanceData) {
            var length = instanceData.length;
            for (i = 0; i < length; i++) {
                var instance = instanceData[i];
                this.instanceData.push({
                    InstanceId: instance.InstanceId,
                    Priority: instance.Priority,
                    Filter: instance.Filter
                });
            }
        }
    },
    updateInstanceData: function (e) {   // for updating any changes made to instance data (priority / filter, for the selected connection)
        var opts = $('#ldapSlapBox .inclusionList option');
        var len = opts.length;
        var selectedOpts = opts.filter(':selected');
        var remove = $(e.currentTarget).hasClass('removeFromInclusion');
        var add = $(e.currentTarget).hasClass('addToInclusion');
        var instance;
        var instanceId;
        var instanceData = this.instanceData;
        var length = instanceData.length;
        var i = 0, j = 0;
        var tmpData = [];
        if (remove) {
            for (j = 0; j < len; j++) {
                instanceId = $(opts[j]).attr('id');
                for (i = 0; i < length; i++) {
                    if (instanceId === instanceData[i].InstanceId) {
                        tmpData.push(instanceData[i]);
                    }
                }
            }
            instanceData = tmpData;
        }
        else if (add) {
            for (j = 0; j < len; j++) {
                instanceId = $(opts[j]).attr('id');
                instance = '';
                for (i = 0; i < length; i++) {
                    if (instanceId === instanceData[i].InstanceId) {// If the instance is in the array update its values                        
                        instance = instanceData[i];
                        break;
                    }
                }
                if (!instance) {    // If the instance isn't in the array add it to the array
                    instanceData.push({
                        InstanceId: instanceId,
                        Priority: 1,
                        Filter: ''
                    });
                }
            }
        }
        else {
            if (selectedOpts.length === 1) {
                var opt = $(selectedOpts[0]);
                instanceId = opt.attr('id');
                instance = '';
                for (i = 0; i < length; i++) {
                    if (instanceId === instanceData[i].InstanceId) {// If the instance is in the array update its values                        
                        instance = instanceData[i];
                        instance.Priority = $('#ldapDTO input[name="Priority"]').val();
                        instance.Filter = $('#ldapDTO input[name="Filter"]').val();
                        break;
                    }
                }
            }
        }
        this.instanceData = instanceData;
        if (add && selectedOpts.length === 0) {
            opts.filter(':first').attr('selected', 'selected');
        }
        this.displayInstanceProps();
    },
    setCustomPort: function (e) {   // If custom port corresponds to custom or ssl check the corresponding radio button
        // Uncheck port radio buttons if the custom doesn't display the standard
        $('input[name="ldapPort"]').removeAttr('checked');
        var targ = $(e.currentTarget);
        var port = targ.val();
        var portEv = new $.Event();
        var sel;
        // Select standard when no port is set or when port IS standard
        if ((!e.type && !port) || port === Constants.UtilityConstants.STDPORT) {
            sel = 'input.standardPort';
            $(sel).attr('checked', 'checked');
            portEv.currentTarget = sel;
        }
        else if (port === Constants.UtilityConstants.SSLPORT) {
            sel = 'input.sslPort';
            $(sel).attr('checked', 'checked');
            portEv.currentTarget = sel;
        }
        this.updatePort(portEv);
    },
    updatePort: function (e) {
        // Update selected radio button
        var targ = $(e.currentTarget);
        var portSel = $('input[name="Port"]');
        if (targ.hasClass('standardPort')) {
            portSel.val(Constants.UtilityConstants.STDPORT);
        }
        else if (targ.hasClass('sslPort')) {
            portSel.val(Constants.UtilityConstants.SSLPORT);
        }
    },
    getMethod: function (ldapConnId) {  // obtain ldapconnection from window.ldapConnections based on passed in id
        var conns = this.collection;
        var len = conns.length;
        var i = 0;
        for (i; i < len; i++) {
            var conn = conns.at(i);
            var entity = conn.get('Connection');
            var id = entity.Id;
            if (id === ldapConnId) {
                return conn;
            }
        }
    },
    getSlapBoxData: function (instance) {   // obtain data from collection for displaying inside the slap box view
        var data = {
            id: instance.get('Id'),
            name: instance.get('Name')  // NOTE: this may change down the road, currently only one instance per company (so display company's name)
        };
        return data;
    },
    getLDAPSetPkg: function (attrs) {
        var pkg = {
            Connection: {
                Id: attrs.Id === Constants.c.emptyGuid ? undefined : attrs.Id, //Marks as new or update
                Domain: attrs.Domain,//NOTE: Data is set at the server based on the values below.
                Host: attrs.Host,
                RootDN: attrs.RootDN,
                Port: attrs.Port,
                Username: attrs.Username,
                Password: attrs.Password,
                ProxyMachineId: attrs.ProxyMachineId
            },
            Instances: attrs.Instances,
            SkipConnectionText: attrs.dontTest
        };
        return pkg;
    },
    saveChanges: function (e, dontTest) {
        var that = this;
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var attrs = DTO.getDTO('#ldapDTO');
        if (!dontTest) {
            dontTest = false;
        }
        attrs.dontTest = dontTest; // !attrs.DontTest;   // Negate, UI displays it as Test Connection
        attrs.Instances = this.instanceData;
        if (attrs.Password === Constants.c.hiddenPass) {
            attrs.Password = undefined;
        }
        Utility.toggleInputButtons('#saveLDAPConn, #deleteLDAPConn', false);
        if (!this.isNameValidHandling(attrs.Domain, 'Domain', false)) {
            Utility.toggleInputButtons('#saveLDAPConn, #deleteLDAPConn', true);
            return false;
        }

        var ldapSetPkg = that.getLDAPSetPkg(attrs);
        var newClass = new LDAPConnection(ldapSetPkg);
        newClass.on("invalid", function (model, error) { that.handleErrors(model, error); });
        if (this.isUnique(attrs) === true) {
            newClass.save(ldapSetPkg, {
                success: function (model, result) {
                    if (typeof (result) !== 'boolean') {    //On create update the id of the model 
                        model.set({ "Id": result.Connection.Id }, { "silent": true });
                    }
                    that.saveSuccess(model, result, attrs.Id, window.ldapConnections, that, null);
                    that.render();
                },
                failure: function (message) {
                    if (message.Type && message.Type.match(/COMException/ig)) {  // Not validated, save without validation?
                        // pop up dialog to determine whether or not to save the connection that has not validated.
                        var msg = String.format(Constants.c.failedValidation, '\n\n' + message.Message + '\n');
                        var func = function (closeFunc) {
                            that.saveChanges(e, true);
                            if (closeFunc) {
                                closeFunc();
                            }
                        };
                        ErrorHandler.displayOverridableDialogErrorPopup(msg, func);
                    }
                    else {
                        ErrorHandler.addErrors({ 'errors_LDAP': message.Message || message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                    }
                },
                complete: function () {
                    Utility.toggleInputButtons('#saveLDAPConn, #deleteLDAPConn', true);
                }
            });
        } else {
            ErrorHandler.addErrors({ 'Domain': Constants.c.duplicateTitle }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            Utility.toggleInputButtons('#saveLDAPConn, #deleteLDAPConn', true);
        }
    },
    kill: function (e) {
        var that = this;
        var model = this.collection.getSelected();
        if (!model || model.get('Id') === Constants.c.emptyGuid) {   // can't delete  -- New --
            ErrorHandler.addErrors(Constants.c.cannotDeleteNew, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            return;
        }
        Utility.toggleInputButtons('#saveLDAPConn, #deleteLDAPConn', false);
        var success = function (r) {
            that.collection.remove(model);
            window.ldapConnections.remove(model);
            that.setLDAPConnectionGrid();
            that.gvOptions.onRowSelect({ rowId: Constants.c.emptyGuid });
        };
        var failure = function (xhr, statusText, error) {
            ErrorHandler.addErrors({ 'errors_LDAP': error.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        };
        var complete = function () {
            Utility.toggleInputButtons('#saveLDAPConn, #deleteLDAPConn', true);
        };
        model.destroy({ success: success, failure: failure, complete: complete });
    },
    /*
    * isUnique check the new against the existing.  do not allow same names on two LDAP connections
    * if there is an update and the guid is the same then it is considered unique...
    * @return boolean
    */
    isUnique: function (ldapConn) {
        var unique = true;
        window.ldapConnections.each(function (item) {
            if (ldapConn.Domain.toLowerCase() === item.get('Connection').Domain.toLowerCase()) {
                if (ldapConn.Id !== item.get('Connection').Id) {
                    unique = false;
                }
            }
        });
        return unique;
    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (model, error) {
        var errors = {};
        if (error.statusText === undefined) {
            errors.errors_LDAP = error;
        }
        else {
            errors.errors_LDAP = error.statusText;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    }
});