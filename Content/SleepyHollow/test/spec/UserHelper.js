
var UserHelper = {

    GetAllUsers: function (callback) {
        $.ajax({ 
            url: Constants.Server_Url + "/HostingV2/User.svc/restssl/GetAll",
            type: "post",
            success: function (result, status, jqxhr) {
                // store User models in a var rObj
                var rObj = JSON.parse(jqxhr.responseText);
                // return a newly created collection using the result property of rObj
                var uResult = new Users(rObj.Result);

                return callback(uResult);
            },
            error: function (xhr, status, e) {
                console.error(xhr);
            },

            complete: function (xhr, status) {
                var message = xhr.getResponseHeader('AuthMessage');
                console.log(message);
            }
        });
    }
};