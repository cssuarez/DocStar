var AuditView = Backbone.View.extend({
    className: 'AuditView',
    model: undefined, //AuditResultsCPX
    auditGridView: undefined,
    events: {
        'click input[name="search"]': 'search',
        'click input[name="clear"]': 'clear',
        'click input[name="submitAuditClear"]': 'clearAudit',
        'change #audit_search_terms input': 'searchTermChanged',
        'keyup #audit_search_terms input': 'searchTermChanged',
        'change #auditPurgeDate': 'searchTermChanged',
        'keyup #auditPurgeDate': 'searchTermChanged',
        'change #audit_search_terms select': 'searchTermChanged',        
        'click input[type="radio"]': 'searchTermChanged'
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('auditlayout'));
        this.model = new AuditResultsCPX({ Request: { StartDate: new Date().format('generalDateOnly') } });
        this.listenTo(this.model, 'sync', this.modelSync);
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        var html_data = this.compiledTemplate(ro);
        this.$el.html(html_data);
        var that = this;
        this.$el.find("#startDate").val(new Date().format('generalDateOnly')).datetimepicker({});
        this.$el.find("#endDate").datetimepicker(
           {
               beforeShow: function () {
                   $("#endDate").datetimepicker("option", {
                       minDate: $("#startDate").val()
                   });
               }
           });
        this.$el.find("#auditPurgeDate").datetimepicker();
        if (this.auditGridView) {
            this.auditGridView.close();
            this.auditGridView = undefined;
        }
        this.auditGridView = new AuditGridView({ model: this.model });
        this.$el.find('.auditGrid').html(this.auditGridView.render().$el);
        setTimeout(ShowHidePanel.toggleAdminScrollbar, 0);
        this.delegateEvents(this.events);
        return this;
    },
    getRenderObject: function () {
        var req = this.model.get('Request');
        var ro = {
            username: req.get('User') || '',
            title: req.get('Title') || '',
            description: req.get('Description') || '',
            startDate: req.get('StartDate') || '',
            endDate: req.get('EndDate') || '',
            actionTypes: [],
            entityTypes: [],
            purgeAllSelected: this.model.get('purgeAll') ? 'checked="checked"' : '',
            purgeByDateSelected: !this.model.get('purgeAll') ? 'checked="checked"' : '',
            purgeDate: this.model.get('purgeDate') || '',
            purgeDateDisabled: this.model.get('purgeAll') ? 'disabled="disabled"' : '',
            clearAuditStyle: '',
            statusMessage: this.model.get('Message') || ''
        };
        
        var gwp = window.gatewayPermissions;
        var canDelete = Utility.checkGP(gwp, Constants.gp.ClearAudit);
        if (!canDelete) {
            ro.clearAuditStyle = 'display:none;';
        }
        var curAt = req.get('Type');
        var x;
        for (x in Constants.at) {
            if (Constants.at.hasOwnProperty(x) && Constants.at[x] !== 0) {
                ro.actionTypes.push({
                    value: Constants.at[x],
                    selected: curAt === Constants.at[x] ? 'selected="selected"' : '',
                    text: Constants.c[('at_' + x)]
                });
            }
        }
        var curEt = req.get('EntityType');
        for (x in Constants.et) {
            if (Constants.et.hasOwnProperty(x) && Constants.c[('et_' + x)] && x !== 'Step' && x !== 'None') {
                ro.entityTypes.push({
                    value: Constants.et[x],
                    selected: curEt === Constants.et[x] ? 'selected="selected"' : '',
                    text: Constants.c[('et_' + x)]
                });
            }
        }
        ro.actionTypes.sort(function (a, b) {
            if (a.text < b.text) { return -1; }
            if (a.text > b.text) { return 1; }
            return 0;
        });
        ro.entityTypes.sort(function (a, b) {
            if (a.text < b.text) { return -1; }
            if (a.text > b.text) { return 1; }
            return 0;
        });

        return ro;
    },
    searchTermChanged: function (e) {
        var $sel = $(e.currentTarget);        
        var value = $sel.val();
        var name = $sel.attr('name');
        ErrorHandler.removeErrorTagsElement($(e.currentTarget).parent(), css.warningErrorClass, css.inputErrorClass);
        if (name === 'auditClearType') {
            if (value === 'purgeAllAudit') {
                this.model.set('purgeAll', true);
                $('#auditPurgeDate').prop("disabled", true).val(''); //Set value blank
                ErrorHandler.removeErrorTagsElement($('#auditPurgeDate').parent(), css.warningErrorClass, css.inputErrorClass); //Remove warningErrorClass
            } else {
                this.model.set('purgeAll', false);
                $('#auditPurgeDate').prop("disabled", false);
            }
        } else if (name === 'auditPurgeDate') {
            this.model.set('purgeDate', value);
        } else {
            var err = this.model.get('Request').setByName(name, value);
            if (err) {
                var data = {};
                data[name] = err;
                ErrorHandler.addErrors(data);
            }
        }
    },
    search: function () {
        if (this.$el.find('.' + css.warningErrorClass).length === 0) {
            this.model.fetch({
                complete: function () {
                    $('input[name="search"]').prop('disabled', false);
                    $('input[name="submitAuditClear"]').prop('disabled', false);
                }
            });
            $('input[name="search"]').attr('disabled', true);
            $('input[name="submitAuditClear"]').attr('disabled', true);
        }
        else {
            ErrorHandler.addErrors(Constants.c.errorFixMessage);
        }
    },
    clear: function () {
        this.model.clear();
        this.render();
    },
    clearAudit: function () {
        var that = this;
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.warningErrorClassTag);
        var dialogFunc = function (options) {
            that.$el.find('input[name="search"], input[name="submitAuditClear"]').prop('disabled', true);
            var $dialog;
            var opts = {
                autoOpen: false,
                width: 'auto',
                maxWidth: 600,
                height: 150,
                resizable: false
            };
            var cf = function () {
                that.$el.find('input[name="search"], input[name="submitAuditClear"]').prop('disabled', false);
            };
            var okFunc = function (cleanup) {
                var cb = function () {
                    Utility.executeCallback(cleanup);
                    cf();
                };
                Utility.executeCallback(options.callback, cb);
            };
            var closeFunc = function (cleanup) {
                cf();
                Utility.executeCallback(cleanup);
            };
            $dialog = DialogsUtil.generalPromptDialog(options.message, okFunc, closeFunc, opts);
            $dialog.dialog('open');

        };
        this.model.clearAudit(dialogFunc, 'auditPurgeDate');
    },
    modelSync: function () {
        this.$el.find('#statusMsg').text(this.model.get('Message') || '');
    }
});
