/// <reference path="../../Content/LibsInternal/Utility.js" />
var WatchView = Backbone.View.extend({
    model: undefined, // Watch
    viewData: {},
    className: 'watchView',
    events: {
        'change select[name="CustomFieldId"]': 'changeCF',
        'change input[name="IsTrue"]': 'changeIsTrue',
        'change input[type="radio"]': 'changeGrouping'
    },
    initialize: function (options) {
        options = options || {};
        this.compiledTemplate = doT.template(Templates.get('watchlayout'));
        this.colorView = new InlayColorView({ selectedColor: this.model.get('Color') });
        this.listenTo(this.colorView.collection, 'change:isSelected', function (model, value, options) {
            if (value) {
                this.model.set('Color', model.get('Color'));
            }
        });
        return this;
    },
    close: function () {
        this.model.destroy();
        this.unbind();
        this.remove();
    },
    render: function () {
        this.viewData = this.getRenderObject();
        var html = this.compiledTemplate(this.viewData);
        this.$el.html(html);
        this.$el.addClass(this.className || '');
        var grouping = this.model.get('Grouping') || 'any';
        this.$el.find('[name="Grouping_' + this.cid + '"][value="' + grouping + '"]').prop('checked', true);
        this.$el.find('[name="IsTrue"]').prop('checked', Utility.convertToBool(this.model.get('IsTrue')));
        this.renderColorView();
        this.delegateEvents(this.events);
        return this;
    },
    getRenderObject: function () {
        var ro = {};
        var listcfs = window.customFieldMetas;
        var idx = 0;
        var cfsLen = listcfs.length;
        var $div = $(document.createElement('select'));
        for (idx; idx < cfsLen; idx++) {
            var cf = listcfs.at(idx);
            var cfId = cf.get('Id');
            // obtain each custom field of type boolean
            if (cf.get('Type') === Constants.ty.Boolean) {
                // create an option to inject the custom field data into
                var name = cf.get('Name');
                var attrs = {
                    id: cfId
                };
                if (this.model.get('CustomFieldId') === cfId) {
                    attrs.selected = true;
                }
                var html = Utility.safeHtmlValue(cfId, {
                    tag: 'option',
                    attrs: attrs,
                    text: name
                });
                $div.append(html);
            }
        }
        ro.booleanCustomFieldsHTML = $div.get(0).innerHTML;
        ro.viewId = this.cid;

        return ro;
    },
    renderColorView: function () {
        var $colorPicker = this.$el.find('.colorPicker');
        $colorPicker.append(this.colorView.render().$el);
    },
    deleteWatch: function (ev) {
        var that = this;
        var func = function () {
            that.close();
        };
        this.$el.fadeOut(300, func);
    },
    changeCF: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('CustomFieldId', $targ.val());
    },
    changeIsTrue: function (ev) {
        this.model.set('IsTrue', ev.currentTarget.checked);
    },
    changeGrouping: function (ev) {
        var $targ = $(ev.currentTarget);
        this.model.set('Grouping', $targ.val());
    }
});