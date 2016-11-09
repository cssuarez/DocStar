var FormsDesignerFormPartView = Backbone.View.extend({
    model: null, // Form Template Package
    collection: null, // FormParts - set in initialize
    current: null,  // Form Part    - set in initialize
    className: 'FormsDesignerFormPartView',
    events: {
        'click .ui-icon-seek-start, .ui-icon-seek-prev, .ui-icon-seek-next, .ui-icon-seek-end': 'changeCurrentFormPart',
        'change input[name="Sequence"]': 'changeCurrentFormPart',
        'change input[name="ResetsApprovals"]': 'changeResetsApprovals',
        'input input[name="BookmarkLabel"]': 'changeBookmarkLabel',
        'click .ui-icon-close:not(.disabled)': 'kill',
        'click .ui-icon-plus:not(.disabled)': 'add',
        'click .insertPart:not(.disabled)': 'insert'
    },
    initialize: function (options) {
        this.options = options;
        this.collection = this.model.get('Parts');
        this.collection.setCurrent(1);
        this.current = this.collection.getCurrent();
        this.compiledTemplate = doT.template(Templates.get('formsdesignerformpartlayout'));
        this.listenTo(this.collection, 'add', function (model, collection, options) {
            var currentSeq = model.get('Sequence');
            this.goToFormPart(currentSeq + 1, options);
        });
        this.listenTo(this.collection, 'remove', function (model, collection, options) {
            this.model.removeFormPartItems(model.get('Id'));
            var currentSeq = model.get('Sequence');
            this.goToFormPart(currentSeq, options);
        });
        this.listenTo(this.collection, 'change:current', function (model, value, options) {
            if (value) {
                this.current = model;
                this.render();
            }
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = this.current.toJSON();
        ro.index = this.collection.indexOf(this.current);
        ro.collection = this.collection.toJSON();
        ro.totalFormParts = this.collection.length;
        ro.resetsApprovalsChecked = ro.ResetsApprovals ? 'checked="checked"' : '';
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.cleanupChildViews();
        this.canvasView = new FormsDesignerCanvasView({ model: this.model });
        this.$el.append(this.canvasView.render().$el);
        var $sequence = this.$el.find('input[name="Sequence"]');
        $sequence.numeric({ negative: false, decimal: false });
        $sequence.focus();
        var seq = $sequence.val();
        $sequence.get(0).value = '';
        $sequence.get(0).value = seq;
        return this;
    },
    cleanupChildViews: function () {
        if (this.canvasView && this.canvasView.close) {
            this.canvasView.close();
        }
    },
    close: function () {
        this.cleanupChildViews();
        this.unbind();
        this.remove();
    },
    goToFormPart: function (partIndex, options) {
        if (partIndex <= 0) {
            partIndex = 1;
        }
        if (partIndex >= this.collection.length) {
            partIndex = this.collection.length;
        }
        if (partIndex !== this.collection.indexOf(this.current) + 1) {
            this.collection.setCurrent(partIndex, options);
        }
    },
    //#region Event Handling
    changeCurrentFormPart: function (ev) {
        var $targ = $(ev.currentTarget);
        var current = this.current;
        var currentFormPartIdx = this.collection.indexOf(current) + 1;
        if ($targ.hasClass('ui-icon-seek-start')) {
            currentFormPartIdx = 1;
        }
        else if ($targ.hasClass('ui-icon-seek-prev')) {
            currentFormPartIdx -= 1;
        }
        else if ($targ.hasClass('ui-icon-seek-next')) {
            currentFormPartIdx += 1;
        }
        else if ($targ.hasClass('ui-icon-seek-end')) {
            currentFormPartIdx = this.collection.length;
        }
        else {
            currentFormPartIdx = this.$el.find('input[name="Sequence"]').val();
        }

        this.goToFormPart(currentFormPartIdx);
    },
    changeResetsApprovals: function (ev) {
        var $targ = $(ev.currentTarget);
        var current = this.current;
        current.set('ResetsApprovals', $targ.is(':checked'));
    },
    changeBookmarkLabel: function (ev) {
        var $targ = $(ev.currentTarget);
        this.current.set('BookmarkLabel', $targ.val());
    },
    kill: function (ev) {
        if (this.collection.length > 1) {
            var that = this;
            var okFunc = function (cleanup) {
                that.current.destroy({
                    success: function () {
                        Utility.executeCallback(cleanup);
                    },
                    ignoreChange: true
                });
            };
            var diagOpts = {
                height: 150
            };
            DialogsUtil.generalPromptDialog(Constants.t('deleteFormPartPrompt'), okFunc, null, diagOpts);
        }
    },
    add: function (ev, sequence) {
        sequence = sequence || this.collection.length;
        var fpId = Utility.getSequentialGuids(1)[0];
        this.collection.add({
            Id: fpId,
            Sequence: sequence,
            BookmarkLabel: Constants.t('part') + ' - ' + (sequence + 1)
        }, { at: sequence, ignoreChange: true });
    },
    insert: function (ev) {
        var sequence = this.collection.indexOf(this.current);
        this.add(ev, sequence + 1);
    }
    //#endregion Event Handling
});