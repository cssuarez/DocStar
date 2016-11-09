var ImportLDAPGridItemView = Backbone.View.extend({
    model: undefined, // LDAPUser or LDAPGroup
    tagName: 'tr',
    className: 'ImportLDAPGridItemView',
    events: {
        'change .selectedItem': 'changeSelected'
    },
    initialize: function (options) {
        this.colPreferences = options.colPreferences;
        this.compiledTemplate = doT.template(Templates.get('importldapgriditemviewlayout'));
        this.listenTo(this.model, 'change:isSelected', function (model, value, options) {
            this.render();
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {
            cells: [],
            isSelected: this.model.isSelected()
        };
        var idx = 0;
        var length = this.colPreferences.length;
        for (idx; idx < length; idx++) {
            var cp = this.colPreferences[idx].colId;
            ro.cells[idx] = { value: this.model.get(cp), valueId: cp };
        }
        this.numCols = ro.cells.length;
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.data('rowid', this.model.get('AccountName'));
        this.changeSelectedHighlight(viewData.isSelected);
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    changeSelected: function (ev) {
        this.model.set('isSelected', ev.currentTarget.checked);
    },
    changeSelectedHighlight: function (value) {
        if (value) {
            this.$el.addClass('customGridHighlight');
        }
        else {
            this.$el.removeClass('customGridHighlight');
        }
        this.$el.find('.selectedItem').prop('checked', value);
    }
    //#endregion Event Handling
});