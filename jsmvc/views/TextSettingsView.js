var TextSettingsView = Backbone.View.extend({
    model: null,    // TextSetting
    className: 'TextSettingsView',
    viewData: {},
    events: {
        'change select[name="FontType"]': 'changeFontType',
        'change select[name="FontSize"]': 'changeFontSize',
        'click .fontStyles .toggle_btn': 'changeFontStyle',
        'click .fontAlignments .toggle_btn': 'changeFontAlignment'
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('textSettingLayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.Bold = this.model.get('font-weight') !== 'normal';
        ro.Italic = this.model.get('font-style') !== 'normal';
        ro.Underline = this.model.get('text-decoration') !== 'none';
        ro.Alignment = this.model.get('text-align');
        ro.displayLabels = this.options.displayLabels || false;
        ro.fonts = [];
        ro.sizes = [];
        var fs = Constants.safeFonts;
        var i = 0;
        var length = fs.length;
        var v = this.model.get('font-family');
        for (i; i < length; i++) {
            ro.fonts.push({
                Value: fs[i],
                Style: 'style = "font-family: ' + fs[i] + ';"',
                Selected: v === fs[i] ? 'selected="selected"' : ''
            });
        }
        v = this.model.getAttributeAsInt('font-size');
        fs = Constants.fontSizes;
        i = 0;
        length = fs.length;
        for (i; i < length; i++) {
            ro.sizes.push({
                Value: fs[i],
                Selected: v === fs[i] ? 'selected="selected"' : ''
            });
        }
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();        
        this.$el.html(this.compiledTemplate(viewData));
        this.setupColorPicker();
        return this;
    },
    setupColorPicker:function(){
        var that = this;
        Utility.cleanupJPicker(this.cid);
        var color = this.model.getColorAsHex();
        var $p = this.$el.find('.fontColor').jPicker({
            window: {
                expandable: true,
                position: {
                    x: 'screenCenter', // acceptable values "left", "center", "right", "screenCenter", or relative px value
                    y: 'bottom' // acceptable values "top", "bottom", "center", or relative px value
                }
            },
            color: {
                active: new $.jPicker.Color({ hex: color })
            }
        }, function (color, context) {  // Save Callback
            that.changeFontColor(color, context);
        });
        Utility.addJPickerTracking($p, that.cid);

    },
    close: function () {
        Utility.cleanupJPicker(this.cid);
        this.unbind();
        this.remove();
    },
    changePressed: function (ev) {
    },
    //#region Event Handling
    changeFontType: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('font-family', $targ.val());
    },
    changeFontSize: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('font-size', $targ.val() + 'px');
    },
    changeFontStyle: function (ev) {
        var $targ = $(ev.currentTarget);
        if ($targ.hasClass('pressed')) {
            $targ.removeClass('pressed');
        }
        else {
            $targ.addClass('pressed');
        }
        var fontStyle = $targ.find('input').val();
        var revFS = Utility.reverseMapObject(Constants.fs);
        this['change' + revFS[fontStyle]](ev);
    },
    changeBold: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('font-weight', $targ.hasClass('pressed') ? 'bold' : 'normal');
    },
    changeItalic: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('font-style', $targ.hasClass('pressed') ? 'italic' : 'normal');
    },
    changeUnderline: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('text-decoration', $targ.hasClass('pressed') ? 'underline' : 'none');
    },
    changeFontColor: function (color, context) {
        var all = color.val('all');
        var hex = all ? '#' + all.hex : 'none';
        this.model.set('color', hex);
    },
    changeFontAlignment: function (ev) {
        var $targ = $(ev.currentTarget);
        $targ.siblings().removeClass('pressed');
        $targ.addClass('pressed');
        this.model.set('text-align', $targ.find('[name="Alignment"]').val());
    }
    //#endregion Event Handling
});