var AceEditorView = Backbone.View.extend({
    className: 'AceEditorView',
    events: {
    },
    initialize: function (options) {
        options = options || {};
        this.options = options;
        this.value = options.value || '';
        this.saveChanges = options.saveChanges;
        this.dialogOptions = options.dialogOptions;
        this.displayInDialog = options.displayInDialog;
        this.compiledTemplate = doT.template(Templates.get('aceeditorlayout'));
        ace.config.set('basePath', Constants.Url_Base + 'Content/LibsExternal/ace');    // sets base path for ace, so it knows where to find files
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        return ro;
    },
    render: function () {
        var that = this;
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));

        this.editor = ace.edit(this.$el.find('.aceEditor').get(0));
        this.editor.setShowPrintMargin(false);
        // enable autocompletion and snippets
        ace.config.loadModule('ace/ext/language_tools', function () {
            that.editor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true,
                enableLiveAutocompletion: true
            });
            ace.config.loadModule('ace/snippets/javascript', function () { });
        });
        if (this.displayInDialog) {
            this.dialogOptions = $.extend(this.dialogOptions, {
                open: function () {
                    that.setEditorOptions();
                },
                resize: function () {
                    that.editor.resize();
                },
                close: function () {
                    that.close();
                }
            });
            this.renderDialog();
        }
        else {
            that.setEditorOptions();
        }
        return this;
    },
    setEditorOptions: function () {
        this.editor.setTheme('ace/theme/chrome', function () { });
        this.editor.getSession().setMode('ace/mode/javascript');
        this.editor.setValue(this.value);
        this.editor.focus();
        this.editor.clearSelection();
        this.editor.gotoLine(0, 0);
    },
    close: function () {
        DialogsUtil.isDialogInstanceClose(this.$dialog);
        this.editor.destroy();
        this.unbind();
        this.remove();
    },
    executeDialogSave: function (callback, failureFunc) {
        if (this.saveChanges) {
            this.saveChanges(callback, failureFunc);
        }
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});