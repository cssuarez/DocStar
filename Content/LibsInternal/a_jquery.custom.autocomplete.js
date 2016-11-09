(function ($) {
    $.widget('ui.autocomplete', $.ui.autocomplete, {
        _renderMenu: function (ul, items) {
            var input = this.element;
            var $activeDialog = input.closest('.ui-dialog');
            if ($activeDialog.length > 0) {
                // append the menu to the dialog, so that it gets the proper z-index, and so the dialog doesn't try to obtain a higher z-index
                input.autocomplete('option', 'appendTo', $activeDialog);
                $activeDialog.css('overflow', 'visible');
            } else {
                var $appendTo = $(input.autocomplete('option', 'appendTo'));
                // Only append to the body, if an appendTo is not specified or the appendTo is a ui-combobox, and the input is not in a dialog
                if (!($appendTo && $appendTo.length) || ($appendTo && $appendTo.hasClass('ui-combobox'))) {
                    input.autocomplete('option', 'appendTo', 'body');   // append to body, so it is outside any overflow: hidden/auto, and so the menu is scrollable
                }
            }
            this._superApply(arguments);
            if (this.options.minWidth) {
                $(ul).css('min-width', this.options.minWidth);
            }
            // Set the maximum height of the menu
            if (!this.options.maxHeight) {
                this.options.maxHeight = 152;   // Height of 8 elements as the maximum to allow displayed at once
            }
            if (this.options.maxHeight) {
                $(ul).css('max-height', this.options.maxHeight);
            }
            if (!this.options.maxWidth || this.options.maxWidth < this.element.width()) {
                this.options.maxWidth = this.element.width();
            }
            if (this.options.maxWidth) {
                $(ul).css('max-width', this.options.maxWidth);
            }
        },
        _renderItem: function (ul, item) {
            var $li = this._superApply(arguments);  // Appends li to ul, so don't append it again
            // just modify the li and its contents
            $li.text('');
            if (item.label && item.label === " ") {
                item.label = item.label.trim();
            }
            if (item.value && item.value === " ") {
                item.value = item.value.trim();
            }
            var $a = $(document.createElement('a'));
            $a.text(item.label);
            if (item.title) {
                $a.attr('title', item.title);
            }
            else {
                $a.attr('title', item.label);
            }
            // Return the modified li element
            return $li.data("item.autocomplete", item).append($a);
        },
        _create: function (ul, item) {
            this._superApply(arguments);
            // this.menu._isDivider determines whether or not empty list entries should be changed into separator's, rather than display as an empty value
            // setting it to a new function that always returns false, makes is so we will never display an empty value as a separator, which is what we want.
            this.menu._isDivider = function (item) {
                return false;
            };
        }
    });
}(jQuery));