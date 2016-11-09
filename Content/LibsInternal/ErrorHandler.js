/// <reference path="Utility.js" />
var ErrorHandler = {
    report: function (url, func, message) {
        $.ajax({
            url: "Logs/WriteError",
            type: "POST",
            data: { "url": url, "fn": func, "message": message },
            error: function (jqXHR, textStatus, errorThrown) {
                ErrorHandler.addErrors(errorThrown, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            }
        });
    },

    /**
    * removeErrorTags removes errors from a given form
    * @param warningErrorClass all elements on the page with this class name will be deleted
    * @param inputErrorClass all of these classnames will be removed from any tag that has this class
    * author mbemis 2011-05-05
    */
    removeErrorTags: function (warningErrorClass, inputErrorClass) {
        $('.' + warningErrorClass).remove();
        $('.' + inputErrorClass).removeClass(inputErrorClass);
    },
    removeErrorTagsIframe: function (iframe, warningErrorClass, inputErrorClass) {
        $(iframe).contents().find('.' + warningErrorClass).remove();
        $(iframe).contents().find('.' + inputErrorClass).removeClass(inputErrorClass);
    },
    //element is parent to input
    removeErrorTagsElement: function (element, warningErrorClass, inputErrorClass) {
        warningErrorClass = warningErrorClass || css.warningErrorClass;
        inputErrorClass = inputErrorClass || css.inputErrorClass;
        $(element).find('.' + warningErrorClass).remove();
        $(element).find('.' + inputErrorClass).removeClass(inputErrorClass);
    },
    /**
    * Displays a general popup error dialog if errorThrown is a non-empty string or contains Message property, which is not null or empty
    */
    popUpMessage: function (errorThrown) {
        if (errorThrown) {
            var msg = typeof errorThrown === 'string' ? errorThrown : errorThrown.Message;
            if (msg) {
                ErrorHandler.displayGeneralDialogErrorPopup(msg);
            }
        }
    },
    /** 
    * addErrors adds error tags and classes to highlight warnings (can do multiples at once)
    * @param msgs may be simply a string or an object with key:string, where key is a name of an input and string is the message to display
    *   if simply a string, then a pop-up dialog result
    * @param warningErrorClass string class to apply to the warning message tag 
    * @param tag tagname to append after the input
    * @param inputErrorClass class to add to the input tag
    * @param inputTag - can be null and will default to input (pass select or textarea for example)
    * @param selector - can be null and will default to name (pass id for example)    
    * @param selectorContainer - can be null, used to filter the tag/selector by its container
    * author mbemis 2011-05-05
    */
    addErrors: function (msgs, warningErrorClass, tag, inputErrorClass, inputTag, selector, selectorContainer) {
        if (typeof msgs === 'string') {
            ErrorHandler.displayGeneralDialogErrorPopup(msgs);
        } 
        else if (typeof msgs === 'object') {
            if (warningErrorClass === 'popup') {
                if (msgs) {
                    ErrorHandler.displayGeneralDialogErrorPopup(msgs.Message);
                }
                return;
            }
            var tagname = 'input';
            if ($.isEmptyObject(inputTag) === false) {
                tagname = inputTag;
            }
            if (!tag) {
                tag = css.warningErrorClassTag;
            }
            if (!warningErrorClass) {
                warningErrorClass = css.warningErrorClass;
            }
            if (!inputErrorClass) {
                inputErrorClass = css.inputErrorClass;
            }
            var selectorname = 'name';
            if ($.isEmptyObject(selector) === false) {
                selectorname = selector;
            }
            selectorContainer = selectorContainer || '';
            var key;
            var errors = '';
            for (key in msgs) {
                if (msgs.hasOwnProperty(key)) {
                    var msg = msgs[key];
                    var input = tagname + '[' + selectorname + '="' + key + '"]';
                    if (selectorContainer) {
                        input = $(selectorContainer).find(input);
                    }
                    if ($(input).length > 0) {
                        $(input).after('<' + tag + ' class="' + warningErrorClass + '">' + msg + '</' + tag + '>');
                        $(input).addClass(inputErrorClass);
                    } else {
                        //append to the errors div
                        if (msgs.message || msgs.Message) {
                            errors = msgs.message || msgs.Message;
                            break;
                        }
                        errors = errors + key + ': ' + msg + '<br/>';
                    }
                }
            }
            if (errors !== '') {
                ErrorHandler.displayGeneralDialogErrorPopup(errors);
            }
        }
    },
    displayGeneralDialogErrorPopup: function (msg, closeFunc, title) {
        msg = msg || (Constants.c.errorHasOccurred + '\n\n' + Constants.c.contactTechSupport);
        if (msg) {
            if ($('#catchallerrors').length === 0) {
                $('body').append('<pre id="catchallerrors" style="display: none; font-style: Verdana, Tahoma; font-size: 11px;"></pre>');
            }
            if (!title) {
                title = '';
            }
            $('#catchallerrors').html(msg);
            $('#catchallerrors').dialog({
                modal: true,
                title: title,
                width: 'auto',
                minWidth: 400,
                buttons: [{
                    text: Constants.c.close,
                    click: function () {
                        $(this).dialog('close');
                    }
                }],
                close: function () {
                    if (closeFunc) {
                        closeFunc();
                    }
                }
            });
        }
    },
    displayOverridableDialogErrorPopup: function (msg, overrideFunc, options) {
        if (msg) {
            var okText = Constants.c.ok;
            var closeText = Constants.c.close;
            var title = '';
            if (options) {
                okText = options.okText || okText;
                closeText = options.closeText || closeText;
                title = options.title || title;
            }
            if ($('#catchallerrors').length === 0) {
                $('body').append('<pre id="catchallerrors" style="display: none;"></pre>');
            }
            var partialCloseFunc = function () {
                Utility.enableButtons([okText, closeText]);
                if (options) {
                    Utility.executeCallback(options.close);
                }
            };
            var closeFunc = function () {
                partialCloseFunc();
                $('#catchallerrors').dialog('close');
            };
            $('#catchallerrors').html(msg);
            DialogsUtil.isDialogInstanceDestroyDialog($('#catchallerrors'));
            $('#catchallerrors').dialog({
                modal: true,
                width: 'auto',
                height: 'auto',
                minWidth: 400,
                title: title,
                buttons: [{
                    text: okText,
                    click: function () {
                        Utility.disableButtons([okText, closeText]);
                        if (overrideFunc) {
                            overrideFunc(closeFunc);
                        }
                        if (options && options.closeDialog) {
                            closeFunc();
                        }
                    }
                }, {
                    text: closeText,
                    click: function () {
                        closeFunc();
                    }
                }],
                close: partialCloseFunc
            });
        }
    },
    /**
    * bindOnCompleteOnSuccess - adds global event listeners to ajax calls for redirects from 300s, 400s, and 500s
    */
    bindOnCompleteOnSuccess: function () {
        $('body').ajaxComplete(function (e, xhr, settings) {
            if (window.location.href.indexOf(Constants.Login_Url) === -1) {
                var message = xhr.getResponseHeader('AuthMessage');
                if (message) {
                    $.cookie('destHref', window.location.href, { expires: 1, path: '/', domain: Constants.ProxyCookieDomain });
                    window.location.href = Constants.Login_Url + "?message=" + message;
                }
            }
        });
    },
    bindOnCompleteOnError: function (selector) {
        if (!selector) {
            selector = 'body';
        }
        $(selector).ajaxError(function (event, jqXHR, ajaxSettings, errorThrown) {
            if (ajaxSettings.error) {
                return ajaxSettings.error(jqXHR, Constants.c.error, errorThrown);
            }
            var errMsg = '';
            if (jqXHR.responseText) {
                errMsg = $(jqXHR.responseText).contents().first().text();
            }
            var msg = String.format(Constants.c.generalErrorMessage, "\n\n" + errorThrown + "\n\n" + errMsg + "\n\n");

            ErrorHandler.addErrors(msg, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
            //TODO: make it so elma gets the error logged
            //ErrorHandler.report(errorThrown.url, errorThrown.data, ajaxSettings.responseText);
        });
    },
    handleRedirect: function (path) {
        window.location.href = path;
    }
};