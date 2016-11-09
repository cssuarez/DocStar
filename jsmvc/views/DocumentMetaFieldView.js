//Single Field, collection of fields is DocumentMetaField-->s<--View
var DocumentMetaFieldView = Backbone.View.extend({
    model: undefined, // BulkViewerDataPackageCPX
    options: undefined,
    tagName: "li",
    renderObj: {},
    className: 'DocumentMetaFieldView displayTable metadata_viewer',
    events: {
        "keyup textarea": "textValueChanged",
        "change input": "textValueChanged",
        "change select": "selectValueChanged",
        "focus .keywords, .title": "setRecShortCutParameters"
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('documentmetafieldviewlayout'));
        this.listenTo(this.model, 'change:' + options.valuePath, this.modelValueChanged);
        if (options.modelPath) {
            this.listenTo(this.model, 'change:' + options.modelPath, this.modelValueChanged);
        }
        if (this.options.auditInfo) {
            this.listenTo(this.model, 'change viewAuditInfo', function (model, value, options) {
                if (this.model.get('viewAuditInfo')) {
                    this.$el.show();
                } else {
                    this.$el.hide();
                }
            });
        }

        return this;
    },
    render: function () {
        if (this.model && this.model.get('DocumentPackage')) {
            this.setRenderObject();
            this.$el.html(this.compiledTemplate(this.renderObj));
            this.$el.show();
            if (this.options.hidden || (this.options.auditInfo && !this.model.get('viewAuditInfo'))) {
                this.$el.hide();
            }
            if (this.renderObj.addDatePicker && !this.renderObj.readOnly) {
                var $input = this.$el.find('input');
                if (this.renderObj.fieldName === "duedate" && !!this.renderObj.value) {
                    var today = new Date();
                    var dueDate = new Date(this.renderObj.value);
                    if (today > dueDate) {
                        $input.addClass('inputErrorClass');
                    }
                }
                Utility.addDatePicker($input, { type: 'datetime', displayClearButton: true});
            } else if (this.renderObj.tag === 'textarea') {
                var $textArea = this.$el.find('textarea');
                this.makeResizeable($textArea, true);
            }
        }
        return this;
    },
    close: function () {
        var $input = this.$el.find('input.hasDatepicker');
        // Make sure element exists in the DOM, before attempting to destroy the datetimepicker against it
        if (document.body.contains($input.get(0))) {
            $input.datetimepicker('destroy');
        }

        var $textArea = this.$el.find('textarea');
        if ($textArea.resizable('instance')) {
            $textArea.resizable('destroy');
        }
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    setRecShortCutParameters: function (event) {
        var that = this;
        $('body').trigger('setRecShortCutParameters', {
            lassoShortcutTarget: {
                setValue: function (result) {
                    $(event.currentTarget).val(result);
                    $('body').trigger('recShortCutdone', { currentTarget: $(event.currentTarget) });
                    that.textValueChanged(event);
                }
            }
        });
    },
    setRenderObject: function () {
        this.renderObj = {
            entityList: !!this.options.entities,
            entities: this.options.entities,
            value: this.model.getDotted(this.options.valuePath),
            label: this.options.label,
            tag: this.options.tag,
            fieldName: this.options.fieldName,
            readOnly: !this.options.model.canI(Constants.sp.Modify, Constants.sp.Modify, this.options.fieldName)
        };

        if (this.renderObj.tag === 'datepicker') {
            this.renderObj.tag = 'input';
            this.renderObj.addDatePicker = true;
        }

        if (this.options.idPath) {
            this.renderObj.entityId = this.model.getDotted(this.options.idPath);
            var selectedFound = false;
            var i = 0;
            var length = this.renderObj.entities ? this.renderObj.entities.length : 0;
            for (i; i < length; i++) {
                if (this.renderObj.entities[i].Id === this.renderObj.entityId) {
                    this.renderObj.entities[i].selected = 'selected="selected"';
                    selectedFound = true;
                } else {
                    this.renderObj.entities[i].selected = '';
                }
            }
            if (!selectedFound && this.renderObj.entityId) {
                this.renderObj.entities.push({
                    Id: this.renderObj.entityId,
                    Name: Constants.c.hidden,
                    selected: 'selected="selected"'
                });
            }
        }
    },
    textValueChanged: function (e) {
        var $input = $(e.currentTarget);
        var val = $input.val();
        var setVal = true;
        var rerender = false;
        if (this.renderObj.addDatePicker) {
            var dpDiv = $input.data('datepicker').dpDiv;
            var isOpen = dpDiv ? dpDiv.is(':visible') : false;
            rerender = !isOpen;
            if (val && !DateUtil.isDate(val)) {
                setVal = false;
                $input.addClass(css.warningErrorClass);
            } else {
                if (this.options.label !== Constants.t('dueDate')) {    // Due Date is a dateTime, not just date
                    val = new Date(val).format('generalDateOnly');
                }
                $input.removeClass(css.warningErrorClass);
            }
        }
        if (setVal) {
            if (!rerender) { //ReRender when the type is a datepicker and the datepicker is closed, otherwise do not.
                this.renderObj.value = val;
            }
            this.model.setDotted(this.options.valuePath, val);
        }
    },
    selectValueChanged: function (e) {
        var $sel = $(e.currentTarget);
        var $opt = $sel.find(':selected');
        var val = $opt.val();
        var text = $opt.text();
        this.renderObj.value = text; //tracked so when modelValueChanged event is fired we can tell if it came from this view or another view.        
        if (this.options.idPath) {
            if (val) {
                this.model.setDotted(this.options.idPath, val);
            } else {
                this.model.unsetDotted(this.options.idPath);
            }
        }
        if (text) {
            this.model.setDotted(this.options.valuePath, text);
        } else {
            this.model.unsetDotted(this.options.valuePath);
        }
        if (!val && this.options.unsetPath) {
            this.model.unsetDotted(this.options.unsetPath, { ignoreChange: true }); //Ignore this change, the idPath already triggered the required change.
        }
        
    },
    modelValueChanged: function (m, o) {
        if (this.renderObj && this.renderObj.value !== this.model.getDotted(this.options.valuePath)) {
            this.render();
        }
    },
    makeResizeable: function ($textArea, visible) {
        var that = this;
        $textArea.data('resizeId', this.options.valuePath);
        Utility.SetTextAreaHeightFromUserPreference($textArea);
        $textArea.resizable({
            width: 170,
            height: 24,
            maxWidth: 170,
            maxHeight: 100,
            minWidth: 170,
            minHeight: 20,
            handles: 'se',
            create: function (event, ui) {
                $(this).css({
                    'min-height': 20,
                    'padding': 0,
                    'margin': '3px 0',
                    'top': 0,
                    'width': '90%',
                    'position': 'inherit'
                });
                $(this).find('textarea').css('width', '100%');
                $(this).find('.ui-resizable-handle').css('z-index', 2);
                $(this).find('textarea').off('keyup').on('keyup', function () {
                    Utility.adjustResizeablePosition($textArea);
                });
                setTimeout(function () { Utility.adjustResizeablePosition($textArea); }, 500);
            },
            resize: function (event, ui) {
                var $self = $(ui.element);
                $self.css('width', '90%');
                var $textarea = $self.find('textarea');
                $textarea.css('width', '100%');
                var maxWidth = $self.width();
                $(ui.element).resizable({ maxWidth: maxWidth });
                $('body').trigger('UpdatePerfectScollbars');
            },
            stop: function (event, ui) {
                var elem = $(this).find('textarea')[0];               
                $(elem).css('width', '100%');
                Utility.adjustResizeablePosition($(this).find('textarea'));
                Utility.SetTextAreaHeightPreference(elem);
            }
        });
    }
});