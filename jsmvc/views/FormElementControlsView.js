var FormElementControlsView = Backbone.View.extend({
    model: null, //Form Template Package
    className: 'FormElementControlsView',
    renderedFormElements: null,
    formElementTemplates: {},
    ctFieldControlsView: undefined, //FormContentTypeControlsView
    cfmControlsView: undefined, // FormCustomFieldMetaControlsView
    cfgControlsView: undefined, //FormCustomFieldGroupControlsView
    renderTimeout: undefined,
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formelementcontrolslayout'));
        this.ctFieldControlsView = new FormContentTypeControlsView({ model: this.model });
        this.cfmControlsView = new FormCustomFieldMetaControlsView({ model: this.model });
        this.cfgControlsView = new FormCustomFieldGroupControlsView({ model: this.model });
        var that = this;
        this.listenTo(this.model.get('Parts'), 'change:current', function (model, value, options) {
            options = options || {};
            var ignoreChange = options.ignoreChange;
            if (value && !ignoreChange) {
                this.renderWithDrag();
            }
        });
        this.listenTo(this.model.get('Parts'), 'add remove reset', function () {
            this.renderWithDrag();
        });
        this.listenTo(this.model.get('Template'), 'change:DefaultContentTypeId', function (model, value, options) {
            this.renderWithDrag();
        });
        this.listenTo(this.model.get('Template'), 'change:SnapToGridSize', function (model, value, options) {
            this.renderWithDrag();
        });
        this.listenTo(this.model.get('Template'), 'change:PageSize', function (model, value, options) {
            this.renderWithDrag();
        });
        this.listenTo(window.customFieldMetaGroupPackages, 'add remove reset change', function () {
            this.renderWithDrag();
        });
        this.listenTo(this.model.get('ElementGroups'), 'remove', function (model, value, options) {
            var that = this;
            var $draggables = this.cfgControlsView.$el.find('li').add(this.$el.find('li.enhancedControl'));
            var length = $draggables.length;
            var cfgFound = false;
            var basicFound = false;
            for (i = 0; i < length; i++) {
                var $draggable = $draggables.eq(i);
                var cfgId = model.get('CustomFieldGroupId');
                if ($draggable.find('input').val() === cfgId) {
                    that.setDraggableState($draggable);
                    cfgFound = true;
                }
                else {
                    var cfgName = $draggable.find('[name="CustomFieldGroupName"]').val();
                    if (cfgName) {
                        cfgPkg = window.customFieldMetaGroupPackages.getByName(cfgName);
                    }
                    if (cfgPkg && cfgPkg.get('CustomFieldGroup').Id === cfgId) {
                        that.setDraggableState($draggable);
                        basicFound = true;
                    }
                }
                if (cfgFound && basicFound) {
                    break;
                }
            }
        });
        $('body').bind('formElementControlsViewRenderedInit', function () {
            clearTimeout(that.renderTimeout);
            if (that.$el.is(':visible')) {
                that.setupDrag();
                $('body').unbind('formElementControlsViewRenderedInit');
            }
            else {
                that.renderTimeout = setTimeout(function () {
                    $('body').trigger('formElementControlsViewRenderedInit');
                }, 10);
            }
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.basicInputControlsAccState = Utility.GetUserPreference('basicInputControlsForms') || 'open';
        ro.enhancedInputControlsAccState = Utility.GetUserPreference('enhancedInputControlsForms') || 'open';
        ro.documentPropertiesAccState = Utility.GetUserPreference('documentPropertiesForms') || 'open';
        return ro;
    },
    renderElements: function (renderOptions) {
        var that = this;
        var guids = Utility.getSequentialGuids(15);
        var sf = function (result) {
            var feIdx = 0;
            var feLen = result.length;
            for (feIdx; feIdx < feLen; feIdx++) {
                var fe = that.renderedFormElements.get(result[feIdx].Key);
                if (fe) {
                    that.formElementTemplates[fe.get('Tag')] = fe;
                }
            }
            that.render(renderOptions);
        };
        var labelWidth = 'width: 100px;';
        var attrs = 'style="' + labelWidth + ' height: {0}px;"';
        var inputAttrs = String.format(attrs, 16);
        var inputWidth = 121;
        var datetimeInputWidth = 158;
        var selectWidth = 127;
        var comboWidth = 95;
        var cbAttrs = String.format(attrs, 13);
        var selectAttrs = String.format(attrs, 18);
        var txtAreaAttrs = String.format(attrs, 16);
        var formLabelValuePairs = JSON.stringify({
            Values: [{
                Label: Constants.c.firstChoice,
                Value: '',
                IsSelected: true
            }, {
                Label: Constants.c.secondChoice,
                Value: ''
            }, {
                Label: Constants.c.thirdChoice,
                Value: ''
            }],
            Vertical: true
        });
        var cbgFormLabelValuePairs = JSON.stringify({
            Values: [{
                Label: Constants.c.firstChoice,
                Value: ''
            }, {
                Label: Constants.c.secondChoice,
                Value: ''
            }, {
                Label: Constants.c.thirdChoice,
                Value: ''
            }],
            Vertical: true
        });
        var formElements = [
            { Tag: Constants.ft.Label, Label: Constants.c.label, ContainerAttributes: 'style="z-index: 50;"', LabelAttributes: inputAttrs },
            { Tag: Constants.ft.TextInput, Label: Constants.c.singleLineText, ContainerAttributes: 'style="z-index: 50;"', Width: inputWidth, Height: 16, LabelAttributes: inputAttrs },
            { Tag: Constants.ft.NumberInput, Label: Constants.c.singleLineText, ContainerAttributes: 'style="z-index: 50;"', Width: inputWidth, Height: 16, LabelAttributes: inputAttrs },
            { Tag: Constants.ft.CheckBox, Label: Constants.c.checkbox, ContainerAttributes: 'style="z-index: 50;"', Width: 13, Height: 13, LabelAttributes: cbAttrs },
            { Tag: Constants.ft.CheckBoxGroup, Value: cbgFormLabelValuePairs, ContainerAttributes: 'style="z-index: 50;"', Width: 13, Height: 13, BackingStoreId: Constants.c.emptyGuid, LabelAttributes: cbAttrs },
            { Tag: Constants.ft.RadioButtonGroup, Value: formLabelValuePairs, ContainerAttributes: 'style="z-index: 50;"', Width: 13, Height: 13, BackingStoreId: Constants.c.emptyGuid, LabelAttributes: cbAttrs },
            { Tag: Constants.ft.TextArea, Label: Constants.c.multiLineText, ContainerAttributes: 'style="z-index: 50;"', Width: inputWidth, Height: 50, LabelAttributes: txtAreaAttrs },
            { Tag: Constants.ft.Image, Label: '', ContainerAttributes: 'style="z-index: 20;"' /* so img tags appear behind other tags */, Width: 100, Height: 100 },
            { Tag: Constants.ft.FileUpload, Label: Constants.c.fileUpload, ContainerAttributes: 'style="z-index: 50;"', LabelAttributes: inputAttrs },
            { Tag: Constants.ft.Select, Value: '', Label: Constants.c.dropdown, ContainerAttributes: 'style="z-index: 50;"', Width: selectWidth, Height: 20, LabelAttributes: selectAttrs },
            { Tag: Constants.ft.ComboBox, Value: '', Label: Constants.c.combobox, ContainerAttributes: 'style="z-index: 50;"', Width: comboWidth, Height: 16, LabelAttributes: inputAttrs },
            { Tag: Constants.ft.HorizontalRule, ContainerAttributes: 'style="z-index: 10;"' /* so section break tags appear behind other tags (including image) */, Width: inputWidth, Height: 2 },
            { Tag: Constants.ft.Date, Width: inputWidth, Height: 16, ContainerAttributes: 'style="z-index: 50;"', Label: Constants.c.date, LabelAttributes: inputAttrs },
            { Tag: Constants.ft.DateTime, Width: datetimeInputWidth, Height: 16, ContainerAttributes: 'style="z-index: 50;"', Label: Constants.c.datetime, LabelAttributes: inputAttrs },
            { Tag: Constants.ft.AddSetButton, Width: 10, Height: 10, ContainerAttributes: 'style="z-index: 50;"', Label: '' },
            { Tag: Constants.ft.DeleteSetButton, Width: 10, Height: 10, ContainerAttributes: 'style="z-index: 50;"', Label: '' }
        ];
        var idx = 0;
        var length = formElements.length;
        for (idx; idx < length; idx++) {
            formElements[idx].Id = guids.shift();
        }
        that.renderedFormElements = new FormElements(formElements);
        var options = { success: sf };
        that.renderedFormElements.getFormElementsMarkup(options);
        return this;
    },
    render: function (renderOptions) {
        renderOptions = renderOptions || {};
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        Utility.executeCallback(renderOptions.complete);
        this.$el.prepend(this.ctFieldControlsView.render().$el);
        this.$el.append(this.cfgControlsView.render().$el);
        this.$el.append(this.cfmControlsView.render().$el);
        $('body').trigger('formElementControlsViewRenderedInit');
        // Determine if field groups already exist or not and if the user has permissions to create them
        // If a user doesn't have permissions and the field group doesn't exist yet, then disable dragging of the field group element with a tooltip as to why
        var $fgs = this.$el.find('input[name="CustomFieldGroupName"]');
        var idx = 0;
        var length = $fgs.length;
        var hasFieldPerm = Utility.hasFlag(window.gatewayPermissions, Constants.gp.Custom_Fields);
        for (idx; idx < length; idx++) {
            var $fg = $fgs.eq(idx);
            var cfgName = $fg.val();
            var cfgPkg = window.customFieldMetaGroupPackages.getByName(cfgName);
            if (!cfgPkg && !hasFieldPerm) {
                var rmoGP = Utility.reverseMapObject(Constants.gp);
                var rightsMsg = String.format(Constants.t('insufficientPermissionsRightForSpecialElements'), cfgName, Constants.t('gp_' + rmoGP[Constants.gp.Custom_Fields]));
                this.setNonDraggableState($fg.parent(), rightsMsg);
            }
        }
    },
    renderWithDrag: function () {
        var that = this;
        this.render();
        setTimeout(function () {
            that.setupDrag();
        }, 10);
    },
    renderBasicElementHelper: function (ev) {
        var $elem = $(ev.currentTarget);
        var type = $elem.find('input[name="Tag"]').val();
        var $backingStore = $elem.find('input[name="BackingStoreId"]');
        var fe = this.formElementTemplates[Constants.ft[type]].clone();
        var markup = $(fe.get('Markup'));
        var feLabel = markup.find('.formElementLabel');
        var txt = '';
        var formPart = this.model.get('Parts').getCurrent();
        if (Constants.ft[type] === Constants.ft.HorizontalRule) {
            txt = '';
        }
        else if (Constants.ft[type] === Constants.ft.Image) {
            var imgTag = markup.find('img');
            var $span = $(document.createElement('span'));
            $span.width(imgTag.width()).height(imgTag.height());
            imgTag.replaceWith($span);
        }
        else {
            txt = $.trim($elem.text());
        }
        feLabel.text(txt);
        var feId = Utility.getSequentialGuids(1)[0];
        fe.set({
            'Id': feId,
            'FormPartId': formPart.get('Id'),
            'Markup': markup.get(0).outerHTML,
            'Label': txt,
            'BackingStoreId': $backingStore.val()
        }, { silent: true });
        var formElementGroupElements = {};
        formElementGroupElements[fe.get('Id')] = true;
        this.model.get('Elements').add(fe);
        var fegv = new FormElementGroupView({
            requiresFormatting: true,
            className: 'FormElementGroupView formElementHelper ignore',
            model: null,
            formTemplatePkg: this.model,
            formElementGroupElements: formElementGroupElements
        });
        var $helper = fegv.render().$el.clone();
        $helper.find('.formElementMarkup').css({ 'position': 'relative', 'top': 'auto', 'left': 'auto' });
        $helper.data({
            'formElement': fe,
            'formElementGroupView': fegv,
            'isReverted': true
        });
        var $wrapper = this.createMasterFormWrapper($helper);
        return $wrapper;
    },
    renderFormElementGroupHelper: function (ev) {
        var $elem = $(ev.currentTarget);
        var fes = [];
        var ids;
        var cfgPkg;
        var cfgId = $elem.find('input[name="CustomFieldGroupId"]').val();
        var cfgName = $elem.find('input[name="CustomFieldGroupName"]').val();
        if (cfgId) {
            cfgPkg = window.customFieldMetaGroupPackages.get(cfgId);
            cfgName = cfgPkg.get('CustomFieldGroup').Name;
        }
        else if (cfgName) {
            cfgPkg = window.customFieldMetaGroupPackages.getByName(cfgName);
            if (!cfgPkg) {
                var hasFieldPerm = Utility.hasFlag(window.gatewayPermissions, Constants.gp.Custom_Fields);
                if (!hasFieldPerm) {
                    var rmoGP = Utility.reverseMapObject(Constants.gp);
                    var rightsMsg = String.format(Constants.t('insufficientPermissionsRightForSpecialElements'), cfgName, Constants.t('gp_' + rmoGP[Constants.gp.Custom_Fields]));
                    this.setNonDraggableState($fg.parent(), rightsMsg);
                    return;
                }
                cfgPkg = window.customFieldMetaGroupPackages.add({
                    CustomFieldGroup: {
                        Id: Constants.c.emptyGuid,
                        Name: cfgName
                    },
                    CustomFieldGroupTemplates: []
                });
            }
        }
        if (!cfgId) {
            cfgId = cfgPkg.get('CustomFieldGroup').Id;
        }
        cfgPkg.createBuiltIn();

        var cfgts = cfgPkg.get('CustomFieldGroupTemplates');
        var formElementGroupElements = {};
        ids = Utility.getSequentialGuids(length + 3);
        var idx = 0;
        var length = cfgts.length;
        var currentPart = this.model.get('Parts').getCurrent();
        for (idx; idx < length; idx++) {
            var cf = window.customFieldMetas.get(cfgts[idx].CustomFieldMetaId);
            if (!cf) {
                ErrorHandler.addErrors(Constants.c.et_CustomFieldMeta + ' ' + Constants.c.notFound);
                return;
            }
            var controlData = this.model.get('Template').mapCFTypeToControl(cf.get('Type'));
            var fe = this.formElementTemplates[Constants.ft[controlData.formTag]].clone();
            var markup = $(fe.get('Markup'));
            var txt = $.trim(cf.get('Name'));
            var labels = markup.find('.formElementLabel');
            labels.text(txt);
            var classNames = fe.getLabelClasses(true);
            fe.set({
                'Id': ids[idx],
                'FormPartId': currentPart.get('Id'),
                'Markup': markup.html(),
                'Label': txt,
                'LabelAttributes': fe.getAttributesAfterReplacement(fe.get('LabelAttributes'), { classNames: classNames }),
                'BackingStoreId': cf.get('Id')
            }, { silent: true });

            formElementGroupElements[fe.get('Id')] = true;
            this.model.get('Elements').add(fe);
            fes.push(fe);
        }
        //Add the add and delete button
        var addBtn = this.formElementTemplates[Constants.ft.AddSetButton].clone();
        addBtn.set({
            'Id': ids[length],
            'FormPartId': currentPart.get('Id')
        }, { silent: true });

        formElementGroupElements[addBtn.get('Id')] = true;
        this.model.get('Elements').add(addBtn);
        fes.push(addBtn);

        var delBtn = this.formElementTemplates[Constants.ft.DeleteSetButton].clone();
        delBtn.set({
            'Id': ids[length + 1],
            'FormPartId': currentPart.get('Id')
        }, { silent: true });

        formElementGroupElements[delBtn.get('Id')] = true;
        this.model.get('Elements').add(delBtn);
        fes.push(delBtn);

        var feg = new FormElementGroup({
            'Id': ids[length + 2],
            'CustomFieldGroupId': cfgPkg.get('Id'),
            'FormPartId': currentPart.get('Id'),
            'OffsetX': 0,
            'OffsetY': 10,
            'MinCount': 1,
            'MaxPerPage': 1,
            'SortById': fes[0].get('BackingStoreId'),
            'spacing': 0    // initial spacing should be 0
        });
        this.model.get('ElementGroups').add(feg, { silent: true });
        var fegv = new FormElementGroupView({
            groupName: cfgName,
            requiresFormatting: true,
            className: 'FormElementGroupView formElementGroupHelper',
            model: feg,
            formTemplatePkg: this.model,
            formElementGroupElements: formElementGroupElements
        });
        var $helper = fegv.render().$el.clone();
        $helper.data({
            'formElements': fes,
            'formElementGroup': feg,
            'formElementGroupView': fegv,
            'isReverted': true
        });

        var $cfgIdElem = this.$el.find('[name="CustomFieldGroupId"][value="' + cfgId + '"]');
        if ($cfgIdElem.length > 0 && $elem !== $cfgIdElem) {
            this.setNonDraggableState($cfgIdElem.parent());
        }
        var $cfgElem = this.$el.find('[name="CustomFieldGroupName"][value="' + cfgName + '"]');
        if ($cfgElem.length > 0 && $elem !== $cfgElem) {
            this.setNonDraggableState($cfgElem.parent());
        }
        var $wrapper = this.createMasterFormWrapper($helper);
        return $wrapper;
    },
    createMasterFormWrapper: function (children) {
        var wrapper = document.createElement('div');
        wrapper.id = 'masterForm';
        $(wrapper).append(children);
        return $(wrapper);
    },
    setupDrag: function () {
        var $containment = $('.FormsDesignerView').find('.FormsDesignerCanvasView:visible').find('#masterForm');
        var $draggables = this.ctFieldControlsView.$el.find('li').add(this.cfmControlsView.$el.find('li')).add(this.$el.find('li.basicControl, li.docPropsControl'));
        var idx = 0;
        var length = $draggables.length;
        for (idx; idx < length; idx++) {
            if ($draggables.eq(idx).dialog('instance')) {
                $draggables.eq(idx).dialog('destroy');
            }
        }
        var that = this;
        // Setup dragging for form elements not in a group (eg Content Type fields, custom fields, doument properties...)
        var dragTolerance = function (ev, ui) {
            var isDraggable = $(this).draggable('instance');
            // Make sure that the element has draggable defined, before continuing.
            if (!isDraggable) {
                return;
            }
            var snapTolerance = $(this).draggable('option', 'snapTolerance');
            var topRemainder = ui.position.top % snapTolerance;
            var leftRemainder = ui.position.left % snapTolerance;

            if (topRemainder <= snapTolerance) {
                ui.position.top = ui.position.top - topRemainder;
            }

            if (leftRemainder <= snapTolerance) {
                ui.position.left = ui.position.left - leftRemainder;
            }
            ui.position.left = Math.round(ui.position.left);
            ui.position.top = Math.round(ui.position.top);
            var helper = ui.helper.children();
            helper.data('snapTolerance', snapTolerance);
            helper.data('remainders', { top: topRemainder, left: leftRemainder });
        };
        var snapToGridSize = this.model.get('Template').getSnapToGrid();
        var defOpts = {
            containment: $containment,
            appendTo: $containment,
            cursor: 'move',
            revert: 'invalid',
            grid: [snapToGridSize, snapToGridSize],
            snapTolerance: snapToGridSize,
            drag: dragTolerance
        };
        $draggables.draggable($.extend(defOpts, {
            helper: function (ev) {
                return that.renderBasicElementHelper(ev);
            },
            stop: function (ev, ui) {
                var helper = ui.helper;
                if (helper.attr('id') === 'masterForm') {
                    helper = ui.helper.children();
                }
                if (helper.data('isReverted')) {
                    var fe = helper.data('formElement');
                    that.model.get('Elements').clearSelected();
                    fe.set('selected', true, { silent: true });
                    that.model.deleteFormElementsAndFormElementGroups({ silent: true });
                }
            }
        }));
        // Setup dragging for form element groups
        $draggables = this.cfgControlsView.$el.find('li').add(this.$el.find('li.enhancedControl'));
        length = $draggables.length;
        for (idx; idx < length; idx++) {
            if ($draggables.eq(idx).dialog('instance')) {
                $draggables.eq(idx).dialog('destroy');
            }
        }
        $draggables.draggable($.extend(defOpts, {
            helper: function (ev) {
                var $elem = $(ev.currentTarget);
                var tag = $elem.find('input[name="Tag"]').val();
                if (tag) {
                    return that.renderBasicElementHelper(ev);
                }
                return that.renderFormElementGroupHelper(ev);
            },
            stop: function (ev, ui) {
                var helper = ui.helper;
                if (helper.attr('id') === 'masterForm') {
                    helper = ui.helper.children();
                }
                if (helper.data('isReverted')) {
                    var fe = helper.data('formElements')[0];
                    that.model.get('Elements').clearSelected();
                    fe.set('selected', true, { silent: true });
                    that.model.deleteFormElementsAndFormElementGroups({ silent: true });
                }
            }
        }));
        length = $draggables.length;
        for (idx = 0; idx < length; idx++) {
            if (that.isFieldGroupAdded($draggables.eq(idx))) {
                that.setNonDraggableState($draggables.eq(idx));
            }
        }
    },
    close: function () {
        this.ctFieldControlsView.close();
        this.cfgControlsView.close();
        this.unbind();
        this.remove();
    },
    setNonDraggableState: function ($elem, msg) {
        $elem.draggable({ disabled: true });
        $elem.attr('title', msg || String.format(Constants.c.singleFieldGroup_T, $elem.attr('title')));
        $elem.removeClass('grayGradientBackground');
        $elem.addClass('customFieldGroupDisabled');

    },
    setDraggableState: function ($elem) {
        $elem.draggable({ disabled: false });
        $elem.attr('title', $elem.find('.no_text_select').text());
        $elem.removeClass('customFieldGroupDisabled');
        $elem.addClass('grayGradientBackground');

    },
    isFieldGroupAdded: function ($elem) {
        var elementGroups = this.model.get('ElementGroups');
        var len = elementGroups.length;
        for (i = 0; i < len; i++) {
            var cfgId = elementGroups.at(i).get('CustomFieldGroupId');
            if ($elem.find('input').val() === cfgId) {
                return true;
            }
            var $cfgName = $elem.find('input[name="CustomFieldGroupName"]');
            var cfgPkg = window.customFieldMetaGroupPackages.getByName($cfgName.val());
            if (cfgPkg && cfgPkg.get('CustomFieldGroup').Id === cfgId) {
                return true;
            }
        }
        return false;
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});