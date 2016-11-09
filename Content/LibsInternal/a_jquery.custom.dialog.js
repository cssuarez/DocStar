(function ($) {
    $.widget('custom.dialog', $.ui.dialog, {
        _create: function () {
            $.ui.dialog.prototype._create.apply(this, arguments);
            // Include tooltip if the title width is limited
            if (this.options.dialogClass && typeof this.options.dialogClass === 'string' && this.options.dialogClass.match('limitTitleWidth')) {
                var $title = $(this.uiDialogTitlebar.find('.ui-dialog-title'));
                $title.attr('title', $title.text());
            }
            var $dialog = this.element;
            if (!this.options.closeOnEscape && this.options.closeOnEscapeCustom) {
                $dialog.off('keydown.closeOnEscape').on('keydown.closeOnEscape', function (evt) {
                    if (evt.keyCode === $.ui.keyCode.ESCAPE) {
                        $dialog.dialog('close');
                    }
                    evt.stopPropagation();
                });
            }
        }
    });
}(jQuery));