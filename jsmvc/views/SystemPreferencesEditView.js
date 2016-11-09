// View for editing a SystemPreferences
// Renders a compiled template using doU.js
var SystemPreferencesEditView = Backbone.View.extend({
    viewData: {},
    emptyGuid: Constants.c.emptyGuid,
    events: {
        "change select[name='Id']": "changeSelection",
        "click input[name='save_ss']": "saveChanges",
        "click input[name='Name']": "clickName",
        "change select[name='Type']": "showValue",
        "keypress form": "handleKeyPress"
    },
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(window.systemPreferences);
        return this;
    },
    clickName: function () {
        if (this.$("select[name='Id']").val() === this.emptyGuid) {
            if (this.$("input[name='Name']").val().toLowerCase() === Constants.c.newTitle.toLowerCase()) {
                this.$("input[name='Name']").val("");
            }
        }
        else {
            this.$('input[name="Name"]').focus().select();
        }
    },
    showValue: function () {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var value = this.viewData.selected.get('Value');
        var type = this.$("select[name='Type']").val();
        // remove whatever is shown now
        $('#val_type').remove();
        if (type.toLowerCase() === 'bool') {
            // Set value to input checkbox instead of input text
            $('#val_type_cont').append($('<input/>').attr('id', "val_type").attr('type', "checkbox").attr('name', "Value").attr('checked', value.toLowerCase() === 'true'));
        }
        else if (type.toLowerCase() === 'int') {
            // Set value to input text  
            var matches = /^[0-9]*$/.exec(value);
            if (matches === null) {
                value = null;
            }
            $('#val_type_cont').append($('<input/>').attr('id', "val_type").attr('type', "text").attr('name', "Value").val(value)
                .numeric({ negative: false, decimal: false }));
        }
        else if (type.toLowerCase() === 'datetime') {
            var dateArr = value.split('/');
            if (dateArr.length === 3) {
                $('#val_type_cont').append($('<input/>').attr('id', "val_type").attr('type', "text").attr('name', "Value").val(value));
            }
            else {
                $('#val_type_cont').append('<input id="val_type" name="Value" ></input>');
            }
            var selectorDateTime = "#val_type";
            Utility.addDatePicker($(selectorDateTime), { type: 'datetime' });            
        }
        else {
            $('#val_type_cont').append('<textarea id="val_type" name="Value" >' + value + '</textarea>');
        }

    },
    changeSelection: function () {
        var id = this.$("select[name='Id']").val();
        if (id === this.emptyGuid) {
            this.setNewClass();
        }
        else {
            var model = this.viewData.list.get(id);
            this.viewData.selected = model;
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
        var errorHandler = this.handleErrors;
        var newClass = new SystemPreference();
        var attrs = DTO.getDTO(this.el);

        // translated name correction: revert translated name to untranslated name before saving
        if (this.viewData.selected) {
            var oldName = this.viewData.selected.get('Name');
            if (attrs.Name === Constants.c[oldName]) {
                attrs.Name = oldName;
            }
        }

        var message = Constants.c.documentRetrieveLimitConfirm;
        if (attrs.Name === Constants.c.documentRetrieveLimit && attrs.Value > 10000) {
            var confirmResult = confirm(message);
            if (!confirmResult) {
                attrs.Value = 10000;
            }
        }

        Utility.toggleInputButtons('input[name="save_ss"]', false);
        if (!this.isNameValidHandling(attrs.Name, 'Name')) {
            Utility.toggleInputButtons('input[name="save_ss"]', true);
            return false;
        }
        if (attrs.Value === '' || attrs.Value === null) {
            ErrorHandler.addErrors({ 'Value': Constants.c.userInputException }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            Utility.toggleInputButtons('input[name="save_ss"]', true);
            return false;
        }
        newClass.on("invalid", function (model, error) { errorHandler(model, error); });
        if (this.isUnique(attrs) === true) {
            newClass.save(attrs, {
                success: function (result, response) {
                    that.saveSuccess(result, response, attrs.Id, window.systemPreferences, that);
                    Utility.toggleInputButtons('input[name="save_ss"]', true);
                    $('#systemPreferences').val(JSON.stringify(window.systemPreferences.toJSON()));
                },
                error: function () {
                    Utility.toggleInputButtons('input[name="save_ss"]', true);
                }
            });
        }
        else {
            Utility.toggleInputButtons('input[name="save_ss"]', true);
            ErrorHandler.addErrors({ 'Name': Constants.c.duplicateTitle }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
        }
    },
    /*
    * isUnique check the new against the existing.  do not allow same names on two contentTypes
    * if there is an update and the guid is the same then it is considered unique...
    * @return boolean
    */
    isUnique: function (attrs) {
        var unique = true;
        window.systemPreferences.each(function (item) {
            if (attrs.Name.toLowerCase() === item.get('Name').toLowerCase()) {
                if (attrs.Id !== item.get('Id')) {
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
    handleErrors: function (model, error) {
        ErrorHandler.addErrors(error, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
    },
    kill: function (e) {
        var id = this.$("select[name='selected_class']").val();

        if (id !== this.emptyGuid) {

            var model = window.systemPreferences.get(id);

            // HttpDelete won't send an Id to our Api method (on some browsers?)
            // so make a post to a delete method
            $.ajax({
                url: Constants.Url_Base + "Preferences/DeleteSystemPreferences",
                data: { "Id": id },
                type: "post",
                success: function () {
                    window.systemPreferences.remove(model);
                }
            });
        }
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('systempreferenceslayout'));
        var sysPref = $.parseJSON($('#systemPreferences').val());
        window.systemPreferences = new SystemPreferences();
        window.systemPreferences.add(sysPref);
        return this;
    },
    render: function () {
        // Refresh viewData.list
        this.viewData.list = window.systemPreferences;
        $('#systemPreferences').val(JSON.stringify(window.systemPreferences.toJSON()));
        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }
        $(this.el).html(this.compiledTemplate(this.viewData));
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        this.showValue(); // updates input type, too
        return this;
    }
});
