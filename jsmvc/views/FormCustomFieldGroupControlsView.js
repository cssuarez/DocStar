var FormCustomFieldGroupControlsView = Backbone.View.extend({
    model: undefined, // Form Template Package  
    className: 'formCustomFieldGroupControlsView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formcustomfieldgroupcontrolslayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.cfgsLeft = [];
        ro.cfgsRight = [];
        var idx = 0;
        var length = window.customFieldMetaGroupPackages.length;
        for (idx; idx < length; idx++) {
            var cfgPkg = window.customFieldMetaGroupPackages.at(idx);
            var attrs = {
                name: cfgPkg.get('CustomFieldGroup').Name,
                id: cfgPkg.get('CustomFieldGroup').Id
            };
            if (idx % 2 === 0) {
                ro.cfgsLeft.push(attrs);
            }
            else {
                ro.cfgsRight.push(attrs);
            }
        }
        ro.showCustomFieldGroups = (ro.cfgsLeft.length + ro.cfgsRight.length) > 0;
        ro.customFieldGroupsAccState = Utility.GetUserPreference('customFieldGroupsForms') || 'open';
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