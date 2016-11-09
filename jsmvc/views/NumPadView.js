var NumPadView = Backbone.View.extend({
    model: null,    //Formula
    className: 'NumPadView',
    events: {
        'click span.openParen:not(".disabled")': 'appendOpenParen',
        'click span.closeParen:not(".disabled")': 'appendCloseParen',
        'click span.number:not(".disabled")': 'appendNumber',
        'click span.decimalPoint:not(".disabled")': 'appendNumber',
        'click span.deleteLast:not(".disabled")': 'deleteLast',
        'click span.clearValue:not(".disabled")': 'clearValue',
        'click span.operator:not(".disabled")': 'appendOperator',
        'click span.sum:not(".disabled"):not(".cancelOperation")': 'editSumOperation',
        'click span.cancelOperation:not(".disabled")': 'cancelOperation'
    },
    initialize: function (options) {
        options = options || {};
        this.options = options;
        this.canSum = options.canSum;   // Whether the SUM operation should be enabled/disabled
        this.compiledTemplate = doT.template(Templates.get('numpadlayout'));
        this.$input = options.$input;
        this.listenTo(Backbone, 'customGlobalEvents:keyup', this.viewKeyUp);
        this.listenTo(this.model, 'change:operation', function (model, value, options) {
            if (value) {
                var $operationBtn = this.$el.find('.' + value);
                // Disable all buttons and change corresponding button that entered operation edit mode into a cancel button
                this.cancelSum = value === 'sum';
                this.render();
            }
            else {
                this.cancelSum = false;
                this.render();
            }
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        var summationSymbol = 'Σ';
        ro.cancelSum = this.cancelSum;
        ro.sumClass = this.canSum ? (this.cancelSum ? 'cancelOperation' : 'sum') : 'disabled';
        ro.sumText = this.cancelSum ? Constants.c.cancel + ' ' + summationSymbol : summationSymbol;
        ro.canSum = this.canSum;
        ro.sumTitle = this.canSum ? '' : Constants.c.groupElementsCannotSum;
        return ro;
    },
    render: function (options) {
        options = options || {};
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.delegateEvents();
        if (options.disableAll) {
            this.toggleButtons(this.$el.find('span.custom_button'), true);
        }
        else if (viewData.cancelSum) {
            this.toggleButtons(this.$el.find('span.custom_button:not(.cancelOperation)'), true);
        }
        else {
            this.toggleOperators(!!options.disableOperators);
            this.toggleButtons(this.$el.find('.sum'), !!options.disableSum);
            this.toggleButtons(this.$el.find('.number'), !!options.disableOperands);
            this.toggleDecimal(!!options.disableDecimal);
            this.toggleButtons(this.$el.find('.closeParen'), !!options.disableCloseParen);
            this.toggleButtons(this.$el.find('.openParen'), !!options.disableOpenParen);
        }
        return this;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    toggleOperators: function (disable) {
        var $operators = this.$el.find('.operator');
        this.toggleButtons($operators, disable);
    },
    toggleDecimal: function (disable) {
        var $decimal = this.$el.find('.decimalPoint');
        this.toggleButtons($decimal, disable);
    },
    toggleButtons: function ($buttons, disable) {
        if (disable) {
            $buttons.addClass('disabled');
        }
        else {
            $buttons.removeClass('disabled');
        }
    },
    //#region Event Handling
    viewKeyUp: function (ev) {
        var key = ev.which;
        var isNumber = (key >= 96 && key <= 105) || (key >= 48 && key <= 57);   /* 0 - 9 */
        var isOperator = (key >= 106 && key <= 109) || key === 111 ||  // multiply, add, subtract, divide
            (ev.shiftKey && key === 56) /* multiply */ ||
            (ev.shiftKey && key === 187) /* add */ ||
            key === 189 /* subtract */ ||
            key === 191 /* divide */;
        var isSeparator =
            key === 190 /* period */ ||
            key === 110; /* decimal */
        var isParen = (ev.shiftKey && key === 57) || (ev.shiftKey && key === 48); // '(', ')'
        if (isNumber || isOperator || isSeparator) {
            this.changeInput(ev);
        }
    },
    changeInput: function (ev) {
        //TODO: implement key events for the num pad
    },
    appendNumber: function (ev) {
        var val = this.model.get('Value') || '';
        var $currTarg = $(ev.currentTarget);
        val += $currTarg.text();
        this.model.set('Value', val);
    },
    appendOperator: function (ev) {
        var val = this.model.get('Value') || '';
        var $currTarg = $(ev.currentTarget);
        var operator = $currTarg.text();
        if (operator === 'x') {
            operator = '*';
        }
        val += ' ' + operator + ' ';
        this.model.set('Value', val);
    },
    appendOpenParen: function (ev) {
        var val = this.model.get('Value') || '';
        var $currTarg = $(ev.currentTarget);
        val += ' ' + $currTarg.text() + ' ';
        this.model.set('Value', val);
    },
    appendCloseParen: function (ev) {
        var val = this.model.get('Value') || '';
        var $currTarg = $(ev.currentTarget);
        val += ' ' + $currTarg.text() + ' ';
        this.model.set('Value', val);
    },
    editSumOperation: function (ev) {
        this.model.set('operation', 'sum');
    },
    cancelOperation: function (ev) {
        this.model.set('operation', false);
    },
    clearValue: function () {
        var deleted = this.model.get('Value');
        this.model.set('Value', '', { deletedValues: deleted });
        this.toggleOperators(true);
    },
    deleteLast: function () {
        var val = this.model.get('Value') || '';
        var lastChar = val.slice(-1);
        var deleted = '';
        var lastItemRegEx = /\s*\S+\s*$/ig;
        if (isNaN(parseInt(lastChar, 10))) {
            var deletedVal = val.match(lastItemRegEx);
            if (deletedVal && deletedVal instanceof Array) {
                deleted = deletedVal[0];
            }
            val = val.replace(lastItemRegEx, '');
        }
        else {
            deleted = val.substring(val.length - 1, val.length);
            val = val.substring(0, val.length - 1);
        }
        this.model.set('Value', val, { deletedValues: deleted });
    }
    //#endregion Event Handling
});