//The model passed here may be either a BulkViewerDataPackageCPX (Preview/ImageView) or a SimpleDocument (Capture)
PanZoomRotate = function ($viewSelector, model) {
    var scrolling = false;
    var scale = 1;
    var oldScale = 1;
    var imgWidth = 0;
    var imgHeight = 0;
    var eventHandles = {};
    var unselectMarkFunc;
    var mouseCoords = {
        ptX: 0,
        ptY: 0
    };
    var unselectMark = function () {
        if (unselectMarkFunc) {
            unselectMarkFunc();
        }
    };
    //Private Functions - May be exposed in return at end of function:
    var init = function (unselFunc) {
        unselectMarkFunc = unselFunc;
        var transformCont = getTransformCont();
        var viewport = getViewPort();
        // Enable dragging for container doing transformations on image        
        $(transformCont).draggable({
            cursor: 'move',
            axis: 'xy',
            start: function (event, ui) {
                $(viewport).imgAreaSelect({ remove: true }); // Remove ability to draw annotations / redactions before panning the transform container
                unselectMark();  // Deselect any annotations being edited before transform
            },
            stop: function (event, ui) {
                boundImageByScreen();   // Bound the panned image upon ending panning
            }
        });

        unbindEvents();
        $viewSelector.on('mousewheel', function (event, delta, deltaX, deltaY) {
            var mouseWheelBehavior = Utility.GetUserPreference('mouseWheelBehavior') || 'zoom';
            if (mouseWheelBehavior === 'scroll') {
                var option = { event: event, delta: delta };
                Utility.executeCallback(eventHandles.mouseWheelScroll, option);
            }
            else {
                // Don't allow Zoom on a form document - we are just using PanZoomRotate for placement
                delta = model && !model.get('inFormEdit') ? delta : 0;
                mouseWheelZoom(event, delta);
                return false;
            }

        });
        $viewSelector.on('click', '.anno', function (e) { Utility.executeCallback(eventHandles.selectMark, e); });
        $viewSelector.on('dblclick', '.anno', function (e) { Utility.executeCallback(eventHandles.editAnnotationsText, e); });
        $viewSelector.on('click', '.redaction', function (e) { Utility.executeCallback(eventHandles.selectMark, e); });
        $viewSelector.on('mousedown', '.img_container, .element_transition', function (e) { Utility.executeCallback(eventHandles.selectViewPort, e); });
    };
    var close = function () {
        unbindEvents();
        //Release all event handles passed in.
        var e;
        for (e in eventHandles) {
            if (eventHandles.hasOwnProperty(e)) {
                eventHandles[e] = undefined;
            }
        }
    };
    var unbindEvents = function () {
        $viewSelector.off('mousewheel');
        $viewSelector.off('click');
        $viewSelector.off('dblclick');
        $viewSelector.off('mousedown');
    };
    var fitWidth = function () {
        var rotation = getCurrentPageRotation();
        var viewport = getViewPort();
        var scale;
        if (rotation === 90 || rotation === 270) {
            scale = viewport.width() / imgHeight;
        }
        else {
            scale = viewport.width() / imgWidth;
        }
        setScale(scale);
        boundImageByScreen();
    };
    var fitHeight = function () {
        var rotation = getCurrentPageRotation();
        var viewport = getViewPort();
        var scale;
        if (rotation === 90 || rotation === 270) {
            scale = viewport.height() / imgWidth;
        }
        else {
            scale = viewport.height() / imgHeight;
        }
        setScale(scale);
        boundImageByScreen();
    };
    var fitImage = function () {
        setScale(0);
        boundImageByScreen();
    };
    var fitDefault = function () {
        var fit = getFitType();
        if (fit === 'width') {
            fitWidth();
        }
        else if (fit === 'height') {
            fitHeight();
        }
        else if (!isNaN(fit)) {
            zoomToPoint(parseFloat(fit));
        }
        else {
            fitImage();
        }
    };
    var disablePan = function () {
        var selector = getTransformCont();
        if (!selector.draggable('instance')) {
            return; // don't attempt to use draggable unless it exists
        }
        selector.draggable('disable');
        selector.removeClass('ui-state-disabled');
    };
    var enablePan = function (options) {
        var selector = getTransformCont();
        if (!selector.draggable('instance')) {
            return; // don't attempt to use draggable unless it exists
        }
        selector.draggable('enable');
        if (!options) {
            options = { cursor: 'move', axis: 'xy' };
        }
        $(selector).draggable(options);
        $(selector).draggable('enable');
    };
    var getRect = function (selector) {
        var Width = $(selector).width();
        var Height = $(selector).height();
        var offset = getOffset(selector);
        var rect = {
            Width: Width,
            Height: Height,
            Left: offset.Left,
            Top: offset.Top
        };
        return rect;
    };
    var getOffset = function (selector) {
        var Left, Top;
        if (!selector) {
            selector = getTransformCont();
        }
        Left = getElementPos(selector, 'left');
        Top = getElementPos(selector, 'top');
        return { Left: Left, Top: Top };
    };
    var setOffset = function (x, y, selector) {
        if (!selector) {
            selector = getTransformCont();
        }
        $(selector).css({
            'left': x,
            'top': y
        });
    };
    var getElementPos = function (selector, pos) {   // To get an elements position, (left, top, right, bottom) in any browser (chrome and IE will return 'auto' rather than a number if it is 'auto')
        return isNaN(parseFloat($(selector).css(pos), 10)) ? ($(selector).position() ? $(selector).position()[pos] : 0) : parseFloat($(selector).css(pos), 10);
    };
    var getTransformCont = function () {
        var transformCont = $viewSelector.find('.transformCont');
        return transformCont;
    };
    var getViewPort = function () {
        var selector = '.img_container';
        var viewport;
        if (model && model.get('inFormEdit')) {
            viewport = $viewSelector.find('#masterForm.js:first');
        }
        if (!viewport || !viewport.length) {
            viewport = $viewSelector.find(selector);
        }
        return viewport;
    };
    var getFitType = function () {
        // return type of fit the viewer is in
        var fit = $('body').data('fit');
        if (!fit) {
            fit = 'width';
        }
        return fit;
    };
    var highlightRegion = function (rect) {
        // rect: screen coordinates
        var transformCont = getTransformCont();
        $(transformCont).append($('<div></div>').addClass('zoomHighlight').css({
            top: rect.Top + 5,
            left: rect.Left + 5,
            width: rect.Width - 16,
            height: rect.Height - 16
        }));
    };
    var zoomToRegion = function (x, y, width, height, isLegacy) {
        // In isLegacy mode, operates as it did, scaling to physical imgWidth and using imagetoScreenRect
        // Otherwise, scales to visible width and then gets selection area
        unselectMark();
        var viewport = getViewPort();
        var rotation = getCurrentPageRotation();
        var isSideways = (rotation % 180) === 90;
        var horizontalScale;
        var verticalScale;
        // Un-normalize 
        var effectiveWidth = imgWidth; // legacy regions always scaled to physical width
        if (!isLegacy && isSideways) {
            // New Region Processing: scale to width-as-displayed, which is actually height if rotated
            effectiveWidth = imgHeight;
        }
        height *= effectiveWidth;
        width *= effectiveWidth;
        y *= effectiveWidth;
        x *= effectiveWidth;
        var rect = {
            Left: x,
            Top: y,
            Width: width,
            Height: height
        };
        if (isSideways) {
            horizontalScale = viewport.width() / height;
            verticalScale = viewport.height() / width;
        }
        else {
            horizontalScale = viewport.width() / width;
            verticalScale = viewport.height() / height;
        }
        var scale = Math.min(horizontalScale, verticalScale);
        setScale(scale);
        if (!isLegacy) {
            setOffset(-x * scale, -y * scale); // convert from image to screen coordinates
            rect = screenToImageRect({ Left: 0, Top: 0, Width: width * scale, Height: height * scale });
        }
        else {
            var newScreenRect = imageToScreenRect(rect);
            var point = getOffset();
            var left = point.Left - newScreenRect.Left;
            var top = point.Top - newScreenRect.Top;
            setOffset(left, top);
        }
        boundImageByScreen();
        highlightRegion(rect);
    };
    var zoomToPoint = function (newScale, x, y) {
        // x, y: screen point
        if (isNaN(parseFloat(newScale))) { // Don't allow zooming to a point if there is an invalid scale provided
            return;
        }
        var imgPoint, newScreenPoint;
        unselectMark();  // Deselect any annotations being edited before transform
        if (!x || !y) { // Absolute screen coordinates
            x = mouseCoords.ptX;
            y = mouseCoords.ptY;
        }
        imgPoint = screenToImage(x, y);
        setScale(newScale);
        newScreenPoint = imageToScreen(imgPoint.x, imgPoint.y);
        var point = getOffset();
        point.Left -= newScreenPoint.x - x;
        point.Top -= newScreenPoint.y - y;
        setOffset(point.Left, point.Top);
        boundImageByScreen();
    };
    var storeMouseCoords = function (x, y, selector) {
        if (!selector) {
            selector = getViewPort();
        }
        var offset = $(selector).offset();
        if (!offset) {
            offset = {
                left: 0,
                top: 0
            };
        }
        var pt = [x - offset.left, y - offset.top];
        mouseCoords = {
            ptX: pt[0],
            ptY: pt[1]
        };
    };
    var mouseWheelZoom = function (event, zoomDelta) {
        var currScale = scale;
        var zoomFactor = 1.2;
        if (!this.scrolling) {
            this.scrolling = true;
            // Get Mouse Location        
            storeMouseCoords(event.pageX, event.pageY);
            // Determine amount to zoom           
            var scaleFactor = Math.pow(zoomFactor, zoomDelta);
            if (scaleFactor !== 1) {
                currScale *= scaleFactor;
                if (currScale > 8) {
                    currScale = 8;
                }
                // Zoom into mouse location 
                zoomToPoint(currScale);
            }
            this.scrolling = false;
        }
    };
    var boundImageByScreen = function () { // Check and correct panning
        var maxWidth, maxHeight, leftBound, topBound, rightBound, bottomBound;
        var width, height, rect;
        var newLeft, newTop, oldLeft, oldTop, effRight, effBottom, offset;
        var transformCont = getTransformCont();
        var viewport = getViewPort();
        // Determine bounds to constrain the image within
        maxWidth = viewport.width();    // Determine width to be bound by (image)
        maxHeight = viewport.height();  // Determine height to be bound by (image)            
        leftBound = 0; // Determine left position to be bound by (image)
        topBound = 0; // Determine top position to be bound by (image), adding one due to border
        rightBound = leftBound + maxWidth; // Determine right position to be bound by (image)
        bottomBound = topBound + maxHeight;   // Determine bottom position to be bound by (image)

        // Obtain position and dimensions of transform container to be bound (image)
        rect = imageToScreenRect();
        width = rect.Width;
        height = rect.Height;

        // Constrain panning
        // Constrain by bottom and right first then by left and top
        // This way left and top will win out
        offset = getOffset();
        oldLeft = newLeft = offset.Left;
        oldTop = newTop = offset.Top;
        effRight = width + oldLeft;
        effBottom = height + oldTop;
        if (effRight < rightBound) {
            newLeft += rightBound - effRight;
        }
        if (effBottom < bottomBound) {
            newTop += bottomBound - effBottom;
        }
        if (newLeft > leftBound) {
            newLeft = leftBound;
        }
        if (newTop > topBound) {
            newTop = topBound;
        }
        $(transformCont).css({
            'left': newLeft.toFixed(0) + 'px',
            'top': newTop.toFixed(0) + 'px'
        });
        // if change occurs return true
        return newLeft !== oldLeft && newTop !== oldTop;
    };
    var setScale = function (newScale) {
        if (isNaN(parseFloat(newScale))) { // Don't set the scale if there is an invalid scale provided
            return;
        }
        var minVScale, minHScale, maxHeight, maxWidth;
        var viewport = getViewPort();
        var rotation = getCurrentPageRotation();
        maxWidth = viewport.width();    // Determine width to be bound by 
        maxHeight = viewport.height();  // Determine height to be bound by

        // Constrain zoom (include rotation)
        minVScale = maxHeight / imgHeight;
        minHScale = maxWidth / imgWidth;
        if (rotation === 90 || rotation === 270) {
            minVScale = maxHeight / imgWidth;
            minHScale = maxWidth / imgHeight;
        }
        if (newScale < minHScale && newScale < minVScale) {
            newScale = Math.min(minHScale, minVScale);
        }

        if (imgHeight < 50 && imgWidth < 50) { // Detect if image is icon size-ish and allow it to be that size
            newScale = 1;
        }
        oldScale = scale;
        scale = newScale;
        transformMatrix();
    };
    var imageToScreenRect = function (rect) {
        var x1, x2;
        var y1, y2;
        var point1, point2;
        var newRect;
        if (!rect) {
            x1 = 0;
            y1 = 0;
            x2 = imgWidth;
            y2 = imgHeight;
        }
        else {
            // Autosize stamps have no Width and Height, initialize to zero to avoid errors
            if (!rect.Width) {
                rect.Width = 0;
            }
            if (!rect.Height) {
                rect.Height = 0;
            }
            x1 = rect.Left;
            x2 = rect.Left + rect.Width;
            y1 = rect.Top;
            y2 = rect.Top + rect.Height;
        }
        point1 = imageToScreen(x1, y1);
        point2 = imageToScreen(x2, y2);
        newRect = {
            Left: Math.min(point1.x, point2.x),
            Top: Math.min(point1.y, point2.y),
            Width: Math.abs(point1.x - point2.x),
            Height: Math.abs(point1.y - point2.y)
        };
        return newRect;
    };
    var imageToScreen = function (x, y) {
        var transformCont = getTransformCont();
        var rotation = getCurrentPageRotation();

        var point = rotatePoint(x, y, rotation, imgWidth, imgHeight);
        // Scaling
        point.x *= scale;
        point.y *= scale;
        // Panning offset  
        var left = getElementPos(transformCont, 'left');
        var top = getElementPos(transformCont, 'top');
        point.x += left;
        point.y += top;
        return point;
    };
    var screenToImageRect = function (rect) {
        var x1, x2;
        var y1, y2;
        var point1, point2;
        var newRect;
        x1 = rect.Left;
        x2 = rect.Left + rect.Width;
        y1 = rect.Top;
        y2 = rect.Top + rect.Height;
        point1 = screenToImage(x1, y1);
        point2 = screenToImage(x2, y2);
        newRect = {
            Left: Math.min(point1.x, point2.x),
            Top: Math.min(point1.y, point2.y),
            Width: Math.abs(point1.x - point2.x),
            Height: Math.abs(point1.y - point2.y)
        };
        return newRect;
    };
    var screenToImage = function (x, y) {
        var transformCont = getTransformCont();
        var rotation = getCurrentPageRotation();
        // Panning offset
        var left = getElementPos(transformCont, 'left');
        var top = getElementPos(transformCont, 'top');
        x -= left;
        y -= top;
        // Scaling
        x /= scale;
        y /= scale;
        var point = counterRotatePoint(x, y, rotation, imgWidth, imgHeight);
        return point;
    };
    // takes a point, which is based on unrotated image coordinates, and converts it to a point on the rotated (as viewed) image
    var rotatePoint = function (x, y, rotation, width, height) {
        var tmp;
        switch (rotation) {
            case 90:    // Exchange width and height
            case -270:
                tmp = y;
                y = x;
                x = height - tmp;
                break;
            case 180:   // Width and height stay the same                
            case -180:
                x = width - x;
                y = height - y;
                break;
            case 270:   // Exchange width and height
            case -90:
                tmp = y;
                y = width - x;
                x = tmp;
                break;
        }
        return { x: x, y: y };
    };
    // takes a rect, which is based on the unrotated image, and converts it to a rect on the rotated image
    var rotateRect = function (x, y, width, height, rotation, iWidth, iHeight) {
        point1 = rotatePoint(x, y, rotation, iWidth, iHeight);
        point2 = rotatePoint(x + width, y + height, rotation, iWidth, iHeight);
        newRect = {
            Left: Math.min(point1.x, point2.x),
            Top: Math.min(point1.y, point2.y),
            Width: Math.abs(point1.x - point2.x),
            Height: Math.abs(point1.y - point2.y)
        };
        return newRect;
    };
    // takes a point, which is based on rotated (as viewed) image coordinates, and converts it to a point on the unrotated image
    var counterRotatePoint = function (x, y, rotation, width, height) {
        var tmp;
        switch ((360 - rotation) % 360) {
            case 90:    // Exchange width and height
                tmp = y;
                y = x;
                x = width - tmp;
                break;
            case 180:   // Width and height stay the same                
                x = width - x;
                y = height - y;
                break;
            case 270:   // Exchange width and height
                tmp = y;
                y = height - x;
                x = tmp;
                break;
        }
        return { x: x, y: y };
    };
    // takes a rect, which is based on the rotated image, and converts it to a rect on the unrotated image
    var counterRotateRect = function (x, y, width, height, rotation, iWidth, iHeight) {
        if (rotation % 180 === 90) { // mark's height and width are swapped if it is rotated 90 or 270
            var temp = width;
            width = height;
            height = temp;
        }
        point1 = counterRotatePoint(x, y, rotation, iWidth, iHeight);
        point2 = counterRotatePoint(x + width, y + height, rotation, iWidth, iHeight);
        newRect = {
            Left: Math.min(point1.x, point2.x),
            Top: Math.min(point1.y, point2.y),
            Width: Math.abs(point1.x - point2.x),
            Height: Math.abs(point1.y - point2.y)
        };
        return newRect;
    };
    var transformMatrix = function () {
        // get parameters
        var o = getTransformCont();
        if (o.length > 0) {
            o = o[0];
            getCurrentPageRotation();
            var currRot = getCurrentPageRotation();
            var rotDegrees = (360.0 + currRot) % 360;  // degrees (clockwise)
            var w = $(o).width();
            var h = $(o).height();
            // the "sine" and "cosine" could be set w/o trig using a switch statement for simple 0, 90, 180, 270 support
            // but the FPU looks these things super fast
            var rotation = -rotDegrees * Math.PI / 180.0; // radians (counter-clockwise)
            var cosine = Math.cos(rotation);
            var sine = Math.sin(rotation);
            // strategy:
            //
            //  Affine transformation is performed using matrix arithmetic.
            //  Each matrix is 3x3.  The 2x2 matrix in its top, left defines scale and rotation.
            //  Two additional elements (an "augmenting vector") define translation (x,y).  The last column is filled in
            //  with 0, 0, 1.  Thus:
            //      m11 m21 0 
            //      m12 m22 0
            //      x   y   1
            //
            //  we apply a matrix transform using the product of three such matrices:
            //      T1 x M x T2
            //  T1 and T2 translate the origin to the center and then back, respectively.
            //  M performs rotation and scaling (around the center)
            //  Thus, with the translation, the effective rotation is around the top, left corner.
            //
            // M is computed below.
            //
            // T1 and T2 are both "identity matrices" (ones across the primary diagonal; 0's everywhere else) except for
            // their augmenting (translation) vectors.
            // T1's translation vector is w/2 h/2 0; T2's is -w/2 -h/2 0.  (w and h are width and height, respectively.)
            //
            // references:
            //      http://help.dottoro.com/lcebdggm.php
            //      http://en.wikipedia.org/wiki/Transformation_matrix (note this one shows the matrix sideways, vs. the other)
            // Compute the heart of the M matrix.  (The last row is just 0, 0, 1.)
            var m11 = cosine * scale;
            var m21 = -sine * scale;
            var m12 = -m21;
            var m22 = m11;
            // The product of T1 and M is equal to M, except for its augmenting vector (x, y).  
            // This is the translation of the T1 x M.
            var x1 = w / 2.0 * m11 + h / 2.0 * m12;
            var y1 = w / 2.0 * m21 + h / 2.0 * m22;
            // Likewise, the final product is equal to M, except for x, y.
            // This applies the final translation (T2) to the prior result.
            var x2 = x1 - w / 2.0;
            var y2 = y1 - h / 2.0;
            var x3;
            var y3;
            // Done?  Almost.  We've completed rotation and scale about the origin, but this will rotate the image to the left 
            // and above our viewport.  One final translation is added to bring it back into view.
            // (This one is implemented only for multiples of 90; I tried to do this with trig. but I gave up.  I determined that it
            // requires projecting three corners (all except the top, left) of the image through the transform to determine the 
            // topmost and leftmost point.  Ugh.
            if (rotDegrees === 90) {
                x3 = x2 + h * scale;
                y3 = y2;
            }
            else if (rotDegrees === 180) {
                x3 = x2 + w * scale;
                y3 = y2 + h * scale;
            }
            else if (rotDegrees === 270) {
                x3 = x2;
                y3 = y2 + w * scale;
            }
            else {
                x3 = x2;
                y3 = y2;
            }
            // Create and apply the transform style. (Browse-dependent)                        
            // Detect if browser is IE8, than apply the filter that ONLY works in IE8
            if (!BrowserDetect.browser) {
                BrowserDetect.init();
            }
            if (BrowserDetect.browser.match(/Explorer/ig) && BrowserDetect.version === 8) {
                // Internet Explorer
                // IE rotates about the top, left, so the three matrix multiple performed above is not necessary- HA HA!
                // Ignore those results and just apply IE translation to move a rotated image back into our viewport.
                var ieX = 0, ieY = 0;
                if (rotDegrees === 90) {
                    ieX = h * scale;
                }
                else if (rotDegrees === 180) {
                    ieX = w * scale;
                    ieY = h * scale;
                }
                else if (rotDegrees === 270) {
                    ieY = w * scale;
                }
                var msprops = "sizingMethod='auto expand', M11=" + m11.toFixed(4) + ",M21=" + m21.toFixed(4) + ",M12=" + m12.toFixed(4) + ",M22=" + m22.toFixed(4)
                    + ",Dx=" + ieX.toFixed(4) + ",Dy=" + ieY.toFixed(4);
                o.style.filter = "progid:DXImageTransform.Microsoft.Matrix(" + msprops + ")";
                //  Note: will not apply filter to positioned elements below it (possible fix: filter: inherit on parent container and on each positioned element, i.e. annotations / redactions)
                $(o).find('img[name="image_full"]').css('position', 'static');
            }
            else {
                var xform = matrixTransformBrowser(m11, m21, m12, m22, x3, y3);
                o.style.webkitTransform = xform;    // Chrome and Safari
                o.style.MozTransform = xform;   // Firefox
                o.style.msTransform = xform;    // IE9
            }
        }
    };
    var boundSelectionByImageRect = function (rect) {
        // Bound the rectangle passed in to the dimensions of the image
        var left, top, right, bottom, width, height;
        var maxLeft, maxTop, maxRight, maxBottom;
        // Rectangle to be bound (in image coordinates)
        width = rect.Width;
        height = rect.Height;
        left = rect.Left;
        top = rect.Top;
        right = left + width;
        bottom = top + height;
        // Bounding Rectangle representing image dimensions
        maxLeft = 0;
        maxTop = 0;
        maxRight = imgWidth;
        maxBottom = imgHeight;

        if (left < maxLeft) {
            left = maxLeft;
            width = maxRight;
        }
        if (top < maxTop) {
            top = maxTop;
            height = maxBottom;
        }
        if (right > maxRight) {
            width = maxRight - left;
        }
        if (bottom > maxBottom) {
            height = maxBottom - top;
        }
        var newRect = {
            Width: width,
            Height: height,
            Left: left,
            Top: top
        };
        return newRect;
    };
    var matrixTransformBrowser = function (m11, m21, m12, m22, x, y) {
        return "matrix(" + m11.toFixed(4) + "," + m21.toFixed(4) + "," + m12.toFixed(4) + "," + m22.toFixed(4) + "," + x.toFixed(4) + "," + y.toFixed(4) + ")";
    };
    var getCurrentPageRotation = function () {
        return model.getCurrentPageRotation();
    };
    // These methods translates regions on image, as stored in workflow tasks, to screen selection areas and vice versa.
    // Note that there are legacy workflow regions, which predate these methods and do not use them
    var getRegion = function (selectionArea) {
        var panOffset = getOffset(); // screen offset
        var iWidth;       // image width (as viewed)
        if ((getCurrentPageRotation() % 180) === 90) {
            iWidth = imgHeight;
        }
        else {
            iWidth = imgWidth;
        }
        var rect = {    // Get selection, accounting for offset, and scaled to width
            Width: (selectionArea.width / scale) / iWidth,
            Height: (selectionArea.height / scale) / iWidth,
            Left: (selectionArea.x1 - panOffset.Left) / scale / iWidth,
            Top: (selectionArea.y1 - panOffset.Top) / scale / iWidth
        };
        return rect;
    };
    var getSelectionArea = function (region) {
        var panOffset = getOffset(); // screen offset
        var iWidth;       // image width (as viewed)
        if ((getCurrentPageRotation() % 180) === 90) {
            iWidth = imgHeight;
        }
        else {
            iWidth = imgWidth;
        }
        var rect = {    // Get selection, accounting for offset, and scaled to width
            width: region.Width * iWidth * scale,
            height: region.Height * iWidth * scale,
            x1: region.Left * iWidth * scale + panOffset.Left,
            y1: region.Top * iWidth * scale + panOffset.Top
        };
        return rect;
    };
    //Public Methods
    return {
        setHeightWidth: function (h, w) { imgHeight = h; imgWidth = w; },
        getHeightWidth: function () { return { imgHeight: imgHeight, imgWidth: imgWidth }; },
        getViewSelector: function () { return $viewSelector; },
        getModel: function () { return model; },
        getEventHandles: function () { return eventHandles; },
        init: init,
        close: close,
        fitWidth: fitWidth,
        fitHeight: fitHeight,
        fitImage: fitImage,
        fitDefault: fitDefault,
        setScale: setScale,
        getTransformCont: getTransformCont,
        getViewPort: getViewPort,
        getRegion: getRegion,
        getSelectionArea: getSelectionArea,
        enablePan: enablePan,
        disablePan: disablePan,
        zoomToPoint: zoomToPoint,
        screenToImageRect: screenToImageRect,
        rotateRect: rotateRect,
        rotatePoint: rotatePoint,
        counterRotateRect: counterRotateRect,
        counterRotatePoint: counterRotatePoint,
        boundSelectionByImageRect: boundSelectionByImageRect,
        getCurrentPageRotation: getCurrentPageRotation,
        imageToScreenRect: imageToScreenRect,
        getRect: getRect,
        screenToImage: screenToImage,
        zoomToRegion: zoomToRegion
    };
};