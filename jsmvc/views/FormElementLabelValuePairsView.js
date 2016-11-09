var FormElementLabelValuePairsView = Backbone.View.extend({
    model: null, // LabelValuePairsCPX
    formElement: undefined, // FormElement
    isNumber: false,
    isDecimal: false,
    collection: new LabelValuePairItems(),
    className: 'FormElementLabelValuePairsView',
    tagName: 'ul',
    labelValuePairItems: [],
    events: {
        'click .ui-icon.ui-icon-plus': 'addNewChoice',
        'click .ui-icon.ui-icon-close': 'deleteChoice',
        'change select[name="Vertical"]': 'changeVertical'
    },
    initialize: function (options) {
        this.options = options;
        this.formElement = options.formElement;

        var bsId = this.formElement.get('BackingStoreId');
        var cfm = window.customFieldMetas.get(bsId);
        this.isNumber = cfm.isNumber();
        this.isDecimal = cfm.isDecimal();
        this.compiledTemplate = doT.template(Templates.get('formelementlabelvaluepairslayout'));
        this.listenTo(this.collection, 'add remove', this.render);
    },
    getRenderObject: function () {
        var ro = this.model.toJSON();
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        var idx = 0;
        var length = this.collection.length;
        this.cleanupChildViews();
        for (idx; idx < length; idx++) {
            var model = this.collection.at(idx);
            model.set('type', this.model.get('type'));
            var lvpi = new FormElementLabelValuePairView({ model: model, displayDelete: this.collection.length > 1, isNumber: this.isNumber, isDecimal: this.isDecimal });
            this.labelValuePairItems.push(lvpi);
            this.$el.append(lvpi.render().$el);
        }
        return this;
    },
    cleanupChildViews: function () {
        var lvpi = this.labelValuePairItems.pop();
        while (lvpi) {
            lvpi.close();
            lvpi = undefined;
            lvpi = this.labelValuePairItems.pop();
        }
    },
    close: function () {
        this.cleanupChildViews();
        this.unbind();
        this.remove();
    },
    //#region Event Handling
    addNewChoice: function (ev) {
        var $targ = $(ev.currentTarget);
        var $li = this.$el.find('li').has($targ);
        var lvpLabel = $li.find('input[name="Label"]').val();
        var lvp = this.collection.get(lvpLabel);
        var idx = this.collection.indexOf(lvp) + 1;
        var collectionLength = this.collection.length;
        var newLVPLabel = Constants.c.choice + ' ' + (collectionLength++);
        while (this.collection.get(newLVPLabel)) {  //Ensure the new label is unique
            newLVPLabel = Constants.c.choice + ' ' + (collectionLength++);
        }
        this.collection.add({ Value: '', Label: newLVPLabel }, { at: idx });
    },
    deleteChoice: function (ev) {
        var $targ = $(ev.currentTarget);
        var $li = this.$el.find('li').has($targ);
        var label = $li.find('input[name="Label"]').val();
        this.collection.remove(this.collection.get(label));
    },
    changeVertical: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('Vertical', Utility.convertToBool($targ.val()));
    }
    //#endregion Event Handling
});