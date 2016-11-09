// View for editing / using Annotations
/// <reference path="../../Content/LibsInternal/Utility.js" />
/// <reference path="../../Content/LibsInternal/SecurityUtil.js" />
var AnnotationView = Backbone.View.extend({
    model: undefined, // BulkViewerDataPackageCPX
    pzr: undefined,
    drawing: undefined,
    imageAreaSelectevent: undefined,
    mark: {},
    marks: [],
    fetching: false,
    imageStampBound: false,
    //unselectMark: false, // to unselect the mark if it is dragged out of bounds of the image (to enforce bounds checking)
    stampProxy: undefined,
    editingAnnotations: false,
    cancelledEditMode: false,
    linePaper: undefined,
    pdto: undefined,
    lastSelectedAnno: undefined,
    selectedAnnotationType: undefined,
    approvalStampsEnabled: false,
    className: 'AnnotationView',
    events: {
        "click .annotations_menu > div.toggle_btn": "annotate",
        "click .annoProps,  .annotations_menu > div.toggle_btn": "showAnnoProps",
        "click .ui-icon.ui-icon-cancel": "endEditAnnotations",
        "click .deleteIcon": "deleteMark",
        "click div.showHideAnno": "showHideAnnotations",
        "click .textStamps .textStampCont": "selectStamp",
        "click .imageStamps .imageStampCont": "selectStamp",
        "click span.jPicker": "jPickerClicked",
        "click .fontPropCont div.toggle_btn": "toggleFontProp",
        "change .annoPropsCont select": "setAnnoPrefs",
        "mousedown .annoPropsCont .thickness li": "selectThickness",
        "click .collapsedAnnotationMenuButton": "displayMenu",
        "click .annoPropsCont": "jPickerOpened"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('annotationlayout'));
        this.options = options || {};
        this.pzr = this.options.pzr;
        this.lastSelectedAnno = this.options.lastSelectedAnno;
        this.drawing = Drawing(this.pzr, this.model);
        this.stampProxy = StampServiceProxy();
        this.stampProxy.setCacheDuration(30000);
        this.approvalStampsEnabled = Utility.convertToBool(Utility.GetSystemPreferenceValue('enableApprovalStamps'));
        window.txtStamps = window.txtStamps || new TextStamps();
        window.imgStamps = window.imgStamps || new ImageStamps();
        this.listenTo(Backbone, 'customGlobalEvents:resize', this.resizeView);
        this.listenTo(window.userPreferences, 'reset', function (collection, options) {
            var $showHideAnno = this.$el.find('.showHideAnno');
            $showHideAnno.find('span').prop('title', Constants.c.hideAnnotations);
            $showHideAnno.addClass('pressed');
        });
        this.listenTo(window.userPreferences, 'change', function (model, value, options) {
            var key = model.get('Key');
            if (key === 'viewocrShortcut' || key === 'viewbarcodeShortcut') {
                $('.annotations_menu .toggle_btn.pressed').click();
            }
        });
        this.listenTo(Backbone, 'customGlobalEvents:keyup', this.viewKeyUp);
        this.listenTo(Backbone, 'cusotmGlobalEvents:keydown', this.viewKeyDown);
        this.listenTo(this.model.get('DocumentPackage'), 'change:Approval', this.getApprovalStampImage);
        this.applyPZREventHandles();
    },
    render: function () {
        this.getMarkContainer().empty();        // clear out all previous annotations/redactions, not being edited
        this.getEditMarkContainer().empty();    // clear out all previous annotations/redactions, being edited
        var page = this.model.getCurrentPage(Constants.vt.Image);
        var info = this.model.get('DocumentPackage').findPage(page);
        this.pdto = info ? info.pdto : undefined;
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.bound = undefined;
        this.setupAnnoPropsDropDown();
        this.resizeView();
        // If there is an unsaved approval stamp, we need to get the image.
        // This is to prevent losing the approval stamp when switching pages. Bug 12804
        var approvalInProcess = this.model.getDotted('DocumentPackage.Approval');
        if (page === 1 && this.approvalStampsEnabled && !this.editingAnnotations && approvalInProcess && this.pdto) {
            var approvalMark = this.pdto.get('AnnotationCollection').findWhere({ ApprovalId: Constants.c.emptyGuid });
            if (approvalMark) {
                // can't enter edit mode, so just fetcht the approval stamp
                // Entering edit mode is handled by an event handler for 'docImageLoadedForApprovalStamp'
                if (!ro.allowAnnotate) {
                    this.getApprovalStampPng(approvalMark, this.pdto.get('Rotation'), true);
                }
            }
        }
        return this;
    },
    getRenderObject: function () {
        var ro = {
            allowEditing: this.model.canModifyVersioning(), // Check versioning
            allowRedact: this.model.hasRights(Constants.sp.Redact),
            allowAnnotate: this.model.hasRights(Constants.sp.ModifyAnnotations),
            fonts: [],
            sizes: []
        };
        if (!BrowserDetect.browser) {
            BrowserDetect.init();
        }
        if (BrowserDetect.browser.match(/Explorer/ig) && BrowserDetect.version === 8) { //Disable Annotation editiong for IE8
            ro.allowEditing = false;
        }
        ro.allowEditing = ro.allowEditing && (ro.allowRedact || ro.allowAnnotate);
        if (ro.allowEditing) {
            var fs = Constants.safeFonts;
            var i = 0;
            var length = fs.length;
            for (i; i < length; i++) {
                ro.fonts.push({
                    Value: fs[i],
                    Style: 'style = "font-family: ' + fs[i] + ';"',
                    Selected: ''
                });
            }
            fs = Constants.fontSizes;
            i = 0;
            length = fs.length;
            for (i; i < length; i++) {
                ro.sizes.push({
                    Value: fs[i],
                    Selected: ''
                });
            }
        }
        ro.showAnnotations = window.userPreferences.getShowAnnotations();
        ro.editingAnnotations = this.editingAnnotations;
        if (ro.editingAnnotations) {
            ro.isPressed = this.$el.find('.pressed:not(.showHideAnno)').children('span').attr('value');
        }
        return ro;
    },
    close: function () {
        Utility.cleanupJPicker(this.cid);
        this.cleanupEvents();
        this.drawing = undefined;
        this.pzr = undefined;
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getPZR: function () {
        var pzr = this.pzr;
        if (!pzr) {
            pzr = this.options.pzr;
        }
        return pzr;
    },
    applyPZREventHandles: function () {
        var that = this;
        var eh = this.getPZR().getEventHandles();
        eh.selectMark = function (e) {
            if ($('.selectedAnno').has($(e.currentTarget)).length === 0) {
                that.selectMark(e);
            }
        };
        eh.editAnnotationsText = function (e) {
            that.editAnnotationsText(e);
        };
        eh.selectViewPort = function (e) {// Clicking on viewport will deselect the currently selected annotation, and enable drawing annotations again
            // Remove selection and enable drawing annotations                    
            var $vp = that.getPZR().getViewPort(); // Make sure the correct viewport is selected...
            var markCont = that.getMarkContainer();
            var editMarkCont = that.getEditMarkContainer();
            var btnType = $('.anno_menu_cont .pressed').find('span').attr('value');
            if (markCont.find($(e.target)).length <= 0 && editMarkCont.find($(e.target)).length <= 0) {
                that.unselectMark();
                if (btnType && btnType !== 'ImageStamp' && btnType !== 'TextStamp') { // Don't enable imgareaselect if placing image / text stamps
                    $('body').trigger('drawAnnotations');
                }
            }
            $('.imgareaselect-outer').hide();
        };
    },
    getMarkContainer: function () {
        var $viewPort = this.getPZR().getViewPort();
        return $viewPort.find('.markContainer');
    },
    getEditMarkContainer: function () {
        var $viewPort = this.getPZR().getViewPort();
        return $viewPort.find('.editMarkContainer');
    },
    getSelectedAnnoContainer: function () {
        var $viewPort = this.getPZR().getViewPort();
        return $viewPort.find('.selectedAnno');
    },
    setupAnnoPropsDropDown: function () {
        var that = this;
        var $annPropCont = this.$el.find('.annoPropsCont');
        $annPropCont.on('click', '.thickness', {
            dropdownSelector: '.annoPropsCont .thickness.dropdown',
            parentSelector: '.annoPropsCont',
            childHoverSelector: '.thickness li span.parent',
            childShowHideSelector: '.thickness ul.children'
        }, that.showHideDropdownMenu);
    },
    setupAnnotationEditModeOption: function () {
        var selectedAnno = this.lastSelectedAnno;
        var remainInEditMode = Utility.GetUserPreference('annotationEditMode') === 'remainInEditMode' || false;
        if (selectedAnno && remainInEditMode) {
            this.cleanupEvents();
            var selectedButton = this.$el.find('.annotations_menu div').find('span[value="' + selectedAnno + '"]').parent();
            setTimeout(function () {
                selectedButton.click();
            }, 300);
        }
    },
    setAnnoProps: function (targetType, that) { // set the toolbar properties when showing the toolbar        
        var jPickers = Utility.getJPickerByViewId(this.cid);
        var fillColorItem = jPickers.fillColor;
        var borderColorItem = jPickers.borderColor;
        var fontColorItem = jPickers.fontColor;
        var annoPropPref = Utility.GetUserPreference(targetType);
        this.$el.find('.annoPropsCont .fillColor').parent().show();

        // Font Properties Show and Hide
        if (targetType === 'Text' || targetType === 'Sticky') {
            this.$el.find('.fontPropCont').show();
        }
        else {
            this.$el.find('.fontPropCont').hide();
        }

        // Border Properties Show and Hide
        if (targetType === 'Highlight') {
            this.$el.find('.borderPropCont').hide();
        }
        else if (targetType === 'Line' || targetType === 'Arrow') {
            this.$el.find('.annoPropsCont .fillColor').parent().hide(); // hide fill color.
            this.$el.find('.borderPropCont').show();
            this.$el.find('.borderThickness ul li:first').hide(); // hide None 
            this.$el.find('.borderThickness > a').text(Constants.c.lineThickness);
            this.$el.find('.borderPropCont a.borderColor').text(Constants.c.lineColor);
        }
        else if (targetType === 'Ellipse' || targetType === 'Rectangle') {
            this.$el.find('.borderPropCont').show();
            this.$el.find('.borderThickness ul li:first').hide(); // hide None 
            this.$el.find('.borderThickness > a').text(Constants.c.borderThickness);
            this.$el.find('.borderPropCont a.borderColor').text(Constants.c.borderColor);
        }
        else {
            this.$el.find('.borderPropCont').show();
            this.$el.find('.borderThickness ul li:first').show();
            this.$el.find('.borderThickness > a').text(Constants.c.borderThickness);
            this.$el.find('.borderPropCont a.borderColor').text(Constants.c.borderColor);
        }

        if (annoPropPref) {
            var prop = JSON.parse(annoPropPref);
            // Set Values if there is a user preference

            fillColorItem.color.active.val('hex', prop.FillColor); // fill color setting
            if (prop.FillColor === 0x1000000) { // If fill color has no color, set opacity to 0
                prop.Opacity = 0;
            }
            fillColorItem.color.active.val('a', prop.Opacity); // Opacity setting            
            fontColorItem.color.active.val('hex', prop.FontColor); // Font color setting
            borderColorItem.color.active.val('hex', prop.BorderColor); // Border color setting
            this.setBorderOrLineWidth(targetType, prop.Thickness); // Border or Line Thickness setting
            var fontNames = Constants.safeFonts;
            _.detect(fontNames, function (fontName) {
                if (fontName === prop.FontType) {
                    that.$el.find('.annoPropsCont select[name="FontType"]').find('option[value="' + prop.FontType + '"]').attr('selected', true);
                }
            });
            var fontStyles = this.$el.find('.fontPropCont div.toggle_btn');
            _.each(fontStyles, function (fontStyle) {
                if (prop.FontStyle & $(fontStyle).find('span').attr('value')) {
                    $(fontStyle).addClass('pressed');
                }
                else {
                    $(fontStyle).removeClass('pressed');
                }
            });
            this.$el.find('.fontPropCont select[name="FontSize"]').find('option[value=' + prop.FontSize + ']').attr('selected', true);

        }
        else {
            this.annoPropsDefaults(targetType);
        }
    },
    annoPropsDefaults: function (targetType) {
        var jPickers = Utility.getJPickerByViewId(this.cid);
        var fillColorItem = jPickers.fillColor;
        var borderColorItem = jPickers.borderColor;
        var fontColorItem = jPickers.fontColor;
        this.$el.find('.annoPropsCont select[name="FontType"]').find('option[value="Verdana"]').attr('selected', true);
        this.$el.find('.annoPropsCont select[name="FontSize"]').find('option[value="9"]').attr('selected', true);
        var fontStyles = this.$el.find('.fontPropCont div.toggle_btn');
        var length = fontStyles.length;
        var i = 0;
        for (i; i < length; i++) {
            $(fontStyles[i]).removeClass('pressed');
        }
        // Set Defaults
        var that = this;
        var defaultObj = {
            'Text': function () {
                fillColorItem.color.active.val('hex', 'FFFFFF'); // fill color setting                
                fillColorItem.color.active.val('a', 0); // Opacity setting
                fontColorItem.color.active.val('hex', '000000'); // Font color setting
                borderColorItem.color.active.val('hex', '000000'); // Border color setting
                that.setBorderOrLineWidth(targetType, 0);
            },
            'Sticky': function () {
                fillColorItem.color.active.val('hex', 'FFFF00'); // fill color setting                
                fillColorItem.color.active.val('a', 255); // Opacity setting
                fontColorItem.color.active.val('hex', '000000'); // Font color setting                
                borderColorItem.color.active.val('hex', '000000');
                that.setBorderOrLineWidth(targetType, 1);
            },
            'Highlight': function () {
                fillColorItem.color.active.val('hex', 'FFFF00'); // fill color setting                
                fillColorItem.color.active.val('a', 128); // Opacity setting                
                borderColorItem.color.active.val('hex', '000000'); // Border color setting
                that.setBorderOrLineWidth(targetType, 0); // it should be hidden, but still set it
            },
            'Rectangle': function () {
                fillColorItem.color.active.val('hex', 'FFFFFF'); // fill color setting                
                fillColorItem.color.active.val('a', 0); // Opacity setting                
                borderColorItem.color.active.val('hex', '000000'); // Border color setting
                that.setBorderOrLineWidth(targetType, 1);
            },
            'Ellipse': function () {
                fillColorItem.color.active.val('hex', 'FFFFFF'); // fill color setting                
                fillColorItem.color.active.val('a', 0); // Opacity setting                
                borderColorItem.color.active.val('hex', '000000'); // Border color setting
                that.setBorderOrLineWidth(targetType, 1);
            },
            'Line': function () {
                fillColorItem.color.active.val('hex', '000000'); // fill color setting                
                fillColorItem.color.active.val('a', 255); // Opacity setting
                borderColorItem.color.active.val('hex', '000000'); // Line color setting
                that.setBorderOrLineWidth(targetType, 1);
            },
            'Arrow': function () {
                fillColorItem.color.active.val('hex', '000000'); // fill color setting
                fillColorItem.color.active.val('a', 255); // Opacity setting                
                borderColorItem.color.active.val('hex', '000000'); // Line color setting
                that.setBorderOrLineWidth(targetType, 1);
            }
        };
        if (defaultObj[targetType]) {
            defaultObj[targetType]();
        }
    },
    setBorderOrLineWidth: function (targetType, value) {
        var $elBorderLineThickness = this.$el.find('.annoPropsCont .thickness_text');
        $elBorderLineThickness.height(value).text('').css({ 'position': '' });
        if (value === 0) {
            $elBorderLineThickness.text(Constants.c.none).css({ 'position': 'static' });
        }
    },
    setStartingPosIfNotDefined: function () {
        if (!this.position) {
            this.position = {};
        }
        if (this.position.Ax === undefined) {
            var offset = this.getPZR().getViewPort().offset();
            this.position.Ax = -offset.left;
            this.position.Ay = -offset.top;
            this.position.Bx = -1;
            this.position.By = -1;
            this.position.Ax += this.pointBx;
            this.position.Ay += this.pointBy;
        }
    },
    drawAnnotations: function (type, target) {
        // Add / remove ability to edit annotations
        var $viewport = this.getPZR().getViewPort();
        var targetType = target.find('span').attr('value');
        var that = this;
        $viewport.on('mousemove.annotate', function (e) {
            that.imageAreaSelectevent = e;
        });
        this.drawing.stopDrawing();
        this.position = {};
        if (targetType === 'Line' || targetType === 'Arrow') {
            this.getPZR().linePaper = new Raphael(0, 0, 1, 1);// Draw a line rather than a rectangle
            if (!that.mouseEventsBound) {
                $viewport.on('mousedown.annotate.' + this.cid, function (e) {
                    if (!that.position) {
                        that.position = {};
                    }
                    var offset = $viewport.offset();
                    if (offset) {
                        that.position.Ax = -offset.left;
                        that.position.Ay = -offset.top;
                        that.position.Bx = -1;
                        that.position.By = -1;
                        that.position.Ax += e.pageX;
                        that.position.Ay += e.pageY;
                    }
                });
                $('body').on('mousemove.annotate.' + this.cid, function (e) { // Used for tracking the mouse position when drawing lines
                    that.pointBx = e.pageX;
                    that.pointBy = e.pageY;
                });
                $('body').on('mouseup.annotate.' + this.cid, function (e) {
                    var offset = $viewport.offset();
                    if (offset) {
                        that.position.Bx = -offset.left;
                        that.position.By = -offset.top;
                        that.position.Bx += e.pageX;
                        that.position.By += e.pageY;
                        that.drawing.clipLineToViewport(that.position);
                    }
                });
                that.mouseEventsBound = true;
            }
        }
        if (targetType === 'ImageStamp' || targetType === 'TextStamp') {
            this.fillStamps();
            var drawing = that.drawing;
            if (!this.imageStampBound) {
                $('body').on('click.' + this.cid, $viewport.selector, function (e) {
                    var menuTarg = that.$el.find('div.annotations_menu div.pressed');
                    targetType = menuTarg.find('span').attr('value');
                    if (targetType === 'ImageStamp' || targetType === 'TextStamp') {
                        drawing.stopDrawing();
                        if ($(e.target).hasClass('element_transition') || $(e.target).hasClass('anno') || $(e.target).hasClass('redaction')) {
                            var name = menuTarg.find('span').attr('name');
                            var type = Constants.mt[name];
                            // On click of document if an image stamp is selected
                            if (targetType === 'ImageStamp') {
                                target = that.$el.find('.imageStamps li.pressed img');
                                that.getImageStampImage(e, target, type);
                            }
                            else if (targetType === 'TextStamp') {
                                target = that.$el.find('.textStamps li.pressed img');
                                that.getTextStampImage(e, target, type);
                            }
                        }
                        // Prevent selection if an image or text stamp is selected for placement
                        if (!$(e.target).hasClass('element_transition') && that.$el.find('.imageStamps li.pressed:visible, .textStamps li.pressed:visible').length > 0) {
                            e.stopPropagation();    // To prevent event from bubbling up for selection of annotations.
                        }
                    }
                });
                this.imageStampBound = true;
            }
        }
        else {
            that.drawing.setCurrentlyDrawing(false);
            that.drawing.startDrawingRegion({
                onSelectStart: function (img, selection) {
                    that.setStartingPosIfNotDefined();
                    var Event = that.imageAreaSelectevent;
                    if (Event && $(Event.target).prop("tagName") !== "IMG") {
                        $viewport.imgAreaSelect({ hide: true });
                        return false;
                    }
                    that.onSelectStart(img, selection, type, target);
                },
                onSelectEnd: function (img, selection) {
                    var Event = that.imageAreaSelectevent;
                    if (Event && $(Event.target).prop("tagName") !== "IMG") {
                        $viewport.imgAreaSelect({ hide: true });
                        return false;
                    }
                    that.onSelectEnd(img, selection, type, target, that.position);
                },
                onSelectChange: function (img, selection) {
                    that.setStartingPosIfNotDefined();
                    that.onSelectChange(img, selection, type, target, that.position);
                }
            });
        }

    },
    getImageStampImage: function (e, target, type) {
        if (target.length > 0) {
            var $viewport = this.getPZR().getViewPort();
            var rotation = this.pdto.get('Rotation');
            this.$el.find('.imageStamps li img').removeClass('selected');
            var mark = this.getNewMark(type);
            var data = target.data('data'); // Data doesn't contain xml... so.. no xml to GetMarkFromXML, instead creating the mark from the image            
            var top = e.pageY - $viewport.offset().top;
            var left = e.pageX - $viewport.offset().left;
            var point = this.getPZR().screenToImage(left, top);   // make image stamp be in image coordinates
            mark.set('Rectangle', // this is centered below
                {
                    Top: point.y,
                    Left: point.x
                });

            mark.set('ImageStampId', data.Id);
            mark.set('Rotation', -this.pdto.get('Rotation')); // counter rotate so the stamp is right-reading
            if (!this.fetching) {
                this.fetching = true;
                var getCenteredRectangle = function (markWidth, markHeight) {
                    var r = {
                        Left: point.x - markWidth / 2,
                        Top: point.y - markHeight / 2
                    };
                    mark.set('Rectangle', r);
                    return r;
                };
                this.getBurnedInAnnotationPng(mark, true, getCenteredRectangle, true);
                target.parent().removeClass('pressed');
                this.fetching = false;
            }
        }
    },
    getApprovalStampImage: function (model, approval, options) {
        var that = this;
        // Only add a stamp if we have an approval object that is Approved or Denied. (Ignore recall or anything else)
        var noStampNeeded = !this.approvalStampsEnabled || !approval || (!approval.isApproved() && !approval.isDenied());

        // Check if the first page (Approvals stamps page) is rendered, otherwise stamping is not possible
        var page1 = this.model.get('DocumentPackage').findPage(1);
        var isNative = !(page1 && page1.ci.isRendered());
        if (isNative) {
            if (!noStampNeeded) {
                var $noStampForYou = $('.DocumentMetaView .meta_save_container .noApprovalStampNotImaged');
                $noStampForYou.fadeIn('slow').fadeOut(5000);
            }
            return;
        }
        // Unselect currently selected mark (required by bug 12861 and 12940)
        this.unselectMark();

        // Drop any unsaved approval mark. (The user may approve/deny many times before saving) - bug 12861
        var approvalMark = page1.pdto.get('AnnotationCollection').findWhere({ ApprovalId: Constants.c.emptyGuid });
        if (approvalMark) {
            var annoCol = page1.pdto.get('AnnotationCollection');
            annoCol.remove(approvalMark);
            $('img[markId="' + approvalMark.get('Id') + '"]').remove();
        }
        if (noStampNeeded) {
            return;
        }

        // Create mark and set rotation (location set later)
        var rotation = page1.pdto.get('Rotation');
        var mark = this.getNewMark(Constants.mt.Approval, null, page1.pdto); // This is a temporary mark.  It is added to AnnotationsCollection here, but removed on save.  The real one will be generated and added on the server.
        mark.set('Rotation', -rotation); // counter rotate so the stamp is right-reading
        mark.set('Rectangle', {});

        var canModify = this.model.hasRights(Constants.sp.ModifyAnnotations);
        var currentPage = that.model.getCurrentPage();
        // if not already in edit mode and can modify annotations then automatically enter edit mode and get the approval stamp (selecting it)
        // Otherwise just get the approval stamp (selecting it)

        if (currentPage === 1) {
            if (canModify && !this.editingAnnotations) {
                this.editAnnotationsOnApprovalStamp(mark, rotation);
            }
            else {
                that.getApprovalStampPng(mark, rotation, true);
            }
        }
        else {
            this.listenToOnce(this.model, 'docImageLoadedForApprovalStamp', function (model, value, options) {
                if (canModify && !that.editingAnnotations) {
                    this.editAnnotationsOnApprovalStamp(mark, rotation);
                }
            });
            that.model.setCurrentPage(1);   // this.render will determine whether or not annotations mode should be entered on paging
        }
    },
    editAnnotationsOnApprovalStamp: function (mark, rotation) {
        var that = this;
        var ev = new $.Event();
        ev.currentTarget = this.$el.find('div.toggle_btn').first();
        $('body').one('drawAnnotations.' + this.cid, function () {
            that.getApprovalStampPng(mark, rotation, true);
        });
        this.annotate(ev);
        this.toggleButton(ev);  // un-press the button when entering annotation mode due to an added approval stamp
    },
    getApprovalStampPng: function (mark, rotation, setApprovalsCache) {
        var that = this;
        var getRotatedRectangle = function (markWidth, markHeight) {
            return that.getRotatedRectForApprovalStamp(markWidth, markHeight, mark, rotation);
        };
        // Define callback method which sets location (using actual size of rendered mark)
        var onImageLoadedCB = function ($selected) { // Add a class for determining if the stamp is new and if it is an approval stamp
            // Add a 'Save' and 'Cancel' button below the newly added selected approval stamp
            // Hide when dragging
            // Remove upon save/cancel
            that.addSaveAndCancelForApprovalStamp($selected);
        };
        var callback = function () {
            if (!that.fetching) {
                that.fetching = true;
                if ($.isEmptyObject(mark.get('Rectangle'))) {
                    that.getBurnedInAnnotationPng(mark, true, getRotatedRectangle, true, { onImageLoadedCB: onImageLoadedCB });
                } else {
                    that.getBurnedInAnnotationPng(mark, false, null, false, { onImageLoadedCB: onImageLoadedCB });
                }
                that.fetching = false;
            }
        };
        if (setApprovalsCache) {
            this.setApprovalsCache(callback);
        } else {
            callback();
        }
    },
    getRotatedRectForApprovalStamp: function (markWidth, markHeight, mark, rotation) {
        // get default location
        var that = this;
        var contentTypeId = that.model.getDotted('DocumentPackage.Document.ContentTypeId');
        var x = Utility.GetUserPreference(Constants.UtilityConstants.APPROVAL_STAMP_DEFAULT_X_PREFIX + contentTypeId) || 36; // this default position, 1/2" from left, 1" from top default matches that in ApprovalBusiness
        var y = Utility.GetUserPreference(Constants.UtilityConstants.APPROVAL_STAMP_DEFAULT_Y_PREFIX + contentTypeId) || 72;
        // scale to current resolution
        x *= that.pdto.get('RezX') / 72;
        y *= that.pdto.get('RezY') / 72;
        //Get image width and height
        var hw = that.getPZR().getHeightWidth(); // this is original/true image dimensions; not rotated
        // rotate to current page rotation
        var r = that.getPZR().counterRotateRect(x, y, markWidth, markHeight, rotation, hw.imgWidth, hw.imgHeight);
        //now perform cascade function: moving stamp down and right as long as it interferes with another stamp
        var newXY = this.model.cascade(r.Left, r.Top, hw.imgWidth, hw.imgHeight, rotation, this.pdto);
        if (newXY) {
            r.Left = newXY.x;
            r.Top = newXY.y;
        }
        // Fix stamp position if it is off the page
        if (r.Left + r.Width > hw.imgWidth) {
            r.Left = Math.max(hw.imgWidth - r.Width, 0);
        } else if (r.Left < 0) { // After rotation we may have a negative number, fix it as it is also off the page
            r.Left = 0;
        }
        if (r.Top + r.Height > hw.imgHeight) {
            r.Top = Math.max(hw.imgHeight - r.Height, 0);
        } else if (r.Top < 0) { // After rotation we may have a negative number, fix it as it is also off the page
            r.Top = 0;
        }
        // Update mark.  (Approval is updated from the mark on save; no need to do so here.)
        mark.set('Rectangle', {
            Left: r.Left,
            Top: r.Top,
            Width: r.Width, // these properties are temporary.  It will be created w/o Width and Height on server to auto-size
            Height: r.Height
        });
        mark.set('savePreferencesFunction', function (newX, newY) {
            var pzr = that.pzr || that.options.pzr; // We may have closed this view causing this.pzr to be undefined, so obtain it from this views options instead
            if (!pzr) {
                return; // Don't attempt to set user preference if we can't get the rect for the stamp (ie pzr no longer exists)
            }
            // rotate to orignal (unrotated) page
            var rect = pzr.rotateRect(newX, newY, markWidth, markHeight, rotation, hw.imgWidth, hw.imgHeight);
            var kvPairs = [];
            // store values scaled (back) to 72 dpi
            var value = rect.Left;
            var rez = that.pdto.get('RezX');
            if (rez) {
                value *= 72 / rez;
            }
            kvPairs.push({ Key: Constants.UtilityConstants.APPROVAL_STAMP_DEFAULT_X_PREFIX + contentTypeId, Value: Math.round(value) });
            value = rect.Top;
            rez = that.pdto.get('RezY');
            if (rez) {
                value *= 72 / rez;
            }
            kvPairs.push({ Key: Constants.UtilityConstants.APPROVAL_STAMP_DEFAULT_Y_PREFIX + contentTypeId, Value: Math.round(value) });
            Utility.SetUserPreference(kvPairs);
        });
        return r;
    },
    addSaveAndCancelForApprovalStamp: function ($selected) {
        // Event handlers for the save and cancel buttons are in DocumentImageView
        var btnCont = document.createElement('div');
        btnCont.className = 'approvalStampBtnContainer';
        var saveBtn = document.createElement('span');
        saveBtn.textContent = Constants.t('save');
        saveBtn.className = 'saveApprovalStamp';
        var cancelBtn = document.createElement('span');
        cancelBtn.textContent = Constants.t('cancel');
        cancelBtn.className = 'cancelApprovalStamp';
        btnCont.appendChild(saveBtn);
        btnCont.appendChild(cancelBtn);
        $([saveBtn, cancelBtn]).addClass('custom_button short_btn fleft');
        $selected.after(btnCont);
    },
    setApprovalsCache: function (successCallback) {
        var that = this;
        var success = function (result) {
            if (result.status === "ok") {
                // Don't execute the callback if the view has been removed
                if (that.$el.parent().length) {
                    Utility.executeCallback(successCallback, result);
                }
            }
            else {
                if (that.$el.find('[name="stamp_Error"]').length) {
                    ErrorHandler.addErrors({ 'stamp_Error': result.message });
                }
                else {
                    ErrorHandler.addErrors(result.message);
                }
            }
        };
        this.model.setApprovalsCache(success, successCallback);
    },
    getTextStampImage: function (e, target, type) {
        var $viewport = this.getPZR().getViewPort();
        var rotation = this.pdto.get('Rotation');
        if (target.length > 0 && !this.fetching) {
            this.fetching = true;
            var data = target.data('data');
            var markXML = data.MarkXML;
            var mark = this.getNewMark(type, markXML);
            // e.pageX and e.pageY are in absolute screen coordinates, need to be determined based on relative coordinates (offset from parents absolute coordinates)
            var left = e.pageX - $viewport.offset().left;    // Calculate offset from parent, to get correct positioning on image
            var top = e.pageY - $viewport.offset().top;
            var point = this.getPZR().screenToImage(left, top); // Make text stamp be in image coordinates
            var text = mark.get('Text');
            text = decodeURIComponent(text);  // Allow for special characters, need to decode them to display properly
            mark.set('Text', Utility.replaceTextStampText(text));
            mark.get('Rectangle').Top = point.y;   // This is centered below
            mark.get('Rectangle').Left = point.x;
            mark.set('Rotation', -rotation); // counter rotate so the stamp is right-reading
            var getCenteredRectangle = function (markWidth, markHeight) {
                var r = {
                    Left: point.x - markWidth / 2,
                    Top: point.y - markHeight / 2
                };
                mark.set('Rectangle', r);
                return r;
            };
            this.getBurnedInAnnotationPng(mark, true, getCenteredRectangle, true);
            this.fetching = false;
        }
    },
    getNewMark: function (type, markXML, pdto) {
        if (!pdto) {
            pdto = this.pdto;
        }
        this.mark = pdto.get('AnnotationCollection').add({ Type: type });
        if (markXML) {
            this.mark.fetch({ markXML: markXML });
        } else {
            this.mark.fetch();
        }
        return this.mark;
    },
    getNewRedaction: function (rect) {
        var that = this;
        this.mark = this.pdto.get('RedactionCollection').add({ Rectangle: rect });
        this.mark.fetch({ redaction: true });
    },
    editAnnotations: function () {
        var that = this;
        $('body').off('getBurnedInImages.' + this.cid);
        var canAnnotate = this.model.hasRights(Constants.sp.ModifyAnnotations);
        var canRedact = this.model.hasRights(Constants.sp.Redact);
        this.$el.find('.modalThrobberCont').show();
        // Always show annotations/redactions upon editing them
        this.$el.find('.showHideAnno').addClass('pressed');
        this.$el.find('.anno').show();
        this.$el.find('.redaction').show();
        this.$el.find('.showHideAnno span').prop('title', Constants.c.hideAnnotations);
        this.$el.find('.cancelEditMode').show();
        if (canAnnotate && canRedact) {
            $('body').on('getBurnedInImages.' + this.cid, function () {
                that.getBurnedInAnnotations();
                that.getBurnedInRedactions();
            });
            this.model.setAnnotationsDisplay({ redacted: false, annotated: false });
        }
        else if (canRedact) {
            $('body').on('getBurnedInImages.' + this.cid, function () {
                that.getBurnedInRedactions();
            });
            this.model.setAnnotationsDisplay({ redacted: false, annotated: true });
        }
        else if (canAnnotate) {
            $('body').on('getBurnedInImages.' + this.cid, function () {
                that.getBurnedInAnnotations();
            });
            this.model.setAnnotationsDisplay({ redacted: true, annotated: false });
        }
        else {
            // Can't Modify Annotations or Redactions, do nothing
            this.model.setAnnotationsDisplay({ redacted: true, annotated: true });
        }
    },
    getBurnedInAnnotations: function () {
        // Start edit annotations (turn burned in annotations into editable ones)
        // Refresh Viewer, to display naked image with editable annotations    
        var that = this;
        var success = function () {
            var annos = that.pdto ? that.pdto.get('AnnotationCollection') : undefined;
            var length = annos ? annos.length : 0;
            Utility.log("getBurnedInAnnotations: " + length);
            var mark;
            // Get png for each annotation
            while (length-- > 0) {
                mark = annos.at(length);
                // Skip annotations that already have their image loaded. 
                // This would be an unsaved/new annotation for which we already have a PNG.  
                // Bug 12731 and also bug 12804
                var markImg = that.getPZR().getViewPort().find('img[markid="' + mark.get('Id') + '"]');
                if (markImg.length === 0) {
                    if (mark.get('Type') === Constants.mt.Approval) {
                        that.getApprovalStampPng(mark, that.pdto.get('Rotation'), false);
                    } else {
                        that.getBurnedInAnnotationPng(mark);
                    }
                }
            }
        };
        this.setApprovalsCache(function () {
            success();
        });
    },
    getBurnedInRedactions: function () {
        var redacts = this.pdto ? this.pdto.get('RedactionCollection') : undefined;
        var length = redacts.length;
        while (length-- > 0) {
            this.getBurnedInRedactionSpan(redacts.at(length));
        }
    },
    getBurnedInAnnotationPng: function (mark, isNew, rectFunction, clickIt, options) {
        options = options || {};
        // Generates new png from mark data.  Used for stamps and for converting burned in annos to editable annos (switching to edit mode)
        //   Doesn't add mark to Annotations (or Redactions) collection
        // TODO can this method and getAnnotationPng be integrated in some fashion?
        // isNew: annotation is new and needs various properties set. 
        // TODO isNew parameter seems to mean something different in code, like isExisting. Also this method can search if it exist with no parameter. We will have to research and clarify (Approval Stamps might be missusing this parameter that was already there).
        // rectFunction: (optional) recomputes the rectangle for a mark whose position is dependent on its size.  If present, must match this signature:
        //      Rectangle = rectFunction(markWidth, markHeight)
        // clickIt: trigger a click event, so a new annotation gets selected
        var that = this;
        var $viewport = this.getPZR().getViewPort();
        var image = new Image();
        var rect;
        var points = mark.get('Points');
        var selected = $viewport.find('.selectedAnno img');
        if (points) {
            // To get a selection area for a line/arrow mark
            var minX = Math.min(points[0].X, points[1].X);
            var minY = Math.min(points[0].Y, points[1].Y);
            var maxX = Math.max(points[0].X, points[1].X);
            var maxY = Math.max(points[0].Y, points[1].Y);
            rect = {
                Left: minX,
                Top: minY,
                Width: maxX - minX,
                Height: maxY - minY
            };
        }
        else {
            rect = mark.get('Rectangle');
        }
        if (rect && isNew && selected.length > 0) {    // So that property changes on an auto-sized text stamp are changed properly
            if (rect.Width === 0 && rect.Height === 0) {
                rect.Width = selected.width();
                rect.Height = selected.height();
            }
        }


        // Hide any my approval marks. (The user may approve/deny while in annotation edit mode and then both the existing stamp and new stamp would be movable)
        var page1 = that.model.get('DocumentPackage').findPage(1);
        var myApproval = that.model.getMyApproval();
        var existingMyApprovalMark;
        if (myApproval) {
            existingMyApprovalMark = page1.pdto.get('AnnotationCollection').findWhere({ ApprovalId: myApproval.get('Id') });
        }
        image.onload = function () {
            image.onload = null; // this was removed in getAnnotationPng, so it should probably be removed here, too
            var $img = $(image);
            if (rectFunction) {
                rect = rectFunction(this.width, this.height);
            }
            $img.css({
                'left': rect.Left,
                'top': rect.Top
            });
            $img.width(this.width).height(this.height);
            $img.css('position', 'absolute');
            $img.addClass('anno');
            if (mark.get('Type') === Constants.mt.Approval) {
                if (mark.get('ApprovalId') === Constants.c.emptyGuid) {
                    $img.addClass('isNewApprovalStamp');    // used to determine if a 'Save' and 'Cancel' button should be added upon selection
                }
            }
            var markId = mark.get('Id');
            $img.attr('markId', markId);
            if (isNew && selected.length > 0) {   // If selected just set its src, rather than appending a whole new image tag                
                $('img[markId="' + markId + '"]').attr('src', image.src);
                $('.selectedAnno img').attr('src', image.src);
                $('.anno').removeClass('selected');
                $img.addClass('selected');
                Utility.executeCallback(options.onImageLoadedCB, $viewport.find('.selectedAnno img'));
            }
            else {
                var markCont = that.getMarkContainer();
                markCont.css('display', 'block').append(image);
                // If we got the clickIt flag but the mark is not yet selected, trigger the click event to select it.
                if (clickIt) {
                    $img.trigger("click");  // The click event will execute the same function as the onImageLoadedCB
                }
            }
            var notNewApprovalStamp = existingMyApprovalMark && existingMyApprovalMark.get('ApprovalId') !== Constants.c.emptyGuid;
            var hideExistingStamp = notNewApprovalStamp && that.approvalStampsEnabled && that.model.getDotted('DocumentPackage.Approval');
            if (hideExistingStamp) {
                $('img[markId="' + existingMyApprovalMark.get('Id') + '"]').hide();
            }
        };
        this.fixMarkNulls(mark);
        Utility.log("getBurnedInAnnotation: " + mark.get('Type'));
        image.src = this.getAnnotationImageSrc(mark);
    },
    getBurnedInRedactionSpan: function (mark, isSelected) {
        var $viewport = this.getPZR().getViewPort();
        var $docImg = $viewport.find('img[name="image_full"]:visible');
        var $docImgCont = $docImg.parent();
        var rect = mark.get('Rectangle');
        var redacEl = document.createElement('div');
        redacEl.setAttribute('class', 'redaction');
        redacEl.setAttribute('style', 'background: #000; top:' + rect.Top + 'px; left:' + rect.Left + 'px; width:' + rect.Width + 'px; height:' + rect.Height + 'px;');
        redacEl.setAttribute('markId', mark.get('Id'));
        $docImgCont.find('.markContainer').append(redacEl);
    },
    fixMarkNulls: function (mark) {
        if (!mark.get('Opacity')) {
            //int32 can not be null
            mark.set('Opacity', 255); // assume opaque
        }
        if (!mark.get('FillColor')) {
            //int32 can not be NAN
            mark.set('FillColor', (((252 << 8) + 253) << 8) + 254); // red 252, green 253, blue 254 matches magic tranparency value coded in AccusoftAnnotations.cs
            // kludgey?  Yes, but I don't want to introduce a nullable int to the Mark object and find out how well it de/serializes everywhere.
        }
    },
    getAnnotationImageSrc: function (mark) {
        var src = Constants.Url_Base + "Annotations/GetAnnotationPng?jsAnnotation=" + encodeURIComponent(JSON.stringify(mark.toJSON()));
        var dpi = Math.max(this.pdto.get('RezX'), this.pdto.get('RezY'));
        if (dpi > 0) {
            src += "&dpi=" + dpi;
        }
        return src;
    },
    getMark: function ($selEl) {
        var isAnno = $selEl.is('.anno, .selectedAnno');
        var id = $selEl.attr('markId');
        var col;
        if (isAnno) {
            col = this.pdto.get('AnnotationCollection');
        } else {
            col = this.pdto.get('RedactionCollection');
        }
        return col.get(id);
    },
    unselectMark: function () {
        // unselect the mark to translate back to image coordinates 
        // unselect the mark when -
        // selecting another mark, transforming (rotate, pan, or zoom), and saving
        var $markCont = this.getMarkContainer();
        var $selectedAnno = this.getSelectedAnnoContainer();
        var $marks = $markCont.find('.anno, .redaction');
        var selectedAnnoId = $selectedAnno.attr('markId');

        var selection = {
            Width: $selectedAnno.width(),
            Height: $selectedAnno.height(),
            Left: parseInt($selectedAnno.css('left'), 10),
            Top: parseInt($selectedAnno.css('top'), 10)
        };
        var screenToImgCoords = this.getPZR().screenToImageRect(selection);
        var len = $marks.length;
        if ($selectedAnno.length > 0) {
            while (len--) {
                var $mark = $marks.eq(len);
                if ($mark.attr('markId') === selectedAnnoId) {
                    // Update the mark currently in markContainer with current coordinates
                    //mark.attr('src', selectedAnno.find('img').attr('src'));
                    $mark.width(screenToImgCoords.Width).height(screenToImgCoords.Height);
                    $mark.css({
                        'left': screenToImgCoords.Left,
                        'top': screenToImgCoords.Top
                    });
                    var mm = this.getMark($mark);
                    if (!mm) {
                        break;  // early exit if we can't find the mark
                    }
                    var markAttrs = {};
                    var type = mm.get('Type');
                    if (type === 'Line' || type === 'Arrow') {
                        that.mark.set('Points', [
                            { X: screenToImgCoords.Left, Y: screenToImgCoords.Top },
                            { X: screenToImgCoords.Left + screenToImgCoords.Width, Y: screenToImgCoords.Top + screenToImgCoords.Height }
                        ]);
                    }
                    else {
                        markAttrs.Rectangle = {
                            Width: screenToImgCoords.Width,
                            Height: screenToImgCoords.Height,
                            Left: screenToImgCoords.Left,
                            Top: screenToImgCoords.Top
                        };
                    }
                    mm.set(markAttrs);
                    $selectedAnno.remove();   // Remove selectedAnno container
                    $mark.show();
                    break;
                }
            }
        }
    },
    markToScreen: function ($imageMark) {     // convert mark png coords to screen coords (from image)
        // Remove previously selected annotation
        var prevSelectedAnno = this.getSelectedAnnoContainer();
        prevSelectedAnno.remove();
        var markData = {
            idKV: { 'markId': $imageMark.attr('markId') },
            classList: 'selectedAnno',
            editRegionContainer: this.getEditMarkContainer()
        };
        return this.drawing.regionToScreen($imageMark, markData);
    },
    setupReposition: function ($target, markModel) {
        var that = this;
        var allowResize = markModel.get('Type') !== Constants.mt.Approval;
        var resizeOptions = {
            disabled: !allowResize,
            stop: function (event, ui) {
                var $selected = $(ui.element); // selected anno
                that.drawing.repositionMark($selected, true, markModel);
                if ($selected && $selected.length > 0 && $selected.find('img').length > 0) { // Doesn't need to be applied to redactions, redactions don't need to be fetched
                    that.getBurnedInAnnotationPng(markModel, allowResize); // fetch new png, replacing the src of the existing img tag
                }
                if (that.drawing.unselectMark) {
                    that.unselectMark();
                }
            }
        };
        var dragOptions = {
            stack: '.anno .redaction',
            stop: function (event, ui) {
                var $selected = $(ui.helper); // get selected anno / redaction                    
                var transMark = that.drawing.repositionMark($selected, false, markModel);
                that.mark = transMark;
                if (that.drawing.unselectMark) {
                    that.unselectMark();
                }
            }
        };
        that.drawing.setupReposition($target, resizeOptions, dragOptions);
    },
    setPropsFromMark: function (mark) { // Sets toolbar properties from mark data
        var jPickers = Utility.getJPickerByViewId(this.cid);
        var fillColorItem = jPickers.fillColor;
        var borderColorItem = jPickers.borderColor;
        var fontColorItem = jPickers.fontColor;
        var fontNames = Constants.safeFonts;

        // Set Values if there is a user preference
        if (fillColorItem) {
            if (mark.get('FillColor') >= 0) {
                // Zero padding required by JPicker Bug #12689
                fillColorItem.color.active.val('hex', Utility.pad(mark.get('FillColor').toString('16'), 6, '0')); // fill color setting                
            }
            if (mark.get('Opacity') >= 0) {
                fillColorItem.color.active.val('a', mark.get('Opacity')); // Opacity setting
                if (mark.get('FillColor') === 0x1000000) {
                    fillColorItem.color.active.val('a', 0); // Opacity setting
                }
            }
        }
        if (fontColorItem && mark.get('TextColor') >= 0) {
            fontColorItem.color.active.val('hex', Utility.pad(mark.get('TextColor').toString('16'), 6, '0')); // Font color setting
        }
        if (borderColorItem && mark.get('BorderColor') >= 0) {
            borderColorItem.color.active.val('hex', Utility.pad(mark.get('BorderColor').toString('16'), 6, '0')); // Border color setting
        }
        if (mark.get('BorderWidth') === 0) {
            this.$el.find('.annoPropsCont .thickness_text').text(Constants.c.none).css({ 'position': 'static', 'height': '0px' }); // Border Thickness setting            
        }
        else if (mark.get('BorderWidth') > 0) {
            this.$el.find('.annoPropsCont .thickness_text').text('').css({ 'position': '', 'height': mark.get('BorderWidth') });// Border Thickness setting           
        }
        else {
            this.$el.find('.annoPropsCont .thickness_text').height(mark.get('LineWidth')); // Border Thickness setting            
        }
        var fn = mark.get('FontName');
        var that = this;
        if (fn) {
            _.detect(fontNames, function (fontName) {
                if (fontName === fn) {
                    that.$el.find('.annoPropsCont select[name="FontType"]').find('option[value="' + fn + '"]').attr('selected', true);
                }
            });
        }
        if (mark.get('FontStyle')) {
            this.setFontStyle(mark);  // Set the font style (bold, italic, strikethrough and underline depending on the marks values)
        }
        if (mark.get('FontSize')) {
            this.$el.find('.fontPropCont select[name="FontSize"]').find('option[value=' + mark.get('FontSize') + ']').attr('selected', true);
        }
    },
    setFontStyle: function (mark, fss) { // Set the font style for mark data in the UI
        // fss: font style selectors (selectors for the elements that have the font styles (bold, italic, underline, and strikethrough)
        if (!fss) {
            fss = this.$el.find('.fontPropCont div.toggle_btn');
        }
        var len = fss.length;
        while (len--) {
            var fs = fss[len];
            if (mark.get('FontStyle') & $(fs).find('span').attr('value')) {
                $(fs).addClass('pressed');
            }
            else {
                $(fs).removeClass('pressed');
            }
        }
    },
    setAnnotationPng: function (mark) {
        var $viewPort = this.getPZR().getViewPort();
        $viewPort.find('.anno#' + mark.get('Id')).remove();//.src = Constants.Url_Base + "Annotations/GetAnnotationPng?jsAnnotation=" + encodeURIComponent(JSON.stringify(mark));
        $viewPort.find('.anno[markid=' + mark.get('Id') + ']').remove();
        this.getBurnedInAnnotationPng(mark);
    },
    showEditAnnotationDialog: function (title, text, ok, cancel) {
        // Set up a dialog for fetching text and upon ok fetch the png!
        var $viewPort = this.getPZR().getViewPort();
        $('#annotationText').find('textarea').val('');
        if (text) {
            $('#annotationText').find('textarea').val(text);
        }
        var okClicked = false;
        $('#annotationText').dialog({
            title: Constants.c[title.toLowerCase() + 'Note'],
            width: 440,
            minWidth: 400,
            maxWidth: $(window).width(),
            height: 230,
            minHeight: 230,
            maxHeight: $(window).height(),
            modal: true,
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    var t = $(this).find('textarea').val();
                    if (ok) {
                        ok(t);
                    }
                    okClicked = true;
                    $(this).dialog('close');
                }
            }, {
                text: Constants.c.close,
                click: function () {
                    $(this).dialog('close');
                }
            }],
            close: function () {
                if (!okClicked) {
                    Utility.executeCallback(cancel);
                }
                $viewPort.imgAreaSelect({ hide: true });
            }
        });
    },
    showHideDropdownMenu: function (event) {
        ShowHideUtil.showHideDropdownMenu(event);
    },
    toggleButton: function (e, noUntoggle) {
        // Check to see if toggle is pressed or not
        // If it is pressed upon click it will remove the 'pressed' class
        // Upon becoming pressed all siblings of the pressed toggle will remove the 'pressed' class
        var $target = $(e.currentTarget);
        var $viewport = this.getPZR().getViewPort();
        var $siblings = $target.siblings('.toggle_btn');
        var $selected = $('.selectedAnno');
        var mark = this.getMark($selected);
        var btnType = $target.find('span').attr('name');
        if ($target.hasClass('pressed')) {
            $target.removeClass('pressed');
            this.getPZR().enablePan();
            $viewport.imgAreaSelect({ remove: true });
        }
        else {
            if (mark && mark.get('Type') !== Constants.mt[btnType]) {  // Deselect the mark if it and the button's types do not match
                this.unselectMark();
            }
            $target.addClass('pressed');
            if ($siblings.length > 0 && !noUntoggle) {
                _.each($siblings, function (sibling) {
                    $(sibling).removeClass('pressed');
                });
            }
            this.drawing.setCurrentlyDrawing(false); // Enable drawing when changing annotations in the annotation toolbar            
        }
    },
    onSelectStart: function (img, selection, type, target, paper) {
        // if type is line / arrow hide selection area and handles        
        var targetType = target.find('span').attr('name');
        var $iaSel = this.$el.find('.imgareaselect-selection');
        $iaSel.parent().find('.imgareaselect-handle').show();
        $iaSel.css('visibility', 'visible');
        if (targetType === 'Line' || targetType === 'Arrow') {
            $iaSel.parent().find('.imgareaselect-handle').hide();
            $iaSel.css('visibility', 'hidden');
        }

        $iaSel.addClass('anno');
        $iaSel.removeClass('redaction');
        $iaSel.removeAttr('markId');
        this.$el.find('.anno').removeClass('selected');
    },
    onSelectEnd: function (img, selection, type, target, points) {
        var that = this;
        var pointA, pointB, r;
        var targetType = target.find('span').attr('value');
        var rotation = that.pdto.get('Rotation');
        var markXML = '';
        var markObj = {};
        var Rectangle = {
            Width: parseInt(selection.width, 10),
            Height: parseInt(selection.height, 10),
            Top: parseInt(selection.y1, 10),
            Left: parseInt(selection.x1, 10)
        };
        // Modifies passed in rectangle
        that.drawing.clipRectToViewport(Rectangle);
        if (targetType === 'Redaction') {
            this.getNewRedaction(Rectangle);
        }
        else if (type >= 0) {
            this.getNewMark(type);
        }
        // Remove paper that was just being used to draw on (so it isn't in the way)
        if (this.getPZR().linePaper) {
            this.getPZR().linePaper.remove();
            delete this.getPZR().linePaper;
        }
        that.mark.set('Rectangle', this.getPZR().screenToImageRect(Rectangle));    // assumed for now; this will be modified for line/arrow
        if (that.mark.get('Rotation') !== undefined) { // undefined for redactions
            that.mark.set('Rotation', -rotation); // counter-rotation is applied to make marks right-reading
        }
        // Apply default / chosen settings for the chosen annotation type
        var annoObj = {
            'Text': function () {
                that.mark.set('BorderShading', false);
                that.mark.set('BorderWidth', 0);
                that.getPropsForAnnotationPng(that.mark, targetType);
                that.getAnnotationText(targetType);
                return true;
            },
            'TextStamp': function () {
                // Get Text Stamp
                markXML = $(target).find('img').attr('data').MarkXML;
                if (markXML) {
                    markObj = JSON.parse(markXML);
                }
                that.mark.set('Type', $(markObj).attr('Type'));
                that.mark.set(FontName, $(markObj).attr('FontName'));
                that.mark.set('Id', $(markObj).attr('Id'));
                return true;
            },
            'Sticky': function () {
                that.getPropsForAnnotationPng(that.mark, targetType);
                that.getAnnotationText(targetType);
                return true;
            },
            'Highlight': function () {
                that.getPropsForAnnotationPng(that.mark, targetType);
                that.mark.set('BorderWidth', 0);
                that.mark.set('BorderColor', that.mark.FillColor);
            },
            'Rectangle': function () {
                that.getPropsForAnnotationPng(that.mark, targetType);
            },
            'Ellipse': function () {
                that.getPropsForAnnotationPng(that.mark, targetType);
            },
            'Line': function () {
                that.getPropsForAnnotationPng(that.mark, targetType);
                pointA = that.getPZR().screenToImage(points.Ax, points.Ay);
                pointB = that.getPZR().screenToImage(points.Bx, points.By);
                that.mark.set('Points', [{ X: pointA.x, Y: pointA.y }, { X: pointB.x, Y: pointB.y }]);
                r = that.mark.get('Rectangle');
                r.Left = Math.min(pointA.x, pointB.x);
                r.Top = Math.min(pointA.y, pointB.y);
                r.Width = Math.abs(pointA.x - pointB.x);
                r.Height = Math.abs(pointA.y - pointB.y);
                that.$el.find('.fontPropCont').hide();
            },
            'Arrow': function () {
                that.getPropsForAnnotationPng(that.mark, targetType);
                pointA = that.getPZR().screenToImage(points.Ax, points.Ay);
                pointB = that.getPZR().screenToImage(points.Bx, points.By);
                that.mark.set('Points', [{ X: pointA.x, Y: pointA.y }, { X: pointB.x, Y: pointB.y }]);
                r = that.mark.get('Rectangle');
                r.Left = Math.min(pointA.x, pointB.x);
                r.Top = Math.min(pointA.y, pointB.y);
                r.Width = Math.abs(pointA.x - pointB.x);
                r.Height = Math.abs(pointA.y - pointB.y);
                that.$el.find('.fontPropCont').hide();
            },
            'Redaction': function () {
                that.$el.find('.annoPropsCont').hide();
                that.drawing.stopDrawing();
                that.redact(that.mark);
                return true;
            }
        };
        if (annoObj[targetType]) {
            var earlyExit = annoObj[targetType]();
            if (earlyExit) {
                return;
            }
        }
        // Remove the old annotation before creating a new one with the same id    
        that.drawing.stopDrawing();
        that.getAnnotationPng(that.mark, true);
    },
    onSelectChange: function (img, selection, type, target, pos) {
        // Need to put paper in place of selection area
        // Clear line before drawing another     
        var viewport = this.getPZR().getViewPort();
        var offset = viewport.offset();
        var xOff = offset.left;
        var yOff = offset.top;
        var x1 = xOff + selection.x1;
        var y1 = yOff + selection.y1;
        var w = selection.width;
        var h = selection.height;
        if (this.getPZR().linePaper) { // Drawing the line is in screen coordinates
            this.getPZR().linePaper.remove();
            this.getPZR().linePaper = new Raphael(x1, y1, w, h);
            var pathX1 = 0;
            var pathY1 = 0;
            var pathX2 = w;
            var pathY2 = h;

            if (pos.Ax - 4 > selection.x1) {
                pathX1 = w;
                pathX2 = 0;
            }
            if (pos.Ay - 4 > selection.y1) {
                pathY1 = h;
                pathY2 = 0;
            }
            if (selection.x1 <= 0) {    // Check to make sure the x position tracks properly when being drawn and mouse is outside the bounds of the viewport
                pathX2 = -(xOff - this.pointBx);
            }
            if (selection.y1 <= 0) {    // Check to make sure the y position tracks properly when being drawn and mouse is outside the bounds of the viewport
                pathY2 = -(yOff - this.pointBy);
            }
            var vpath = "M " + pathX1 + ' ' + pathY1 + " L " + pathX2 + ' ' + pathY2 + " z";
            var vline = this.getPZR().linePaper.path(vpath);
            var strokeWidth = this.$el.find('.annoPropsCont .thickness_text').height();
            if (strokeWidth <= 0) {
                strokeWidth = 1;
            }
            var jPickers = Utility.getJPickerByViewId(this.cid);
            vline.attr({
                'stroke-width': strokeWidth,
                fill: '#' + jPickers.fillColor.color.active.val('hex'),
                stroke: '#' + jPickers.borderColor.color.active.val('hex')
            });

        }

        var $selectArea = this.$el.find('.imgareaselect-selection').parent();
        var selectTop = parseInt($selectArea.css('top'), 10);
        var selectLeft = parseInt($selectArea.css('left'), 10);
        var selectBot = parseInt($selectArea.css('top'), 10) + $selectArea.height();
        var selectRight = parseInt($selectArea.css('left'), 10) + $selectArea.width();
        var diffBot = selectBot - ($(viewport).offset().top + $(viewport).height());
        var diffRight = selectRight - ($(viewport).offset().left + $(viewport).width());
        if (selectTop < $(viewport).offset().top) {
            $selectArea.css('top', $(viewport).offset().top);
        }
        if (selectLeft < $(viewport).offset().left) {
            $selectArea.css('left', $(viewport).offset().left);
        }
        if (selectBot > $(viewport).offset().top + $(viewport).height()) {
            $selectArea.css('top', parseInt($selectArea.css('top'), 10) - diffBot);
        }
        if (selectRight > $(viewport).offset().left + $(viewport).width()) {
            $selectArea.parent().css('left', parseInt($selectArea.parent().css('left'), 10) - diffRight);
        }
        this.$el.find('.imgareaselect-outer').hide();
    },
    getPropsForAnnotationPng: function (mark) {
        var jPickers = Utility.getJPickerByViewId(this.cid);
        var fillColorItem = jPickers.fillColor;
        var borderColorItem = jPickers.borderColor;
        var fontColorItem = jPickers.fontColor;
        // Get fill color for mark from color picker, convert to int        
        mark.set('FillColor', parseInt(fillColorItem.color.active.val('hex'), 16));
        // Get alpha value, 0 - 255
        mark.set('Opacity', fillColorItem.color.active.val('a'));
        if (mark.get('Type') === Constants.mt.Highlight) {
            mark.set('Opacity', 127);
        }
        else if (mark.get('Opacity') === 0) {
            mark.set('FillColor', 0x1000000); // Mark.NOCOLOR
            mark.set('Opacity', 255);
        }
        mark.set('BorderColor', parseInt(borderColorItem.color.active.val('hex'), 16));
        mark.set('LineColor', parseInt(borderColorItem.color.active.val('hex'), 16));
        mark.set('TextColor', parseInt(fontColorItem.color.active.val('hex'), 16));
        mark.set('BorderWidth', this.$el.find('.annoPropsCont .thickness_text').height());
        mark.set('LineWidth', this.$el.find('.annoPropsCont .thickness_text').height());
        mark.set('FontName', this.$el.find('.annoPropsCont select[name="FontType"] option:selected').val());
        mark.set('FontStyle', this.getFontStyle());
        mark.set('FontSize', this.$el.find('.annoPropsCont select[name="FontSize"] option:selected').val());
    },
    getFontStyle: function () {
        var style = 0;
        var fss = this.$el.find('.fontPropCont div.toggle_btn');
        var len = fss.length;
        while (len--) {
            var fs = fss[len];
            if ($(fs).hasClass('pressed')) {
                style |= parseInt($(fs).find('span').attr('value'), 10);
            }
        }
        return style;
    },
    getAnnotationText: function (title) {
        var that = this;

        var ok = function (text) {
            that.mark.set('Text', text);
            that.getAnnotationPng(that.mark, true);
        };
        var cancel = function () {
            that.mark.destroy();
        };
        this.showEditAnnotationDialog(title, this.mark.get('Text'), ok, cancel);
    },
    getAnnotationPng: function (mark, clickIt, markCont) {
        // creates a new mark png and adds it to transform container in response to click/drag/release operation in UI.  (Not used for stamps.)
        // Adds to annotations or redactions collection
        var that = this;
        if (isNaN(mark.get('TextColor'))) {
            mark.set('TextColor', 0);
        }
        if (mark.get('Type') === Constants.mt.Text || mark.get('Type') === Constants.mt.Sticky) {
            mark.set('ScaleToDPI', true);
        }
        var isAnno = true;  // Redactions no longer use this method
        if (!markCont) {
            markCont = this.getMarkContainer(); // container that holds non-edited marks
        }
        var image = new Image();
        var rect = mark.get('Rectangle');
        image.onload = function () {
            image.onload = null;   // remove image onload, keeping it caused an issue where resizing then dragging would draw an annotation, when it wasn't wanted/needed
            var $img = $(image);
            if (!rect.Width) {
                rect.Width = 0;
            }
            if (!rect.Height) {
                rect.Height = 0;
            }
            $img.css({
                'left': rect.Left,
                'top': rect.Top
            });
            $img.width(this.width).height(this.height);
            if (isAnno) {
                $img.addClass('posAbs');
                $img.addClass('anno');
            }
            $img.attr('markId', mark.get('Id'));
            if (mark.get('Type') === Constants.mt.Highlight) {
                markCont.css('display', 'block').append($("<div></div>").css('opacity', '0.5').append(image));
            }
            else {
                markCont.css('display', 'block').append(image); // append image to mark container
            }

            // Check to see if the mark is already part of the collection of marks
            // If it is just set its values. If it is not add it to the collection of marks.
            var markExists = that.getMark($(image));
            if (!markExists) {
                var col;
                if (isAnno) {
                    col = that.pdto.get('AnnotationCollection');
                } else {
                    col = that.pdto.get('RedactionCollection');
                }
                col.add(mark);
            }
            that.drawingEnabled = false;
            $('body').trigger('drawAnnotations');
            that.fetching = false;
            if (clickIt) {
                $(image).trigger("click");
            }
        };
        this.fixMarkNulls(mark);
        image.src = this.getAnnotationImageSrc(mark); // TODO clickIt
    },
    redact: function (mark) {
        var markCont = this.getMarkContainer();
        var $redaction = this.drawing.createRegion({
            Rectangle: mark.get('Rectangle'),
            Color: '#000',
            Opacity: 1
        });
        $redaction.addClass('redaction').attr('markId', mark.get('Id'));
        markCont.css('display', 'block').append($redaction);
        this.pdto.get('RedactionCollection').push(mark);
        this.drawing.setCurrentlyDrawing(false);
        $('body').trigger('drawAnnotations');
        this.fetching = false;
    },
    fillStamps: function () {
        var that = this;
        var callback = function (stamps) {
            var imageStamps = stamps.ImageStamps;
            var textStamps = stamps.TextStamps;
            var li, div, img;
            var i = 0;
            var length = 0;
            var imgList = that.$el.find('.imageStamps ul');
            var txtList = that.$el.find('.textStamps ul');
            imgList.empty();
            if (imageStamps && imageStamps.length > 0) {
                length = imageStamps.length;
                for (i = 0; i < length; i++) {
                    li = document.createElement('li');
                    div = document.createElement('div');
                    img = document.createElement('img');
                    li.setAttribute('class', 'custom_button');
                    div.setAttribute('class', 'imageStampCont');
                    img.src = Constants.Url_Base + 'Annotations/GetStampsSprite?imageStamps=true';
                    img.setAttribute('data-data', JSON.stringify(imageStamps[i]));
                    div.appendChild(img);
                    li.appendChild(div);
                    imgList.append(li);
                    that.spriteStamp(imageStamps[i], imgList.find('.imageStampCont:last').find('img'), imgList.find('.imageStampCont:last'));
                }
            }
            txtList.empty();
            if (textStamps && textStamps.length > 0) {
                length = textStamps.length;
                for (i = 0; i < length; i++) {
                    li = document.createElement('li');
                    div = document.createElement('div');
                    img = document.createElement('img');
                    li.setAttribute('class', 'custom_button');
                    div.setAttribute('class', 'textStampCont');
                    img.src = Constants.Url_Base + 'Annotations/GetStampsSprite?imageStamps=false';
                    img.setAttribute('data-data', JSON.stringify(textStamps[i]));
                    div.appendChild(img);
                    li.appendChild(div);
                    txtList.append(li);
                    that.spriteStamp(textStamps[i], txtList.find('.textStampCont:last').find('img'), txtList.find('.textStampCont:last'));
                }
            }
        };
        this.getStampsSlim(callback);
    },
    spriteStamp: function (data, img, imgCont) {
        var seq = data.Sequence;
        var height = imgCont.height();
        var top = -(height * (seq - 1));
        var left = -1;
        img.css('top', top);
        img.css('left', left);
    },
    getStampsSlim: function (callback) {
        var sf = function (result) {
            Utility.executeCallback(callback, result);
        };
        var ff = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.addErrors(errorThrown.message);
        };
        var annoStampGetPackage = {
            IncludeImage: true,
            IncludeAdmin: true
        };
        this.stampProxy.getAllSlim(annoStampGetPackage, sf, ff);
    },
    showAnnoProps: function (e, overrideHide) {
        var that = this;
        var target = $(e.currentTarget);
        var targetType = target.find('span').attr('value');

        var selected = $('.selectedAnno');
        if (selected.find(".redaction").length > 0 && target.hasClass("annoProps")) {
            $('#redactionBorderSetting').dialog({
                title: Constants.c.warning,
                modal: true,
                buttons: [{
                    text: Constants.c.ok,
                    click: function () {
                        $(this).dialog('close');
                    }
                }]
            });
            return false;
        }
        var setupJPicker = function () {
            try {
                Utility.cleanupJPicker(that.cid);
                var $p = that.$el.find('.annoPropsCont a.fillColor').jPicker(
                    {
                        window: {
                            expandable: true,
                            position: {
                                x: 'screenCenter', // acceptable values "left", "center", "right", "screenCenter", or relative px value
                                y: '150' // acceptable values "top", "bottom", "center", or relative px value
                            },
                            alphaSupport: targetType === 'Highlight' //TODO: Bug http://thedude.docstar.com/b/show_bug.cgi?id=6483 - temporarily disabling alpha support for annotations
                        }
                    },
                    function (color, context) {
                        that.setAnnoPrefs();
                    });
                Utility.addJPickerTracking($p, that.cid);
                $p = that.$el.find('.annoPropsCont a.borderColor').jPicker(
                    {
                        window: {
                            expandable: true,
                            position: {
                                x: 'screenCenter', // acceptable values "left", "center", "right", "screenCenter", or relative px value
                                y: '150' // acceptable values "top", "bottom", "center", or relative px value
                            }
                        }
                    },
                    function (color, context) {
                        that.setAnnoPrefs();
                    });
                Utility.addJPickerTracking($p, that.cid);
                $p = that.$el.find('.annoPropsCont a.fontColor').jPicker(
                    {
                        window: {
                            expandable: true,
                            position: {
                                x: 'screenCenter', // acceptable values "left", "center", "right", "screenCenter", or relative px value
                                y: '150' // acceptable values "top", "bottom", "center", or relative px value
                            }
                        }
                    },
                    function (color, context) {
                        that.setAnnoPrefs();
                    }
                );
                Utility.addJPickerTracking($p, that.cid);
            }
            catch (e1) {
                Utility.OutputToConsole('show anno props jpicker cleanup and bindings', e1);
            }
        };
        if (!targetType) {
            targetType = this.$el.find('div.annotations_menu .pressed').find('span').attr('value');
        }
        var isImageStamp = targetType === 'ImageStamp';
        var imagePressed = $('div.annotations_menu .pressed').find('span').attr('name') === 'ImageStamp';
        var isTextStamp = targetType === 'TextStamp';
        var textPressed = $('div.annotations_menu .pressed').find('span').attr('name') === 'Text';
        if ((this.$el.find('.annoPropsCont:visible').length > 0 && !target.hasClass('pressed') && !overrideHide)
            || target.find('span[value="Redaction"]').length > 0
            || (isImageStamp && this.$el.find('.imageStamps:visible').length > 0 && !target.hasClass('pressed'))
            || (isTextStamp && this.$el.find('.textStamps:visible').length > 0 && !target.hasClass('pressed'))) {
            this.$el.find('.imageStamps').hide();
            this.$el.find('.textStamps').hide();
            this.$el.find('.annoPropsCont').hide();
        }
        else if (isImageStamp && imagePressed) {
            // Hide annotations property window
            that.drawing.stopDrawing();
            this.$el.find('.annoPropsCont').hide();
            this.$el.find('.textStamps').hide();
            // show image stamp palette
            this.$el.find('.imageStamps').show();
        }
        else if (isTextStamp && textPressed) {
            // Hide annotations property window
            that.drawing.stopDrawing();
            this.$el.find('.annoPropsCont').hide();
            this.$el.find('.imageStamps').hide();
            // show text stamp palette
            this.$el.find('.textStamps').show();
        }
        else {
            var isPressed = target.hasClass('pressed') || target.siblings().not('.showHideAnno').hasClass('pressed');
            if ((isPressed || overrideHide) && (targetType !== "Redaction")) {
                setupJPicker();
                that.setAnnoProps(targetType, that);
                this.$el.find('.annoPropsCont').show();
            }
            else {
                this.$el.find('.annoPropsCont > div').hide();
            }
            this.$el.find('.imageStamps').hide();
            this.$el.find('.textStamps').hide();
        }
    },
    annotate: function (e, overrideHide, noToggle) {
        var that = this;
        var target = $(e.currentTarget);
        var mt = Constants.mt;
        var name = target.find('span').attr('name');
        var type = mt[name];
        var targetType = target.find('span').attr('value');
        if (!noToggle) {
            this.toggleButton(e);
        }
        // Hide document hits before annotating
        $('body').trigger('DocumentTextAction', { show: false });
        $('body').off('drawAnnotations.' + this.cid);
        $('body').on('drawAnnotations.' + this.cid, function (e) {
            // Only if there is an annotation/redaction toolbar item pressed for editing
            // Do not use local variable 'target' as it might not be valid if the user moved to another page.
            target = $('.annotations_menu div.pressed:not(".showHideAnno")').eq(0);
            if (target.hasClass('pressed')) {
                that.drawAnnotations(type, target);
            }
        });

        if ((target.hasClass('pressed') && type >= 0) || (target.hasClass('pressed') && targetType === 'Redaction')) {
            this.selectedAnnotationType = targetType;
            this.model.set('inAnnotationEdit', true);
            if (!this.editingAnnotations || this.cancelledEditMode) {
                this.cancelledEditMode = false;
                this.editingAnnotations = true;
                this.editAnnotations();
            }
            else {
                $('body').trigger('drawAnnotations');
            }
        }
        else {
            that.drawing.stopDrawing();
            that.unselectMark();
            that.drawing.setCurrentlyDrawing(false);
            $('body').trigger('setupRecognitionShortcut');
            this.selectedAnnotationType = undefined;
        }
    },
    endEditAnnotations: function (e) {
        this.model.set('inAnnotationEdit', false);
        this.cleanupEvents();
        var isPageDirty = this.pdto && this.pdto.hasDirtyAnnotations();
        var that = this;
        var $dialog;
        var saveFunc = function (cleanup) {
            that.model.get('DocumentPackage').save(null, {
                success: function () {
                    Utility.executeCallback(cleanup);
                },
                failure: function () {
                    Utility.executeCallback(cleanup);
                }
            });
        };
        var cancelFunc = function (cleanup) {
            that.cancelledEditMode = true;
            that.editingAnnotations = false;
            if (this.pdto) {
                // reset the pages annotations/redactions
                that.pdto.get('AnnotationCollection').reset(Utility.tryParseJSON(that.pdto.get('JSAnnotationsList')) || []);
                that.pdto.get('RedactionCollection').reset(Utility.tryParseJSON(that.pdto.get('JSRedactionsList')) || []);
            }
            that.model.setDotted('DocumentPackage.Approval', undefined);
            that.model.setAnnotationsDisplay(undefined);
            Utility.executeCallback(cleanup);
        };
        if (isPageDirty) {
            var msg = String.format(Constants.c.unsavedChanges, this.model.getDotted('DocumentPackage.Version.Title'));
            $dialog = DialogsUtil.generalSaveDirtyPromptDialog(msg, saveFunc, cancelFunc, { resizable: false, autoOpen: false });
            $dialog.dialog('open');
        }
        else {
            cancelFunc();
        }
    },
    suspendEditing: function () {
        if (this.editingAnnotations) {
            var $btn = this.$el.find('.annotations_menu div').find('span[value="' + this.selectedAnnotationType + '"]').parent();
            var ev = new $.Event();
            ev.currentTarget = $btn;
            this.unselectMark();
            if ($btn.hasClass('pressed')) {
                this.toggleButton(ev);
                this.showAnnoProps(ev);
            }
            this.hideAnnotations();
        }
    },
    unsuspendEditing: function () {
        if (this.editingAnnotations) {
            var $btn = this.$el.find('.annotations_menu div').find('span[value="' + this.selectedAnnotationType + '"]').parent();
            var ev = new $.Event();
            ev.currentTarget = $btn;
            if (!$btn.hasClass('pressed')) {
                this.toggleButton(ev);
                this.showAnnoProps(ev);
                $('body').trigger('drawAnnotations');
            }
            this.showAnnotations();
        }
    },
    cleanupEvents: function () {
        $('body').off('drawAnnotations.' + this.cid);
        $('body').off('getBurnedInImages.' + this.cid);
        $('body').off('click.' + this.cid);
        $('body').off('mousedown.annotate.' + this.cid);
        $('body').off('mouseup.annotate.' + this.cid);
        $('body').off('mousemove.annotate.' + this.cid);
        var $vp = this.getPZR().getViewPort();
        $vp.off('mousedown.annotate.' + this.cid);
        $vp.off('mousemove.annotate.' + this.cid);
        this.mouseEventsBound = false;
    },
    deleteMark: function (e) {
        var $viewPort = this.getPZR().getViewPort();
        var selected = $viewPort.find('.selectedAnno, .redaction.selected');
        if (selected.length > 0) {
            var isAnno = selected.find('.anno').length > 0;
            var id = selected.attr('markId');
            var col;
            if (isAnno) {
                col = this.pdto.get('AnnotationCollection');
            } else {
                col = this.pdto.get('RedactionCollection');
            }
            var mark = col.get(id);
            if (mark.get('Type') !== Constants.mt.Approval) {
                col.remove(mark);
                col.hasDeletions = true;
                selected.remove();
            }
        }
    },
    showAnnotations: function () {
        $('.anno').show();
        $('.redaction').show();
    },
    hideAnnotations: function () {
        $('.anno').hide();
        $('.redaction').hide();
    },
    showHideAnnotations: function (e) {
        var targ = $(e.currentTarget);
        this.toggleButton(e, true);
        // When editing annotations/redactions don't change the user preference that keeps track of the show/hide state.
        // Instead temporarily maintain the show/hide state of annotations/redactions when performing edits
        if (this.editingAnnotations) {
            // show/hide editable annotations/redactions, but don't change the user preference
            if (targ.hasClass('pressed')) {
                this.showAnnotations();
                $('.showHideAnno span').prop('title', Constants.c.hideAnnotations);
            }
            else {
                this.unselectMark();
                this.hideAnnotations();
                $('.showHideAnno span').prop('title', Constants.c.showAnnotations);
            }
        }
        else { // When not editing annotations/redactions make sure to change the user preference, so the show/hide state of annotations/redactions is maintained permanently
            var showAnnotations = window.userPreferences.get('showAnnotations');
            var that = this;
            var newPrefVal;
            var func = function (result) {
                if ((showAnnotations && newPrefVal) || (!showAnnotations && !newPrefVal)) { // trigger change event, if the preference didn't truly change
                    window.userPreferences.trigger('change', window.userPreferences.get('showAnnotations'));
                }
                that.model.setAnnotationsDisplay(undefined); //triggers change event in DocumentImageViewer.
            };
            if (targ.hasClass('pressed')) {
                newPrefVal = true;
                $('.showHideAnno span').prop('title', Constants.c.hideAnnotations);
            }
            else {
                newPrefVal = false;
                $('.showHideAnno span').prop('title', Constants.c.showAnnotations);
            }
            Utility.SetSingleUserPreference('showAnnotations', newPrefVal, func);
        }
    },
    selectStamp: function (e) {
        var target = $(e.currentTarget);
        var parent = target.parent(); // li
        var siblings = parent.siblings();
        if (parent.hasClass('pressed')) {
            parent.removeClass('pressed');
            this.drawing.stopDrawing();
        }
        else {
            parent.addClass('pressed');
        }
        if (siblings.length > 0) {
            _.each(siblings, function (sibling) {
                $(sibling).removeClass('pressed');
            });
        }
    },
    jPickerClicked: function (e) {
        this.$el.find('.jPicker.Container').css('z-index', 200);
    },
    toggleFontProp: function (e) {
        var target = $(e.currentTarget);
        if (target.hasClass('pressed')) {
            target.removeClass('pressed');
        }
        else {
            target.addClass('pressed');
        }
        this.setAnnoPrefs();
    },
    setAnnoPrefs: function (e) {
        var $viewPort = this.getPZR().getViewPort();
        var jPickers = Utility.getJPickerByViewId(this.cid);
        var fillColorItem = jPickers.fillColor;
        var borderColorItem = jPickers.borderColor;
        var fontColorItem = jPickers.fontColor;
        var style = this.getFontStyle();
        var revMT = Utility.reverseMapObject(Constants.mt);
        var pref = {
            FillColor: fillColorItem.color.active.val('hex'),
            Opacity: fillColorItem.color.active.val('a'),
            BorderColor: borderColorItem.color.active.val('hex'),
            FontColor: fontColorItem.color.active.val('hex'),
            FontStyle: style,
            FontType: this.$el.find('.annoPropsCont select[name="FontType"] option:selected').val(),
            FontSize: this.$el.find('.annoPropsCont select[name="FontSize"] option:selected').val(),
            Thickness: this.$el.find('.annoPropsCont .thickness_text').height()
        };
        var selected = $viewPort.find('.selectedAnno');
        var mark;
        if (selected.length > 0) {
            mark = this.getMark(selected);
            if (mark) {
                if (revMT[mark.get('Type')] === 'Highlight') {
                    pref.BorderColor = pref.FillColor;
                }
                mark.set('FillColor', parseInt(pref.FillColor, 16));
                mark.set('Opacity', pref.Opacity);
                if (pref.Opacity === 0) {
                    mark.set('FillColor', 0x1000000);
                    mark.set('Opacity', 255);
                }
                mark.set('BorderColor', parseInt(pref.BorderColor, 16));
                mark.set('TextColor', parseInt(pref.FontColor, 16));
                mark.set('FontStyle', pref.FontStyle);
                mark.set('FontName', pref.FontType);
                mark.set('FontSize', pref.FontSize);
                mark.set('BorderWidth', pref.Thickness);
                mark.set('LineColor', parseInt(pref.BorderColor, 16));
                mark.set('LineWidth', parseInt(this.$el.find('.annoPropsCont .thickness_text').height(), 10));
                mark.set('isDirty', true);
                this.getBurnedInAnnotationPng(mark, true);
            }
        }
        var key = $('.annotations_menu div.pressed span').attr('value');
        Utility.SetSingleUserPreference(key, JSON.stringify(pref));
    },
    selectThickness: function (e) {
        var key = $('.annotations_menu div.pressed span').attr('value');
        var $span = $(e.currentTarget).find('span');
        var height = $span.height();
        if ($span.text() === Constants.c.none) {
            height = 0;
        }
        this.setBorderOrLineWidth(key, height);
        this.setAnnoPrefs();
    },
    selectMark: function (e) {  // on click select the mark (annotation / redaction png) for editing
        var $viewport = this.getPZR().getViewPort();
        var $target = $(e.currentTarget);
        this.unselectMark();  // Unselect the currently selected mark
        var revType = Utility.reverseMapObject(Constants.mt);
        var mark = this.getMark($target);  // Get markdata from target
        var $screenTarg = this.markToScreen($target);   // move the png into screen coordinates
        if ($screenTarg.parent('.ui-wrapper').length <= 0) {
            this.setupReposition($screenTarg, mark);
        }
        if (mark.get('Type') === Constants.mt.Approval) {
            // Below if check is not in the if statement above because we don't want to do anything in the else statement if the mark is an approval
            if (mark.get('ApprovalId') === Constants.c.emptyGuid) {
                var $appImg = $viewport.find('.selectedAnno img');
                this.addSaveAndCancelForApprovalStamp($appImg);
            }
        }
        else {
            var type = revType[mark.get('Type')];
            var pressed = this.$el.find('.annotations_menu').find('.pressed');
            var buttons = this.$el.find('.annotations_menu div.toggle_btn');
            if (buttons.length > 0) {   // Buttons for toggling which annotation is selected to be drawn
                //Account for text stamps
                //if (type === 'Text') {
                //if ($('div.toggle_btn.pressed').find('span').attr('value') === 'TextStamp') {
                //    type = $('div.toggle_btn.pressed').find('span').attr('value');
                //}
                //}
                var btn = _.detect(buttons, function (button) {
                    if (!type && pressed.length > 0) {
                        // If there is not a type and a button is currently pressed, get type from the button
                        type = pressed.find('span').attr('value');
                    }
                    if ($screenTarg.find('.redaction').length > 0) {
                        // If there is a type, determine if the screen target (selectedAnno) is a redaction, and set the type to redaction
                        type = 'Redaction';
                    }
                    return $(button).find('span').attr('value') === type; // return the button from the collection of buttons obtained above to be pressed
                });
                if (!$(btn).hasClass('pressed')) {
                    $(btn).trigger('click', [true, false]);
                }
                else {
                    $(btn).trigger('click', [true, true]);
                }
            }
            this.setPropsFromMark(mark);    // Set toolbar properties for the currently selected annotation (not redaction)
        }
        $viewport.imgAreaSelect({ disable: true, hide: true });   // Remove ability to draw an annotation / redaction when selecting one to be edited
    },
    editAnnotationsText: function (e) {
        var $target = $(e.currentTarget);
        var mark = this.getMark($target);  // Get markdata from target
        var type = mark.get('Type');
        if (type === Constants.mt.Sticky || type === Constants.mt.Text) {
            var that = this;
            this.unselectMark(); // Unselect the currently selected mark
            var ok = function (text) {
                mark.set('Text', text);
                mark.set('isDirty', true);
                that.setAnnotationPng(mark);
            };
            var revType = Utility.reverseMapObject(Constants.mt);
            this.showEditAnnotationDialog(revType[type], mark.get('Text'), ok);
        }
    },
    viewKeyUp: function (e) {
        if (e.which === 46 || e.which === 8) {
            var selectedAnno = $(e.currentTarget).find('.selectedAnno, .redaction.selected');
            if (selectedAnno.length > 0) {
                var event = new $.Event();
                event.currentTarget = selectedAnno[0];
                this.deleteMark(event);
            }
        }
    },
    viewKeyDown: function (e) {
        if (e.which === 8) {
            var selectedAnno = $(e.currentTarget).find('.selectedAnno, .redaction.selected');
            if (selectedAnno.length > 0) {
                var event = new $.Event();
                event.currentTarget = selectedAnno[0];
                this.deleteMark(event);
                // Added so the page won't try to redirect on a backspace press when trying to delete an annotation
                if (e.which === 8) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        }
    },
    jPickerOpened: function () {
        Navigation.onNavigationCallback = function () {
            $('.jPicker.Container').hide();
        };
    },
    displayMenu: function (ev) {
        var $annoContainer = this.$el.closest('.anno_menu_cont ');
        var $annoMenu = this.$el.find('.annotations_menu');
        if ($annoContainer.hasClass('pressed')) {
            $annoContainer.removeClass('pressed');
            $annoMenu.hide();
        }
        else {
            $annoContainer.addClass('pressed');
            $annoMenu.show();
        }
    },
    resizeView: function (o) {
        var shouldResize = o === undefined || o.windowResize || o.resizeDocumentView;
        if (!shouldResize) {
            return;
        }

        // setTimeout needed, waiting for element to be in DOM
        if (!this.$el.is(':visible')) {
            var that = this;
            setTimeout(function () { that.resizeView(); }, 100);
            return;
        }
        var widthDiff, width = 0;
        // Resize annotations toolbar to collapse into a dropdown menu
        var $viewerMenuBar = this.$el.closest('.viewer_menubar');
        var $annoContainer = this.$el.closest('.anno_menu_cont ');
        var $siblings = $annoContainer.siblings(':visible:not(.documentNavigator)');
        $siblings = $siblings.add($annoContainer);
        var annoMenuWidth = 0;
        var length = $siblings.length;
        var i = 0;
        for (i; i < length; i++) {
            var $sibling = $siblings.eq(i);
            if ($sibling.find('.annotations_menu').length > 0) {
                annoMenuWidth = $sibling.find('.annotations_menu').outerWidth(true);
                width += annoMenuWidth;
            }
            else if ($sibling.hasClass('dqRenderingInProgressContainer')) {
                var $text = $sibling.find('span');
                var textWidth = $text.width();
                var dqContWidth = $sibling.width();
                if (textWidth > dqContWidth) {
                    textWidth = dqContWidth;
                }
                width += textWidth;
            }
            else {
                width += $sibling.outerWidth(true);
            }
        }
        var $dispText = this.$el.find('.collapsedAnnotationMenuButton');
        var $menu = this.$el.find('.annotations_menu');
        widthDiff = $viewerMenuBar.width() - width - 20;
        // Collapse into a dropdown
        if (widthDiff <= 0) {
            $menu.addClass('collapse');
            $menu.removeClass('hidden');
            this.$el.find('.vert_seperator_hidable').hide();
            $dispText.text(Constants.c.annotationsRedactions);
            widthDiff += annoMenuWidth;
            if (widthDiff - $dispText.width() <= 0) {
                $dispText.text(Constants.c.shortAnnoRedact);
            }
            $annoContainer.addClass('collapse');
        }
            // Expand into the toolbar
        else {
            $menu.addClass('hidden');
            $menu.removeClass('collapse');
            this.$el.find('.vert_seperator_hidable').show();
            $dispText.text('');
            $annoContainer.removeClass('collapse');
            $menu.show();
        }
    }
});