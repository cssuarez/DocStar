// Obtain selection information to use for OCR
//PZR is required, dwg (drawing) is optional (only provide when there is an annotation view).
var Recognition = function (pzr, dwg) {
    var imgWidth = 0;
    var imgHeight = 0;
    var calculating = false;
    var bound = false;
    var lassoType = '';
    var recognitionOptions = [];
    var imgDims = {};
    var prevMenu = [];
    var selectors = {};
    var regionValues = {};
    var lassoShortcutTarget;
    var isocrShortcutOn;
    var isbarcodeShortcutOn;
    var islassoOcrOn;
    var islassobarcodeOn;
    var changeToCurrentPage = true;
    var toggleOcrShortCut = function () {
        var result = Utility.GetUserPreference('viewocrShortcut');
        if (result) {
            result = JSON.parse(result);
        }
        if (result === 'viewocrShortcut') {
            Utility.SetSingleUserPreference('viewocrShortcut', JSON.stringify('hideocrShortcut'));
            return false;
        }
        // If there isn't a cookie or the cookie is set to 'hideMeta', create the cookie or change it to 'viewMeta' and show the metadata
        Utility.SetSingleUserPreference('viewocrShortcut', JSON.stringify('viewocrShortcut'));
        Utility.SetSingleUserPreference('viewbarcodeShortcut', JSON.stringify('hidebarcodeShortcut'));
        return true;
    };
    var toggleBarcodeShortCut = function () {
        var result = Utility.GetUserPreference('viewbarcodeShortcut');
        if (result) {
            result = JSON.parse(result);
        }
        if (result === 'viewbarcodeShortcut') {
            Utility.SetSingleUserPreference('viewbarcodeShortcut', JSON.stringify('hidebarcodeShortcut'));
            return false;
        }
        // If there isn't a cookie or the cookie is set to 'hideMeta', create the cookie or change it to 'viewMeta' and show the metadata
        Utility.SetSingleUserPreference('viewbarcodeShortcut', JSON.stringify('viewbarcodeShortcut'));
        Utility.SetSingleUserPreference('viewocrShortcut', JSON.stringify('hideocrShortcut'));
        return true;
    };
    var setShortCutParameters = function (e, data) {
        var recUserPref;
        data = data || {};
        if (data.isocrShortcutOn !== undefined) {
            isocrShortcutOn = data.isocrShortcutOn;
        }
        else {
            recUserPref = Utility.GetUserPreference('viewocrShortcut');
            if (recUserPref) {
                r = JSON.parse(recUserPref);
                if (r === 'viewocrShortcut') {
                    isocrShortcutOn = true;
                }
            }
        }
        if (data.isbarcodeShortcutOn !== undefined) {
            isbarcodeShortcutOn = data.isbarcodeShortcutOn;
        }
        else {
            recUserPref = Utility.GetUserPreference('viewbarcodeShortcut');
            if (recUserPref) {
                r = JSON.parse(recUserPref);
                if (r === 'viewbarcodeShortcut') {
                    isbarcodeShortcutOn = true;
                }
            }
        }
        if (data.islassoOcrOn !== undefined) {
            islassoOcrOn = data.islassoOcrOn;
        }
        if (data.islassobarcodeOn !== undefined) {
            islassobarcodeOn = data.islassobarcodeOn;
        }
        if (data.toggleOcrShortCut) {
            isocrShortcutOn = toggleOcrShortCut();
            ocrShortcutLasso();
        }
        if (data.toggleBarcodeShortCut) {
            isbarcodeShortcutOn = toggleBarcodeShortCut();
            barcodeShortcutLasso();
        }
        if (data.lassoShortcutTarget) {
            lassoShortcutTarget = data.lassoShortcutTarget;
        }
    };
    var hideAreaSelect = function () {
        var $viewport = pzr.getViewPort();
        $viewport.imgAreaSelect({ hide: true, show: false });
    };
    var showAreaSelect = function () {
        var $viewport = pzr.getViewPort();
        $viewport.imgAreaSelect({ hide: false, show: true });
    };
    var setLassoType = function (lt) {
        lassoType = lt;
    };
    var setupLassoOutput = function (selectArea) {
        if (!selectArea) {
            selectArea = $('.imgareaselect-selection').parent();
        }
        $(selectArea).parent().append($('<div></div>')
            .attr('id', 'lasso_results_cont')
            .attr('name', 'lasso_error')
            .css('position', 'absolute')
            .css('width', 350)
            .css('height', 140)
            .append($('<textarea />')
                .attr('id', 'lasso_results_cont_lasso_results')
                .addClass('lasso_results')
                .attr('readonly', true)
            )
            .append($('<div></div>')
                .attr('id', 'lasso_exit_cont')
                .append($('<span></span>')
                    .attr('id', 'lasso_results_cont_lasso_exit')
                    .addClass('ui-icon ui-icon-circle-close lasso_exit')
                )
            ).resizable({
                width: 350,
                height: 140,
                minWidth: 350,
                minHeight: 140,
                maxWidth: 450,
                maxHeight: 450
            }).draggable({
                containment: 'parent'
            })
        );
        if ($(selectArea).width() > $('#lasso_results_cont').width()) {
            $('#lasso_results_cont').css('left', parseInt($(selectArea).css('left'), 10));
        }
        else {
            $('#lasso_results_cont').css('left', parseInt($(selectArea).css('left'), 10) - $('#lasso_results_cont').outerWidth());
        }
        $('#lasso_results_cont').css('top', $(selectArea).height() + parseInt($(selectArea).css('top'), 10) - $('#lasso_results_cont').outerHeight());
    };
    var lassoShortcutSuccess = function (lassoresult) {
        if (lassoShortcutTarget) {
            if (lassoShortcutTarget.isDate) {
                var isDate = Date.parse($.trim(lassoresult));
                if (isNaN(isDate)) {
                    lassoresult = "";
                }
            }
            if (lassoShortcutTarget.model) {
                lassoShortcutTarget.model.setValue(lassoresult);
            } else {
                lassoShortcutTarget.setValue(lassoresult);
            }
        }
    };
    var lassoShortcutFailure = function (result) {
        if (lassoShortcutTarget) {
            if (lassoShortcutTarget.model) {
                lassoShortcutTarget.model.setValue(result.message);
            } else {
                lassoShortcutTarget.setValue(result.message);
            }
        }
    };
    var displayPreviousSelection = function (options) {
        options = options || {};
        var rv = options.regionValues;
        var lassoType = options.lassoType || 'region';
        var imgAreaSelectOpts = options.imgAreaSelectOpts || {};
        if (!rv || !rv.Width) {
            return;
        }
        regionValues = rv;
        var $viewport = pzr.getViewPort();
        var $img = $(options.imgSelector);
        var imgDims = {
            width: $img.width(),
            height: $img.height()
        };
        var overrideOpts = {
            persistent: true,
            hide: false,
            disable: false,
            enable: true
        };
        overrideOpts = $.extend(true, overrideOpts, imgAreaSelectOpts);
        initAreaSelect(overrideOpts);
        lasso(lassoType, imgDims);
        $viewport.imgAreaSelect({ disable: true, enable: false });
        $viewport.imgAreaSelect({ disable: false, enable: true });
        $('.imgareaselect-selection').parent(':visible').css('z-index', 99996);
        changeToCurrentPage = false;
    };
    var isLassoShortcut = function () {
        return (isocrShortcutOn || isbarcodeShortcutOn)   // 
            && (islassoOcrOn === false && islassobarcodeOn === false) // Disable lasso shortcuts when performing lasso ocr/barcode
            && (!dwg || dwg.getCurrentlyDrawing() === false); // Disable lasso shortcuts when drawing regions
    };
    var ocrShortcutLasso = function () {
        if (isocrShortcutOn) {
            initAreaSelect();
            lasso('ocr');
            isbarcodeShortcutOn = false;
        }
        else {
            if (isbarcodeShortcutOn === false) {
                endLasso();
            }
        }
    };
    var barcodeShortcutLasso = function () {
        if (isbarcodeShortcutOn) {
            initAreaSelect();
            lasso('barcode');
            isocrShortcutOn = false;
        }
        else {
            if (isocrShortcutOn === false) {
                endLasso();
            }
        }
    };

    var init = function () {
        var d = pzr.getHeightWidth();
        this.imgWidth = d.imgWidth;
        this.imgHeight = d.imgHeight;
        var selectArea = $('.imgareaselect-selection').parent();
        $(selectArea).remove();
        selectArea.css('z-index', 10000);
        initAreaSelect();
        $('body').off('keyup', '#lasso_results_cont_lasso_results').on('keyup', '#lasso_results_cont_lasso_results', function (event) {
            // Cancel selection                
            if ($(span_in).hasClass('selected') === true && $('#' + selector + '_lasso_results.lasso_results').is(":focus")) {
                if (event.which === 27) {
                    endLasso();
                }
            }
        });
        $('body').off('click', '#lasso_results_cont_lasso_exit').on('click', '#lasso_results_cont_lasso_exit', function (event) {
            endLasso();
        });
        $('body').off('blur', '#lasso_results_cont_lasso_results').on('blur', '#lasso_results_cont_lasso_results', function (event) {
            endLasso();
        });

    };
    var setupLassoShortcut = function () {
        var $viewSel = pzr.getViewSelector();
        $viewSel.removeClass('selected');
        pzr.enablePan();
        initAreaSelect();
        if (isocrShortcutOn) {
            ocrShortcutLasso();
        }
        if (isbarcodeShortcutOn) {
            barcodeShortcutLasso();
        }
        islassoOcrOn = false;
        islassobarcodeOn = false;
    };
    var initAreaSelect = function (overrideOpts) {
        overrideOpts = overrideOpts || {};
        var selectArea = $('.imgareaselect-selection').parent();
        var $viewport = pzr.getViewPort();
        var $viewSel = pzr.getViewSelector();
        $viewport.imgAreaSelect({ remove: true });
        var opts = {
            handles: true, hide: true, disable: true, zIndex: -1,
            onSelectStart: function (img, selection) {
                // To allow the select area to be viewable
                selectArea.css('z-index', 10000);
                $('#lasso_load').attr('src', '');
                $('#lasso_load').remove();
            },
            onSelectEnd: function (img, selection) {
                selectArea = $('.imgareaselect-selection').parent();
                if (lassoType === 'region') {
                    var region = pzr.getRegion(selection);
                    regionValues = region;
                    pzr.enablePan();
                    if (changeToCurrentPage) {
                        $('#get_region').find('.currentPage').prop('checked', true);
                        changeToCurrentPage = false;
                    }
                }
                else {
                    // commit selection for ocr/barcode, add loading gif
                    if ($viewSel.hasClass('selected')) {
                        $(selectArea).append($('<img />').attr('id', 'lasso_load').attr('src', Constants.Url_Base + 'Content/themes/default/throbber.gif'));
                        $viewport.imgAreaSelect({ disable: true, movable: false, resizable: false });
                        recognise();
                    }
                }
            },
            onSelectChange: function (img, selection) {
                // Hide text box
                selectArea = $('.imgareaselect-selection').parent();
                $('#lasso_results_cont').remove();
                $viewport.imgAreaSelect({ maxWidth: $viewSel.width(), maxHeight: $viewSel.height() });
                var selectTop = parseInt($(selectArea).css('top'), 10);
                var selectLeft = parseInt($(selectArea).css('left'), 10);
                var selectBot = parseInt($(selectArea).css('top'), 10) + $(selectArea).height();
                var selectRight = parseInt($(selectArea).css('left'), 10) + $(selectArea).width();
                var diffBot = selectBot - ($viewSel.offset().top + $viewSel.height());
                var diffRight = selectRight - ($viewSel.offset().left + $viewSel.width());
                if (selectTop < $viewSel.offset().top) {
                    $(selectArea).css('top', $viewSel.offset().top);
                }
                if (selectLeft < $viewSel.offset().left) {
                    $(selectArea).css('left', $viewSel.offset().left);
                }
                if (selectBot > $viewSel.offset().top + $viewSel.height()) {
                    $(selectArea).css('top', parseInt($(selectArea).css('top'), 10) - diffBot);
                }
                if (selectRight > $viewSel.offset().left + $viewSel.width()) {
                    $(selectArea).parent().css('left', parseInt($(selectArea).parent().css('left'), 10) - diffRight);
                }
                $('.imgareaselect-outer').hide();
            }
        };
        if (overrideOpts.enable && !overrideOpts.hide) {
            var selectionArea = pzr.getSelectionArea(regionValues);
            overrideOpts.x1 = selectionArea.x1;
            overrideOpts.y1 = selectionArea.y1;
            overrideOpts.x2 = selectionArea.x1 + selectionArea.width;
            overrideOpts.y2 = selectionArea.y1 + selectionArea.height;
        }
        $.extend(true, opts, overrideOpts);
        $viewport.imgAreaSelect(opts);

    };
    var lasso = function (lassoType) {
        setLassoType(lassoType);
        var $viewport = pzr.getViewPort();
        // Shut off dragging on mousedown   
        var $viewSel = pzr.getViewSelector();
        $viewSel.addClass('selected');
        pzr.disablePan();
        $viewport.imgAreaSelect({ enable: true });
    };
    var endLasso = function () {
        var areaSelect = $('.imgareaselect-selection').parent();
        if (areaSelect) {
            var $viewSel = pzr.getViewSelector();
            $viewSel.removeClass('selected');
            pzr.enablePan();
            initAreaSelect();
            $('#lasso_results_cont').remove();
            if (isocrShortcutOn) {
                ocrShortcutLasso();
            }
            if (isbarcodeShortcutOn) {
                barcodeShortcutLasso();
            }
            islassoOcrOn = false;
            islassobarcodeOn = false;
            return false;
        }
    };
    var recognise = function (callbacks, recogniseOptions) {
        recogniseOptions = recogniseOptions || {}; // recogniseOptions is an object, which may include barcodeType and/or enhancementOption properties, each of which is JSON
        callbacks = callbacks || {};
        var $viewport = pzr.getViewPort();
        var success = callbacks.success;
        var error = callbacks.error;
        var complete = callbacks.complete;
        var selection = recogniseOptions.selection || $viewport.data('imgAreaSelect').getSelection();
        var rect = {
            Width: selection.width,
            Height: selection.height,
            Left: selection.x1,
            Top: selection.y1
        };
        var newRect = pzr.screenToImageRect(rect);
        newRect = pzr.boundSelectionByImageRect(newRect);
        var bvwrPkg = pzr.getModel();
        var currPageNum = bvwrPkg.getCurrentPage();
        var versionId = bvwrPkg.versionId();
        var info = bvwrPkg.get('DocumentPackage').findPage(currPageNum);
        if (!info || !info.pdto) {
            endLasso();
            return;
        }
        var rotation = 0;
        var hash = window.location.hash;
        var recognitionOptions = {};
        if (lassoType === 'barcode') {
            //Add barcode type and image enhancement setting to barcode recognise package.
            var barcodeType = Utility.tryParseJSON((recogniseOptions.barcodeType || Utility.GetUserPreference('barcodeType')), true);
            if (barcodeType) {
                recognitionOptions[Constants.c.barcodeTypes] = barcodeType;
            }
            var enhancementOption = Utility.tryParseJSON((recogniseOptions.enhancementOption || Utility.GetUserPreference('enhancementOption')), true);
            if (enhancementOption) {
                recognitionOptions[Constants.c.enhancementOption] = enhancementOption;
            }
            // rotation is not needed for barcode
        }
        else { // OCR
            rotation = pzr.getCurrentPageRotation();
            var hw = pzr.getHeightWidth();
            newRect = pzr.rotateRect(newRect.Left, newRect.Top, newRect.Width, newRect.Height, rotation, hw.imgWidth, hw.imgHeight);
        }
        var recognitionOptionsJSON = JSON.stringify(recognitionOptions);
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        // Call to get data from OCR / Barcode
        $.ajax({
            url: Constants.Url_Base + "Recognition/GetRecognitionData",
            data: {
                versionId: versionId,
                pageId: info.pdto.get('Id'),
                x1: newRect.Left,
                y1: newRect.Top,
                width: newRect.Width,
                height: newRect.Height,
                lassoType: lassoType,
                recognitionOptions: recognitionOptionsJSON,
                rotation: rotation
            },
            type: "GET",
            success: function (result) {
                if (result.status === 'ok') {
                    $('#lasso_load').attr('src', '');
                    $('#lasso_load').remove();
                    $viewport.imgAreaSelect({ persistent: true, enable: true, movable: true, resizable: true });
                    var lassoresult = $.trim(result.result);
                    // OCR/Barcode output to an input or textarea
                    if (isLassoShortcut()) {
                        lassoShortcutSuccess(lassoresult);
                        setupLassoShortcut();
                    }
                    else {
                        Utility.executeCallback(success, result, function () {
                            // Add textarea to below the lasso keeping lasso open until an 'x' is clicked or escape is hit
                            setupLassoOutput();
                            $('#lasso_results_cont_lasso_results.lasso_results').val(lassoresult).focus().select();
                        });
                    }
                }
                else {
                    Utility.executeCallback(error, result.message, function () {
                        if (isLassoShortcut()) {
                            lassoShortcutFailure(result);
                            setupLassoShortcut();
                        }
                        else {
                            setupLassoOutput();
                            $('#lasso_results_cont_lasso_results.lasso_results').addClass('warningErrorClass');
                            $('#lasso_results_cont_lasso_results.lasso_results').val(result.message).focus();
                        }
                    });
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                Utility.executeCallback(error, errorThrown, function () {
                    var msg = String.format(Constants.c.generalErrorMessage, "\n\n" + errorThrown + "\n\n");
                    ErrorHandler.addErrors(msg);
                    that.endLasso();
                });
            },
            complete: function (result) {
                Utility.executeCallback(complete, result, function () {
                    // If user has changed pages, selection area gets removed
                    if (hash !== window.location.hash) {
                        that.endLasso();
                    }
                });
            }
        });
    };
    $('Body').off('setRecShortCutParameters').on('setRecShortCutParameters', setShortCutParameters);
    return {
        init: init,
        recognise: recognise,
        initAreaSelect: initAreaSelect,
        lasso: lasso,
        setLassoType: setLassoType,
        endLasso: endLasso,
        setIslassoOcrOn: function (isOn) { islassoOcrOn = isOn; },
        setIslassobarcodeOn: function (isOn) { islassobarcodeOn = isOn; },
        getRegionValues: function () { return regionValues; },
        setRegionValues: function (v) { regionValues = v; },
        displayPreviousSelection: displayPreviousSelection,
        hideAreaSelect: hideAreaSelect
    };
};