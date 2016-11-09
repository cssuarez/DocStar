/// <reference path="../JSProxy/SearchServiceProxy.js" />
/// <reference path="../JSProxy/SecurityServiceProxy.js" />
// Functionality for searching
/// <reference path="../LibsExternal/a_jquery.js" />
/// <reference path="../../jsmvc/a_underscore-min.js" />
var SearchUtil = {
    docSearchComplete: false,
    searchProxy: SearchServiceProxy(),
    retrieveView: null,
    //refresh Search is used by anything that requires on navigation to the search page a search is re-executed. It is tested on the RetrieveController.
    refreshSearch: false,
    callbacks: [],
    searchColumns: [],
    noSetPagination: false, // don't reset hash, just update DOM values (for quicksearch with autoOpen enabled integration)
    replaceHash: false, // replace the hash (for use with autoOpen enabled integration)
    search: function (refreshSearch, callback) {
        refreshSearch = refreshSearch === false ? false : true;
        var searchId = $('#searchId').val();
        var page = $('#searchPage').val();
        var rows = $('#maxResults').val();
        if (SearchUtil.retrieveView) {
            if (searchId) {
                var searchRequest = {
                    ResultId: searchId,
                    Start: (page - 1) * rows,
                    refreshSearch: refreshSearch
                };
                SearchUtil.retrieveView.setGridContents(searchRequest, callback, true);
            }
            else {
                SearchUtil.retrieveView.search(true, null, null, callback);
            }
        }
        else {
            $('body').bind('retrieveViewRendered', function () {
                SearchUtil.search();
            });
        }
        SearchUtil.refreshSearch = false;
    },
    quickSearch: function (isQS, searchObj, lookIn) {
        if (this.retrieveView) {
            // Call Search Here
            var searchObject = {};
            searchObject.TextCriteria = $('#qtext').val();
            // Check if it is a quick search, and if there is no textCriteria specified for searching
            if (isQS && $.trim(searchObject.TextCriteria) === '') {
                VocabUtil.addEmptyWarning('#qs_suggested');
                return false;
            }
            // Collapse Accordions upon quick search, changing direction of accordion arrows
            ShowHideUtil.hideAccordions();
            var qsPrefs = SearchUtil.getQuickSearchPreferences();
            searchObject.IncludeDocuments = qsPrefs.documentsInQS;
            searchObject.IncludeInboxes = qsPrefs.inboxesInQS;
            searchObject.IncludeFolders = qsPrefs.foldersInQS;
            searchObject.enableAutoWildcardQuickSearch = qsPrefs.enableAutoWildcardQuickSearch;
            searchObject.MaxRows = $('#maxResults').val();
            if (searchObject.enableAutoWildcardQuickSearch === true) {
                if (searchObject.TextCriteria.indexOf(":") < 0) {
                    searchObject.TextCriteria += '*';
                }
            }
            if (isQS) {
                this.retrieveView.clear(null, true);
            }
            if (!isQS && searchObj && lookIn) {
                // Clear TextCriteria when searching a folder/inbox that was clicked on
                searchObject.TextCriteria = '';
                this.retrieveView.clear(null, true);
                searchObject = SearchUtil.getSearchCriteria(searchObject, lookIn);
                searchObject.MaxRows = $('#maxResults').val();
            }
            this.retrieveView.search(true, searchObject, true);
        }
        else {
            $('body').bind('retrieveViewRendered', function () {
                SearchUtil.quickSearch();
            });
        }
        return true;
    },
    savedSearch: function (searchRequest) {
        if (SearchUtil.retrieveView) {
            this.retrieveView.clear(null);
            SearchUtil.setSearchRequest(searchRequest);
            SearchUtil.retrieveView.search(true, searchRequest, false);
        }
        else {
            $('body').bind('retrieveViewRendered', function () {
                SearchUtil.savedSearch(searchRequest);
            });
        }
    },
    performQS: function () {    // perform a quick search with the needed ui updates
        $('#accordion_container').data('history', 'Retrieve');
        $('#search_id').val('');
        $('#retrieve_tab_panel .document_preview_viewer').addClass('hideNative');
        Tab.updateTabById('retrieve_tab');
        $('#view_layout').addClass('hideNative');
        $('#accordion_container').removeClass('hideNative');    
        if (!SearchUtil.quickSearch(true)) {
            return;
        }
        var length = $('#qs_suggested li').length, i;
        for (i = 0; i < length; i++) {
            if ($($('#qs_suggested li')[i]).hasClass('selected')) {
                $('#qtext').val($($('#qs_suggested li')[i]).text());
                $($('#qs_suggested li')[i]).removeClass('selected');
                break;
            }
        }
        $('#text_word_phrase_text').val($('#qtext').val());
        //if ($('#suggested_vocabulary:checked').val()) {
        //    VocabUtil.vocabTimer($('#text_word_phrase_text').val(), '#vocab_suggestions', true);
        //}
        $('#qs_suggested').hide();
    },
    processCallbacks: function () {
        var i = 0;
        var length = SearchUtil.callbacks.length;
        for (i = 0; i < length; i++) {
            var callback = SearchUtil.callbacks.shift();
            callback();
        }
        if (this.docSearchComplete) {
            $('body').trigger('DocumentSearchComplete.qunit');
            this.docSearchComplete = false;
        }
        else {
            this.docSearchComplete = true;
        }
    },
    predefinedSearch: function (pdso) {
        pdso.SortOrder = Utility.GetUserPreference("searchOrder") || 'desc';
        pdso.Index = Utility.GetUserPreference("searchOrderBy") || Constants.UtilityConstants.SF_TITLE;
        if (this.retrieveView) {
            // Collapse Accordions upon quick search, changing direction of accordion arrows
            ShowHideUtil.hideAccordions();
            pdso.MaxRows = InputUtil.textRangeCheck(1, 1000, parseInt($('#maxResults').val(), 10));
            this.retrieveView.clear(null, true);
            $('#searchPage').val(1);
            this.retrieveView.setGridContents(undefined, undefined, undefined, pdso);
        }
        else {
            $('body').bind('retrieveViewRendered', function () {
                SearchUtil.predefinedSearch(pdso);
            });
        }
    },
    getPaginationQS: function () {
        var searchId;
        var hash = window.location.hash;
        var parts = hash.split('/');
        var searchIdx = -1;
        var rowIdx = -1;
        var maxRows;
        if (parts.length > 1) {
            searchIdx = _.indexOf(parts, 'searchId');
            rowIdx = _.indexOf(parts, 'maxRows');
            if (searchIdx >= 0) {
                searchId = parts[searchIdx + 1];
                maxRows = parts[rowIdx + 1];
            }
        }
        if (searchIdx >= 0) { $('#searchId').val(searchId); }
        if (rowIdx >= 0 && (!$('#maxResults').val() || $('#maxResults').is(':hidden'))) {
            $('#maxResults').val(maxRows);
        }
    },
    onDatePickerClose: function (text) {
        if (text) {
            var textHasTime = text.split(' 00:00');
            if (textHasTime.length === 2 && !textHasTime[1]) {
                var dateOnly = new Date(text).format('generalDateOnly');
                this.value = dateOnly;
            }
        }
        // to avoid reopening of datepicker after datetime selection in IE.
        if ($(this).parent()) {
            $(this).parent().focus();
        }
    },
    setSearchCriteria: function ($fieldContainer, newSearch) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var uniqueId = '#' + $fieldContainer.attr('id');
        var selected = $(uniqueId + ' .database_field .database_field_dropdown_text').val();
        var dbFieldInput = uniqueId + ' .database_field_input:first';
        var dbFieldCriteriaText = uniqueId + ' .database_field_criteria span.ui-combobox input';
        var dbFieldCriteria = uniqueId + ' .database_field_criteria .database_field_dropdown_text';
        var dbFieldInputValue = $(dbFieldInput).find('input').first().val();
        if (newSearch) {
            $(dbFieldCriteriaText).val('');
        }
        var currentDBFieldType = '';
        var dbTextClass = 'database_field_text';
        var dbDateClass = 'date_picker';
        var dbfs = window.databaseFields;

        var scs = window.slimSecurityClasses;
        var isAdmin = Utility.isSuperAdmin() || Utility.isInstanceAdmin();
        var us = Utility.getUsersDictionary(null, window.users, !isAdmin);
        var rcs = window.slimRecordCategories;
        var wfs = window.slimWorkflows;
        var rs = window.slimRoles;
        var fz = window.slimFreezes;
        var id;
        // Dictionary for criteria dropdown menu
        var searchCriteriaDictionary = {
            //DateTime
            dateTimeCriteria: [
                Constants.c.equals,
                Constants.c.before,
                Constants.c.after,
                Constants.c.between,
                Constants.c.today,
                Constants.c.yesterday,
                Constants.c.lastSevenDays,
                Constants.c.lastThirtyDays,
                Constants.c.month,
                Constants.c.year
            ],
            // Float, Long, Double, Int
            numberCriteria: [
                Constants.c.equals,
                Constants.c.greaterThanOrEqualTo,   // Solr default is inclusive when doing a ranged search
                Constants.c.lessThanOrEqualTo,  // Solr default is inclusive when doing a ranged search 
                Constants.c.between
            ],
            // String
            stringCriteria: [
                Constants.c.equals,
                Constants.c.contains,
                Constants.c.between
            ]
        };
        if ($('#field_search').data('id') === undefined) {
            $('#field_search').data('id', 0);
        }

        // Remove criteria from dropdown
        $(dbFieldCriteria + ' option').remove();
        $(dbFieldInput + ' *').remove();

        // Defaults text of criteria dropdown to Equals on select
        if (newSearch) {
            $(dbFieldCriteriaText).val('Equals');
        }
        $(dbFieldInput + ' *').remove();
        // Adds the criteria to the dropdown depending on the database field type        

        var item;
        dbfs.each(function (dbf) {
            if (dbf.get('ActualName') === selected) {
                item = dbf;
            }
        });
        if (!item) { return; } //Advanced search requests cannot be shown in the UI (from Alert queries).
        if (item.get('EntityList') === true) {
            $(dbFieldCriteriaText).val('');

            $(dbFieldInput + ' *').remove();
            var fill = function (data) {
                var j, dlen;
                if (data) {
                    dlen = data.length;
                    for (j = 0; j < dlen; j++) {
                        var scr = data.at(j);
                        $(dbFieldCriteria).append($('<option></option>').val(scr.get('Id'))
                                .attr('name', scr.get('Id'))
                                .text(scr.get('Name'))
                            );
                    }
                }
            };
            switch (item.get('ActualName')) {
                case Constants.UtilityConstants.SF_SECURITYCLASS_ID:
                    fill(scs);
                    break;
                case Constants.UtilityConstants.DF_WORKFLOW_ID:
                    fill(wfs);
                    break;
                case Constants.UtilityConstants.DF_APPROVAL_REQUESTS:
                case Constants.UtilityConstants.DF_WORKFLOW_ASSIGNEE_ID:
                case Constants.UtilityConstants.DF_WORKFLOW_OWNER_ID:
                    fill(rs);
                    for (id in us) {
                        if (us.hasOwnProperty(id)) {
                            $(dbFieldCriteria).append($('<option></option>').val(id)
                                    .attr('name', id)
                                    .text(us[id])
                                    );
                        }
                    }
                    break;
                case Constants.UtilityConstants.DF_RECORDCATEGORYID:
                    fill(rcs);
                    break;
                case Constants.UtilityConstants.DF_FREEZEID:
                    fill(fz);
                    break;
                case Constants.UtilityConstants.DF_CURRENT_STATE:
                    for (id in Constants.ds) {
                        if (Constants.ds.hasOwnProperty(id)) {
                            $(dbFieldCriteria).append($('<option></option>').val(Constants.ds[id])
                                    .attr('name', Constants.ds[id])
                                    .text(Constants.c['ds_' + id])
                                );
                        }
                    }
                    break;
                case Constants.UtilityConstants.DF_PRIORITY:
                    for (id in Constants.pl) {
                        if (Constants.pl.hasOwnProperty(id)) {
                            $(dbFieldCriteria).append($('<option></option>').val(Constants.pl[id])
                                    .attr('name', Constants.pl[id])
                                    .text(Constants.c['pl_' + id])
                                );

                        }
                    }
                    break;
            }
        }
        else {
            switch (item.get('Type')) {
                case 'Date':
                case 'DateTime':
                    $(dbFieldInput).append($("<input type='text'></input>").addClass(dbDateClass));
                    $('input', dbFieldInput).off('keyup change').on('keyup change', function (event) {
                        $('.' + css.warningErrorClass, this.parent).remove();
                        $(this).removeClass(css.inputErrorClass);
                        var targ = $(event.currentTarget);
                        var d = targ.val();
                        var isDate = true;
                        if (d) {
                            isDate = DateUtil.isDate(d);
                        }
                        if (isDate) {
                            $('.' + css.warningErrorClass, this.parent).remove();
                            $(this).removeClass(css.inputErrorClass);
                        } else {
                            var errObj = {};
                            errObj[this.id] = Constants.c.invalidDateSelection;
                            ErrorHandler.addErrors(errObj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '', 'id');
                        }
                    });
                    if (item.get('Type') === 'Date') {
                        $(dbFieldInput).find('.' + dbDateClass).datepicker({
                            onClose: SearchUtil.onDatePickerClose
                        });
                    }
                    else {
                        $(dbFieldInput).find('.' + dbDateClass).datetimepicker({
                            onClose: SearchUtil.onDatePickerClose
                        });
                    }
                    $(dbFieldInput).append("<div class='date_search'></div>");
                    $.map(searchCriteriaDictionary.dateTimeCriteria, function (n, i) {
                        $(dbFieldCriteria).append($('<option></option>').val(searchCriteriaDictionary.dateTimeCriteria[i])
                                .text(searchCriteriaDictionary.dateTimeCriteria[i])
                            );
                    });
                    currentDBFieldType = 'object';
                    break;
                case 'Boolean':
                    $(dbFieldCriteriaText).val('');
                    $(dbFieldInput + ' *').remove();
                    $(dbFieldCriteria).append($('<option></option>').val(true)
                            .attr('name', true)
                            .text(Constants.c['true'])
                        );

                    $(dbFieldCriteria).append($('<option></option>').val(false)
                            .attr('name', false)
                            .text(Constants.c['false'])
                        );
                    break;
                case 'Int16':
                case 'Int32':
                case 'Int64':
                    $(dbFieldInput + ' *').remove();
                    $(dbFieldInput).append($("<input type='text'></input>").addClass(dbTextClass).numeric({ decimal: false }));
                    $.map(searchCriteriaDictionary.numberCriteria, function (n, i) {
                        $(dbFieldCriteria).append($('<option></option>').val(searchCriteriaDictionary.numberCriteria[i])
                                .text(searchCriteriaDictionary.numberCriteria[i])
                            );
                    });
                    currentDBFieldType = 'number';
                    break;
                case 'Double':
                case 'Float':
                case 'Decimal':
                    $(dbFieldInput + ' *').remove();
                    $(dbFieldInput).append($("<input type='text'></input>").addClass(dbTextClass).numeric());
                    $.map(searchCriteriaDictionary.numberCriteria, function (n, i) {
                        $(dbFieldCriteria).append($('<option></option>').val(searchCriteriaDictionary.numberCriteria[i])
                                .text(searchCriteriaDictionary.numberCriteria[i])
                            );
                    });
                    currentDBFieldType = 'number';
                    break;
                case 'String':
                case 'Object':
                    $(dbFieldInput + ' *').remove();
                    $(dbFieldInput).append($("<input type='text'></input>").addClass(dbTextClass));
                    $.map(searchCriteriaDictionary.stringCriteria, function (n, i) {
                        $(dbFieldCriteria).append($('<option></option>').val(searchCriteriaDictionary.stringCriteria[i])
                                .text(searchCriteriaDictionary.stringCriteria[i])
                            );
                    });
                    currentDBFieldType = 'string';
                    break;
                default:
                    $(dbFieldInput + ' *').remove();
                    $(dbFieldInput).append($("<input type='text'></input>").addClass(dbTextClass));
                    $.map(searchCriteriaDictionary.stringCriteria, function (n, i) {
                        $(dbFieldCriteria).append($('<option></option>').val(searchCriteriaDictionary.stringCriteria[i])
                                .text(searchCriteriaDictionary.stringCriteria[i])
                            );
                    });
                    currentDBFieldType = 'string';
                    break;
            }
        }

        var dbFieldType = SearchUtil.getTypeofValue(dbFieldInputValue);
        if (currentDBFieldType === dbFieldType || currentDBFieldType === 'string') {
            $(dbFieldInput).find('input').val(dbFieldInputValue);
        }
    },
    getTypeofValue: function (value) {
        var floatValue = parseFloat(value);
        if (!isNaN(floatValue) && !value.match(/\D/ig)) {    // Has only digit characters
            return typeof floatValue;   // return 'number'
        }
        var dateValue = new Date(value);
        if (!isNaN(dateValue.getTime())) {
            return typeof dateValue; // return 'object' for a date value
        }
        return typeof value;    // default to returning typeof value, which is most likely 'string'
    },
    getSearchCriteria: function (searchObject, lookIn) {
        var fieldedSearchText = '';
        var i;
        if (!searchObject) {
            searchObject = {};
        }
        searchObject.ContentTypeId = $('#items_location .contenttype .contenttype_dropdown_text').val() || undefined;
        searchObject.ContentTypeTitle = $.trim($('#items_location .contenttype .contenttype_dropdown_text').text() || undefined);
        searchObject.ContainerName = $.trim($('input[name="look_in_folder"]').val());
        // Check to make sure there is a folder to look in
        if (lookIn !== undefined) {
            if (lookIn.criteria !== undefined) {
                lookIn.criteria.id = lookIn.criteria.id === 'Root' ? Constants.c.emptyGuid : lookIn.criteria.id;
                if (lookIn.type === 'folder') {
                    searchObject.FolderId = lookIn.criteria.id;
                    searchObject.ContainerName = $.trim(lookIn.criteria.title);
                }
                else if (lookIn.type === 'inbox') {
                    searchObject.InboxId = lookIn.criteria.id;
                    searchObject.ContainerName = $.trim(lookIn.criteria.title);
                }
                $('input[name="look_in_folder"]').val(searchObject.ContainerName);
            }
        }
        else {
            if ($('#browse').data('folder_criteria')) {
                lookIn = {};
                lookIn.criteria = {
                    title: $('#browse').data('folder_criteria').title,
                    id: $('#browse').data('folder_criteria').id === 'Root' ? Constants.c.emptyGuid : $('#browse').data('folder_criteria').id
                };
                lookIn.type = 'folder';
                searchObject.InboxId = undefined;
                searchObject.FolderId = lookIn.criteria.id || undefined;
            }
            else if ($('#browse').data('inbox_criteria')) {
                lookIn = {};
                lookIn.criteria = {
                    title: $('#browse').data('inbox_criteria').title,
                    id: $('#browse').data('inbox_criteria').id === 'Root' ? Constants.c.emptyGuid : $('#browse').data('inbox_criteria').id
                };
                lookIn.type = 'inbox';
                searchObject.FolderId = undefined;
                searchObject.InboxId = lookIn.criteria.id || undefined;
                $('#browse').removeData('inbox_criteria');
            }
            else if ($('input[name="look_in_folder"]').data('lookInData')) {
                var data = $('input[name="look_in_folder"]').data('lookInData');
                lookIn = data;
                searchObject.FolderId = undefined;
                searchObject.InboxId = undefined;
                if (lookIn.type === 'inbox') {
                    searchObject.InboxId = data.criteria.id;
                }
                else if (lookIn.type === 'folder') {
                    searchObject.FolderId = data.criteria.id;
                }
                searchObject.ContainerName = data.criteria.title;
            }
            else {
                lookIn = {};
                lookIn.criteria = { title: '', id: '' };
                lookIn.type = '';
            }
        }
        // Determine if checkboxes are checked or not		
        if ($('#items_location .doc_check input:checked').val() !== undefined) {
            searchObject.IncludeDocuments = true;
        }
        else {
            searchObject.IncludeDocuments = false;
        }
        if ($('#items_location .fold_check input:checked').val() !== undefined) {
            searchObject.IncludeFolders = true;
        }
        else {
            searchObject.IncludeFolders = false;
        }
        if ($('#items_location .inbox_check input:checked').val() !== undefined) {
            searchObject.IncludeInboxes = true;
        }
        else {
            searchObject.IncludeInboxes = false;
        }
        // add PredefinedSearch

        var selectedpds = parseInt($('#items_location .items_radio input:checked').val(), 10);
        searchObject.PredefinedSearch = Constants.pds.None;	// No filter; search all documents
        var isMyAlerts = selectedpds === Constants.pds.MyAlerts;
        if (selectedpds === Constants.pds.MyApprovals || isMyAlerts) {
            searchObject.PredefinedSearch = searchObject.PredefinedSearch | Constants.pds.MyApprovals;
        }
        if (selectedpds === Constants.pds.MyWorkflows || isMyAlerts) {
            searchObject.PredefinedSearch = searchObject.PredefinedSearch | Constants.pds.MyWorkflows;
        }
        // Get word_phrase text
        searchObject.TextCriteria = $('#text_word_phrase_text').val();
        // Get field criteria values
        searchObject.FieldedCriteria = [];
        var getDataBaseFieldType = function (actualName) {
            var dbfs = window.databaseFields;
            var field = _.detect(dbfs.models, function (item) { return item.get('ActualName') === actualName || item.get('ActualName') === actualName.split('_')[1]; });
            if (field) {
                return { type: field.get('Type'), isEntityList: field.get('EntityList') };
            }
            return;
        };
        var searchFields = $('#field_search .field_search_field');
        var length = searchFields.length;
        var an = '';
        var dbFieldCriteriaText = '';
        for (i = 0; i < length; i = i + 1) {
            fieldedSearchText = ''; // Reset fieldedSearchText each iteration
            an = '';
            var searchFieldId = '#' + $(searchFields[i]).attr('id');  // Get Id of search field as selector id
            var dbFieldText = searchFieldId + ' .database_field span.ui-combobox input';
            dbFieldCriteriaText = searchFieldId + ' .database_field_criteria span.ui-combobox input';
            var dbFieldSelect = searchFieldId + ' .database_field .database_field_dropdown_text';
            var dbFieldCriteriaSelect = searchFieldId + ' .database_field_criteria .database_field_dropdown_text';
            var dbFieldInput = searchFieldId + ' .database_field_input';
            SearchUtil.removeErrorMessage(dbFieldInput);
            var $options = $(dbFieldSelect).find('option');
            var k = 0;
            var dblength = $options.length;
            for (k; k < dblength; k++) {
                if ($($options[k]).text() && ($(dbFieldText).val().toLowerCase() === $($options[k]).text().toLowerCase())) {
                    an = $($options[k]).val();
                    dbFieldText = $options[k];
                    break;
                }
            }
            $options = $(dbFieldCriteriaSelect).find('option');
            var dbFieldCriterialength = $options.length;
            var c = 0;
            for (c; c < dbFieldCriterialength; c++) {
                if ($($options[c]).text() && ($(dbFieldCriteriaText).val().toLowerCase() === $($options[c]).text().toLowerCase())) {
                    dbFieldCriteriaText = $options[c];
                    break;
                }
            }
            var tp = '';
            var isEL = ''; // init and reset tp and isEL so they don't give false positives below if an is not detected
            if (an) {
                var dbFieldType = getDataBaseFieldType(an);
                if (dbFieldType) {
                    tp = dbFieldType.type;
                    isEL = dbFieldType.isEntityList;  // is an entityList
                }
            }
            var dbFieldOperator = $(dbFieldCriteriaText).text();
            // Determine if fields are selected and have a value or are of type object 
            // has search text or is an entity list (Request Approvals For)
            if (($.trim($(dbFieldText).text()) !== '' || tp === 'Object') && ($.trim($(dbFieldCriteriaText).text()) !== '' || isEL)) {
                if ($(dbFieldInput + ' input').hasClass('database_field_text') === true) {
                    if ($.trim($(dbFieldInput + ' .database_field_text').val()) !== '') {
                        fieldedSearchText = $(dbFieldInput + ' .database_field_text').val();
                    }
                }
                if ($(dbFieldInput + ' input').hasClass('date_picker') === true) {
                    if ($.trim($(dbFieldInput + ' .date_picker').val()) !== '') {
                        fieldedSearchText = $.trim($(dbFieldInput + ' .date_picker').val());
                    }
                }
                if ($(dbFieldInput + ' input').hasClass('earlier_date_picker') === true) {
                    if ($.trim($(dbFieldInput + ' .earlier_date_picker').val()) !== '' && $.trim($(dbFieldInput + ' .later_date_picker').val()) !== '') {
                        fieldedSearchText = $.trim($(dbFieldInput + ' .earlier_date_picker').val()) + ' - ' + $.trim($(dbFieldInput + ' .later_date_picker').val());
                    }
                    else {
                        // Check to see if one date range is not filled out, if so add error markup
                        //Add error markup  
                        if ($.trim($(dbFieldInput + ' .earlier_date_picker').val()) === '' || $.trim($(dbFieldInput + ' .later_date_picker').val()) === '') {
                            SearchUtil.addErrorMessage(dbFieldInput, Constants.c.emptyBetween);
                            return;
                        }
                        // Check if either date is filled out, if not return;
                        if ($.trim($(dbFieldInput + ' .earlier_date_picker').val()) === '' && $.trim($(dbFieldInput + ' .later_date_picker').val()) === '') {
                            return;
                        }
                    }
                }
                if (tp === 'DateTime' || tp === 'Date') {
                    if (fieldedSearchText) {
                        fieldedSearchText = fieldedSearchText.split(' - ');
                        var fstLength = fieldedSearchText.length;

                        if (fstLength === 1) {
                            fieldedSearchText = [fieldedSearchText[0], fieldedSearchText[0]];
                            fstLength = fieldedSearchText.length;
                        }
                        if (new Date(fieldedSearchText[0]) > new Date(fieldedSearchText[1])) {
                            var tmp = fieldedSearchText[0];
                            fieldedSearchText[0] = fieldedSearchText[1];
                            fieldedSearchText[1] = tmp;
                        }
                        var date = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
                        var match = fieldedSearchText[fstLength - 1].match(date);
                        if (match !== null) {

                            if (dbFieldOperator.toLowerCase() !== 'before') {
                                fieldedSearchText[fstLength - 1] = fieldedSearchText[fstLength - 1] + ' 23:59:59';
                            } else {
                                fieldedSearchText[fstLength - 1] = fieldedSearchText[fstLength - 1] + ' 00:00:00';
                            }
                        } else {
                            date = /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{1,2}$/;
                            match = fieldedSearchText[fstLength - 1].match(date);
                            if (match !== null) {
                                if (dbFieldOperator.toLowerCase() !== 'before') {
                                    fieldedSearchText[fstLength - 1] = fieldedSearchText[fstLength - 1] + ':59';
                                } else {
                                    fieldedSearchText[fstLength - 1] = fieldedSearchText[fstLength - 1] + ':00';
                                }
                            }
                        }
                        var j = 0;
                        for (j; j < fstLength; j++) {
                            var fST = new Date(fieldedSearchText[j]);
                            if ((j === fstLength - 1) || dbFieldOperator.toLowerCase() === 'after') {
                                fST.setMilliseconds(999);
                            }
                            else {
                                fST.setMilliseconds(0);
                            }
                            fieldedSearchText[j] = fST.toISOString();
                        }
                        fieldedSearchText = fieldedSearchText.join(' - ');
                    }
                    else {
                        //Add error markup                                
                        SearchUtil.addErrorMessage(dbFieldInput, Constants.c.emptyBetween);
                        return;
                    }
                }
                else if (tp === 'Object') {
                    // There can be different types of 'Object' coming through here
                    // i.e. Custom Fields, Security Class, Approval Requests For, Content Type, Workflow Name, etc.
                    // In the case of Custom fields there will be operators to choose from and inputs for search text
                    // Otherwise the user is presented with a list of options based on the Fielded Search chosen (i.e. Security Class: a list of Security Classes is presented)
                    // Detect if the searchField is an Entity List (a Custom Field), if not don't set the fieldedSearchText or dbFieldOperator
                    // Custom Fields: don't set the fieldedSearchText or dbFieldOperator, chosen and filled out by user
                    // Entity Lists: set the fieldedSearchText to the obtained Id of the fielded criteria, set the dbFieldOperator to Equals
                    if (isEL) {
                        if ($(dbFieldCriteriaText).val() !== Constants.c.emptyGuid) {   // To allow a blank search for the entity list, i.e. a document that doesn't have a Security Class set
                            fieldedSearchText = $(dbFieldCriteriaText).val();
                        }
                        dbFieldOperator = 'Equals'; // Always Equals for Entity Lists
                    }
                }
                else if (tp === 'Boolean') {
                    fieldedSearchText = $(dbFieldCriteriaText).val();
                    dbFieldOperator = 'Equals';
                }
                if (tp === 'Decimal') {
                    if (dbFieldOperator !== 'Between') {    // Between needs to maintain its non-numeric value, of {number1} - {number2}
                        fieldedSearchText = Number(fieldedSearchText);
                    }
                }
                searchObject.FieldedCriteria.push({
                    DatabaseField: an,
                    DatabaseFieldOperator: dbFieldOperator,
                    DatabaseFieldValue: fieldedSearchText,
                    Type: tp,
                    Concatenation: 1, // AND
                    GroupConcatenation: 1 // AND
                });
            }
        }
        return searchObject;
    },
    addErrorMessage: function (dbFieldInput, msg) {
        // Add error markup
        $(dbFieldInput).parent().height(45);
        $(dbFieldInput).append(
            "<div class='datepicker_warning ui-state-error-text'>" +
                "<p>" + msg + "</p>" +
            "</div>"
        );
    },
    removeErrorMessage: function (dbFieldInput) {
        //Clear error markup
        $(dbFieldInput + ' .datepicker_warning').remove();
        $(dbFieldInput).parent().height(35);
    },
    getSearchColumns: function (searchObject) {
        var columns = [];
        var searchFields = $('#field_search .field_search_field');
        var i;
        for (i = 0; i < searchFields.length; i++) {
            var searchFieldId = '#' + $(searchFields[i]).attr('id'); // Get Id of search field as selector id
            var dbFieldText = searchFieldId + ' .database_field .database_field_dropdown_text';
            var columnname = $(dbFieldText).val();
            columns.push(columnname);
        }
        return columns;
    },
    setLookin: function (searchRequest) {
        var containerId = (searchRequest.InboxId || searchRequest.FolderId) || undefined;
        var containerName = searchRequest.ContainerName || '';
        var containerType = '';
        if (searchRequest.InboxId) {
            containerType = 'inbox';
            if (window.slimInboxes) {
                var ibx = window.slimInboxes.get(containerId);
                if (containerId === Constants.c.emptyGuid) {
                    containerName = Constants.c.inboxes;
                }
                else if (ibx) {
                    containerName = ibx.get('Name');
                }
            }
        }
        else if (searchRequest.FolderId) {
            containerType = 'folder';
            if (window.folders) {
                var fold = window.folders.get(containerId);
                if (containerId === Constants.c.emptyGuid) {
                    containerName = Constants.c.folders;
                }
                if (fold) {
                    if (fold.get('Name') !== undefined) {
                        containerName = fold.get('Name');
                    }
                }
            }
        }
        if (containerType === 'inbox') {
            $('#browse').removeData('folder_criteria');
            $('#browse').data('inbox_criteria', {
                title: containerName,
                id: containerId
            });
        }
        else if (containerType === 'folder') {
            $('#browse').removeData('inbox_criteria');
            $('#browse').data('folder_criteria', {
                title: containerName,
                id: containerId
            });
        }
        else {
            $('#browse').removeData('folder_criteria');
            $('#browse').removeData('inbox_criteria');
        }
        $('input[name="look_in_folder"]').data('lookInData', { type: containerType, criteria: { id: containerId, title: containerName } });
        $('#folder_criteria').val(containerName);
    },
    setSearchRequest: function (searchRequest) {
        var dbfs = window.databaseFields;
        var scs = window.slimSecurityClasses;
        var i = 0;
        var id;
        if (searchRequest) {
            $('#items_location .contenttype .contenttype_dropdown_text').val(searchRequest.ContentTypeId);
            $('#items_location .contenttype .contenttype_dropdown_text').text(searchRequest.ContentTypeTitle);
            // Determine if checkboxes should be checked or not		
            if (searchRequest.IncludeDocuments === true) {
                $('#items_location .doc_check input').prop('checked', true);
            }
            else {
                $('#items_location .doc_check input').prop('checked', false);
            }
            if (searchRequest.IncludeFolders === true) {
                $('#items_location .fold_check input').prop('checked', true);
            }
            else {
                $('#items_location .fold_check input').prop('checked', false);
            }
            if (searchRequest.IncludeInboxes === true) {
                $('#items_location .inbox_check input').prop('checked', true);
            }
            else {
                $('#items_location .inbox_check input').prop('checked', false);
            }
            var data = $('#retrieve_layout_results_list').getGridParam('postData');
            data.IncludeDocuments = searchRequest.IncludeDocuments;
            data.IncludeFolders = searchRequest.IncludeFolders;
            data.IncludeInboxes = searchRequest.IncludeInboxes;
            $('#retrieve_layout_results_list').setGridParam('postData', data);
            SearchUtil.setLookin(searchRequest);
            // Set word_phrase text
            $('#text_word_phrase_text').val(searchRequest.TextCriteria);
            // Set limit of rows for grid
            $('#maxResults').val(searchRequest.MaxRows);
            $('#items_location .items_radio input[value=' + searchRequest.PredefinedSearch + ']').prop("checked", true);
            var selectedpds = searchRequest.PredefinedSearch;
            var isMyAlerts = selectedpds === Constants.pds.MyAlerts;
            if (selectedpds === Constants.pds.MyApprovals || isMyAlerts) {
                searchRequest.PredefinedSearch = searchRequest.PredefinedSearch | Constants.pds.MyApprovals;
            }
            if (selectedpds === Constants.pds.MyWorkflows || isMyAlerts) {
                searchRequest.PredefinedSearch = searchRequest.PredefinedSearch | Constants.pds.MyWorkflows;
            }
            if (searchRequest.FieldedCriteria) {
                var isEL = false;
                var dbFieldText;
                var func = function (item) {
                    if (item.get('ActualName') === searchRequest.FieldedCriteria[i].DatabaseField || searchRequest.FieldedCriteria[i].DatabaseField === 'cfs_' + item.get('ActualName')) {
                        isEL = item.get('EntityList');
                        $(dbFieldText).text(item.get('DisplayName')).val(item.get('DisplayName'));
                        return false;
                    }
                };
                var fieldLength = searchRequest.FieldedCriteria.length;
                for (i = 0; i < fieldLength; i++) {
                    var fc = searchRequest.FieldedCriteria[i];
                    if (fc && fc.DatabaseField === 'DFWfActive') {
                        fieldLength = 0;
                        break;
                    }
                }
                for (i = 0; i < fieldLength; i++) {
                    var fieldedCriteria = searchRequest.FieldedCriteria[i];
                    dbFieldText = '#unique_' + i.toString() + ' .database_field span.ui-combobox input';
                    var dbFieldSelection = '#unique_' + i.toString() + ' .database_field .database_field_dropdown_text';
                    var dbFieldCriteriaText = '#unique_' + i.toString() + ' .database_field_criteria span.ui-combobox input';
                    var dbFieldCriteriaSel = '#unique_' + i.toString() + ' .database_field_criteria .database_field_dropdown_text';
                    var dbFieldInput = '#unique_' + i.toString() + ' .database_field_input';
                    var dbField = fieldedCriteria.DatabaseField;
                    var dbFieldComparison = dbField.split('_')[1] || dbField;
                    var dbFieldOperator = fieldedCriteria.DatabaseFieldOperator;
                    var dbFieldValue = fieldedCriteria.DatabaseFieldValue;
                    //it for predefined search "Approvals"
                    if (dbFieldValue !== null) {
                        dbFieldValue = (dbFieldValue.startsWith('"') || dbFieldValue.startsWith('\'')) ? JSON.parse(dbFieldValue) : dbFieldValue;
                        var dbfvComp = dbFieldValue.replace(/\"/g, ''); // for comparing values without quotes, such as GUIDS for Security Classes, Content Types...
                        var dbType = searchRequest.FieldedCriteria[i].Type;
                        var selecedOption = $(dbFieldSelection).find('option[value="' + dbFieldComparison + '"]');

                        $(dbFieldText).val(selecedOption.text());
                        $(dbFieldSelection).val(dbFieldComparison);

                        $(dbFieldInput + ' *').remove();
                        $(dbFieldCriteriaText).val(dbFieldOperator);
                        SearchUtil.setSearchCriteria($('#unique_' + i.toString()), false);
                        dbfs.each(func);
                        selecedOption = $(dbFieldCriteriaSel).find('option[value="' + dbfvComp + '"]');
                        if (selecedOption.length > 0) {
                            $(dbFieldCriteriaText).val(selecedOption.text());
                            $(dbFieldCriteriaSel).val(dbfvComp);
                        }
                        if ($(dbFieldText).val() === Constants.UtilityConstants.SF_SECURITYCLASS_ID) {
                            for (id in scs) {
                                if (scs.hasOwnProperty(id)) {
                                    if (id === dbFieldValue) {
                                        $(dbFieldCriteriaText).text(scs[id]);
                                        break;
                                    }
                                }
                            }
                        }
                        if (dbType === 'DateTime' || dbType === 'Date') {
                            if (dbFieldOperator === 'Between' ||
                                dbFieldOperator === 'Last Seven Days' ||
                                dbFieldOperator === 'Last Thirty Days' ||
                                dbFieldOperator === 'Month' ||
                                dbFieldOperator === 'Year') {
                                $(dbFieldInput + ' *').remove();
                                $(dbFieldInput).append("<input class='earlier_date_picker' type='text' ></input>", "<input class='later_date_picker' type='text' ></input>");
                                $(dbFieldInput + ' .earlier_date_picker').datetimepicker({
                                    onClose: SearchUtil.onDatePickerClose
                                });
                                $(dbFieldInput + ' .earlier_date_picker').datetimepicker('setDate', new Date(dbFieldValue.split(' - ')[0]));
                                $(dbFieldInput + ' .later_date_picker').datetimepicker({
                                    onClose: SearchUtil.onDatePickerClose
                                });
                                $(dbFieldInput + ' .later_date_picker').datetimepicker('setDate', new Date(dbFieldValue.split(' - ')[1].split(' ')[0]));
                            }
                            else {
                                if (dbFieldOperator === 'Today') {
                                    var date = new Date();
                                    var day = date.getDate();
                                    var month = date.getMonth() + 1;
                                    var year = date.getFullYear();
                                    dbFieldValue = month.toString() + "/" + day.toString() + "/" + year.toString();
                                }
                                dbFieldValue = dbFieldValue.split(' ')[0];
                                var textHasTime = new Date(dbFieldValue).toString().split(' 00:00');
                                if (textHasTime.length > 1) {
                                    var dateOnly = new Date(dbFieldValue).format('generalDateOnly');
                                    $(dbFieldInput + ' .date_picker').val(dateOnly);
                                }
                                else {
                                    $(dbFieldInput + ' .date_picker').datetimepicker('setDate', new Date(dbFieldValue.split(' - ')[0]));
                                }
                            }
                            if ($(dbFieldInput).find('.date_search').length === 0) {
                                $(dbFieldInput).append("<div class='date_search'></div>");
                            }
                        }
                        else if (dbType === 'Object' && isEL) {
                            $(dbFieldCriteriaSel).val(dbField);
                            $(dbFieldCriteriaSel).val(dbFieldValue);
                            $(dbFieldInput + ' *').remove();
                        }
                        else {
                            if (dbFieldOperator === 'Between') {
                                $(dbFieldInput + ' *').remove();
                                $(dbFieldInput).append("<input class='earlier_date_picker' type='text' ></input>", "<input class='later_date_picker' type='text' ></input>");
                                $(dbFieldInput + ' .earlier_date_picker').val(dbFieldValue.split(' - ')[0]);
                                $(dbFieldInput + ' .later_date_picker').val(dbFieldValue.split(' - ')[1].split(' ')[0]);
                            }
                            else {
                                $(dbFieldInput + ' *').remove();
                                if (dbType !== 'Boolean') {
                                    $(dbFieldInput).append($('<input></input').addClass('database_field_text').prop('type', 'text').val(dbFieldValue));
                                }
                            }
                        }
                        if (i + 1 < fieldLength) {
                            FieldedCriteriaUtil.addField();
                        }
                    }
                }
            }
        }
    },

    getQuickSearchPreferences: function () {
        // Get User preferences for what to include in search (folders, documents, and/or inboxes)
        var includeInQS = Utility.GetUserPreference('includeInQS');
        // obtain site setting what to include in search, for foldersInQS, inboxesInQS, and documentsInQS
        var includeInQSSiteSettings = SearchUtil.getQuickSearchSiteSettings();
        var foldersInQS = true, documentsInQS = true, inboxesInQS = true, enableAutoWildcardQuickSearch = true;
        if (includeInQS) {
            includeInQS = JSON.parse(includeInQS);
            foldersInQS = includeInQS.foldersInQS;
            inboxesInQS = includeInQS.inboxesInQS;
            documentsInQS = includeInQS.documentsInQS;
            enableAutoWildcardQuickSearch = includeInQS.enableAutoWildcardQuickSearch;
        }
        else if (includeInQSSiteSettings) { // Obtain preferences from site settings if the user preferences weren't set
            foldersInQS = includeInQSSiteSettings.foldersInQS;
            inboxesInQS = includeInQSSiteSettings.inboxesInQS;
            documentsInQS = includeInQSSiteSettings.documentsInQS;
            enableAutoWildcardQuickSearch = includeInQSSiteSettings.enableAutoWildcardQuickSearch;
        }
        // Default to including folders, documents, and inboxes in quick search if there are no user preferences set and there is no site settings set
        foldersInQS = foldersInQS === undefined ? true : foldersInQS;
        inboxesInQS = inboxesInQS === undefined ? true : inboxesInQS;
        documentsInQS = documentsInQS === undefined ? true : documentsInQS;
        // Default to perform auto wild card quick search
        enableAutoWildcardQuickSearch = enableAutoWildcardQuickSearch === undefined ? true : enableAutoWildcardQuickSearch;
        return { foldersInQS: foldersInQS, inboxesInQS: inboxesInQS, documentsInQS: documentsInQS, enableAutoWildcardQuickSearch: enableAutoWildcardQuickSearch };
    },
    getQuickSearchSiteSettings: function () {
        var siteSettings = $('#systemPreferences').val();
        // Default settings
        var result = { foldersInQS: true, inboxesInQS: true, documentsInQS: true, enableAutoWildcardQuickSearch: true };
        if (siteSettings) {
            siteSettings = JSON.parse($('#systemPreferences').val());
        }
        if (siteSettings) {
            var sysPrefs = new SystemPreferences(siteSettings);
            sysPrefs.each(function (sysPref) {
                var val = Utility.convertToBool(sysPref.get('Value'));
                var name = sysPref.get('Name');
                switch (name) {
                    case 'foldersInQS':  case 'inboxesInQS': case 'documentsInQS': case 'enableAutoWildcardQuickSearch':
                        result[name] = val;
                        break;
                }
            });
        }
        return result;
    },
    setSearchOrderPostData: function (postdata, sortOrder) {
        var sidx = postdata.sidx || Utility.GetUserPreference('searchOrderBy') || '';
        if (sidx) {
            var dashes = sidx.split('-').length - 1;
            if (dashes === 4) {
                var cfm = window.customFieldMetas;
                var i;
                var length = cfm !== undefined ? cfm.length : 0;
                for (i = 0; i < length; i++) {
                    var cf = cfm.at(i);
                    var cfId = cf.get('Id');
                    if (cfId === sidx) {
                        var cfName = cf.get('Name');
                        sidx = cfName;
                    }
                }
            }
            postdata.SortBy = sidx;
        }
        else {
            delete postdata.SortBy;
        }
        var sord = sortOrder || postdata.sord;
        if (sord) {
            postdata.SortOrder = sord;
        }
        else {
            delete postdata.SortOrder;
        }
        return postdata;
    },
    fillSavedSearchList: function (containerId) {
        var $savedSearchListSel = $(containerId).find('.buttonOptions .savedSearchList');
        $savedSearchListSel.empty();
        $savedSearchListSel.append($('<option></option>'));
        var i = 0;
        var length = window.savedSearches.length;
        for (i = 0; i < length; i++) {
            var savedSearch = window.savedSearches.at(i);
            if (savedSearch) {
                $savedSearchListSel.append($('<option></option>').attr('id', savedSearch.get('Id')).text(savedSearch.get('Name')));
            }
        }
    },
    removeSavedSearchListItem: function (containerId, modelId) {
        var $savedSearchListSel = $(containerId).find('.buttonOptions .savedSearchList');
        $savedSearchListSel.find('option[id="' + modelId + '"]').remove();
    },
    getSearchFieldPrefix: function (type) {
        switch (type) {
            case Constants.ty.Boolean:
                return "cfb_";
            case Constants.ty.DateTime:
                return "cfdt_";
            case Constants.ty.Date:
                return "cfdo_";
            case Constants.ty.Decimal:
                return "cfbd_";
            case Constants.ty.Int16:
            case Constants.ty.Int32:
                return "cfi_";
            case Constants.ty.Int64:
                return "cfl_";
            case Constants.ty.Guid:
                return "cfg_";
            default:
                return "cfs_";
        }
    },
    indexBase64Encode: function (toEncode) {
        return this.replaceInvalidChars(Utility.encode(toEncode));
    },
    replaceInvalidChars: function (toReplace) {
        return toReplace.replace(new RegExp("/", 'g'), "_1")
                        .replace(new RegExp("\\+", 'g'), "_2")
                        .replace(new RegExp("=", 'g'), "_3");
    },
    indexBase64Decode: function (toDecode) {
        return Utility.decode(this.unreplaceInvalidChars(toDecode));
    },
    unreplaceInvalidChars: function (toReplace) {
        return toReplace.replace(new RegExp("_1", 'g'), "/")
                        .replace(new RegExp("_2", 'g'), "\\+")
                        .replace(new RegExp("_3", 'g'), "=");
    },
    createSearchComBoBox: function ($container, newSearch) {
        var isInputfieldRendered = false;
        $container.find('span.ui-combobox').remove();
        if ($container.find('.database_field select').combobox('instance')) {
            $container.find('.database_field select').combobox('destroy');
        }
        var validateSearchFields = function (event, isDbField) {
            if (isInputfieldRendered) {
                isInputfieldRendered = false;
                return;
            }
            var $input = $(event.currentTarget);
            // Use the current text in the input to display the autocomplete dropdown
            $input.autocomplete('search');
            // Obtain the autocomplete dropdown jquery element
            var $autocompleteList = $input.autocomplete('widget');
            if ($input.val() !== '') {
                var $select = isDbField ? $container.find('.database_field select') : $container.find('.database_field_criteria select');
                // Obtain the value of the first item in the autocomplete dropdown, but only if the value is visible
                // If the value is not visible the entered input text doesn't correspond to a valid option
                var $lis = $autocompleteList.find('li:visible');
                var val = $lis.eq(0).text();
                var $options = $select.find('option');
                if (val) {
                    var i = 0;
                    var length = $options.length;
                    for (i; i < length; i++) {
                        var $opt = $options.eq(i);
                        var optText = $opt.text();
                        if (val.toLowerCase() === optText.toLowerCase()) {
                            $opt.attr('selected', true);
                            $input.val(optText);
                            var $fieldContainer = $('#field_search .field_search_field').has($input);
                            if (isDbField) {
                                SearchUtil.setSearchCriteria($fieldContainer, newSearch);
                            }
                            else {
                                SearchUtil.retrieveView.setSearchInput($fieldContainer, $opt.val());
                            }
                            break;
                        }
                    }
                }
            }
            // Close the autocomplete dropdown, since it was opened after a blur to obtain the filtered list of results
            if ($input.autocomplete('instance')) {
                $input.autocomplete('close');
            }
        };

        $container.find('.database_field select').combobox({
            onChange: function (data, ui) {
                validateSearchFields(data.event, true);
            },
            selected: function (event, ui) {
                var $fieldContainer = $('#field_search .field_search_field').has($(this));
                SearchUtil.setSearchCriteria($fieldContainer, newSearch);
                isInputfieldRendered = true;
            }
        });

        $container.find('.database_field_criteria select').combobox({
            onChange: function (data, ui) {
                validateSearchFields(data.event);
            },
            selected: function (event, ui) {
                var selectedText = $(ui.item).val();
                var $fieldContainer = $('#field_search .field_search_field').has($(this));
                SearchUtil.retrieveView.setSearchInput($fieldContainer, selectedText);
                isInputfieldRendered = true;
            }
        });        
    },
    operationValueForDate: function (operation, dbFieldValue) {
        var toDate, fromDate, dates;
        var todayDate = SearchUtil.getTodayDate();
        var timeZone = '';

        if (dbFieldValue) {
            var split = dbFieldValue.split(' - ');
            if (split.length === 1) {
                return dbFieldValue;
            }
            toDate = new Date(split[0]);
            fromDate = new Date(split[1]);
            hasTime = toDate.toString().split(' 00:00:00');
            timeZone = hasTime && hasTime.length > 1 ? hasTime[1] : '';
        }
        switch (operation) {
            case "Today":
                todayDate += ' 00:00:00' + timeZone;
                toDate = new Date(todayDate);

                todayDate = SearchUtil.getTodayDate();
                todayDate += ' 23:59:59' + timeZone;
                fromDate = new Date(todayDate);
                break;
            case "Yesterday":
                todayDate += ' 00:00:00' + timeZone;
                toDate = new Date(todayDate);
                toDate.setDate(toDate.getDate() - 1);

                todayDate = SearchUtil.getTodayDate();
                todayDate += ' 23:59:59' + timeZone;
                fromDate = new Date(todayDate);
                fromDate.setDate(fromDate.getDate() - 1);
                break;
            case "Last Seven Days":
                todayDate += ' 00:00:00' + timeZone;
                toDate = new Date(todayDate);
                toDate.setDate(toDate.getDate() - 7);

                todayDate = SearchUtil.getTodayDate();
                todayDate += ' 23:59:59' + timeZone;
                fromDate = new Date(todayDate);
                break;
            case "Last Thirty Days":
                todayDate += ' 00:00:00' + timeZone;
                toDate = new Date(todayDate);
                toDate.setDate(toDate.getDate() - 30);

                todayDate = SearchUtil.getTodayDate();
                todayDate += ' 23:59:59' + timeZone;
                fromDate = new Date(todayDate);
                break;
            case "Month":
                dates = SearchUtil.getDates('Month');
                dates[0] += ' 00:00:00' + timeZone;
                toDate = new Date(dates[0]);

                dates[1] += ' 23:59:59' + timeZone;
                fromDate = new Date(dates[1]);
                break;
            case "Year":
                dates = SearchUtil.getDates('Year');
                dates[0] += ' 00:00:00' + timeZone;
                toDate = new Date(dates[0]);

                dates[1] += ' 23:59:59' + timeZone;
                fromDate = new Date(dates[1]);
                break;
            default:
                return '';
        }
        dbFieldValue = [(toDate).toISOString(), (fromDate).toISOString()];
        dbFieldValue = dbFieldValue.join(' - ');
        return dbFieldValue;
    },
    getTodayDate: function () {
        var date = new Date();
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        var todayDate = month.toString() + "/" + day.toString() + "/" + year.toString();
        return todayDate;
    },
    getDates: function (duration) {
        var date = new Date();
        var dates = [];
        var firstDay;
        var lastDay;
        switch (duration) {
            case 'Month':
                firstDay = new Date(date.getFullYear(), date.getMonth(), 1).format('generalDateOnly');
                lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).format('generalDateOnly');
                dates = [firstDay, lastDay];
                break;
            case 'Year':
                firstDay = new Date(date.getFullYear(), 0, 1).format('generalDateOnly');
                lastDay = new Date(date.getFullYear(), 12, 0).format('generalDateOnly');
                dates = [firstDay, lastDay];
                break;
        }
        return dates;
    }
};