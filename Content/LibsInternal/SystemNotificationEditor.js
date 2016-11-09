/// <reference path="a_jquery.js" />
/// <reference path="TinyMCEJScripts/jquery.tinymce.js" />
/// <reference path="ErrorHandler.js" />
var SystemNotificationEditor = {
    errors: [],
    init: function () {
        $('select[name="Id"]').change(function () {
            window.location = Constants.Url_Base + 'SystemNotifications/GetSystemNotificationsEditor?selectedId=' + $(this).val();
        });
        tinyMCE.init({
            mode: "textareas",
            selector: "textarea[name='Content']",
            plugins: [
                "advlist autolink lists link image charmap print preview anchor",
                "searchreplace visualblocks code fullscreen",
                "insertdatetime media table contextmenu paste"
            ],
            init_instance_callback: function () {
                this.dom.doc.getElementsByTagName('html')[0].style.height = '100%';
                this.dom.doc.getElementsByTagName('body')[0].style.height = '100%';
            },
            toolbar: "insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
            menubar: "edit insert view format table tools"
        });
        this.bindCompanyDropDown();
        var that = this;
        var dates = [];
        dates = $("input[name='StartDate'], input[name='EndDate']").datetimepicker({
            onSelect: function (selectedDate) {
                var option = this.name === "StartDate" ? "minDate" : "maxDate",
					instance = $(this).data("datepicker"),
					date = $.datepicker.parseDate(
						instance.settings.dateFormat ||
						$.datepicker._defaults.dateFormat,
						selectedDate, instance.settings);
                dates.not(this).datepicker("option", "beforeShow", function () {
                    $(this).datepicker("option", option, date);
                });
                that.validate();
            }
        });

        $('#del_SystemNotifications').click(SystemNotificationEditor.deleteSystemNotification);
        $('input[name="Title"]').focus().select();
        $('input[name="Title"]').off('keyup').on('keyup', function (e) {
            that.validate();
        });
        $('#save_SystemNotifications').click(function () {
            //This is a fix for Chrome, Cannot disable on the click or we don't submit.
            setTimeout(function () {
                $('#save_SystemNotifications').prop('disabled', true);
                $('#del_SystemNotifications').prop('disabled', true);
                that.saveSystemNotification();
            }, 0);
        });
    },
    deleteSystemNotification: function () {
        var css = window.parent.css;
        $('#save_SystemNotifications').prop('disabled', true);
        $('#del_SystemNotifications').prop('disabled', true);
        var id = $('select[name="Id"]').val();
        if (id !== Constants.c.emptyGuid) {
            // HttpDelete won't send an Id to our Api method (on some browsers?)
            // so make a post to a delete method            
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            $.ajax({
                url: Constants.Url_Base + 'SystemNotifications/DeleteSystemNotification',
                data: { "Id": id },
                type: "POST",
                success: function (result) {
                    window.location = Constants.Url_Base + 'SystemNotifications/GetSystemNotificationsEditor';
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.addErrors(errorThrown, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
                },
                complete: function () {
                    $('#save_SystemNotifications').prop('disabled', false);
                    $('#del_SystemNotifications').prop('disabled', false);
                }
            });
        }
        else {
            $('#save_SystemNotifications').prop('disabled', false);
            $('#del_SystemNotifications').prop('disabled', false);
            var isCurrentErrorInErrors = $.inArray(Constants.c.cannotDeleteNewSystemNotification, SystemNotificationEditor.errors);
            if (isCurrentErrorInErrors < 0) {
                ErrorHandler.addErrors({ 'Id': Constants.c.cannotDeleteNewSystemNotification }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
                SystemNotificationEditor.errors.push(Constants.c.cannotDeleteNewSystemNotification);
            }
        }
    },
    saveSystemNotification: function () {
        if (this.validate()) {
            $('form[name="notification"]').submit();
        }
    },
    validate: function () {
        $('#save_SystemNotifications').prop('disabled', false);
        $('#del_SystemNotifications').prop('disabled', false);

        var css = window.parent.css;
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var form = $('form[name="notification"]')[0];
        var title = form.Title.value;
        var startDate = JSON.parseWithDate(JSON.stringify(form.StartDate.value));
        var endDate = JSON.parseWithDate(JSON.stringify(form.EndDate.value));
        var addError = function (msg) {
            $('#save_SystemNotifications').prop('disabled', true);
            $('#del_SystemNotifications').prop('disabled', true);
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            ErrorHandler.addErrors({ 'Title': msg }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'input');
            SystemNotificationEditor.errors.push(msg);
            return false;
        };
        if (!$.trim(title)) {
            return addError(Constants.c.nameEmptyWarning);
        }
        if ($.trim(title) === Constants.c.newTitle) {
            return addError(String.format(Constants.c.newNameWarning, Constants.t('newTitle')));
        }
        if (title.length > 40) {
            return addError(Constants.c.nameTooLong);
        }
        if (window.parent._.detect($('select[name="Id"]')[0].options, function (e) { return $.trim(e.label).toLowerCase() === $.trim(title).toLowerCase() && !e.selected; })) {
            return addError(Constants.c.duplicateNameError);
        }
        if (startDate === "" || !DateUtil.isDate(startDate)) {
            ErrorHandler.addErrors({ 'StartDate': Constants.c.invalidDateSelection }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'input');
            return false;
        }
        if (endDate === "" || !DateUtil.isDate(endDate)) {
            ErrorHandler.addErrors({ 'EndDate': Constants.c.invalidDateSelection }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'input');
            return false;
        }
        form.StartDate.value = new Date(startDate).format('general');
        form.EndDate.value = new Date(endDate).format('general');
        return true;
    },
    bindCompanyDropDown: function () {
        $.ajax({
            url: Constants.Url_Base + "Company/GetCompanyInstances",
            type: "GET",
            success: function (result) {
                if (result.status === 'ok') {
                    var res = result.result;
                    var j;
                    var selectedsites = $("#siteddl").attr("selectedsites").toLowerCase();
                    if (selectedsites.indexOf(Constants.c.all) >= 0 || selectedsites === "") {
                        $("#siteddl").append('<option selected=selected value=' + Constants.c.all + '>' + Constants.c.all + '</option>');
                    }
                    else {
                        $("#siteddl").append('<option  value=' + Constants.c.all + '>' + Constants.c.all + '</option>');
                    }
                    for (j = 0; j < res.length; j++) {
                        if (selectedsites.indexOf(res[j].CompanyId) >= 0) {
                            $("#siteddl").append('<option selected=selected value=' + res[j].CompanyId + '>' + res[j].Company.Name + '</option>');
                        }
                        else {
                            $("#siteddl").append('<option value=' + res[j].CompanyId + '>' + res[j].Company.Name + '</option>');
                        }
                    }

                }
                else {
                    ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
            }
        });
    }
};