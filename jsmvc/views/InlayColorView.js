var InlayColorView = Backbone.View.extend({
    collection: undefined, // InlayColors
    $selected: undefined,
    colors: Constants.colorPalette,
    viewData: {},
    events: {
        'click div.InlayColor': 'changeColorSelection'
    },
    /*
        options: {
            @colors: array of colors to render, defaults to pastels
            @selectedColor: hex code for which color should be selected, defaults to the first color in the @colors array
        }
    */
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('inlaycolor'));
        this.colors = options.colors || this.colors;
        var colors = [];
        var idx = 0;
        var length = this.colors.length;
        for (idx; idx < length; idx++) {
            colors.push({ Color: this.colors[idx] });
        }
        this.collection = new InlayColors(colors);
        this.collection.setSelection(options.selectedColor);
        this.options = options;
        return this;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        var html = this.compiledTemplate(this.viewData);
        this.$el.html(html);
        this.setColorSelection();
        this.delegateEvents(this.events);
        return this;
    },
    getRenderObject: function () {
        var r = {};
        var idx = 0;
        var colorLen = this.collection.length;
        var $container = $(document.createElement('div'));
        for (idx; idx < colorLen; idx++) {
            var inlayColor = this.collection.at(idx);
            var color = inlayColor.get('Color');
            var $div = $(document.createElement('div'));
            $div.addClass('InlayColor');
            var $span = $(document.createElement('span'));
            $span.addClass('InlayColor_' + color);
            $div.append($span);
            $container.append($div);
        }
        r.colorsHTML = $container.get(0).innerHTML;
        r.label = '';
        return r;
    },
    getColorSelection: function () {
        var inlayColor = this.collection.getSelected();
        return inlayColor.get('Color');
    },
    setColorSelection: function () {
        var color = this.getColorSelection();
        this.$selected = this.$el.find('span.' + 'InlayColor_' + color).parent();
        this.$selected.addClass('InlaySelected');
        this.collection.setSelection(color);
    },
    changeColorSelection: function (ev) {
        var $targ = $(ev.currentTarget);
        var all = this.$el.find('div.InlayColor');
        all.removeClass('InlaySelected');
        $targ.addClass('InlaySelected');
        this.$selected = $targ;
        var $color = $targ.find('> span');
        var colorClass = $color.get(0).className;
        var color = colorClass.split('_')[1];
        this.collection.setSelection(color);
    }
});
