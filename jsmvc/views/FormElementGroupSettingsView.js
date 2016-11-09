// Render the settings of a form element
var FormElementGroupSettingsView = Backbone.View.extend({
    model: null, // Form Element Group
    formTemplatePkg: null,  // Form Template Package
    className: 'FormElementGroupSettingsView',
    events: {
        'input input[name="spacing"]': 'changeSettings',
        'change select[name="RepeatDirection"]': 'changeSettings',
        'input input[name="MinCount"]': 'changeSettings',
        'input input[name="MaxPerPage"]': 'changeSettings',
        'change select[name="SortById"]': 'changeSettings'
    },
    initialize: function (options) {
        this.options = options;
        this.formTemplatePkg = this.options.formTemplatePkg;
        this.compiledTemplate = doT.template(Templates.get('formtemplatefieldgroupsettingslayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        if (!this.model) {  // Should never go in here - developer check only
            Utility.OutputToConsole(String.format(Constants.t('formElementGroup'), Constants.t('entityDoesNotExist')));
            return false;
        }
        var ro = this.model.toJSON();
        ro.sortByItems = [];
        // Obtain form elements that are part of this group
        var elements = this.formTemplatePkg.getGroupsElements(this.model.get('Id'));
        var idx = 0;
        var length = elements.length;
        for (idx; idx < length; idx++) {
            if (elements[idx]) {
                var cfmId = elements[idx].get('BackingStoreId');
                var cf = window.customFieldMetas.get(cfmId);
                if (cf) {
                    ro.sortByItems.push({
                        Name: cf.get('Name'),
                        Id: cfmId,
                        selected: cfmId === ro.SortById ? 'selected' : undefined
                    });
                }
            }
        }
        ro.repeatVertically = parseInt(ro.RepeatDirection, 10) === Constants.rd.Vertically;    // Should default to repeating vertically in model
        ro.repeatHorizontally = !ro.repeatVertically;
        ro.spacing = this.model.get('spacing');
        // Change the label for MaxPerPage depending on if the layout mode for the template is 'Flow' or 'Grid'
        ro.isFlowLayout = !this.formTemplatePkg.get('Template').hasFormProperty(Constants.fp.ElementGroupGridLayout);
        ro.maxPerPageLabel = ro.isFlowLayout ? Constants.t('flowAfter') : Constants.t('maxPerPage');
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        if (!viewData) {
            return;
        }
        this.$el.html(this.compiledTemplate(viewData));
        var fegSettingsView = this;
        this.listenTo(this.model, 'change', function (model, collection, options) {
            ErrorHandler.removeErrorTagsElement(fegSettingsView.$el);
        });
        this.listenTo(this.model, 'invalid', function (model, errors, options) {
            var item;
            for (item in errors) {
                if (errors.hasOwnProperty(item)) {
                    ErrorHandler.removeErrorTagsElement(fegSettingsView.$el.find('label').has(fegSettingsView.$el.find('[name="' + item + '"]')));
                }
            }
            ErrorHandler.addErrors(errors);
        });
        this.$el.find('input[name="spacing"]').numeric({ negative: true, decimal: false });
        this.$el.find('input[name="MinCount"], input[name="MaxPerPage"]').numeric({ negative: false, decimal: false });
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    changeSettings: function (ev) {
        var that = this;
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var cb = function () {
            var model = that.model.toJSON();
            model[name] = $targ.val();
            that.model.set(model, { validate: true });
        };
        if (ev.type === 'input') {
            if (this.inputTimeout) {
                clearTimeout(this.inputTimeout);
            }
            this.inputTimeout = setTimeout(function () {
                cb();
            }, Constants.TypeAheadDelay);
        }
        else {
            cb();
        }
    }
    //#endregion Event Handling
});