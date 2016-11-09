// Utility function for fielded criteria (for search)
var FieldedCriteriaUtil = {
    addField: function () {
        var i = 0;
        var uniqueId = '';
        if ($('#field_search').data('id') === undefined) {
            $('#field_search').data('id', 0);
        }
        if ($('#field_search').data('max_fields') === undefined) {
            if ($(window).height() <= parseInt($('body').css('min-height'), 10)) {
                $('#field_search').data('max_fields', 3);
            }
            else {
                $('#field_search').data('max_fields', 11);
            }
        }
        if ($('#field_search').data('num_fields') === undefined) {
            $('#field_search').data('num_fields', 1);
        }
        if ($('#field_search').data('num_fields') <= $('#field_search').data('max_fields')) {
            // Increment added field to make id unique
            var unique_field = (parseInt($('#field_search').data('id'), 10) + 1).toString();
            for (i = 0; i <= $('#field_search').data('id') ; i++) {
                if ($('#unique_' + i.toString()).length > 0) {
                    uniqueId = '#unique_' + i.toString();
                    break;
                }
            }
            $(uniqueId).clone().appendTo('#field_search_container .field_search_dropdown_container').attr('id', 'unique_' + unique_field);
            var uniqueFieldId = $('#unique_' + unique_field);
            // Clears clone's dropdown text       
            SearchUtil.createSearchComBoBox($(uniqueFieldId),true);
            $(uniqueFieldId).find('span.ui-combobox input').val('');            
            // Remove inputs and replace with default text input
            uniqueFieldId.find('.database_field_input *').remove();
            uniqueFieldId.find('.database_field_input').append("<input class='database_field_text' type='text' ></input>");
            // Increment unique_id by 1 (to maintain unique id)
            $('#field_search').data('id', $('#field_search').data('id') + 1);
            $('#field_search').data('num_fields', $('#field_search').data('num_fields') + 1);
            // Add delete button so user can delete the row
            if (uniqueFieldId.find('.database_field_delete').length < 1) {
                uniqueFieldId.append("<div class='database_field_delete'> <a class='ui-icon ui-icon-circle-close'></a></div>");
            }
            // Add delete button to first row if there are 2 or more rows. 
            if ($('#field_search').data('num_fields') > 1 &&
                $(uniqueId + ' .database_field_delete').length < 1) {
                $(uniqueId).append("<div class='database_field_delete'> <a class='ui-icon ui-icon-circle-close'></a></div>");
            }
            $('#field_search_container').perfectScrollbar('update');
        }
    },
    removeField: function (event) {
        $('#field_search').data('num_fields', parseInt($('#field_search').data('num_fields'), 10) - 1);
        $(event.currentTarget.parentNode).remove();
        // Remove first row delete button if it is the only row
        if ($('#field_search').data('num_fields') === 1) {
            $('#field_search div.database_field_delete').remove();
        }
        $('#field_search_container').perfectScrollbar('update');
    }
};