var ContentTypeBuilderInlineView = Backbone.View.extend({
    model: undefined, // Content Type
    tagName: 'span',
    className: 'ContentTypeBuilderInlineView sPngIB gearIcon noAccordionEvent',
    events: {
        'click': 'renderDialog'
    },
    initialize: function (options) {
        options = options || {};
        options.dialogOptions = options.dialogOptions || {};
        this.isSmall = options.isSmall;
        this.position = options.dialogOptions.position;
        this.options = options;
    },
    render: function () {
        if (this.isSmall) {
            this.$el.removeClass('gearIcon').addClass('gearIconSmall');
        }
        this.$el.attr('title', Constants.t('contentTypeBuilder'));
        return this;
    },
    renderDialog: function () {
        this.closeSubView();
        var position = this.position || { my: 'left top', at: 'right top', of: this.$el };
        // Ensure there is a position 'of' property
        if (!position.of || position.of.length === 0) {
            position.of = this.$el;
        }
        this.options.dialogOptions.position = position;
        this.subview = new ContentTypeBuilderEditView($.extend(this.options, { model: this.model }));
        this.$el.append(this.subview.render().hide());
    },
    closeSubView: function () {
        if (this.subview) {
            this.subview.close();
        }
    },
    close: function () {
        this.closeSubView();
        this.unbind();
        this.remove();
    },
    getCT: function () {
        return this.subview.model;
    },
    setContentTypeId: function (ctId) {
        this.model = window.contentTypes.get(ctId);
    }
});