var FormulaBuilderView = Backbone.View.extend({
    model: undefined, // Formula
    numpadView: null,
    inEditMode: false,  // Whether or not the builder should appear to be in edit mode
    className: 'FormulaBuilderView',
    events: {
        'click .ui-icon-pencil': 'enterEditMode',
        'click .saveIcon:not(.disabledIcon)': 'saveEditing',
        'click .ui-icon-cancel': 'cancelEditing'
    },
    initialize: function (options) {
        this.options = options;
        this.canSum = options.canSum;   // whether the formula builder allows the summation operation
        this.compiledTemplate = doT.template(Templates.get('formulabuilderlayout'));
        this.numpadView = new NumPadView({ model: this.model, canSum: options.canSum });
        this.listenTo(Backbone, 'customGlobalEvents:keyup', this.viewKeyUp);
        this.listenTo(this.model, 'change:Value', function (model, value, options) {
            options = options || {};
            if (options.ignoreChange) {
                return;
            }
        });
        this.listenTo(this.model, 'change:DisplayValue', function (model, value, options) {
            this.$el.find('textarea').val(value);
        });
        this.listenTo(this.model, 'change:editing', function (model, value, options) {
            this.render();
        });
        this.listenTo(this.model, 'change:operation', function (model, value, options) {
            this.render();
        });
        this.listenTo(this.model, 'validate:Value', function (model, response, options) {
            this.handleFormulaValidation(response);
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {
            formulaMessage: this.formulaMessage || '',
            formulaError: this.formulaError || '',
            saveIconClass: '',
            textareaClass: this.textareaClass || ''
        };
        ro.formula = this.model.get('DisplayValue');
        ro.inEditMode = !!this.model.get('editing');
        if (this.validationResponse) {
            ro.saveIconClass = this.validationResponse.IsValid || !this.model.get('Value') ? '' : 'disabledIcon';
        }
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        // render the numpad when in edit mode
        if (viewData.inEditMode) {
            var renderOpts = this.getNumPadRenderOptions(this.validationResponse);
            this.$el.find('.numpadContainer').append(this.numpadView.render(renderOpts).$el);
        }
        return this;
    },
    ///<summary>
    /// Determine what should and shouldn't be enabled for the num pad view, based on what was returned from the validation
    ///</summary>
    getNumPadRenderOptions: function (response) {
        var renderOpts = {};
        if (response) {
            // Disable buttons that aren't expected
            if (!Utility.hasFlag(response.Expected, Constants.fe.DecimalPoint)) {
                renderOpts.disableDecimal = true;
            }
            if (!Utility.hasFlag(response.Expected, Constants.fe.Digits)) {
                renderOpts.disableOperands = true;
            }
            if (!Utility.hasFlag(response.Expected, Constants.fe.Operator)) {
                renderOpts.disableOperators = true;
            }
            if (!Utility.hasFlag(response.Expected, Constants.fe.CloseParen)) {
                renderOpts.disableCloseParen = true;
            }
            if (!Utility.hasFlag(response.Expected, Constants.fe.OpenParen)) {
                renderOpts.disableOpenParen = true;
            }
            if (!Utility.hasFlag(response.Expected, Constants.fe.OpenSumExpr)) {
                renderOpts.disableSum = true;
            }
        }
        renderOpts.canSum = this.canSum;
        return renderOpts;
    },
    handleFormulaValidation: function (response) {
        if (response.IsValid || !$.trim(response.RemainingChars)) {
            this.textareaClass = '';
            // Construct 'what should be next' message from response
            this.formulaMessage = this.generateValidationMessage(response);
        }
        else {
            this.textareaClass = 'warningErrorClass';
            // Construct error message
            var remainingChars = $.trim(response.RemainingCharsForDisplay);
            var formulaPartInError = remainingChars ? String.format(Constants.t('invalidFormulaPart'), '\r\n', response.RemainingCharsForDisplay) : '';
            var parsedChars = $.trim(response.ParsedCharsForDisplay);
            var formulaPartValid = parsedChars ? String.format(Constants.t('validFormulaPart'), '\r\n', response.ParsedCharsForDisplay) : '';
            var msg = formulaPartInError + '\r\n\r\n' + formulaPartValid;
            this.formulaMessage = msg;
        }
        // Generate an error message for a missing close parenthesis, if it is missing
        this.formulaError = this.generateCloseParenValidationMessage(response);
        this.validationResponse = response;
        this.render();
    },
    generateValidationMessage: function (response) {
        var revFE = Utility.reverseMapObject(Constants.fe);
        var expectedMsg = '';
        // Create Operand messages
        if (Utility.hasFlag(response.Expected, Constants.fe.Operand)) {
            var expectedOperand = Constants.t('expectedFormulaPartOperand');
            var operandMsg = String.format(Constants.t('fe_' + revFE[Constants.fe.Operand]), '\r\n\t');
            expectedMsg += String.format(expectedOperand, '\r\n', operandMsg);
        }
        else if (Utility.hasFlag(response.Expected, Constants.fe.Digits) && Utility.hasFlag(response.Expected, Constants.fe.DecimalPoint)) {
            if (expectedMsg) {
                expectedMsg += '\r\n\r\n';
            }
            var expectedDigitsAndDecimal = Constants.t('expectedFormulaPart');
            var digitsAndDecimalMsg = Constants.t('fe_' + revFE[Constants.fe.Digits]) + ' ' + Constants.t('or') + ' ' + Constants.t('fe_' + revFE[Constants.fe.DecimalPoint]);
            expectedMsg += String.format(expectedDigitsAndDecimal, '\r\n\t', digitsAndDecimalMsg);
        }
        else if (Utility.hasFlag(response.Expected, Constants.fe.Digits)) {
            if (expectedMsg) {
                expectedMsg += '\r\n\r\n';
            }
            var expectedDigits = Constants.t('expectedFormulaPart');
            expectedMsg += String.format(expectedDigits, '\r\n\t', Constants.t('fe_' + revFE[Constants.fe.Digits]));
        }
        else if (Utility.hasFlag(response.Expected, Constants.fe.DecimalPoint)) {
            if (expectedMsg) {
                expectedMsg += '\r\n\r\n';
            }
            var expectedDecimal = Constants.t('expectedFormulaPart');
            expectedMsg += String.format(expectedDecimal, '\r\n\t', Constants.t('fe_' + revFE[Constants.fe.DecimalPoint]));
        }
        // Create operator messages
        if (Utility.hasFlag(response.Expected, Constants.fe.Operator)) {
            if (expectedMsg) {
                expectedMsg += '\r\n\r\n';
            }
            var expectedOperator = Constants.t('expectedFormulaPartOperator');
            expectedMsg += String.format(expectedOperator, '\r\n\t', Constants.t('fe_' + revFE[Constants.fe.Operator]));
        }
        return expectedMsg;
    },
    generateCloseParenValidationMessage: function (response) {
        var errorMsg = '';
        if (Utility.hasFlag(response.Expected, Constants.fe.CloseParen)) {
            var expectedCloseParen = Constants.t('formulaMissingItem');
            var revFE = Utility.reverseMapObject(Constants.fe);
            errorMsg += String.format(expectedCloseParen, '\r\n\t', Constants.t('fe_' + revFE[Constants.fe.CloseParen]) + '\r\n\r\n');
        }
        return errorMsg;
    },
    close: function () {
        this.numpadView.close();
        this.unbind();
        this.remove();
    },
    saveChanges: function (options) {
        options = options || {};
        var that = this;
        // Validate the formula before attempting to save.
        // If the formula is invalid display an error message dialog
        var validCallback = function (validationResponse) {
            that.model.set('editing', false, { clearStoredValues: true });
            Utility.executeCallback(options.callback);
        };
        var invalidCallback = function (validationResponse) {
            var msg = that.generateValidationMessage(validationResponse);
            msg += that.generateCloseParenValidationMessage(validationResponse);
            var diagOpts = {
                msg: msg,
                title: String.format(Constants.t('invalidFormula')),
                resizable: false
            };
            DialogsUtil.generalCloseDialog(null, diagOpts);
            Utility.executeCallback(options.callback);
        };
        this.model.save(null, {
            validCallback: validCallback,
            invalidCallback: invalidCallback
        });
    },
    //#region Event Handling
    ///<summary>
    /// Exit editing the formula
    ///</summary>
    cancelEditing: function (ev) {
        var diagOpts = {
            title: Constants.t('saveFormulaChanges'),
            resizable: false
        };
        var that = this;
        var okFunc = function (cleanup) {
            that.saveChanges({
                callback: function () {
                    Utility.executeCallback(cleanup);
                }
            });
        };
        var closeFunc = function (cleanup) {
            that.model.set('editing', false);
            Utility.executeCallback(cleanup);
        };
        // Only prompt to save if the formula is dirty
        if (this.model.get('isDirty')) {
            var msg = String.format(Constants.t('unsavedChanges'), Constants.t('formula'));
            DialogsUtil.generalSaveDirtyPromptDialog(msg, okFunc, closeFunc, diagOpts);
        }
        else {
            closeFunc();
        }
    },
    saveEditing: function (ev) {
        // save the changes that have been made, so that any listeners (eg. FormElementSettingsView, will know to update its value)
        this.saveChanges();
    },
    ///<summary>
    /// Enter editing the formula
    ///</summary>
    enterEditMode: function (ev) {
        this.model.set('editing', true);
    },
    viewKeyUp: function (e) {
        if (e.which === 27 && this.model.get('editing')) {
            this.cancelEditing();
        }
    }
    //#endregion Event Handling
});