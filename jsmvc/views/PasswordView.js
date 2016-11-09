// View for editing Users
// Renders a compiled template using doU.js
var PasswordView = Backbone.View.extend({
    viewData: {},
    proxy: UserServiceProxy(),
    events: {
        "click input[name='save']": "save"
    },

    save: function () {
        $('input[name="save"]').attr('disabled', true);
        var oldPass = $("input[name='currentPassword']").val();
        var newPassOne = $("input[name='password1']").val();
        var newPassTwo = $("input[name='password2']").val();
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        if (newPassOne.length > 128 || newPassTwo.length > 128) {
            $('input[name="save"]').attr('disabled', false);
            if (newPassOne.length > 128) { ErrorHandler.addErrors({ 'password1': Constants.c.veryLongPass }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, ''); }
            if (newPassTwo.length > 128) { ErrorHandler.addErrors({ 'password2': Constants.c.veryLongPass }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, ''); }
        } else if (newPassOne !== newPassTwo) {
            $('input[name="save"]').attr('disabled', false);
            ErrorHandler.addErrors({ 'password1': Constants.c.passNotMatch }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            ErrorHandler.addErrors({ 'password2': Constants.c.passNotMatch }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        } else {
            $('input[name="save"]').attr('disabled', 'disabled');

            var success = function (result) {
                $('input[name="save"]').removeAttr('disabled');
                $("input[name='currentPassword']").val('');
                $("input[name='password1']").val('');
                $("input[name='password2']").val('');
                $('#pass_reset .success_message').show();
                $('#pass_reset .success_message').fadeOut(2000);
            };
            var failure = function (jqxhr, textStatus, error) {
                if (error.Message === Constants.c.passwordStrength) {
                    ErrorHandler.addErrors({ 'pass_error': error.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                } else {
                    ErrorHandler.addErrors({ 'save': error.Message }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            };
            var complete = function () {
                $('input[name="save"]').attr('disabled', false);
            };
            var pkg = {
                OldPassword: oldPass,
                NewPassword: newPassOne
            };
            this.proxy.SetPassword(pkg, success, failure, complete);
        }


    },

    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('changepasswordlayout'));
        return this;
    },

    render: function () {
        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);
        this.delegateEvents(this.events);
        return this;
    }

});
