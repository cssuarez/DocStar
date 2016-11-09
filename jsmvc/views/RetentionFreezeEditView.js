/// <reference path="../../Content/JSProxy/AdminServiceProxy.js" />
// View for editing Freezes
// Renders a compiled template using doU.js
var RetentionFreezeEditView = Backbone.View.extend({
    viewData: {},
    proxy: AdminServiceProxy(),
    events: {
        "change select[name='Id']": "changeSelection",
        "click input[name='save_rc']": "saveChanges",
        "click input[name='release_rc']": "release"
    },
    //new class is fetched from the controller
    //first element in the list is a new freeze
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(window.recordfreezes);
        return this;
    },
    changeSelection: function () {
        var id = this.$("select[name='Id']").val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        }
        else {
            this.viewData.selected = window.recordfreezes.get(id);
        }
        this.render();
    },
    handleKeyPress: function (event) {
        if (event.keyCode === 13) {
            this.saveChanges();
        }
    },

    saveChanges: function () {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        $('#retention_errors').text('');
        var newClass = new RecordFreeze();
        var attrs = DTO.getDTO(this.el);
        if (attrs.Id === Constants.c.emptyGuid) {
            delete attrs.Id;
        }
        var e = newClass.validate(attrs);
        if (e) {
            this.handleErrors(e);
            return;
        }
        if (this.isUnique(attrs)) {
            $('input[name="save_rc"],input[name="release_rc"]').attr('disabled', 'disabled');
            newClass.save(attrs, {
                success: function (model, result) {
                    that.saveSuccess(model, result, attrs.Id, window.recordfreezes, that, '#ui_message_exception');
                        if (that.isNew(attrs.Id)) {
                            window.slimFreezes.add({ Id: model.get('Id'), Name: model.get('Name'), EffectivePermissions: 0 });
                        } else {
                            window.slimFreezes.get(model.get('Id')).attributes.Name = model.get('Name');
                        }                     
                },
                failure: function (message) {
                    that.handleErrors(message);
                }, 
                complete: function () {
                    $('input[name="save_rc"], input[name="release_rc"]').removeAttr('disabled');
                }
            });
        } else {
            ErrorHandler.addErrors({ 'Name': Constants.c.duplicateNameError }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
    },
    /*
    * isUnique check the new against the existing.  
    * if there is an update to the contents and the guid is the same then it is considered unique...
    * @param attrs which contains the Id and Title
    * @return boolean
    */
    isUnique: function (attrs) {
        var unique = true;
        window.recordfreezes.each(function (item) {
            if (attrs.Name.toLowerCase() === item.get('Name').toLowerCase()) {
                if (attrs.Id === Constants.c.emptyGuid || attrs.Id !== item.get('Id')) {
                    unique = false;
                }
            }
        });
        return unique;
    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (error) {
        ErrorHandler.addErrors(error, css.warningErrorClass, "div", css.inputErrorClass);
    },
    release: function (e) {
        //clear errors first
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var that = this;
        var id = $(this.el).find('select[name="Id"]').val();
        if (id !== Constants.c.emptyGuid) {
            $('input[name="save_rc"],input[name="release_rc"]').attr('disabled', 'disabled');
            var success = function (result) {
                var model = window.recordfreezes.get(id);
                window.recordfreezes.remove(model);
                window.slimFreezes.remove(id);
                that.setNewClass();
                that.render();
            };
            var failure = function (xhr, statusText, error) {
                ErrorHandler.addErrors(error.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            };
            var complete = function () {
                $('input[name="save_rc"],input[name="release_rc"]').removeAttr('disabled');
            };
            that.proxy.releaseFreeze(id, success, failure, complete);
        } else {
            var obj = {
                'Id': Constants.c.cannotReleaseNew
            };
            ErrorHandler.addErrors(obj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
        }
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editretentionfreezes'));
        $('#ui_message_exception').dialog({
            autoOpen: false,
            resizable: false,
            modal: true,
            title: Constants.c.recordsRetention,
            width: 'auto',
            buttons: [{
                text: Constants.c.close,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
        return this;
    },
    render: function () {
        // Refresh viewData.list
        this.viewData.listcc = window.recordcategoriesCC;
        this.viewData.list = window.recordfreezes;
        this.viewData.gp = window.gatewayPermissions;
        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }
        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        return this;
    }
});
