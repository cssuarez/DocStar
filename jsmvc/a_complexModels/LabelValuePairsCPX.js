var LabelValuePairsCPX = Backbone.Model.extend({
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.LabelValuePairs) {
            if (this.get('LabelValuePairs') instanceof Backbone.Collection) {
                this.get('LabelValuePairs').set(attrs.LabelValuePairs);
                delete attrs.LabelValuePairs;
            }
            else {
                attrs.LabelValuePairs = new LabelValuePairItems(attrs.LabelValuePairs);
                this.bindSubModelEvents(attrs.LabelValuePairs, 'LabelValuePairs');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    }
});