var DocumentMetaFieldGroupsView = Backbone.View.extend({
    model: undefined, // BulkViewerDataPackageCPX
    className: 'DocumentMetaFieldGroupsView',
    ro: undefined,
    groupViews: [],
    bound: false,
    events: {
        'click .addGroup': 'addGroup'
    },
    close: function () {
        this.closeGroupViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.groupViews = [];   // HAS to be set here to an empty array, other wise other DocumentMetaFieldGroupsView's will share this array...
        this.compiledTemplate = doT.template(Templates.get('documentmetafieldgroupsviewlayout'));
        this.options = options || {};
        this.canDelete = options.canDelete === false ? false : true;
        this.canDeleteGroup = options.canDeleteGroup === false ? false : true;
        this.canAdd = options.canAdd === false ? false : true;
        this.canSave = options.canSave;
        this.listenTo(window.customFieldMetaGroupPackages, 'add remove reset', this.renderCustomFieldGroupList);
        return this;
    },
    render: function () {
        this.ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.ro));
        this.renderGroupViews(this.ro);
        if (!this.bound) {
            this.bound = true;
            var cfgs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
            this.listenTo(cfgs, 'add', this.fieldValuesAdded);
            this.listenTo(cfgs, 'remove', this.fieldValuesRemoved);
            this.listenTo(cfgs, 'reset', this.render);
            this.listenTo(window.userPreferences, 'change', function (model, value, options) {
                var key = model.get('Key');
                var groupId;
                for (groupId in this.ro.repGroups) {
                    if (this.ro.repGroups.hasOwnProperty(groupId) && key === 'col_Pref_' + groupId) {
                        this.render();
                    }
                }
            });
        }
        this.$el.find('.customFieldGroupItemsLibraryViewScroll').perfectScrollbar({
            wheelSpeed: 20,
            wheelPropagation: true,
            minScrollbarLength: 20,
            useKeyboard: false,
            notInContainer: false
        });
        this.$el.find('.ps-scrollbar-x-rail').remove();
        // Resize once completely rendered allowing grids columns to be resized properly
        var that = this;
        setTimeout(function () { that.resizeGroupViews(); }, 4);
        return this;
    },
    renderGroupViews: function (ro) {
        this.closeGroupViews();
        var $container = this.$el.find('.cfgGridsContainer');
        var groupId;
        for (groupId in ro.repGroups) {
            if (ro.repGroups.hasOwnProperty(groupId)) {
                var gv = new DocumentMetaFieldGroupView({
                    model: this.model,
                    groupId: groupId,
                    showGroupName: ro.showGroupName,
                    canDelete: ro.canDelete,
                    canDeleteGroup: this.canDeleteGroup,
                    canSave: ro.canSave
                });
                this.groupViews.push(gv);
                $container.append(gv.render().$el);
            }
        }
    },
    closeGroupViews: function () {
        var gv = this.groupViews.pop();
        while (gv) {
            gv.close();
            gv = undefined;
            gv = this.groupViews.pop();
        }
    },
    resizeGroupViews: function() {
        var length = this.groupViews.length;
        var i = 0;
        for (i; i < length; i++) {
            this.groupViews[i].gceResize();
        }
    },
    renderCustomFieldGroupList: function () {
        this.ro = this.getRenderObject();
        this.$el.find('.customFieldGroup').empty();
        var $sel = this.$el.find('.customFieldGroup').clone();
        var idx = 0;
        var cfgLen = this.ro.listcfgs.length;
        for (idx; idx < cfgLen; idx++) {
            var gId = this.ro.listcfgs[idx].Id;
            var gName = this.ro.listcfgs[idx].Name;
            if (!this.ro.repGroups[gId]) {  // Only append an option if the document doesn't already contain the group
                var $opt = $('<option></option>');
                $opt.val(gId);
                $opt.text(gName);
                $sel.append($opt);
            }
        }
        this.$el.find('.customFieldGroup').replaceWith($sel);
    },
    getRenderObject: function () {
        var r = {   // Default object
            repGroups: {},
            listcfgs: [],
            addGroupClass: '',
            addGroupTT: '',
            showGroupName: false,
            hasModifyPermission: false
        };
        if (!this.model || !this.model.getDotted('DocumentPackage.Version.CustomFieldValues')) {
            return r;
        }
        r.repGroups = this.model.getDotted('DocumentPackage.Version.CustomFieldValues').getRepresentedGroups();
        var listcfgs = window.customFieldMetaGroupPackages;
        r.listcfgs = [];
        var idx = 0;
        var length = listcfgs.length;
        for (idx; idx < length; idx++) {
            var cfgPkg = listcfgs.at(idx);
            if (cfgPkg) {
                var cfg = cfgPkg.get('CustomFieldGroup');
                if (!r.repGroups[cfg.Id]) {
                    r.listcfgs.push({
                        Id: cfg.Id,
                        Name: cfg.Name
                    });
                }
            }
        }
        r.addGroupClass = r.listcfgs.length === 0 ? 'disabled' : '';
        r.addGroupTT = r.listcfgs.length === 0 ? 'title="' + Constants.c.noCustomFieldGroupsToAdd + '"' : '';
        r.showGroupName = true;//Utility.getObjectLength(r.repGroups) + r.listcfgs.length > 1; // If there is more than one group in the system, show the names.
        r.canDelete = this.canDelete;
        r.canSave = this.canSave;
        r.hasModifyPermission = this.model.hasRights(Constants.sp.Modify);
        r.canAdd = this.canAdd;
        return r;
    },
    addGroup: function (ev) {
        var $targ = $(ev.currentTarget);
        var cfgSelected = this.$el.find('.customFieldGroup :selected');
        var cfgId = cfgSelected.val();
        if ($targ.hasClass('disabled') || !cfgId || !window.customFieldMetaGroupPackages.get(cfgId)) {
            return;
        }
        var cfgPkg = window.customFieldMetaGroupPackages.get(cfgId);
        var set = cfgPkg.createValueSet();
        var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        cfvs.add(set);
    },
    fieldValuesAdded: function (model, collection, options) {
        //Check if the added fields group is already represented. If not re-render.
        var cfgId = model.get('CustomFieldGroupId');
        if (cfgId && !this.ro.repGroups[cfgId]) {
            this.render();
        }
    },
    fieldValuesRemoved: function (model, collection, options) {
        //Check if it was the last value in the group, and we are currently displaying it, if so re-render.
        var cfgId = model.get('CustomFieldGroupId');
        if (cfgId && this.ro.repGroups[cfgId] && !this.ro.canSave) {
            var repGroups = this.model.getDotted('DocumentPackage.Version.CustomFieldValues').getRepresentedGroups();
            if (!repGroups[cfgId]) {
                this.render();
            }
        }
    }
});