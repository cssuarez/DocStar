var ColumnSelectView = Backbone.View.extend({
    className: 'ColumnSelectView',
    displayInDialog: false,
    resizeIdx: 0,   // index used to determine when to resize the multiselect when resizing the dialog
    initialize: function (options) {
        var that = this;
        //Options should contain at a minimum the list of fields to choose from (sourceFields), these should be an object of id value pairs ({id:name, id:name})
        //Options may also include item selection (selectedFields), this is an object with id:{order} (id:{order:0}, id:{order:1});
        //Options should also contain at least a save callback, this will be used to communicate the new selection set just as above (id:{order});
        //dialogCallbacks can include saveCallback, cancelCallback, these are called on dialog close.
        this.dialogOptions = $.extend({
            title: Constants.t('selectColumns'),
            width: 450,
            height: 300,
            minWidth: 450,
            minHeight: 300,
            resize: function (ev, ui) {
                if (that.resizeIdx % 2 === 0) {
                    that.resizeSlapbox();
                }
                that.resizeIdx++;
            },
            resizeStop: function (ev, ui) {
                that.resizeIdx = 0;
                that.resizeSlapbox();
            }
        }, options.dialogOptions);
        this.dialogCallbacks = $.extend({}, options.dialogCallbacks);
        this.sourceFields = options.sourceFields;
        this.selectedFields = options.selectedFields || {};
        this.compiledTemplate = doT.template(Templates.get('columnselectviewlayout'));
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.renderDialog();
        this.setupSlapbox();
        return this;
    },
    close: function () {
        if (this.$dialog) {
            DialogsUtil.cleanupDialog(this.$dialog, [Constants.c.save, Constants.c.cancel], true);
        }
    },
    getRenderObject: function () {
        var ro = { fields: [] };
        if (this.sourceFields) {
            var id;
            for (id in this.sourceFields) {
                if (this.sourceFields.hasOwnProperty(id)) {
                    ro.fields.push({
                        Id: id,
                        Name: this.sourceFields[id],
                        Selected: this.selectedFields[id] // undefined if not selected or index (0, 1, ... etc) if it is selected
                    });
                }
            }
            ro.fields.sort(Utility.sortByProperty('Name'));
            ro.fields.sort(function (a, b) {
                var a0 = a.Selected === undefined ? -1 : a.Selected;
                var b0 = b.Selected === undefined ? -1 : b.Selected;
                return a0 - b0;
            });
        }

        return ro;
    },
    // setupSlapbox - setup the ui multiselect list - DO NOT call until after this.$el has been added to the DOM
    setupSlapbox: function () {
        var $el = this.$el;
        $.extend(true, $.ui.multiselect, {
            locale: {
                addAll: '',
                removeAll: '',
                itemsCount: Constants.t('displayColumns')
            }
        });
        var that = this;
        var mselOpts = {
            width: this.$el.width(),
            height: this.$el.height(),
            dividerLocation: 0.5,
            additionalHTML: {}
        };
        var msel = $el.find('.multiselect');
        msel.multiselect(mselOpts);
        this.$el.find(".ui-state-default.ui-element.ui-draggable").css("display", "list-item");
    },
    resizeSlapbox: function () {
        var $multi = this.$el.find('.multiselect');
        if ($multi.multiselect('instance')) {
            $multi.multiselect('option', { width: this.$el.width(), height: this.$el.height() });
            $multi.multiselect('resize');
        }
    },
    saveChanges: function (ev, headers, successCallback, failureCallback) { //NOTE This is called by backboneextensions.js renderDialog
        var options = this.$el.find('.multiselect :selected');
        var result = {};
        var i = 0;
        var length = options.length;
        for (i; i < length; i++) {
            var $o = $(options[i]);
            var id = $o.val();
            result[id] = { order: i };
        }

        Utility.executeCallback(successCallback, result);
    }
});