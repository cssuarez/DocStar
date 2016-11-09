/// <reference path="../../Content/LibsInternal/Utility.js" />
var PawnsView = Backbone.View.extend({
    model: undefined, // WFNotificationRuleCPX
    collection: undefined,   // WFNotificationRules
    className: 'PawnsView',
    viewData: {},
    listuq: undefined,  // Collection of users in the workflow queue filter
    listwf: undefined, // Collection of slim workflows
    scheduleView: undefined,
    loaded: false,
    buttons: [Constants.c.save, Constants.c['delete'], Constants.c.runNow, Constants.c.close],
    workflowSvc: WorkflowServiceProxyV2(),
    events: {
        'click .ui-icon-help': 'displayDetailLevelDescription',
        'keyup input.isCombo[name="RuleName"]': 'changeValue',
        'change select[name="Sort"], select[name="QueueId"], select[name="WorkFlowId"]': "changeValue",
        'change input[name="ResultLimit"]': "changeValue",
        'change select[name="SortDescending"]': 'changeSortDescending',
        'change input[name="DetailLevel"]': 'changeIsDetailed',
        'change input[name="NewOnly"]': 'changeNewOnly',
        'change input[name="SendEmailForZeroItem"]': 'changeSendEmailForZeroItem',
        'change select[name="Columns"]': "changeColumns"
    },
    initialize: function (options) {
        this.options = options;
        var that = this;
        var position = options.position;
        this.displayInDialog = options.displayInDialog === false ? false : true;
        this.compiledTemplate = doT.template(Templates.get('workflowpawnslayout'));
        // Options for displaying this view as a dialog
        this.dialogOptions = {
            autoOpen: false,
            width: 550,
            minHeight: 400,
            position: position,
            modal: true,
            resizable: false,
            title: Constants.c.pawnsConfig,
            open: function () {
                that.$dialog.css('height', 'auto');
                that.$el.show();
            },
            show: {
                effect: "fold",
                duration: 800
            },
            hide: {
                effect: "fold"
            },
            buttons: [{
                text: Constants.t('runNow'),
                click: function (cleanup) {
                    that.model.runNowNotificationRule({
                        success: function () {
                            $('#statusMsg').fadeIn();
                            $('#statusMsg').empty();
                            $('#statusMsg').append("<b>" + Constants.c.mailSentSuccessfully + "</b>");
                            $('#statusMsg').fadeOut(2000);
                            Utility.executeCallback(cleanup, true);
                        },
                        failure: function (message) {
                            Utility.executeCallback(cleanup, true);
                        }
                    });
                }
            },
            {
                text: Constants.t('delete'),
                click: function (cleanup) {
                    ErrorHandler.removeErrorTagsElement(that.$el);
                    that.model.destroy({
                        wait: true,
                        success: function () {
                            Utility.executeCallback(cleanup, true);
                        },
                        failure: function (message) {
                            Utility.executeCallback(cleanup, true);
                        }
                    });
                }
            }]
        };
        this.dialogCallbacks = {};
        this.model = new WFNotificationRuleCPX({ OwnerId: Utility.getCurrentUser().Id });
        this.collection = new WFNotificationRules(this.model);
        this.listenTo(this.collection, 'sync', function (modelOrCollection, resp, options) {
            this.render();
        });
        this.listenTo(this.collection, 'remove', function (model, collection, options) {
            this.model = this.collection.get(Constants.c.emptyGuid);
            this.render();
        });
        this.listenTo(this.collection, 'reset', function (collection, options) {
            this.model = this.collection.get(Constants.c.emptyGuid);
            this.render();
        });
        this.listenTo(this.collection, 'change:DetailLevel', function (model, value, options) {
            this.showHideColumnOptions();
        });
        this.listenTo(this.collection, 'invalid', function (model, error, options) {
            // Clear pre-existing errors, before adding the same or new errors
            ErrorHandler.removeErrorTagsElement(this.$el);
            ErrorHandler.addErrors(error);
            if (!this.model.get('Id')) {
                this.model.set('Id', Constants.c.emptyGuid, { silent: true });
            }
            this.cleanup();
        });
        return this;
    },
    closeScheduleView: function () {
        if (this.scheduleView && this.scheduleView.close) {
            this.scheduleView.close();
        }
    },
    close: function () {
        this.closeScheduleView();
        this.unbind();
        this.remove();
    },
    cleanup: function () {
        if (this.$dialog) {
            DialogsUtil.cleanupDialog(this.$dialog, null, true);
        }
    },
    render: function () {
        var that = this;
        var viewData = that.getRenderObject();
        that.$el.html(that.compiledTemplate(viewData));
        if (!this.loaded) {
            this.loaded = true;
            this.load();
        }
        else {
            this.setup();
        }
        return this;
    },
    load: function () {
        this.collection.fetch({ remove: false });
    },
    setup: function () {
        this.delegateEvents();
        this.renderScheduleView();
        this.showHideColumnOptions();
        this.bindEvents();
        this.setupMultiColumn();
    },
    getRenderObject: function () {
        var r = {};
        r.listuq = window.users.getFilteredUserQueues();
        r.listwf = window.slimWorkflows.toJSON();
        var dbFieldsSelected = [];
        var dbFields = [];
        var dbFieldsCopy = new DatabaseFields(window.databaseFields.models);
        var idx;
        var dbIdx = 0;
        var selectedColumns = this.model.getColumns();
        var selLen = selectedColumns ? selectedColumns.length : 1;
        var length = 0;
        var dbField;
        var an;
        var dn;
        var data;
        for (idx = 0; idx < selLen; idx++) {
            length = dbFieldsCopy.length;
            for (dbIdx = 0; dbIdx < length; dbIdx++) {
                dbField = dbFieldsCopy.at(dbIdx);
                an = dbField.get('ActualName');
                dn = dbField.get('DisplayName');
                data = { ActualName: an, DisplayName: dn };
                if (selectedColumns[0] === an) {
                    dbFieldsCopy.remove(dbField);
                    dbFieldsSelected.push(data);
                    selectedColumns.splice(0, 1);
                    selLen--;
                    idx--;
                    dbIdx--;
                    break;
                }
            }
        }
        length = dbFieldsCopy.length;
        for (dbIdx = 0; dbIdx < length; dbIdx++) {
            dbField = dbFieldsCopy.at(dbIdx);
            an = dbField.get('ActualName');
            dn = dbField.get('DisplayName');
            data = { ActualName: an, DisplayName: dn };
            dbFields.push(data);
        }
        dbFields = dbFieldsSelected.concat(dbFields);
        r.listfields = dbFields;
        r.rulesData = this.collection.toJSON({ skipDateTimeProcessing: true });
        r.selectedData = this.model.toJSON({ skipDateTimeProcessing: true });
        return r;
    },
    bindEvents: function () {
        var that = this;
        var $input = $('#resultLimit');
        $input.numeric({ negative: false, decimal: false });
        var $ruleSel = this.$el.find('select[name="RuleName"]');
        $ruleSel.combobox({
            onChange: function (data) {
                if (data.ui.item) {
                    that.onRuleChange(data.ui.item.option);
                }
            },
            onSelect: function (data) {
                if (data.ui.item) {
                    that.onRuleChange(data.ui.item.option);
                }
            }
        });
    },
    renderScheduleView: function () {
        this.closeScheduleView();
        var schedule = this.model.get('Schedule');
        var $targ = this.$el.find("#ruleSchedule");
        this.scheduleView = new SchedulingView({
            executionTypes: [Constants.ef.Daily, Constants.ef.Monthly],
            recurEvery: Constants.c.generateEvery + ':',
            displayScheduleName: false,
            displayNewSchedule: false,
            model: schedule
        });
        $targ.append(this.scheduleView.render().$el);
    },
    showHideColumnOptions: function () {
        var isDetailed = this.model.get('IsDetailed');
        var $columnsChooser = this.$el.find('#columnsChooserdv');
        var $sort = this.$el.find('#sortdv');
        var $multi = this.$el.find('#rulecolumn');
        if (isDetailed) {
            $columnsChooser.show();
            $sort.show();
            var valArr = this.model.getColumns();
            if (valArr && (valArr instanceof Array)) {
                $multi.val(valArr);
            }
            this.setupMultiColumn();
        }
        else {
            $columnsChooser.hide();
            $sort.hide();
        }
    },
    setupMultiColumn: function () {
        var that = this;
        $.extend(true, $.ui.multiselect, {
            locale: {
                addAll: '',
                removeAll: '',
                itemsCount: Constants.t('fieldsSelected')
            }
        });
        var mselOpts = {
            dividerLocation: 0.5
        };
        var $multi = this.$el.find(".multiselect");

        if ($multi.multiselect('instance')) {
            $multi.multiselect('destroy');
        }
        if ($multi.find("option[selected=selected]").length === 0) {
            $multi.find("option[value=title]").attr("selected", "selected");
        }
        $multi.multiselect(mselOpts);
    },
    saveChanges: function (a, b, sf, ff) {
        if (this.model.get('Id') === Constants.c.emptyGuid) {
            this.model.unset('Id');
        }
        var that = this;
        this.model.save(null, {
            success: function (result) {
                that.collection.addNewField();
                that.model = that.collection.get(Constants.c.emptyGuid);
                Utility.executeCallback(sf, result);
            },
            failure: function (message) {
                ErrorHandler.addErrors(message);
                Utility.executeCallback(ff);
            }
        });
    },
    onRuleChange: function (selection) {
        var $targ = $(selection);
        var id = $targ.val();
        var currModelId = this.model.get('Id');
        // Only re-render if the rule has actually changed
        if (currModelId === id) {
            return;
        }
        if (!currModelId || currModelId === Constants.c.emptyGuid) {
            this.model.set(this.model.defaults);
        }
        this.model = this.collection.get(id);
        this.render();
    },
    //#region Event Handlers
    displayDetailLevelDescription: function (ev) {
        var $targ = $(ev.currentTarget);
        var options = {
            title: Constants.c.detailLevelHelp,
            msg:
                Constants.c.detailLevelDescription + '\r\n\r\n' +
                Constants.c.pawnsDetailLevelSummary + ':\r\n\t' +
                Constants.c.pawnsDetailLevelSummaryDescription + '\r\n\r\n' +
                Constants.c.pawnsDetailLevelFull + ':\r\n\t' +
                Constants.c.pawnsDetailLevelFullDescription,
            position: {
                my: "left top",
                at: "right top",
                of: $targ
            },
            modal: false
        };
        DialogsUtil.generalCloseDialog(undefined, options);
    },
    changeValue: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        this.model.set(name, $targ.val());
    },
    changeSortDescending: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var val = $targ.val();
        this.model.set(name, val === Constants.c.pawnsSortDesc);
    },
    changeIsDetailed: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var val = $targ.val();
        var isDetailed = val !== 'summary';
        this.model.set({
            'DetailLevel': val,
            'IsDetailed': isDetailed
        });
    },
    changeNewOnly: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var val = $targ.val();
        this.model.set(name, val === 'NewOnly');
    },
    changeSendEmailForZeroItem: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var val = $targ.val();
        this.model.set(name, val === 'yes');
    },
    changeColumns: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var val = JSON.stringify($targ.val());
        this.model.set(name, val);
    }
    //#endregion
});
