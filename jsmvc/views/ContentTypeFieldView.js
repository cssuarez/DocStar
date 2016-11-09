var ContentTypeFieldView = Backbone.View.extend({
    viewData: {},
    events: {
        "click input.showDCheckbox": "defaultCFChanged"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('contenttypefieldlayout'));
        this.viewData.selectedContentType = options.selected;
        return this;
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        //this.initCFGrid();    // Commented out so Content Type page can still be used
        return this.$el;
    },
    getRenderObject: function () {
        var ro = {};
        ro.listcf = window.customFieldMetas;
        ro.selectedContentType = this.viewData.selectedContentType;
        return ro;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    getDefaultCustomFields: function () {
        var dcfs = [];
        var ctId = this.viewData.selectedContentType.get('Id');
        var $fields = this.$el.find('#ctFields .showDCheckbox:checked');
        var i = 0;
        var fieldLength = $fields.length;
        for (i = 0; i < fieldLength; i++) {
            var $field = $fields.eq(i);
            var listName="";
            var qId = !$.isEmptyObject($field.parent().parent().find('select').val()) ? decodeURI($field.parent().parent().find('select').val()) : '';
            var tadlId = null;
            var ddlId = null;
            if (qId) {
                var j = 0;
                var length = window.typeAheadQueries.length;
                for (j = 0; j < length; j++) {
                    if (window.typeAheadQueries[j].Id === qId) {
                        tadlId = qId;
                    }
                }
                length = window.dropdownQueries.length;
                for (j = 0; j < length; j++) {
                    if (window.dropdownQueries[j].Id === qId) {
                        ddlId = qId;
                    }
                }
                if (ddlId === null && tadlId === null) {
                    listName = qId;
                }
            }
            var dcf = {
                ContentTypeID: ctId,
                CustomFieldMetaID: $field.val(),
                TypeAheadDataLinkId: tadlId,
                DropDownDataLinkId: ddlId,
                ListName: listName
            };
            dcfs.push(dcf);
        }
        return dcfs;
    },
    getRelatedCustomFields: function () {
        var rcfs = [];
        var $fields = this.$el.find('#ctFields .showRCheckbox:checked');
        var i = 0;
        var length = $fields.length;
        for (i = 0; i < length; i++) {
            var $field = $fields.eq(i);
            var rcf = {
                RelatedCustomFieldId: $field.val()
            };
            rcfs.push(rcf);
        }
        return rcfs;
    },
    initCFGrid: function () {
        var that = this;
        var width = 390;
        this.$el.find('#ctFields').jqGrid({
            height: 147,
            minHeight: 147,
            width: width,
            datatype: "local",
            editurl: 'clientArray',
            cellEdit: true,
            cellsubmit: 'clientArray', colNames: ['Id', Constants.c.isDefault, Constants.c.isRelated, Constants.c.name, Constants.c.listName, 'cfType'],
            colModel: [
                { name: 'entityId', index: 'entityId', width: 95, align: 'center', hidden: true, key: true },
                { name: 'isDefault', index: 'isDefault', width: 85, sortable: false, align: 'center', editable: false, formatter: that.showDCheckbox },
                { name: 'isRelated', index: 'isRelated', width: 110, sortable: false, align: 'center', editable: false, formatter: that.showRCheckbox },
                { name: 'name', index: 'name', width: 130, align: 'center', sortable: true, editable: false },
                { name: 'listName', index: 'listName', width: 240, sortable: false, editable: false, title: false, formatter: that.showListSelection },
                { name: 'cfType', index: 'cfType', width: 250, align: 'center', hidden: true, key: true }
            ],
            gridComplete: function () {
                var that = this;
                setTimeout(function () {
                    $(that).setGridWidth(width);
                }, 0);
            }
        });
        var i = 1;
        var idx = 0;
        var dcfs = this.viewData.selectedContentType.get('DefaultCustomFields') || [];
        var rcfs = this.viewData.selectedContentType.get('RelatedCustomFields') || [];
        var length = this.viewData.listcf.length;
        for (idx = 0; idx < length; idx++) {
            var item = this.viewData.listcf.at(idx);
            var cfId = item.get('Id');
            if (cfId !== Constants.c.emptyGuid) {
                var cfIdx = 0;
                var cfLen = dcfs.length;
                var dcf = {};
                var cf;
                for (cfIdx = 0; cfIdx < cfLen; cfIdx++) {
                    cf = dcfs[cfIdx];
                    if (cf.CustomFieldMetaID === cfId) {
                        dcf = cf;
                        break;
                    }
                }
                var rcf = {};
                cfLen = rcfs.length;
                for (cfIdx = 0; cfIdx < cfLen; cfIdx++) {
                    cf = rcfs[cfIdx];
                    if (cf.RelatedCustomFieldId === cfId) {
                        rcf = cf;
                        break;
                    }
                }
                var gdModel = {
                    entityId: cfId,
                    name: item.get('Name'),
                    isDefault: !$.isEmptyObject(dcf),
                    isRelated: !$.isEmptyObject(rcf),
                    listName: $.isEmptyObject(dcf) ? '' : dcf.ListName,
                    cfType: item.get('Type'),
                    typeAheadId: $.isEmptyObject(dcf) ? '' : dcf.TypeAheadDataLinkId,
                    dropDownId: $.isEmptyObject(dcf) ? '' : dcf.DropDownDataLinkId
                };
                this.$el.find('#ctFields').jqGrid('addRowData', i, gdModel);
                i++;
            }
        }
    },
    showDCheckbox: function (cellvalue, options, rowObject) {
        var checked = cellvalue ? "checked='checked'" : "";
        return "<input class='showDCheckbox' type='checkbox' value='" + rowObject.entityId + "' " + checked + "/>";
    },
    showRCheckbox: function (cellvalue, options, rowObject) {
        var checked = cellvalue ? "checked='checked'" : "";
        return "<input class='showRCheckbox' type='checkbox' value='" + rowObject.entityId + "' " + checked + "/>";
    },
    showListSelection: function (cellvalue, options, rowObject) {
        var length = 0;
        var i = 0;
        var cls = window.customLists;
        var disabled = rowObject.isDefault ? '' : 'disabled="disabled"';
        var cfFormat = '<option></option>';
        if (rowObject.cfType === 1) {
            cfFormat += '<optgroup label="' + Constants.c.listName + '">';
            cls.each(function (item) {
                if (item.get('Name') === cellvalue) {
                    cfFormat += '<option selected="selected" value="' + encodeURI(item.get('Name')) + '">' + Utility.safeHtmlValue(item.get('Name')) + '</option>';
                }
                else {
                    cfFormat += '<option value="' + encodeURI(item.get('Name')) + '">' + Utility.safeHtmlValue(item.get('Name')) + '</option>';
                }
            });
            cfFormat += '</optgroup>';

        }
        window.typeAheadQueries = window.typeAheadQueries || [];    // Ensure that window.typeAheadQueries is defined
        length = window.typeAheadQueries.length;
        if (length > 0) {
            cfFormat += '<optgroup label="' + Constants.c.typeAheadQueries + '">';
        }
        for (i = 0; i < length; i++) {
            if (rowObject.typeAheadId === window.typeAheadQueries[i].Id) {
                cfFormat += '<option selected="selected" value="' + window.typeAheadQueries[i].Id + '">' + window.typeAheadQueries[i].Name + '</option>';
            }
            else {
                cfFormat += '<option value="' + window.typeAheadQueries[i].Id + '">' + window.typeAheadQueries[i].Name + '</option>';
            }
        }
        if (length > 0) {
            cfFormat += '</optgroup>';
        }

        length = window.dropdownQueries.length;
        if (length > 0) {
            cfFormat += '<optgroup label="' + Constants.c.dropdownQueries + '">';
        }
        for (i = 0; i < length; i++) {
            if (rowObject.dropDownId === window.dropdownQueries[i].Id) {
                cfFormat += '<option selected="selected" value="' + window.dropdownQueries[i].Id + '">' + window.dropdownQueries[i].Name + '</option>';
            }
            else {
                cfFormat += '<option value="' + window.dropdownQueries[i].Id + '">' + window.dropdownQueries[i].Name + '</option>';
            }
        }
        if (length > 0) {
            cfFormat += '</optgroup>';
        }

        return '<select ' + disabled + '>' + cfFormat + '</select>';
    },
    defaultCFChanged: function (e) {
        var isChecked = $(e.currentTarget).is(':checked');
        var select = $(e.currentTarget).parent().parent().find('select');
        if (isChecked) {
            select.prop('disabled', false);
        }
        else {
            select.prop('disabled', true);
            select.find('option').removeAttr('selected');
        }
    }
});