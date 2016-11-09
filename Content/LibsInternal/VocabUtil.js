/// <reference path="SearchUtil.js" />
var VocabUtil = {
    addEmptyWarning: function (selector) {
        Utility.OutputToConsole($('#emptySearchWarning').length, $('#emptySearchWarning'));
        if ($('#emptySearchWarning').length === 0) {
            //remove all li tags first
            $(selector).find('li').remove();
            $(selector).append('<li id="emptySearchWarning" class="ignore">' + Constants.t('emptySearchWarning') + '</li>');
            $(selector).show();
            var fadeOut = function () {
                var item = $('#emptySearchWarning');
                item.fadeOut({
                    complete: function () {
                        $('#emptySearchWarning').remove();
                        $('#qs_suggested').hide();

                    }
                });
            };
            setTimeout(fadeOut, 2000);
        }
    },
    getVocab: function (word, selector) {
        if ($.trim(word).length <= 0) {    // Don't send empty requests
            return;
        }
        $(selector).empty();
        var i = 0;
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var success = function (r) {
            //Add result to grid
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            if (r) {
                var length = r.Suggestions.length;
                if ($(selector).get(0).tagName.toLowerCase() === 'ul') {
                    $(selector).show();
                    for (i = 0; i < length; i++) {
                        if ($.trim(word) !== '' && ((selector === "#vocab_suggestions" && document.activeElement === $('#text_word_phrase_text')[0]) ||
                                                    (selector === "#qs_suggested"      && document.activeElement === $('#qtext')[0]))) { 
                            $(selector).show();
                        }
                        else {
                            $(selector).hide();
                        }
                        $(selector).append('<li>' + r.Suggestions[i] + '</li>');
                    }
                }
            }
        };
        var failure = function (xhr, statusText, error) {
            ErrorHandler.addErrors(error.Message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
        };
        SearchUtil.searchProxy.vocabulary({ Word: word, Limit: 10 }, success, failure);
    },

    vocabTimer: function (word, selector, resetTimer) {
        if ($(selector).get(0).tagName.toLowerCase() === 'ul') {
            $(selector).hide();
        }
        if (resetTimer) {
            clearTimeout($(selector).data('timeout'));
            $(selector).data('timeout', null);
        }
        var func = function () {
            VocabUtil.getVocab(word, selector);
        };
        $(selector).data('timeout', setTimeout(func, Constants.TypeAheadDelay));
    }
};