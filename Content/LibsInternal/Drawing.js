Drawing = function (pzr, model) {
    //#region Private
    var currentlyDrawing = false; // currently drawing or not
    var unselectMark = false;
    var sizeRegionToParent = function ($elem) {
        var rotation = pzr.getCurrentPageRotation();
        var parent = $elem.parent();
        var parentWidth = parent.width();
        var parentHeight = parent.height();
        var width = parentWidth;
        var height = parentHeight;
        switch (rotation) { // orient height and width according to parents height and width, taking into account rotation
            // Do nothing for a rotation of 0 and 180 (already has the correct height and width set for elem
            case 90: // swap height and width of elem to its parent's
                width = parentHeight;
                height = parentWidth;
                break;
            case 270: // swap height and width of elem to parent's
                width = parentHeight;
                height = parentWidth;
                break;
        }
        $elem.width(width);
        $elem.height(height);
    };
    var repositionRect = function ($elem, resize, mark) {
        var newRect = {}; // screen coordinates
        if (resize) {
            newRect.Width = $elem.width();
            newRect.Height = $elem.height();
        }
        else {
            var rectInScreen = pzr.imageToScreenRect(mark.get('Rectangle'));
            newRect.Width = rectInScreen.Width;
            newRect.Height = rectInScreen.Height;
        }
        newRect.Top = parseInt($elem.css('top'), 10);
        newRect.Left = parseInt($elem.css('left'), 10);
        return newRect;
    };
    var repositionElem = function ($elem, newRect, resize) {
        if (resize) {
            $elem.width(newRect.Width);
            $elem.height(newRect.Height);
        }
        $elem.css('top', newRect.Top);
        $elem.css('left', newRect.Left);
    };
    //#endregion Private
    //#region Public
    var clipRectToViewport = function (rect) {
        var imgRect = pzr.imageToScreenRect();
        unselectMark = false;
        // Bounds Check left
        var overSpill = rect.Left;
        if (overSpill < 0) {
            rect.Left -= overSpill;
            rect.Width += overSpill;
            unselectMark = true;
        }
        // Bounds Checking Top
        overSpill = rect.Top;
        if (overSpill < 0) {
            rect.Top -= overSpill;
            rect.Height += overSpill;
            unselectMark = true;
        }
        // Bounds Checking Right
        overSpill = rect.Left + rect.Width - imgRect.Width;
        if (overSpill > 0) {
            rect.Width -= overSpill;
            unselectMark = true;
        }
        // Bounds check Bottom
        overSpill = rect.Top + rect.Height - imgRect.Height;
        if (overSpill > 0) {
            rect.Height -= overSpill;
            unselectMark = true;
        }
    };
    var clipLineToViewport = function (pos) { // pos is an object containing the x & y coordinates (screen) of two points, A & B
        var imgRect = pzr.imageToScreenRect();
        unselectMark = false;
        var slope, invSlope;
        // bounds check point A
        if (pos.Ax !== pos.Bx) {
            // if x has changed, then we must bounds check x. 
            slope = (pos.Ay - pos.By) / (pos.Ax - pos.Bx); // the prior "if" prevents division by zero error
            if (pos.Ax < 0) {
                // we crossed left edge, so stop at point at which we intersect it
                pos.Ay = pos.Ay - slope * pos.Ax;
                pos.Ax = 0;
                unselectMark = true;
            }
            if (pos.Ax > imgRect.Width) {
                // right edge
                pos.Ay = pos.Ay + slope * (imgRect.Width - pos.Ax);
                pos.Ax = imgRect.Width;
                unselectMark = true;
            }
        }
        if (pos.Ay !== pos.By) {
            // if y has changed, then we must bounds check y
            invSlope = (pos.Ax - pos.Bx) / (pos.Ay - pos.By); // tthe prior "if" prevents division by zero error as long as we calculate inverse slope here
            if (pos.Ay < 0) {
                // we crossed top edge, so stop at point at which we intersect it
                pos.Ax = pos.Ax - invSlope * pos.Ay;
                pos.Ay = 0;
                unselectMark = true;
            }
            if (pos.Ay > imgRect.Height) {
                // bottom edge
                pos.Ax = pos.Ax + invSlope * (imgRect.Height - pos.Ay);
                pos.Ay = imgRect.Height;
                unselectMark = true;
            }
        }
        // Bounds check point B
        if (pos.Ax !== pos.Bx) {
            // if x has changed, then we must bounds check x. 
            slope = (pos.Ay - pos.By) / (pos.Ax - pos.Bx); // the prior "if" prevents division by zero error
            if (pos.Bx < 0) {
                // we crossed left edge, so stop at point at which we intersect it
                pos.By = pos.Ay - slope * pos.Ax;
                pos.Bx = 0;
                unselectMark = true;
            }
            if (pos.Bx > imgRect.Width) {
                // right edge
                pos.By = pos.Ay + slope * (imgRect.Width - pos.Ax);
                pos.Bx = imgRect.Width;
                unselectMark = true;
            }
        }
        if (pos.Ay !== pos.By) {
            // if y has changed, then we must bounds check y
            invSlope = (pos.Ax - pos.Bx) / (pos.Ay - pos.By); // tthe prior "if" prevents division by zero error as long as we calculate inverse slope here
            if (pos.By < 0) {
                // we crossed top edge, so stop at point at which we intersect it
                pos.Bx = pos.Ax - invSlope * pos.Ay;
                pos.By = 0;
                unselectMark = true;
            }
            if (pos.By > imgRect.Height) {
                // bottom edge
                pos.Bx = pos.Ax + invSlope * (imgRect.Height - pos.Ay);
                pos.By = imgRect.Height;
                unselectMark = true;
            }
        }
    };
    var startDrawingRegion = function (drawingOptions) {
        drawingOptions = drawingOptions || {};
        var $viewport = pzr.getViewPort();
        $viewport.imgAreaSelect({ remove: true });
        $viewport.imgAreaSelect({
            handles: true,
            hide: true,
            disable: true,
            instance: true,
            onSelectStart: function (img, selection) {
                if (drawingOptions.onSelectStart) {
                    drawingOptions.onSelectStart(img, selection);
                }
            },
            onSelectEnd: function (img, selection) {
                if (drawingOptions.onSelectEnd) {
                    drawingOptions.onSelectEnd(img, selection);
                }
            },
            onSelectChange: function (img, selection) {
                if (drawingOptions.onSelectChange) {
                    drawingOptions.onSelectChange(img, selection);
                }
            }
        });
        $viewport.addClass('selected');
        pzr.disablePan(); // Shut off dragging on mousedown
        if (!currentlyDrawing) { // Enable drawing regions using imgAreaSelect
            $viewport.imgAreaSelect({ enable: true, show: true });
            $('.imgareaselect-outer').hide();
            setCurrentlyDrawing(true);
        }
    };
    var getCurrentlyDrawing = function () {
        return currentlyDrawing;
    };
    var setCurrentlyDrawing = function (isCurrentlyDrawing) {
        currentlyDrawing = isCurrentlyDrawing;
    };
    var stopDrawing = function () {
        var $viewport = pzr.getViewPort();
        $viewport.removeClass('selected');
        pzr.enablePan();
        if (pzr.linePaper) { // Remove the line upon ending drawing (also for when dragging / resizing)
            pzr.linePaper.remove();
            delete pzr.linePaper;
        }
        $viewport.imgAreaSelect({ remove: true });
    };
    var setupReposition = function ($target, resizeOptions, dragOptions) {

        // Setup resizing
        var defaultResizeOptions = {
            handles: "n, e, s, w, ne, se, sw, nw",
            aspectRatio: false,
            start: function (event, ui) {
                stopDrawing(); // Prevent drawing regions while resizing
            },
            resize: function (event, ui) {
                sizeRegionToParent($(ui.element).find('img, .redaction, .region'));
            }
        };
        resizeOptions = $.extend(true, defaultResizeOptions, resizeOptions);
        if (!resizeOptions.disabled) {
            $target.resizable(resizeOptions);
            $target.addClass('regionResize');
            //$target.find('.ui-resizable-handle.ui-resizable-ne, .ui-resizable-handle.ui-resizable-se, .ui-resizable-handle.ui-resizable-nw, .ui-resizable-handle.ui-resizable-sw').css('z-index', 100);
            $target.find('.ui-resizable-handle.ui-resizable-se').removeClass('ui-icon-gripsmall-diagonal-se');
        }

        // Setup Drag and Drop
        var defaultDragOptions = {   // Apply draggable to the selectedAnno or redaction
            start: function (event, ui) {
                stopDrawing(); // Prevent drawing annotations while dragging
            },
            cancel: '.custom_button'
        };
        dragOptions = $.extend(true, defaultDragOptions, dragOptions);
        $target.draggable(dragOptions);

        $target.css('overflow', 'visible');
    };
    var repositionMark = function (selected, resize, markModel, options) {
        options = options || {};
        // selected: selectedAnno or true redaction  

        var points = {}; // screen coordinates
        var newRect = repositionRect(selected, resize, markModel); // screen coordinates
        // performing clipping based on rectangle or on line
        var markPoints = markModel.get('Points');
        if (markPoints) {
            points.Ax = newRect.Left;
            points.Ay = newRect.Top;
            points.Bx = newRect.Width + newRect.Left;
            points.By = newRect.Height + newRect.Top;
            clipLineToViewport(points);
            newRect.Left = Math.min(points.Ax, points.Bx);
            newRect.Top = Math.min(points.Ay, points.By);
            newRect.Width = Math.abs(points.Ax - points.Bx);
            newRect.Height = Math.abs(points.Ay - points.By);
        }
        else {
            clipRectToViewport(newRect);
        }
        repositionElem(selected, newRect, resize);
        var imageRect = pzr.screenToImageRect(newRect);   // screen coords of image, which gives us right and bottom clipping points     
        markModel.set('Rectangle', imageRect, { ignoreChange: options.skipSetDirty });
        // update Points, if this is a Points-based mark
        if (markPoints) {
            // Have points maintain the correct starting and ending points (based on marks starting / ending point data)
            // TODO: Possibly create a Utility function for handling getting correct starting and ending points from Rect; do we do this elsewhere?
            if (markPoints[0].X < markPoints[1].X) {
                markPoints[0].X = imageRect.Left;
                markPoints[1].X = imageRect.Left + imageRect.Width;
            }
            else {
                markPoints[0].X = imageRect.Left + imageRect.Width;
                markPoints[1].X = imageRect.Left;
            }
            if (markPoints[0].Y < markPoints[1].Y) {
                markPoints[0].Y = imageRect.Top;
                markPoints[1].Y = imageRect.Top + imageRect.Height;
            }
            else {
                markPoints[0].Y = imageRect.Top + imageRect.Height;
                markPoints[1].Y = imageRect.Top;
            }
        }
        if (!options.skipSetDirty) {
            markModel.set('isDirty', true);
        }
        return markModel;
    };
    var createRegion = function (regionProperties) {
        var rect = regionProperties.Rectangle;  // Object - Width, Height, Top, and Left
        var color = regionProperties.Color; // Hex code
        var opacity = regionProperties.Opacity || 0; // From 0 to 1, 1 is opaque, 0 is invisible;
        var $region = $(document.createElement('div'));
        $region.css({
            'background': color,
            'opacity': opacity,
            'top': rect.Top,
            'left': rect.Left,
            'width': rect.Width,
            'height': rect.Height
        });
        $region.data('color', color.split('#')[1]);
        return $region;
    };
    // Translate region to screen coordinates and allow it to be resized/dragged, by making a new "region" in an edit container
    var regionToScreen = function ($region, regionData) {
        var $editRegionContainer = regionData.editRegionContainer;
        var $newlySelectedRegion = $(document.createElement('div'));
        $newlySelectedRegion.addClass(regionData.classList);
        var $screenRegion = $region.clone();
        var imageCoords = pzr.getRect($region);
        var screenCoords = pzr.imageToScreenRect(imageCoords);
        var rotation = regionData.rotation === undefined ? pzr.getCurrentPageRotation() : regionData.rotation;
        var width = screenCoords.Width;
        var height = screenCoords.Height;
        switch (rotation) {
            case 90:
                $screenRegion.addClass('rotate90');
                height = screenCoords.Width;
                width = screenCoords.Height;
                break;
            case 180:
                $screenRegion.addClass('rotate180');
                break;
            case 270:
                $screenRegion.addClass('rotate270');
                height = screenCoords.Width;
                width = screenCoords.Height;
                break;
            default:
        }
        if (regionData.idKV) {
            var idKey = Object.keys(regionData.idKV)[0];
            // set region/mark id
            $newlySelectedRegion.attr(idKey, regionData.idKV[idKey]);
        }
        // the container will have the dimensions and position needed rather than the image
        $newlySelectedRegion.width(screenCoords.Width).height(screenCoords.Height);
        $newlySelectedRegion.css({
            'left': screenCoords.Left,
            'top': screenCoords.Top
        });
        $screenRegion.css({
            'width': width,
            'height': height,
            'top': 'auto',
            'left': 'auto'
        });
        $region.hide();    //Note: Create possible ghosted image (idea/innovation)
        $newlySelectedRegion.append($screenRegion);
        $editRegionContainer.append($newlySelectedRegion);
        $newlySelectedRegion.show();
        return $newlySelectedRegion;
    };
    // Remove the region that was added to the edit container, and show the corresponding region that is in image coordinates
    var screenToRegion = function ($screenRegion, idKey) {
        if ($screenRegion && $screenRegion.length > 0) {
            var value = $screenRegion.attr(idKey);
            var $region = pzr.getViewPort().find('[' + idKey + '="' + value + '"]');
            $screenRegion.remove();
            $region.show();
        }
    };
    //#endregion Public
    return {
        clipRectToViewport: clipRectToViewport,
        clipLineToViewport: clipLineToViewport,
        startDrawingRegion: startDrawingRegion,
        getCurrentlyDrawing: getCurrentlyDrawing,
        setCurrentlyDrawing: setCurrentlyDrawing,
        stopDrawing: stopDrawing,
        setupReposition: setupReposition,
        repositionMark: repositionMark,
        createRegion: createRegion,
        regionToScreen: regionToScreen,
        screenToRegion: screenToRegion
    };
};