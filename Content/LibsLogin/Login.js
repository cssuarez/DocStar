var Login = {
    lastError: undefined,
    init: function () {
        //iFrame communication: iFrame on load calls parent.postMessage, we listen for that message.
        if (window.addEventListener) {
            addEventListener("message", Login.messageRecieved, false);
        } else {
            attachEvent("onmessage", Login.messageRecieved);
        }

        var useSSO = Utility.convertToBool($.cookie('useSSO')) && !$('#authMessage').text().trim(); // don't SSO if login has just failed (avoid endless loop)
        var hash = window.location.hash;
        if (useSSO || (hash && hash.toLowerCase() === "#ad")) {
            Login.runIntegratedAuthentication();
        }
        Login.runFadeIn();
    },
    DoIt: function (fsel, esel) {
        $('.ssoFailed').hide();
        if (Utility.isMT('password') || Utility.isMT('username')) {
            $(esel).text(Constants.c.badCredentials);
            return;
        }
        $('#loginButton').attr('disabled', true);
        var userNameVal = $(fsel + ' #userName').val();
        $(esel).text("");
        $.ajax({
            url: Constants.Url_Base + "Account/Login",
            type: "post",
            data: $(fsel).serialize(),
            success: function (result, status, jqxhr) {
                if (result.status === 'ok') {
                    Login.redirectAfterLogin();
                } else {
                    var exception = result.fullEx.Data;
                    if (exception === "PasswordExpired" || exception === "RequireNewPassword") {
                        $.cookie('userNameVal', userNameVal);
                        window.location.href = Constants.Url_Base + "Account/PasswordExpired?message=" + result.message;
                    }
                    $(esel).text(result.message);
                    $('#loginButton').attr('disabled', false);
                }
            },
            error: function (xhr, status, e) {
                $(esel).text(Constants.c.badCredentials);
                $('#loginButton').attr('disabled', false);
            },
            complete: function (xhr, status) {
                var message = xhr.getResponseHeader('AuthMessage');
                if (message) {
                    $('#authMessage').html(Constants.c["loginRequiredReason_" + message]);
                }
            }
        });
        return 0;
    },
    runFadeIn: function () {
        var elems = $('.fadein');
        elems.each(function (index, item) {
            if ($(item).css('display') === 'none') {
                $(item).fadeIn('fast', function () { Login.runFadeIn(); });
                return false;
            }
        });

    },
    redirectAfterLogin: function () {
        var dest = $.cookie('destHref');
        if (!dest) {
            dest = Constants.Url_Base;
        }
        $.cookie('destHref', null);
        window.location.href = dest;
    },
    runIntegratedAuthentication: function () {
        $('#authMessage').text('');
        $.cookie('useSSO', false, { expires: 1, path: '/', domain: Constants.ProxyCookieDomain }); //Remove SSO cookie on every attempt. A failure will result in the user having to click the SSO button again.
        $('#sso_indicator_container').show();
        $('#authMessage').text('');
        $('.ssoFailed').hide();
        document.getElementById("ssoButton").disabled = true;
        var url = Constants.Server_Url + '/IntegratedAuthentication.ashx';
        document.getElementById('integratedAuthentication').onload = Login.iFrameLoaded;
        document.getElementById('integratedAuthentication').onabort = Login.iFrameAbort;
        document.getElementById('integratedAuthentication').src = url;
    },
    messageRecieved: function (event) {
        if (event.origin.indexOf(document.domain) === -1) {
            return; //Not our message. 
        }

        clearTimeout(Login.timeOutHandle);
        var resObj;
        if (event.data) {
            try {
                resObj = JSON.parse(event.data);
            }
            catch (ex) { }
        }
        var loggedIn = false;
        if (!$.isEmptyObject(resObj) && !$.isEmptyObject(resObj.Result)) {
            $.ajax({
                url: Constants.Url_Base + "Account/AuthCookieFromLoginPackage",
                type: "post",
                data: JSON.stringify(resObj.Result),
                contentType: "application/json; charset=utf-8",
                success: function (result, status, jqxhr) {
                    if (result.status === 'ok') {
                        loggedIn = true;
                        $.cookie('useSSO', true, { expires: 365, path: '/', domain: Constants.ProxyCookieDomain }); //1 year cookie from last login
                        Login.redirectAfterLogin();
                    }
                    else {
                        Login.lastError = result.message;
                        $('.ssoFailed').css('display', 'inline-block');
                    }
                },
                complete: function () {
                    $('#sso_indicator_container').hide();
                    document.getElementById("ssoButton").disabled = loggedIn;
                }
            });
        }
        else {
            //No error is to be displayed to the user, a generic message is displayed instead. Last error retained in case we want to display the real error message.
            $('#sso_indicator_container').hide();
            $('.ssoFailed').css('display', 'inline-block');
            document.getElementById("ssoButton").disabled = false;
            if (!$.isEmptyObject(resObj) && !$.isEmptyObject(resObj.Error)) {
                Login.lastError = resObj.Error.Message;
            }
            else {
                Login.lastError = result;
            }
        }
    },
    iFrameLoaded: function () {
        //If we don't get a message from the iFrame within the timeout assume something went wrong (or the user clicked cancel).
        Login.timeOutHandle = setTimeout(Login.iFrameAbort, 3000);
    },
    iFrameAbort: function () {
        document.getElementById("ssoButton").disabled = false;
        $('#sso_indicator_container').hide();
        $('.ssoFailed').css('display', 'inline-block');
    }
};
