var FormsDataCPX = Backbone.Model.extend({
    idAttribute: 'Category',
    defaults: function () {
        return {
        };
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.SlimFormTemplates) {
            if (this.get('SlimFormTemplates') instanceof Backbone.Collection) {
                this.get('SlimFormTemplates').set(attrs.SlimFormTemplates);
                delete attrs.SlimFormTemplates;
            }
            else {
                attrs.SlimFormTemplates = new SlimFormTemplates(attrs.SlimFormTemplates);
                this.bindSubModelEvents(attrs.SlimFormTemplates, 'SlimFormTemplates');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        switch (method) {
            case 'create':
                // Add a create call
                break;
            case 'update':
                // Add an update call
                break;
            case 'delete':
                // Add a delete call
                break;
        }
    }
});