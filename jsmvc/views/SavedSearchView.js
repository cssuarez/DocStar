/// <reference path="../../Content/LibsInternal/DialogsUtil.js" />
/// <reference path="../../Content/LibsInternal/SearchUtil.js" />
var SavedSearchView = Backbone.View.extend({
    model: undefined, //SearchResultsCPX - passed in from parent, eg. SearchCriteriaView
    viewData: {},
    isDirty: false,
    className: 'SavedSearchView',
    events: {
        'keyup .isCombo': 'nameChange',
        'click .saveSearch': 'saveChanges',
        'click .deleteSearch': 'kill',
        'focus .isCombo': 'selectText'        
    },
    saveButtonSelector: '.saveSearch .saveIcon',
    deleteButtonSelector: '.deleteSearch .deleteIcon',
    saveAndDeleteButtonSelector: '.saveSearch .saveIcon, .deleteSearch .deleteIcon',
    initialize: function (options) {
        var that = this;
        this.compiledTemplate = doT.template(Templates.get('savedsearchlayout'));
        if (!window.savedSearches) {
            window.savedSearches = new SavedSearches();
        }
        this.listenTo(this.model, 'sync', this.render);
        this.listenTo(window.savedSearches, 'add', function () {
            that.render();
            SearchUtil.fillSavedSearchList('#qs');
            Page.setupSavedSearchCombo('#qs .savedSearchList');
            $('#qs .savedSearchSelection').show();
        });
        this.listenTo(this.model, 'reset', function () {
            this.clearSelection();
            this.viewData.selected = this.selected; // reset selected after performing the saved search
            this.selected = undefined;
        });
        this.listenTo(window.savedSearches, 'remove', function (model, options) {
            that.viewData.selected = undefined; // Select -- New --
            that.render();
            SearchUtil.fillSavedSearchList('#qs');
            Page.setupSavedSearchCombo('#qs .savedSearchList');
            if (window.savedSearches.length === 0) {
                $('#qs .savedSearchSelection').hide();
            }
            $('#qs .buttonOptions .isCombo').val('');   // Clear the selected search item
        });
        this.listenTo(window.savedSearches, 'change', function (model) {
            that.render();
            SearchUtil.fillSavedSearchList('#qs');
            Page.setupSavedSearchCombo('#qs .savedSearchList');
        });
        this.listenTo(this.model.getDotted('Request.FieldedCriteria'), 'change', function (model, collection, options) {
            this.triggerNameChange(); //Will update the button states properly
        });
        this.listenTo(this.model.getDotted('Request'), 'change:TextCriteria', function (model, collection, options) {
            this.triggerNameChange(); //Will update the button states properly
        });
        return this;
    },
    render: function () {
        var that = this;
        this.viewData.list = window.savedSearches;
        var html_data = this.compiledTemplate(this.viewData);
        this.$el.html(html_data);
        var $savedSearchListSel = this.$el.find('.savedSearchList');
        $savedSearchListSel.combobox({
            onSelect: function (data) {
                that.onSelectionChanged(data);
            }
        });
        this.delegateEvents(); //Required because parent view set html which destroyed this views el (which removed all on events).
        return this;
    },
    clearSelection: function () {
        this.viewData.selected = undefined;
        this.render();
        $('#qs .savedSearchList').find('option:first').prop('selected', true);
        $('#qs .isCombo').val('');
    },
    onSelectionChanged: function (data) {
        var savedSearchModel = this.getSelectedSavedSearchModel();
        this.viewData.selected = savedSearchModel;
        this.performSavedSearch();
        var saveButtonSel = this.$el.find(this.saveButtonSelector);
        var deleteButtonSel = this.$el.find(this.deleteButtonSelector);
        this.toggleButtons({ selector: saveButtonSel, enable: false });
        var id;
        var name;
        if (savedSearchModel) {
            id = savedSearchModel.get('Id');
            name = savedSearchModel.get('Name');
            $('#qs .savedSearchList').find('option[id="' + id + '"]').prop('selected', true);
            $('#qs .isCombo').val(name);
            this.toggleButtons({ selector: deleteButtonSel, enable: true });
        }
        if (!id) {
            $('#qs .savedSearchList').val("");
            $('#qs .isCombo').val("");
            this.toggleButtons({ selector: deleteButtonSel, enable: false });
        }

    },
    performSavedSearchById: function (id) {
        var savedSearch = window.savedSearches.get(id);
        this.$el.find('.savedSearchList option[id="' + id + '"]').prop('selected', true); //This comes from a quick search saved search selection.
        this.viewData.selected = savedSearch;
        this.performSavedSearch();
    },
    performSavedSearch: function () {
        var savedSearchModel = this.getSelectedSavedSearchModel();
        if (savedSearchModel) {
            var savedSearchPackage = savedSearchModel.attributes;
            var length = savedSearchPackage.FieldedCriteria.length;
            if (length > 0) {
                var i = 0;
                for (i; i < length; i++) {
                    var dbType = savedSearchPackage.FieldedCriteria[i].Type;
                    var dbFieldOperator = savedSearchPackage.FieldedCriteria[i].DatabaseFieldOperator;
                    var dbFieldValue = savedSearchPackage.FieldedCriteria[i].DatabaseFieldValue;
                    if (dbFieldValue && dbFieldOperator) {
                        if (dbType === 'DateTime' || dbType === 'Date') {
                            var dbfv = SearchUtil.operationValueForDate(dbFieldOperator, dbFieldValue);
                            if (dbfv) {
                                savedSearchPackage.FieldedCriteria[i].DatabaseFieldValue = dbfv;
                            }
                        }
                    }
                }
                this.selected = this.viewData.selected; // Maintain selected, the reset below clears this.viewData.selected
                this.model.reset(); //Remove prior search result.
                this.model.set('Request', savedSearchPackage, { reRenderCriteria: true });
                this.model.fetch();
            }
        }
    },
    triggerNameChange: function (data) {
        var ev = new $.Event();
        ev.currentTarget = this.$el.find('.isCombo');
        var name;
        if (data && data.ui && data.ui.item && data.ui.item.value) {
            name = data.ui.item.value;
        }
        this.nameChange(ev, name);
    },
    nameChange: function (ev, name) {
        if (ev.which === 13) {  // Perform search on hitting enter
            this.performSavedSearch();
        }
        else {
            var $targ = $(ev.currentTarget);
            var deleteButtonSel = this.$el.find(this.deleteButtonSelector);
            var saveButtonSel = this.$el.find(this.saveButtonSelector);
            name = name || $targ.val();
            var disable = name === Constants.c.newTitle || name.trim() === ""; // Don't allow saving of -- New -- or empty name
            this.toggleButtons({ selector: saveButtonSel, enable: !disable });

            var selectedId = this.getSelectedSavedSearchId();
            disable = selectedId === Constants.c.emptyGuid; // Don't allow deletion of -- New --
            this.toggleButtons({ selector: deleteButtonSel, enable: !disable });
        }
    },
    selectText: function (ev) {
        InputUtil.selectText(ev.currentTarget, Constants.c.newTitle);
    },    
    toggleButtons: function (options) {
        var selector = options.selector;
        var enable = options.enable;
        if (enable) {
            $(selector).removeClass('disabledIcon');
            $(selector).parent().removeClass('disabled');
        }
        else {
            $(selector).addClass('disabledIcon');
            $(selector).parent().addClass('disabled');
        }
    },
    getSelectedSavedSearchId: function () {
        return this.$el.find('.savedSearchList :selected').attr('id');
    },
    getSelectedSavedSearchModel: function () {
        var id = this.getSelectedSavedSearchId();
        var savedSearch = window.savedSearches.get(id);
        return savedSearch;
    },
    saveChanges: function (options) {
        options = options || {};
        if (!options.override && this.$el.find(this.saveButtonSelector).hasClass('disabledIcon')) {
            return;
        }
        var that = this;
        var id = this.getSelectedSavedSearchId();
        var request = this.model.get('Request');
        var errors = this.model.get('Request').validate();
        if ($.isEmptyObject(errors) === false) {
            ErrorHandler.addErrors(Constants.c.errorFixMessage);
            return;
        }
        var name = this.$el.find('.isCombo').val();
        if (name.trim() === "") {
            ErrorHandler.addErrors(Constants.c.name + Constants.c.cannotbeBlank);
            return;
        }

        var dialogFunc = function () {
            // Prompt the user to overwrite the saved search
            var existingSavedSearchName = name;
            var msg = String.format(Constants.c.savedSearchExists, existingSavedSearchName) + '\n\n' + Constants.c.replacePrompt;
            var okFunc = function (cleanup) {
                // Overwrite the existing saved search
                var savedSearchToOverwrite = that.getSavedSearchToOverwrite(attrs);
                that.$el.find('.savedSearchList :selected').attr('id', savedSearchToOverwrite.get('Id'));
                that.saveChanges({ override: true, callback: cleanup });
            };
            var cancelFunc = function (cleanup) {
                // Save the search with the same name appended with (n)
                var i = 0;
                attrs.Id = Constants.c.emptyGuid;
                while (!that.isUnique(attrs)) {
                    i++;
                    attrs.Name = existingSavedSearchName + '(' + i + ')';
                }
                that.$el.find('.savedSearchList :selected').attr('id', Constants.c.emptyGuid);
                that.$el.find('.isCombo').val(attrs.Name);
                that.saveChanges({ override: true, callback: cleanup });
            };
            var diagOptions = {
                okText: Constants.c.yes,
                closeText: Constants.c.no,
                cancelRequiresCleanup: true
            };
            DialogsUtil.generalPromptDialog(msg, okFunc, cancelFunc, diagOptions);
        };
        var ss;
        if (id === Constants.c.emptyGuid) {
            ss = window.savedSearches.add({}, { silent: true });
        } else {
            ss = window.savedSearches.get(id);
        }
        this.toggleButtons({ selector: this.$el.find(this.saveAndDeleteButtonSelector), enable: false });
        var errMsg = ss.createOrUpdate(request, name, dialogFunc);
        if (errMsg) {
            that.handleErrors(errMsg);
            return;
        }
    },
    kill: function (ev) {
        if (this.$el.find(this.deleteButtonSelector).hasClass('disabledIcon')) {
            return;
        }
        var that = this;
        var id = this.getSelectedSavedSearchId();
        this.toggleButtons({ selector: this.$el.find(this.saveAndDeleteButtonSelector), enable: false });
        if (id === Constants.c.emptyGuid) {
            this.handleErrors(Constants.c.cannotDeleteNew);
            return;
        }
        var model = window.savedSearches.get(id);
        var sf = function (result) {
            if (window.savedSearches.length === 0) {
                $('#qs .savedSearchSelection').hide();  // No more saved searches, hide the quick search, saved search dropdown
            }
            that.setDirty(false);
            that.model.reset();
        };
        var ff = function (message) {
            that.handleErrors(message);
        };
        var cf = function () {
            that.triggerNameChange();
        };
        model.destroy({ success: sf, failure: ff, complete: cf });
    },
    setDirty: function (isDirty) {
        this.isDirty = isDirty;
    },
    getSavedSearchToOverwrite: function (savedSearch) {
        var existingSavedSearch;
        var i = 0;
        var length = window.savedSearches.length;
        for (i = 0; i < length; i++) {
            var item = window.savedSearches.at(i);
            if (savedSearch.Name.toLowerCase() === item.get('Name').toLowerCase()) {
                if (savedSearch.Id !== item.get('Id')) {
                    existingSavedSearch = item;
                    break;
                }
            }
        }
        return existingSavedSearch;
    },
    handleErrors: function (error) {
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        this.triggerNameChange();
        ErrorHandler.addErrors(error, css.warningErrorClass, "div", css.inputErrorClass);
    }
});