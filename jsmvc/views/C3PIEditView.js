/// <reference path="../../Content/JSProxy/AutomationHubProxy.js" />
/// <reference path="~/Content/LibsInternal/ClientService.js" />
var C3PIEditView = Backbone.View.extend({
    dataLinkSvc: DataLinkServiceProxy(),
    events: {
        "click input[name='save']": "save",
        "click input[name='saveas']": "saveas",
        "click input[name='delete']": "deleteConnection",
        "change input[name='MultiDB']": "changeMultiDB",
        "change select[name='clientOrServer']": "changeSourceType",
        "change input[name='ThirdPartyType']": "changeType",
        "change .c3piSettings input": "isDirty",
        "keypress .c3piSettings input": "isDirty",
        "change .c3piSettings select": "isDirty",
        "keypress .c3piSettings select": "isDirty",
        "change select[name='queries']": "selectQuery",
        "change select[name='parameters']": "selectParam",
        "change .params input": "changeParam",
        "click input[name='test']": "testQuery"
    },
    queries: [],
    params: [],
    currentQuery: null,
    currentParam: null,
    isDirtyPending: false,
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('c3pilayout'));
        if (this.model) {
            this.listenTo(this.model, 'change:loading', function (model, value, options) {
                this.$el.find("input[name='test']").attr("disabled", !!this.model.get('loading'));
            });
        }
        return this;
    },
    render: function () {
        var settings = this.model && Utility.tryParseJSON(this.model.get('Definition'));
        if (settings) {
            this.checkLicense(settings.ThirdPartyType);
        }
        this.queries = [];
        this.params = [];
        this.showParam(); // no arguments = clear parameter
        this.currentQuery = null;
        var that = this;
        var id = this.model && this.model.get('Id');
        if (id) {
            window.c3piQueries.each(function (item) {
                if (item.get('ConnectionId') === id) {
                    that.queries.push(item.attributes);
                }
            });
        }
        var renderObject = {
            model: this.model,
            licenses: window.c3piLicenses,
            thirdPartyType: settings && settings.ThirdPartyType,
            prefix: settings && settings.Prefix,
            queries: this.queries
        };
        this.$el.html(this.compiledTemplate(renderObject));
        if (this.model) {
            var args = {
                settings: settings,
                machineId: this.model.get('MachineId'),
                isDirtyCallback: function () {
                    that.isDirty();
                }
            };
            switch (parseInt(settings.ThirdPartyType, 10)) {
                case Constants.c3p.eConnect:
                    this.subView = new C3PI_eConnectView(args);
                    break;
            }
            if (this.subView) {
                this.$el.find(".invalidSettings").hide();
                var vel = this.subView.render().el;
                this.$el.find("div .c3piSettings").append(vel);
                if (!this.isLicensed) {
                    this.$el.find(".unlicensed").show();
                }
            } else {
                this.$el.find(".invalidSettings").show();
            }
            if (!args.machineId && !Utility.isSuperAdmin()) {
                // the following can be undone by changeSourceType (to client)
                this.$el.find("input,select").not("select[name='clientOrServer']").prop('disabled', true).attr('title', Constants.c.serverDatalinkSuperAdminOnly);
            }
        } else {
            // -- New --
            this.$el.find("input[name='ThirdPartyType']").first().prop("checked", true).trigger("change");
            this.isDirtyPending = true; // enable Save button.  This will initialize a new connection of a specified type
        }
        if (this.isDirtyPending && this.isLicensed) {
            this.$el.find("input[name='save']").attr("disabled", false);
            this.isDirtyPending = false;
        }
        return this;
    },
    changeSourceType: function (ev) {
        if (ev.currentTarget.value === 'client' && !Utility.isSuperAdmin()) {
            // undoes disabling of everything in render when non-superadmin edits a server connection.  (except test button, which still requires a query to be selected to get enabled)
            this.$el.find("input,select").not("input[name='test']").prop('disabled', false).attr('title','');
        }
    },
    changeMultiDB: function (ev) {
        if (ev.currentTarget.checked) {
            this.$el.find("li.defaultDB").show();
        } else {
            this.$el.find("li.defaultDB").hide();
        }
    },
    validateMultiDB: function (definition) {
        // C3PI implementations don't necessarily support the @DBName parameter in the ConnectionString, but if they do, 
        // The must support it the way eConnect does, with the MultiDB checkbox and the DefaultDBName property. 
        // This validates them.
        var hasMultiDBParam = definition.ConnectionString.indexOf('@DBName') >= 0;

        if (hasMultiDBParam) {
            if (!definition.MultiDB) {
                this.$el.find('input[name="MultiDB"]').prop('checked', true).trigger('change'); // including @DBName implies that checkbox should be checked
            }
            if (!definition.DefaultDBName) {
                ErrorHandler.addErrors({ 'DefaultDBName': Constants.c.required });
                return false; // failing to include a DefaultDBName when multi DB is enabled is an error
            }
        } else {
            if (definition.MultiDB) {
                ErrorHandler.addErrors({ 'MultiDB': Constants.c.multipleDatabases_desc });
                return false;   // failing to include @DBName when checkbox is checked is also an error
            }
            if (!hasMultiDBParam && this.$el.find("li.defaultDB").is(":hidden") ) {
                delete definition.DefaultDBName; // remove this property, if present, if multiDB has been turned off
            }
        }
        delete definition.MultiDB; // no need to store this property; the presense of @DBName will suffice
        return true;
    },
    save: function (ev, model) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);

        if (!this.isNameValidHandling(this.name, 'DLCName')) {
            return false;
        }
        var attrs;
        var options;
        var that = this;
        if (!model) { // passed in model will be used by SaveAs
            model = this.model;
        }
        var definition = this.getDefinition();
        if (!model) {
            // -- New --
            if (!this.isNameValidHandling(definition.Prefix, 'Prefix')) {
                return;
            }
            definition = JSON.stringify(definition);
            attrs = {
                Name: this.name,
                DataLinkType: Constants.dlt.ThirdParty,
                Definition: definition,
                MachineId: Utility.isSuperAdmin() ? null : "-1", // assumes every C3PI supports a client connection.  It this is ever not the case, we'll have to account for it here.
                IsUninitialized: true
            };
            options = {
                success: function (result, response) {
                    var saveSucceeded = that.saveSuccess(result, response, Constants.c.emptyGuid, window.c3pis, that);
                    if (saveSucceeded) {
                        $("input[name='save']").attr("disabled", true);
                        if (response.result.DataLinkQueries) {
                            window.c3piQueries.add(response.result.DataLinkQueries, { silent: true }); // silent: render will be triggered below >>>
                        }
                        this.model = model;
                        window.c3pis.trigger('add', model); // <<< this triggers the refresh
                    }
                },
                failure: function (message) {
                    that.handleErrors(message);
                },
                error: that.handleErrors,
                silent: true // refresh will be triggered after queries are added in the success function, above >>>
            };
            model = new DataLink();
        } else {
            // Save
            attrs = this.getConnection(definition, true);
            if (!attrs) {
                return; // abort save
            }
            options = {
                success: function (result, response) {
                    var saveSucceeded = that.saveSuccess(result, response, that.model.get('Id'), window.c3pis, that);
                    if (saveSucceeded) {
                        $("input[name='save']").attr("disabled", true);
                        this.model = model;
                    }
                },
                failure: function (message) {
                    that.handleErrors(message);
                },
                error: that.handleErrors
            };
        }
        model.save(attrs, options);
    },
    saveas: function (ev) {
        // TODO 11195 SaveAs is not implemented, but with queries not editable, there is very little reason to use it.
        var model = new DataLink();
        model.set('Id', Constants.c.emptyGuid);
        // TODO prompt for new name if name matches?
        // Need a new prefix (which is not otherwise editable)
        this.save(ev, model);
    },
    getDefinition: function () {
        var defn = DTO.getDTO(this.$el.find("div .c3piSettings").not('ol.mapper'));
        defn.ThirdPartyType = parseInt(defn.ThirdPartyType, 10); // type-correct if necessary
        return defn;
    },
    getConnection: function (definition, includeMappings) {
        if (this.subView.validate) { // call validate function in subview and return null (aborts save or test) if it doesn't return true
            if (!this.subView.validate(definition)) {
                return null;
            }
        }
        if (!this.validateMultiDB(definition)) {
            return null;
        }
        if (definition.MachineId === '-1') {
            this.handleErrors(null, Constants.c.automationNotSelected);
            return null;
        }
        // Note: server handles password encryption using "three bells" protocol (a field called EncryptedPassword which doesn't begin with three bell characters gets encrypted).  See DLUtility.EncryptPassword() or DataLinkConnectionBusiness.Create()
        var machineId = definition.MachineId; // get this from settings...
        delete definition.MachineId; // ... and then delete it from there ...
        delete definition.clientOrServer; // ... along with this select, because these are not part of settings
        // field mapping
        if (includeMappings) {
            var $mappings = this.$el.find('ol.mapper select');
            if ($mappings.length > 0) {
                var mappings = {};
                var i;
                var maps = $mappings.length;
                for (i = 0; i < maps; i++) {
                    var map = $mappings[i];
                    if (map.value) {
                        var data = map.dataset;
                        mappings[data.name] = map.value;
                    }
                }
                definition.Mappings = mappings;
            }
        }
        definition = JSON.stringify(definition);
        return { Name: this.name, MachineId: machineId, Definition: definition, DataLinkType: Constants.dlt.ThirdParty };
    },
    deleteConnection: function (ev, override) {
        var that = this;
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        if (!this.model) {
            return;
        }
        var id = this.model.get('Id');
        var success = function (response) {
            // Remove any data link queries associated with the connection
            var queries = $.extend(true, {}, window.c3piQueries);
            queries.each(function (dlq) {
                if (dlq.get('ConnectionId') === id) {
                    window.c3piQueries.remove(dlq);
                }
            });
            window.c3pis.remove(that.model);
        };
        var nonOverrideFailure = function (jqXHR, textStatus, businessException) {
            ErrorHandler.addErrors(businessException.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        };
        var failure = function (jqXHR, textStatus, businessException) {
            if (businessException.Message && businessException.Type.match('OverridableException')) {
                ErrorHandler.displayOverridableDialogErrorPopup(businessException.Message, function (closeFunc) {
                    that.dataLinkSvc.deleteDataLinkConnection(id, true, success, nonOverrideFailure);
                }, { title: Constants.c.deleteConnection, okText: Constants.c.yes, closeText: Constants.c.no, closeDialog: true });
            } else {
                nonOverrideFailure(jqXHR, textStatus, businessException);
            }
        };
        this.dataLinkSvc.deleteDataLinkConnection(id, false, success, failure);
    },
    isDirty: function (ev) {
        if (this.isLicensed) { 
            if ($("input[name='save']").attr("disabled", false).length === 0) {
                this.isDirtyPending = true; // if save button doesn't exist yet, set flag to enable it after it does
            }
        }
    },
    changeType: function (ev) {
        this.checkLicense(parseInt(ev.currentTarget.value, 10));
    },
    checkLicense: function (type) {
        this.isLicensed = window.c3piLicenses.indexOf(type) >= 0;
        if (!this.isLicensed) {
            this.$el.find(".unlicensed").show();
        } else {
            this.$el.find(".unlicensed").hide();
        }
    },
    selectQuery: function (ev) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);

        var q = this.queries[parseInt(ev.currentTarget.value, 10)];
        this.currentQuery = q;
        var qDefObj = this.getCurrentQueryDefObj();
        var defn = qDefObj.Definition;

        this.showParam(); // no arguments = clear parameter

        this.$el.find("input[name='dataLinkAction']").val([qDefObj.Action]);
        this.$el.find("input[name='TypeAhead']").prop("checked", defn.TypeAhead);
        this.$el.find("input[name='Dropdown']").prop("checked", defn.DropDown);

        var querySelect = document.createElement("select");
        querySelect.setAttribute("name", "parameters");
        this.params = defn.Params;
        var firstParam = true;
        var param;
        for (param in this.params) {
            if (this.params.hasOwnProperty(param)) {
                var pInfo = this.params[param];
                var opt = document.createElement("option");
                opt.text = param;
                opt.setAttribute("data-parameter_type", pInfo.Type);
                opt.setAttribute("data-parameter_value", pInfo.Value);
                opt.setAttribute("data-parameter_required", pInfo.Required);
                querySelect.appendChild(opt);
                if (firstParam) {
                    // first is selected automatically but doesn't fire event
                    this.showParam(param, pInfo);
                    firstParam = false;
                }
            }
        }
        var $target = this.$el.find("select[name='parameters']");
        querySelect.setAttribute("size", $target.attr("size"));
        $target.replaceWith(querySelect);
        if(!this.model.get('loading')){
            this.$el.find("input[name='test']").attr("disabled", false);
        }
    },
    getCurrentQueryDefObj: function () {
        var q = this.currentQuery;
        var dlAction = "Query";
        var defn = q.QueryDefinition;
        if (!defn) {
            defn = q.UpdateDefinition;
            dlAction = "Update";
        }
        if (defn) {
            defn = JSON.parse(defn);
        } else {
            defn = {};
            dlAction = "";
        }
        return { Definition: defn, Action: dlAction };
    },
    setQueryDefn: function (qd) {
        switch (qd.Action) {
            case "Update":
                this.currentQuery.UpdateDefinition = JSON.stringify(qd.Definition);
                break;
            case "Query":
                this.currentQuery.QueryDefinition = JSON.stringify(qd.Definition);
                break;
        }
    },
    selectParam: function (ev) {
        var paramName = ev.currentTarget.value;
        var pInfo = this.params[paramName];
        this.showParam(paramName, pInfo);
    },
    changeParam: function (ev) {
        if (this.currentParam) {
            var p = this.params[this.currentParam];
            p.Value = ev.currentTarget.value;
            // create json string array if this is an array parameter and if it doesn't already look like a json array
            var isArray = (p.Type & Constants.ParameterTypeArrayFlag) === Constants.ParameterTypeArrayFlag;
            if (isArray && p.Value && p.Value.length > 0 && !(p.Value[0] === '[' && p.Value[p.Value.length - 1] === ']')) {
                var sArray = p.Value.split(',');
                p.Value = JSON.stringify(sArray);
            }
            var qd = this.getCurrentQueryDefObj();
            qd.Definition.Params = this.params;
            this.setQueryDefn(qd);
        }
    },
    showParam: function (paramName, pInfo) {
        this.currentParam = paramName;
        this.$el.find("input[name='ParameterName']").val(paramName || '');
        var typeVal = '';
        if (pInfo) {
            var isArray = (pInfo.Type & Constants.ParameterTypeArrayFlag) === Constants.ParameterTypeArrayFlag;
            var baseType = pInfo.Type & ~Constants.ParameterTypeArrayFlag;
            typeVal = (pInfo && Utility.reverseMapObject(Constants.sqldbt)[baseType]) || '';
            if (pInfo.IsArray) {
                typeVal += ' ' + Constants.c.arrayParameter;
            }
        }
        this.$el.find("input[name='ParameterType']").val(typeVal);
        this.$el.find("input[name='ParameterValue']").val((pInfo && pInfo.Value) || '');
        this.$el.find("input[name='ParameterRequired']").prop("checked", (pInfo && pInfo.Required) || '');
    },
    testQuery: function (ev) {
        if ($(ev.currentTarget).hasClass('disabled')) {
            return;
        }
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var $params = this.$el.find("select[name='parameters'] option");
        $params.removeClass("inputErrorClass");

        var defn = this.getDefinition();
        var connection = this.getConnection(defn, false);
        if (!connection) {
            return;
        }
        delete connection.Created; // test doesn't need these properties and ...
        delete connection.Modified; // ...they are not properly formatted for WCF call.
        
        // No need to get query changes, because none are allowed, except for parameter values, which have already been updated.        
        var qd = this.getCurrentQueryDefObj();

        // validate required params
        var params = qd.Definition.Params;
        if (params) {
            var missingValues = [];
            var param;
            for (param in params) {
                if (params.hasOwnProperty(param)) {
                    var pInfo = qd.Definition.Params[param];
                    if (pInfo.Required && !pInfo.Value) {
                        missingValues.push(param);
                    }
                }
            }
            if (missingValues.length > 0) {
                $params.filter(function (index, elem) { return missingValues.indexOf($(elem).html()) >= 0; }).addClass("inputErrorClass");
                var msg = String.format(Constants.c.requiredValuesMissing_T, missingValues.join(", "));
                ErrorHandler.addErrors({ "test" : msg }, css.warningErrorClass, "div", css.inputErrorClass);
                return;
            }
        }

        var query = this.currentQuery;
        delete query.Created; // as above
        delete query.Modified; 
        query.DataLinkConnection = connection;
        var that = this;
        this.model.set('loading', true);
        var success = function (data) {
            if (qd.Action === "Query") {
                that.fillQueryTestGrid(data);
            }
            else {
                that.fillUpdateTestGrid(data);
            }
            that.model.set('loading', false);
        };
        var failure = function (jqXHR, textStatus, businessException) {
            //$('#dataLinkDialog').dialog('close');
            ErrorHandler.addErrors(businessException.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            that.model.set('loading', false);
        };
        that.dataLinkSvc['executeLive' + qd.Action + 'Test'](connection, query, success, failure);
    },
    /*
        Fill a grid with test data returned from a SQL statement Query -- copied from DataLinkEditView.js 
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
                gridRO.headers.push({ columnId: columnName, value: columnName, style: style });
            }
        }
        for (i = 0; i < numRows; i++) {
            gridRO.rows[i] = { values: [] };
            var gridData = {};
            var col;
            for (col in columns) {   // Determine column data for a single row
                if (columns.hasOwnProperty(col)) {
                    columnData = columns[col];
                    if (columnData.Key !== undefined) {
                        gridRO.rows[i].values.push(columnData.Value[i]);//from server
                    }
                    else {
                        gridRO.rows[i].values.push(columnData[i]);//from client
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
            headers: [{ value: Constants.c.numAffectedRows }],
            rows: [{ values: [affectedRows] }]
        };
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
    }
});