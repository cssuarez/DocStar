var DocumentMetaVersioningView = Backbone.View.extend({
    model: undefined, //Model is BulkViewerDataPackageCPX
    subviewModel: undefined, //GetViewableVersionsPackageCPX
    className: 'DocumentMetaVersioningView',
    dvGridView: undefined,
    dvCommentView: undefined,
    currentDocId: undefined,
    events: {
        "click .promote:not(.disabled)": "promote",
        "click .checkIn:not(.disabled)": "checkIn",
        "click .checkOut:not(.disabled)": "checkOut",
        "click .cancelVersioning:not(.disabled)": "cancelVersioning"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentmetaversioningviewlayout'));        
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        var docId = this.model.documentId();
        if (docId) {
            if (this.dvGridView) {
                this.dvGridView.close();
                this.dvGridView = null;
                this.dvCommentView.close();
                this.dvCommentView = null;
            }
            if (this.subviewModel) {
                this.stopListening(this.subviewModel);
            }
            this.subviewModel = null;
            this.subviewModel = new GetViewableVersionsPackageCPX({ Id: docId, IncludeCurrentVersion: true, selectedId: this.model.versionId() });
            this.listenTo(this.subviewModel, 'sync', this.subviewModelSynced);
            var subOptions = { model: this.subviewModel, docModel: this.model, effPermissions: this.model.effectivePermissions() };
            this.dvGridView = new DocumentVersioningGridView(subOptions);
            this.dvCommentView = new DocumentVersioningCommentView(subOptions);
            var dvgvc = this.$el.find('.DocumentVersioningGridViewContainer');
            var dvcvc = this.$el.find('.DocumentVersioningCommentViewContainer');
            dvgvc.html(this.dvGridView.render().$el);
            dvcvc.html(this.dvCommentView.render().$el);
            this.subviewModel.fetch({ skipVersioningViewRender: true });
            this.currentDocId = docId;
        }
        return this;
    },
    close: function () {
        if (this.dvGridView) {
            this.dvGridView.close();
            this.dvGridView = undefined;
        }
        if (this.dvCommentView) {
            this.dvCommentView.close();
            this.dvCommentView = undefined;
        }
        this.subviewModel = null;
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var ro = {
            cancelClass: '',
            cancelTitle: '',
            checkOutClass: '',
            checkOutTitle: '',
            checkInClass: '',
            checkInTitle: '',
            promoteClass: '',
            promoteTitle: ''
        };
        var versionId = this.model.versionId();
        var vsi = this.model.getDotted('DocumentPackage.VersionStateInfo');
        var draftId = vsi.get('DraftVersionId');
        var versionCount = vsi.get('VersionCount');

        if (!draftId) {
            ro.cancelClass = 'disabled';
            ro.cancelTitle = 'title="' + Constants.c.draftCancelNoDrafts + '"';
        } else if (draftId !== versionId) {
            ro.cancelClass = 'disabled';
            ro.cancelTitle = 'title="' + Constants.c.draftCancelDraftNotSelected + '"';
        } else if (versionCount === 1) {
            ro.cancelClass = 'disabled';
            ro.cancelTitle = 'title="' + Constants.c.draftCancelCannotDeleteLastVersion + '"';
        }

        if (versionCount === 1) {
            ro.promoteClass = 'disabled';
            ro.promoteTitle = 'title="' + Constants.c.cannotPromoteTheLatestVersion + '"';
        }
        else if (!draftId && !this.model.hasRights(Constants.sp.VersionPublisher)) {
            ro.promoteClass = 'disabled';
            ro.promoteTitle = 'title="' + Constants.c.cannotPromoteVersionPublisherRequired + '"';
        }
        else if (vsi.get('LatestVersionId') === versionId) {
            ro.promoteClass = 'disabled';
            ro.promoteTitle = 'title="' + Constants.c.cannotPromoteTheLatestVersion + '"';
        }

        if (draftId && vsi.get('DraftVersionId') !== versionId) {
            ro.checkOutClass = 'disabled';
            ro.checkOutTitle = 'title="' + Constants.c.cannotCheckOutDraftNotSelected + '"';
        }
        else if (!draftId && vsi.get('PublishedVersionId') !== versionId) {
            ro.checkOutClass = 'disabled';
            ro.checkOutTitle = 'title="' + Constants.c.cannotCheckOutPublishedVersionNotSelected + '"';
        }

        if (draftId && vsi.get('DraftVersionId') !== versionId) {
            ro.checkInClass = 'disabled';
            ro.checkInTitle = 'title="' + Constants.c.cannotCheckInDraftNotSelected + '"';
        }
        else if (!draftId) {
            ro.checkInClass = 'disabled';
            ro.checkInTitle = 'title="' + Constants.c.cannotCheckinDraftDoesntExist + '"';
        }

        return ro;
    },
    subviewModelSynced: function (m, resp, o) {
        if (!o.skipVersioningViewRender) {
            this.model.setDotted('DocumentPackage.VersionStateInfo', m.get('VersionStateInfo'), { ignoreChange: true }); //Don't trigger dirty on an update to the VSI.
            this.render();
        }
    },
    promote: function () {
        this.model.promote(VersioningDialogs.promote);
    },
    checkIn: function () {
        this.model.checkIn(VersioningDialogs.checkIn);
    },
    checkOut: function () {
        this.model.checkOut(VersioningDialogs.checkOut, VersioningDialogs.checkOutFileDownload);
    },
    cancelVersioning: function () {
        this.model.cancelDraft(VersioningDialogs.cancelCheckOut);
    }
});