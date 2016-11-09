var PawnsInlineView = Backbone.View.extend({
    tagName: 'span',
    className: 'PawnsInlineView sPngIB gearIcon noAccordionEvent',
    events: {
        'click': 'renderDialog'
    },
    initialize: function (options) {
        this.options = options;
    },
    render: function () {
        this.$el.attr('title', Constants.t('pawnsConfig'));
        return this;
    },
    renderDialog: function () {
        this.closeSubView();
        var position = { my: 'left top', at: 'right top', of: this.$el };
        this.subview = new PawnsView({ displayInDialog: true, position: position });
        this.$el.append(this.subview.render().$el.hide());
        this.subview.renderDialog();
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
    }
});