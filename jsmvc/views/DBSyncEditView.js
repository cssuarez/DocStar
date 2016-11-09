var DBSyncEditView = Backbone.View.extend({
    viewData: {},
    events: {
        "click #saveDBSync": "saveChanges",
        "click #deleteDBSync": "kill",
        "change #dbSyncDTO select[name='InstanceId']": "changeSelection"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editdatabasesyncsettingslayout'));
        return this;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        $(this.el).html(this.compiledTemplate(this.viewData));
        this.delegateEvents(this.events);
        var id = this.viewData.selected.get('InstanceId');
        // disable delete button if selected setting is the global setting
        this.$el.find('#deleteDBSync').prop('disabled', id === Constants.c.all);
        this.$el.find('#deleteDBSync').attr('title', id === Constants.c.all ? Constants.c.cannotDeleteGlobalSetting : '');
        this.$el.find('input[name="ChunkSize"]').numeric({ negative: false, decimal: false });
        return this;
    },
    getRenderObject: function () {
        var r = {};
        var settings = window.dbSyncSettings;
        r.selected = this.viewData.selected;
        if (!r.selected) {   // If no setting is selected, select the global setting
            r.selected = settings.get(Constants.c.all);
        }
        if (!r.selected) {
            r.selected = settings.at(0);
        }
        r.selectedSetting = r.selected.attributes;
        r.settings = [];
        var i = 0;
        var length = window.companies.length;
        var globalSetting = settings.get(Constants.c.all);
        var attrs = $.extend({}, globalSetting.attributes);
        attrs.Name = Constants.c.all;
        attrs.Global = true;
        r.settings.push(attrs);
        globalSetting.set(attrs, { silent: true });
        for (i; i < length; i++) {
            var company = window.companies.at(i);
            var j = 0;
            var settingLength = settings.length;
            var setting = null;
            var settingId;
            for (j; j < settingLength; j++) {
                var set = settings.at(j);
                if (set) {
                    settingId = settings.at(j).get('InstanceId');
                    if (settingId && settingId === company.get('Id')) {
                        setting = settings.at(j);
                        break;
                    }
                }
            }
            var companyName = company.get('CompanyName');
            if (!setting) {
                setting = globalSetting;
                attrs = $.extend({}, setting.attributes);
                attrs.Name = companyName;
                attrs.InstanceId = company.get('Id');
                attrs.Global = true;
                r.settings.push(attrs);
                attrs.id = company.get('Id');
                settings.add(attrs, { silent: true });    // Add to the collection of settings, if it doesn't exist yet.
            }
            else {
                attrs = $.extend({}, setting.attributes);
                attrs.Name = setting.get('Global') ? companyName : companyName + '*';
                r.settings.push(attrs);
                setting.set({ Name: companyName }, { silent: true });
            }
        }
        return r;
    },
    changeSelection: function (event) {
        var $targ = $(event.currentTarget);
        var $selected = $targ.find(':selected');
        var id = $selected.val();
        var model = window.dbSyncSettings.get(id);
        this.viewData.selected = model;
        this.render();
    },
    saveChanges: function (ev) {
        var that = this;
        var attrs = DTO.getDTO(this.$el);
        attrs.Throttling = {};
        attrs.Throttling.ChunkSize = attrs.ChunkSize * 1024; // Convert from KiloBytes back to Bytes
        attrs.Throttling.ChunkDelay = attrs.ChunkDelay;
        var newClass = new DBSyncSetting(attrs);
        if (attrs.InstanceId === Constants.c.all) {
            attrs.InstanceId = null;
        }
        newClass.save(attrs, {
            success: function (model, result) {
                that.$el.find('#saveDBSync').removeAttr('disabled');
                that.$el.find('#deleteDBSync').removeAttr('disabled');
                var id = model.get('InstanceId');
                if (id !== Constants.c.all) {
                    model.set({ Global: false });
                }
                that.saveSuccess(model, result, id, window.dbSyncSettings, that);
            },
            failure: function (jqXHR, textStatus, errorThrown) {
                ErrorHandler.popUpMessage(errorThrown);
            },
            error: that.handleErrors
        });
    },
    kill: function (ev) {
        if (this.viewData.selected.get('InstanceId') === Constants.c.all) { // Do not allow deletion of global setting
            return;
        }
        var dto = DTO.getDTO(this.$el.find('#dbSyncDTO'));
        var id = dto.InstanceId;
        var model = window.dbSyncSettings.get(id);
        var sf = function (result) {
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.addErrors(errorThrown.Message.toString());
        };
        model.destroy({ wait: true, success: sf, failure: ff });
    },
    handleErrors: function (model, errors) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    }
});
