var FormElementValueView = Backbone.View.extend({
    model: null,    // Form Element
    formElements: null, // Form Elements
    formElementLabelValuePairsView: null,
    className: 'FormElementValueView',
    events: {
        'input input[name="Value"]': 'changeValue',
        'change input[name="Value"][type="checkbox"]': 'changeValue',
        'input textarea[name="HelpText"]': 'changeHelpText'
    },
    initialize: function (options) {
        this.options = options;
        this.formElements = this.options.formElements;
        this.compiledTemplate = doT.template(Templates.get('formelementvaluelayout'));
        var fevv = this;
        this.valueTextSetting = new TextSetting();
        this.valueTextSettingsView = new TextSettingsView({ model: this.valueTextSetting, displayLabels: true });
        var idx;
        var length;
        this.listenTo(this.valueTextSetting, 'change', function (model, options) {
            var selected = fevv.formElements.getSelected();
            length = selected.length;
            for (idx = 0; idx < length; idx++) {
                selected[idx].replaceAttributeValues({ style: model.changedAttributes() });
            }
        });
        this.labelValuePairsCPX = new LabelValuePairsCPX({ Vertical: true, LabelValuePairs: [], type: this.model.get('Tag') === Constants.ft.CheckBoxGroup ? 'checkbox' : 'radio' });
        this.listenTo(this.labelValuePairsCPX, 'change:Vertical', function (model, value) {
            fevv.model.updateLabelValuePairData(undefined, model.changedAttributes());
        });
        this.listenTo(this.labelValuePairsCPX.get('LabelValuePairs'), 'add remove', function (model, collection, options) {
            options = options || {};
            if (!options.ignore) {
                var lvpis = this.labelValuePairsCPX.get('LabelValuePairs').toJSON();
                fevv.model.updateLabelValuePairData(lvpis);
            }
        });
        this.listenTo(this.labelValuePairsCPX.get('LabelValuePairs'), 'change:IsSelected', function (model, value, options) {
            if (value) {
                if (fevv.model.get('Tag') === Constants.ft.RadioButtonGroup) {
                    fevv.labelValuePairsCPX.get('LabelValuePairs').setSelected([model.get('Label')], { silent: true });
                }
            }
            var lvps = fevv.labelValuePairsCPX.get('LabelValuePairs');
            fevv.model.updateLabelValuePairData(lvps);
        });
        this.listenTo(this.labelValuePairsCPX.get('LabelValuePairs'), 'change', function (model, options) {
            var lvps = fevv.labelValuePairsCPX.get('LabelValuePairs').toJSON();
            fevv.model.updateLabelValuePairData(lvps);
        });
        this.listenTo(this.model, 'change:BackingStoreId', function (model, value, options) {
            var lvps = this.model.setDefaultValues(model, value, options);
            if (lvps) {
                this.labelValuePairsCPX.get('LabelValuePairs').reset(lvps);
            }
            this.render();
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.HelpText = this.model.getHelpText();
        ro.isDocProp = this.model.isDocumentProperty();
        ro.Tag = this.model.get('Tag');
        ro.isLabelValuePair = this.model.isLVPGroup();
        ro.Value = this.model.get('Value');
        ro.isCheckbox = ro.Tag === Constants.ft.CheckBox;
        var idx;
        var length;
        if (ro.isLabelValuePair) {
            var val = Utility.tryParseJSON(ro.Value, true);
            if (val) {
                length = val.Values.length;
                for (idx = 0; idx < length; idx++) {
                    this.labelValuePairsCPX.get('LabelValuePairs').add(val.Values[idx], { ignore: idx !== length - 1 });
                }
                this.labelValuePairsCPX.set('Vertical', val.Vertical);
            }
        }
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        // If the form element is a 'Checkbox' then there are no other settings that need to be added
        if (viewData.isCheckbox) {
            return this;
        }
        if (viewData.isLabelValuePair) {
            if (this.formElementLabelValuePairsView) {
                this.formElementLabelValuePairsView.close();
            }
            this.formElementLabelValuePairsView = new FormElementLabelValuePairsView({
                model: this.labelValuePairsCPX,
                formElement: this.model,
                collection: this.labelValuePairsCPX.get('LabelValuePairs')
            });
            this.$el.find('.labelValuePairContainer fieldset').append(this.formElementLabelValuePairsView.render().$el);
        }
        else {
            this.valueTextSettingsView.model.set(this.model.getAttributesAsTextSettingJSON(), { silent: true });
            this.$el.find('.fontSettingsContainer').append(this.valueTextSettingsView.render().$el);
        }
        return this;
    },
    cleanupChildViews: function () {
        if (this.formElementLabelValuePairsView) {
            this.formElementLabelValuePairsView.close();
        }
        if (this.valueTextSettingsView) {
            this.valueTextSettingsView.close();
        }
    },
    close: function () {
        this.cleanupChildViews();
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    changeValue: function (ev) {
        var tag = this.model.get('Tag');
        if (tag === Constants.ft.CheckBoxGroup || tag === Constants.ft.RadioButtonGroup) {
            return; // Value is set separately for checkbox groups and radio button groups
        }
        var that = this;
        if (this.changeValueTimeout) {
            clearTimeout(this.changeValueTimeout);
        }
        this.changeValueTimeout = setTimeout(function () {
            var $targ = $(ev.currentTarget);
            var val = $targ.val();
            var selected = that.formElements.getSelected();
            var idx = 0;
            var length = selected.length;
            for (idx; idx < length; idx++) {
                var fe = selected[idx];
                if (fe.get('Tag') === Constants.ft.CheckBox) {
                    val = ev.currentTarget.checked;
                }
                fe.set('Value', val);
            }
        }, Constants.TypeAheadDelay);
    },

    changeHelpText: function (ev) {
        var that = this;
        if (this.inputTimeout) {
            clearTimeout(this.inputTimeout);
        }
        this.inputTimeout = setTimeout(function () {
            var $targ = $(ev.currentTarget);
            var selected = that.formElements.getSelected();
            var idx = 0;
            var length = selected.length;
            for (idx; idx < length; idx++) {
                selected[idx].replaceAttributeValues({ title: $targ.val() });
            }
        }, Constants.TypeAheadDelay);
    }
    //#endregion Event Handling
});