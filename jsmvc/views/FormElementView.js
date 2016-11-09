var FormElementView = Backbone.View.extend({
    model: null, // FormElement
    formTemplatePkg: null,  // FormTemplatePackage
    isInGroup: false,
    className: 'FormElementView',
    repositioning: false,
    $formElementMarkup: null,
    resizeEvent: undefined, // Track what was being resized, so on render the resize can be re-applied
    cacheBusterString: undefined,
    dndKeyTimeout: null, // timeout used when using keys to move elements
    renderTimeout: undefined,
    events: {
        'click .formElementMarkup:not(.editingHighlight)': 'changeSelection',
        'click .formElementMarkup.editingHighlight': 'addToFormula',
        'click .formElementMarkup .formElementLabel': 'changeSelection',
        'click .formElementMarkup :not(.formElementLabel, input[type="checkbox"], input[type="radio"], span, label)': 'changeSelection',
        'click .formElementMarkup input[type="file"]': 'preventDefault'
    },
    initialize: function (options) {
        this.options = options || {};
        this.formTemplatePkg = this.options.formTemplatePkg;
        this.isInGroup = this.options.isInGroup || false;
        var feView = this;
        this.stopListening(this.model);
        this.listenTo(this.model, 'change:error', function (model, value, options) {
            this.toggleErrorBorder(!!value);
        });
        this.listenTo(this.model, 'destroy', function (model, collection, options) {
            feView.close();
        });
        this.listenTo(this.model, 'change', function (model, options) {
            options = options || {};
            var changedAttrs = model.changedAttributes();
            // Do nothing if editing formulas or highlighting for errors
            if (this.formTemplatePkg.get('editingFormulas') || this.formTemplatePkg.get('editingOperation') ||
                (changedAttrs.error !== undefined && Utility.getObjectLength(changedAttrs) === 1)) {
                return;
            }
            // DO NOT fetch element markup if the only attribute that has changed is the 'selected' attribute
            if (changedAttrs.selected !== undefined && Utility.getObjectLength(changedAttrs) === 1) {
                var isSelected = changedAttrs.selected;
                if (!isSelected) {
                    this.resizeEvent = undefined;
                }
                feView.render();
                Utility.executeCallback(options.changedCallback);
                options.changedCallback = undefined;
                if (isSelected) {
                    feView.$formElementMarkup.addClass('selected');
                    this.model.set('error', undefined, {});
                }
                else {
                    feView.$formElementMarkup.removeClass('selected');
                }
            }
            else if (!options.ignoreChange) {
                model.getFormElementMarkup({
                    success: function (formElementMarkupKVP) {
                        feView.render();
                        Utility.executeCallback(options.changedCallback);
                        options.changedCallback = undefined;
                    },
                    formTemplatePkg: feView.formTemplatePkg.toJSON()
                });
            }
        });
        this.listenTo(this.model, 'change:cacheBusterString', function (model, value, options) {
            options = options || {};
            if (!options.doNotUpdateOtherModels) {
                var elems = this.model.collection.getElementsByBackingStoreId(model.get('BackingStoreId'));
                var idx = 0;
                var length = elems.length;
                for (idx; idx < length; idx++) {
                    var elem = elems[idx];
                    if (elem.get('Id') !== model.get('Id')) {   // Don't reset the cachebuster string for the current model
                        elem.set('cacheBusterString', value, { doNotUpdateOtherModels: true });
                    }
                }
            }
            this.cacheBusterString = value;
            this.updateImageSource();
        });
        this.listenTo(this.model, 'change:Formula', function (model, value, options) {
            if (this.formTemplatePkg.get('editingFormulas')) {
                this.displayFormula();
            }
        });
        this.listenTo(this.model, 'change:displayFormula', function (model, value, options) {
            if (this.formTemplatePkg.get('editingFormulas')) {
                this.displayFormula();
            }
            else {
                this.render();
            }
        });
        this.listenTo(this.model, 'change:formulaSelection', function (model, value, options) {
            if (value) {
                if (this.model.isNumeric()) {
                    if (!this.model.isSelected()) {
                        this.$formElementMarkup.addClass('editingHighlight');
                    }
                }
            }
            else {
                this.$formElementMarkup.removeClass('editingHighlight');
                this.render();
            }
        });
        this.listenTo(this.model, 'valid:Formula', function (model, response, options) {
            if (!Utility.hasFlag(response.Expected, Constants.fe.Element)) {
                this.$formElementMarkup.removeClass('editingHighlight');
                this.render();
            }
        });
        this.listenTo(this.formTemplatePkg, 'change:editingFormulas', function (model, value, options) {
            this.model.set('displayFormula', value);
            if (value) {
                this.model.set('formulaSelection', true);
                this.removeResizable();
                this.removeDrag();
            }
            else {
                this.model.set('formulaSelection', false);
            }
        });
        this.listenTo(this.formTemplatePkg, 'change:editingOperation', function (model, value, options) {
            if (value === 'sum') {
                if (this.model.isNumeric()) {
                    this.$formElementMarkup.removeClass('editingHighlight');
                    if (!this.model.isSelected() && this.isInGroup) {
                        this.$formElementMarkup.addClass('editingHighlight');
                    }
                }
            }
        });
        this.listenTo(window.publicImages, 'remove', function (model, collection, options) {
            if (this.model.get('BackingStoreId') === model.get('Id')) {
                this.model.set('cacheBusterString', Utility.getCacheBusterStr('&'));
            }
        });
        this.listenTo(Backbone, 'customGlobalEvents:keydown', this.handleKeysDown);
        this.listenTo(Backbone, 'customGlobalEvents:keyup', this.handleKeysUp);
        $('body').bind('formElementViewRenderedInit', function () {
            clearTimeout(feView.renderTimeout);
            if (feView.$el.is(':visible')) {
                feView.setupDragAndDrop();
                $('body').unbind('formElementViewRenderedInit');
            }
            else {
                feView.renderTimeout = setTimeout(function () {
                    $('body').trigger('formElementViewRenderedInit');
                }, 10);
            }
        });
    },
    render: function () {
        this.$el.html(this.model.get('Markup'));
        this.delegateEvents(this.events);
        this.$el.attr('id', 'FormElementView-' + this.model.get('Id'));
        this.$el.removeClass('formElementMarkup');
        var $formElementMarkup = this.$el.find('.formElementMarkup');
        $formElementMarkup.removeClass('formElementMarkup');
        var $divWrapper = this.$el.find('> div');
        if ($divWrapper.length === 0) {
            $divWrapper = this.$el.children().eq(0);
            if (!$divWrapper.is('span')) {
                $divWrapper.css({
                    'position': 'static'
                });
            }

            var $div = $(document.createElement('div'));
            $div.css({
                position: 'absolute',
                top: this.model.get('Top'),
                left: this.model.get('Left')
            });
            this.$el.children().wrapAll($div);
            $divWrapper = this.$el.find('> div');

        }
        $divWrapper.addClass('formElementMarkup');
        this.$formElementMarkup = $divWrapper;
        if (this.model.isSelected()) {
            $divWrapper.addClass('selected');
        }
        else {
            $divWrapper.removeClass('selected');
        }
        this.toggleErrorBorder(!!this.model.get('error'));
        if (this.isInGroup) {
            $divWrapper.css({
                'top': this.model.get('Top'),
                'left': this.model.get('Left')
            });
        }
        if (this.model.get('displayFormula') && this.model.isNumeric()) {
            this.displayFormula();
        }

        this.$el.find('select > option').prop('disabled', true);
        this.$el.find('textarea, input').prop('readonly', true);
        var $cb = this.$el.find('.ComboBox, .Select');
        var cfm = window.customFieldMetas.get(this.model.get('BackingStoreId'));
        if (cfm && $cb.length) {
            var listName = cfm.get('ListName');
            var cfmList = window.customLists.getCustomListByName(listName);
            if (cfmList) {
                CustomFieldSetup.fillSelectList(cfmList.toJSON(), $cb, listName);
                var $isCombo = this.$el.find('.isCombo');
                $isCombo.css({
                    width: this.model.get('Width') + 'px',
                    height: this.model.get('Height') + 'px'
                });
                $isCombo.prop('readonly', true);
                this.$el.find('.ui-combobox a').height(this.model.get('Height') + 4);
            }
        }
        if (this.resizeEvent) {
            this.setupResizable(this.resizeEvent);
        }
        if (this.model.get('Tag') === Constants.ft.Image) {
            this.updateImageSource();
        }
        var events = $._data($('body').get(0), 'events');
        if (events.formElementViewRenderedInit) {
            $('body').trigger('formElementViewRenderedInit');
        }
        else {
            this.setupDragAndDrop();
        }
        return this;
    },
    displayFormula: function () {
        var $input = this.$formElementMarkup.find('input');
        $input.val(this.formTemplatePkg.getFormulaForDisplay(this.model.get('Id')));
    },
    toggleErrorBorder: function (addBorder) {
        if (addBorder) {
            this.$formElementMarkup.addClass('errorHighlight');
        }
        else {
            this.$formElementMarkup.removeClass('errorHighlight');
        }
    },
    close: function (options) {
        this.unbind();
        this.remove();
    },
    ///<summary>
    /// Update the images string, so the cached image isn't fetched
    ///</summary>
    updateImageSource: function () {
        if (this.model.get('Tag') === Constants.ft.Image) {
            if (!this.cacheBusterString) {
                var bsId = this.model.get('BackingStoreId');
                if (bsId === Constants.c.emptyGuid || (window.publicImages && window.publicImages.get(bsId))) {
                    return;
                }
                this.cacheBusterString = Utility.getCacheBusterStr('&');
            }
            var $img = this.$el.find('img');
            var origSrc = $img.attr('src') || '';
            var src = origSrc.split('&z=')[0];
            src += this.cacheBusterString;
            if (origSrc !== src) {
                $img.attr('src', src);
            }
        }
    },
    showHideResizeHandles: function (ev, ui) {
        var $uiElem = $(ui.element);
        var $allHiddenHandles = $uiElem.find('.ui-resizable-handle:hidden');
        // Show handles, but keep them hidden. Allows position to be properly obtained
        $allHiddenHandles.css('visibility', 'hidden');
        $allHiddenHandles.show();
        var $nHandle = $uiElem.find('.ui-resizable-n');
        var nPos = $nHandle.position();
        var $neHandle = $uiElem.find('.ui-resizable-ne');
        var nePos = $neHandle.position();
        var $eHandle = $uiElem.find('.ui-resizable-e');
        var ePos = $eHandle.position();
        var $seHandle = $uiElem.find('.ui-resizable-se');
        var sePos = $seHandle.position();
        var $sHandle = $uiElem.find('.ui-resizable-s');
        var sPos = $sHandle.position();
        var $swHandle = $uiElem.find('.ui-resizable-sw');
        var swPos = $swHandle.position();
        var $wHandle = $uiElem.find('.ui-resizable-w');
        var wPos = $wHandle.position();
        var $nwHandle = $uiElem.find('.ui-resizable-nw');
        var nwPos = $nwHandle.position();
        // North West
        var hideNW = nwPos && nPos && wPos && (nwPos.left + $nwHandle.width() + 5 > nPos.left || nwPos.top + $nwHandle.height() + 5 > wPos.top);
        $nwHandle.toggle(!hideNW);
        // North East
        var hideNE = nePos && nPos && ePos && (nePos.left < nPos.left + $nHandle.width() + 5 || nePos.top + $neHandle.height() > ePos.top + 5);
        $neHandle.toggle(!hideNE);
        // South East
        var hideSE = sePos && sPos && ePos && (sePos.left < sPos.left + $sHandle.width() + 5 || sePos.top < ePos.top + $eHandle.height() + 5);
        $seHandle.toggle(!hideSE);
        // South West
        var hideSW = swPos && sPos && wPos && (swPos.left + $swHandle.width() > sPos.left + 5 || swPos.top < wPos.top + $wHandle.height() + 5);
        $swHandle.toggle(!hideSW);
        // Update visibility, allowing once hidden handles to be shown
        $allHiddenHandles.css('visibility', 'visible');
    },
    setupResizable: function (event) {
        var that = this;
        var $containment = $('.FormsDesignerView').find('.FormsDesignerCanvasView:visible').find('#masterForm').has(this.$formElementMarkup);
        // Clear all resizables before setting up a new one
        this.removeResizable();
        var $markup = this.$el.find('.formElementMarkup');
        var $target;
        var $tempTarg = $(event.target);
        if ($tempTarg.hasClass('formElementMarkup')) {
            $target = this.$el.find('.formElementMarkup');
        }
        else if ($tempTarg.hasClass('formElementLabel')) {
            $target = this.$el.find('.formElementLabel');
        }
        else if ($tempTarg.hasClass('isCombo')) {
            $target = this.$el.find('.ui-combobox');
        }
        else {
            $target = this.$el.find('.formElementMarkup :not(.formElementLabel, input[type="checkbox"], input[type="radio"], span, label)');
        }
        var tag = that.model.get('Tag');
        var snapToGridSize = this.formTemplatePkg.get('Template').getSnapToGrid();
        if ($target.hasClass('formElementMarkup')) {
            $markup.resizable({
                handles: 'nw, n, ne, e, se, s, sw, w',
                containment: $containment,
                grid: [snapToGridSize, snapToGridSize],
                minWidth: 20,
                minHeight: 12,
                create: function (event, ui) {
                    ui.element = $(this);
                    that.showHideResizeHandles(event, ui);
                },
                start: function (event, ui) {
                    that.$el.find('.ui-resizable-handle').css('visibility', 'hidden');
                    var hasLabel = that.model.hasLabel();
                    $(this).resizable('option', 'minHeight', hasLabel ? 12 : 2);
                },
                resize: function (event, ui) {
                    var dims = that.resizeAll(event, ui);
                    var inputDims = dims.inputDims;
                    var labelDims = dims.labelDims;
                    $(this).css('white-space', 'nowrap');   // Prevent wrapping while resizing
                    that.updatePosition(ui.originalPosition, ui.position);
                    that.updateDimensions(inputDims);
                    that.updateLabelDimensions({ width: labelDims.width, height: labelDims.height });
                },
                stop: function (event, ui) {
                    var axis = $(ui.element).data('ui-resizable').axis;
                    var dims = that.resizeAll(event, ui);
                    var inputDims = dims.inputDims;
                    var labelDims = dims.labelDims;
                    // Correct fix when resizing select
                    if (that.model.get('Tag') === Constants.ft.Select) {
                        if (axis === 'n' || axis === 's') {
                            inputDims.width += 1;
                        }
                        if (axis === 'e' || axis === 'w') {
                            inputDims.height += 1;
                        }
                    }
                    var offsetTop = ui.position.top - ui.originalPosition.top;
                    var offsetLeft = ui.position.left - ui.originalPosition.left;
                    var labelAttrs = that.model.get('LabelAttributes');
                    var hasLabel = that.model.hasLabel();
                    var modelNewAttrs = {
                        Top: that.model.get('Top') + offsetTop,
                        Left: that.model.get('Left') + offsetLeft,
                        Width: inputDims.width,
                        Height: inputDims.height
                    };
                    if (hasLabel) {
                        var newLabelAttrs = that.model.getAttributesAfterReplacement(labelAttrs, { style: { width: labelDims.width + 'px', height: labelDims.height + 'px' } });
                        modelNewAttrs.LabelAttributes = newLabelAttrs;
                    }
                    // Update all changed attributes at once
                    that.model.set(modelNewAttrs, { ignoreChange: true });
                    that.model.fixPositionAndDimensions();
                    that.$el.find('.ui-resizable-handle').css('visibility', 'visible');
                    var $elem = $(this);
                    that.model.set({ repositionComplete: true }, {
                        success: function () {
                            $elem.css('white-space', 'normal');   // Remove so wrapping can occur again
                        }                        
                    });
                    that.model.trigger('change', that.model, { setDirty: true });
                }
            });
        }
        else {
            var dims;
            var $currTarg = $(event.currentTarget);
            if ($target.hasClass('formElementLabel')) {
                this.$el.find('.formElementLabel').resizable({
                    handles: "e, s, se",
                    grid: [snapToGridSize, snapToGridSize],
                    minWidth: 20,
                    minHeight: 12,
                    create: function (event, ui) {
                        ui.element = $(this);
                        that.showHideResizeHandles(event, ui);
                    },
                    start: function (event, ui) {
                        that.$el.find('.ui-resizable-handle').css('visibility', 'hidden');
                    },
                    resize: function (event, ui) {
                        that.resizeLabel(event, ui, false);
                    },
                    stop: function (event, ui) {
                        that.resizeLabel(event, ui, true);
                        that.$el.find('.ui-resizable-handle').css('visibility', 'visible');
                        that.model.set({ repositionComplete: true });
                    }
                });
            }
            else {
                var $input = $markup.children(':not(.formElementLabel, input[type="checkbox"], input[type="radio"], span, label)');
                var isCombobox = false;
                if ($markup.find('.ui-combobox').length > 0) {
                    $input = $markup.find('.ui-combobox').first();
                    isCombobox = true;
                }
                var isHR = that.model.get('Tag') === Constants.ft.HorizontalRule;
                if ($input.length > 0) {
                    $input.resizable({
                        handles: "e, s, se",
                        grid: [snapToGridSize, snapToGridSize],
                        minWidth: 20,
                        minHeight: isHR ? 2 : 12,
                        create: function (event, ui) {
                            ui.element = $(this);
                            that.showHideResizeHandles(event, ui);
                            // Set overflow to visible, so handles aren't cut off
                            $(this).css({
                                'overflow': 'visible',
                                'padding': '0px'
                            });
                            // textarea gets moved with default margin
                            if ($input.is('textarea')) {
                                $(this).css({ 'margin': '0 0 2px 0' });
                            }
                        },
                        start: function (event, ui) {
                            that.$el.find('.ui-resizable-handle').css('visibility', 'hidden');
                        },
                        resize: function (event, ui) {
                            that.resizeNonLabels($target, event, ui, false);
                        },
                        stop: function (event, ui) {
                            that.resizeNonLabels($target, event, ui, true);
                            that.$el.find('.ui-resizable-handle').css('visibility', 'visible');
                            that.model.set({ repositionComplete: true });                            
                            if (isCombobox) {
                                var inputHeight = $input.find('input').height();
                                $input.find('a').height(inputHeight);
                            }
                        }
                    });
                }
            }
        }
    },
    updateResizeDims: function (startDims, ui, axis, splitDifference) {
        splitDifference = splitDifference === undefined ? true : splitDifference;
        var deltaWidth = ui.size.width - ui.originalSize.width;
        var deltaHeight = ui.size.height - ui.originalSize.height;
        // If isLabelAbove is not true or false, don't do anything with the width or height
        if (splitDifference) {
            var isLabelAbove = this.isLabelAbove();
            if (isLabelAbove === true) {
                deltaHeight = Math.round(deltaHeight / 2);
            }
            else if (isLabelAbove === false) {
                deltaWidth = Math.round(deltaWidth / 2);
            }
        }
        var newWidth = (startDims.width + deltaWidth);
        var newHeight = (startDims.height + deltaHeight);
        var minWidth = 20;
        var minHeight = this.model.hasLabel() ? 10 : 2;
        if (axis !== 'n' && axis !== 's') {
            startDims.width = Math.round(newWidth < minWidth ? minWidth : newWidth);
        }
        if (axis !== 'e' && axis !== 'w') {
            startDims.height = Math.round(newHeight < minHeight ? minHeight : newHeight);
        }
    },
    resizeTolerance: function (ev, ui) {
        var axis = $(ui.element).data('ui-resizable').axis;
        this.showHideResizeHandles(ev, ui);
        var snapTolerance = this.formTemplatePkg.get('Template').getSnapToGrid();
        var widthRemainder = ui.size.width % snapTolerance;
        var heightRemainder = ui.size.height % snapTolerance;

        var topRemainder = ui.position.top % snapTolerance;
        var leftRemainder = ui.position.left % snapTolerance;
        if (axis !== 'n' && axis !== 's') {
            if (widthRemainder <= snapTolerance) {
                ui.size.width = Math.round(ui.size.width - widthRemainder);
            }
            if (leftRemainder <= snapTolerance) {
                ui.position.left = Math.round(ui.position.left - leftRemainder);
            }
        }
        if (axis !== 'e' && axis !== 'w') {
            if (topRemainder <= snapTolerance) {
                ui.position.top = Math.round(ui.position.top - topRemainder);
            }
            if (heightRemainder <= snapTolerance) {
                ui.size.height = Math.round(ui.size.height - heightRemainder);
            }
        }
    },
    resizeLabel: function (event, ui, updateModel) {
        this.resizeTolerance(event, ui);
        var dims = {
            width: Math.round(ui.size.width),
            height: Math.round(ui.size.height)
        };
        this.updateLabelDimensions(dims, updateModel);
    },
    resizeNonLabels: function ($target, event, ui, updateModel) {
        this.resizeTolerance(event, ui);
        // resizing is off by this offset for the width and height, causing it to be too large
        var offsetWidth = 6;
        var offsetHeight = 6;
        if ($target.is('textarea')) {
            offsetHeight = 4;
        }
        if ($target.is('hr') || $target.is('img') || $target.is('input[type="file"]') || $target.is('select')) {
            offsetWidth = offsetHeight = 0;
        }
        var axis = $(ui.element).data('ui-resizable').axis;
        var dims = {
            width: Math.round(axis !== 'n' && axis !== 's' ? ui.size.width - offsetWidth : this.model.get('Width')),
            height: Math.round(axis !== 'e' && axis !== 'w' ? ui.size.height - offsetHeight : this.model.get('Height'))
        };
        this.updateDimensions(dims, updateModel);
    },
    resizeAll: function (event, ui) {
        var tag = this.model.get('Tag');
        var isNotMulti = !this.model.isLVPGroup();
        this.resizeTolerance(event, ui);
        var axis = $(ui.element).data('ui-resizable').axis;
        var inputDims = {
            width: this.model.get('Width'),
            height: this.model.get('Height')
        };
        // When resizing all with a select a width or height of 1 is added, correct for this behavior
        if (tag === Constants.ft.Select) {
            if (axis === 'e' || axis === 'w') {
                inputDims.height -= 1;
            }
            if (axis === 'n' || axis === 's') {
                inputDims.width -= 1;
            }
        }
        var isNotCB = tag !== Constants.ft.CheckBox;
        if (isNotCB) {
            this.updateResizeDims(inputDims, ui, axis);
            if (isNotMulti) {
                this.updateDimensions({ width: inputDims.width, height: inputDims.height });
            }
        }
        var labelDims = { width: 0, height: 0 };
        var hasLabel = this.model.hasLabel();
        var widthOffset = 10;
        var heightOffset = 6;
        if (hasLabel) {
            labelDims = {
                width: this.model.getLabelAttributeValueInt('width'),
                height: this.model.getLabelAttributeValueInt('height')
            };
            this.updateResizeDims(labelDims, ui, axis, isNotCB);
            var totWidth;
            var totHeight;
            // Fix width/height of elements not being equal to total resized width
            // Fix offsets when resizing a checkbox 
            if (!isNotCB) {
                widthOffset = 4;
                heightOffset = 0;
                if (axis !== 'n' && axis !== 's') {
                    totWidth = labelDims.width + (!isLabelAbove ? inputDims.width : 0);
                    if (totWidth + widthOffset !== ui.size.width) {
                        labelDims.width += ui.size.width - totWidth - widthOffset;
                    }
                }
                if (axis !== 'e' && axis !== 'w') {
                    totHeight = labelDims.height + (isLabelAbove ? inputDims.height : 0) + heightOffset;
                    if (totHeight !== ui.size.height) {
                        labelDims.height += ui.size.height - totHeight - heightOffset;
                    }
                }
            }
            else {
                // Fix non-checkbox elements widths/heights
                var isLabelAbove = this.isLabelAbove();
                if (tag === Constants.ft.Image || tag === Constants.ft.FileUpload) {
                    widthOffset = heightOffset = 4;
                }
                else if (tag === Constants.ft.Select) {
                    widthOffset = 4;
                    heightOffset = 0;
                }
                if (axis !== 'n' && axis !== 's' && !isLabelAbove) {
                    totWidth = labelDims.width + inputDims.width;
                    if (totWidth + widthOffset !== ui.size.width) {
                        inputDims.width += ui.size.width - totWidth - widthOffset;
                    }
                }
                if (axis !== 'e' && axis !== 'w' && isLabelAbove) {
                    totHeight = labelDims.height + inputDims.height;
                    if (totHeight + heightOffset !== ui.size.height) {
                        inputDims.height += ui.size.height - totHeight - heightOffset;
                    }
                }
            }
        }
        return { inputDims: this.roundDimensions(inputDims), labelDims: this.roundDimensions(labelDims) };
    },
    roundDimensions: function (dims) {
        return { width: Math.round(dims.width), height: Math.round(dims.height) };
    },
    removeResizable: function () {
        var $markup = this.$el.find('.formElementMarkup');
        if ($markup.resizable('instance')) {
            $markup.resizable('destroy');
        }
        var $formElementLabel = this.$el.find('.formElementLabel');
        if ($formElementLabel.resizable('instance')) {
            $formElementLabel.resizable('destroy');
        }

        var $formElementInput = this.$el.find('.formElementLabel + *');
        var $resizableWrapper = this.$el.find('.ui-wrapper');
        if ($resizableWrapper) {
            $formElementInput = $resizableWrapper.find('*');
        }
        var idx = 0;
        var length = $formElementInput.length;
        for (idx; idx < length; idx++) {
            var $resizable = $formElementInput.eq(idx);
            if ($resizable.resizable('instance')) {
                $resizable.resizable('destroy');
                if ($resizable.is('input') || $resizable.is('textarea') || $resizable.is('select') || $resizable.is('img')) {
                    var width = $resizable.width();
                    var height = $resizable.height();
                    $resizable.removeAttr('style');
                    $resizable.css({
                        width: this.model.get('Width'),
                        height: this.model.get('Height')
                    });
                }
            }
        }

    },
    dndTolerance: function (event, ui) {
        var snapTolerance = this.$formElementMarkup.draggable('option', 'snapTolerance');
        var topRemainder = ui.position.top % snapTolerance;
        var leftRemainder = ui.position.left % snapTolerance;
        // Either go up or down in tolerance, depending on which is the smallest change
        if (topRemainder <= snapTolerance) {
            ui.position.top = ui.position.top - topRemainder;
        }
        if (leftRemainder <= snapTolerance) {
            ui.position.left = ui.position.left - leftRemainder;
        }
        return ui.position;
    },
    setupDragAndDrop: function () {
        var that = this;
        var $containment = $('.FormsDesignerView').find('.FormsDesignerCanvasView:visible').find('#masterForm').has(this.$formElementMarkup);
        var startPos;
        var snapToGridSize = this.formTemplatePkg.get('Template').getSnapToGrid();
        this.$formElementMarkup.draggable({
            distance: 6,
            containment: $containment,
            cursor: 'move',
            snapTolerance: snapToGridSize,
            start: function (event, ui) {
                that.$el.find('.ui-resizable-handle').css('visibility', 'hidden');
                ui.position = that.dndTolerance(event, ui);
                startPos = {
                    top: ui.position.top,
                    left: ui.position.left
                };
            },
            drag: function (event, ui) {
                ui.position = that.dndTolerance(event, ui);
                var endPos = {
                    top: ui.position.top,
                    left: ui.position.left
                };
                that.updatePosition(startPos, endPos);
                // The helper on drag causes elements to shift, setting the width and height to auto fixes this.
                if (ui.helper.get(0).tagName !== 'IMG') {
                    ui.helper.width('auto');
                    ui.helper.height('auto');
                }
            },
            stop: function (event, ui) {
                ui.position = that.dndTolerance(event, ui);
                var endPos = {
                    top: ui.position.top,
                    left: ui.position.left
                };
                that.model.updatePosition(endPos);
                that.model.set({ repositionComplete: true });
            }
        });
    },
    removeDrag: function () {
        if (this.$formElementMarkup.draggable('instance')) {
            this.$formElementMarkup.draggable('destroy');
        }
    },
    updatePosition: function (startPos, endPos, updateModel) {
        var offsetTop = endPos.top - startPos.top;
        var offsetLeft = endPos.left - startPos.left;
        var pos = {
            top: Math.round(this.model.get('Top') + offsetTop),
            left: Math.round(this.model.get('Left') + offsetLeft)
        };
        this.$el.find('.formElementMarkup').css({
            'top': pos.top,
            'left': pos.left
        });
        if (updateModel) {
            this.model.updatePosition(pos);
        }
    },
    updateDimensions: function (dims, updateModel, options) {
        dims.width = Math.round(dims.width);
        dims.height = Math.round(dims.height);
        var $input = this.$formElementMarkup.find('> :not(".formElementLabel"):not(".ui-resizable-handle"):not(".ui-combobox")'); // Could be - input, select, textarea, anything that isn't the form element label...
        $input.width(dims.width).height(dims.height);
        if (updateModel) {
            this.model.updateDimensions(dims, options);
        }
    },
    updateLabelDimensions: function (dims, updateModel, options) {
        dims.width = Math.round(dims.width) + 'px';
        dims.height = Math.round(dims.height) + 'px';
        var $label = this.$formElementMarkup.find('.formElementLabel');
        $label.css(dims);
        if (updateModel) {
            this.model.replaceLabelAttributeValues({ style: dims }, options);
        }
    },
    ///<summary>
    /// Determine if the label exists and is above or to the side of the 'input' (eg. textarea, input, img...)
    ///</summary>
    isLabelAbove: function () {
        var $formElementLabel = this.$el.find('.formElementLabel');
        var labelOffset = $formElementLabel.offset();
        if (!labelOffset) {
            return undefined;
        }
        var $input = this.$el.find('.formElementLabel + *');
        var inputOffset = $input.offset();
        var isAbove = false;
        if (labelOffset.top < inputOffset.top) {
            isAbove = true;
        }
        return isAbove;
    },
    isMinWidth: function (currWidth) {
        if (currWidth <= 20) {
            return true;
        }
        return false;
    },
    //#region Event Handling
    changeSelection: function (ev) {
        // While editing formulas don't allow selection to change
        if (this.formTemplatePkg.get('editingFormulas')) {
            return;
        }
        this.resizeEvent = ev;  // setting resizeEvent here will trigger setupResizable in this.render on this.model change event handler
        // Model already selected? setup resizable, otherwise make it selected
        if (this.model.isSelected()) {
            this.setupResizable(ev);
        }
        else {
            this.model.set({ 'selected': true });
        }
        ev.stopPropagation();
    },
    addToFormula: function () {
        //TODO: validate to make sure the field is allowed as the next part of the expression
        // When editing a formula clicking a form element that isn't selected needs to add it to the formula
        if (this.formTemplatePkg.get('editingFormulas')) {
            var ffes = this.formTemplatePkg.get('FormulaElements');
            var selectedItem = this.formTemplatePkg.get('Elements').getSelected()[0];
            if (selectedItem) {
                var newId = Utility.getSequentialGuids(1)[0];
                var ffe = new FormFormulaElement({ Id: newId, FormElementId: this.model.get('Id'), TargetId: selectedItem.get('Id') });
                ffes.add(ffe);
                var operation = this.formTemplatePkg.get('editingOperation');
                if (operation) {
                    selectedItem.addOperationWithSingleOperandToFormula(operation, ffe);
                    this.formTemplatePkg.set('editingOperation', false);
                }
                else {
                    selectedItem.addFormElementToFormula(ffe);
                }
            }
        }
    },
    preventDefault: function (ev) {
        ev.preventDefault();
        return false;
    },
    handleKeysDown: function (ev) {
        var $targ = $(ev.target);
        var acceptsInput = $targ.is(':focus') && ($targ.is('input') || $targ.is('textarea') || $targ.is('select'));
        if (acceptsInput || !this.model.isSelected()) {
            return true;
        }
        this.$el.find('.ui-resizable-handle').css('visibility', 'hidden');
        var position,
            $draggable = this.$formElementMarkup,
            distance = 1; // Distance in pixels the draggable should be moved

        position = {
            top: this.model.get('Top'),
            left: this.model.get('Left')
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
        this.model.set({
            Top: position.top,
            Left: position.left
        });
        // Don't scroll page
        ev.preventDefault();
    },
    handleKeysUp: function (ev) {
        var $targ = $(ev.target);
        var acceptsInput = $targ.is(':focus') && ($targ.is('input') || $targ.is('textarea') || $targ.is('select'));
        if (acceptsInput || !this.model.isSelected()) {
            return true;
        }
        var that = this;
        clearTimeout(this.dndKeyTimeout);
        this.dndKeyTimeout = setTimeout(function () {
            var position = {
                top: that.model.get('Top'),
                left: that.model.get('Left')
            };
            that.$el.find('.ui-resizable-handle').css('visibility', 'visible');
            that.model.updatePosition(position);
            that.model.set({ repositionComplete: true });
        }, Constants.TypeAheadDelay);
    }
    //#endregion Event Handling
});