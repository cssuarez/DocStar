// Utility function for keyboard navigation
// ex: up down arrow keys to navigate through a ul (like suggested vocabulary);
var KeyboardNavUtil = {
    // Navigate through a ul using arrow keys
    // Optional parameters to be passed in opts
    // opts: inputSelector, buttonSelector, dropdownTextSelector, event, length, scrollSelector
    arrowNav: function ($selector, opts) {
        var event = opts.event;
        var length = opts.length;
        var i = 0;
        var $list = $selector.find('li');
        // show menu if a key is pressed
        if ($selector.css('display') === 'none') {
            $selector.show();
        }

        if (event.which !== 13 && event.which !== 38 && event.which !== 40) {
            if (opts.letterNav) {
                KeyboardNavUtil.letterNav($selector, opts);
            }
            else {
                $($list[length]).removeClass('selected');
                length = -1;
                return length;
            }
        }
        // Backspace
        if (event.which === 8) {
            if (opts.inputSelector) {
                if ($.trim($(opts.inputSelector).val()) === '') {
                    length = -1;
                    $selector.hide();
                    return length;
                }
            }
        }
        // Enter
        if (event.which === 13) {
            if (opts.buttonSelector) {
                if ($selector.find('.selected').text()) {
                    $(opts.inputSelector).val($selector.find('.selected').text());
                }
                $('#qtext').blur();
                $selector.hide();
                $(opts.buttonSelector).trigger('click');
                length = -1;
                return length;
            }
            if (opts.dropdownTextSelector) {
                // perform same operation as a click on the element                
                $selector.find('.selected a').click();
                var listLength = $list.length;
                for (i = 0; i < listLength; i++) {
                    $($('.children li')[i]).removeClass('selected');
                }               
                $selector.scrollTo($('li').first());
                $selector.hide();
                $('.dropdown').blur();

            }
            else {
                if ($selector.find('.selected').text()) {
                    $(opts.inputSelector).val($selector.find('.selected').text());
                }
            }
        }
        // Escape
        if (event.which === 27) {
            length = -1;
            $selector.hide();
            return length;
        }
        // Left
        if (event.which === 37) {
            return length;
        }
        // UP Arrow
        if (event.which === 38) {
            $($list[length]).removeClass('selected');
            length -= 1;
            if (length < 0) {
                length = $list.length - 1;
            }
        }
        // Right
        if (event.which === 39) {
            return length;
        }
        // DOWN Arrow
        if (event.which === 40) {
            $($list[length]).removeClass('selected');
            length += 1;
            if (length > $list.length - 1) {
                length = 0;
            }
        }
        // Scroll to 
        var $scroll = $selector;
        if (opts.scrollSelector) {
            $scroll = $(opts.scrollSelector);
        }
        $($scroll.find('li')[length]).addClass('selected');
        if ($scroll.find('li.selected')) {
            $scroll.scrollTop($selector.find('li.selected').index() * $selector.find('li:first').outerHeight(true));
        }
        return length;
    },
    // Navigate through a ul using letter keys
    letterNav: function ($selector, opts) {
    }
};