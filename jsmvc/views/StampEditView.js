/// <reference path="../../Content/LibsInternal/Utility.js" />
var StampEditView = Backbone.View.extend({
    className: 'StampEditView',
    collection: undefined,
    marks: undefined,
    gridView: undefined,
    gvOptions: undefined,
    isFirst: true, // Used to prevent grid loading more than once on initial load
    dirty: false,
    events: {
        "focus input[name='Name']": "focusName",
        "click input[name='Type']": "setType",
        "click input[name='save_stamp']": "saveChanges",
        "click input[name='delete_stamp']": "kill",
        "click #textStampDTO div.toggle_btn": "toggleButton",
        "click input[name='seeFormat']": "formatPreview",
        "click #textStampDTO": "jPickerOpened",
        "change input[name='Name']": "setDirty",
        "keyup input[name='Name']": "setDirty",
        "keyup textarea[name='Description']": "setDirty",
        "change textarea[name='Description']": "setDirty",
        "change select[name='FontType']": "setDirty",
        "change select[name='FontSize']": "setDirty"
    },
    initialize: function () {
        this.compiledTemplate = doT.template(Templates.get('editstamplayout'));
        this.gvOptions = { renderObject: { headers: [{ value: Constants.c.name }, { value: Constants.c.stampType, style: 'width:80px;' }], rows: [] } };
        this.marks = new Marks();
        return this;
    },
    render: function () {
        var that = this;
        this.buildCollection();
        $(this.el).html(this.compiledTemplate({}));
        if (this.gridView) {
            this.gridView.close();
            this.gridView = undefined;
        }
        this.gvOptions.onRowSelect = function (o) { that.onRowSelect(o); };
        this.gridView = new StaticDataGridView(this.gvOptions);
        this.$el.find('.gridContainer').html(this.gridView.render().$el);
        this.setupTextProps();
        this.onRowSelect({ rowId: Constants.c.emptyGuid });
        this.delegateEvents(this.events);
        return this;
    },
    buildCollection: function () {
        var newItem = new TextStamp({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle, MarkXML: '', 'first': true });
        this.collection = new TextStamps();
        this.collection.add(newItem);
        var m;
        var i = 0;
        var length = window.txtStamps.length;
        for (i; i < length; i++) {
            m = window.txtStamps.at(i);
            m.set('Type', 'text');
            this.collection.add(m);
        }
        i = 0;
        length = window.imgStamps.length;
        for (i; i < length; i++) {
            m = window.imgStamps.at(i);
            m.set('Type', 'image');
            this.collection.add(m);
        }
    },
    focusName: function () {
        var model = this.collection.getSelected()[0];
        if (model.get('Id') === Constants.c.emptyGuid && this.$("input[name='Name']").val() === Constants.c.newTitle) {
            this.$("input[name='Name']").val("");
        }
    },
    setType: function (e) {
        var target = $(e.currentTarget);
        var type = target.attr('class');
        this.clearDirty();
        this.showSelection(type);
        target.parent().val(target.attr('class'));
    },
    loadGrid: function () {
        var rows = [];
        this.gvOptions.renderObject.rows = rows;
        var i = 0;
        var length = this.collection.length;
        for (i; i < length; i++) {
            var m = this.collection.at(i);
            var type = '';
            if (m.get('Type')) {
                type = m.get('Type') === 'image' ? Constants.c.image : Constants.c.text;
            }
            var row = {
                rowClass: m.isSelected() ? 'customGridHighlight' : '',
                id: m.get('Id'),
                values: [Utility.safeHtmlString(m.get('Name')), type]
            };
            rows.push(row);
        }
        this.gridView.render();
        this.enableButtons();
    },
    onRowSelect: function (options) {
        this.collection.setSelected([options.rowId]);
        this.loadGrid();
        var id = options.rowId;
        if (this.prevSelectedStampId === id) {
            return;
        }
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        ErrorHandler.removeErrorTagsIframe('#imageStampDTOForm', css.warningErrorClass, css.inputErrorClass);
        // Need to also removeErrorTags from iframe
        var m = this.collection.getSelected()[0];
        var type = m.get('Type');
        
        $('#stampDTO .stampType').hide();
        $('input[name="delete_stamp"]').attr('disabled', false);
        if (id === Constants.c.emptyGuid) {
            // If the selected stamp is a -- New -- stamp
            // show selector for image/text stamp
            $('input[name="delete_stamp"]').attr('disabled', true);
            $('#stampDTO .stampType').show();
            this.showSelection($('input[name="Type"]:checked').attr('class'));
            // Hide image / text stamp previews when creating a new stamp
            var mark = {
                TextColor: 0,
                FontSize: 9,
                FontStyle: 0,
                FontName: $('#textStampDTO select[name="FontType"] option:first').text()
            };
            this.setTextPropsFromMarkData(mark);

            $('#imageStampDTO .imageStampPreview').hide();
            $('#textStampDTO .textStampPreview').hide();
        }
        else {
            this.showSelection(type);
        }
        this.gridView.lastClick = { rowId: id, ms: new Date().getTime() };
        this.prevSelectedStampId = id;
        this.clearDirty();
    },
    showSelection: function (type) {
        var that = this;
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);

        var m = this.collection.getSelected()[0];
        var isNotNew = m.get('Id') !== Constants.c.emptyGuid;
        // Set name of selection
        var textStamp = $('#textStampDTO');
        var imageStamp = $('#imageStampDTO');
        var img, imgCont, mark;
        // Show selection
        if (type.match(/text/ig)) {
            textStamp.find('input[name="Name"]').val(m.get('Name'));
            textStamp.find('textarea').val(m.get('Description'));
            if (isNotNew) {
                textStamp.find('.textStampPreview').show();
            }
            imgCont = textStamp.find('.textStampCont');
            img = imgCont.find('img');
            // Get text stamp image
            var markXML = decodeURIComponent(m.get('MarkXML'));
            if (markXML !== undefined && markXML !== "") {
                mark = this.getMark(Constants.mt.Text, markXML);
                if (mark) {
                    this.setTextPropsFromMarkData(mark.attributes);
                    $(imgCont).empty();
                    mark.set('Text', Utility.replaceTextStampText(mark.get('Text')), { silent: true });
                    this.getAnnotationPng(mark, $(imgCont));
                }
            }
            $('#imageStampDTO').hide();
            $('#textStampDTO').show();
        }
        else if (type.match(/image/ig)) {
            var frmContents = $('#imageStampDTOForm').contents();
            if (isNotNew) {
                frmContents.find('#fid').parent().hide();
            }
            else {
                frmContents.find('#fid').parent().show();
            }
            //reset error and value 
            frmContents.find('.' + css.warningErrorClass).remove();
            frmContents.find('.' + css.inputErrorClass).removeClass(css.inputErrorClass);
            frmContents.find('.fileType').css('color', '');
            frmContents.find('#fid').val('');
            frmContents.find('input[name="Name"]').off('change').on('change', function () { that.setDirty(); });
            frmContents.find('input[name="Name"]').off('keyup').on('keyup', function () { that.setDirty(); });
            frmContents.find('input[name="Name"]').val(m.get('Name'));
            var imgPrev = imageStamp.find('.imageStampPreview');
            imgPrev.hide();
            imgCont = imgPrev.find('.imageStampCont');
            img = imgCont.find('img');
            if (m.get('Id') !== Constants.c.emptyGuid) {
                mark = this.getMark(Constants.mt.ImageStamp);
                mark.set({
                    Id: m.get('Id'),
                    ImageStampId: m.get('Id'),
                    Rectangle: {}
                });
                $(imgCont).empty();
                this.getAnnotationPng(mark, $(imgCont));
                imgPrev.show();
            }
            $('#textStampDTO').hide();
            $('#imageStampDTO').show();
        }
    },
    saveChanges: function () {
        //TODO: Make this simpler, It would be nice if we used the JSMVC models to do the save but we cannot here due to the need for Mark XML.
        //TODO: If marks in Stamps were stored as JSON instead of XML the above could easily be done.
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        this.prevSelectedStampId = '';
        var that = this,
            stampDTO = DTO.getDTO('#stampDTO'),
            model = this.collection.getSelected()[0],
            frmContents = $('#imageStampDTOForm').contents(),
            errorHandl = function (errmessage) {
                var tag = css.warningErrorClassTag,
                    warningErrorClass = css.warningErrorClass,
                    inputErrorClass = css.inputErrorClass;
                if (isImg) {
                    frmContents.find('.' + warningErrorClass).remove();
                    frmContents.find('.' + inputErrorClass).removeClass(inputErrorClass);
                    frmContents.find('input[name="Name"]').after('<' + tag + ' class="' + warningErrorClass + '">' + errmessage + '</' + tag + '>');
                    frmContents.find('input[name="Name"]').addClass(inputErrorClass);
                } else {
                    ErrorHandler.removeErrorTags(warningErrorClass, inputErrorClass);

                    //as of now we are comparing text message but at some time later we have to restructure existing code to make it generic for all fields
                    if (errmessage === Constants.c.enterStampText) {
                        ErrorHandler.addErrors({ 'Description': errmessage }, warningErrorClass, tag, inputErrorClass, 'textarea');
                    }
                    else {
                        ErrorHandler.addErrors({ 'Name': errmessage }, warningErrorClass, tag, inputErrorClass);
                    }
                }
                that.enableButtons();
            },
            type = model.get('Type'),
            isImg,
            isNew = model.get('Id') === Constants.c.emptyGuid;
        if (isNew) {
            type = $('input[name="Type"]:checked').attr('class');
        }
        isImg = type.match(/image/ig) && (type.match(/image/ig).length > 0);
        stampDTO.Id = model.get('Id');
        this.disableButtons();

        if (isImg) {    // DTO.getDTO doesn't get the name from the iframe used for uploading the image stamp, therefore it has to be fetched specifically
            stampDTO.Name = $.trim(frmContents.find('input[name="Name"]').val());
        }
        if (!$.trim(stampDTO.Name)) {   // Check for if the title is new
            errorHandl(Constants.c.enterATitle);
            return false;
        }
        if (!isImg && !$.trim(stampDTO.Description)) {//check if description is empty on text stamp
            errorHandl(Constants.c.enterStampText);
            return false;
        }
        if (stampDTO.Name === Constants.c.newTitle) {   // Check for if the title is new
            errorHandl(Constants.c.titleNewWarning);
            return false;
        }
        if (!this.isUnique(stampDTO)) {    // Check for a duplicate title
            errorHandl(Constants.c.duplicateTitle);
            return false;
        }
        if ($('#imageStampDTO iframe').contents().find('#fid').val() === "" && isImg && isNew) {    // Check for selected file
            $('#imageStampDTO iframe').contents().find('.fileType').css('color', 'red');
            that.enableButtons();
            return false;
        }
        if (isImg) {
            if (isNew) {
                this.saveImageStamp();
            } else {
                $.ajax({
                    url: Constants.Url_Base + 'Annotations/SetImageStamp',
                    data: JSON.stringify({ stamp: { Id: stampDTO.Id, Name: stampDTO.Name } }),
                    type: "POST",
                    contentType: "application/json",
                    success: function (result) {
                        if (result.status === "ok") {
                            that.saveSuccess(result.result, result, result.result.Id, window.imgStamps, that);
                            that.buildCollection();
                            that.onRowSelect({ rowId: result.result.Id });
                        }
                        else {
                            ErrorHandler.addErrors({ 'stamp_Error': result.message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                            that.enableButtons();
                        }
                    },
                    complete: function () {
                        that.enableButtons();
                    }
                });
            }
        }
        else {
            // Check type and perform a save accordingly                        
            this.saveTextStamp(stampDTO);
        }
        return true;
    },
    saveTextStamp: function (stampDTO) {
        var that = this;
        var attr = {};
        // Fetch new mark XML
        var type = Constants.mt.Text;
        var newMark = {};
        var isNew = stampDTO.Id === Constants.c.emptyGuid;
        var complete = function () {
            var textProps = that.getTextProps();
            newMark.Text = encodeURIComponent(stampDTO.Description);
            newMark.FontName = textProps.FontName;
            newMark.TextColor = textProps.TextColor;
            newMark.FontSize = textProps.FontSize;
            newMark.FontStyle = textProps.FontStyle;
            newMark.Type = type;
            attr.Id = stampDTO.Id;
            attr.Name = stampDTO.Name;
            attr.Description = stampDTO.Description;
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            $.ajax({
                url: Constants.Url_Base + 'Annotations/SetTextStamp',
                data: JSON.stringify({ stamp: attr, jsAnnotation: JSON.stringify(newMark) }),
                type: "POST",
                contentType: "application/json",
                success: function (result) {
                    if (result.status === "ok") {
                        that.saveSuccess(result.result, result, attr.Id, window.txtStamps, that);
                        that.buildCollection();
                        that.onRowSelect({ rowId: result.result.Id });
                    }
                    else {
                        ErrorHandler.addErrors({ 'stamp_Error': result.message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                    }
                },
                complete: function () {
                    that.enableButtons();
                }
            });
        };
        if (isNew) {
            $.ajax({
                url: Constants.Url_Base + "Annotations/NewMark",
                data: { type: type },
                type: "GET",
                async: false,
                contentType: "application/json",
                success: function (result) {
                    if (result.status === 'ok') {
                        newMark = result.result;
                        newMark.ScaleToDPI = true;
                        complete();
                    }
                    else {
                        ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    }
                }
            });
        }
        else {
            var stamp = window.txtStamps.get(stampDTO.Id);
            var stampXML = stamp.get('MarkXML');

            //TODO: MAV Use the mark model. Bug 11446  - [Forms] Fix StampEditView preview functionality
            //newMark = ViewerUtil.getMarkFromMarkXML(stampXML);
            complete();
        }
    },
    saveImageStamp: function () {
        var that = this;
        $('#imageStampDTO iframe').contents().find('#ubtn').click();
        $('#imageStampDTOForm').load(function (e) {
            window.stampCC.fetch({
                success: function () {
                    that.buildCollection();
                    that.onRowSelect({ rowId: Constants.c.emptyGuid });
                },
                reset: true
            });
        });
        return;
    },
    kill: function () {
        //clear errors first        
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var model = this.collection.getSelected()[0];
        var type = model.get('Type');
        var id = model.get('Id');
        var sf;
        //do nothing if you try and delete -- New --     
        if (id === Constants.c.emptyGuid) {
            return;
        }
        var that = this;
        this.disableButtons();
        var complete = function () {
            that.enableButtons();
        };
        var ff = function (xhr, statusText, error) {
            that.handleErrors(null, error.message);
        };
        if (type.match(/text/ig)) {
            sf = function () {
                window.txtStamps.remove(model);
                that.buildCollection();
                that.onRowSelect({ rowId: Constants.c.emptyGuid });
            };
        }
        else if (type.match(/image/ig)) {
            sf = function () {
                window.imgStamps.remove(model);
                that.buildCollection();
                that.onRowSelect({ rowId: Constants.c.emptyGuid });
            };
        }
        model.destroy({ success: sf, failure: ff, complete: complete });
    },
    /*
    * isUnique check the new against the existing.  do not allow same names on two stamps
    * if there is an update and the guid is the same then it is considered unique...
    * @return boolean
    */
    isUnique: function (stamp) {
        var unique = true,
            eachIsUniq = function (innerStamp) {
                if ((stamp.Name.toLowerCase() === innerStamp.get('Name').toLowerCase()) && (stamp.Id !== innerStamp.get('Id'))) {
                    unique = false;
                    return false;
                }
            };
        window.imgStamps.each(eachIsUniq);
        window.txtStamps.each(eachIsUniq);
        return unique;
    },
    disableButtons: function () {
        $('input[name="save_stamp"]').prop('disabled', true);
        $('input[name="delete_stamp"]').prop('disabled', true);
    },
    enableButtons: function () {
        var model = this.collection.getSelected()[0];
        if (!model || model.get('Id') === Constants.c.emptyGuid) {
            $('input[name="delete_stamp"]').prop('disabled', true);
        }
        if (this.isDirty()) {
            $('input[name="save_stamp"]').prop('disabled', false);
        }
        else {
            $('input[name="save_stamp"]').prop('disabled', true);
        }
    },
    setTextPropsFromMarkData: function (mark) { // Set the properties in the UI to match those of the passed in mark data       
        $('#textStampDTO select[name="FontType"] option[value="' + mark.FontName + '"]').prop('selected', true);  // Set the font name (Verdana, Tahoma, etc.)
        var fsOpts = $('#textStampDTO select[name="FontSize"] option');
        var len = $('#textStampDTO select[name="FontSize"] option').length;
        while (len--) {
            var fsOpt = fsOpts[len];
            if (parseInt($(fsOpt).text(), 10) === mark.FontSize) {
                $(fsOpt).prop('selected', true);
                break;
            }
        }
        var jPickers = Utility.getJPickerByViewId(this.cid);
        var fillColorItem = jPickers.fontColor, col = mark.TextColor.toString(16), k = 0, collen = col.length;
        if (fillColorItem) {
            if (collen < 6) {
                for (k; k < 6 - collen; k += 1) {
                    col = "0" + col;
                }
            }
            fillColorItem.color.active.val('hex', col); // Set the text color in the jpicker
        }
        var fss = $('#textStampDTO div.toggle_btn');    // Font style selectors    
        this.setFontStyle(mark, fss);
    },
    setFontStyle: function (mark, fss) { // Set the font style for mark data in the UI
        // fss: font style selectors (selectors for the elements that have the font styles (bold, italic, underline, and strikethrough)
        if (!fss) {
            fss = $('#fontPropCont div.toggle_btn');
        }
        var len = fss.length;
        while (len--) {
            var fs = fss[len];
            if (mark.FontStyle & $(fs).find('span').attr('value')) {
                $(fs).addClass('pressed');
            }
            else {
                $(fs).removeClass('pressed');
            }
        }
    },
    setupTextProps: function () {
        var that = this;
        var fontNames = Constants.safeFonts;
        var length = fontNames.length;
        var i = 0;
        $('#textStampDTO select[name="FontType"]').empty();
        for (i = 0; i < length; i++) {
            $('#textStampDTO select[name="FontType"]').append($('<option></option').text(fontNames[i]).val(fontNames[i]).css('font-family', fontNames[i]));
        }

        var fontSizes = Constants.fontSizes;
        length = fontSizes.length;
        i = 0;
        $('#textStampDTO select[name="FontSize"]').empty();
        for (i = 0; i < length; i++) {
            $('#textStampDTO select[name="FontSize"]').append($('<option></option').text(fontSizes[i]).val(fontSizes[i]));
        }
        try {
            Utility.cleanupJPicker(that.cid);
            var $p = $('#textStampDTO a.fontColor').jPicker({
                window: {
                    expandable: true,
                    position: {
                        x: 'screenCenter', // acceptable values "left", "center", "right", "screenCenter", or relative px value
                        y: 'bottom' // acceptable values "top", "bottom", "center", or relative px value
                    }
                },
                color: {
                    active: new $.jPicker.Color({ hex: '000000' })
                }
            },
            function (color, context) {
                that.setDirty();
            }
            );
            Utility.addJPickerTracking($p, that.cid);
        }
        catch (e1) {
            Utility.OutputToConsole('show anno props jpicker cleanup and bindings', e1);
        }
    },
    getTextProps: function () {
        var textProps = {};
        var style = 0;
        var txtStampSel = '#textStampDTO';
        var fontStyles = $(txtStampSel + ' div.toggle_btn');
        _.each(fontStyles, function (fontStyle) {
            if ($(fontStyle).hasClass('pressed')) {
                style |= parseInt($(fontStyle).find('span').attr('value'), 10);
            }
        });
        var jPickers = Utility.getJPickerByViewId(this.cid);
        var fillColorItem = jPickers.fontColor;
        textProps.TextColor = parseInt(fillColorItem.color.active.val('hex'), 16);
        textProps.FontName = $(txtStampSel + ' select[name="FontType"] option:selected').val();
        textProps.FontStyle = style;
        textProps.FontSize = $(txtStampSel + ' select[name="FontSize"] option:selected').val();
        return textProps;
    },
    toggleButton: function (e) {
        var target = $(e.currentTarget);
        if (target.hasClass('pressed')) {
            target.removeClass('pressed');
        }
        else {
            target.addClass('pressed');
        }
        this.setDirty();
    },
    formatPreview: function () {
        var rows = $("#formatPreview tr");
        var length = rows.length;
        var i;
        for (i = 0; i < length; i++) {
            var el = rows[i].firstChild;
            var s = el.innerHTML; // take text from first td
            var el2 = el.parentElement.lastChild; // and put it into last td 
            el2.innerHTML = Utility.replaceTextStampText(s); // after applying replacement function
        }
        $("#formatPreview").dialog({
            resizable: false,
            width: 'auto',
            height: 'auto',
            modal: true,
            title: Constants.c.replacementText,
            buttons: [{
                text: Constants.c.close,
                click: function () {
                    $(this).dialog("close");
                }
            }]
        });
    },
    jPickerOpened: function () {
        Navigation.onNavigationCallback = function () {
            $('.jPicker.Container').find('.Cancel').click();
        };
    },
    getMark: function (type, markXML) {
        var mark = this.marks.add({ Type: type });
        if (markXML) {
            mark.fetch({ markXML: markXML });
        }
        else {
            mark.fetch();
        }
        return mark;
    },
    getAnnotationPng: function (mark, markCont) {
        if (isNaN(mark.get('TextColor'))) {
            mark.set('TextColor', 0);
        }
        if (mark.get('Type') === Constants.mt.Text) {
            mark.set('ScaleToDPI', true);
        }
        var image = new Image();
        var rect = mark.get('Rectangle');
        image.onload = function () {
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
            $img.attr('markId', mark.get('Id'));
            $(markCont).empty();
            if (mark.get('Type') === Constants.mt.Highlight) {
                markCont.css('display', 'block').append($("<div></div>").css('opacity', '0.5').append(image));
            }
            else {
                markCont.css('display', 'block').append(image); // append image to mark container
            }
        };
        this.fixMarkNulls(mark);
        image.src = this.getAnnotationImageSrc(mark);
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
        return src;
    },
    setDirty: function () {
        this.dirty = true;
        this.enableButtons();
    },
    clearDirty: function () {
        this.dirty = false;
        this.enableButtons();
    },
    isDirty: function () {
        return this.dirty;
    }
});