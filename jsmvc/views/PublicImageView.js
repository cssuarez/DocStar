var PublicImageView = Backbone.View.extend({
    model: undefined, // Selected PublicImage
    collection: undefined, // PublicImages
    postMessageHelper: null,
    className: 'PublicImageView',
    displayInDialog: false,
    imageSelectionState: 'none', //none, valid, invalid
    $dialog: undefined,
    events: {
        'click .ui-icon.ui-icon-close': 'kill',
        'click .savePublicImageButton': 'saveChanges',
        'keyup input.isCombo': 'changeName'
    },
    initialize: function (options) {
        this.options = options;
        this.collection.addNewField();
        var selectedId = this.model ? this.model.get('Id') : Constants.c.emptyGuid;
        this.collection.setSelected(selectedId);
        this.displayInDialog = this.options.displayInDialog || this.displayInDialog;
        this.dialogOptions = $.extend({
            width: 450,
            height: 175
        }, this.options.dialogOptions);
        this.dialogCallbacks = $.extend({}, this.options.dialogCallbacks);
        var that = this;
        this.compiledTemplate = doT.template(Templates.get('publicimagelayout'));
        this.listenTo(this.collection, 'change:selected', function (model, value) {
            if (value) {
                this.model = model;
            }
            that.render();
        });
        this.listenTo(this.collection, 'add remove', function (model, collection, options) {
            this.resetNew();
            collection.setSelected(Constants.c.emptyGuid, { silent: true });
            that.render();
        });
        this.listenTo(this.collection, 'invalid', function (model, error, options) {
            ErrorHandler.removeErrorTagsElement(this.$el);
            ErrorHandler.addErrors(error, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, "input", "name", this.$el);
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.collection = this.collection;
        ro.selected = this.collection.getSelected();
        ro.iframeSource = Constants.Server_Url + '/GeneralUpload.ashx?uploadType=PublicImage';
        return ro;
    },
    resetNew: function () {
        this.collection.remove(Constants.c.emptyGuid, { silent: true });
        this.collection.addNewField();
    },
    render: function () {
        var that = this;
        this.imageSelectionState = 'none';
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.$el.find('select[name="Id"]').combobox({
            onChange: function (data) {
                that.collection.getSelected().set('Name', that.$el.find('input.isCombo').val());
            },
            onSelect: function (data) {
                var opt = data.ui.item.option;
                var id = opt.value;
                that.resetNew();
                that.collection.setSelected(id);
            }
        });
        if (this.displayInDialog) {
            this.renderDialog();
        }
        // cleanup the post message helper and obtain a new one, because the iframe has been changed due to a re-render
        this.cleanupPostMessageHelper();
        this.getPostMessageHelper();
        return this;
    },
    getPostMessageHelper: function () {
        var that = this;
        var contentWindow = this.$el.find('.uploadIframe')[0].contentWindow;
        if (this.postMessageHelper === null) {
            this.postMessageHelper = PostMessageHelper({
                messageReceived: function (event) { that.messageReceived(event); },
                target: contentWindow,
                targetDomain: '*',
                messageId: Utility.getSequentialGuids(1)[0]
            });
        }
    },
    cleanupPostMessageHelper: function () {
        if (this.postMessageHelper) {
            this.postMessageHelper.close();
        }
        this.postMessageHelper = null;
    },
    close: function () {
        this.cleanupPostMessageHelper();
        this.unbind();
        this.remove();
    },
    setNewClass: function () {
        var newClass = this.getNewClass(this.collection);
        return newClass;
    },
    messageReceived: function (event) {
        if (!event.dataObj) {
            return;
        }
        var selected;
        switch (event.dataObj.Action) {
            case 'initialized':
                selected = this.collection.getSelected();
                this.postMessageHelper.sendMessage({ Action: 'setRestrictions', Restrictions: selected.getRestrictions() });
                break;
            case 'fileSelected':
                if (event.dataObj.Valid) {
                    this.imageSelectionState = 'valid';
                } else {
                    this.imageSelectionState = 'invalid';
                }
                break;
            case 'postResult':
                var result = event.dataObj.Result;
                if (result.Error) {
                    ErrorHandler.addErrors(result.Error.Message);
                    Utility.executeCallback(this.saveFailureCallback);
                    return;
                }
                selected = this.collection.getSelected();
                if (selected.get('Id') === Constants.c.emptyGuid) {
                    selected.set('Name', Constants.c.newTitle, { silent: true });
                    this.collection.add(result.Result); // Add updates public images
                } else {
                    this.collection.getSelected().set(result.Result);
                    this.collection.setSelected(Constants.c.emptyGuid);
                }
                this.updatePublicImages();
                Utility.executeCallback(this.saveSuccessCallback, result.Result);
                break;
        }
    },
    changeName: function (ev) {
        var val = ev.currentTarget.value;
        var m = this.collection.getSelected();
        if (this.inputTimeout) {
            clearTimeout(this.inputTimeout);
        }
        this.inputTimeout = setTimeout(function () {
            m.set('Name', val);
        }, Constants.TypeAheadDelay);
    },
    saveChanges: function (ev, headers, successCallback, failureCallback) { //NOTE This is called by backboneextensions.js renderDialog
        this.saveSuccessCallback = successCallback;
        this.saveFailureCallback = failureCallback;
        var selected = this.collection.getSelected();
        if (!selected.isValid()) {
            // Failure message is handled by a listenTo for invalid
            Utility.executeCallback(failureCallback);
            return;
        }
        ErrorHandler.removeErrorTagsElement(this.$el);
        var existing = window.publicImages.get(selected.get('Id'));
        if (this.imageSelectionState === 'valid') {
            this.postMessageHelper.sendMessage({ Action: 'postFile', AdditionalData: selected.toJSON() });
        } else {
            var that = this;
            if (selected.get('Id') === Constants.c.emptyGuid) {
                ErrorHandler.addErrors(Constants.c.youMustSelectAFile);
                Utility.executeCallback(failureCallback);
                return;
            }
            if (existing.get('Name') !== selected.get('Name')) {
                selected.save(null, {
                    success: function (result) {
                        that.updatePublicImages();
                        Utility.executeCallback(successCallback, selected.toJSON());
                    },
                    failure: function (x, s, e) {
                        Utility.executeCallback(failureCallback, e);
                    }
                });
            } else {
                Utility.executeCallback(successCallback, selected.toJSON());
                that.updatePublicImages();
            }
        }
    },
    kill: function (ev) {
        var that = this;
        var model = that.collection.getSelected();
        var id = model.get('Id');
        DialogsUtil.generalPromptDialog(String.format(Constants.t('deletePublicImagePrompt'), model.get('Name')), function (cleanup) {
            model.destroy({ wait: true });
            window.publicImages.remove(id);
            Utility.executeCallback(cleanup);
        }, null, {
            title: Constants.t('delete'),
            resizable: false
        });
    },
    updatePublicImages: function () {
        // Update window.publicImages, excluding -- New --
        var collection = new PublicImages(this.collection.toJSON());
        collection.remove(Constants.c.emptyGuid);
        window.publicImages.reset(collection.toJSON());
    }
});