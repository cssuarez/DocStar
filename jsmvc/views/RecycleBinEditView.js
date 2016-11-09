var RecycleBinEditView = Backbone.View.extend({
    collection: undefined, //DeletedDocuments
    gridView: undefined,
    className: 'RecycleBinEditView',
    events: {
        "click input[name='restore_docs']": "restoreDocuments",
        "click input[name='delete_docs']": "deleteDocuments",
        "click input[name='refresh_docs']": "refreshDocuments",

        "click .selectOne": "selectOne"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('recyclebinlayout'));
        this.collection = new DeletedDocuments();
        this.listenTo(this.collection, 'sync', this.render);
        this.collection.fetch();
        return this;
    },
    render: function () {
        var html_data = this.compiledTemplate({});
        this.$el.html(html_data);
        this.setupGrid();
        this.delegateEvents();
        return this;
    },
    setupGrid: function () {
        if (this.gridView) {
            this.gridView.close();
            this.gridView = undefined;
        }
        var ro = {
            headers: [
                { value: this.getHeaderCheckBox(), style: 'width: 20px;' },
                { columnId: 'Title', value: Constants.c.title, style: 'width: 25%;' },
                { columnId: 'CreatedOn', value: Constants.c.created, style: 'width: 25%;' },
                { columnId: 'ModifiedOn', value: Constants.c.modified, style: 'width: 25%;' },
                { columnId: 'Keywords', value: Constants.c.keywords, style: 'width: 25%;' }
            ],
            rows: []
        };
        var that = this;
        var options = {
            renderObject: ro,
            onRowSelect: function (o) { that.gridRowSelected(o); },
            onSortGrid: function (o) { that.sortGrid(o); },
            selectAllItemsChanged: function (o) { that.selectAll(o); },
            getGridCollection: function () { return that.getGridCollection(); }
        };
        this.getGridRows(ro);
        this.gridView = new StaticDataGridView(options); //This is a borderline usage of the static grid, this view proably deserves its own grid view with item views for optimal performance.
        this.$el.find('.deletedDocsGridContainer').html(this.gridView.render().$el);
    },
    getHeaderCheckBox: function () {
        var allSelected = this.collection.areAllSelected();
        return '<input type="checkbox" class="selectAllItems"' + (allSelected ? 'checked="checked"' : '') + '>';
    },
    getGridRows: function (ro) {
        ro.rows = [];
        var i = 0;
        var length = this.collection.length;
        for (i; i < length; i++) {
            var dd = this.collection.at(i);
            var row = {
                rowClass: dd.isSelected() ? 'customGridHighlight' : '',
                id: dd.get('Id'),
                values: [
                    '<input type="checkbox" class="selectOne" data-modelid="' + dd.get('Id') + '" ' + (dd.isSelected() ? 'checked="checked"' : '') + '>',
                    Utility.safeHtmlString(dd.get('Title')),
                    dd.get('CreatedOn') || '',
                    dd.get('ModifiedOn') || '',
                    Utility.safeHtmlString(dd.get('Keywords')) || ''
                ]
            };
            ro.rows.push(row);
        }
    },
    gridRowSelected: function (options) {
        var ev = options.ev;
        var rowId = options.rowId;
        var $td = options.$td;
        this.gridView.onGridRowSelect(rowId, $td, ev);
        var ro = this.gridView.sdOptions.renderObject;
        this.getGridRows(ro);
        ro.headers[0].value = this.getHeaderCheckBox();
        this.gridView.render();
    },
    getGridCollection: function () {
        return this.collection;
    },
    sortGrid: function (options) {
        this.collection.sortByColumn(options.columnid);
        var ro = this.gridView.sdOptions.renderObject;
        this.getGridRows(ro);
        this.gridView.render();
    },
    restoreDocuments: function () {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        $('input[name="restore_docs"]').attr('disabled', 'disabled');
        $('input[name="delete_docs"]').attr('disabled', 'disabled');
        var that = this;
        var success = function (resp) {
            that.collection.fetch();
        };
        var error = function (jqXHR, textStatus, errorThrown) {
            that.handleErrors(errorThrown);
            that.collection.fetch();
        };
        var complete = function () {
            $('input[name="restore_docs"]').removeAttr('disabled');
            $('input[name="delete_docs"]').removeAttr('disabled');
        };
        this.collection.restoreAllSelected(success, error, complete);
    },
    deleteDocuments: function (confirmed) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var isConfirmed = false;
        var data = this.collection.getSelectedIds();
        if (data.length === 0) {
            return;
        }
        var length = data.length;
        var totalDeleted = 0;
        var that = this;
        $('#delete_Confirm').dialog({
            autoOpen: false,
            resizable: false,
            width: 'auto',
            modal: true,
            title: Constants.c.recycleBin,
            buttons: [{
                text: Constants.c.yes,
                click: function () {
                    var sf = function (deleteCount) {
                        totalDeleted += deleteCount;
                        var msg = String.format(Constants.c.recycleDeleteXofY, totalDeleted, length);
                        $("#statusMsg").text(msg);
                    };
                    var ff = function (errorThrown) {
                        that.handleErrors(errorThrown);
                    };
                    var cf = function () {
                        $('input[name="restore_docs"]').removeAttr('disabled');
                        $('input[name="delete_docs"]').removeAttr('disabled');
                        $("#statusMsg").text("");
                        that.collection.fetch();
                    };
                    that.collection.purgeAllSelected(sf, ff, cf);
                    $(this).dialog('close');
                }
            }, {
                text: Constants.c.no,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
        $('#selectionCount').html(data.length);
        $('#delete_Confirm').dialog('open');
    },
    refreshDocuments:function (confirmed) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        $("#statusMsg").text("");
        this.collection.fetch();
},
    selectAll: function (o) {
        o = o || {};
        var ev = o.ev;
        var isChecked = $(ev.currentTarget).is(':checked');
        if (isChecked) {
            this.collection.selectAll();
        } else {
            this.collection.clearSelected();
        }
        var ro = this.gridView.sdOptions.renderObject;
        this.getGridRows(ro);
        ro.headers[0].value = this.getHeaderCheckBox();
        this.gridView.render();
    },
    selectOne: function (e) {
        var $sel = $(e.currentTarget);
        var isChecked = $sel.is(':checked');
        var id = $sel.data('modelid');
        var m = this.collection.get(id);
        if (m) {
            m.set('isSelected', isChecked);
        }
        var ro = this.gridView.sdOptions.renderObject;
        this.getGridRows(ro);
        ro.headers[0].value = this.getHeaderCheckBox();
        this.gridView.render();
    },
    handleErrors: function (error) {
        var errors = {};
        if (error.statusText === undefined) {
            errors.rb_Error = error;
        }
        else {
            errors.rb_Error = error.statusText;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    }

});
