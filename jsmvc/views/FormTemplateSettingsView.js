var FormTemplateSettingsView = Backbone.View.extend({
    model: null, // FormTemplate
    className: 'FormTemplateSettingsView',
    viewData: {},
    jsEditor: null, // ace editor for editing javascript property
    events: {
        "input input[name='Name']": "changeSettings",
        "input textarea[name='Description']": "changeSettings",
        "change select[name='SecurityClassId']": "changeSettings",
        "input input.isCombo": "changeSettings",
        'change select[name="PageSize"]': "changeSettings",
        'change input[name="DisplayGrid"]': "changeDisplayGrid",
        'input input[name="SnapToGridSize"]': "changeSettings",
        'change select[name="Orientation"]': "changeOrientation",
        'change input[name="CreateAsDraft"]': "changeCreateAsDraft",
        'input textarea[name="CSSLayout"]': "changeCSSLayout",
        'change input[name="ExecuteJavascriptOnRender"]': "changeExecuteJavascriptOnRender",
        'change input[name="CompleteOnSubmit"]': "changeCompleteOnSubmit",
        'change input[name="groupRenderMode"]': "changeGroupRenderMode",
        'change input[name="ExecuteWorkflowUIOnSubmit"]': "changeExecuteWorkflowUIOnSubmit",
        "click .editJavascript": "editJavascript",
        "click .createPublicLink": "createPublicLink",
        "click .editTabOrder": "editTabOrder"
    },
    initialize: function (options) {
        this.options = options;
        var that = this;
        this.compiledTemplate = doT.template(Templates.get('formtemplatesettingslayout'));
        this.listenTo(window.slimSecurityClasses, 'add remove reset', function (model, collection, options) {
            that.render();
        });
        this.listenTo(this.model, 'change:Javascript', function (model, value, options) {
            options = options || {};
            if (options.closeEditor && this.jsEditor) {
                this.jsEditor.close();
            }
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = this.model.toJSON();
        ro.securityClasses = window.slimSecurityClasses.toJSON();
        ro.formTemplateCategories = [];
        var idx = 0;
        var length = window.slimFormTemplates.length;
        var cats = {};
        for (idx; idx < length; idx++) {
            var cat = window.slimFormTemplates.at(idx).get('Category');
            if (!cats[cat]) {
                cats[cat] = true;
                ro.formTemplateCategories.push(cat);
            }
        }
        if (ro.formTemplateCategories.length === 0) {
            ro.formTemplateCategories.push(this.model.get('Category'));
        }
        ro.isNew = this.model.get('FormTemplateId') === Constants.c.emptyGuid;
        ro.formTemplateCategories.sort();
        ro.DisplayGrid = this.model.getDisplayGrid();
        ro.ExecuteJavascriptOnRender = this.model.hasFormProperty(Constants.fp.ExecuteJavascriptOnRender);
        ro.groupGridLayout = this.model.hasFormProperty(Constants.fp.ElementGroupGridLayout);
        ro.CompleteOnSubmit = this.model.hasFormProperty(Constants.fp.CompleteOnSubmit);
        ro.ExecuteWorkflowUIOnSubmit = this.model.hasFormProperty(Constants.fp.ExecuteWorkflowUIOnSubmit);
        ro.CSSLayout = this.model.getCSSLayout(true);
        ro.canCreateAsDraft = window.versioningLicensed;
        if (!ro.canCreateAsDraft) { // Cannot create as draft (not licensed to do so), so remove CreateAsDraft from Properties
            this.model.set('Properties', this.model.get('Properties') & ~Constants.fp.CreateAsDraft);
        }
        ro.CreateAsDraft = this.model.getCreateAsDraft();
        var orientation = this.model.getOrientation();
        ro.isLandscape = orientation === Constants.fp.Landscape;
        ro.isPortrait = !ro.isLandscape;    // If it isn't landscape then it has to be portrait
        ro.canCreateForm = Utility.hasFlag(this.model.get('EffectiveContentTypePermissions'), Constants.sp.Add_To);
        var contentGen = Utility.hasFlag(this.model.get('EffectivePermissions'), Constants.sp.ContentGeneration);
        ro.canCreateLink = window.publishFormsLicensed && !ro.isNew && ro.canCreateForm && contentGen;
        return ro;
    },
    render: function () {
        var that = this;
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        var $description = this.$el.find('textarea[name="Description"]');
        var maxHeight = 250;
        var resizeOpts = {
            width: 180,
            height: 46,
            maxWidth: 180,
            minWidth: 180,
            minHeight: 46,
            maxHeight: maxHeight,
            handles: 'se',
            create: function (event, ui) {
                $(this).css({
                    'overflow': 'visible',
                    'position': 'relative',
                    'min-height': '46px',
                    'padding': 0,
                    'margin': '3px 0',
                    'width': '180px',
                    'float': 'right'
                });
                $(this).find('textarea').css({
                    'min-height': '44px',
                    'max-height': '248px',
                    'width': '175px '
                });
                $(this).find('.ui-resizable-handle').css('z-index', 2);
            },
            resize: function (event, ui) {
                ui.size.width = 180;
                // Prevent chrome resizing from causing the textarea to disappear
                if (ui.size.height === maxHeight) {
                    ui.size.height = maxHeight - 2;
                }
            },
            stop: function (event, ui) {
                ui.size.width = 180;
                // Prevent chrome resizing from causing the textarea to disappear
                if (ui.size.height === maxHeight) {
                    ui.size.height = maxHeight - 2;
                }
            }
        };
        $description.resizable(resizeOpts);
        var $otherTxtAreas = this.$el.find('textarea:not([name="Description"])');
        var nonDescriptionResizeOpts = {
            create: function (event, ui) {
                $(this).css({
                    'overflow': 'visible',
                    'position': 'relative',
                    'min-height': '90px',
                    'padding': 0,
                    'margin': '3px 0',
                    'width': '180px',
                    'float': 'right'
                });
                $(this).find('textarea').css({
                    'min-height': '88px',
                    'max-height': '248px',
                    'width': '175px '
                });
                $(this).find('.ui-resizable-handle').css('z-index', 2);
            }
        };
        $otherTxtAreas.resizable($.extend(resizeOpts, nonDescriptionResizeOpts));
        this.$el.find('select[name="Category"]').combobox({
            onSelect: function (data) {
                var event = data.event;
                var ui = data.ui;
                var $currTarg = $(event.currentTarget);
                var $targ = $(event.target);
                $targ.val(ui.item.label);
                var dto = {};
                dto[$targ.attr('name')] = $targ.val();
                ErrorHandler.removeErrorTagsElement($currTarg.parent());
                that.model.set(dto, { validate: true });
            }
        });
        this.$el.find('input[name="SnapToGridSize"]').numeric({ negative: false, decimal: false });
        this.model.set('SecurityClassId', this.$el.find("select[name='SecurityClassId']").val(), { ignoreChange: true });
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    changeSettings: function (ev) {
        var that = this;
        this.inputTimeout = setTimeout(function () {
            var $targ = $(ev.currentTarget);
            var dto = {};
            dto[$targ.attr('name')] = $targ.val();
            ErrorHandler.removeErrorTagsElement($targ.parent());
            that.model.set(dto, { validate: true });
        }, Constants.TypeAheadDelay);
    },
    changeDisplayGrid: function (ev) {
        var $targ = $(ev.currentTarget);
        var properties = this.model.get('Properties');
        if ($targ.is(':checked')) {
            properties = properties | Constants.fp.DisplayGrid;
        }
        else {
            properties = properties & ~Constants.fp.DisplayGrid;
        }
        this.model.set('Properties', properties, { displayGridChanged: true });
    },
    changeOrientation: function (ev) {
        var $targ = $(ev.currentTarget);
        var properties = this.model.get('Properties');
        properties = properties & ~Constants.fp.Orientation;
        properties = properties | $targ.val();
        this.model.set('Properties', properties, { orientationChanged: true });
    },
    changeCreateAsDraft: function (ev) {
        var $targ = $(ev.currentTarget);
        var properties = this.model.get('Properties');
        if (ev.currentTarget.checked) {
            properties = properties | Constants.fp.CreateAsDraft;
        }
        else {
            properties = properties & ~Constants.fp.CreateAsDraft;
        }
        this.model.set('Properties', properties, { doNotReRenderCanvas: true });
    },
    changeExecuteJavascriptOnRender: function (ev) {
        var $targ = $(ev.currentTarget);
        var properties = this.model.get('Properties');
        if (ev.currentTarget.checked) {
            properties = properties | Constants.fp.ExecuteJavascriptOnRender;
        }
        else {
            properties = properties & ~Constants.fp.ExecuteJavascriptOnRender;
        }
        this.model.set('Properties', properties, { doNotReRenderCanvas: true });
    },
    changeCompleteOnSubmit: function (ev) {
        var $targ = $(ev.currentTarget);
        var properties = this.model.get('Properties');
        if (ev.currentTarget.checked) {
            properties = properties | Constants.fp.CompleteOnSubmit;
        }
        else {
            properties = properties & ~Constants.fp.CompleteOnSubmit;
        }
        this.model.set('Properties', properties, { doNotReRenderCanvas: true });
    },
    changeGroupRenderMode: function (ev) {
        var $targ = $(ev.currentTarget);
        var properties = this.model.get('Properties');
        if (ev.currentTarget.value === 'gridLayout') {
            properties = properties | Constants.fp.ElementGroupGridLayout;
        }
        else {
            properties = properties & ~Constants.fp.ElementGroupGridLayout;
        }
        this.model.set('Properties', properties, { doNotReRenderCanvas: true });
    },
    changeExecuteWorkflowUIOnSubmit: function (ev) {
        var $targ = $(ev.currentTarget);
        var properties = this.model.get('Properties');
        if (ev.currentTarget.checked) {
            properties = properties | Constants.fp.ExecuteWorkflowUIOnSubmit;
        }
        else {
            properties = properties & ~Constants.fp.ExecuteWorkflowUIOnSubmit;
        }
        this.model.set('Properties', properties, { doNotReRenderCanvas: true });
    },
    changeCSSLayout: function (ev) {
        var that = this;
        if (this.inputTimeout) {
            clearTimeout(this.inputTimeout);
        }
        var $targ = $(ev.currentTarget);
        this.inputTimeout = setTimeout(function () {
            var cssLayout = $targ.val();
            that.model.setCSSLayout(cssLayout);
        }, Constants.TypeAheadDelay);
    },
    previewCSSLayout: function (ev) {
        var cssLayout = this.model.get('CSSLayout');
        this.model.setCSSLayout(cssLayout);
    },
    editJavascript: function (ev) {
        var that = this;
        var saveChanges = function (success, failure) {
            var js = that.jsEditor.editor.getValue();
            that.model.setJavascript(js);
        };
        this.jsEditor = new AceEditorView({
            value: this.model.getJavascript(),
            displayInDialog: true,
            saveChanges: saveChanges,
            dialogOptions: {
                title: Constants.t('edit') + ' ' + Constants.t('javascript'),
                width: 650,
                height: 520
            }
        });
        this.jsEditor.render(); // opens in dialog

    },
    editTabOrder: function () {

        this.closeSubView();
        this.subview = new TabOrderEditView($.extend(this.options, { model: this.model }));
        this.$el.append(this.subview.render().hide());

    },

    closeSubView: function () {
        if (this.subview) {
            this.subview.close();
        }
    },

    close: function () {
        this.closeSubView();
        this.unbind();
        this.remove();
    },

    createPublicLink: function (ev) {
        this.model.createPublicLink(FormDialogs.createPublicLink);
    }
    //#endregion Event Handling
});