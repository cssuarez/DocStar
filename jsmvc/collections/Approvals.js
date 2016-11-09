var Approvals = Backbone.Collection.extend({
    model: Approval,
    /// <summary>
    /// Checks if the current user has an approval in this collection.
    /// This includes checking to see if the user is in a role that has an approval request.
    /// </summary>
    userHasApprovals: function () {
        var length = this.length;
        var i = 0;
        for (i; i < length; i++) {
            var app = this.at(i);
            if (app.isUserApproval(true)) {
                return true;
            }
        }
        return false;
    },
    /// <summary>
    /// Returns the current users approval.
    /// </summary>
    myApproval: function () {
        var length = this.length;
        var i = 0;
        for (i; i < length; i++) {
            var app = this.at(i);
            if (app.get('UserId') === Page.currentUser.Id) {
                return app;
            }
        }
    }
});