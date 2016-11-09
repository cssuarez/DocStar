var DocumentVersioningCommentView = Backbone.View.extend({
    model: undefined, //Model is GetViewableVersionsPackageCPX
    docModel: undefined,
    effPermissions: undefined,
    showAll: false,
    className: 'DocumentVersioningCommentView',
    events: {
        "click .showCurrentAndPreviousComments": "showCurrentAndPreviousCommentsClick",
        "click .deleteVersionComment": "deleteVersionCommentClick",
        "keyup .versChatInput": "versChatInputKeyUp"
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentversioningcommentviewlayout'));
        this.docModel = options.docModel;
        this.effPermissions = options.effPermissions;
        this.options = options || {};
        this.listenTo(this.model, 'sync change', this.render);
        return this;
    },
    render: function () {
        if (this.model.get('Comments')) {
            var ro = this.getRenderObject();
            this.$el.html(this.compiledTemplate(ro));
        } else {
            this.$el.html('');
        }
        return this;
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var ro = {
            showLabel: this.showAll ? Constants.c.showCurrent : Constants.c.showAll,
            comments: []
        };
        var comments = this.model.get('Comments');
        var versions = this.model.get('Versions');
        var currentVerId = this.model.get('selectedId');
        var lastVerId;
        var u;
        var i = 0;
        var length = comments.length;
        for (i; i < length; i++) {
            var c = comments.at(i);
            if (this.showAll || c.get('DocumentVersionId') === currentVerId) {
                if (this.showAll && lastVerId !== c.get('DocumentVersionId')) {
                    lastVerId = c.get('DocumentVersionId');
                    var ver = versions.get(lastVerId);
                    ro.comments.push({
                        versionLabel: String.format('{0} {1}.{2}:', Constants.c.version, ver.get('Major'), ver.get('Minor'))
                    });
                }
                u = window.users.get(c.get('UserId'));
                ro.comments.push({
                    id: c.get('Id'),
                    username: u ? u.get('Username') : Constants.c.notfound,
                    date: c.get('CommentDate'),
                    message: c.get('Comment')
                });
            }
        }
        return ro;
    },
    showCurrentAndPreviousCommentsClick: function (e) {
        this.showAll = !this.showAll;
        this.render();
    },
    deleteVersionCommentClick: function (e) {
        var $sel = $(e.currentTarget);
        var id = $sel.parent().data('commentid');
        var c = this.model.get('Comments').get(id);
        if (c) {
            c.destroy({ dialogFunc: VersioningDialogs.deleteVersionComment, wait: true });
        }
    },
    versChatInputKeyUp: function (e) {
        if (e.which === 13) {
            var val = $(e.currentTarget).val();
            var m = new VersionComment({ Comment: val, DocumentVersionId: this.model.get('selectedId') });
            var that = this;
            m.save({}, {
                success: function () {
                    that.model.get('Comments').add(m);
                }
            });
        }
    }
});