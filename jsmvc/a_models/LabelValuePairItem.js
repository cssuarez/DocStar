var LabelValuePairItem = Backbone.Model.extend({
    idAttribute: 'Label',
    defaults: { IsSelected: false },
    initialize: function () {
        var hasValue = this.hasValue();
        if (!hasValue) {
            this.set('Value', this.get('Label') || false);  // if there is no value use the label, if there is no label just set it to false
        }
    },
    hasValue: function () {
        var value = this.getValue();
        return value !== null && value !== undefined && value !== '';
    },
    getValue: function () {
        return this.get('Value');
    }
});