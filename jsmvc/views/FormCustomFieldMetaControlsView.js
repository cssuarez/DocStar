var FormCustomFieldMetaControlsView = Backbone.View.extend({
    model: undefined, // Form Template Package  
    className: 'FormCustomFieldMetaControlsView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formcustomfieldmetacontrolslayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.cfmsLeft = [];
        ro.cfmsRight = [];
        var idx = 0;
        var cfms = window.customFieldMetas || [];
        var length = cfms.length;
        for (idx; idx < length; idx++) {
            var cfm = cfms.at(idx);
            var attrs = {
                name: cfm.get('Name'),
                id: cfm.get('Id'),
                tag: cfm.mapTypeToFormTag(true)
            };
            if (idx % 2 === 0) {
                ro.cfmsLeft.push(attrs);
            }
            else {
                ro.cfmsRight.push(attrs);
            }
        }
        ro.showCustomFieldMetas = (ro.cfmsLeft.length + ro.cfmsRight.length) > 0;
        ro.customFieldMetasAccState = Utility.GetUserPreference('customFieldMetasForms') || 'closed';   // by default the accordion should be closed
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});