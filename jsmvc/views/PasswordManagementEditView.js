// View for editing Users
// Renders a compiled template using doU.js
var PasswordManagementEditView = Backbone.View.extend({
    recordExists: false,
    viewData: {},
    proxy: UserServiceProxy(),
    selectedData: {},
    model: {},
    events: {
        'click [name=Save]': 'create',
        'click [name=Reset]': 'resetLockoutUsers'
    },
    bindEvents: function () {
        var $comboBoxFailedAttempt = $('select[name="FailedLoginAttempt"]');
        var $inputBox = $('input[name="LockoutResetSeconds"]');

        $comboBoxFailedAttempt.change(function () {
            var value = $comboBoxFailedAttempt.val();
            if (value > 0) {
                $inputBox.removeAttr('disabled');
            }
            else {
                $inputBox.val(0);
                $inputBox.attr('disabled', 'disabled');
            }
        });
        $inputBox.change(function () {
            if (!$inputBox.val()) {
                $inputBox.val(0);
            }
        });
        $inputBox.numeric({ negative: false, decimal: false });
    },
    resetLockoutUsers: function () {
        $('input[name="Reset"]').attr('disabled', 'disabled');
        var success = function (result) {
            $('input[name="Reset"]').removeAttr('disabled');
            $('div.buttons .reset_message').show();
            $('div.buttons .reset_message').fadeOut(2000);
        };
        var failure = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
            $('input[name="Reset"]').removeAttr('disabled');
        };

        this.proxy.ResetLockoutUsers(success, failure);
    },
    create: function () {        
        $('input[name="Save"]').attr('disabled', 'disabled');
        var pwdManagementPackage = {};
        var pwdManagementpkg = DTO.getDTOCombo(this.$el.find('#passwordManagmentDTO'), undefined, undefined, undefined);

        pwdManagementPackage.PasswordExpirationDays = pwdManagementpkg.PasswordExpirationDays;
        pwdManagementPackage.SamePasswordPolicy = pwdManagementpkg.SamePasswordPolicy ? 8 : 0;
        pwdManagementPackage.FailedLoginAttempt = pwdManagementpkg.FailedLoginAttempt;
        if (pwdManagementpkg.FailedLoginAttempt === "0") {
            pwdManagementpkg.LockoutResetSeconds = "0";
        }
        pwdManagementPackage.LockoutResetSeconds = pwdManagementpkg.LockoutResetSeconds || "0";
        pwdManagementPackage.EnforceStrongPassword = pwdManagementpkg.PasswordStrengthEnforcement;

        var success = function (result) {
            PasswordManagementEditView.recordExists = true;
            $('input[name="Save"]').removeAttr('disabled');
            $('div.buttons .success_message').show();
            $('div.buttons .success_message').fadeOut(2000);
        };
        var failure = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
            $('input[name="Save"]').removeAttr('disabled');
        };

        if (PasswordManagementEditView.recordExists) {
            this.proxy.UpdatePasswordManagementSetting(pwdManagementPackage, success, failure);
        }
        else {
            this.proxy.CreatePasswordManagementSetting(pwdManagementPackage, success, failure);
        }
    },

    get: function () {
        var that = this;
        var success = function (result) {            
            if (result) {
                PasswordManagementEditView.recordExists = true;
                result.SamePasswordPolicy = result.SamePasswordPolicy > 0;
                model = { PasswordExpirationDays: result.PasswordExpirationDays, SamePasswordPolicy: result.SamePasswordPolicy, FailedLoginAttempt: result.FailedLoginAttempt, LockoutResetSeconds: result.LockoutResetSeconds, PasswordStrengthEnforcement: result.EnforceStrongPassword };
            }
            else {
                model = { PasswordExpirationDays: 0, SamePasswordPolicy: false, FailedLoginAttempt: 0, LockoutResetSeconds: 0, PasswordStrengthEnforcement: true };
            }

            that.selectedData = model;

            that.viewData = that.getRenderObject();
            var html_data = that.compiledTemplate(that.viewData);
            $(that.el).html("");
            $(that.el).html(html_data);
            that.bindEvents();
            that.delegateEvents(that.events);

            if (model.FailedLoginAttempt === 0) {
                $('input[name="LockoutResetSeconds"]').attr('disabled', 'disabled');
            }

            return that;
        };
        var failure = function (jqXHR, textStatus, errorThrown) {
            ErrorHandler.popUpMessage(errorThrown);
        };

        this.proxy.GetPasswordManagementSetting(success, failure);
    },

    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('passwordmanagementlayout'));
        return this;
    },
    render: function () {
        this.get();
    },
    getRenderObject: function () {
        var r = {};
        var passwordExpirationDaysArr = [];
        var failedLoginAttemptArr = [];
        var data;
        r.selectedData = this.selectedData;

        data = { ActualValue: 0, DisplayName: Constants.c.pedNone };
        passwordExpirationDaysArr.push(data);
        data = { ActualValue: 30, DisplayName: Constants.c.ped30days };
        passwordExpirationDaysArr.push(data);
        data = { ActualValue: 60, DisplayName: Constants.c.ped60days };
        passwordExpirationDaysArr.push(data);
        data = { ActualValue: 90, DisplayName: Constants.c.ped90days };
        passwordExpirationDaysArr.push(data);
        r.passwordExpirationDays = passwordExpirationDaysArr;

        data = { ActualValue: 0, DisplayName: "0" };
        failedLoginAttemptArr.push(data);
        data = { ActualValue: 2, DisplayName: "2" };
        failedLoginAttemptArr.push(data);
        data = { ActualValue: 3, DisplayName: "3" };
        failedLoginAttemptArr.push(data);
        data = { ActualValue: 5, DisplayName: "5" };
        failedLoginAttemptArr.push(data);
        r.failedLoginAttempt = failedLoginAttemptArr;

        return r;
    }
});
