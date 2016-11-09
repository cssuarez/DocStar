(function ($) {
    $.widget('custom.multiselect', $.ui.multiselect, {
        options: {
            preLabelAdditionalHTML: '',
            additionalHTML: ''	// Display additional html markup inside selected list items, a keyed object based on options value
        },
        _getOptionNode: function (option) {
            var additionalHTML = this.options.additionalHTML || {};
            var preLabelAdditionalHTML = this.options.preLabelAdditionalHTML || {};
            option = $(option);
            var node = $('<li></li>').addClass("ui-state-default ui-element").attr('title', option.text()).attr('id', option.get(0).value).append(
                $('<span></span>').addClass("ui-icon")
            );
            node.append($('<div></div>').addClass('preAdditionalSelectedHTML inlineblock fleft').append(preLabelAdditionalHTML[option.get(0).value]));
            node.append(Utility.safeHtmlValue(option.text(), { 'class': 'limitLabelWidth inlineblock fleft', tag: 'div' }));
            node.hide();
            node.append($('<div></div>').addClass('additionalSelectedHTML inlineblock').append(additionalHTML[option.get(0).value]));
            if (option.get(0).value === Constants.c.emptyGuid) {
                node.find('.additionalSelectedHTML').addClass('newField');
            }
            node.append(
                $('<a></a>').addClass("action").append(
                    $('<span></span>').addClass("ui-corner-all ui-icon")
                )
            );
            node.hide();
            node.data('optionLink', option);
            if (option.prop('disabled')) {
                node.find('a.action').remove();
            }
            return node;
        },
        _create: function () {
            //TODO: jquery ui 1.9 upgrade replace with this._super();
            $.ui.multiselect.prototype._create.apply(this, arguments);
            // Add label to available list
            var availableFieldText = this.options.availableFieldLabel;
            if (availableFieldText) {
                var availableLabel = document.createElement('span');
                availableLabel.textContent = availableFieldText;
                Utility.setElementClass(availableLabel, 'count');
                this.availableActions.prepend(availableLabel);
            }
            var addEvent = this.options.addEvent;
            var that = this;
            this.selectedList.on('sortreceive', function (event, ui) {
                Utility.executeCallback(addEvent);
                if (ui.item.attr('id') === Constants.c.emptyGuid) {
                    that._addNewField(ui.item, false);
                }
            });
            this.selectedList.on('sortupdate', function (event, ui) {
                Utility.executeCallback(addEvent);
            });
            this.element.change();
        },
        _registerAddEvents: function (elements) {
            //TODO: jquery ui 1.9 upgrade replace with this._super();
            $.ui.multiselect.prototype._registerAddEvents.apply(this, arguments);
            var addEvent = this.options.addEvent;
            if (addEvent && typeof addEvent === 'function') {
                elements.on('click.customAdd', function () {
                    addEvent();
                    $(this).off('click.customAdd');
                });
            }
        },
        _registerRemoveEvents: function (elements) {
            //TODO: jquery ui 1.9 upgrade replace with this._super();
            $.ui.multiselect.prototype._registerRemoveEvents.apply(this, arguments);
            var removeEvent = this.options.removeEvent;
            if (removeEvent && typeof removeEvent === 'function') {
                elements.on('click.customRemove', function (event) {
                    removeEvent();
                    $(this).off('click.customRemove');
                });
            }
        },
        _setSelected: function (item, selected) {
            if (item.attr('id') === Constants.c.emptyGuid) {
                if (selected) {
                    // Execute function for adding new fields to multiselect list
                    $.ui.multiselect.prototype._setSelected.apply(this, [item, false]);
                    this._addNewField(item, true);
                }
                else {
                    // Execute function for removing a "new" field that hasn't been truly added yet
                    Utility.executeCallback(this.options.newFieldRemoved, item);
                }
            }
            else {
                $.ui.multiselect.prototype._setSelected.apply(this, arguments);
            }
        },
        _addNewField: function (item, selected) {
            var that = this;
            var $newItemClone = this._cloneWithData(item).hide();
            // Add a clone of the -- New -- li to the selected list
            that.selectedList.find('.ui-helper-hidden-accessible').after($newItemClone);
            $.ui.multiselect.prototype._setSelected.apply(that, [$newItemClone, selected]);
            // setTimeout is to accomodate the animation in _setSelected
            setTimeout(function () {
                Utility.executeCallback(that.options.newFieldAdded);
            }, 1);
        }
    });
}(jQuery));