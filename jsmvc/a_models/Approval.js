var Approval = Backbone.Model.extend({
    dateTimeFields: { CreatedOn: true },
    idAttribute: 'Id',
    /// <summary>
    /// Checks if this is the current users approval
    /// If include roles is true then role approval requests the user is a member of will return true as well.
    /// </summary>
    isUserApproval: function (includeRoles) {        
        var userId = this.get('UserId');
        if (userId === Page.currentUser.Id) {
            return true;
        }
        if (includeRoles) {
            var role = window.slimRoles.get(userId); //Requests may be to roles
            if (role && role.get('IsMember')) {
                return true;
            }
        }
        return false;
    },
    /// <summary>
    /// Checks if the this approval is approved
    /// </summary>
    isApproved: function () {
        var state = this.get('State');
        if (!this.wasApproved() && (state & Constants.as.Approved) === Constants.as.Approved) {
            return true;
        }
        return false;
    },
    /// <summary>
    /// Checks if the this approval is denied
    /// </summary>
    isDenied: function () {        
        var state = this.get('State');
        if (!this.wasApproved() && (state & Constants.as.Denied) === Constants.as.Denied) {
            return true;
        }
        return false;
    },
    /// <summary>
    /// Checks if the this approval has the was state
    /// </summary>
    wasApproved: function () {
        var state = this.get('State');
        if ((state & Constants.as.Was) === Constants.as.Was) {
            return true;
        }
        return false;
    },
    /// <summary>
    ///  Return true if approval has a visible state
    /// </summary>
    showChatHistory: function(){
        var state = this.get('State');
        var validStates = Constants.as.RequestedFromGroup | Constants.as.ApprovedOrDenied | Constants.as.Was;
        return (state & validStates) !== 0; // Note that this doesn't fully validate state.  It returns true if Approved and Denied are both set, which is not valid.
    },
    /// <summary>
    /// Retrieves the correct icon class based on the approval state
    /// </summary>
    getIconClass: function () {
        var state = this.get('State');
        if ((state & Constants.as.Was) === Constants.as.Was) {
            if ((state & Constants.as.Denied) === Constants.as.Denied) {
                return 'wasdenied';
            }
            if ((state & Constants.as.Approved) === Constants.as.Approved) {
                return 'wasapproved';
            }
        }
        if ((state & Constants.as.Denied) === Constants.as.Denied) {
            return 'denied';
        }
        if ((state & Constants.as.Approved) === Constants.as.Approved) {
            return 'approved';
        }
        if ((state & Constants.as.RequestedFromGroup) === Constants.as.RequestedFromGroup) {
            return 'requestedfromgroup';
        }
        if ((state & Constants.as.Requested) === Constants.as.Requested) {
            return 'requested';
        }
        return 'none';
    }
});