var CustomFieldMetaGroupEditView = Backbone.View.extend({
    saveButtonSelector: 'input[name="save"]',
    deleteButtonSelector: 'input[name="delete"]',
    saveAndDeleteButtonSelector: this.saveButtonSelector + ', ' + this.deleteButtonSelector,
    noPreview: false,
    viewData: {},
    isDirty: false,
    events: {
        'click input[name="save"]': "saveChanges",
        'click input[name="delete"]': "kill",
        'click div.toggle_btn': 'toggleSettingButtons',
        'sortstop ul.selected': 'previewGroup'
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editcustomfieldmetagroupslayout'));
        this.options = options || {};
        return this;
    },
    render: function (noPreview) {
        this.noPreview = noPreview;
        var newcfg = new CustomFieldMetaGroupPackage({ CustomFieldGroup: { Id: Constants.c.emptyGuid, Name: Constants.c.newTitle }, CustomFieldGroupTemplates: [] });
        this.viewData.list = new CustomFieldMetaGroupPackages(window.customFieldMetaGroupPackages.toJSON()).getNewList(newcfg);
        this.viewData.hasFieldPerm = Utility.hasFlag(window.gatewayPermissions, Constants.gp.Custom_Fields);
        if (!this.viewData.hasFieldPerm) {
            var rmoGP = Utility.reverseMapObject(Constants.gp);
            this.viewData.list.errorMsg = String.format(Constants.c.insufficientPermissionsRight, Constants.t('gp_' + rmoGP[Constants.gp.Custom_Fields]));
        }
        this.viewData.listcf = window.customFieldMetas;
        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }
        // Display preview of line items
        $(this.el).html(this.compiledTemplate(this.viewData));
        this.delegateEvents(this.events);
        this.setupCombobox();
        this.toggleSaveButtons();
        return this;
    },
    updateView: function () {
        this.viewData.selected = undefined;
        this.render();
        this.setupSlapbox();
    },
    setupCombobox: function () {
        var that = this;
        var $el = this.$el;
        var $select = $el.find('select[name="Name"]');
        $select.combobox();
        $el.find('.isCombo').autocomplete({
            select: function (event, ui) {
                that.changeSelection(event, ui.item.option);
            },
            change: function (event, ui) {
                if (!ui.item) {
                    var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex($(this).val()) + "$", "i"),
                        valid = false;
                    $el.find('select[name="Name"]').children("option").each(function () {
                        if ($(this).text().match(matcher)) {
                            this.selected = valid = true;
                            that.changeSelection(event, this);
                            return false;
                        }
                    });
                }
            }
        });
    },
    // setupSlapbox - setup the ui multiselect list - DO NOT call until after this.$el has been added to the DOM
    setupSlapbox: function () {
        var $el = this.$el;
        $.extend(true, $.ui.multiselect, {
            locale: {
                addAll: '',
                removeAll: '',
                itemsCount: Constants.t('fieldsSelected')
            }
        });
        var that = this;
        var mselOpts = {
            dividerLocation: 0.7,
            additionalHTML: {},
            addEvent: function () {
                that.isDirty = true;
                that.previewGroup();
            },
            removeEvent: function () {
                that.isDirty = true;
                that.previewGroup();
            }
        };
        // obtain settings from custom field group templates, corresponding to the selected custom field group
        var msel = $el.find('.multiselect');
        var idx = 0;
        msel.hide();
        var items = msel.find('option');
        var cfg = this.viewData.selected;
        var cfgts = cfg.get('CustomFieldGroupTemplates');
        var cfgtsLen = cfgts.length;
        var itemLen = items.length;
        for (idx; idx < itemLen; idx++) {
            var item = items[idx];
            var cfId = $(item).val();
            var cfgtIdx = 0;
            var cfgtSettings = {};
            for (cfgtIdx; cfgtIdx < cfgtsLen; cfgtIdx++) {
                var cfgt = cfgts[cfgtIdx];
                if (cfgt.CustomFieldMetaId === cfId) {
                    cfgtSettings = Utility.tryParseJSON(cfgt.Settings) || {};
                    break;
                }
            }
            var settingsTemplate = doT.template(Templates.get('customfieldgroupsettingslayout'));
            mselOpts.additionalHTML[cfId] = settingsTemplate(cfgtSettings);
        }
        msel.multiselect(mselOpts);
        this.$el.find(".ui-state-default.ui-element.ui-draggable").css("display", "list-item");
        if (!this.noPreview) {
            this.previewGroup();
        }
    },
    previewGroup: function () {
        var $el = this.$el.find('.cfgGridsContainer');
        $el.empty();
        var gPkg = this.getCurrentCustomFieldMetaGroupPackage();
        if (gPkg && gPkg.get('CustomFieldGroupTemplates').length !== 0) {
            var fieldGroupPreview = new DocumentMetaFieldGroupView({
                model: gPkg.createSampleData(),
                showGroupName: false,
                canDelete: false,
                canDeleteGroup: false,
                canSave: false,
                previewMode: true
            });
            fieldGroupPreview.groupPkg = gPkg;
            fieldGroupPreview.groupId = gPkg.get('Id') || Constants.c.emptyGuid;
            $el.append(fieldGroupPreview.render().$el).show();
        } else {
            $el.hide();
        }
        this.toggleSaveButtons();
    },
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(this.viewData.list);
        return this;
    },
    changeSelection: function (event, selection) {
        var id = $(selection).val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        }
        else {
            var model = this.viewData.list.get(id);
            this.viewData.selected = model;
        }
        this.isDirty = false;
        this.render();
        this.setupSlapbox();
    },
    getCurrentCustomFieldMetaGroupPackage: function () {
        var cfg = DTO.getDTOCombo(this.$el);
        var cfgt = [];
        var selectedFields = this.$el.find('.multiselect :selected');
        var i = 0;
        var length = selectedFields.length;
        for (i; i < length; i++) {
            var cfmId = $(selectedFields[i]).val();
            var settings = this.getSettings(cfmId);
            cfgt.push({
                Id: $(selectedFields[i]).data('customfieldgrouptemplateid') || Constants.c.emptyGuid,
                CustomFieldGroupId: cfg.Id,
                CustomFieldMetaId: cfmId,
                Order: i + 1,
                Settings: JSON.stringify(settings)
            });
        }

        if (cfg.Id === Constants.c.emptyGuid) {
            delete cfg.Id;
        }
        var attrs = {
            CustomFieldGroup: cfg,
            CustomFieldGroupTemplates: cfgt
        };
        return new CustomFieldMetaGroupPackage(attrs);
    },
    saveChanges: function (ev, headers) {
        var that = this;
        that.toggleButtons({ selector: that.$el.find(that.saveAndDeleteButtonSelector), enable: false });
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var newCustomFieldMetaGroupPackage = that.getCurrentCustomFieldMetaGroupPackage();
        var options = {
            success: function (model, result) {
                var cfg = model.get('CustomFieldGroup');
                model = new CustomFieldMetaGroupPackage(result);
                that.saveSuccess(model, result, cfg.Id, window.customFieldMetaGroupPackages, that);
            },
            failure: function (jqXHR, textStatus, errorThrown) {
                if (errorThrown && errorThrown.Type && errorThrown.Type.match('OverridableException')) {
                    ErrorHandler.displayOverridableDialogErrorPopup(errorThrown.Message, function (closeFunc) {
                        var headers = { "ds-options": Constants.sro.OverrideErrors };
                        that.saveChanges(ev, headers);
                        Utility.executeCallback(closeFunc);
                    });
                }
                else if (errorThrown && errorThrown.Message) {
                    that.handleErrors(null, errorThrown.Message);
                }
            },
            complete: function () {
                that.toggleButtons({ selector: that.$el.find(that.saveAndDeleteButtonSelector), enable: true });
            },
            headers: headers
        };
        if (!newCustomFieldMetaGroupPackage.save({}, options)) {                        //Save returns false if there is a validation error
            ErrorHandler.addErrors(newCustomFieldMetaGroupPackage.validationError, null,null,null, null, null, this.$el);          
        }
    },
    kill: function (ev) {
        var that = this;
        var id = this.getSelectedGroupId();
        if (id === Constants.c.emptyGuid) {
            this.handleErrors(null, Constants.c.cannotDeleteNew);
            return;
        }
        var model = window.customFieldMetaGroupPackages.get(id);
        var headers;
        var sf = function (result) {
            window.customFieldMetaGroupPackages.remove(model);
        };
        var ff;
        ff = function (jqXHR, textStatus, error) {
            if (error && error.Type && error.Type.match('OverridableException')) {
                var options = {
                    close: function () {
                        window.customFieldMetaGroupPackages.add(model);
                    }
                };
                ErrorHandler.displayOverridableDialogErrorPopup(error.Message, function (closeFunc) {
                    var headers = { "ds-options": Constants.sro.OverrideErrors };
                    model.destroy({ success: sf, failure: ff, headers: headers, wait: true });
                    Utility.executeCallback(closeFunc);
                }, options);
            }
            else {
                that.handleErrors(null, error.Message);
            }
        };
        model.destroy({ success: sf, failure: ff, headers: headers });
    },
    toggleSettingButtons: function (ev) {
        var $targ = $(ev.currentTarget);
        var $input = $targ.find('input');
        var isPressed = $targ.hasClass('pressed');
        var isToggle = $targ.hasClass('toggle');
        $targ.parent().find('.pressed').removeClass('pressed');
        if ((isToggle && !isPressed) || !isToggle) {
            $targ.addClass('pressed');
        }
        if (isToggle) {
            $input.val(!Utility.convertToBool($input.val()));    // toggle a boolean value
        }
        ev.preventDefault();
        this.isDirty = true;
        this.previewGroup();
    },
    getSettings: function (customFieldMetaId) {
        var $parentli = this.$el.find('#' + customFieldMetaId);
        var pressed = $parentli.find('.pressed');
        var idx = 0;
        var length = pressed.length;
        var settings = {};
        for (idx; idx < length; idx++) {
            var input = $(pressed[idx]).find('input');
            settings[input.attr('name')] = input.val();
        }
        return settings;
    },
    toggleButtons: function (toggleObj) {
        var $sel = toggleObj.selector;
        var enable = toggleObj.enable;
        $sel.toggle(enable);
    },
    getSelectedGroupId: function () {
        var id = Constants.c.emptyGuid;
        if (this.viewData.selected && this.viewData.selected.get('CustomFieldGroup')) {
            id = this.viewData.selected.get('CustomFieldGroup').Id;
        }
        return id;
    },
    handleErrors: function (model, error) {
        this.toggleButtons({ selector: this.$el.find(this.saveAndDeleteButtonSelector), enable: true });
        var errors = {};
        model = model || {};
        if (error.statusText === undefined) {
            errors = error;
        }
        else {
            errors.errors = error.statusText;
        }
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass, null, null, this.$el);
    },
    toggleSaveButtons: function () {
        if (this.isDirty) {
            Utility.toggleInputButtons(this.saveButtonSelector, true);

        } else {
            Utility.toggleInputButtons(this.saveButtonSelector, false);
        }
    }
});

