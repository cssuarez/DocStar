var Login = {
    DoIt: function (fsel, esel) {
        if ($.trim($('input[name="username"]').val()) === '') {
            $(esel).text("Invalid username or password");
            return;
        }
        $('#loginButton').attr('disabled', true);
        $(esel).text("");
        var data = {};
        data.username = $('input[name="username"]').val();
        data.password = $('input[name="password"]').val();
        data.remember_me = $('input[name="remember_me"]').is(':checked');
        $.ajax({
            url: "Authenticate",
            type: "post",
            data: data,
            success: function (result, status, jqxhr) {
                if (result.status === 'ok') {
                    $(location).attr("href", "../Home/Index");
                } else {
                    if (result.message === "-4" || result.message === "-2") {
                        $(esel).text("Bad Username and/or Password");
                    } if (result.message === "1") {
                        $(esel).text("License count exceeded");
                    } else {
                        $(esel).text(result.message);
                    }
                    $('#loginButton').attr('disabled', false);
                }
            },
            error: function () {
                $(esel).text("Bad username or password");
                $('#loginButton').attr('disabled', false);
            }
        });
    },
    runFadeIn: function () {
        var elems = $('.fadein');
        elems.each(function (index, item) {
            if ($(item).css('display') === 'none') {
                $(item).fadeIn('fast', function () { Login.runFadeIn(); });
                return false;
            }
        });
    }
};
