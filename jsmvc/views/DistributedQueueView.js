/// <reference path="../../Content/LibsInternal/DateUtil.js" />
/// <reference path="../../Content/LibsInternal/ErrorHandler.js" />
/// <reference path="../../Content/LibsInternal/DTO.js" />
var DistributedQueueView = Backbone.View.extend({
    className: 'DistributedQueueView',
    dqProxy: DistributedQueueProxy(),
    dqGrid: undefined,
    processorGrid: undefined,
    viewData: {},
    events: {
        "click #dq_delete:not(.disabled)": "deleteDQEntry",
        "click #dqp_hide:not(.disabled)": "clearOldDQP",
        "click #dq_refresh:not(.disabled)": "refreshDQ",
        "click #DistributedQueueProcessorDTO input[name='Disabled']": "toggleProcessorDisabled",
        "keyup #dqResultLimit": "resultLimitChanged",
        "change #dqResultLimit": "resultLimitChanged"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('distributedQueuelayout'));
        return this;
    },

    render: function () {
        this.viewData.list = window.distributedQueueCC;
        this.viewData.dqps = window.dqProcessors;
        this.viewData.dqs = window.distributedQueues;
        this.viewData.gp = window.gatewayPermissions;
        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);
        this.initDQGrid();
        this.initProcessorGrid();
        this.delegateEvents(this.events);
        return this;
    },
    initDQGrid: function () {
        if (this.dqGrid) {
            this.dqGrid.close();
            this.dqGrid = undefined;
        }
        var that = this;
        var ro = {
            headers: [],
            rows: []
        };
        var style = 'width: ' + (100 / 6) + '%';
        ro.headers.push({ columnId: 'Created', value: Constants.c.created, style: style });
        ro.headers.push({ columnId: 'ComponentName', value: Constants.c.componentName, style: style });
        ro.headers.push({ columnId: 'SortDate', value: Constants.c.sortDate, style: style });
        ro.headers.push({ columnId: 'ProcessStarted', value: Constants.c.processStarted, style: style });
        ro.headers.push({ columnId: 'FailureCount', value: Constants.c.failureCount, style: style });
        ro.headers.push({ columnId: 'Error', value: Constants.c.error, style: style });
        this.getDQGridRows(ro);
        var options = {
            renderObject: ro,
            onRowSelect: function (o) { that.dqRowSelected(o); },
            onSortGrid: function (o) { that.dqSortGrid(o); }
        };
        this.dqGrid = new StaticDataGridView(options);
        this.$el.find('#dq_refresh_div').before(this.dqGrid.render().$el);

    },
    getDQGridRows: function (ro) {
        ro.rows = [];
        var data = window.distributedQueues;
        var length = data.length;
        var i = 0;
        for (i = 0; i < length; i++) {
            var item = data.at(i);
            var row = {
                rowClass: item.get('isSelected') ? 'customGridHighlight' : '',
                id: item.get('Id'),
                values: [
                    item.get("Created") || '',
                    item.get("ComponentName") || '',
                    item.get("SortDate") || '',
                    item.get("ProcessStarted") || '',
                    item.get("FailureCount") || '',
                    item.get("Error") || ''
                ]
            };
            ro.rows.push(row);
        }
    },
    dqRowSelected: function (options) {
        var data = window.distributedQueues.get(options.rowId);
        window.distributedQueues.setSelected([data.get('Id')]);
        var dqdto = $(document.getElementById('DistributedQueueDTO'));
        var dqpGrid = $(document.getElementById('dqp_results'));
        dqdto.find('input[name="Created"]').val(data.get('Created'));
        dqdto.find('input[name="SortDate"]').val(data.get('SortDate'));
        dqdto.find('input[name="ProcessStarted"]').val(data.get('ProcessStarted'));
        dqdto.find('input[name="ComponentName"]').val(data.get('ComponentName'));
        dqdto.find('input[name="Arguments"]').val(data.get('Arguments'));
        dqdto.find('input[name="CompanyName"]').val(data.get('CompanyName'));
        dqdto.find('input[name="FailureCount"]').val(data.get('FailureCount'));
        dqdto.find('input[name="Error"]').val(data.get('Error'));
        var runLocation = dqdto.find('input[name="RunLocation"]');
        var revRL = Utility.reverseMapObject(Constants.rl);
        runLocation.val(revRL[data.get('RunLocation')]);
        if (data.get('ProcessorID')) {
            this.processorRowSelected({ rowId: data.get('ProcessorID') });  // Select corresponding processor in DQPGrid
        }
        var ro = this.dqGrid.sdOptions.renderObject;
        this.getDQGridRows(ro);
        this.dqGrid.render();
    },
    dqSortGrid: function (options) {
        window.distributedQueues.sortByColumn(options.columnid);
        var ro = this.dqGrid.sdOptions.renderObject;
        this.getDQGridRows(ro);
        this.dqGrid.render();
    },
    initProcessorGrid: function () {
        if (this.processorGrid) {
            this.processorGrid.close();
            this.processorGrid = undefined;
        }

        var that = this;
        var ro = {
            headers: [],
            rows: []
        };
        var style = 'width: ' + (100 / 4) + '%';
        ro.headers.push({ columnId: 'UserName', value: Constants.c.username, style: style });
        ro.headers.push({ columnId: 'ClientVersion', value: Constants.c.clientVersion, style: style });
        ro.headers.push({ columnId: 'LastCommunication', value: Constants.c.total, style: style });
        ro.headers.push({ columnId: 'Failures', value: Constants.c.used, style: style });
        this.getProcessorGridRows(ro);
        var options = {
            renderObject: ro,
            onRowSelect: function (o) { that.processorRowSelected(o); },
            onSortGrid: function (o) { that.processorSortGrid(o); }
        };
        this.processorGrid = new StaticDataGridView(options);
        this.$el.find('#dqp_hide_div').before(this.processorGrid.render().$el);
    },
    getProcessorGridRows: function (ro) {
        ro.rows = [];
        var data = window.dqProcessors;
        var length = data.length;
        var i = 0;
        for (i = 0; i < length; i++) {
            var item = data.at(i);
            var row = {
                rowClass: item.get('isSelected') ? 'customGridHighlight' : '',
                id: item.get('Id'),
                values: [
                    item.get("UserName") || '',
                    item.get("ClientVersion") || '',
                    item.get("LastCommunication") || '',
                    item.get("Failures") || ''
                ]
            };
            ro.rows.push(row);
        }
    },
    processorRowSelected: function (options) {
        var data = window.dqProcessors.get(options.rowId);
        window.dqProcessors.setSelected([data.get('Id')]);
        var dqpdto = $(document.getElementById('DistributedQueueProcessorDTO'));
        dqpdto.find('input[name="UserName"]').val(data.get('UserName'));
        dqpdto.find('input[name="ClientVersion"]').val(data.get('ClientVersion'));
        dqpdto.find('input[name="PublicIP"]').val(data.get('PublicIP'));
        dqpdto.find('input[name="PrivateIP"]').val(data.get('PrivateIP'));
        dqpdto.find('input[name="Flags"]').val(data.get('Flags'));
        dqpdto.find('input[name="LastCommunication"]').val(data.get('LastCommunication'));
        dqpdto.find('input[name="Failures"]').val(data.get('Failures'));
        var disabled = dqpdto.find('input[name="Disabled"]');
        disabled.prop('checked', data.get('Disabled').toString() === 'true');
        var ro = this.processorGrid.sdOptions.renderObject;
        this.getProcessorGridRows(ro);
        this.processorGrid.render();
    },
    processorSortGrid: function (options) {
        window.dqProcessors.sortByColumn(options.columnid);
        var ro = this.processorGrid.sdOptions.renderObject;
        this.getProcessorGridRows(ro);
        this.processorGrid.render();
    },
    refreshDQ: function () {
        var that = this;
        var maxRecords = parseInt($('#dqResultLimit').val(), 10) || 20;        
        ErrorHandler.removeErrorTagsElement($('#dqResultLimit').parent(), css.warningErrorClass, css.inputErrorClass);
        if (maxRecords > 1000) {
            $('#dqResultLimit').after('<' + css.warningErrorClassTag + ' class="' + css.warningErrorClass + '">' + Constants.t('invalidLimit') + '</' + css.warningErrorClassTag + '>');
            $('#dqResultLimit').addClass(css.inputErrorClass);
            return;
        }
        var getAllInstances = $('#dqAllInstances:checked').length === 1;
        var sf = function (result) {
            window.dqProcessors.reset(result.Processors);
            window.distributedQueues.reset(result.QueueItems.Results);
            window.dqSearchResult = result.QueueItems;
            that.render();
            $('#dqResultLimit').val(maxRecords);
            if (getAllInstances) {
                $('#dqAllInstances').attr('checked', 'checked');
            }
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };
        var cf = function () {
            $('#dq_delete, #dq_refresh').removeClass('disabled');
        };
        $('#dq_delete, #dq_refresh').addClass('disabled');
        var args = { Start: 0, MaxRows: maxRecords };
        if (!getAllInstances) {
            args.InstanceId = $('#companySelect option:selected').val();
        }
        this.dqProxy.getAllData(args, sf, ff, cf);
    },
    clearOldDQP: function (ev) {
        var $btn = $(ev.currentTarget);
        $btn.addClass('disabled');
        var that = this,
            maxRecords = parseInt($('#dqResultLimit').val(), 10) || 20,
            getAllInstances = $('#dqAllInstances:checked').length === 1;
        var instanceId = null;
        if (!getAllInstances) {
            instanceId = $('#companySelect option:selected').val();
        }
        var sf = function (result) {
            window.dqProcessors.reset(result);
            that.render();
            $('#dqResultLimit').val(maxRecords);
            if (getAllInstances) {
                $('#dqAllInstances').attr('checked', 'checked');
            }
        };
        var ff = function (qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        var cf = function () {
            $btn.removeClass('disabled');
        };
        this.dqProxy.clearOldDQP(instanceId, sf, ff, cf);
    },
    formatterComponentName: function (cellvalue, options, rowObject) {
        return Utility.reverseMapObject(Constants.dtfs)[cellvalue];
    },
    clearDQDeatil: function () {
        var dqdto = $(document.getElementById('DistributedQueueDTO'));
        dqdto.find('input').val('');    // clear all DQ inputs values
    },
    deleteDQEntry: function (e) {
        var that = this;
        var model = window.distributedQueues.getSelected()[0];
        var $targ = $(e.currentTarget);
        if (!model) {
            return;
        }
        model.destroy({
            wait: true,
            success: function (result) {
                var ro = that.dqGrid.sdOptions.renderObject;
                that.getDQGridRows(ro);
                that.dqGrid.render();
                var $dq_total = $(that.el).find('#dq_total');                
                if ($dq_total) {
                    if (window.dqSearchResult) {
                        window.dqSearchResult.Total = window.dqSearchResult.Total - 1;
                        $dq_total.html(window.dqSearchResult.Total);
                    }
                }
                that.clearDQDeatil();
            },
            failure: function (error) {
                ErrorHandler.popUpMessage(error);
            },
            complete: function () {
                $targ.removeClass('disabled');
            }
        });
    },
    toggleProcessorDisabled: function (e) {
        var dqpdto = $(document.getElementById('DistributedQueueProcessorDTO'));
        var attrs = DTO.getDTO(dqpdto);
        // if there is no processor selection just return
        var dqpResults = $(document.getElementById('dqp_results'));
        var model = window.dqProcessors.getSelected()[0];
        if (model === undefined || model.get('isSelected') === false) {
            return;
        }
        var sf = function (result) {
            model.set('Disabled', attrs.Disabled);
            var dqpdto = $(document.getElementById('DistributedQueueProcessorDTO'));
            var disabled = dqpdto.find('input[name="Disabled"]');
            disabled.prop('checked', model.get('Disabled').toString() === 'true');
        };
        var ff = function (qXHR, textStatus, error) {
            ErrorHandler.popUpMessage(error);
        };
        var args = { ProcessorId: model.get('Id'), Disable: attrs.Disabled };
        this.dqProxy.disableProcessor(args, sf, ff);
    },
    resultLimitChanged: function (e) {
        var input = $(e.currentTarget);
        input.val(input.val().replace(/[^\d]/g, ""));
    }

});