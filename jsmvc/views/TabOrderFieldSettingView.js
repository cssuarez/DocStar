var TabOrderFieldSettingView = Backbone.View.extend({
    tagName: 'li',
    viewData: {},
    events: {},
    //#region View Rendering
    initialize: function (options) {
        this.options = options || {};
        this.compiledTemplate = doT.template(Templates.get('tofieldsettinglayout'));
        this.field = this.options.field;
    },
    getRenderObject: function () {
        var ro = {};
        ro.field = this.field;
        ro.fieldId = ro.field.value;
        ro.fieldName = ro.field.text;
        ro.displayShowHide = true;
        ro.showField = ro.field.showField === undefined ? true : ro.field.showField;
        ro.displayReorderIcon = true;
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
        return this.$el;
    }
    //#endregion View Rendering
});