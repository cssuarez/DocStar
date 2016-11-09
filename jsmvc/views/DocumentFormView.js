var DocumentFormView = Backbone.View.extend({
    model: null, //BulkViewerDataPackageCPX
    autoSaveTimeout: null,
    viewerType: Constants.vt.FormEdit,
    className: 'DocumentFormView',
    menuView: undefined,
    postMessageHelpers: undefined,
    bound: false,
    progUpdt: false,
    cfvMap: {}, // hash of custom field value ids and whether or not they are already mapped to a form element
    scrollPosition: 0,  // tracking of where the container is scrolled to, so it can be maintained on render
    addedPageHeight: 0, // Additional height added to page to accomodate the 'Submit' or navigation buttons, see addNavigationAndSubmitButtons and addTransformAndEditContainers for it being set and get, accordingly
    events: {
        'click .navigation_start': 'firstPage',
        'click .navigation_prev': 'prevPage',
        'click .navigation_next': 'nextPage',
        'click .navigation_end': 'lastPage',
        'change input[name="currentPage"]': 'currentPageChanged',
        'keyup #masterForm input[type="text"]': 'textChanged',
        'change #masterForm input[type="text"]': 'textChanged',
        'keyup #masterForm input.isCombo': 'textChanged',
        'change #masterForm input.isCombo': 'textChanged',
        'input #masterForm input.ComboBox, input.Autocomplete': 'textChanged',
        'change #masterForm input.ComboBox, input.Autocomplete': 'textChanged',
        'change #masterForm input[type="checkbox"]': 'boolChanged',
        'change #masterForm input[type="radio"]': 'radioChanged',
        'change #masterForm input[data-type="number"]': 'numberChanged',
        'keyup #masterForm input[data-type="number"]': 'numberChanged',
        'keyup #masterForm textarea': 'textChanged',
        'change #masterForm textarea': 'textChanged',
        'change #masterForm select': 'selectChanged',
        'keyup #masterForm input[data-type="date"]': 'dateChanged',
        'change #masterForm input[data-type="date"]': 'dateChanged',
        'keyup #masterForm input[data-type="datetime"]': 'datetimeChanged',
        'change #masterForm input[data-type="datetime"]': 'datetimeChanged',
        'click #masterForm .FormAddGroupSetButton': 'addGroupSet',
        'click #masterForm .FormDeleteGroupSetButton': 'deleteGroupSet',
        'click .submitForm': 'submitForm',
        "click .saveApprovalStamp:not(.disabled)": "saveApprovalStamp",         // Button added in DocumentFormAnnotationView.js
        "click .cancelApprovalStamp:not(.disabled)": "cancelApprovalStamp",     // Button added in DocumentFormAnnotationView.js
        "click .hideApprovalStampContainer": "hideApprovalStamp"                         // Button added in DocumentFormAnnotationView.js
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('documentformviewlayout'));
        this.postMessageHelpers = [];
        this.$style = undefined;
        this.listenTo(Backbone.history, 'route', function (router, route, params) {
            this.$el.find('style').detach();
            this.cleanupJavascript();
        });
        this.listenTo(this.model, 'change:DocumentPackage.saveExecuting', this.saveExecutingChanged);
        if (window.isGuest) {
            this.listenTo(this.model, 'change', this.setupAutoSave);
        }
        else {
            //Added for Bug 13790, so that the Burning In Annotations message is removed properly
            var that = this;
            this.renderCompleteFunc = function (pageIds) { that.onRenderComplete(pageIds); };
            window.CompanyInstanceHubProxy.onRenderComplete(this.renderCompleteFunc);
        }
        return this;
    },
    render: function (options) {
        window.formCleanup = {
            timeOuts: [],
            intervals: []
        };
        options = options || {};
        var ro = this.getRenderObject();
        // Obtain current scroll position
        this.scrollPosition = this.$el.find('.formPartContainer').scrollTop();
        this.$el.html(this.compiledTemplate(ro));
        if (ro.loaded) {
            this.bindModelEvents();
            this.setupMenu(ro);
            this.getFormPartMarkup(options);
        }
        return this;
    },
    onRenderComplete: function (pageIds) {
        var found = false;
        var idx = 0;
        var length = pageIds.length;
        var pgModel = this.model.getCurrentPageInfo();
        var pgId;
        if (pgModel) {
            pgId = pgModel.get('Id');
        }
        for (idx; idx < length; idx++) {
            if (pageIds[idx] === pgId) {
                found = true;
                break;
            }
        }
        if (found) {
            this.model.setDotted('DocumentPackage.burningInAnnotations', undefined); //This will trigger a CurrentPageChanged.
        }
    },
    saveExecutingChanged: function () {
        var executing = this.model.getDotted('DocumentPackage.saveExecuting');
        var $submitBtn = this.$el.find('.submitButtonContainer a.submitForm');
        var $saveAppBtn = this.$el.find('.saveApprovalStamp:visible');
        var $cancelAppBtn = this.$el.find('.cancelApprovalStamp:visible');
        var btns = this.$el.find('.submitButtonContainer a').add($saveAppBtn).add($cancelAppBtn);
        var $saveBtns = $submitBtn.add($saveAppBtn);
        if (executing) {
            $saveBtns.text('');
            var throbber = document.createElement('span');
            Utility.setElementClass(throbber, 'throbber');
            $saveBtns.append(throbber);
            btns.addClass('disabled');
        } else {
            btns.removeClass('disabled');
            $saveBtns.empty();
            $saveAppBtn.text(Constants.t('save'));
            $submitBtn.text(Constants.c.submit);
        }
    },
    cleanupJavascript: function (remove) {
        var i = 0;
        var length = 0;
        if (window.formCleanup) {
            try {
                if (window.formCleanup.timeOuts && window.formCleanup.timeOuts.length > 0) {
                    i = 0;
                    length = window.formCleanup.timeOuts.length;
                    for (i; i < length; i++) {
                        clearTimeout(window.formCleanup.timeOuts[i]);
                    }
                    window.formCleanup.timeOuts = [];
                }
                if (window.formCleanup.intervals && window.formCleanup.intervals.length > 0) {
                    i = 0;
                    length = window.formCleanup.intervals.length;
                    for (i; i < length; i++) {
                        clearInterval(window.formCleanup.intervals[i]);
                    }
                    window.formCleanup.intervals = [];
                }
                if (_.isFunction(window.formCleanup.unbindFunction)) {
                    window.formCleanup.unbindFunction();
                    delete window.formCleanup.unbindFunction;
                }
            }
            catch (ex) { ErrorHandler.addErrors(ex); }
        }
        if (remove) {
            if (this.$js) {
                this.$js.remove();
                this.$js = undefined;
            }
        }
    },
    getJavascriptFromMarkup: function (markup) {
        var $markup = $(markup);
        var idx = 0;
        var length = $markup.length;
        for (idx; idx < length; idx++) {
            var $markupChild = $markup.eq(idx);
            if ($markupChild.is('script')) {
                return $markupChild;
            }
        }
        return;
    },
    removeJavascriptFromMarkup: function (markup) {
        var $markup = $(markup);
        var idx = 0;
        var length = $markup.length;
        var noJSMarkup = '';
        for (idx; idx < length; idx++) {
            var $markupChild = $markup.eq(idx);
            if (!$markupChild.is('script')) {
                var child = $markupChild.get(0);
                noJSMarkup += child.outerHTML || child.textContent;

            }
        }
        return noJSMarkup;
    },
    loadJavascript: function ($script) {
        if (!$script || $script.length === 0) {
            $script = this.$el.find('script');
        }
        if (!$script || $script.length === 0) {
            return;
        }
        var $fpc = this.$el.find('.formPartContainer');
        var newScript = document.createElement('script');
        newScript.textContent = $script.text();
        $fpc.append(newScript);
        $script.html('').remove();
    },
    close: function () {
        window.CompanyInstanceHubProxy.onRenderComplete(this.renderCompleteFunc, true);
        var dpkg = this.model.get('DocumentPackage');
        if (dpkg && dpkg.customSave === this.customSaveAction) {
            dpkg.customSave = null;
        }

        var pmh = this.postMessageHelpers.pop();
        while (pmh) {
            pmh.close();
            pmh = undefined;
            pmh = this.postMessageHelpers.pop();
        }
        this.cleanupAnnotationView();
        this.cleanupJavascript(true);
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    cleanupAnnotationView: function () {
        if (this.dfAnnotationView) {
            this.dfAnnotationView.close();
            this.dfAnnotationView = undefined;
        }
        // Cleanup this.pzr as well so it is redefined for the dfAnnotationView
        this.pzr = undefined;
    },
    getRenderObject: function () {
        var cis = this.model.getDotted('DocumentPackage.ContentItems');
        var fps = cis ? cis.getAllFormParts() : [];
        var ro = {
            loaded: !!cis,
            renderingMessage: '',
            renderingTitle: '',
            currentItem: this.model.getCurrentPage(this.viewerType),
            totalItems: fps ? fps.length : 0,
            bookmarkLabel: ''
        };
        if (ro.loaded) {
            var ci = fps[ro.currentItem - 1];
            var bm = this.model.get('DocumentPackage').getBookmarkForContentItem(ci);
            if (bm) {
                ro.bookmarkLabel = bm.get('Name');
            }
        }
        return ro;
    },
    setupMenu: function (ro) {
        if (this.menuView) {
            this.menuView.close();
            this.menuView = undefined;
        }
        if (ro.loaded && !window.isGuest) {
            this.menuView = new DocumentViewerMenuView({ model: this.model, viewerType: Constants.vt.FormEdit });
            var $vm = this.$el.find('.view_menu');
            $vm.html(this.menuView.render().$el);
        }
    },
    bindModelEvents: function () {
        if (this.bound) {
            return;
        }

        var that = this;
        this.bound = true;
        var dpkg = this.model.get('DocumentPackage');
        dpkg.customSave = function (saveFunction, optionsForSave) { that.customSaveAction(saveFunction, optionsForSave); };
        this.listenTo(this.model, 'change:DocumentPackage.Version.Title', this.titleChanged);
        this.listenTo(this.model, 'change:DocumentPackage.Version.Keywords', this.keywordsChanged);
        var cfs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        this.listenTo(cfs, 'change', this.customFieldChanged);
        this.listenTo(cfs, 'remove', this.customFieldRemoved);
        this.listenTo(cfs, 'add', this.customFieldAdded);
        this.listenTo(this.model, 'change:currentPage', this.pageChanged);
    },
    submitForm: function () {
        var that = this;
        var requestIds = [];
        var id = this.model.guestOption('ViewRequestId');
        if (id) {
            requestIds.push(id);
        }
        id = this.model.guestOption('FormRequestId');
        if (id) {
            requestIds.push(id);
        }
        var complete = Utility.hasFlag(this.model.getDotted('DocumentPackage.FormProperties'), Constants.fp.CompleteOnSubmit);
        //Only submit workflow when the 'Submit' button in the document form view is clicked and the forms designer has specified to 'Submit Workflow'
        var wfSubmit = Utility.hasFlag(this.model.getDotted('DocumentPackage.FormProperties'), Constants.fp.ExecuteWorkflowUIOnSubmit);
        this.model.get('DocumentPackage').submitForm(complete, requestIds, function () {
            if (window.isGuest) {
                var options = JSON.parse($('#viewerOptions').val());
                window.location = Constants.Url_Base + 'Guest/FormComplete?id=' + id + '&embedded=' + options.EmbeddedViewer;
            } else {
                that.model.setDotted('DocumentPackage.saveExecuting', false);
                that.model.setDirty(false);
                if (complete) {
                    that.model.set('inFormEdit', false);
                }
            }
            if (wfSubmit) {
                // Submit the workflow
                that.model.trigger('change:submitWorkflowOnFormSubmit', that.model, true);
            }
        });
    },
    firstPage: function () {
        this.setCurrentPage(1);
    },
    prevPage: function () {
        var currPage = this.model.getCurrentPage(this.viewerType);
        this.setCurrentPage(currPage - 1);
    },
    nextPage: function () {
        var currPage = this.model.getCurrentPage(this.viewerType);
        this.setCurrentPage(currPage + 1);
    },
    lastPage: function () {
        this.setCurrentPage(999999);
    },
    currentPageChanged: function (e) {
        this.setCurrentPage(parseInt($(e.currentTarget).val(), 10));
    },
    setCurrentPage: function (pageNumber) {
        var cis = this.model.getDotted('DocumentPackage.ContentItems');
        var fps = cis ? cis.getAllFormParts() : [];
        if (fps.length === 0) {
            return;
        }

        pageNumber = InputUtil.textRangeCheck(1, fps.length, pageNumber);
        var currentPage = this.model.getCurrentPage(this.viewerType);
        if (currentPage === pageNumber) {
            return; //already on this page.
        }
        this.model.set('currentPage', pageNumber);
    },
    pageChanged: function () {
        this.render();
    },
    getFormPartMarkup: function (options) {
        var currentPage = this.model.getCurrentPage(this.viewerType);
        var that = this;
        this.model.get('DocumentPackage').loadFormPartMarkup(currentPage - 1, function (markup) { that.formatFormPartMarkup(markup, options); }, options);
    },
    formatFormPartMarkup: function (markup, options) {
        options = options || {};
        var that = this;
        var $fpc = this.$el.find('.formPartContainer');
        var $jsScript = this.getJavascriptFromMarkup(markup);
        markup = this.removeJavascriptFromMarkup(markup);  // detach the javascript, so it won't execute until all elements are created
        $fpc.html(markup);
        // Only run preCreateAllMissingFields once, when the Form Edit Mode is initially entered.
        if (!this.fieldsPreCreated) {
            this.preCreateAllMissingFields();
            this.fieldsPreCreated = true;
        }
        this.loadJavascript($jsScript);   // All elements have been created in the previous preCreateAllMissingFields, so add the previously detached javascript        
        this.setupNumericFields($fpc.find('input[data-type="number"]'));
        $fpc.find('input[data-type="date"]').datepicker({
            onClose: function (dateText, inst) { that.datePickerClose(dateText, inst); }
        });
        $fpc.find('input[data-type="datetime"]').datetimepicker({
            onClose: function (dateText, inst) { that.datePickerClose(dateText, inst); }
        });
        CustomFieldSetup.setupAutocompletes($fpc.find('.Autocomplete'));
        var $elements = $fpc.find('select');
        var i = 0;
        var length = $elements.length;
        CustomFieldSetup.loadSelect($elements);
        var $iframes = $fpc.find('iframe');
        var pmh = this.postMessageHelpers.pop();
        while (pmh) {
            pmh.close();
            pmh = undefined;
            pmh = this.postMessageHelpers.pop();
        }
        this.postMessageHelpers = [];
        var makeMsgReceivedCallback = function (i) {
            return function (event) {
                that.messageReceived(event, i);
            };
        };
        i = 0;
        length = $iframes.length;
        for (i; i < length; i++) {
            var idx = i; //idx used to keep the index of this item in scope, i will always be the last item.
            this.postMessageHelpers.push(new PostMessageHelper({
                messageReceived: makeMsgReceivedCallback(i),
                target: $iframes[idx].contentWindow,
                targetDomain: '*',
                messageId: Utility.getSequentialGuids(1)[0]
            }));
        }
        // Scroll to the provided backingstorevalueid, otherwise it will scroll to the last known scroll position
        // options.selectElement should only be provided when a field is added
        if (options.selectElement) {
            var $fe = this.$el.find('[data-backingstorevalueid="' + options.selectElement + '"]');
            var $formPartContainer = $fpc.has($fe);
            $formPartContainer.scrollTo($fe);
        }
        else {
            // scroll to last known scroll position
            $fpc.scrollTop(this.scrollPosition);
        }
        Utility.executeCallback(options.callback);

        this.addNavigationAndSubmitButtons($fpc);
        this.addTransformAndEditContainers($fpc);
        this.cleanupAnnotationView();

        var approvalStampsEnabled = Utility.convertToBool(Utility.GetSystemPreferenceValue('enableApprovalStamps'));
        if (approvalStampsEnabled) {
            this.initializePZR();
            var $page = this.$el.find('.Page').first();
            // We need to scale up the page's height/width by the ratio of the rendered image's width/height and the page's width/height
            var page1 = this.model.get('DocumentPackage').findPage(1);
            if (page1 && page1.pdto) {
                // Use the highest of the two of RezX and RezY determine ratio, because we can only scale by one ratio. See DocumentFormAnnotationView.renderApprovalStamps() .setScale()
                var dpi = Math.max(page1.pdto.get('RezX'), page1.pdto.get('RezY'));
                var scaleUp = dpi / 96;  // 96 is used for the conversion between inches and pixels for form documents. See FormTemplate.getPageSizeDims()
                var pageHeight = ($page.height() - this.addedPageHeight) * scaleUp;
                var pageWidth = ($page.width() - this.addedPageHeight) * scaleUp;
                this.pzr.setHeightWidth(pageHeight, pageWidth);
                this.dfAnnotationView = new DocumentFormAnnotationView({ model: this.model, pzr: this.pzr });
                this.$el.find('.anno_menu_cont').html(this.dfAnnotationView.render().$el);
            }
        }
    },

    initializePZR: function () {
        if (!this.pzr) {
            var $viewPortCont = this.$el.find('.formPartContainer');
            this.pzr = PanZoomRotate($viewPortCont, this.model); //setupPZR called when the image is loaded. (imageLoaded)
        }
    },
    addNavigationAndSubmitButtons: function ($container) {
        var top = this.getButtonPosition($container);
        var template = doT.template(Templates.get('documentformviewbuttonslayout'));
        var cp = this.model.getCurrentPage(Constants.vt.FormEdit);
        var mp = this.model.getMaxPage(Constants.vt.FormEdit);
        var ro = {
            showPrevious: cp > 1,
            showSubmit: cp === mp,
            showNext: cp < mp,
            top: top + 10,
            saveExecuting: this.model.getDotted('DocumentPackage.saveExecuting')
        };
        var $page = $container.find('#masterForm .Page');
        $page.append(template(ro));
        // Increase the height of the page to accomodate the buttons that have been added
        var $submitBtnContainer = this.$el.find('.submitButtonContainer');
        var pageHeight = $page.height();
        var diff = pageHeight - ($submitBtnContainer.height() + $submitBtnContainer.position().top);
        this.addedPageHeight = 0;
        if (diff < 0) {
            this.addedPageHeight = Math.abs(diff) + 5;
            $page.height(pageHeight + this.addedPageHeight);
        }
    },
    addTransformAndEditContainers: function ($container) {
        var $firstPage = $container.find('#masterForm.js .Page:first');
        var transCont = document.createElement('div');
        transCont.className = 'transformCont fullWidth fullHeight posAbs';
        var $submitBtnContainer = this.$el.find('.submitButtonContainer');
        var editMarkContainer = document.createElement('div');
        editMarkContainer.className = 'editMarkContainer fullWidth fullHeight';
        // don't allow users to place annotations off of the first page
        // If the form document is 'flow' layout there may be a great deal of excess data that will flow into two or more pages.
        // Reducing the height of the editMarkContainer by the addedPageHeight will prevent the user from placing the annotation off the bottom end of the first 'rendered' page
        editMarkContainer.style.height = 'calc(100% - ' + this.addedPageHeight + 'px)';
        $firstPage.append(transCont);
        $firstPage.append(editMarkContainer);
    },
    getButtonPosition: function ($container) {
        var top = 0;
        var $elements = $container.find('#masterForm .Page').children(':not(.transformCont):not(.editMarkContainer)');
        var i = 0;
        var length = $elements.length;
        for (i; i < length; i++) {
            var $el = $elements.eq(i);
            var p = $el.position();
            var height = $el.height();
            if ((p.top + height) > top) {
                top = p.top + height;
            }
        }
        return top;
    },
    setupNumericFields: function ($numericFields) {
        var numLength = $numericFields.length;
        for (i = 0; i < numLength; i++) {
            var $numInput = $numericFields.eq(i);
            $numInput.attr('type', 'text');
            var backingStoreId = $numInput.data('backingstoreid');
            var numFieldmeta = window.customFieldMetas.get(backingStoreId);
            if (numFieldmeta) {
                var type = numFieldmeta.get('Type');
                if (type === Constants.ty.Decimal) {
                    $numInput.numeric({ negative: true });
                } else {
                    $numInput.numeric({ negative: true, decimal: false });
                }
            } else {
                $numInput.numeric({ negative: true, decimal: false });
            }
        }
    },
    preCreateAllMissingFields: function () {
        //We may need a cache here, but it seems very fast. Premature optimization is bad.
        var masterForm = document.getElementById("masterForm");
        var formElements = masterForm ? masterForm.getElementsByTagName('*') : [];
        var i = 0;
        var length = formElements.length;
        for (i; i < length; i++) {
            var fe = formElements[i];
            var $el = $(fe);
            var valueId = $el.data('backingstorevalueid');
            var metaId = $el.data('backingstoreid');
            // Only create the field if its bsid is empty, it has a meta id, and the tag isn't an option 
            // (the selector above gets options, but we just want to work with the options select)
            if (valueId === Constants.c.emptyGuid && metaId !== Constants.c.emptyGuid && $el.prop("tagName") !== 'OPTION') {
                var createField = true;
                var value;
                var values = {};
                // Determine the value that the custom field should be created with
                var groupId = $el.data('groupid');
                var metaIds = [];
                // Obtain values of each sibling to the element that is part of a group to be created
                if (groupId) {
                    var $groupSet = $el.closest('.FormElementGroupSet');
                    // Ignore a selects option, since it has the same group id as its select list
                    var $elems = $groupSet.find('[data-groupid="' + groupId + '"]:not(option)');
                    var idx = 0;
                    var gsItemLen = $elems.length;
                    for (idx; idx < gsItemLen; idx++) {
                        var $elem = $elems.eq(idx);
                        var bsId = $elem.data('backingstoreid');
                        metaIds.push(bsId);
                        value = this.getValueOfFormElement($elem);
                        values[bsId] = value === null ? undefined : value;
                    }
                }
                else {
                    // Element is not part of a group, so just obtain its own value
                    value = this.getValueOfFormElement($el);
                    // Don't create the field if the element doesn't have a value (eg. Checkboxes that aren't checked by default
                    if (value === null) {
                        createField = false;
                    }
                    else {
                        metaIds.push(metaId);
                        values[metaId] = value;
                    }
                }
                if (createField) {
                    // Find empty custom field values that match backing store id.
                    // If there is a match, reset the elements backingstorevalue id to match the found custom field value.
                    var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
                    if (cfvs && cfvs.length) {
                        var bsLen = cfvs.length;
                        for (idx = 0; idx < bsLen; idx++) {
                            var cfv = cfvs.at(idx);
                            var cfvId = cfv.get('Id');
                            // if the custom field value is undefined, then no value has been set for it yet, and it can be used to map the form element to
                            if (!this.cfvMap[cfvId] && cfv.get('CustomFieldMetaId') === metaId && cfv.getValue() === undefined) {
                                $el.attr('data-backingstorevalueid', cfvId).data('backingstorevalueid', cfvId);  // update the elements attribute and data attribute, so that it can be found via jquery and so its data is correct
                                this.cfvMap[cfvId] = true;
                                break;
                            }
                        }
                    }
                    // Validate the value(s) before passing them on
                    // If the values aren't valid, obtain the defaults for the custom field type
                    var valLen = Utility.getObjectLength(values);
                    for (idx = 0; idx < valLen; idx++) {
                        var cfmId = metaIds[idx];
                        var cfm = window.customFieldMetas.get(cfmId);
                        if (cfm) {
                            var valObj = cfm.createValueObject();
                            var newCFV = new CustomFieldValue(valObj);
                            if (!values[cfmId]) { // If no value exists, use the default value
                                values[cfmId] = newCFV.getDefaultValue(newCFV.get('TypeCode'));
                                $el.val(values[cfmId]); // update the value for the form element
                            }
                            else {
                                newCFV.setValueSwitch(valObj, values[cfmId]);
                                var isNotValid = newCFV.validate(valObj);
                                if (isNotValid) {   // If the value isn't valid use the default value 
                                    values[cfmId] = newCFV.getDefaultValue(newCFV.get('TypeCode'));
                                    $el.val(values[cfmId]); // update the value for the form element
                                }
                            }
                        }
                    }
                    // TODO (Enrique): Performance issue here with one render per field. updateModel() will call updateBackingStore() and that will trigger customFieldValuesChanged on DocumentMetaFieldView causing a re-render. As we are inside a 'for' here it will re-render per field. 
                    // We would prefer just one re-render at the end of the process.
                    this.updateModel($el, values, true);
                }
            }
        }
    },
    ///<summary>
    /// Obtain the value the form element currently has, in order to precreate a meta field for that element
    ///<param name="$el">jquery selector for the element to obtain the value for</param>
    ///<returns>
    /// Returns the value or null. 
    /// If null is returned then the field to represent this element shouldn't be created
    ///</returns>
    ///</summary>
    getValueOfFormElement: function ($el) {
        var value;
        var isCheckbox = $el.is(':checkbox');
        var isRadio = $el.is(':radio');
        var isChecked = $el.get(0).checked;
        if (isCheckbox) {
            value = isChecked;
            if ($el.data('val') !== undefined) {    // Is a checkbox group item
                if (isChecked) {
                    value = $el.data('val');
                }
                else {
                    return null;    // Do not create a custom field value for a checkbox group item that isn't checked
                }
            }
        }
        else {
            if (isRadio && !isChecked) {
                return null;
            }
            value = $el.val();
        }
        // trim the value being set on the model, so no erroneous spaces are allowed (ie prepended or appended to the value)
        return $.trim(value);
    },
    messageReceived: function (event, index) {
        if (!event.dataObj) {
            return;
        }
        var selected;
        switch (event.dataObj.Action) {
            case 'initialized':
                this.postMessageHelpers[index].sendMessage({ Action: 'setRestrictions', Restrictions: this.model.getRestrictions() });
                break;
            case 'fileSelected':
                if (event.dataObj.Valid) {
                    this.postMessageHelpers[index].imageSelectionState = 'valid';
                    //Manually trigger dirty
                    this.model.setDirty(true);
                } else {
                    this.postMessageHelpers[index].imageSelectionState = 'invalid';
                }
                break;
            case 'postResult':
                this.postMessageHelpers[index].imageSelectionState = 'none';
                var result = event.dataObj.Result;
                if (result.Error) {
                    ErrorHandler.addErrors(result.Error.Message);
                    return;
                }
                var dpkg = this.model.get('DocumentPackage');
                dpkg.set('addToDistributedQueue', true, { silent: true });
                var cis = dpkg.get('ContentItems');
                cis.add({ FileName: result.Result });
                break;
        }
    },
    customSaveAction: function (saveFunction, optionsForSave, postMessageHelper) {
        var that = this;
        //Recursive Function via setTimeout.
        //First if we were not passed a postMessageHelper or the one we were passed no longer has a valid image selection (because it was uploaded) grab the next one in the array and post it.
        if (!postMessageHelper || postMessageHelper.imageSelectionState !== 'valid') {
            postMessageHelper = undefined;
            var i = 0;
            var length = this.postMessageHelpers.length;
            for (i; i < length; i++) {
                if (this.postMessageHelpers[i].imageSelectionState === 'valid') {
                    postMessageHelper = this.postMessageHelpers[i];
                    break;
                }
            }
            if (postMessageHelper) {
                this.$el.find('.fileUploadInProgress').show();
                //We have a new postMessageHelper, invoke the post file method.
                postMessageHelper.sendMessage({ Action: 'postFile', AdditionalData: undefined });
                //Recall this function in 1 second to check if the post is complete.
                setTimeout(function () { that.customSaveAction(saveFunction, optionsForSave, postMessageHelper); }, 1000);
                return; // Returned here so we don't call the setTimeout below.
            }
        }

        if (postMessageHelper) {
            //We will only arrive at this point if we have a post message help with a valid image selection. This means that the file is still uploaded, wait another second and check again.
            setTimeout(function () { that.customSaveAction(saveFunction, optionsForSave, postMessageHelper); }, 1000);
        } else {
            this.$el.find('.fileUploadInProgress').hide();
            //If we do not have a postMessageHelper by this point then we have posted all messages, call the save function.
            optionsForSave.fromCustomSave = true;
            saveFunction(optionsForSave);
        }
    },
    addGroupSet: function (event) {
        var groupId = $(event.currentTarget).data('groupid');
        var groupPkg = window.customFieldMetaGroupPackages.get(groupId);
        if (groupPkg) {
            var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
            // If there is one or more groups in the form not associated with line items, create them before creating a new empty group. 
            // This happens on new forms when the user clicks on add before entering any value. We need to create all the empty cfvs for the groups on screen to the group's min count.
            var $groupSets = this.$el.find(".FormElementGroupSet[data-setid='" + Constants.c.emptyGuid + "']");
            $groupSets = $groupSets.has("[data-groupid='" + groupId + "']");
            var i = 0;
            var blankValues = {};
            var set;
            var createField = true;
            // Create the the field sets, but only if all of the elements in the set have a backing store value id of Constants.c.emptyGuid
            for (i; i < $groupSets.length; i++) {
                var $groupSet = $groupSets.eq(i);
                var $cols = $groupSet.find('[data-groupid]:not(option)');
                var idx = 0;
                var colLen = $cols.length;
                var values = {};
                for (idx; idx < colLen; idx++) {
                    var $col = $cols.eq(idx);
                    var bsId = $col.data('backingstoreid');
                    blankValues[bsId] = undefined;
                    // Don't create the field set if a field in the set is determined to already be associated with a backing store value
                    if ($col.data('backingstorevalueid') !== Constants.c.emptyGuid) {
                        createField = false;
                    }
                    var val = this.getValueOfFormElement($col);
                    values[bsId] = val;
                }
                if (createField) {
                    cfvs.createSet({ groupId: groupId, values: values, createWithDefault: true });
                }
            }
            // Now create the empty set
            // Create the empty set with default values, otherwise the form group set and the line item set won't be synced, if there are no corresponding values
            cfvs.createSet({ groupId: groupId, values: blankValues, createWithDefault: true });
        }
    },
    deleteGroupSet: function (event) {
        var $currTarg = $(event.currentTarget);
        var $set = this.$el.find('.FormElementGroupSet').has($currTarg);
        var setId = $set.data('setid');
        if (setId) {
            var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
            cfvs.removeSetValues(setId);
        }
    },
    setupAutoSave: function (m, o) {
        clearTimeout(this.autoSaveTimeout);
        var dp = this.model.get('DocumentPackage');
        if (!dp || o.ignoreChange) {
            return; // ignore event if DocumentPackage doesn't exist (yet), if explicitly want to ignore change (eg. performing a save with a success callback)
        }
        var setAutoSaveTimer = o && o.collectionDirtyChange;
        setAutoSaveTimer = setAutoSaveTimer | (m && m.isDirtyEligible && m.isDirtyEligible());

        if (setAutoSaveTimer) {
            if (this.model.allowSave()) {
                var that = this;
                Utility.log('Starting autosave timeout');
                this.autoSaveTimeout = setTimeout(function () { that.autoSave(); }, Constants.AutoSaveDelay * 1000); //Autosave delay is in seconds
            }
        }
    },
    autoSave: function () {
        Utility.log('autosave timeout executing');
        if (this.model.allowSave()) {
            var that = this;
            Utility.log('autosave executing');
            var dp = this.model.get('DocumentPackage');
            var $dlg = DialogsUtil.generalDialog('#autoSaveInProgress', {
                autoOpen: false,
                height: 100,
                minHeight: 100,
                width: 150,
                minWidth: 150,
                open: function () {
                    $(document).find('.ui-dialog-titlebar:visible').hide();
                }
            });
            $dlg.dialog('open');
            dp.save(null, {
                ignoreSync: true,
                complete: function () {
                    that.model.setDirty(false); //Manually set since we have set the ignore sync to true.
                    Utility.log('autosave complete');
                    DialogsUtil.isDialogInstanceDestroyDialog($dlg);
                }
            });
        }
    },
    //#region Push events from Form into Model.
    ///<summary>
    /// Update the model with new values
    ///<param name="$sel">element in form used to update model</param>
    ///<param name="values">An object - Key: backingstoreid, Value: value to be updated</param>
    ///<param name="createWithDefault">Create a custom field value with its default value</param>
    ///</summary>
    updateModel: function ($sel, values, createWithDefault) {
        if (this.progUpdt) {
            return;
        }
        this.progUpdt = true;
        var args;
        var that = this;
        var valIdUpdated = function (id, newGroupSet) {
            if (newGroupSet) {
                //A new group set indicates that we have added a new set as a result of entering data into the form.
                //Update the backingstorevalueid's of the other set elements on the form so they are tied to the correct cf value entry.
                var i = 0;
                var length = newGroupSet.length;
                var setId;
                for (i; i < length; i++) {
                    var c = newGroupSet[i];
                    setId = c.get('SetId');
                    var val = c.getValue();
                    val = val === undefined || val === null ? '' : val;
                    that.updateFormEls(val, c.get('CustomFieldMetaId'), c.get('Id'), c.get('CustomFieldGroupId'), setId);
                }
                $sel.closest('.FormElementGroupSet').data('setid', setId);
            } else {
                var $bsItems = $sel;
                if ($sel.is(':radio')) {
                    $bsItems = $sel.closest('div.formElementMarkup').find('input[type="radio"]');
                }
                $bsItems.data('backingstorevalueid', id);
            }
        };
        args = {
            storeId: $sel.data('backingstoreid'),
            valueId: $sel.data('backingstorevalueid'),
            groupId: $sel.data('groupid'),
            values: values,
            valueIdUpdatedCB: valIdUpdated,
            createWithDefault: createWithDefault
        };
        this.model.updateBackingStore(args);
        this.progUpdt = false;
    },
    ///<summary>
    /// Obtain an object for updating a model from a form element
    ///<param name="$el">form element to obtain the value from</param>
    ///</summary>
    getModelValuesFromElement: function ($el) {
        var bsId = $el.data('backingstoreid');
        var values = {};
        var val = this.getValueOfFormElement($el);
        values[bsId] = val === null ? '' : val;
        return values;
    },
    textChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, this.getModelValuesFromElement($sel));
    },
    boolChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, this.getModelValuesFromElement($sel));
    },
    radioChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, this.getModelValuesFromElement($sel));
    },
    numberChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, this.getModelValuesFromElement($sel));
    },
    selectChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        var $option = $sel.find(':selected');
        this.updateModel($sel, this.getModelValuesFromElement($sel));
    },
    dateChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, this.getModelValuesFromElement($sel));
    },
    datetimeChanged: function (ev) {
        var $sel = $(ev.currentTarget);
        this.updateModel($sel, this.getModelValuesFromElement($sel));
    },
    datePickerClose: function (dateText, inst) {
        if (dateText) {
            var $input = inst.input;
            if ($input.attr('type') === 'date') {
                dateText = new Date(dateText).format('generalDateOnly');
            }
            $input.attr('value', dateText);
            $input.val(dateText);
        }
    },
    //#endregion

    //#region Push events from Model into Form.
    updateForm: function (value, backingStoreId, backingStoreValueId, groupId, setId) {
        if (this.progUpdt) {
            return;
        }
        this.progUpdt = true;
        this.updateFormEls(value, backingStoreId, backingStoreValueId, groupId, setId);
        this.progUpdt = false;
    },
    ///<summary>
    /// Update the forms group values to be blank, when the group's set is removed, or the group itself is removed entirely
    ///</summary>
    updateFormsGroupOnRemove: function () {
        var $groupSet = this.$el.find('.FormElementGroupSet[data-setid="' + Constants.c.emptyGuid + '"]');
        var cfvs = this.model.getDotted('DocumentPackage.Version.CustomFieldValues');
        // Update form elements that are associated with the group and are no longer associated with a backingstore value
        var setIdsHash = {};
        var $setItems = $groupSet.find('[data-setid]');
        var i = 0;
        var length = $setItems.length;
        for (i = 0; i < length; i++) {
            var $fe = $setItems.eq(i);
            var tagName = $fe.prop('tagName');
            // Update any field set item that is unassociated with a backing store value
            // Don't update the found spans, because they correspond to the 'Add' and 'Remove' buttons, which shouldn't have values
            if ($fe.data('backingstorevalueid') === Constants.c.emptyGuid && tagName !== 'SPAN') {
                this.updateFormEl(tagName, $fe, undefined);
            }
        }
    },
    titleChanged: function (m, o) {
        var title = this.model.getDotted('DocumentPackage.Version.Title');
        this.updateForm(title, Constants.UtilityConstants.FIELD_ID_TITLE, Constants.UtilityConstants.FIELD_ID_TITLE);
    },
    keywordsChanged: function (m, o) {
        var keywords = this.model.getDotted('DocumentPackage.Version.Keywords');
        this.updateForm(keywords, Constants.UtilityConstants.FIELD_ID_KEYWORDS, Constants.UtilityConstants.FIELD_ID_KEYWORDS);
    },
    customFieldChanged: function (m, o) {
        var value = m.getValue(); // m.getDisplayValue()
        var cfmId = m.get('CustomFieldMetaId');
        var valId = m.get('Id');
        var groupId = m.get('CustomFieldGroupId');
        var setId = m.get('SetId');
        this.updateForm(value, cfmId, valId, groupId, setId);
    },
    customFieldRemoved: function (m, c, o) {
        o = o || {};
        var cfmId = m.get('CustomFieldMetaId');
        var valId = m.get('Id');
        var groupId = m.get('CustomFieldGroupId');
        var setId = m.get('SetId');
        if (!o.collectionRemoveInProgress) {
            if (groupId) {
                var that = this;
                this.render({
                    callback: function () {
                        // Default values are provided for the removed field set upon render
                        // Clear out the values since the field set was removed and should no longer have any values
                        that.updateFormsGroupOnRemove();
                    }
                });
            } else {
                this.updateForm(undefined, cfmId, valId, groupId, setId);
            }
        }
    },
    customFieldAdded: function (m, c, o) {
        var cfmId = m.get('CustomFieldMetaId');
        var valId = m.get('Id');
        var groupId = m.get('CustomFieldGroupId');
        var setId = m.get('SetId');
        if (groupId && !this.progUpdt && this.lastAddedSetId !== setId) {
            // provide a selectElement, so it can be scrolled to upon render completion
            this.render({ selectElement: valId });
            this.lastAddedSetId = setId;
        } else {
            this.updateForm(undefined, cfmId, valId, groupId, setId);
        }
    },
    //#endregion

    //#region Common Push Events methods:
    updateFormEls: function (value, backingStoreId, backingStoreValueId, groupId, setId) {
        //We may need a cache here, but it seems very fast. Premature optimization is bad.
        var masterForm = document.getElementById("masterForm");
        var formElements = masterForm ? masterForm.getElementsByTagName('*') : [];
        var i = 0;
        var length = formElements.length;
        var valueIdMatch = false;
        var metaIdMatch = false;
        var notAssociated = false;
        var groupIdMatch = false;
        for (i; i < length; i++) {
            var fe = formElements[i];
            var tagName = fe.tagName;
            var $el = $(fe);
            if ((tagName !== 'DIV' && (tagName !== 'SPAN' || (tagName === 'SPAN' && $el.hasClass('FormDeleteGroupSetButton'))) && tagName !== 'OPTION' && !$el.hasClass('ignore'))) {
                valueIdMatch = $el.data('backingstorevalueid') === backingStoreValueId;
                metaIdMatch = $el.data('backingstoreid') === backingStoreId;
                notAssociated = $el.data('backingstorevalueid') === Constants.c.emptyGuid;
                groupIdMatch = !groupId || $el.data('groupid') === groupId;
                var $set = $(masterForm).find('.FormElementGroupSet').has($el);
                var isInSet = $set.length > 0;
                //Existing value handling:
                if (valueIdMatch) {
                    if (isInSet) {
                        $set.data('setid', setId);
                    }
                    if (value === undefined) { //Undefined = Field was removed.
                        this.updateFormEl(tagName, $el, value);
                        break;
                    } else {
                        this.updateFormEl(tagName, $el, value);
                        break;
                    }
                } else if (value !== undefined && metaIdMatch && notAssociated && groupIdMatch) {     //Un-associated field that matches the meta id, associate with the given backing store value id.
                    $set.data('setid', setId);
                    $el.data('backingstorevalueid', backingStoreValueId);
                    this.updateFormEl(tagName, $el, value);
                    break;
                }
            }
        }
    },
    updateFormEl: function (tagName, $el, value) {
        var val = value;
        var fieldRemoved = value === undefined;
        var $els = $el;
        // Field was removed, so update the value to be an empty string and update the backing store of the form element
        if (fieldRemoved) {
            val = '';
        }
        switch (tagName) {
            case 'INPUT':
            case 'TEXTAREA':
            case 'SELECT':
                if ($el.is(':checkbox')) {
                    // Is a checkbox group
                    if ($el.data('val') !== undefined) {
                        // Only check a checkbox groups checkbox, if the value of the checkbox and the value provided by the user are equal
                        $el.prop('checked', $el.data('val') === val);
                    }
                    else {
                        $el.prop('checked', !!val);
                    }
                }
                else if ($el.is(':radio')) {
                    $el.prop('checked', false);
                    var $fem = $el.closest('.formElementMarkup');
                    // set $els to all of the $el radio siblings, so their backing store values will be updated properly if need be, and will all match
                    $els = $fem.find(':radio');
                    var idx = 0;
                    var length = $els.length;
                    // Update the checked property of each radio
                    for (idx; idx < length; idx++) {
                        var $rad = $els.eq(idx);
                        // A radio only becomes checked if its value and the user provided value are equivalent
                        $rad.prop('checked', $rad.val() === val);
                    }
                }
                else {
                    $el.val(val);
                }
                break;
            case 'OPTION':
                if ($el.val() === val) {
                    $el.prop('selected', true);
                }
                break;
            case 'SPAN':
                $el.text(val);
                break;
            default:
                break;
        }
        // Clear the backingstorevalueid from the form element, so if it gets updated with a new value a new custom field value will be created
        if (fieldRemoved) {
            $els.data('backingstorevalueid', Constants.c.emptyGuid);
        }
    },
    saveApprovalStamp: function (ev) {
        // Saving the approval stamp needs to move to the next item if it is supposed to.
        $(ev.currentTarget).addClass('disabled');
        // If the document is in workflow then attempt to submit it and move to next, otherwise just save the document
        var taskUIData = this.model.getDotted('DocumentPackage.WFDocumentDataPackage.TaskUIData');
        var isUserApprovalOnly = taskUIData ? taskUIData.IsUserApprovalOnlyInput() : false;
        // Only submit the workflow if the document is in an active workflow and the only task is the user approval task.
        // Otherwise just perform a save of the document
        if (this.model.isInWorkflow(true) && isUserApprovalOnly) {
            this.model.set('submitWorkflowOnApprovalStampSave', true);
        }
        else {
            this.model.get('DocumentPackage').save();
        }
    },
    ///<summary>
    /// Remove the approval from the document and remove the approval stamp
    ///</summary>
    cancelApprovalStamp: function (ev) {
        $(ev.currentTarget).addClass('disabled');
        var dp = this.model.get('DocumentPackage');
        var newApp = dp.get('Approval');
        var approvals = dp.get('Approvals');
        // remove the in progress approval from the approvals collection
        approvals.remove(newApp);
        var o = { ignoreChange: true, ignoreReset: true };
        dp.removeApprovalStamp(newApp.get('Id'), o);
        //Unset any approval in progress (It has been cancelled)
        dp.set('Approval', undefined, o);
        var transformCont = this.pzr.getTransformCont();
        var viewport = this.pzr.getViewPort();
        var $appStamp = viewport.find('.isNewApprovalStamp');
        var $selectedAppStamp = viewport.find('.selectedAnno').has($appStamp);
        $selectedAppStamp.remove();
        transformCont.find('.isNewApprovalStamp').remove();

        // Show any my approval marks. (The user may approve/deny while in annotation edit mode and then both the existing stamp and new stamp would be movable)
        var page1 = this.model.get('DocumentPackage').findPage(1);
        var myApproval = this.model.getMyApproval();
        if (myApproval) {
            var existingMyApprovalMark = page1.pdto.get('AnnotationCollection').findWhere({ ApprovalId: myApproval.get('Id') });
            if (existingMyApprovalMark) {
                viewport.find('img[markId="' + existingMyApprovalMark.get('Id') + '"]').remove();
            }
        }
        this.dfAnnotationView.render();
    },
    hideApprovalStamp: function (ev) {
        var $currTarg = $(ev.currentTarget);
        var $img = $currTarg.siblings('[markid]');
        var markId = $img.attr('markid');
        var page1 = this.model.get('DocumentPackage').findPage(1);
        var annos = page1 && page1.pdto ? page1.pdto.get('AnnotationCollection') : undefined;
        var idx = 0;
        var length = annos ? annos.length : 0;
        var mark;
        for (idx; idx < length; idx++) {
            if (annos.at(idx).get('Id') === markId) {
                mark = annos.at(idx);
                break;
            }
        }
        if (mark) {
            mark.set('isCollapsed', true);
        }
    }
    //#endregion
});