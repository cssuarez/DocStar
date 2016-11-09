// Utility for buzz spaces
var BuzzUtil = {
    init: function () {
        $.ui.plugin.add("resizable", "alsoResizeReverse", {
            start: function (event, ui) {

                var self = $(this).resizable("instance"), o = self.options;

                var _store = function (exp) {
                    $(exp).each(function () {
                        $(this).data("resizable-alsoresize-reverse", {
                            width: parseInt($(this).width(), 10), height: parseInt($(this).height(), 10),
                            left: parseInt($(this).css('left'), 10), top: parseInt($(this).css('top'), 10)
                        });
                    });
                };

                if (typeof (o.alsoResizeReverse) === 'object' && !o.alsoResizeReverse.parentNode) {
                    if (o.alsoResizeReverse.length) { o.alsoResize = o.alsoResizeReverse[0]; _store(o.alsoResizeReverse); }
                    else { $.each(o.alsoResizeReverse, function (exp, c) { _store(exp); }); }
                } else {
                    _store(o.alsoResizeReverse);
                }
            },

            resize: function (event, ui) {
                var self = $(this).resizable("instance"), o = self.options, os = self.originalSize, op = self.originalPosition;

                var delta = {
                    height: (self.size.height - os.height) || 0, width: (self.size.width - os.width) || 0,
                    top: (self.position.top - op.top) || 0, left: (self.position.left - op.left) || 0
                },

            _alsoResizeReverse = function (exp, c) {
                $(exp).each(function () {
                    var el = $(this), start = $(this).data("resizable-alsoresize-reverse"), style = {}, css = c && c.length ? c : ['width', 'height', 'top', 'left'];

                    $.each(css || ['width', 'height', 'top', 'left'], function (i, prop) {
                        var sum = (start[prop] || 0) - (delta[prop] || 0);
                        if (sum && sum >= 0) {
                            style[prop] = sum || null;
                        }
                    });

                    //Opera fixing relative position
                    if (/relative/.test(el.css('position')) && $.browser.opera) {
                        self._revertToRelativePosition = true;
                        el.css({ position: 'absolute', top: 'auto', left: 'auto' });
                    }

                    el.css(style);
                });
            };

                if (typeof (o.alsoResizeReverse) === 'object' && !o.alsoResizeReverse.nodeType) {
                    $.each(o.alsoResizeReverse, function (exp, c) { _alsoResizeReverse(exp, c); });
                } else {
                    _alsoResizeReverse(o.alsoResizeReverse);
                }
            },

            stop: function (event, ui) {
                var el = $(this);
                var self = $(this).resizable("instance");
                //Opera fixing relative position
                if (self._revertToRelativePosition && $.browser.opera) {
                    self._revertToRelativePosition = false;
                    el.css({ position: 'relative' });
                }

                $(this).removeData("resizable-alsoresize-reverse");
            }
        });
        $('#sys_buzz').resizable({
            handles: 'e',
            maxWidth: 800,
            minWidth: 250,
            alsoResizeReverse: '#cust_buzz',
            start: function (event, ui) {
                $('#sys_buzz').resizable('option', 'maxWidth', $(window).width() * 0.70);
            },
            stop: function (event, ui) {
                var w1 = (100 * parseFloat($(this).css("width")) / parseFloat($(this).parent().css("width")));
                var h1 = (100 * parseFloat($(this).css("height")) / parseFloat($(this).parent().css("height"))) + "%";
                $(this).css("width", w1 + "%");
                $(this).css("height", h1);
                var w2 = (100 * (parseFloat($('#cust_buzz').css("width"))) / parseFloat($('#cust_buzz').parent().css("width")));
                var h2 = (100 * parseFloat($('#cust_buzz').css("height")) / parseFloat($('#cust_buzz').parent().css("height"))) + "%";

                if ((w1 + w2) > 99.5) {
                    w2 = 99.5 - w1;
                }
                $('#cust_buzz').css("width", w2 + "%");
                $('#cust_buzz').css("height", h2);
            }
        });
    }
};