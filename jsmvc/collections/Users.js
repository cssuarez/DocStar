// Collection for User model
// defines the model to use, and the URL of the API method to fill the collection with said models
var Users = Backbone.Collection.extend({
    proxy: UserServiceProxy({ skipStringifyWcf: true }),
    model: User,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    url: Constants.Url_Base + "User/GetAllUsers",
    initialize: function () {
        this.listenTo(this, 'add remove reset change', function () {
            Utility.BustCachedItem('userDictionaryData');
            Utility.BustCachedItem('userRoleDictionaryData');
        });
    },
    ///<summary>
    /// Obtain a filtered array of the users collection for Workflow User Queues
    /// Filter based on if the current user is a SuperAdmin or a WFAdmin
    ///</summary>
    getFilteredUserQueues: function () {
        var currentUser = Utility.getCurrentUser();
        var isAdmin = Utility.convertToBool($('#isSuperAdmin').val());
        var isWfAdmin = Utility.hasFlag(window.gatewayPermissions, Constants.gp.WFAdmin);
        var excludeFlags = [Constants.uf.Proxy]; // Always filter out proxy users
        // Exclude all super admins (instance admins and super admins) from user queues if the user is a workflow admin, but not a super admin
        if (!isAdmin && isWfAdmin) {
            excludeFlags.push(Constants.uf.SuperAdmin);
        }
        if (!isAdmin && !isWfAdmin) {
            listuq = new Users(this.get(currentUser.Id));
        }
        else {
            listuq = new Users(Utility.getUsers(excludeFlags, this, !isAdmin, true));
        }
        return listuq.toJSON();
    },
    sync: function (method, collection, options) {
        var ff = function (jqXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            } else {
                ErrorHandler.popUpMessage(error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (results) {
            if (options && options.success) {
                options.success(results);
            }
        };
        switch (method) {
            case 'read':
                this.proxy.GetAll(sf, ff);
                break;
        }
    }
});