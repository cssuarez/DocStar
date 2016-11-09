/// <reference path="Utility.js" />
var RecordsMgmtDialogs = {
    adminProxy: AdminServiceProxy(),
    cutoff: function (options) {
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ cutoffDate: new Date().format('general'), itemCount: 1 }, options);
        if (options.itemCount === 0) {
            DialogsUtil.invalidSelection();
            return;
        }
        var selectorDateTime = '#cutoffDocuments input[name="freezeDate"]';
        $(selectorDateTime).val(options.cutoffDate);
        Utility.addDatePicker($(selectorDateTime), { type: 'datetime',displayClearButton:true});
         
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var validateMethod = function (e) {
            var $sel = $(e.currentTarget);
            var value = $sel.val();
            if (value && !DateUtil.isDate(value)) {
                Utility.disableButtons([Constants.c.ok]);

                $('.' + css.warningErrorClass).remove();
                var err = document.createElement('SPAN');
                err.className = css.warningErrorClass;
                err.textContent = Constants.c.invalidDateSelection;
                $sel.after(err);
                $sel.addClass(css.inputErrorClass);
            } else {
                Utility.enableButtons([Constants.c.ok]);
                $('.' + css.warningErrorClass).remove();
                $sel.removeClass(css.inputErrorClass);
            }
        };
        $(selectorDateTime).off('keyup').on('keyup', validateMethod);
        $(selectorDateTime).off('change').on('change', validateMethod);
        $('#cutoffDocuments span').text(String.format(Constants.c.setCutoffForDocs, options.ItemCount));
        $('#cutoffDocuments').attr('title', Constants.c.cutoff);
        $('#cutoffDocuments').dialog({
            resizable: false,
            height: 'auto',
            maxWidth: $(window).width(),
            maxHeight: $(window).height(),
            modal: true,
            open: function () {
                $(this).css('height', 'auto');
                $(this).parent().find('.ui-dialog-titlebar').off('click').on('click', function () {
                    $('#cutoffDocuments').find('.hasDatepicker').blur();
                });
            },
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    $(selectorDateTime).attr('disabled', 'disabled');
                    var okText = Constants.c.ok;
                    var closeText = Constants.c.cancel;
                    Utility.disableButtons([okText, closeText]);
                    var cutoff = $(selectorDateTime).val();
                    var that = this;
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var cleanup = function () {
                        $(selectorDateTime).removeAttr('disabled');
                        Utility.enableButtons([okText, closeText]);
                        $(that).dialog('close');
                    };
                    options.callback(cutoff, cleanup);
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    $(this).dialog('close');
                }
            }
            ]
        });

    },
    freeze: function (options) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ itemCount: 1 }, options);
        if (options.itemCount === 0) {
            DialogsUtil.invalidSelection();
            return;
        }
        $('#addDocFreeze select').empty();
        $('#addDocFreeze input[name="Name"]').val('');
        $('#addDocFreeze input[name="Reason"]').val('');
        var length = window.slimFreezes.length;
        if (length === 0) {
            $('#addDocFreeze input[value="new"]').prop('checked', true);
            $('fieldset[name="createNew"]').prop("disabled", false);
            $('#addDocFreeze input[type="radio"]').hide();
            $('#addDocFreeze select').hide();
        }
        else {
            $('#addDocFreeze input[value="existing"]').prop('checked', true);
            $('#addDocFreeze select[name="freezes"]').prop("disabled", false);
            $('fieldset[name="createNew"]').prop("disabled", true);

            $('#addDocFreeze input[value="new"]').off('click').on('click', function () {
                $('#addDocFreeze select[name="freezes"]').prop("disabled", true);
                $('fieldset[name="createNew"]').prop("disabled", false);
            });
            $('#addDocFreeze input[value="existing"]').off('click').on('click', function () {
                $('#addDocFreeze select[name="freezes"]').prop("disabled", false);
                $('fieldset[name="createNew"]').prop("disabled", true);
            });

            $('#addDocFreeze input[type="radio"]').show();
            $('#addDocFreeze select').show();
            var i = 0;
            for (i; i < length; i++) {
                var ef = window.slimFreezes.at(i);
                $('#addDocFreeze select').append($('<option/>').val(ef.get('Id')).text(ef.get('Name')));
            }
        }
        $('#addDocFreeze').attr('title', Constants.c.freeze);
        $('#addDocFreeze span').text(String.format(Constants.c.setFreezeForDocs, options.itemCount));
        $('#addDocFreeze').dialog({
            resizable: false,
            maxWidth: $(window).width(),
            maxHeight: $(window).height(),
            modal: true,
            close: function () {
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            },
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var that = this;
                    var cleanUp = function () {
                        $(that).dialog('close');
                    };
                    var freezeSelection = $('#addDocFreeze input[name="freezeType"]:checked').val();
                    if (freezeSelection === 'existing') {
                        var freezeId = $('#addDocFreeze select').val();
                        options.callback(freezeId, cleanUp);
                        $('#addDocFreeze select').removeAttr('disabled');
                    }
                    else {
                        var name = $('#addDocFreeze input[name="Name"]').val();
                        var reason = $('#addDocFreeze input[name="Reason"]').val();
                        var rfModel = new RecordFreeze();
                        var msg = rfModel.save({ Name: name, Reason: reason }, { success: function () { options.callback(rfModel.get('Id'), cleanUp); } });
                        if (msg) {
                            ErrorHandler.addErrors(msg);
                        } else if (rfModel.validationError) {
                            ErrorHandler.addErrors(rfModel.validationError);
                        }
                    }
                    $('#addDocFreeze select').attr('disabled', 'disabled');
                }
            }, {
                text: Constants.c.cancel,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
    },
    unFreeze: function (options) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        options = $.extend({ itemCount: 1 }, options);
        var length = options.freezes ? options.freezes.length : 0;
        var i = 0;

        if (length === 0) {
            ErrorHandler.displayGeneralDialogErrorPopup(Constants.c.notFrozen, null, Constants.c.unfreeze);
            return;
        }
        $('#removeDocFreeze select').empty();
        if (length > 1) {
            $('#removeDocFreeze select').append($('<option/>').val(Constants.c.emptyGuid).text(Constants.c.FullUnFreeze));
        }

        for (i; i < length; i++) {
            var f = options.freezes[i];
            $('#removeDocFreeze select').append($('<option/>').val(f.Id).text(f.Name));
        }
        $('#removeDocFreeze').attr('title', Constants.c.unfreeze);
        $('#removeDocFreeze span').text(String.format(Constants.c.unFreezeDocs, options.itemCount));
        $('#removeDocFreeze').dialog({
            resizable: false,
            width: 'auto',
            maxWidth: $(window).width(),
            maxHeight: $(window).height(),
            modal: true,
            buttons: [{
                text: Constants.c.ok,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var freezeId = $('#removeDocFreeze select').val();
                    $('#removeDocFreeze select').attr('disabled', 'disabled');
                    var that = this;
                    var cleanUp = function () {
                        $(that).dialog('close');
                        $('#removeDocFreeze select').removeAttr('disabled');
                    };
                    options.callback(freezeId, cleanUp);
                }
            },
            {
                text: Constants.c.cancel,
                click: function () {
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    $(this).dialog('close');
                }
            }
            ]
        });
    }
};