var DocumentMetaApprovalView = Backbone.View.extend({
    model: undefined, // BulkViewerDataPackageCPX
    className: 'DocumentMetaApprovalView',
    bound: false,
    events: {
        "click .deny:not(.disabled, .executingDisabled)": "approveOrDeny",
        "click .approve:not(.disabled, .executingDisabled)": "approveOrDeny"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentmetaapprovalviewlayout'));

        this.listenTo(this.model.get('DocumentPackage'), 'change:Approval', function (model, value, options) {
            // Disable/enable the 'Approve' or 'Deny' buttons when the approval for the approval stamp has changed.
            this.$el.find('.approve, .deny').removeClass('disabled');
            if (value) {
                if (value.isApproved()) {
                    this.$el.find('.approve').addClass('disabled');
                }
                else if (value.isDenied()) {
                    this.$el.find('.deny').addClass('disabled');
                }
            }
        });
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        if (!this.bound) { //Cannot bind in init, models do not exist then
            this.listenTo(this.model.getDotted('DocumentPackage.Approvals'), 'reset', this.render);
            this.bound = true;
        }
        return this;
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var ro = { approveClass: '', deniedClass: '', approveText: Constants.c.approve, denyText: Constants.c.deny };
        var myApproval = this.model.getDotted('DocumentPackage.Approvals').myApproval();
        if (myApproval) {
            if (myApproval.isApproved()) {
                ro.approveClass = 'marvinRobot'; // Marvin is depressed. Poor Marvin.
                ro.approveText = Constants.c.recall;
            } else if (myApproval.isDenied()) {
                ro.deniedClass = 'marvinRobot';
                ro.denyText = Constants.c.recall;
            }
        }
        return ro;
    },
    approveOrDeny: function (ev) {
        var approving = $(ev.currentTarget).hasClass('approve');
        this.model.setMyApproval(ApprovalDialogs.setMyApproval, { approving: approving, mayDelaySave: true });
    }
});