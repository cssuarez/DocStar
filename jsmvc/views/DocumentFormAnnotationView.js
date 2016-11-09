var DocumentFormAnnotationView = Backbone.View.extend({
    model: null, // BulkViewerDataPackageCPX
    className: 'DocumentFormAnnotationView',
    collapsedApprovalStamps: {},
    events: {
        'click .showHideStamps': 'toggleApprovalStamps'
    },
    initialize: function (options) {
        this.options = options;
        this.pzr = this.options.pzr;
        this.drawing = Drawing(this.pzr, this.model);
        this.approvalStampsEnabled = Utility.convertToBool(Utility.GetSystemPreferenceValue('enableApprovalStamps'));
        this.compiledTemplate = doT.template(Templates.get('documentformannotationlayout'));
        var page = this.model.getCurrentPage(Constants.vt.FormEdit);
        var info = this.model.get('DocumentPackage').findPage(page);
        this.pdto = info ? info.pdto : undefined;
        this.listenTo(this.model.get('DocumentPackage'), 'change:Approval', this.getApprovalStampImage);
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var showStamps = Utility.GetUserPreference('showApprovalStamps');
        var ro = {
            showStamps: Utility.convertToBool(showStamps === undefined ? true : showStamps)
        };
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        if (this.prevShowStamps !== undefined && viewData.showStamps !== this.prevShowStamps) {
            this.getEditMarkContainer().empty();
        }
        this.renderApprovalStamps(viewData.showStamps);
        this.prevShowStamps = viewData.showStamps;
        return this;
    },
    cleanupCollapsedApprovalStamp: function (markId) {
        var appStamp = this.collapsedApprovalStamps[markId];
        if (appStamp) {
            appStamp.close();
        }
        delete this.collapsedApprovalStamps[markId];
    },
    cleanupAllCollapsedApprovalStamps: function () {
        var markId;
        var appStamps = this.collapsedApprovalStamps;
        for (markId in appStamps) {
            if (appStamps.hasOwnProperty(markId)) {
                if (appStamps[markId]) {
                    appStamps[markId].close();
                }
                delete appStamps[markId];
            }
        }
        this.collapsedApprovalStamps = {};
    },
    close: function () {
        this.cleanupAllCollapsedApprovalStamps();
        this.unbind();
        this.remove();
    },
    getPZR: function () {
        var pzr = this.pzr;
        if (!pzr) {
            pzr = this.options.pzr;
        }
        return pzr;
    },
    // Get all approval stamps and place on form, only allow the current user's approval stamp to be editable
    renderApprovalStamps: function (allShown) {
        var idx = 0;
        var annos = this.pdto ? this.pdto.get('AnnotationCollection') : undefined;
        var length = annos ? annos.length : 0;
        // We need to scale to the ratio that exists between the rendered images height/width and the form's height/width
        var page1 = this.model.get('DocumentPackage');
        var dpi = Math.max(this.pdto.get('RezX'), this.pdto.get('RezY'));
        var scale = 96 / dpi;   // 96 is used for the conversion between inches and pixels for form documents. See FormTemplate.getPageSizeDims()
        this.getPZR().setScale(scale);
        var existingMyApprovalMark = this.getExistingMyApprovalMark();
        // Obtain new approval if there is one
        var newApproval = annos.findWhere({ ApprovalId: Constants.c.emptyGuid });
        var allShownChanged = this.prevShowStamps !== undefined && this.prevShowStamps !== allShown;
        while (length-- > 0) {
            var mark = annos.at(length);
            // Only look at approval type marks
            if (mark.get('Type') === Constants.mt.Approval) {
                // reset the mark's isCollapsed, so that the user preference to show/hide all stamps is king
                if (allShownChanged) {
                    // Remove listeners for the mark, so that we don't get multiple listeners for the same event
                    // We will add back the proper listeners when the mark is rendered
                    this.stopListening(mark);
                    mark.set('isCollapsed', !allShown, { silent: true });  // don't trigger events, because we are rendering below
                }
                var markImg = this.getPZR().getViewPort().find('img[markid="' + mark.get('Id') + '"]');
                var isExisting = existingMyApprovalMark && existingMyApprovalMark.get('Id') === mark.get('Id');
                var existingIsNew = existingMyApprovalMark && existingMyApprovalMark.get('ApprovalId') === Constants.c.emptyGuid;
                // Attempt to display the approval stamp if:
                //  1.) There is nothing representing the approval stamp
                //  2.) There is no existing approval
                //  3.) There is an existing approval, but it is a new approval being placed
                //  4.) There is an existing approval and it is not the new approval being placed
                if (markImg.length === 0 && (!isExisting || (isExisting && existingIsNew && newApproval) || (isExisting && !existingIsNew && !newApproval))) {
                    var isCollapsed = mark.get('isCollapsed');
                    // Display approval stamp image if:
                    //  1.) We want to show all approval stamps (ie don't collapse any approval stamp)
                    //  2.) This specific approval stamp is specified to be shown or is not specified to be collapsed
                    // Otherwise display the approval stamp collapsed
                    if (allShown || (isCollapsed !== undefined && isCollapsed !== true)) {
                        this.getApprovalStampPng(mark, true);
                    }
                    else {
                        this.getCollapsedApprovalStamp(mark, true);
                    }
                }
            }
        }
    },
    getCollapsedApprovalStamp: function (mark, setApprovalsCache) {
        var that = this;
        var markId = mark.get('Id');
        this.listenToOnce(mark, 'change:isCollapsed', function (model, value, options) {
            if (!value) {
                this.cleanupCollapsedApprovalStamp(markId);
                this.pzr.getViewPort().find('[markid="' + markId + '"]').remove();
                this.getApprovalStampPng(mark, true);
            }
        });
        var callback = function () {
            that.cleanupCollapsedApprovalStamp(markId);
            var collapsedAppStamp = new CollapsedApprovalStampView({ model: that.model, mark: mark, pzr: that.getPZR() });
            that.collapsedApprovalStamps[markId] = collapsedAppStamp;
            that.getEditMarkContainer().append(collapsedAppStamp.render().$el);
        };
        if (setApprovalsCache) {
            this.setApprovalsCache(callback);
        }
        else {
            callback();
        }
    },
    getApprovalStampImage: function (model, approval, options) {
        var that = this;
        // Only add a stamp if we have an approval object that is Approved or Denied. (Ignore recall or anything else)
        var noStampNeeded = !this.approvalStampsEnabled || !approval || (!approval.isApproved() && !approval.isDenied());

        // Check if the first page (Approvals stamps page) is rendered, otherwise stamping is not possible
        var page1 = this.model.get('DocumentPackage').findPage(1);
        // As a precaution, however we should be rendered since we are a document form
        var isNative = !(page1 && page1.ci.isRendered());
        if (isNative) {
            if (!noStampNeeded) {
                var $noStampForYou = $('.DocumentMetaView .meta_save_container .noApprovalStampNotImaged');
                $noStampForYou.fadeIn('slow').fadeOut(5000);
            }
            return;
        }
        // Drop any unsaved approval mark. (The user may approve/deny many times before saving) - bug 12861
        var approvalMark = page1.pdto.get('AnnotationCollection').findWhere({ ApprovalId: Constants.c.emptyGuid });
        if (approvalMark) {
            var annoCol = page1.pdto.get('AnnotationCollection');
            annoCol.remove(approvalMark);
            var $viewport = this.getPZR().getViewPort();
            $viewport.find('[markId="' + approvalMark.get('Id') + '"]').remove();
        }
        // Remove any existing collapsed approval mark
        // Always display any newly added approval stamp as its image and not collapsed
        var existingMyApprovalMark = this.getExistingMyApprovalMark();
        if (existingMyApprovalMark) {
            this.cleanupCollapsedApprovalStamp(existingMyApprovalMark.get('Id'));
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
        var showStamps = Utility.GetUserPreference('showApprovalStamps');
        // When adding a new approval stamp, it should always be the png, it should never be collapsed
        // Display all approval stamps, but only allow editing/selection of the users newly added approval
        if (currentPage === 1) {
            that.getApprovalStampPng(mark, true);
        }
        else {
            that.model.setCurrentPage(1);   // this.render will determine whether or not annotations mode should be entered on paging
            that.getApprovalStampPng(mark, true);
        }
    },
    getApprovalStampPng: function (mark, setApprovalsCache) {
        this.listenToOnce(mark, 'change:isCollapsed', function (model, value, options) {
            if (value) {
                var markId = model.get('Id');
                // Remove the existing view and re-render
                this.cleanupCollapsedApprovalStamp(markId);
                this.pzr.getViewPort().find('[markid="' + markId + '"]').remove();
                this.getCollapsedApprovalStamp(mark, true);
            }
        });
        var that = this;
        var getRotatedRectangle = function (markWidth, markHeight) {
            return that.getRotatedRectForApprovalStamp(markWidth, markHeight, mark);
        };
        var callback = function () {
            if (!that.fetching) {
                that.fetching = true;
                if ($.isEmptyObject(mark.get('Rectangle'))) {
                    that.getBurnedInAnnotationPng(mark, getRotatedRectangle);
                } else {
                    that.getBurnedInAnnotationPng(mark);
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
    getBurnedInAnnotationPng: function (mark, rectFunction) {
        // Generates new png from mark data.  Used for stamps and for converting burned in annos to editable annos (switching to edit mode)
        //   Doesn't add mark to Annotations (or Redactions) collection 
        // rectFunction: (optional) recomputes the rectangle for a mark whose position is dependent on its size.  If present, must match this signature:
        //      Rectangle = rectFunction(markWidth, markHeight)
        var that = this;
        var $viewport = this.getPZR().getViewPort();
        var image = new Image();
        var rect = mark.get('Rectangle');
        // Hide any my approval marks. (The user may approve/deny while in annotation edit mode and then both the existing stamp and new stamp would be movable)
        var page1 = that.model.get('DocumentPackage').findPage(1);
        var myApproval = that.model.getMyApproval();
        var existingMyApprovalMark = this.getExistingMyApprovalMark();
        // Set the scale of the pzr so that it matches the ratio between the actual generated image size and the size of the form
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
            var markCont = that.getEditMarkContainer();
            markCont.css('display', 'block').append(image);

            var isNewApprovalStamp = mark.get('ApprovalId') === Constants.c.emptyGuid;
            var makeSelected = isNewApprovalStamp || (myApproval && mark.get('ApprovalId') === myApproval.get('Id'));
            // Translate stamp to the proper coordinates
            var $selected = that.markToScreen($img, makeSelected);
            // Make it so the stamp can be moved if it is the users own stamp
            if (makeSelected) {
                that.setupReposition($selected, mark);
                that.drawing.repositionMark($selected, false, mark, { skipSetDirty: true });
                // Only display the 'Save' and 'Cancel' buttons when adding a new approval stamp
                if (isNewApprovalStamp) {
                    that.addSaveAndCancelForApprovalStamp($viewport.find('.selectedAnno img'));
                }
            }
            // find the container of the mark's image and add a 'Hide' button, so the approval stamp can be collapsed indvidually
            that.addHideApprovalStamp($viewport.find('div[markid="' + markId + '"]'));
            var notNewApprovalStamp = existingMyApprovalMark && existingMyApprovalMark.get('ApprovalId') !== Constants.c.emptyGuid;
            var hideExistingStamp = notNewApprovalStamp && that.approvalStampsEnabled && that.model.getDotted('DocumentPackage.Approval');
            if (hideExistingStamp) {
                $viewport.find('img[markId="' + existingMyApprovalMark.get('Id') + '"]').hide();
            }
        };
        this.fixMarkNulls(mark);
        image.src = this.getAnnotationImageSrc(mark);
    },
    setupReposition: function ($target, markModel) {
        var that = this;
        var myApproval = this.model.getMyApproval();
        var resizeOptions = {
            disabled: true
        };
        // Disable dragging when the approval stamp is not my 'new' approval
        var dragOptions = {
            containment: this.getEditMarkContainer(),
            disabled: markModel.get('ApprovalId') !== Constants.c.emptyGuid && (myApproval && markModel.get('ApprovalId') !== myApproval.get('Id')),
            stack: '.anno .redaction',
            cancel: '.hideApprovalStampContainer',  // prevent dragging when the hide btn is being 'clicked'
            stop: function (event, ui) {
                var $selected = $(ui.helper); // get selected anno / redaction
                var transMark = that.drawing.repositionMark($selected, false, markModel);
            }
        };
        that.drawing.setupReposition($target, resizeOptions, dragOptions);
    },
    markToScreen: function ($imageMark, makeSelected) {     // convert mark png coords to screen coords (from image)
        // Remove previously selected annotation
        if (makeSelected) {
            var prevSelectedAnno = this.getSelectedAnnoContainer();
            prevSelectedAnno.remove();
        }
        var markData = {
            idKV: { 'markId': $imageMark.attr('markId') },
            classList: (makeSelected ? 'selectedAnno' : '') + ' no_text_select',
            editRegionContainer: this.getEditMarkContainer(),
            rotation: 0
        };
        return this.drawing.regionToScreen($imageMark, markData);
    },
    getExistingMyApprovalMark: function () {
        var page1 = this.model.get('DocumentPackage').findPage(1);
        var myApproval = this.model.getMyApproval();
        var existingMyApprovalMark;
        if (myApproval) {
            existingMyApprovalMark = page1.pdto.get('AnnotationCollection').findWhere({ ApprovalId: myApproval.get('Id') });
        }
        return existingMyApprovalMark;
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
    fixMarkNulls: function (mark) {
        if (!mark.get('Opacity')) {
            //int32 can not be null
            mark.set('Opacity', 255, { ignoreChange: true }); // assume opaque
        }
        if (!mark.get('FillColor')) {
            //int32 can not be NAN
            mark.set('FillColor', (((252 << 8) + 253) << 8) + 254, { ignoreChange: true }); // red 252, green 253, blue 254 matches magic tranparency value coded in AccusoftAnnotations.cs
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
    getRotatedRectForApprovalStamp: function (markWidth, markHeight, mark) {
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
        // rotate to current page rotation (Always 0), this is to obtain the proper rectangle
        var r = that.getPZR().counterRotateRect(x, y, markWidth, markHeight, 0, hw.imgWidth, hw.imgHeight);
        //now perform cascade function: moving stamp down and right as long as it interferes with another stamp
        var newXY = this.model.cascade(r.Left, r.Top, hw.imgWidth, hw.imgHeight, 0, this.pdto);
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
            var rect = pzr.rotateRect(newX, newY, markWidth, markHeight, 0, hw.imgWidth, hw.imgHeight);
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
    addHideApprovalStamp: function ($stampContainer) {
        var btnCont = document.createElement('div');
        btnCont.className = 'hideApprovalStampContainer';
        var hideBtn = document.createElement('a');
        hideBtn.textContent = Constants.t('hide');
        btnCont.appendChild(hideBtn);
        $stampContainer.append(btnCont);
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
    //#region Event Handling
    toggleApprovalStamps: function (ev) {
        // Find all approval stamps and collapse/expand them accordingly
        var $currTarg = $(ev.currentTarget);
        var stampsShowing = $currTarg.hasClass('pressed');
        Utility.setSingleUserPreferenceWithCheck('showApprovalStamps', !stampsShowing);
        this.render();  // just re-render when expanding/collapsing approval stamps
    }
    //#endregion Event Handling
});