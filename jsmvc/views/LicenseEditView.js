/// <reference path="../../Content/LibsExternal/a_jquery.js" />
var LicenseEditView = Backbone.View.extend({
    viewData: {},
    gridView: undefined,
    subGrid: undefined,
    className: 'LicenseEditView',
    events: {
        "click input.licenseSubmit, span.licenseSubmit": "submitProvisioningCode",
        "click #genReq": "generateRequest",
        "click span.gridExpander": "expandCollapseRow"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('licenselayout'));
        return this;
    },
    render: function () {
        this.viewData.list = window.licStats;
        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);
        this.setLicenseGrid();
        return this;
    },
    close: function () {
        this.closeSubGrid();
        if (this.gridView) {
            this.gridView.close();
            this.gridView = undefined;
        }
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    setLicenseGrid: function () {
        // initialize the grid to display licensing
        var that = this;
        this.closeSubGrid();
        if (this.gridView) {
            this.gridView.close();
            this.gridView = undefined;
        }
        var options = {
            renderObject: this.getGridRenderObject(),
            onRowSelect: function (o) { that.gridRowSelected(o); },
            onSortGrid: function (o) { that.sortGrid(o); }
        };
        this.gridView = new StaticDataGridView(options);
        this.$el.find('.licenseLayoutCurrent').append(this.gridView.render().$el);
    },
    getGridRenderObject: function () {
        var ro = {
            headers: [],
            rows: []
        };
        ro.headers.push({ value: ' ', style: 'width: 30px;' }); //Subgrid expander
        ro.headers.push({ columnId: 'Name', value: Constants.c.licenseName, style: 'width: 50%;' });
        ro.headers.push({ columnId: 'Term', value: Constants.c.term, style: 'width: 25%;' });
        ro.headers.push({ columnId: 'QuantityTotal', value: Constants.c.total, style: 'width: 60px;' });
        ro.headers.push({ columnId: 'QuantityUsed', value: Constants.c.used, style: 'width: 60px;' });
        ro.headers.push({ columnId: 'Expiration', value: Constants.c.expiration, style: 'width: 25%;' });
        ro.headers.push({ columnId: 'Disabled', value: Constants.c.status, style: 'width: 60px;' });

        this.getGridRows(ro);
        return ro;
    },
    getGridRows: function (ro) {
        ro.rows = [];
        var data = window.licStats;
        var length = data.length;
        var i = 0;
        var rev_lt = Utility.reverseMapObject(Constants.lt);
        for (i = 0; i < length; i++) {
            var item = data.at(i);
            var term = item.get('Term');
            var expandable = item.hasSubgridData();
            var expandableCell = ' ';
            if (expandable) {
                if (item.get('expanded')) {
                    expandableCell = '<a style="cursor:pointer;"><span class="gridExpander ui-icon ui-icon-triangle-1-s" data-itemid="' + item.get('Id') + '"></span></a>';
                } else {
                    expandableCell = '<a style="cursor:pointer;"><span class="gridExpander ui-icon ui-icon-triangle-1-e" data-itemid="' + item.get('Id') + '"></span></a>';
                }
            }
            var row = {
                rowClass: item.isSelected() ? 'customGridHighlight' : '',
                id: item.get('Id'),
                values: [
                    expandableCell,
                    item.get('Name'),
                    rev_lt[term],
                    item.getTotal(),
                    item.getUsed(),
                    term === Constants.lt.Perpetual ? '' : DateUtil.convertToJSDatetime(item.get('Expiration')),
                    item.get('Disabled') ? Constants.c.disabled : Constants.c.enabled
                ]
            };
            ro.rows.push(row);
        }
    },
    gridRowSelected: function (options) {
        var $target = $(options.ev.currentTarget);
        window.licStats.setSelectedAndExpanded(options.rowId, $target.find('.gridExpander').length > 0);
        if (!options.$td.hasClass('customGridHighlight')) {
            this.reRenderGridAndSubgrid();
        }
    },
    sortGrid: function (options) {
        window.licStats.sortByColumn(options.columnid);
        this.reRenderGridAndSubgrid();
    },
    expandCollapseRow: function (e) {
        var $sel = $(e.currentTarget);
        var id = $sel.data('itemid');
        if (id) {
            window.licStats.setSelectedAndExpanded(id, true);
            this.reRenderGridAndSubgrid();
        }
    },
    setLicenseSubGrid: function ($td, rowId) {
        var that = this;
        this.closeSubGrid();
        var ro = {
            headers: [{ value: Constants.c.usedBy }],
            rows: [],
            onRowSelect: function (o) {
                that.subGrid.$el.find('tr').removeClass('customGridHighlight');
                options.$td.addClass('customGridHighlight');
            }
        };
        var lsItem = window.licStats.get(rowId);
        var usedBy = lsItem ? lsItem.get('UsedBy') : '';
        if (usedBy) {
            var i = 0;
            var length = usedBy.length;
            for (i; i < length; i++) {
                ro.rows.push({
                    rowClass: '',
                    id: usedBy[i],
                    values: [usedBy[i]]
                });
            }
        }
        this.subGrid = new StaticDataGridView({ makeScrollable: false, renderObject: ro });

        var $newRow = $(document.createElement('tr'));
        $newRow.addClass('subgridRow');
        var firstTD = document.createElement('td');
        var iconSpan = document.createElement('span');
        iconSpan.className = 'ui-icon ui-icon-arrowreturn-1-e';
        firstTD.appendChild(iconSpan);
        var $container = $(document.createElement('td'));
        $container.attr('colspan', 6);
        $container.html(this.subGrid.render().$el);
        $newRow.append(firstTD);
        $newRow.append($container);

        $td.after($newRow);
    },
    reRenderGridAndSubgrid: function () {
        var ro = this.gridView.sdOptions.renderObject;
        this.getGridRows(ro);
        this.gridView.render();
        var expandedId = window.licStats.getExpandedId();
        if (expandedId) {
            var $td = this.gridView.$el.find('[data-rowid="' + expandedId + '"]');
            this.setLicenseSubGrid($td, expandedId);
        } else {
            this.closeSubGrid();
        }
    },
    closeSubGrid: function () {
        if (this.subGrid) {
            var $td = this.$el.find('.subgridRow');
            this.subGrid.close();
            this.subGrid = undefined;
            $td.remove();
        }
    },
    handleErrors: function (model, error) {
        var errors = {};
        if (error.statusText === undefined) {
            errors.ct_Error = error;
        }
        else {
            errors.ct_Error = error.statusText;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    },
    submitProvisioningCode: function () {
        var that = this;
        if ($('.licenseSubmit').hasClass('updating') || $('.licenseSubmit').is(':disabled')) {
            return;
        }
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var provisionCode = this.getProvCode();
        if (!provisionCode) {
            ErrorHandler.addErrors({ 'provisioningCode': Constants.c.provisionCodeCannotBeNull }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return;
        }
        $('#importLicenseIFrame').contents().find('#fid').attr('disabled', true);
        $('span.licenseSubmit').addClass('updating');
        Utility.toggleInputButtons('input', false);
        window.provisioningCode = provisionCode;
        $.ajax({
            url: Constants.Url_Base + 'Licensing/UpdateLicenses',
            data: { "provisioningCode": provisionCode },
            type: "post",
            success: function (response) {
                if (response.status === 'ok') {
                    window.licStats.reset(window.licStats.parse(response.result.newLicStats));
                    that.render();
                    $('#systemExpired').val('false');
                } else {
                    ErrorHandler.addErrors(response.message);
                }
            },
            complete: function () {
                $('span.licenseSubmit').removeClass('updating');
                Utility.toggleInputButtons('input', true);
                $('#importLicenseIFrame').contents().find('#fid').attr('disabled', false);
            }
        });
    },
    generateRequest: function () {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var provisionCode = this.getProvCode();
        if (!provisionCode) {
            ErrorHandler.addErrors({ 'provisioningCode': Constants.c.provisionCodeCannotBeNull }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return;
        }
        window.provisioningCode = provisionCode;
        $('#importLicenseIFrame').contents().find('#fid').attr('disabled', true);
        $('span.licenseSubmit').addClass('updating');
        Utility.toggleInputButtons('input', false);
        $('#genReqIFrame').attr('src', Constants.Url_Base + 'Licensing/GenerateRequestFile?provisioningCode=' + provisionCode);
        //TODO: scain remove this setTimeout...
        setTimeout(function () {
            $('#importLicenseIFrame').contents().find('#fid').attr('disabled', false);
            $('span.licenseSubmit').removeClass('updating');
            Utility.toggleInputButtons('input', true);
        }, 1000);
    },
    getProvCode: function () {
        return $.trim($('#provisioningCode').val()) || $.trim($('#provisioningCode').text());
    }
});