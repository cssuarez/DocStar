var FormContentTypeControlsView = Backbone.View.extend({
    model: undefined, // Form Template Package
    className: 'formContentTypeControlsView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('formcontettypecontrolslayout'));
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        var ctId = this.model.getDotted('Template.DefaultContentTypeId');
        var ct = window.contentTypes.get(ctId);
        ro.defaultFieldsLeft = [];
        ro.defaultFieldsRight = [];
        if (ct) {
            var dcfs = ct.getDefaultCustomFields(true);
            var idx = 0;
            var length = dcfs.length;
            for (idx; idx < length; idx++) {
                var cfId = dcfs[idx].CustomFieldMetaID;
                var cf = window.customFieldMetas.get(cfId);
                if (cf) {
                    var cfControlAttrs = this.model.get('Template').mapCFTypeToControl(cf.get('Type'));
                    cfControlAttrs.name = cf.get('Name');
                    cfControlAttrs.id = cf.get('Id');
                    if (idx % 2 === 0) {
                        ro.defaultFieldsLeft.push(cfControlAttrs);
                    }
                    else {
                        ro.defaultFieldsRight.push(cfControlAttrs);
                    }
                }
            }
        }
        ro.showContentTypeFields = (ro.defaultFieldsLeft.length + ro.defaultFieldsRight.length) > 0;
        ro.contentTypeFieldsAccState = Utility.GetUserPreference('contentTypeFieldsForms') || 'open';
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