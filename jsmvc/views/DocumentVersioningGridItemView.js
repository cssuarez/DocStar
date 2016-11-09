var DocumentVersioningGridItemView = Backbone.View.extend({
    className: 'DocumentVersioningGridItemView',
    tagName: 'tr',
    effPermissions: undefined,
    model: undefined, //DocumentVersionCPX
    viewVersPkg: undefined, //Model passed from parent (grid) is GetViewableVersionsPackageCPX.
    docModel: undefined,//Only available when loaded via the DocumentMetaVersioningView, used as a flag to show comments of not as well as the ability to unpublish.
    selectedId: undefined,
    events: {
        'click .deleteVersion': 'deleteVersion',
        'click .unpublishVersion': 'unpublishVersion'
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentversioninggriditemviewlayout'));
        this.effPermissions = options.effPermissions;
        this.docModel = options.docModel;
        this.viewVersPkg = options.viewVersPkg;
        this.$el.data('rowid', this.model.get('Id'));
        this.listenTo(this.model, 'change:isSelected', this.selectedChanged);
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.selectedChanged();
        return this;
    },
    getRenderObject: function (editMode) {
        var ro = {
            comments: undefined,
            lockToolTip: '',
            versionNumberTitle: this.model.get('Title'),
            versionNumber: String.format('{0}.{1}', this.model.get('Major'), this.model.get('Minor')),
            versionStateTitle: '',
            versionState: this.model.getState(),
            usernameTitle: '',
            username: this.model.getUserName(),
            publisherNameTitle: '',
            publisherName: this.model.getPublisherName(),
            dateTitle: '',
            date: this.model.get('ModifiedOn'),
            canDelete: Utility.hasFlag(this.effPermissions, Constants.sp.Delete),
            canUnpublish: !!this.docModel && Utility.hasFlag(this.effPermissions, Constants.sp.VersionPublisher)
        };
        ro.versionNumberTitle = 'title="' + ro.versionNumber + ': ' + ro.versionNumberTitle + '"';

        var cs = this.model.get('CurrentState');
        if (ro.canUnpublish && cs !== Constants.ds.Published) {
            ro.canUnpublish = false; //Not the published version, can't unpublish regardless of rights.
        }

        if (cs === Constants.ds.Draft && this.model.get('DraftOwnerId')) {
            var lockUser = window.users.get(this.model.get('DraftOwnerId'));
            if (lockUser) {
                ro.lockToolTip = Constants.c.draftOwner + ': ' + lockUser.get('Username');
            } else {
                ro.lockToolTip = Constants.c.draftOwner + ': ' + Constants.c.notfound;
            }
            ro.lockToolTip = 'title="' + ro.lockToolTip + '"';
        }
        //Comments if needed
        if (!this.docModel && this.viewVersPkg) {
            var comments = this.viewVersPkg.get('Comments');
            ro.comments = [];
            var i = 0;
            var length = comments.length;
            for (i; i < length; i++) {
                if (comments.at(i).get('DocumentVersionId') === this.model.get('Id')) {
                    ro.comments.push(Utility.safeHtmlValue(comments.at(i).get('Comment')));
                }
            }
        }
        //Fill titles.
        ro.versionStateTitle = 'title="' + ro.versionState + '"';
        if (ro.username) {
            ro.usernameTitle = 'title="' + ro.username + '"';
        }
        if (ro.publisherName) {
            ro.publisherNameTitle = 'title="' + ro.publisherName + '"';
        }
        ro.dateTitle = 'title="' + ro.date + '"';
        return ro;
    },
    deleteVersion: function (e) {
        var that = this;
        if (this.docModel) {
            var cb = function (fetched) {
                if (!fetched) {
                    that.viewVersPkg.fetch();
                }
            };
            this.docModel.deleteVersion(this.model.get('Id'), VersioningDialogs.deleteVersion, this.viewVersPkg.get('Versions'), cb);
        } else {
            this.model.destroy({ dialogFunc: VersioningDialogs.deleteVersion, wait: true });
        }
        if (e) {
            e.stopPropagation(); //Don't propegate the event to the TD above which is also listening for a click event.
        }
        return false;
    },
    unpublishVersion: function (e) {
        var versions = {};
        this.docModel.unpublishVersion(VersioningDialogs.unpublishVersion, this.viewVersPkg.get('Versions'));
        if (e) {
            e.stopPropagation(); //Don't propegate the event to the TD above which is also listening for a click event.
        }
        return false;
    },
    selectedChanged: function () {
        var modelId = this.model.get('Id');
        if (modelId === this.viewVersPkg.get('selectedId')) {
            this.$el.addClass('selected');
        } else {
            this.$el.removeClass('selected');
        }
    }
});