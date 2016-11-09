var ImportJobsEditView = Backbone.View.extend({
    model: undefined, //ImportJobResultsCPX
    gridView: undefined,
    className: 'ImportJobsEditView',
    events: {
        "click input[name='Test_mail']": "testMail",
        "click input[name='clear_data']": "clear",
        "change #importJobsFilterBy": "getImportJobsFilter",
        "click input[name='filter_jobs']": "FilterData",
        "click input[name='save_IJEmailRecp']": "SaveImportJobEmailRecipient"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('importJobslayout'));
        this.GetImportJobsMachineName();
        this.model = new ImportJobResultsCPX();
        this.gridView = new ImportJobsGridView({ model: this.model });
        this.model.fetch();
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        var html_data = this.compiledTemplate(ro);
        this.$el.html(html_data);
        this.delegateEvents(this.events);
        this.$el.find('.gridContainer').html(this.gridView.render().$el);
        this.$el.find('input[name="maxResults"]').numeric({ decimal: false });
        return this;
    },
    getRenderObject: function () {
        var ro = {
            users: [],
            ijs: [],
            email: window.systemPreferences.getValueByName(Constants.UtilityConstants.IMPORT_JOB_EMAIL_RECIPIENTS) || ''
        };
        var i = 0;
        var length = window.users.length;
        for (i; i < length; i++) {
            var u = window.users.at(i);
            ro.users.push({ value: u.get('Id'), text: u.get('Username') });
        }
        var status;
        for (status in Constants.ijs) {
            if (Constants.ijs.hasOwnProperty(status)) {
                var text = Constants.ijs[status];
                if (text) {
                    ro.ijs.push({ value: text, text: status });
                }
            }
        }
        return ro;
    },

    testMail: function () {
        var recipients = $('input[name=IJEmailRecipient]').val();
        if (!recipients) {
            ErrorHandler.addErrors(Constants.c.noRecipients);
            return;
        }
        if (!Utility.areValidEmailAddresses(recipients, '', Constants.c.invalidRecipientsEmail)) {
            return;
        }
        $('input[name="Test_mail"]').attr('disabled', 'disabled');
        $('input[name="clear_data"]').attr('disabled', 'disabled');
        var sf = function () {
            if ($('#statusMsg') !== undefined) {
                $('#statusMsg').fadeIn();
                $('#statusMsg').empty();
                $('#statusMsg').append("<b>" + Constants.c.mailSentSuccessfully + "</b>");
                $('#statusMsg').fadeOut(2000);
            }
        };
        var ff = function (xhr, statusText, error) {
            $('input[name="Test_mail"]').removeAttr('disabled');
            $('input[name="clear_data"]').removeAttr('disabled');
            ErrorHandler.popUpMessage(error);
        };
        var cf = function () {
            $('input[name="Test_mail"]').removeAttr('disabled');
            $('input[name="clear_data"]').removeAttr('disabled');
        };
        var companyName = $('#companySelect option:selected').text();
        var emailOptions = Send.defaultEmailOptions;
        emailOptions.Addresses = recipients;
        this.model.sendTestEmail(companyName, emailOptions, sf, ff, cf);
    },
    clear: function () {
        $("#importjobsusers").hide();
        $("#importjobsMachine").hide();
        $("#importjobsStatus").hide();
        $("#importJobsFilterBy").val(0);
        this.$el.find('input[name="maxResults"]').val(25);
        this.filterView = {};
        this.model.clearAndRefresh();
    },
    FilterData: function () {
        var attrs = {};
        var maxResultsSelector = this.$el.find('input[name="maxResults"]');
        attrs.MaxRows = InputUtil.textRangeCheck(25, 1000, parseInt(maxResultsSelector.val(), 10));
        maxResultsSelector.val(attrs.MaxRows);

        var searchType = $("#importJobsFilterBy").val();
        attrs.SearchType = searchType;
        if (searchType === "1") {
            attrs.UserId = $("#importjobsusers").val();
        }
        else if (searchType === "2") {
            attrs.MachineName = $("#importjobsMachine").val();
        }
        else if (searchType === "3") {
            attrs.Statuses = [$("#importjobsStatus").val()];
        }
        this.model.get('Request').set(attrs, { reset: true });
        this.model.fetch();
    },
    getImportJobsFilter: function (event) {
        var searchType = $(event.currentTarget).val();
        $(".importjobfilters").hide();
        if (searchType === "1") {
            $("#importjobsusers").show();
        }
        else if (searchType === "2") {
            var seloption = "";
            $('#importjobsMachine').html('');
            var optionsarray = window.importJobsMachineName;
            var i = 0;
            var length = optionsarray.length;
            for (i; i < length; i++) {
                if (seloption.indexOf('>' + optionsarray[i].MachineName + '<') <= 0) {
                    seloption += '<option value="' + optionsarray[i].MachineName + '">' + optionsarray[i].MachineName + '</option>';
                }
            }
            $('#importjobsMachine').append(seloption);
            $("#importjobsMachine").show();
        }
        else if (searchType === "3") {
            $("#importjobsStatus").show();
        }
    },
    SaveImportJobEmailRecipient: function () {
        var that = this;
        var newClass = new SystemPreference();
        var attrs = window.systemPreferences.getByName(Constants.UtilityConstants.IMPORT_JOB_EMAIL_RECIPIENTS).attributes;
        attrs.Value = $('input[name=IJEmailRecipient]').val();
        newClass.save(attrs, {
            success: function (result, response) {
                that.saveSuccess(result, response, attrs.Id, window.systemPreferences, that);
                if ($('#statusMsg') !== undefined) {
                    $('#statusMsg').fadeIn();
                    $('#statusMsg').empty();
                    $('#statusMsg').append("<b>" + Constants.c.successfullySaved + "</b>");
                    $('#statusMsg').fadeOut(2000);
                }

            },
            error: function (model, resp) {
                ErrorHandler.addErrors(resp.statusText);
            }
        });
    },
    GetImportJobsMachineName: function () {
        var sf = function (result) {
            this.ImportJobsMachineName = result;
            window.importJobsMachineName = result;
        };
        var ff = function (xhr, statusText, error) {
            ErrorHandler.popUpMessage(error);
        };
        var proxy = ImportExportServiceProxy({ skipStringifyWcf: true });
        proxy.GetImportJobsMachineNames(sf, ff);
    },



    ReturnParsed: function (json) {
        //var text = '';
        if (json) {
            json = json.replace('&nbsp;', '');
        }
        var json_parsed = $.parseJSON(json);
        var u;
        var value = '<table>';
        for (u in json_parsed) {
            if (json_parsed.hasOwnProperty(u)) {
                value = value + '<tr><td valign="top"><b>' + u + '</b><td><td></td><br>';
                if (json_parsed.hasOwnProperty(u)) {
                    value = value + '<td></td><td>';
                    var v;
                    for (v in json_parsed[u]) {
                        if (json_parsed[u].hasOwnProperty(v)) {
                            value = value + ' ' + v + ':' + json_parsed[u][v] + '<br>';
                        }
                    }
                    value = value + '</td>';
                    //text = text + ' ' + u + ' : ' + json_parsed[u].Document + ' ' + Constants.c.documents + '<br>';
                }
            }
        }
        value = value + '</table>';
        return value;
    },
    showCellData: function (objCell) {
        var coltype = $(objCell).attr("aria-describedby").split('_')[2];
        var selectedRowId;
        if (coltype === 'Results') {
            $('#results_data').html(this.ReturnParsed($(objCell).html()));
        } else {
            $('#results_data').html($(objCell).html());
        }
        $('#results_data').show();
        $('#results_data').dialog({
            modal: true,
            minWidth: 200,
            minHeight: 200,

            title: coltype,
            open: function () {
                Utility.enableButtons([Constants.c.previous, Constants.c.next]);
            },
            buttons: [{
                text: Constants.c.previous,
                click: function () {

                    selectedRowId = $('#importJobs_results').jqGrid('getGridParam', 'selrow');
                    var selectedRowIndex = $('#importJobs_results').getInd(selectedRowId);
                    var dataID = $('#importJobs_results').getDataIDs();
                    var maxrow = $('#importJobs_results').getDataIDs().length;
                    var rowdata = $('#importJobs_results').jqGrid("getRowData", dataID[selectedRowIndex - 2]);
                    $('#importJobs_results').jqGrid('setSelection', dataID[selectedRowIndex - 2]);
                    var colData = rowdata[coltype];
                    if (coltype === 'Results') {
                        $('#results_data').html(ImportJobsEditView.prototype.ReturnParsed(colData));
                    } else {
                        $('#results_data').html(colData);
                    }
                    selectedRowId = $('#importJobs_results').jqGrid('getGridParam', 'selrow');
                    var ind = $('#importJobs_results').getInd(selectedRowId);
                    if (ind === 1) {
                        Utility.disableButtons([Constants.c.previous]);
                    }
                    if (ind < maxrow) {
                        Utility.enableButtons([Constants.c.next]);
                    }
                    var $selRow = $('#' + selectedRowId);
                    $('#gbox_importJobs_results .ui-jqgrid-bdiv').scrollTo($selRow);
                }
            },
            {
                text: Constants.c.next,
                click: function () {
                    selectedRowId = $('#importJobs_results').jqGrid('getGridParam', 'selrow');
                    var selectedRowIndex = $('#importJobs_results').getInd(selectedRowId);
                    var dataID = $('#importJobs_results').getDataIDs();
                    var maxrow = $('#importJobs_results').getDataIDs().length;
                    // alert(maxrow);
                    if (Number(selectedRowIndex) < maxrow) {
                        var rowdata = $('#importJobs_results').jqGrid("getRowData", dataID[selectedRowIndex]);
                        $('#importJobs_results').jqGrid('setSelection', dataID[selectedRowIndex]);
                        var colData = rowdata[coltype];
                        if (coltype === 'Results') {
                            $('#results_data').html(ImportJobsEditView.prototype.ReturnParsed(colData));
                        } else {
                            $('#results_data').html(colData);
                        }
                    }
                    selectedRowId = $('#importJobs_results').jqGrid('getGridParam', 'selrow');
                    var ind = $('#importJobs_results').getInd(selectedRowId);
                    if (ind > 1) {
                        Utility.enableButtons([Constants.c.previous]);
                    }
                    if (ind === maxrow) {
                        Utility.disableButtons([Constants.c.next]);
                    }
                    var $selRow = $('#' + selectedRowId);
                    $('#gbox_importJobs_results .ui-jqgrid-bdiv').scrollTo($selRow);
                }
            },
            {
                text: Constants.c.close,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
    }
});
