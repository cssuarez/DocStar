var TabOrderFieldSettingsView = Backbone.View.extend({
    tagName: 'div',
    viewData: {},
    ctbFieldSettingViews: [],
    isDirty: false,
    events: {
        "click li .additionalSelectedHTML .showEyeIcon, li .additionalSelectedHTML .hideEyeIcon": "changeFieldVisibility"
    },

    //#region View Rendering
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('tofieldsettingslayout'));
    },
   
    getRenderObject: function () {
        var ro = {};
        ro.reorderableFields = [];
       
        var formElementsLen = this.options.elements.length;
        for (idx = 0; idx < formElementsLen; idx++) {
            var element = this.options.elements.at(idx);
            var elementId = element.get('Id');
            var backingStoreName = element.getBackingStoreName();
            // Only elements with a BackingStoreId linked to a field have tab order.
            if (element.isDocumentProperty() || backingStoreName) {
                ro.reorderableFields.push({
                    value: elementId,
                    text: element.hasLabel() ? element.get('Label') : backingStoreName,
                    disabled: false,
                    'class': '',
                    tabindex: element.getAttributeValueInt('tabindex'),
                    top: element.get('Top'),
                    left: element.get('Left')
                });
            }
        }
        ro.reorderableFields = ro.reorderableFields.sort(function (a, b) {
            if (a.tabindex !== b.tabindex) {
                if (a.tabindex === -1) {
                    return 1;
                }
                if (b.tabindex === -1) {
                    return -1;
                }
                return Utility.sortByProperty('tabindex', false, 'asc')(a, b);
            }
            if (a.top !== b.top) {
                return Utility.sortByProperty('top', false, 'asc')(a, b);
            }
            if (a.left !== b.left) {
                return Utility.sortByProperty('left', false, 'asc')(a, b);
            }
            return 0;
        });
        return ro;
    },
    render: function () {
        var that = this;
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        var fields = this.viewData.reorderableFields;
        var fieldsLen = fields.length;
        var $selectedUL = this.$el.find('ul');
        var renderFields;
        var recursiveIncrementor = 0;
        renderFields = function (idx) {
            if (idx > fieldsLen - 1) {
                that.renderComplete();
            }
            else {
                var field = fields[idx];
                var showField = field.tabindex !== -1;
                field.showField = showField === undefined ? true : showField;
                var ctbFieldSettingView = new TabOrderFieldSettingView({
                    field: field
                });
                $selectedUL.append(ctbFieldSettingView.render());
                that.ctbFieldSettingViews.push(ctbFieldSettingView);
                setTimeout(function () {
                    renderFields(++recursiveIncrementor);
                }, 5);
            }
        };
        renderFields(recursiveIncrementor);
        return this.$el;
    },
    renderComplete: function () {
        var that = this;
        var $selectedUL = this.$el.find('ul');
        // Initialize sortable
        $selectedUL.sortable({
            items: '> li:visible:not("#' + Constants.c.emptyGuid + '")',
            containment: $selectedUL,
            cursor: 'move',
            change: function (event, ui) {
                that.setDirty();    // Position of a field has changed, set dirty bit
            }
        });
        this.resize();
        this.$el.trigger('ctbFullyRendered');
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    resize: function (resizeCallback) {
        Utility.executeCallback(resizeCallback);
        var $ul = this.$el.find('ul');
        // Use the first li found to get width information.
        var $li = $ul.first();
        var $additionalHTML = $li.find('.additionalSelectedHTML');
        var preWidth = $li.find('.preAdditionalSelectedHTML').outerWidth(true);
        var postWidth = $additionalHTML.outerWidth(true);
        var liWidth = $li.width();
        var $label = $ul.find('.limitLabelWidth');
        var labelWidth = liWidth - preWidth - postWidth;
        $label.width(labelWidth);
        $label.css({
            'max-width': labelWidth,
            'min-width': labelWidth
        });
    },
    //#endregion View Rendering

    //#region Event Handlers
    changeFieldVisibility: function (event) {
        this.setDirty();
        var $targ = $(event.currentTarget);
        var $li = this.$el.find('li').has($targ);
        var fieldView = this.getFieldSettingView($li.attr('id'));
        if ($targ.hasClass('showEyeIcon')) {
            // Make field appear visible
            $targ.removeClass('showEyeIcon').addClass('hideEyeIcon');
            $targ.attr('title', fieldView && fieldView.getHideFieldTooltip ? fieldView.getHideFieldTooltip() : Constants.c.hideField);
        }
        else {
            // Make field appear hidden
            $targ.removeClass('hideEyeIcon').addClass('showEyeIcon');
            $targ.attr('title', fieldView && fieldView.getShowFieldTooltip ? fieldView.getShowFieldTooltip() : Constants.c.showField);
        }
    },
    getFieldSettingView: function (ctbFieldId) {
        var fieldView;
        var idx;
        var length = this.ctbFieldSettingViews.length;
        for (idx = 0; idx < length; idx++) {
            var reorderableField = this.ctbFieldSettingViews[idx].viewData.field;
            if (reorderableField.value === ctbFieldId) {
                fieldView = this.ctbFieldSettingViews[idx];
                break;
            }
        }
        return fieldView;
    },
    //#endregion Event Handlers

    //#region Dirty Tracking
    getDirty: function () {
        return this.isDirty;
    },
    setDirty: function () {
        this.isDirty = true;
    },
    clearDirty: function () {
        this.isDirty = false;
    }
    //#endregion Dirty Tracking
});