// View for editing Users
// Renders a compiled template using doU.js
var CompanyEditView = Backbone.View.extend({

    viewData: {},
    errors: [],
    compiledTemplate: null,
    events: {
        "change select[name='Id']": "changeSelected",
        "click #save_company": "saveChanges",
        "click input[name='Name']": "clickName"
    },

    //new class is fetched from the controller
    //first element in the list is an empty user
    setNewClass: function () {
        this.viewData.selected = this.getNewClass(window.companies);
        return this;
    },

    clickName: function () {
        if (this.$("select[name='Id']").val() === Constants.c.emptyGuid) {
            if (this.$("input[name='Name']").val() === Constants.c.newTitle) {
                this.$("input[name='Name']").val("");
            }
        }
    },

    changeSelected: function () {
        var readOnly = false;
        var id = this.$("select[name='Id']").val();
        if (id === Constants.c.emptyGuid) {
            this.setNewClass();
        }
        else {
            var model = window.companies.get(id);
            this.viewData.selected = model;
            readOnly = true;
        }
        this.render();
        $("input[name='Prefix']").attr('readonly', readOnly);
    },

    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('editcompanylayout'));
    },

    saveChanges: function () {
        var that = this;
        //clear errors ErrorHandler
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var newClass = new Company();
        var attrs = DTO.getDTO(this.el);
        $.trim(attrs.Name);
        var errorHandler = this.handleErrors;
        Utility.toggleInputButtons('#save_company', false);
        if (!this.isNameValidHandling(attrs.Name, 'Name')) {
            Utility.toggleInputButtons('#save_company', true);
            return false;
        }
        newClass.on("invalid", function (model, error) { errorHandler(model, error); });
        if (this.isUnique(attrs) === true) {
            newClass.save(attrs, {
                success: function (result, response) {
                    that.saveSuccess(result, response, attrs.Id, window.companies, that);
                    that.refreshCompanyList();
                }
            });
        } else {
            Utility.toggleInputButtons('#save_company', true);
            var unIdx = $.inArray(Constants.c.companyNameUnique, that.errors);
            var upIdx = $.inArray(Constants.c.companyUniquePrefix, that.errors);
            if (that.errors[unIdx]) {
                ErrorHandler.addErrors({ 'Name': Constants.c.companyNameUnique }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            }
            if (that.errors[upIdx]) {
                ErrorHandler.addErrors({ 'Prefix': Constants.c.companyUniquePrefix }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            }
        }

    },
    isUnique: function (attrs) {
        var unique = true;
        var that = this;
        that.errors = [];
        window.companies.each(function (item) {
            if (attrs.Id === Constants.c.emptyGuid) {
                if (attrs.Prefix === item.get("Prefix")) {
                    that.errors.push(Constants.c.companyUniquePrefix);
                    unique = false;
                }
            }
            if (attrs.Name === item.get("Name")) {
                if (attrs.Id === Constants.c.emptyGuid) {
                    unique = false;
                    that.errors.push(Constants.c.companyNameUnique);
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
        var errors = {};
        if (error.statusText === undefined) {
            errors.errors_cf = error;
        }
        else {
            errors.errors_cf = error.statusText;
        }
        ErrorHandler.addErrors(errors, css.warningErrorClass, "div", css.inputErrorClass);
    },

    kill: function (e) {
        //clear errors first
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var id = $('select[name="Id"]').val();
        if (id !== Constants.c.emptyGuid) {
            var model = window.companies.get(id);
            // HttpDelete won't send an Id to our Api method (on some browsers?)
            // so make a post to a delete method
            $.ajax({
                url: Constants.Url_Base + 'Company/Delete',
                data: { "Id": id },
                type: "post",
                success: function (response) {
                    if (response.status === 'ok') {
                        window.companies.remove(model);
                    } else {
                        ErrorHandler.addErrors({ 'delete_company': response.message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                    }
                }

            });
        } else {
            var obj = {
                'Id': Constants.c.cannotDeleteNewUser
            };
            ErrorHandler.addErrors(obj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
        }
    },

    render: function () {
        // check to see if user view does this
        $(this.el).html("");
        // Refresh viewData.list
        this.viewData.list = window.companies;

        if (this.viewData.selected === undefined) {
            this.setNewClass();
        }

        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);

        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);

        return this;
    },
    /*
    * Refreshes the list of companies the user has access to.
    */
    refreshCompanyList: function () {
        $.ajax({
            url: Constants.Url_Base + "Company/GetCompanyInstances",
            type: "GET",
            success: function (result) {
                if (window.companyInstances === undefined) {
                    window.companyInstances = new CompanyInstances();
                }
                window.companyInstances.reset(window.companyInstances.parse(result.result));
                if (result.status === 'ok') {
                    var res = result.result;
                    $('#companySelect').children().remove();
                    var j;
                    for (j = 0; j < res.length; j++) {
                        $("#companySelect").append('<option value=' + res[j].Id + '>' + res[j].Company.Name + '</option>');
                    }
                    $("#companySelect").combobox();
                }
                else {
                    ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            },
            complete: function () {
                Utility.toggleInputButtons('#save_company', true);
            }
        });
    }

});
