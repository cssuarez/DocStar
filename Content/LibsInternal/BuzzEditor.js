/// <reference path="a_jquery.js" />
/// <reference path="TinyMCEJScripts/jquery.tinymce.js" />
/// <reference path="ErrorHandler.js" />
var BuzzEditor = {
    errors:[],
    init: function () {
        $('select[name="Id"]').change(function () {
            window.location = Constants.Url_Base + 'CustomList/GetBuzzSpaceEditor?selectedId=' + $(this).val();
        });
        tinyMCE.init({
            theme_advanced_font_sizes: "10px,12px,13px,14px,16px,18px,20px",
            font_size_style_values: "12px,13px,14px,16px,18px,20px",
            mode: "textareas",
            selector: "textarea[name='Content']",
            plugins: [
                "advlist autolink lists link image charmap print preview anchor",
                "searchreplace visualblocks code fullscreen",
                "insertdatetime media table contextmenu paste",
                "textcolor"
            ],
            init_instance_callback: function () {
                this.dom.doc.getElementsByTagName('html')[0].style.height = '100%';
                this.dom.doc.getElementsByTagName('body')[0].style.height = '100%';
            },
            toolbar: "insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | backcolor | forecolor | fontselect |  fontsizeselect",
            menubar: "edit insert view format table tools",
            height: 500
            // General options
            /*height: '0',
            width: '0',
            mode: "textareas",
            theme: "advanced",
            plugins: "pagebreak,style,layer,table,save,advhr,advimage,advlink,emotions,iespell,inlinepopups,insertdatetime,preview,media,searchreplace,print,contextmenu,paste,directionality,fullscreen,noneditable,visualchars,nonbreaking,xhtmlxtras,template",

            // Theme options
            theme_advanced_buttons1: "save,newdocument,|,bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,styleselect,formatselect,fontselect,fontsizeselect",
            theme_advanced_buttons2: "cut,copy,paste,pastetext,pasteword,|,search,replace,|,bullist,numlist,|,outdent,indent,blockquote,|,undo,redo,|,link,unlink,anchor,image,cleanup,help,code,|,insertdate,inserttime,preview,|,forecolor,backcolor",
            theme_advanced_buttons3: "tablecontrols,|,hr,removeformat,visualaid,|,sub,sup,|,charmap,emotions,iespell,media,advhr,|,print,|,ltr,rtl,|,fullscreen",
            theme_advanced_buttons4: "insertlayer,moveforward,movebackward,absolute,|,styleprops,|,cite,abbr,acronym,del,ins,attribs,|,visualchars,nonbreaking,template,pagebreak",
            theme_advanced_toolbar_location: "top",
            theme_advanced_toolbar_align: "left",
            theme_advanced_statusbar_location: "bottom",
            theme_advanced_resizing: true,
            theme_advanced_resizing_max_height: '300',
            force_p_newlines: false,
            forced_root_block: false,            
            // Replace values for the template plugin
            template_replace_values: {
                username: "Some User",
                staffid: "991234"
            }*/

        });
        var that = this;
        var dates = [];
        dates = $("input[name='StartDate']").datetimepicker({});
        $("input[name='EndDate']").datetimepicker(
           {
               beforeShow: function () {
                   $("input[name='EndDate']").datetimepicker("option", {
                       minDate: $("input[name='StartDate']").val()
                   });
               }
           });
        $('input[name="DefaultAd"]').change(BuzzEditor.defaultAdChanged);
        $('input[name="Title"]').focus(BuzzEditor.clickName);
        $('#del_buzz').click(BuzzEditor.deleteBuzzSpace);
        $('input[name="Title"]').focus().select();
        $('input[name="Title"]').off('keyup').on('keyup', function (e) {
            that.validate();
        });
        $('#save_buzz').click(function () {
            //This is a fix for Chrome, Cannot disable on the click or we don't submit.
            setTimeout(function () {
                $('#save_buzz').attr('disabled', true);
                $('#del_buzz').attr('disabled', true);
                that.saveBuzzSpace();
            }, 0);
        });
        BuzzEditor.defaultAdChanged({ currentTarget: $('input[name="DefaultAd"]') });
    },
    defaultAdChanged: function (e) {
        var checked = $(e.currentTarget).prop('checked');
        if (checked) {
            $('#buzzSchedule .buzzScheduleElement').attr('disabled', 'disabled');
        }
        else {
            $('#buzzSchedule .buzzScheduleElement').removeAttr('disabled');
        }
    },
    clickName: function () {
        if ($("select[name='selected_class']").val() === this.emptyGuid) {
            if ($("input[name='Title']").val().toLowerCase() === Constants.c.newTitle.toLowerCase()) {
                $("input[name='Title']").val("");
                $("textarea[name='description']").val("");
            }
        }
        else {
            this.$("input[name='Title']").focus().select();
        }
    },
    deleteBuzzSpace: function () {
        var css = window.parent.css;
        $('#save_buzz').attr('disabled', true);
        $('#del_buzz').attr('disabled', true);
        var id = $('select[name="Id"]').val();
        if (id !== Constants.c.emptyGuid) {
            // HttpDelete won't send an Id to our Api method (on some browsers?)
            // so make a post to a delete method            
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            $.ajax({
                url: Constants.Url_Base + 'CustomList/DeleteBuzzSpaces',
                data: { "Id": id },
                type: "POST",
                success: function (result) {
                    if (result.status === 'ok') {
                        window.location = Constants.Url_Base + 'CustomList/GetBuzzSpaceEditor';
                    }
                    else {
                        var obj = {
                            'Id': result.message
                        };

                        ErrorHandler.addErrors(obj, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    ErrorHandler.addErrors(errorThrown, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
                },
                complete: function () {
                    $('#save_buzz').attr('disabled', false);
                    $('#del_buzz').attr('disabled', false);
                }
            });
        }
        else {
            $('#save_buzz').attr('disabled', false);
            $('#del_buzz').attr('disabled', false);
            var isCurrentErrorInErrors = $.inArray(Constants.c.cannotDeleteNewBuzz, BuzzEditor.errors);
            if (isCurrentErrorInErrors < 0) {
                ErrorHandler.addErrors({ 'Id': Constants.c.cannotDeleteNewBuzz }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'select');
                BuzzEditor.errors.push(Constants.c.cannotDeleteNewBuzz);
            }
        }
    },
    saveBuzzSpace: function () {
        if (this.validate()) {
            $('form[name="buzz"]').submit();
        }

    },
    validate: function () {
        $('#save_buzz').attr('disabled', false);
        $('#del_buzz').attr('disabled', false);

        var css = window.parent.css;
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var form = $('form[name="buzz"]')[0];
        var title = form.Title.value;
        var startDate = JSON.parseWithDate(JSON.stringify(form.StartDate.value));
        var endDate = JSON.parseWithDate(JSON.stringify(form.EndDate.value));
        var addError = function (msg) {
            $('#save_buzz').attr('disabled', true);
            $('#del_buzz').attr('disabled', true);
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            ErrorHandler.addErrors({ 'Title': msg }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'input');
            BuzzEditor.errors.push(msg);
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
        return true;
    }
};