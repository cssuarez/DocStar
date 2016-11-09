var ContentTypeBuilderFieldSettingView = Backbone.View.extend({
    tagName: 'li',
    viewData: {},
    events: {
        "change input[type='checkbox']": "changeDefault"
    },

    //#region View Rendering
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('ctbfieldsettinglayout'));
        this.field = this.options.field;
    },
    getRenderObject: function () {
        var ro = {};
        ro.field = this.field;
        ro.selectedContentType = this.options.selectedContentType;
        ro.fieldId = ro.field.value;
        ro.fieldName = ro.field.text;
        ro.displayDefault = ro.field.displayDefault;
        ro.displayRegion = ro.field.displayRegion;
        ro.isDefault = ro.field.selected;
        ro.displayShowHide = true;
        ro.showField = ro.field.showField === undefined ? true : ro.field.showField;
        ro.displayRelated = ro.field['class'] && ro.field['class'].match('ctbRelatable') ? ro.field['class'].match('ctbRelatable').length > 0 : false;
        ro.displayEdit = ro.field['class'] && ro.field['class'].match('ctbEditable') ? ro.field['class'].match('ctbEditable').length > 0 : false;
        ro.isRelated = ro.field['class'] && ro.field['class'].match('isRelated') ? ro.field['class'].match('isRelated').length > 0 : false;
        ro.defaultFieldHTML = true;
        ro.displayReorderIcon = true;
        if (ro.fieldId === Constants.c.emptyGuid) {
            ro.displayShowHide = false;
            ro.displayReorderIcon = false;
        }
        ro.showFieldTooltip = this.getShowFieldTooltip();
        ro.hideFieldTooltip = this.getHideFieldTooltip();
        return ro;
    },
    getShowFieldTooltip: function () {
        return Constants.c.showField + (this.options.field.showFieldTooltip ? ' - ' + this.options.field.showFieldTooltip : '');
    },
    getHideFieldTooltip: function () {
        return Constants.c.hideField + (this.options.field.hideFieldTooltip ? ' - ' + this.options.field.hideFieldTooltip : '');
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        this.$el.attr('id', this.viewData.fieldId);
        var defaultFieldHTML = this.getDefaultFieldHTML();
        this.$el.find('.defaultFieldHTMLContainer > div').append(defaultFieldHTML);
        return this.$el;
    },
    //#endregion View Rendering

    //#region Field Rendering
    getDefaultFieldHTML: function () {
        var html = '';
        var selectListOptions = {};
        switch (this.viewData.fieldId) {
            case 'ctb_Workflow':
                selectListOptions = {
                    slimCollection: window.slimWorkflows,
                    includeEmptyItem: true,
                    selectName: 'DefaultWorkflowId',
                    selectedId: this.viewData.selectedContentType.get('DefaultWorkflowId')
                };
                html = this.createSelectListHTML(selectListOptions);
                html.title = Constants.t('defaultWorkflowTitle');
                break;
            case 'ctb_SecurityClass':
                selectListOptions = {
                    slimCollection: window.slimSecurityClasses,
                    includeEmptyItem: false,
                    selectName: 'DefaultSecurityClassId',
                    selectedId: this.viewData.selectedContentType.get('DefaultSecurityClassId')
                };
                html = this.createSelectListHTML(selectListOptions);
                html.title = Constants.t('defaultSecurityClassTitle');
                break;
            case 'ctb_RecordCategory':
                selectListOptions = {
                    slimCollection: window.slimRecordCategories,
                    includeEmptyItem: true,
                    selectName: 'DefaultRecordCategoryId',
                    selectedId: this.viewData.selectedContentType.get('DefaultRecordCategoryId')
                };
                html = this.createSelectListHTML(selectListOptions);
                html.title = Constants.t('defaultRecordsCategoryTitle');
                break;
            case 'ctb_Inbox':
                selectListOptions = {
                    slimCollection: window.slimInboxes,
                    includeEmptyItem: true,
                    selectName: 'DefaultInboxId',
                    selectedId: this.viewData.selectedContentType.get('DefaultInboxId')
                };
                html = this.createSelectListHTML(selectListOptions);
                html.title = Constants.t('defaultInboxTitle');
                break;
            case 'ctb_Folder':
                var folderOptions = {
                    id: this.viewData.selectedContentType.get('DefaultFolderId'),
                    name: this.viewData.selectedContentType.get('DefaultFolderName') || ''
                };
                html = this.createFolderHTML(folderOptions);
                html.title = Constants.t('defaultFolderTitle');
                break;
            case 'ctb_Title':
            case 'ctb_Keywords':
            case 'ctb_Created':
            case 'ctb_Modified':
            case 'ctb_Accessed':
            case 'ctb_DueDate':
            case Constants.c.emptyGuid: // Intentional fall throughs, no additional html to be set for the above fields
                html = '';
                break;
            default:
                // Custom fields fall here
                // Provide a select list that will display Custom Lists, Typeahead datalinks, and dropdown datalinks with optgroups separating each
                var idx = 0;
                var defaultFields = this.viewData.selectedContentType.get('DefaultCustomFields') || [];
                var length = defaultFields.length;
                var defaultField = {};
                var cfmId = this.viewData.fieldId.split('_')[1];
                for (idx = 0; idx < length; idx++) {
                    if (cfmId === defaultFields[idx].CustomFieldMetaID) {
                        defaultField = defaultFields[idx];
                        break;
                    }
                }
                var cfm = window.customFieldMetas.get(cfmId);
                var fieldType = '';
                if (cfm) {
                    fieldType = cfm.get('Type');
                }
                html = this.createOverridableListSelectList(defaultField, !this.viewData.isDefault, fieldType);
                html.title = Constants.t('overridableList');
        }
        return html;
    },
    createSelectListHTML: function (options) {
        options = options || {};
        var slimCollection = options.slimCollection || [];
        var includeEmptyItem = options.includeEmptyItem || false;
        var selectName = options.selectName || '';
        var selectedId = options.selectedId || '';
        var select = document.createElement('select');
        select.name = selectName || '';
        if (includeEmptyItem) {
            select.appendChild(document.createElement('option'));
        }
        var length = slimCollection.length || 0;
        for (idx = 0; idx < length; idx++) {
            var item = slimCollection.at(idx);
            var opt = document.createElement('option');
            opt.value = item.get('Id');
            opt.textContent = item.get('Name');
            if (opt.value === selectedId) {
                opt.selected = true;
            }
            select.appendChild(opt);
        }
        return select;
    },
    createOverridableListSelectList: function (defaultField, disabled, fieldtype) {
        var select = document.createElement('select');
        select.name = 'OverridableList';
        var emptyOption = document.createElement('option');
        emptyOption.selected = true;
        select.appendChild(emptyOption);
        var optGroupCustomLists = document.createElement('optgroup');
        optGroupCustomLists.label = Constants.c.listName;
        var optGroupTypeAheadDataLinks = document.createElement('optgroup');
        optGroupTypeAheadDataLinks.label = Constants.c.typeAheadQueries;
        var optGroupDropdownDataLinks = document.createElement('optgroup');
        optGroupDropdownDataLinks.label = Constants.c.dropdownQueries;
        var item;
        var opt;
        // Append Custom Lists
        var idx = 0;
        var length = window.slimCustomLists.length;
        if (fieldtype === Constants.ty.Object) {
            for (idx = 0; idx < length; idx++) {
                item = window.slimCustomLists.at(idx);
                opt = document.createElement('option');
                opt.value = item.get('Id');
                opt.textContent = item.get('Name');
                if (item.get('Name') === defaultField.ListName) {
                    opt.selected = true;
                }
                optGroupCustomLists.appendChild(opt);
            }
            select.appendChild(optGroupCustomLists);
        }
        // Append TypeAhead DataLinks
        length = window.typeAheadQueries.length;
        for (idx = 0; idx < length; idx++) {
            item = window.typeAheadQueries[idx];
            opt = document.createElement('option');
            opt.value = item.Id;
            opt.textContent = item.Name;
            if (opt.value === defaultField.TypeAheadDataLinkId) {
                opt.selected = true;
            }
            optGroupTypeAheadDataLinks.appendChild(opt);
        }
        select.appendChild(optGroupTypeAheadDataLinks);
        // Append Dropdown DataLinks
        length = window.dropdownQueries.length;
        for (idx = 0; idx < length; idx++) {
            item = window.dropdownQueries[idx];
            opt = document.createElement('option');
            opt.value = item.Id;
            opt.textContent = item.Name;
            if (opt.value === defaultField.DropDownDataLinkId) {
                opt.selected = true;
            }
            optGroupDropdownDataLinks.appendChild(opt);
        }
        select.appendChild(optGroupDropdownDataLinks);
        $(select).prop('disabled', disabled);
        return select;
    },
    createFolderHTML: function (options) {
        var html = document.createElement('div');
        var input = document.createElement('input');
        input.name = 'DefaultFolderName';
        input.readOnly = true;
        input.value = options.name;
        var icon = document.createElement('span');
        Utility.setElementClass(icon, 'sPngIB folder_icon');
        var hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'DefaultFolderId';
        hiddenInput.value = options.id || '';   // undefined is turned into a string and we don't want that
        html.appendChild(icon);
        html.appendChild(input);
        html.appendChild(hiddenInput);
        return html;
    },
    //#endregion Field Rendering

    //#region Event Handling
    changeDefault: function (event) {
        var $targ = $(event.currentTarget);
        var isChecked = $targ.get(0).checked;
        this.$el.find('select[name="OverridableList"]').prop('disabled', !isChecked);
        $targ.attr('title', isChecked ? Constants.c.included : Constants.c.notIncluded);
    }
    //#endregion Event Handling
});