describe('User Model', function () {

    it('should create a User Model', function (done) {
        $.ajax({
            url: Constants.Server_Url + "/HostingV2/User.svc/restssl/GetAll",
            type: "post",
            //data: json,
            success: function (result, status, jqxhr) {
                rObj = JSON.parse(jqxhr.responseText);
                uResult = new Users(rObj.Result);
                console.log(uResult);
                done();
            },
            error: function (xhr, status, e) {
                console.error(xhr);
                done();
            },

            complete: function (xhr, status) {
                var message = xhr.getResponseHeader('AuthMessage');
                done();
            }

        });
    });
});