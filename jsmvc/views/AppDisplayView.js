var AppDisplayView = Backbone.View.extend({
    model: undefined, // SearchableEntityCPX
    className: 'AppDisplayView',
    events: {
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('appdisplaylayout'));
        this.viewerDataPkgCPX = new BulkViewerDataPackageCPX({ Id: this.model.versionId() });
    },
    getRenderObject: function () {
        var uc = Constants.UtilityConstants;
        var ro = {};
        var appData = this.model.getApprovalsData();
        var appDisplay = appData[uc.APPROVALS] ? appData[uc.APPROVALS].split(',') : '';
        ro.appState = appDisplay[0] || '';
        ro.approvalCountData = appDisplay[1] || '';
        ro.title = this.approvalText(appData[uc.DF_APPROVALS_STRINGS_TOOLTIP] || appData[uc.DF_APPROVALS_STRINGS] || []) || '';
        var appReq = appData[uc.DF_APPROVAL_REQUESTS] && appData[uc.DF_APPROVAL_REQUESTS].length > 0 ? appData[uc.DF_APPROVAL_REQUESTS] : '';
        var reqResult = [];
        if (appReq) {
            var rs = window.slimRoles;
            var us = window.users;
            var lengthObj = appReq.length;
            var i = 0;
            for (i = 0; i < lengthObj; i++) {
                var id = appReq[i];
                var role = rs.get(id);
                var user = us.get(id);
                if (role) { // Determine if it is a role
                    reqResult.push(role.get('Name'));
                }
                else if (user) {    // Determine if it is a user
                    reqResult.push(user.get('Username'));
                }
                else {
                    // Unable to find the user or group so display Not found
                    Utility.log(id);
                    reqResult.push(Constants.c.notfound);
                }
            }
            ro.reqResult = reqResult.join(", ") || '';
        }
        ro.hasAppRequests = reqResult && reqResult.length > 0;
        if (ro.hasAppRequests) {
            ro.title = $.trim(ro.title);
            if (ro.title) {
                ro.title += "\n ";
            }
            ro.title += String.format(Constants.t('approvalRequestsFor_tt'), reqResult.join(",\n"));
        }
        return ro;
    },
    render: function () {
        var viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(viewData));
        this.setupContextMenu();
        return this;
    },
    closeContextMenu: function () {
        var $cm = $('#cmroot-approvals_' + this.cid);
        if ($cm && $cm.length > 0) {
            $cm.remove();
        }
    },
    close: function () {
        this.closeContextMenu();
        this.unbind();
        this.remove();
    },
    approvalText: function (appTextArr) {
        if (!appTextArr || !(appTextArr instanceof Array)) {
            return '';
        }
        var len = appTextArr.length,
            i = 0,
            j,
            result = "",
            resArr,
            reslen,
            regexp = new RegExp(/user_([\w]){8}-([\w]){4}-([\w]){4}-([\w]){4}-([\w]){12}/gi),
            us = Utility.getUsersDictionary();
        var replacer = function (match) {
            var m = match.replace(/user_/gi, "");
            return us[m] || Constants.t("notfound");
        };

        for (j = 0; j < len; j += 1) {
            resArr = appTextArr[j].split('\\n');
            if (resArr) {
                reslen = resArr.length;
                if (reslen > 0) {
                    for (i = 0; i < len; i += 1) {
                        if (resArr[i]) {
                            result += resArr[i].replace(regexp, replacer);
                            if (resArr[i + 1]) {
                                result += "\n";
                            }
                        }
                    }
                }
                if (j !== len - 1) {
                    result += "\n";
                }
            }
        }
        return result;
    },
    setupContextMenu: function () {
        this.closeContextMenu();
        var that = this;
        var alias = "cmroot-approvals_" + this.cid;
        var menu = {
            onContextMenu: function (e) {
                var docType = that.model.get('Type');
                if (docType === undefined || docType === 1) {
                    var child = function (childIdx) {
                        return $('#' + alias).children().eq(childIdx);
                    };
                    var hide = function (childIdx) {
                        child(childIdx).hide();
                    };
                    var show = function (childIdx) {
                        child(childIdx).show();
                    };
                    var menuitemChange = function (childIdx, condition) {
                        if (condition) {
                            hide(childIdx);
                        } else {
                            show(childIdx);
                        }
                    };
                    var appStateCurr = that.model.getAppStateCurr();
                    menuitemChange(1, appStateCurr === 1);
                    menuitemChange(2, appStateCurr === 2);
                    menuitemChange(0, !appStateCurr);
                    return true;
                }
                return false;
            },
            alias: alias,
            width: 150,
            items: [
                {
                    text: "Recall", icon: "", alias: "Recall", action: function (t) {
                        var appStateCurr = that.model.getAppStateCurr();
                        var approving = appStateCurr === 1 ? true : (appStateCurr === 2 ? false : undefined);
                        if (approving === undefined) {
                            // This should not occur, but as a fail safe don't execute the 'Recall'
                            return;
                        }
                        that.viewerDataPkgCPX.fetch({
                            success: function () {
                                that.viewerDataPkgCPX.setMyApproval(ApprovalDialogs.setMyApproval, { approving: approving });
                            }
                        });
                    }
                },
                {
                    text: "Approve", icon: "", alias: "Approve", action: function (t) {
                        that.viewerDataPkgCPX.fetch({
                            success: function () {
                                that.viewerDataPkgCPX.setMyApproval(ApprovalDialogs.setMyApproval, { approving: true });
                            }
                        });
                    }
                },
                {
                    text: "Deny", icon: "", alias: "Deny", action: function (t) {
                        that.viewerDataPkgCPX.fetch({
                            success: function () {
                                that.viewerDataPkgCPX.setMyApproval(ApprovalDialogs.setMyApproval, { approving: false });
                            }
                        });
                    }
                }
            ]
        };
        this.$el.contextmenu(menu);
    }
    //#region Event Handling
    //#endregion Event Handling
});