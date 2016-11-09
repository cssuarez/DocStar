var DocumentMetaFolderView = Backbone.View.extend({
    options: undefined,
    tagName: "li",
    className: 'DocumentMetaFolderView metadata_viewer',
    events: {
        "click .addFolder": "addFolder",
        "click .removeFolder": "removeFolder",
        "click .moveTo": "moveTo"
    },
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('documentmetafolderviewlayout'));
        this.listenTo(this.model.getDotted('DocumentPackage.Folders'), 'add', this.render);
        this.listenTo(this.model.getDotted('DocumentPackage.Folders'), 'remove', this.render);
        this.listenTo(this.model.getDotted('DocumentPackage.Folders'), 'reset', this.render);
        return this;
    },
    render: function () {
        if (this.model && this.model.get('DocumentPackage')) {
            var ro = this.getRenderObject();
            this.$el.html(this.compiledTemplate(ro));
            if (this.options.hidden) {
                this.$el.hide();
            }
        }
        this.delegateEvents(); //Need to redelegate events since the parent container re-rendered.
        return this;
    },
    close: function () {        
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var removeAllowed = this.model.canI(Constants.sp.Modify, Constants.sp.Remove_From, Constants.et.Folder);
        var addAllowed = this.model.canI(Constants.sp.Modify, Constants.sp.Add_To, Constants.et.Folder);

        var ro = {
            folders: [],
            addStyle: addAllowed ? '' : 'style="display: none;"',
            moveStyle: addAllowed && removeAllowed ? '' : 'style="display: none;"'
        };

        var foldCol = this.model.getDotted('DocumentPackage.Folders');
        var i = 0;
        var length = foldCol.length;
        for (i; i < length; i++) {
            var f = foldCol.at(i);
            var canRemove = removeAllowed && Utility.checkSP(f.get('EffectivePermissions'), Constants.sp.Remove_From);
            ro.folders.push({
                Id: f.get('Id'),
                Name: f.get('Name'),
                removeStyle: canRemove ? '' : 'style="display: none;"'
            });
        }

        return ro;
    },
    addFolder: function () {
        this.model.get('DocumentPackage').addTo(DocumentMetaDialogs.addTo);
    },
    moveTo: function () {
        this.model.get('DocumentPackage').moveTo(DocumentMetaDialogs.moveTo);
    },
    removeFolder: function (ev) {
        var $elem = $(ev.currentTarget);
        var folderId = $elem.data('folderid');
        var foldCol = this.model.getDotted('DocumentPackage.Folders');
        var i = 0;
        var length = foldCol.length;
        for (i; i < length; i++) {
            var f = foldCol.at(i);
            if (f.get('Id') === folderId) {
                f.destroy();
                break;
            }
        }
    }
});