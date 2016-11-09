var SearchCriteriaView = Backbone.View.extend({
    // TODO 12932 this View stores the "look in" property (folderId or inboxId) redundantly: both in the model and in a data property of the DOM element.
    // This begs for bugs and should be corrected by relying on the model.
    model: undefined, // SearchResultsCPX
    fieldViews: [],
    className: 'SearchCriteriaView',
    savedSearchView: undefined,
    events: {
        "change .items_location_container input": "changeItemsLocationValue",
        "change .items_location_container select": "changeItemsLocationValue",
        "keyup .text_word_phrase_text": "changeTextValue",
        "click .folder_criteria": "openSelectedContainer",
        "click .search_icon": "openSelectedContainer",
        "click .reset_btn": "reset",
        "click .search_btn": "search",
        "click .vocab_suggestions li": "selectSuggestion"
    },
    initialize: function (options) {
        //NOTE: Model passed in from SearchView.
        this.compiledTemplate = doT.template(Templates.get('searchcriteriaviewlayout'));
        this.savedSearchView = new SavedSearchView({ model: this.model });

        this.setuplistenTo();
        return this;
    },
    render: function () {
        this.disposeFieldViews();
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));
        this.$el.find('.RetrieveSavedSearchView').html(this.savedSearchView.render().$el);
        this.renderFieldViews();
        this.model.updateSortIfNoResults();
        return this;
    },
    getRenderObject: function () {
        var pds = this.model.getDotted('Request.PredefinedSearch');
        if (pds === undefined) {
            pds = Constants.pds.None;
        }
        var ro = {
            itemAccordionClosed: Utility.GetUserPreference('items_location') || 'closed',
            fieldAccordionClosed: Utility.GetUserPreference('field_search') || 'closed',
            textAccordionClosed: Utility.GetUserPreference('text_search') || 'closed',
            includeFoldersState: this.model.getDotted('Request.IncludeFolders') ? 'checked="checked"' : '',
            includeInboxesState: this.model.getDotted('Request.IncludeInboxes') ? 'checked="checked"' : '',
            includeDocumentsState: this.model.getDotted('Request.IncludeDocuments') ? 'checked="checked"' : '',
            lookInFolderName: this.model.getDotted('Request.ContainerName') || '',
            predefNoneState: pds === Constants.pds.None ? 'checked="checked"' : '',
            predefAlertsState: pds === Constants.pds.MyAlerts ? 'checked="checked"' : '',
            predefWorkflowsState: pds === Constants.pds.MyWorkflows ? 'checked="checked"' : '',
            predefApprovalsState: pds === Constants.pds.MyApprovals ? 'checked="checked"' : '',
            textSearch: this.model.getDotted('Request.TextCriteria') || '',
            contentTypes: []
        };

        var viewableCTs = window.contentTypes.getViewable();
        var length = viewableCTs.length;
        var i = 0;
        var selCtId = this.model.getDotted('Request.ContentTypeId');
        for (i = 0; i < length; i++) {
            var ct = viewableCTs.at(i);
            var state = (ct.get('Id') === selCtId) ? 'selected="selected"' : '';
            ro.contentTypes.push({ Id: ct.get('Id'), Name: ct.get('Name'), state: state });
        }
        return ro;
    },
    renderFieldViews: function () {
        var that = this;
        var fc = that.model.getDotted('Request.FieldedCriteria');
        if (fc.length === 0) {
            fc.add({}, { silent: true }); //Always have one.
        }
        var length = fc.length;
        var i = 0;
        for (i; i < length; i++) {
            that.addFieldCriteria(fc.at(i), fc);
        }
        that.setupScroll();
    },
    disposeFieldViews: function () {
        var length = this.fieldViews.length;
        var i = 0;
        for (i; i < length; i++) {
            this.fieldViews[i].close();
            this.fieldViews[i] = undefined;
        }
        this.fieldViews = [];
    },
    setuplistenTo: function () {
        if (this.model.getDotted('Request')) {
            var that = this;
            this.listenTo(this.model, 'sync', function (modelOrCollection, response, options) {
                this.modelChanged(modelOrCollection, options);
            });
            this.listenTo(this.model.getDotted('Request'), 'change', function (model, options) {
                this.modelChanged(model, options);
            });
            this.listenTo(this.model.getDotted('Request.FieldedCriteria'), 'add', function (model, collection, options) {
                this.addFieldCriteria(model, collection, options);
                this.setupScroll();
            });
            this.listenTo(this.model.getDotted('Request.FieldedCriteria'), 'remove', this.removeFieldCriteria);
            this.listenTo(this.model.getDotted('Request.FieldedCriteria'), 'reset', this.reRenderFieldedCriteria);
            this.listenTo(window.databaseFields, 'add', this.reRenderFieldedCriteria);
            this.listenTo(window.databaseFields, 'change', this.reRenderFieldedCriteria);
            this.listenTo(window.databaseFields, 'remove', this.reRenderFieldedCriteria);
        }
        this.listenTo(window.userPreferences, 'change add', function (model, value, options) {
            var key = model.get('Key');
            if (key === 'searchOrder' || key === 'searchOrderBy') {
                this.model.updateSortIfNoResults();
            }
        });
        this.listenTo(window.userPreferences, 'reset', function () {
            this.model.updateSortIfNoResults();
        });
    },
    modelChanged: function (m, o) {
        if (o && o.reRenderCriteria) {
            this.render();
        }
    },
    reRenderFieldedCriteria: function () {
        this.disposeFieldViews();
        this.renderFieldViews();
    },
    addFieldCriteria: function (model, collection, options) {
        var $container = this.$el.find('.fieldSearchViewContainer');
        var view = new FieldedSearchView({ model: model, collection: collection });
        $container.append(view.render().$el);
        this.fieldViews.push(view);
    },
    removeFieldCriteria: function (model, collection, options) {
        var idx = 0;
        var length = this.fieldViews.length;
        for (idx; idx < length; idx++) {
            var fv = this.fieldViews[idx];
            if (fv && fv.model === model) {
                this.fieldViews[idx].close();
                this.fieldViews.splice(idx, 1);
                break;  // exit early, found model and removed it
            }
        }
        var lastFV = this.fieldViews[this.fieldViews.length - 1];
        if (lastFV) {
            lastFV.renderIsLast(true);
        }
        if (this.fieldViews.length === 1) {
            lastFV.renderIsOnly(true);
        }
        this.setupScroll();
    },
    setupScroll: function () {
        var $container = this.$el.find('.fieldSearchViewContainer');
        $container.perfectScrollbar('destroy');
        // Create scrollbar
        $container.perfectScrollbar({
            wheelSpeed: 20,
            minScrollbarLength: 20
        });
        //Removed Horizontal scroll bar
        $container.children('.ps-scrollbar-x-rail').remove();

        $container.unbind('mousewheel.perfect-scrollbar.custom').bind('mousewheel.perfect-scrollbar.custom', function (e, delta, deltaX, deltaY) {
            // Upon scrolling of perfect scrollbar, close the autocomplete dropdowns
            var $acInput = $container.find('.database_field .isCombo');
            if ($acInput.autocomplete('instance')) {
                $acInput.autocomplete('close');
            }
        });

        //Scroll to the last item (item just added)
        var lastItem = this.fieldViews[this.fieldViews.length - 1];
        $container.animate({
            scrollTop: lastItem.$el.offset().top
        }, {
            duration: 700,
            complete: function () {
                $container.perfectScrollbar('update');
            }
        });
    },
    changeItemsLocationValue: function (e) {
        var $sel = $(e.currentTarget);
        var name = e.currentTarget.name;
        if (name === 'look_in_folder') {
            this.model.setDotted('Request.ContainerName', $sel.val());
        }
        else {
            if (e.currentTarget.type === 'checkbox') {
                this.model.setDotted('Request.' + name, $sel.is(':checked'));

            } else {
                var val = $sel.val();
                this.model.setDotted('Request.' + name, val || undefined);
            }
        }
    },
    changeTextValue: function (e) {
        var $sel = $(e.currentTarget);
        this.model.setDotted('Request.TextCriteria', $sel.val());
        var that = this;
        this.model.get('Request').getSuggestions(function (suggestions) { that.fillSuggestions(suggestions); });
    },
    openSelectedContainer: function () {
        var that = this;
        var $fSel = this.$el.find('.folder_criteria');
        var opts = { "ui": { select_multiple_modifier: false, select_range_modifier: false } }; // disable multiselect
        var prevLookIn = this.model.getDotted('Request.ContainerName');
        var prevFolderId = this.model.getDotted('Request.FolderId');
        var prevInboxId = this.model.getDotted('Request.InboxId');
        $('#retrieve_layout_inbox_list').containers('inboxList', null, opts).unbind('select_node.jstree').bind("select_node.jstree", function (event, data) {
            $('#retrieve_layout_folder_list').jstree('deselect_all');
            if ($(data.rslt.obj).attr('Id') !== 'Root') {
                $fSel.data('containerid', data.rslt.obj.attr("Id").replace('jstree-', ''));
                $fSel.val(data.rslt.obj.attr("Title"));
                that.model.setDotted('Request.FolderId', undefined);
                that.model.setDotted('Request.InboxId', data.rslt.obj.attr("Id").replace('jstree-', ''));
            }
            else {
                // Set root id to empty guid
                $fSel.data('containerid', Constants.c.emptyGuid);
                $fSel.val(data.rslt.obj.attr("Title"));
                that.model.setDotted('Request.FolderId', undefined);
                that.model.setDotted('Request.InboxId', Constants.c.emptyGuid);
            }
        });
        $('#retrieve_layout_folder_list').containers('folderList', null, opts).unbind('select_node.jstree').bind("select_node.jstree", function (event, data) {
            $('#retrieve_layout_inbox_list').jstree('deselect_all');
            if ($(data.rslt.obj).attr('Id') !== 'Root') {
                $fSel.data('containerid', data.rslt.obj.attr("Id").replace('jstree-', ''));
                $fSel.val(data.rslt.obj.attr("Title"));
                that.model.setDotted('Request.FolderId', data.rslt.obj.attr("Id").replace('jstree-', ''));
                that.model.setDotted('Request.InboxId',undefined);
            }
            else {
                // Set root id to empty guid
                $fSel.data('containerid', Constants.c.emptyGuid);
                $fSel.val(data.rslt.obj.attr("Title"));
                that.model.setDotted('Request.FolderId', Constants.c.emptyGuid);
                that.model.setDotted('Request.InboxId', undefined);
            }
        });
        $('#retrieve_layout_inbox_list').bind('loaded.jstree', function () {
            $('#retrieve_layout_inbox_list').jstree('close_all');
        });
        $('#retrieve_layout_folder_list').bind('loaded.jstree', function () {
            $('#retrieve_layout_folder_list').jstree('close_all');
        });
        $('#retrieve_layout_selectContainer').dialog({
            position: [$('input[name="look_in_folder"]').offset().left, $('input[name="look_in_folder"]').offset().top + $('input[name="look_in_folder"]').outerHeight(true) + 2],
            autoOpen: false,
            minHeight: 250,
            minWidth: 200,
            maxHeight: 500,
            width: $('input[name="look_in_folder"]').width(),
            modal: true,
            buttons: [{
                text: Constants.t('ok'),
                click: function () {
                    var selectedFolds = $('#retrieve_layout_folder_list').jstree('get_selected');
                    var selectedInboxes = $('#retrieve_layout_inbox_list').jstree('get_selected');
                    if ((selectedFolds && selectedFolds.length === 0) && (selectedInboxes && selectedInboxes.length === 0)) {
                        $('#inbox_list, #folder_list').jstree('deselect_all');
                        $fSel.removeData('containerid');
                        that.model.setDotted('Request.FolderId', undefined);
                        that.model.setDotted('Request.InboxId', undefined);
                        $fSel.val('');
                    }
                    this.closeDialog = true;
                    $(this).dialog('close');
                    $fSel.change();
                }
            },
            {
                text: Constants.t('cancel'),
                click: function () {
                    $fSel.val(prevLookIn);
                    $fSel.data('containerid', prevFolderId || prevInboxId);
                    that.model.setDotted('Request.FolderId', prevFolderId);
                    that.model.setDotted('Request.InboxId', prevInboxId);
                    this.closeDialog = true;
                    $(this).dialog("close");
                }
            },
            {
                text: Constants.t('clear'),
                click: function () {
                    $('#inbox_list, #folder_list').jstree('deselect_all');
                    $fSel.removeData('containerid');
                    $fSel.val('');
                    that.model.setDotted('Request.FolderId', undefined);
                    that.model.setDotted('Request.InboxId', undefined);
                    this.closeDialog = true;
                    $(this).dialog("close");
                    $fSel.change();
                }
            }],
            resize: function () {
                var parent = $('#retrieve_layout_selectContainer').parent();
                $('#retrieve_layout_selectContainer').css('max-height', parent.height() - parent.find('.ui-dialog-buttonpane').height() + 'px');
            },
            open: function () {
                this.closeDialog = false;
            },
            close: function () {
                if (!this.closeDialog) {
                    $fSel.val(prevLookIn);
                    $fSel.data('containerid', prevFolderId || prevInboxId);
                    that.model.setDotted('Request.FolderId', prevFolderId);
                    that.model.setDotted('Request.InboxId', prevInboxId);
                }
                $('#retrieve_layout_folder_list').hide();
                $('#retrieve_layout_inbox_list').hide();
            }
        });

        $('#retrieve_layout_folder_list').show();
        $('#retrieve_layout_inbox_list').show();
        $('#retrieve_layout_selectContainer').dialog('open');
    },
    reset: function () {
        // Deselect all items that are selected in the navigation panel Inboxes, Folders, or predefined searches (ie Workflows, Approvals, or Alerts)
        $('#inbox_list, #folder_list, #workflow_tree, #approval_tree, #alerts_tree').jstree('deselect_all');
        this.model.reset();
        Utility.navigate('Retrieve', Page.routers.Retrieve, false, false);
        this.render();
    },
    search: function () {
        var sr = this.model.get('Request');
        if (this.$el.find('.fieldSearchViewContainer .' + css.warningErrorClass).length === 0) {
            sr.set({
                ResultId: undefined,
                Start: 0
            }, { silent: true }); //Remove prior search result and reset starting page
            this.model.fetch({ reRenderCriteria: true });   //NOTE: if the criteria isn't re-rendered the eventing for the FieldedSearchView's is broken                    
        }
        else {
            ErrorHandler.addErrors(Constants.c.errorFixMessage);
        }
    },
    fillSuggestions: function (suggestions) {
        var $container = this.$el.find('.vocab_suggestions');
        $container.empty();
        var length = suggestions.length;
        var i = 0;
        for (i; i < length; i++) {
            $container.append($('<li></li>').text(suggestions[i]));
        }
    },
    selectSuggestion: function (e) {
        var $sel = $(e.currentTarget);
        var val = $sel.text();
        this.model.setDotted('Request.TextCriteria', val);
        this.$el.find('.text_word_phrase_text').val(val);
        this.fillSuggestions([]);
    }
});