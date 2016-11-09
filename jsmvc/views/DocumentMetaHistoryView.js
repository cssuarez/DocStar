var DocumentMetaHistoryView = Backbone.View.extend({
    className: 'DocumentMetaHistoryView',
    events: {
        "click .wfTab": "tabClick"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentmetahistoryviewlayout'));
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        return this;
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var up = Utility.GetUserPreference('histTab');
        if (!up) {
            up = 'allChat';
        }
        var ro = {
            userChatClass: up === 'userChat' ? 'selected' : '',
            sysChatClass: up === 'sysChat' ? 'selected' : '',
            allChatClass: up === 'allChat' ? 'selected' : '',
            approvalsClass: up === 'approvals' ? 'selected' : '',
            approvals: undefined,
            chatHistory: ''
        };
        if (up === 'approvals') {
            ro.approvals = [];
            var ct = doT.template(Templates.get('documentmetahistoryapprovalviewlayout'));
            var approvals = this.model.getDotted('DocumentPackage.Approvals');
            var i = 0;
            var markup = '';
            var length = approvals ? approvals.length : 0;
            for (i; i < length; i++) {
                var a = approvals.at(i);
                if (a.showChatHistory()){
                    var isUsers = a.isUserApproval(false);
                    var aro = {
                        approvalClass: isUsers ? 'currentUserApproval' : '',
                        iconClass: a.getIconClass(),
                        name: a.get('UserName'),
                        reason: a.get('Reason'),
                        createdOn: a.get('CreatedOn')
                    };
                    markup = ct(aro);
                    if (isUsers) {
                        ro.approvals.unshift(markup);
                    } else {
                        ro.approvals.push(markup);
                    }
                }
            }
        } else {
            ro.chatHistory = this.model.getDotted('DocumentPackage.WFDocumentDataPackage.ChatLog')|| '';
        }
        return ro;
    },

    tabClick: function (e) {
        var that = this;
        var $sel = $(e.currentTarget);
        var chatType = $sel.data('chattype');
        Utility.SetSingleUserPreference('histTab', chatType, function () {
            if (chatType === 'approvals') {
                that.render();
            } else {
                var wfData = that.model.getDotted('DocumentPackage.WFDocumentDataPackage');
                // Clear chatlog to be sure that getFormattedChatLog will trigger all required events Bug #12997
                wfData.unset('ChatLog', { silent: true });
                wfData.getFormattedChatLog(chatType);
            }

        });
    }
});