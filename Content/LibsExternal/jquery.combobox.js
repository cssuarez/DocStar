/// <reference path="../LibsInternal/Utility.js" />
(function ($) {
    $.widget("ui.combobox", {
        _create: function () {
            var input,
				self = this,
				select = this.element.hide(),
				selected = select.children(":selected"),
				value = selected.val() ? selected.text() : "",
				wrapper = $("<span>")
					.addClass("ui-combobox")
					.insertAfter(select);
            self.options = self.options || {};
            self.options.classes = self.options.classes || '';
            self.wrapper = wrapper;
            input = $("<input>")
				.appendTo(wrapper)
				.val(value)
				.addClass("ui-state-default isCombo " + self.options.classes)
				.autocomplete({
				    delay: 0,
				    minLength: 0,
				    appendTo: wrapper,
				    source: self.options.source || function (request, response) {
				        var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
				        response(select.children("option").map(function () {
				            var text = $(this).text();
				            if (this.value && (!request.term || matcher.test(text))) {
				                var labelText = Utility.getTagTextFromHtmlString(text);
				                return {
				                    label: labelText,
				                    value: labelText,
				                    option: this
				                };
				            }
				        }));
				    },
				    select: function (event, ui) {
				        if (ui.item.option) {
				            ui.item.option.selected = true;
				            self._trigger("selected", event, {
				                item: ui.item.option
				            });
				        }
				        Utility.executeCallback(self.options.onSelect, { event: event, ui: ui });
				    },
				    change: function (event, ui) {
				        if (!ui.item) {
				            var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex($(this).val()) + "$", "i"),
								valid = false;
				            select.children("option").each(function () {
				                if ($(this).text().match(matcher)) {
				                    this.selected = valid = true;
				                    return false;
				                }
				            });
				        }
				        Utility.executeCallback(self.options.onChange, { event: event, ui: ui });
				    },
				    minWidth: self.options.autocompleteMinWidth,
				    maxHeight: self.options.autocompleteMaxHeight
				})
				.addClass("ui-widget ui-widget-content ui-corner-left");
            this.input = input;
            if (select.attr('name')) {
                input.attr('name', select.attr('name'));
            }
            $(select).addClass('ignore');
            $("<a>")
				.attr("tabIndex", -1)
				.appendTo(wrapper)
				.button({
				    icons: {
				        primary: "ui-icon-triangle-1-s"
				    },
				    text: false
				})
				.removeClass("ui-corner-all")
				.addClass("ui-corner-right ui-button-icon")
				.click(function () {				    
				    var acInstance = input.autocomplete('instance');				    
				    // close if already visible
				    if (acInstance && input.autocomplete("widget").is(":visible")) {
				        input.autocomplete("close");
				        return;
				    }
				    // work around a bug (likely same cause as #5265)
				    $(this).blur();

				    if (self.options && self.options.useCurrentValue) {
				        input.autocomplete("search", input.val());
				    }
				    else {
				        // pass empty string as value to search for, displaying all results
				        input.autocomplete("search", "");
				    }
				    input.focus();
				    if ($(this).closest('li').length > 0) {
				        if ($(this).closest('li').attr('id') === "companyList") {
				            return;
				        }
				    }
				});
            if (!$.trim(input.text())) {
                input.text('');
            }
        },
        destroy: function () {
            this.wrapper.remove();
            this.element.show();
            $.Widget.prototype.destroy.call(this);
        }
    });
}(jQuery));