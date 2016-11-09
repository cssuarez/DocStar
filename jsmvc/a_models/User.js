/// <reference path="../../Content/JSProxy/UserServiceProxy.js" />
// user model
var User = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    proxy: UserServiceProxy({ skipStringifyWcf: true }),
    validate: function (attrs) {
        //validate gets called when updating the model too.  
        if (attrs.Id === undefined) {
            return;
        }
        //the following are required fields for user
        //username
        //password
        //optional fields
        //security question
        //answer
        var msg = {};
        if ((attrs.UpdatePassword === true || attrs.Id === Constants.c.emptyGuid) && attrs.Password !== attrs.password_reenter) {
            msg.Password = Constants.c.passwordsMustMatch;
        }
        if (attrs.UpdatePassword === true) {
            if ($.trim(attrs.Password) === '') {
                msg.Password = Constants.c.passwordCannotBeBlank;
            }
            if ($.trim(attrs.Username) === '') {
                msg.Username = Constants.c.usernameCannotBeEmpty;
            }
        }
        // Validate duplicate name between ReadOnly Users and Non-ReadOnly users
        var readOnlyUsers = new Users(Utility.getReadOnlyUsers(null, window.users, true, true));
        var idx = 0;
        var length = readOnlyUsers.length;
        var item;
        for (idx = 0; idx < length; idx++) {
            item = readOnlyUsers.at(idx);
            if (attrs.Username.toLowerCase() === item.get('Username').toLowerCase() && (attrs.Id === Constants.c.newGuid || attrs.Id !== item.get('Id'))) {
                msg.Username = Constants.c.duplicateUsername;
            }
        }
        var nonReadOnlyUsers = new Users(Utility.getUsers(null, null, true, true));
        length = nonReadOnlyUsers.length;
        for (idx = 0; idx < length; idx++) {
            item = nonReadOnlyUsers.at(idx);
            if (attrs.Username.toLowerCase() === item.get('Username').toLowerCase() && (attrs.Id === Constants.c.newGuid || attrs.Id !== item.get('Id'))) {
                msg.Username = Constants.c.duplicateUsername;
            }
        }
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    sync: function (method, model, options) {
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            $.ajax({
                url: Constants.Url_Base + "SystemMaintenance/NotifyProxyChange" + Utility.getCacheBusterStr(),
                type: "GET"
            });
            if (options && options.success) {
                options.success(result);
            }
        };
        var pkg = { User: model.toJSON() };
        if (method !== 'delete' && options.SetPassword) {
            pkg.SetPassword = true;
            pkg.Password = options.Password;
            pkg.PasswordQuestion = options.PasswordQuestion;
            pkg.PasswordAnswer = options.PasswordAnswer;
        }
        switch (method) {
            case 'create':
                this.proxy.Create(pkg, sf, ff, complete);
                break;
            case 'update':
                this.proxy.Update(pkg, sf, ff, complete);
                break;
            case 'delete':
                var delObj = { UserId: model.get('Id') };
                if (options && options.ReplacementUserId && options.ReplacementUserId !== Constants.c.emptyGuid) {
                    delObj.ReplacementUserId = options.ReplacementUserId;
                }
                this.proxy.Delete(delObj, sf, ff, complete);
                break;
        }

    }
});