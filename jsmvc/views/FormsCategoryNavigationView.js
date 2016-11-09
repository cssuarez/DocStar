var FormsCategoryNavigationView = Backbone.View.extend({
    model: null, // FormsDataCPX
    tagName: 'div',
    className: 'categoryLayout',
    jstreeLoaded: false,
    events: {
        //'click .collapse_arrow': 'collapseNavigationPanel',
        //'click .expand_arrow': 'expandNavigationPanel',
        'click .categoryList .template > a': 'changeTemplate',
        'click .categoryList .category > a, .categoryList .root > a': 'changeCategory'
    },
    initialize: function (options) {
        this.options = options;
        var that = this;
        this.compiledTemplate = doT.template(Templates.get('categorynavigationlayout'));
        this.listenTo(this.model.get('SlimFormTemplates'), 'add', this.update);
        this.listenTo(this.model.get('SlimFormTemplates'), 'sync', this.update);
        this.listenTo(this.model.get('SlimFormTemplates'), 'change:editing', function (model, value, options) {
            var category = model.get('Category');
            var ftId = model.get('FormTemplateId');
            var ftName = model.get('Name');
            if (value) {
                this.changeSelected(category, ftId, ftName);
            }
            if (options.updateHash) {
                this.updateHash(category, ftName, ftId, options.navigationOptions);
            }
        });
        this.listenTo(this.model, 'change:Category', function (model, value, options) {
            options = options || {};
            var category = model.get('Category');
            if (value) {
                this.changeSelected(category);
            }
            if (options.updateHash) {
                this.updateHash(category, null, null, options.navigationOptions);
            }
        });
        this.listenTo(this.model.get('SlimFormTemplates'), 'remove', function (model, collection, options) {
            // Navigate to viewing the category of the deleted form template.
            // If there are no more form templates that are in that category navigate to the root 'Categories'
            var cf = function () {
                var cat = model.get('Category');
                var ev = new $.Event();
                ev.currentTarget = that.$el.find('li[title="' + cat + '"] > a');
                if ($(ev.currentTarget).length === 0) {
                    ev.currentTarget = that.$el.find('li[title="' + Constants.c.categories + '"] > a');
                    that.changeCategory(ev, { replace: true });
                }
                else {
                    var sfts = that.model.get('SlimFormTemplates');
                    sfts.clearEditing();
                    if (that.model.get('Category') === cat) {
                        that.model.trigger('change:Category', that.model, cat);
                    }
                    else {
                        that.model.set('Category', cat);
                    }
                }
            };
            that.render(cf);
        });
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        // Format data to be displayed in a jstree structure
        ro.categories = [{
            data: Constants.c.categories,
            attr: {
                'class': 'root',
                Title: Constants.c.categories,
                Depth: 0
            },
            state: 'open',
            children: []
        }];
        var cats = {};
        var idx = 0;
        var sfts = this.model.get('SlimFormTemplates');
        var length = sfts.length;
        ro.hasFormDesignerGWP = Utility.hasFlag(window.gatewayPermissions, Constants.gp.FormsDesigner);
        for (idx; idx < length; idx++) {
            var formTemplate = sfts.at(idx);
            var category = formTemplate.get('Category');
            var name = formTemplate.get('Name');
            var id = formTemplate.get('FormTemplateId');
            if (!cats[category]) {
                cats[category] = {};
                cats[category].children = [];
            }
            var canModify = Utility.hasFlag(formTemplate.get('EffectiveContentTypePermissions'), Constants.sp.Modify);
            if (ro.hasFormDesignerGWP && canModify) {    // Don't display templates in navigation panel if there are no rights to view them
                cats[category].children.push({
                    data: name,
                    attr: {
                        Id: id + '_template',
                        Title: name,
                        Depth: 0,
                        'class': 'template'
                    }
                });
            }
        }
        var cat;
        for (cat in cats) {
            if (cats.hasOwnProperty(cat)) {
                var formTemplates = cats[cat].children.sort(Utility.sortByProperty('data'));
                if (formTemplates.length > 0) {
                    ro.categories[0].children.push({
                        data: cat,
                        attr: {
                            Title: cat,
                            'class': 'category'
                        },
                        state: 'closed',
                        children: formTemplates
                    });
                }
            }
        }
        ro.categories[0].children.sort(Utility.sortByProperty('data'));
        return ro;
    },
    render: function (cf) {
        var that = this;
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        this.setupNavPanel(cf);
        setTimeout(function () {
            that.setupNavPanelPerfectScroll();
        }, 300);
        return this;
    },
    setupNavPanelPerfectScroll: function () {
        var $catListScroll = this.$el.find('.categoryList_scroll');
        $catListScroll.perfectScrollbar({
            wheelSpeed: 20,
            wheelPropagation: true,
            minScrollbarLength: 20,
            useKeyboard: false,
            notInContainer: true
        });
        $catListScroll.hover(function () {
            $catListScroll.perfectScrollbar('update');
        });
    },
    update: function (model, collection, options) {
        options = options || {};
        if (options.ignoreChange) {
            return;
        }
        var that = this;
        var formTemplateId = options.editingFormTemplateId || model.get('FormTemplateId');
        var cf = function () {
            var sfts = that.model.get('SlimFormTemplates');
            sfts.clearEditing();
            sfts.setDotted(formTemplateId + '.editing', true, $.extend({ updateHash: true, navigationOptions: { replace: true } }, options));
        };
        this.render(cf);
    },
    setupNavPanel: function (cf) {
        var that = this;
        var $catList = this.$el.find('.categoryList');
        var $catListScroll = this.$el.find('.categoryList_scroll');
        var catData = $catList.containers('categoryList', this.viewData.categories);
        this.jstreeLoaded = false;
        if (catData && catData.length > 0) {
            catData.bind('select_node.jstree', function (event, data) {
                if (data.rslt.obj.hasClass('root')) {
                    $catList.jstree('deselect_node');
                }
            });
            catData.one('loaded.jstree', function (event, data) {
                that.jstreeLoaded = true;
                setTimeout(function () {
                    Utility.executeCallback(cf);
                }, 4);
            });

            catData.bind('after_open.jstree', function () {
                $catListScroll.perfectScrollbar('update');
            });
            catData.bind('after_close.jstree', function () {
                $catListScroll.perfectScrollbar('update');
            });
        }
    },
    setupCategoryViewContextMenu: function ($cmId) {
        //TODO: Bug 10406 - http://pedro.docstar.com/b/show_bug.cgi?id=10406
        var that = this;
        var menuAlias = 'cmroot-' + this.cid + '_' + Constants.c.template;
        var options = {
            width: 150,
            items: [{
                text: Constants.c.createForm,
                icon: "",
                width: 170,
                action: function (htmlTarg) {
                }
            }, {
                text: Constants.c.edit,
                icon: "",
                width: 170,
                action: function (htmlTarg) {
                }
            }, {
                text: Constants.c['delete'],
                icon: "",
                width: 170,
                action: function (htmlTarg) {
                }
            }, {
                text: Constants.c.saveAs,
                icon: "",
                width: 170,
                action: function (htmlTarg) {
                }
            }],
            alias: menuAlias
        };
        $cmId.unbind('contextmenu').contextmenu(options);
    },
    changeTemplate: function (ev, navigationOptions) {
        navigationOptions = navigationOptions || {};
        var $targ = $(ev.currentTarget);
        var $template = this.$el.find('.template').has($targ);
        var $category = this.$el.find('.category').has($targ);
        var catName = $category.attr('title');
        var templateId = $template.attr('id').split('_')[0];
        var templateName = $template.attr('title');
        this.model.get('SlimFormTemplates').clearEditing(templateId);
        this.model.get('SlimFormTemplates').setDotted(templateId + '.editing', true);
        this.updateHash(catName, templateName, templateId, navigationOptions);
    },
    changeCategory: function (ev, navigationOptions) {
        navigationOptions = navigationOptions || {};
        var $targ = $(ev.currentTarget);
        var $category = this.$el.find('.category').has($targ);
        var catName = $category.attr('title');
        if (!catName) {
            catName = Constants.t('categories');
        }
        this.model.get('SlimFormTemplates').clearEditing();
        this.model.get('SlimFormTemplates').setSelectedInCategory(catName);
        if (this.model.get('Category') === catName) {
            this.model.trigger('change:Category', this.model, catName);
        }
        else {
            this.model.set('Category', catName);
        }
        this.updateHash(catName, null, null, navigationOptions);
    },
    changeSelected: function (categoryName, templateId) {
        var $catList = this.$el.find('.categoryList');
        var that = this;
        if (!this.jstreeLoaded) {
            $catList.on('loaded.jstree', function (event, data) {
                that.jstreeLoaded = true;
                that.changeSelected(categoryName, templateId);
            });
            return;
        }
        $catList.jstree('deselect_all');
        if (!categoryName && !templateId) {
            return;
        }
        this.clearSelectedItem();
        var $selectedItem;
        if (categoryName === Constants.t('categories')) {
            $selectedItem = this.$el.find('.root > a').addClass('bold underline');
        }
        else if (categoryName) {
            categoryName = decodeURIComponent(categoryName);
            $selectedItem = this.$el.find('li.category[title="' + categoryName + '"]');
            $catList.jstree('open_node', $selectedItem);
            if (templateId) {
                $selectedItem = that.$el.find('#' + templateId + '_template');
            }
            $selectedItem.find('> a').addClass('bold underline');
        }
    },
    updateHash: function (catName, templateName, templateId, navigationOptions) {
        navigationOptions = navigationOptions || {};
        var url = '#Forms/category/' + catName;
        var finalURL = '#Forms/category/' + encodeURIComponent(catName);
        if (templateName && templateId) {
            url = '#Forms/designer/' + catName + '/' + templateName + '/' + templateId;
            finalURL = '#Forms/designer/' + encodeURIComponent(catName) + '/' + encodeURIComponent(templateName) + '/' + encodeURIComponent(templateId);
        }
        var testURL = encodeURIComponent(url);
        if (testURL !== encodeURIComponent(window.location.hash)) {
            Utility.navigate(finalURL, Page.routers.Forms, false, navigationOptions.replace);
        }
    },
    clearSelectedItem: function () {
        this.$el.find('.categoryList .underline.bold').removeClass('underline bold');
    },
    close: function () {
        this.$el.find('.categoryList').jstree('destroy');
        this.unbind();
        this.remove();
    }
    //#region Event Handling
    // Add Events to be handled here
    //#endregion Event Handling
});