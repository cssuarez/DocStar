var FormsDesignerCanvasView = Backbone.View.extend({
    model: null, // FormTemplatePackageCPX
    formElementGroupViews: [], // [] of FormElementGroupView
    className: 'FormsDesignerCanvasView',
    events: {
        'click .canvas': 'deselectSelected'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formsdesignercanvaslayout'));
        var cv = this;
        this.listenTo(this.model, 'error', function (model, response, options) {
            var elements = this.model.get('Elements');
            var errData = response || [];
            var idx = 0;
            var length = errData.length;
            elements.clearErrors();
            for (idx; idx < length; idx++) {
                var targElem = elements.get(errData[idx].Id1);   // Id1 is TargetId
                targElem.set('error', errData[idx].Id2); // Id2 is FormElementId
            }
        });
        this.listenTo(this.model, 'change:editingFormulas', function (model, value, options) {
            this.$el.find('.canvas').css('z-index', !!value ? 1001 : 0);
        });
        this.listenTo(this.model.get('Elements'), 'add', function (model, collection, options) {
            cv.$el.find('.addAFieldMessage').hide();
        });
        this.listenTo(this.model.get('Elements'), 'remove', function (model, collection, options) {
            if (!collection || collection.length === 0) {
                cv.$el.find('.addAFieldMessage').show();
            }
            else {
                cv.$el.find('.addAFieldMessage').hide();
            }
        });
        this.listenTo(this.model.get('Template'), 'change:PageSize', function (model, value, options) {
            this.render();
        });
        this.listenTo(this.model.get('Template'), 'change:Properties', function (model, value, options) {
            // Create default options, making any change event trigger the included options
            var defOpts = {
                displayGridChanged: true,
                orientationChanged: true
            };
            options = options || defOpts;
            // Check for property changes that do not update anything in the UI, skip if they were the cause of the change event
            if (options.createAsDraftChanged) {
                return;
            }
            // DisplayGrid
            if (options.displayGridChanged) {
                this.changeBackground();
            }
            // Orientation
            if (options.orientationChanged) {
                this.changeOrientation();
            }
        });
        this.listenTo(this.model.get('Template'), 'change:SnapToGridSize', function (model, value, options) {
            this.render();
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.numberOfFormElements = this.model.getPartElements().length;
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.changeOrientation();
        this.changeBackground();
        this.setupDrop();
        this.renderFormElements();
        return this;
    },
    cleanupFormElementGroupViews: function () {
        var feg = this.formElementGroupViews.pop();
        while (feg) {
            feg.close();
            feg = undefined;
            feg = this.formElementGroupViews.pop();
        }
    },
    close: function () {
        this.cleanupFormElementGroupViews();
        this.unbind();
        this.remove();
    },
    changeBackground: function () {
        var displayGrid = this.model.get('Template').getDisplayGrid();
        var $canvasPage = this.$el.find('.canvas > div');
        if (displayGrid) {
            $canvasPage.addClass('gridBackground');
        }
        else {
            $canvasPage.removeClass('gridBackground');
        }
    },
    changeOrientation: function () {
        var orientation = this.model.get('Template').getOrientation();
        var $canvasPage = this.$el.find('.canvas > div');
        var pageSizeDims = this.model.get('Template').getPageSizeDims(true);
        var pageWidth = pageSizeDims.Width;
        var pageHeight = pageSizeDims.Height;
        if (orientation === Constants.fp.Portrait) {
            this.$el.find('.canvas > div').width(pageWidth).height(pageHeight);
        }
        else {
            this.$el.find('.canvas > div').width(pageHeight).height(pageWidth);
        }
    },
    setupDrop: function () {
        var $dropTarget = this.$el.find('.canvas > div');
        var fegv;
        $dropTarget.droppable({
            tolerance: 'fit',
            drop: function (event, ui) {
                var helper = ui.helper;
                if (ui.helper.attr('id') === 'masterForm') {
                    helper = ui.helper.children();
                }
                helper.data('isReverted', false);
                var remainders = helper.data('remainders');
                var snapTolerance = helper.data('snapTolerance');
                var top, left;
                if (helper.hasClass('formElementHelper')) {
                    var fe = helper.data('formElement');
                    top = $(helper).offset().top - $dropTarget.offset().top;
                    left = $(helper).offset().left - $dropTarget.offset().left;
                    var attrs = {
                        Top: parseInt(top - 1, 10),
                        Left: parseInt(left - 1, 10)
                    };
                    if (fe.requiresBackingStore()) {
                        attrs.BackingStoreId = fe.get('BackingStoreId') || Constants.c.emptyGuid;
                    }
                    fegv = helper.data('formElementGroupView');
                    var changedCallback = function () {
                        fegv.$el.removeClass('formElementHelper');
                        $dropTarget.append(fegv.render().$el);
                        var $backingStore = ui.draggable.find('[name="BackingStoreId"]');
                        if ($backingStore.length > 0 && !$backingStore.val()) {
                            fegv.renderBackingStoreEditor(fe);
                        }
                    };
                    fe.set(attrs, {
                        changedCallback: changedCallback
                    });
                }
                else if (helper.hasClass('formElementGroupHelper')) {
                    fegv = helper.data('formElementGroupView');
                    var callback = function () {
                        $dropTarget.append(fegv.$el);
                    };
                    top = $(helper).offset().top - $(this).offset().top;
                    left = $(helper).offset().left - $(this).offset().left;
                    var pos = {
                        top: parseInt(top - 1, 10),
                        left: parseInt(left - 1, 10)
                    };
                    fegv.setPosition(pos, { callback: callback });
                }

            }
        });
    },
    renderFormElements: function () {
        var groupMembers = this.model.get('ElementGroupMembers');
        var idx = 0;
        var elems = this.model.getPartElements();
        var length = elems ? elems.length : 0;
        if (length === 0) {
            this.$el.find('.addAFieldMessage').show();
            return;
        }
        var currentPart = this.model.get('Parts').getCurrent();
        var cpId = currentPart.get('Id');
        var formTemplateGroupElements = {};
        for (idx; idx < length; idx++) {
            var formElementGroupElements = {};
            var fe = elems[idx];
            var fePartId = fe.get('FormPartId');
            if (fePartId === cpId) {
                var feId = fe.get('Id');
                var gmIdx = 0;
                var gmLen = groupMembers ? groupMembers.length : 0;
                var inGroup = false;
                for (gmIdx; gmIdx < gmLen; gmIdx++) {
                    var member = groupMembers.at(gmIdx);
                    var feMemberId = member.get('FormElementId');
                    var fegId = member.get('FormElementGroupId');
                    if (feId === feMemberId) {
                        if (!formTemplateGroupElements[fegId]) {
                            formTemplateGroupElements[fegId] = {};
                        }
                        formTemplateGroupElements[fegId][feId] = true;
                        inGroup = true;
                    }
                }
                if (!inGroup) {
                    formElementGroupElements[feId] = true;
                    formTemplateGroupElements[feId] = formElementGroupElements;
                }
            }
        }
        var that = this;
        this.cleanupFormElementGroupViews();
        var options = {
            complete: function () {
                var item;
                var $div = $(document.createElement('div'));
                for (item in formTemplateGroupElements) {
                    if (formTemplateGroupElements.hasOwnProperty(item)) {
                        var fegv = new FormElementGroupView({
                            model: that.model.get('ElementGroups').get(item),    // will be undefined if the FormElement is not in a FormElementGroup
                            formTemplatePkg: that.model,
                            formElementGroupElements: formTemplateGroupElements[item]
                        });
                        that.formElementGroupViews.push(fegv);
                        $div.append(fegv.render().$el);
                    }
                }
                that.$el.find('.canvas > div').append($div.children());
                $div.remove();
            }
        };
        this.model.get('Elements').getFormElementsMarkup(options);

    },
    //#region Event Handling
    ///<summary>
    /// Deselect all selected form elements when not clicking on a form element - similar to how annotations are deselected
    /// eg. clicking the gray background around the canvas or the canvas itself (ie. initially the element with the grid layout background)
    ///<param name="ev">click event</param>
    ///</summary>
    deselectSelected: function (ev) {
        var $targ = $(ev.target);
        if (!this.model.get('editingFormulas') && ($targ.hasClass('canvas') || $targ.attr('id') === 'masterForm')) {
            var elems = this.model.get('Elements');
            elems.clearSelected();
            this.trigger('change', elems.getSelected()[0]);
            elems = this.model.get('ElementGroups');
            elems.clearSelected();
        }
    }
    //#endregion Event Handling
});