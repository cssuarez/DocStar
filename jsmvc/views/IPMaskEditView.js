var IPMaskEditView = Backbone.View.extend({

    viewData: {},
    events: {
        "change select[name='Id']": "changeSelection",
        "click input[name='save_ipmask']": "saveChanges",
        "click input[name='delete_ipmask']": "kill",
        "click input[name='add_ipMask']": "createNew",
        "click input[name='testIP']": "testIP"
    },
    testIP: function () {
        var attrs = {};
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var handleErrors = this.handleErrors;
        attrs.ipAddress = $('#testIPAddress').val();
        //do not allow blank ip addresses for test
        if (attrs.ipAddress === '') {
            alert(Constants.c.testIPFailure);
            return;
        }
        $.ajax({
            url: Constants.Url_Base + 'IPMask/TestIP',
            data: attrs,
            type: "post",
            success: function (response) {
                if (response.status === "ok") {
                    alert(response.result.message);
                }
                else {
                    handleErrors(null, response.message);
                }
            }
        });
    },
    //new class is fetched from the controller
    //first element in the list is an empty buzz space
    setNewClass: function () {
        this.viewData.selected = window.ipMasks.first();
        if (!this.viewData.selected) {
            this.viewData.selected = new IPMask();
        }
        return this;
    },
    changeSelection: function () {
        var id = this.$("select[name='Id']").val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        }
        else {
            var model = window.ipMasks.get(id);
            this.viewData.selected = model;
        }
        this.render();
    },
    createNew: function () {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var handleErrors = this.handleErrors;
        var attrs = DTO.getDTO("#addNew");
        $.ajax({
            url: Constants.Url_Base + 'IPMask/AddIPMasks',
            data: attrs,
            type: "post",
            success: function (response) {
                if (response.status === "ok") {
                    window.ipMasks.reset(window.ipMasks.parse(response));
                }
                else {
                    handleErrors(null, response.message);
                }
            }
        });
    },
    saveChanges: function () {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var newClass = new IPMask();
        var attrs = DTO.getDTO("#companyIPMaskDTO");
        if (!attrs.IPAddress) {
            ErrorHandler.addErrors({ 'IPAddress': Constants.c.ipAddressRequired }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return;
        }
        if (!attrs.SubnetAddress) {
            ErrorHandler.addErrors({ 'SubnetAddress': Constants.c.subnetAddressRequired }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return;
        }
        newClass.on("invalid", function (model, error) { that.handleErrors(model, error); });
        newClass.save(attrs, {
            success: function (result, response) {
                that.saveSuccess(result, response, attrs.Id, window.ipMasks, that);
            }
        });
    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (model, error) {
        var errors = {};
        if (error.statusText === undefined) {
            errors.ip_Error = error;
        }
        else {
            errors.ip_Error = error.statusText;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    },
    kill: function (e) {
        //clear errors first
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var handleErrors = this.handleErrors;
        var id = $('select[name="Id"]').val();
        if (!id) {
            return;
        }
        if (id !== Constants.c.emptyGuid) {
            var model = window.ipMasks.get(id);
            // HttpDelete won't send an Id to our Api method (on some browsers?)
            // so make a post to a delete method
            $.ajax({
                url: Constants.Url_Base + 'IPMask/DeleteIPMask',
                data: { "Id": id },
                type: "post",
                success: function (response) {
                    if (response.status === "ok") {
                        window.ipMasks.remove(model);
                    }
                    else {
                        handleErrors(model, response.message);
                    }
                }
            });
        }
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editipmasklayout'));
        return this;
    },
    render: function () {
        // Refresh viewData.list
        this.viewData.list = window.ipMasks;
        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }
        $(this.el).html(this.compiledTemplate(this.viewData));
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        if (this.viewData.selected.get('Id')) {  // If there is an ip selected disable save / delete buttons
            $('input[name="save_ipmask"], input[name="delete_ipmask"]').removeAttr('disabled', 'disabled');
        }
        else {  // If there is no ip selected enable save / delete buttons
            $('input[name="save_ipmask"], input[name="delete_ipmask"]').attr('disabled', 'disabled');
        }
        return this;
    }
});