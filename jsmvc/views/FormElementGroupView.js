var FormElementGroupView = Backbone.View.extend({
    model: null,    // FormElementGroup - may not exist - it it doesn't exist the FormElements aren't in a FormElementGroup
    formTemplatePkg: null, // FormTemplatePackage
    tagName: 'div',
    className: 'FormElementGroupView',
    formElementViews: [],   // [] - Array of FormElementViews
    formElements: undefined, // FormElements belonging to the group view
    handlePosition: { top: 0, left: 0 },    // position of form wrapper for form elements in group
    requiresFormatting: false,
    events: {
        'click .formElementGroupHandle': 'changeSelection'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formelementgrouplayout'));
        this.groupName = this.options.groupName || '';
        this.formElementViews = [];
        this.formTemplatePkg = this.options.formTemplatePkg;
        this.requiresFormatting = this.options.requiresFormatting || this.requiresFormatting;
        if (this.model) {
            this.listenTo(this.model, 'destroy', function () {
                this.close();
            });
            this.listenTo(this.model, 'change', function (model, options) {
                options = options || {};
                if (options.ignoreChange) {
                    return;
                }
                var changedAttrs = model.changedAttributes();
                if (changedAttrs.selected !== undefined && Utility.getObjectLength(changedAttrs) === 1) {
                    model.collection.clearSelected();
                    var $formElementGroupHandle = this.$el.find('.formElementGroupHandle');
                    if (changedAttrs.selected) {
                        this.formTemplatePkg.get('Elements').clearSelected();
                        model.set('selected', true, { ignoreChange: true });
                        $formElementGroupHandle.addClass('selected');
                    }
                    else {
                        $formElementGroupHandle.removeClass('selected');
                    }
                }
                else {
                    this.renderPreviewLayout();
                }
            });
            var fegv = this;
            var count = 0;
            $('body').on('formElementGroupViewRendered.' + this.model.get('Id'), function () {
                if (fegv.$el.is(':visible')) {
                    fegv.resizeHandle(true);
                    fegv.renderPreviewLayout();
                    $('body').off('formElementGroupViewRendered.' + fegv.model.get('Id'));
                }
                else {
                    if (count > 200) {  // This should never happen, just in case log an error to the console
                        count = 0;
                        Utility.log('Unable to render form element group - timed out');
                    }
                    else {
                        setTimeout(function () {
                            count++;
                            $('body').trigger('formElementGroupViewRendered.' + fegv.model.get('Id'));
                        }, 10);
                    }
                }
            });
            this.listenTo(this.formTemplatePkg.get('Elements'), 'change:Top', function (model, value, options) {
                this.resizeHandle();
            });
            this.listenTo(this.formTemplatePkg.get('Elements'), 'change:Left', function (model, value, options) {
                this.resizeHandle();
            });
            this.listenTo(this.formTemplatePkg.get('Elements'), 'change:repositionComplete', function (model, value, options) {
                if (value) {
                    model.set({ repositionComplete: false });
                    this.resizeHandle(true);
                    this.renderPreviewLayout();
                }
            });

            this.listenTo(this.formTemplatePkg.get('Elements'), 'change:selected', function (model, value, options) {
                if (this.model) {
                    this.model.set('selected', false);
                }
            });
            this.listenTo(Backbone, 'customGlobalEvents:keydown', this.handleKeysDown);
            this.listenTo(Backbone, 'customGlobalEvents:keyup', this.handleKeysUp);
        }
        this.listenTo(this.formTemplatePkg, 'change:editingFormulas', function (model, value, options) {
            options = options || {};
            if (this.model) {
                var idx = 0;
                var length = this.formElementViews.length;
                for (idx; idx < length; idx++) {
                    var fev = this.formElementViews[idx];
                    fev.model.set('displayFormula', value);
                    if (fev.model.isNumeric()) {
                        if (value) {
                            this.$el.find('.groupPreviewDisplayContainer').find('[data-id="' + fev.model.get('Id') + '"]').val(this.formTemplatePkg.getFormulaForDisplay(fev.model.get('Id')));
                        }
                        else {
                            this.renderPreviewLayout();
                        }
                    }
                }
            }
        });
        this.listenTo(this.formTemplatePkg.get('Elements'), 'change:Formula', function (model, value, options) {
            this.renderPreviewLayout();
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.formElementGroupElements = this.options.formElementGroupElements || {};   // Filtered FormElements based on their FormElementGroup (which may not exist)
        return ro;
    },
    render: function () {
        var that = this;
        var viewData = this.getRenderObject();
        var item;
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.find('.formElementGroupHandle').css(this.handlePosition);
        var isInGroup = !!this.model;
        var fegId;
        if (isInGroup) {
            fegId = this.model.get('Id');
            this.$el.attr('id', 'FormElementGroupView-' + fegId);
        }
        var formPart = this.formTemplatePkg.get('Parts').getCurrent();
        if (!this.formElements || this.formElements.length === 0 || this.formElementViews.length === 0) {
            this.formElements = new FormElements();
            var formElementGroupMembers = [];
            this.formElementViews = [];
            var fev;
            for (item in viewData.formElementGroupElements) {
                if (viewData.formElementGroupElements.hasOwnProperty(item)) {
                    // Create FormElementGroupMember
                    if (isInGroup) {
                        formElementGroupMembers.push({
                            FormElementGroupId: fegId,
                            FormElementId: item
                        });
                    }
                    var fe = this.formTemplatePkg.get('Elements').get(item);
                    if (fe && formPart && fe.get('FormPartId') === formPart.get('Id')) {
                        this.formElements.add(fe);
                        fev = new FormElementView({
                            model: fe,
                            formTemplatePkg: this.formTemplatePkg,
                            isInGroup: isInGroup
                        });
                        this.formElementViews.push(fev);
                    }
                }
            }
        }
        var idx = 0;
        var length = this.formElementViews.length;
        var startPos = {
            top: this.formElements.getLeastTop(),
            left: this.formElements.getLeastLeft()
        };
        var $div = $(document.createElement('div'));
        for (idx; idx < length; idx++) {
            fev = this.formElementViews[idx];
            if (this.requiresFormatting) {
                this.formatLayout(fev, startPos);
            }
            $div.append(fev.render().$el);
            fev.updateDimensions({
                width: fev.model.get('Width'),
                height: fev.model.get('Height')
            });
            fev.updateLabelDimensions({
                width: fev.model.getLabelAttributeValueInt('width'),
                height: fev.model.getLabelAttributeValueInt('height')
            });
            fev.trigger('change', fev.model); //trigger change event after formatting complete
        }
        that.$el.append($div.children());
        $div.remove();
        var $formElementGroupHandle = this.$el.find('.formElementGroupHandle');

        this.formTemplatePkg.setGroupMembers(formElementGroupMembers);
        this.setupDragAndDrop();
        if (isInGroup) {
            $('body').trigger('formElementGroupViewRendered.' + this.model.get('Id'));
            this.resizeHandle();
        }
        else {
            $formElementGroupHandle.addClass('ignore');
        }
        return this;
    },
    resizeHandle: function (setDimensions) {
        var leastTop = this.formElements.getLeastTop();
        var leastLeft = this.formElements.getLeastLeft();
        var width = this.getFormElementViewsWidth();
        var height = this.getFormElementViewsHeight();
        this.handlePosition = {
            'top': leastTop - 5,
            'left': leastLeft - 5
        };
        var $formElementGroupHandle = this.$el.find('.formElementGroupHandle');
        var dims = this.getPreviewLayoutDimensions();
        if (dims) {
            $formElementGroupHandle.css(dims);
        }
        if (setDimensions && this.model) {
            // set the dimensions of the group, based on the dimensions of the handle
            // subtracting 10 here so the calculated spacing isn't so far away.
            // Otherwise to get the groups rows/columns right next to each other a negative offset would have to be used
            this.model.set('dimensions', { width: width - 5, height: height - 5 });
        }
    },
    getPreviewLayoutDimensions: function () {
        var $groupPreview = this.$el.find('.groupPreviewDisplayContainer');
        var $children = $groupPreview.children('.FormElementGroupSet');
        if ($groupPreview.length === 0 || $children.length === 0) {
            return false;
        }

        var repeatHorizontally = Utility.hasFlag(this.model.get('RepeatDirection'), Constants.rd.Horizontally);
        var repeatVertically = Utility.hasFlag(this.model.get('RepeatDirection'), Constants.rd.Vertically);
        var setWidth = this.getFormElementViewsWidth(repeatVertically);
        var setHeight = this.getFormElementViewsHeight(repeatHorizontally);
        var leastLeft, leastTop;
        var totHeight = 0;
        var totWidth = 0;
        var idx = 0;
        var length = $children.length || 0;
        for (idx; idx < length; idx++) {
            var $rows = $children.eq(idx);
            var $rowsChildren = $rows.children();
            var childsIdx = 0;
            var childsLen = $rowsChildren.length;
            for (childsIdx; childsIdx < childsLen; childsIdx++) {
                var $child = $rowsChildren.eq(childsIdx);
                var pos = $child.position();
                if (leastLeft === undefined || pos.left < leastLeft) {
                    leastLeft = pos.left;
                }
                if (leastTop === undefined || pos.top < leastTop) {
                    leastTop = pos.top;
                }
            }
            if (repeatHorizontally) {
                totWidth += setWidth;
            }
            else {
                totWidth = setWidth;
            }
            if (repeatVertically) {
                totHeight += setHeight;
            }
            else {
                totHeight = setHeight;
            }
        }
        // Add height and width of sets again
        var horizontalSpacing = repeatHorizontally ? this.model.get('spacing') * (length - 1) + 10 : 5;
        var verticalSpacing = repeatVertically ? this.model.get('spacing') * (length - 1) + 10 : 5;
        var dims = {
            top: leastTop - 5,
            left: leastLeft - 5,
            width: totWidth + horizontalSpacing,
            height: totHeight + verticalSpacing
        };
        return dims;
    },
    renderPreviewLayout: function () {
        if (!this.model) {
            return;
        }
        var fegView = this;
        var fes = new FormElements(this.formTemplatePkg.getGroupsElements(this.model.get('Id')));
        var success = function (result) {
            var $div = $(document.createElement('div'));
            $div.append(result[0].Value);
            $div.find('input, textarea, select').prop('disabled', true);
            var $groupPreview = fegView.$el.find('.groupPreviewDisplayContainer');
            $groupPreview.html($div.html());
            // Resize the group handle
            var $formElementGroupHandle = fegView.$el.find('.formElementGroupHandle');
            var dims = fegView.getPreviewLayoutDimensions();
            if (dims) {
                dims.position = 'absolute';
                $formElementGroupHandle.css(dims);
            }
            if (fegView.formTemplatePkg.get('editingFormulas')) {
                var idx = 0;
                var length = fegView.formElementViews.length;
                for (idx; idx < length; idx++) {
                    var fev = fegView.formElementViews[idx];
                    if (fev.model.isNumeric()) {
                        var feId = fev.model.get('Id');
                        $groupPreview.find('[data-id="' + feId + '"]').val(fegView.formTemplatePkg.getFormulaForDisplay(feId));
                    }
                }
            }
        };
        fes.getFormElementsMarkup({ success: success, group: this.model });
    },
    removeDragAndDrop: function () {
        var $formElementGroupHandle = this.$el.find('.formElementGroupHandle');
        if ($formElementGroupHandle.draggable('instance')) {
            $formElementGroupHandle.draggable('destroy');
        }
    },
    setupDragAndDrop: function () {
        var that = this;
        var $formElementGroupHandle = this.$el.find('.formElementGroupHandle');
        this.removeDragAndDrop();
        var startPos;
        var previewPositions = [];
        var snapToGridSize = this.formTemplatePkg.get('Template').getSnapToGrid();
        var resizeTolerance = function (ev, ui) {
            var snapTolerance = $formElementGroupHandle.draggable('option', 'snapTolerance');
            var topRemainder = ui.position.top % snapTolerance;
            var leftRemainder = ui.position.left % snapTolerance;

            if (topRemainder <= snapTolerance) {
                ui.position.top = ui.position.top - topRemainder;
            }

            if (leftRemainder <= snapTolerance) {
                ui.position.left = ui.position.left - leftRemainder;
            }
        };
        $formElementGroupHandle.draggable({
            distance: 6,
            containment: $('.FormsDesignerCanvasView').has(this.$el),
            cursor: 'move',
            grid: [snapToGridSize, snapToGridSize],
            snapTolerance: snapToGridSize,
            start: function (event, ui) {
                resizeTolerance(event, ui);
                startPos = {
                    top: ui.position.top,
                    left: ui.position.left
                };
                previewPositions = that.getPreviewPositions();
            },
            drag: function (event, ui) {
                resizeTolerance(event, ui);
                var endPos = {
                    top: ui.position.top,
                    left: ui.position.left
                };
                that.updatePositions(startPos, endPos);
                that.updatePreviewPositions(previewPositions, startPos, endPos);
            },
            stop: function (event, ui) {
                resizeTolerance(event, ui);
                var endPos = {
                    top: ui.position.top,
                    left: ui.position.left
                };
                that.updatePositions(startPos, endPos, true);
                that.renderPreviewLayout(true);
            }
        });
    },
    updatePositions: function (startPos, endPos, updateModel) {
        var idx = 0;
        var length = this.formElementViews.length;
        for (idx; idx < length; idx++) {
            var view = this.formElementViews[idx];
            view.updatePosition(startPos, endPos, updateModel);
        }
    },
    ///<summary>
    /// Obtain the positions of each preview element
    ///</summary>
    getPreviewPositions: function () {
        var positions = [];
        var $groupPreview = this.$el.find('.groupPreviewDisplayContainer');
        var $children = $groupPreview.children();
        var idx = 0;
        var length = $children.length || 0;
        var counter = 0;
        for (idx; idx < length; idx++) {
            var $rows = $children.eq(idx);
            var $rowsChildren = $rows.children();
            var childsIdx = 0;
            var childsLen = $rowsChildren.length;
            for (childsIdx; childsIdx < childsLen; childsIdx++) {
                var $child = $rowsChildren.eq(childsIdx);
                var pos = $child.position();
                positions[counter++] = pos;
            }
        }
        return positions;
    },
    ///<summary>
    /// Update the preview elements positions
    ///</summary>
    updatePreviewPositions: function (startPreviewPos, startPos, endPos) {
        var $groupPreview = this.$el.find('.groupPreviewDisplayContainer');
        var $children = $groupPreview.children();
        var idx = 0;
        var length = $children.length || 0;
        var counter = 0;
        for (idx; idx < length; idx++) {
            var $rows = $children.eq(idx);
            var $rowsChildren = $rows.children();
            var childsIdx = 0;
            var childsLen = $rowsChildren.length;
            for (childsIdx; childsIdx < childsLen; childsIdx++) {
                var $child = $rowsChildren.eq(childsIdx);
                var pos = $child.position();
                $child.css({
                    top: startPreviewPos[counter].top + (endPos.top - startPos.top),
                    left: startPreviewPos[counter].left + (endPos.left - startPos.left)
                });
                counter++;
            }
        }
    },
    setPosition: function (pos, options) {
        options = options || {};
        var that = this;
        var idx = 0;
        var length = this.formElements.length;
        this.handlePosition = pos;
        var changedCallback = function () {
            var $fegvEL = that.render().$el;
            $fegvEL.find('.formElementGroupHandle').css(that.handlePosition);
            $fegvEL.removeClass('formElementGroupHelper');
            Utility.executeCallback(options.callback);
        };
        for (idx; idx < length; idx++) {
            var groupFE = this.formElements.at(idx);
            var fe = this.formTemplatePkg.getDotted('Elements.' + (groupFE.get('Id')));
            fe.set({
                LabelAttributes: fe.getAttributesAfterReplacement(fe.get('LabelAttributes'), { style: { display: 'block' } }),
                BackingStoreId: fe.get('BackingStoreId') || null
            }, {
                ignoreChange: true
            });
        }
        this.formElements.getFormElementsMarkup({ success: changedCallback });
    },
    formatLayout: function (fev, startPos) {
        var fe = fev.model;
        var fes = this.formElements;
        var handlePos = this.handlePosition;
        var leastTop = startPos.top + handlePos.top;
        var leastLeft = startPos.left + handlePos.left;
        leastTop = (leastTop < 0 ? 5 : leastTop);       // 5 is for padding between the group border and the form elements
        leastLeft = (leastLeft < 0 ? 5 : leastLeft);     // 5 is for padding between the group border and the form elements
        var attrs = {};
        var lblAttrs = {};
        var elemClassNames = fe.getClasses(true);
        var labelClassNames = fe.getLabelClasses(true);
        var tag = fe.get('Tag');
        if (this.groupName === Constants.c.address) {
            var labelWidth;
            var lblTxt = fe.get('Label');
            if (lblTxt === Constants.c.street) {
                attrs = { Width: 220, Top: leastTop, Left: leastLeft };
                labelWidth = 220;
            }
            else if (lblTxt === Constants.c.suite) {
                attrs = { Width: 220, Top: leastTop + 50, Left: leastLeft };
                labelWidth = 220;
            }
            else if (lblTxt === Constants.c.city) {
                attrs = { Width: 100, Top: leastTop + 100, Left: leastLeft };
                labelWidth = 100;
            }
            else if (lblTxt === Constants.c.state) {
                attrs = { Width: 100, Top: leastTop + 100, Left: leastLeft + 120 };
                labelWidth = 100;
            }
            else if (lblTxt === Constants.c.postalCode) {
                attrs = { Width: 100, Top: leastTop + 150, Left: leastLeft };
                labelWidth = 100;
            }
            else if (lblTxt === Constants.c.country) {
                attrs = { Width: 100, Top: leastTop + 150, Left: leastLeft + 120 };
                labelWidth = 100;
            }
            else if (tag === Constants.ft.DeleteSetButton) {
                attrs = { Top: leastTop + 5, Left: leastLeft + 240 };
            }
            else if (tag === Constants.ft.AddSetButton) {
                attrs = { Top: leastTop + 205, Left: leastLeft + 6 };
            }
            lblAttrs = { style: { display: 'block', width: labelWidth + 'px' } };
        }
        else {
            // If it is a group display: block, otherwise display: inline-block
            // Stack Horizontally - intially all field groups are dragged on with a Horizontal stacking
            var modelIdx = fes.indexOf(fe);
            var prevWidth = 0;
            var idx = 0;
            if (tag === Constants.ft.DeleteSetButton) {
                for (idx; idx < modelIdx - 1; idx++) {
                    prevWidth += fes.at(idx).get('Width') + 20;
                }
                attrs = { Top: leastTop + 25, Left: leastLeft + prevWidth };
            }
            else if (tag === Constants.ft.AddSetButton) {
                attrs = { Top: leastTop + 55, Left: leastLeft + 6 };
            }
            else {
                for (idx; idx < modelIdx; idx++) {
                    prevWidth += fes.at(idx).get('Width') + 20;
                }
                lblAttrs = { classNames: labelClassNames };
                attrs = {
                    Top: leastTop,
                    Left: leastLeft + prevWidth
                };
            }
        }

        attrs.LabelAttributes = fe.getAttributesAfterReplacement(fe.get('LabelAttributes'), lblAttrs);
        fe.set(attrs, { silent: true });
    },
    ///<summary>
    /// Render the view that corresponds to the backing store type (eg. PublicImageView for images, CustomFieldMetaEditView for most others)
    ///</summary>
    renderBackingStoreEditor: function () {
        // Check form tag to see which editor needs to be rendered       
        var that = this;
        if (this.formElementViews.length === 1) {
            var fev = this.formElementViews[0];
            var ft = fev.model.get('Tag');
            var $divWrapper = this.$el.find('.formElementMarkup');
            var isImg = ft === Constants.ft.Image;
            var dialogCallbacks = {
                saveCallback: function (result) {
                    fev.model.set('BackingStoreId', result.Id);
                    fev.model.setDefaultValues(fev.model, result.Id);
                    if (isImg) {    // update the i
                        fev.model.set('cacheBusterString', Utility.getCacheBusterStr('&'));
                    }
                    that.cleanupPublicImageView();
                    that.cleanupCustomFieldView();
                },
                cancelCallback: function () {
                    // Field Selection has been cancelled, remove the entire form element view that was dropped
                    that.formTemplatePkg.get('Elements').clearSelected();
                    fev.model.set('selected', true, { silent: true });
                    that.formTemplatePkg.deleteFormElementsAndFormElementGroups({ silent: true });
                    if (that.model) {
                        that.model.destroy();
                        that.cleanupPublicImageView();
                        that.cleanupCustomFieldView();
                    }
                    else {
                        that.close();
                    }
                }
            };
            if (isImg) {
                this.cleanupPublicImageView();
                var position = {
                    my: 'left top',
                    at: 'left bottom',
                    of: $divWrapper
                };
                this.publicImageView = new PublicImageView({
                    collection: new PublicImages(window.publicImages.toJSON()),
                    displayInDialog: true,
                    dialogOptions: {
                        position: position,
                        title: Constants.t('newPublicImage')
                    },
                    dialogCallbacks: dialogCallbacks
                });
                this.publicImageView.render();
            }
            else {
                var ctId = this.formTemplatePkg.getDotted('Template.DefaultContentTypeId');
                var ct = window.contentTypes.get(ctId);
                var augCfms = ct.getAugmentedMetas();
                this.cleanupCustomFieldView();
                this.cfView = new CustomFieldMetaEditView({
                    augmentedFields: augCfms,
                    allowedTypes: fev.model.getTypesFromTagMapping(),
                    dialogOptions: {
                        position: { my: "center", at: "center", of: window }, // dialog too wide to position at bottom of dropped element, so display centered to window
                        title: Constants.t('selectField'),
                        dlgClass: 'droppedElement'
                    },
                    displayRegEx: false,
                    displayButtons: false,
                    selected: '',
                    displayInDialog: true,
                    dialogCallbacks: dialogCallbacks,
                    fieldTag: ft,
                    formElementView: true
                });
                this.cfView.render();
            }
        }
    },
    cleanupPublicImageView: function () {
        if (this.publicImageView) {
            this.publicImageView.close();
        }
    },
    cleanupCustomFieldView: function () {
        // Cleanup the custom field meta view
        if (this.cfView && this.cfView.close) {
            this.cfView.close();
        }
    },
    close: function (options) {
        // Cleanup FormElementView collection - just to make sure that there is nothing hanging onto the views
        var fev = this.formElementViews.pop();
        while (fev) {
            if (fev.close) {
                fev.close();
            }
            fev = undefined;
            fev = this.formElementViews.pop();
        }
        this.cleanupCustomFieldView();
        this.cleanupPublicImageView();
        // Cleanup this view (FormElementGroupView)
        this.unbind();
        this.remove();
    },
    getFormElementView: function (feId) {
        var idx = 0;
        var length = this.formElementViews.length;
        var fev;
        for (idx; idx < length; idx++) {
            fev = this.formElementViews[idx];
            if (feId === fev.model.get('Id')) {
                break;
            }
            else {
                fev = undefined;
            }
        }
        return fev;
    },
    getFormElementViewsHeight: function (getOuter) {
        var idx = 0;
        var length = this.formElementViews.length;
        var height = 0;
        for (idx; idx < length; idx++) {
            var fev = this.formElementViews[idx];
            var top = fev.model.get('Top');
            var $markup = fev.$el.find('.formElementMarkup');
            var elemHeight = 0;
            if (getOuter) {
                elemHeight = $markup.outerHeight(true);
            }
            else {
                elemHeight = $markup.height();
            }
            if (top + elemHeight > height) {
                height = top + elemHeight;
            }
        }
        return height - this.handlePosition.top;
    },
    getFormElementViewsWidth: function (getOuter) {
        var idx = 0;
        var length = this.formElementViews.length;
        var width = 0;
        for (idx; idx < length; idx++) {
            var fev = this.formElementViews[idx];
            var left = fev.model.get('Left');
            var elemWidth = 0;
            var $markup = fev.$el.find('.formElementMarkup');
            if (getOuter) {
                elemWidth = $markup.outerWidth(true);
            }
            else {
                elemWidth = $markup.width();
            }
            if (left + elemWidth > width) {
                width = left + elemWidth;
            }
        }
        return width - this.handlePosition.left;
    },
    //#region Event Handling
    changeSelection: function (ev) {
        if (this.model) {
            this.model.set('selected', true);
        }
    },
    handleKeysDown: function (ev) {
        var $targ = $(ev.target);
        var acceptsInput = $targ.is(':focus') && ($targ.is('input') || $targ.is('textarea') || $targ.is('select'));
        if (acceptsInput || !this.model || !this.model.isSelected()) {
            return true;
        }
        this.$el.find('.ui-resizable-handle').css('visibility', 'hidden');
        var idx = 0;
        var length = this.formElementViews.length;
        for (idx; idx < length; idx++) {
            var fev = this.formElementViews[idx];
            var position,
                $draggable = fev.$formElementMarkup,
                distance = 1; // Distance in pixels the draggable should be moved

            position = {
                top: fev.model.get('Top'),
                left: fev.model.get('Left')
            };
            // Reposition if one of the directional keys is pressed
            switch (ev.keyCode) {
                case 37:
                    position.left -= distance;
                    break; // Left
                case 38:
                    position.top -= distance;
                    break; // Up
                case 39:
                    position.left += distance;
                    break; // Right
                case 40:
                    position.top += distance;
                    break; // Down
                default:
                    return true; // Exit and bubble
            }
            $draggable.css(position);
            fev.model.set({
                Top: position.top,
                Left: position.left
            }, { ignoreChange: true });
        }
        // Don't scroll page
        ev.preventDefault();
    },
    handleKeysUp: function (ev) {
        var $targ = $(ev.target);
        var acceptsInput = $targ.is(':focus') && ($targ.is('input') || $targ.is('textarea') || $targ.is('select'));
        if (acceptsInput || !this.model || !this.model.isSelected()) {
            return true;
        }
        var that = this;
        clearTimeout(this.dndKeyTimeout);
        this.dndKeyTimeout = setTimeout(function () {
            var idx = 0;
            var length = that.formElementViews.length;
            for (idx; idx < length; idx++) {
                var fev = that.formElementViews[idx];
                var position = {
                    top: fev.model.get('Top'),
                    left: fev.model.get('Left')
                };
                fev.$el.find('.ui-resizable-handle').css('visibility', 'visible');
                fev.model.updatePosition(position);
                fev.model.set({ repositionComplete: true });
            }
        }, Constants.TypeAheadDelay);
    }
    //#endregion Event Handling
});