var FormElementLabelValuePairView = Backbone.View.extend({
    model: null,    // LabelValuePairItem
    isNumber: undefined, // Whether or not the value should be a number
    isDecimal: undefined, // Whether or not the value shoudl allow a decimal
    className: 'FormElementLabelValuePairView',
    tagName: 'li',
    events: {
        'change input[type="checkbox"], input[type="radio"]': 'changeIsSelected',
        'input input[name="Label"], input[name="Value"]': 'changeInput'
    },
    initialize: function (options) {
        this.options = options;
        this.isNumber = options.isNumber;
        this.isDecimal = options.isDecimal;
        this.displayDelete = this.options.displayDelete;
        this.compiledTemplate = doT.template(Templates.get('formelementlabelvaluepairlayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = this.model.toJSON();
        ro.displayDelete = this.displayDelete;
        ro.labelValueType = this.model.get('type');
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        if (this.isNumber) {
            this.$el.find('input[name="Value"]').numeric({ decimal: this.isDecimal ? '' : false });
        }
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    changeIsSelected: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('IsSelected', $targ.is(':checked'));
    },
    changeInput: function (ev) {
        var $targ = $(ev.currentTarget);
        var name = $targ.attr('name');
        var that = this;
        if (this.changeInputTimeout) {
            clearTimeout(this.changeInputTimeout);
        }
        this.changeInputTimeout = setTimeout(function () {
            that.model.set(name, $targ.val());
        }, Constants.TypeAheadDelay);
    }
    //#endregion Event Handling
});