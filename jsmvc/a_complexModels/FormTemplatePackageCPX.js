//Complex Objects: A model that contains other models in its attributes. The complex object is setup so events from child models propegate up to the parent.
var FormTemplatePackage = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    guidRegEx: new RegExp(Constants.UtilityConstants.GUID_REGEX, 'ig'),
    proxy: FormsServiceProxy({ skipStringifyWcf: true }),
    originalFormulaElements: {},
    defaults: {
        FormulaElements: []
    },
    initialize: function () {
        var that = this;
        var ffes = this.get('FormulaElements');
        if (!ffes || ffes instanceof Array) {
            this.set('FormulaElements', ffes || []);
        }
        this.listenTo(this, 'change', that.modelChanged);
        this.listenTo(this, 'sync', that.modelSynced);
    },
    // Perform client side validation for models here
    validate: function (attrs) {
        // This function executes when you call model.save()
        // It will return an object with each validation error that may have occurred
        var msg = {};
        var template = attrs.Template;
        if (template.get('Name') === Constants.t('blankFormTemplate')) {
            msg.Name = String.format(Constants.c.newNameWarning, Constants.t('blankFormTemplate'));
        }
        else if (template.get('Name') === Constants.t('newTitle')) {
            msg.Name = String.format(Constants.c.newNameWarning, Constants.t('newTitle'));
        }
        else if (this.isDuplicateName(template.get('Name'), template.get('Category'), template.get('Id'))) {
            // Validate each name in the same category is unique
            msg.Name = String.format(Constants.t('templateAlreadyExists'), template.get('Name'), template.get('Category'));
        }

        if (attrs.Elements) {
            var elements = attrs.Elements;
            var elementsLength = elements.length;
            for (i = 0; i < elementsLength; i++) {
                var elementError = elements.at(i).validate();
                if ($.isEmptyObject(elementError) === false) {
                    var item;
                    for (item in elementError) {
                        if (elementError.hasOwnProperty(item)) {
                            if (msg.hasOwnProperty(item)) {
                                msg[item] += "<br/>" + elementError[item];
                            } else {
                                msg[item] = elementError[item];
                            }
                        }
                    }
                }
            }
        }

        // Add validation here for attrs
        // Any error msg should be added to the msg object with a key that matches the name attribute of an html element
        // eg. msg.Name = 'error message', where an html element has a name attribute of 'Name'
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    ///<summary>
    /// Returns true if there is a duplicate name and category present in this model's collection
    ///</summary>
    isDuplicateName: function (name, cat, id) {
        name = name || this.get('Name');
        cat = cat || this.get('Category');
        id = id || this.get('Id');
        var collection = window.slimFormTemplates.filterByCategory(cat);
        var idx = 0;
        var length = collection.length;
        for (idx; idx < length; idx++) {
            var sft = collection[idx];
            // Check for duplicate name, already filtered to category
            if (sft.Name === name && sft.FormTemplateId !== id) {
                return true;
            }
        }
        return false;
    },
    set: function (key, value, options) {
        var attrs = {};
        options = options || {};
        this.normalizeSetParams(key, value, options, attrs);
        if (attrs.Template) {
            if (this.get('Template') instanceof Backbone.Model) {
                this.get('Template').set(attrs.Template);
                delete attrs.Template;
            }
            else {
                attrs.Template = new FormTemplate(attrs.Template);
                this.bindSubModelEvents(attrs.Template, 'Template');
            }
        }
        if (attrs.Elements) {
            if (this.get('Elements') instanceof Backbone.Collection) {
                this.get('Elements').set(attrs.Elements);
                delete attrs.Elements;
            }
            else {
                attrs.Elements = new FormElements(attrs.Elements);
                this.bindSubModelEvents(attrs.Elements, 'Elements');
            }
        }
        if (attrs.FormulaElements) {
            if (this.get('FormulaElements') instanceof Backbone.Collection) {
                this.get('FormulaElements').set(attrs.FormulaElements);
                delete attrs.FormulaElements;
            }
            else {
                attrs.FormulaElements = new FormFormulaElements(attrs.FormulaElements);
                this.bindSubModelEvents(attrs.FormulaElements, 'FormulaElements');
            }
        }
        if (attrs.ElementGroups) {
            if (this.get('ElementGroups') instanceof Backbone.Collection) {
                this.get('ElementGroups').set(attrs.ElementGroups);
                delete attrs.ElementGroups;
            }
            else {
                attrs.ElementGroups = new FormElementGroups(attrs.ElementGroups);
                this.bindSubModelEvents(attrs.ElementGroups, 'ElementGroups');
            }
        }
        if (attrs.Parts) {
            if (this.get('Parts') instanceof Backbone.Collection) {
                this.get('Parts').set(attrs.Parts);
                delete attrs.Parts;
            }
            else {
                attrs.Parts = new FormParts(attrs.Parts);
                this.bindSubModelEvents(attrs.Parts, 'Parts');
            }
        }
        if (attrs.ElementGroupMembers) {
            if (this.get('ElementGroupMembers') instanceof Backbone.Collection) {
                this.get('ElementGroupMembers').set(attrs.ElementGroupMembers);
                delete attrs.ElementGroupMembers;
            }
            else {
                attrs.ElementGroupMembers = new FormElementGroupMembers(attrs.ElementGroupMembers);
                this.bindSubModelEvents(attrs.ElementGroupMembers, 'ElementGroupMembers');
            }
        }
        return Backbone.Model.prototype.set.call(this, attrs, options);
    },
    sync: function (method, model, options) {
        var that = this;
        options = options || {};
        options.syncMethod = method;
        this.set({ executing: true }, options);
        var ff = function (qXHR, textStatus, error) {
            if (error.Type === 'Astria.Framework.DataContracts.FormElementFormulaDeletionException') {
                var errorData = Utility.tryParseJSON(error.Data);
                that.trigger('error', that, errorData);
                ErrorHandler.popUpMessage(error);
            }
            else if (options && options.failure) {
                options.failure(error && error.Message);
            }
            else {
                ErrorHandler.popUpMessage(error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
            that.set({ executing: false }, options);
        };
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
        switch (method) {
            case 'read':
                var getFormArgs = {
                    FormId: this.get('Id'),
                    IncludeElementMarkup: options.includeElementMarkup
                };
                this.proxy.getFormTemplatePackage(getFormArgs, sf, ff, complete, null, options.headers);
                break;
            case 'create':
                // Add a create call
                this.proxy.create(this.toJSON(), function (result) {
                    result.Id = result.Template.Id;
                    that.set(result, { silent: true });
                    window.slimFormTemplates.add(that.get('Template').getSlimFormTemplate(), options);
                    sf(result);
                }, ff, complete, null, options.headers);
                break;
            case 'update':
                // Add an update call
                this.proxy.update(this.toJSON(), function (result) {
                    result.Id = result.Template.Id;
                    that.set(result, { silent: true });
                    var ft = that.get('Template');
                    window.slimFormTemplates.get(that.get('Id')).set(ft.getSlimFormTemplate());
                    sf(result);
                }, ff, complete, null, options.headers);
                break;
            case 'delete':
                // Add a delete call
                this.proxy['delete'](this.get('Id'), function (result) {
                    window.slimFormTemplates.remove(that.get('Id'), options);
                    sf(result);
                }, ff, complete, null, options.headers);
                break;
        }
    },
    ///<summary>
    /// Track dirty changes on model change, and set the dirty flag
    ///</summary>
    modelChanged: function (m, o) {
        var template = this.get('Template');
        if (!template || o.ignoreChange) {
            return; // ignore event if Template doesn't exist (yet)
        }
        //Set dirty flag (except for certain case); set isSlimEligible in DocumentPackage
        var setDirty = false;
        if (o && o.setDirty) {
            setDirty = true;
        } else if (o && o.collectionDirtyChange) {
            setDirty = true;
        } else if (m && m.isDirtyEligible()) {
            setDirty = true;
        }
        if (setDirty) {
            this.setDirty(true);
        }
    },
    ///<summary.
    /// Model has been synced, clear dirtyness
    ///</summary>
    modelSynced: function (model_or_collection, resp, options) {
        this.setDirty(false);
    },
    ///<summary>
    /// Set dirtyness
    ///</summary>
    setDirty: function (state) {
        var dirty = this.get('isDirty');
        if (dirty !== state) {
            this.set('isDirty', state, { silent: true }); //Don't let setting dirty trigger a change. (even though the model change would ignore it don't want to fire all those events)
            this.trigger('change:isDirty'); //Manually fire just the isDirty change event (not the generic change event).
        }
    },
    ///<summary>
    /// Save a copy of the current form template with a new name
    ///<param name="name">Name of the new form template</param>
    ///<param name="options">backbone options object for saving a form template package</param>
    ///</summary>
    saveAs: function (name, options) {
        var newModel = new FormTemplatePackage(this.toJSON());
        var newIdsLen = 1;
        var egs = newModel.get('ElementGroups');
        var es = newModel.get('Elements');
        var ps = newModel.get('Parts');
        var gms = newModel.get('ElementGroupMembers');
        var fefs = newModel.get('FormulaElements');
        newIdsLen += egs.length;
        newIdsLen += es.length;
        newIdsLen += ps.length;
        newIdsLen += fefs.length;
        var newIds = Utility.getSequentialGuids(newIdsLen);
        var templateId = newIds.shift();
        var idx = 0;
        var length = ps.length;
        var elem;
        var gm;
        // Replace Form Part Ids
        for (idx = 0; idx < length; idx++) {
            var part = ps.at(idx);
            var oldPartId = part.get('Id');
            var newPartId = newIds.shift();
            var elemGroupsIdx = 0;
            var elemGroupsLen = egs.length;
            for (elemGroupsIdx; elemGroupsIdx < elemGroupsLen; elemGroupsIdx++) {
                var elemGroup = egs.at(elemGroupsIdx);
                if (elemGroup.get('FormPartId') === oldPartId) {
                    elemGroup.set('FormPartId', newPartId);
                }
            }
            var elemsIdx = 0;
            var elemsLen = es.length;
            for (elemsIdx; elemsIdx < elemsLen; elemsIdx++) {
                elem = es.at(elemsIdx);
                if (elem.get('FormPartId') === oldPartId) {
                    elem.set('FormPartId', newPartId);
                }
            }
            part.set({
                'Id': newPartId,
                'FormId': Constants.c.emptyGuid
            });
        }
        // Replace Group Member Group Ids and Group Ids
        length = egs.length;
        for (idx = 0; idx < length; idx++) {
            var eg = egs.at(idx);
            var oldElemGroupId = eg.get('Id');
            var newElemGroupId = newIds.shift();
            if (eg.get('Id') === oldElemGroupId) {
                // Replace Group Id
                eg.set('Id', newElemGroupId);
                // Replace Group Member Group Ids
                var groupMembersIdx = 0;
                var groupMembersLen = gms.length;
                for (groupMembersIdx; groupMembersIdx < groupMembersLen; groupMembersIdx++) {
                    gm = gms.at(groupMembersIdx);
                    var oldGroupMemberId = gm.get('FormElementGroupId');
                    if (oldGroupMemberId === oldElemGroupId) {
                        gm.set({
                            FormElementGroupId: newElemGroupId
                        });
                    }
                }
            }
        }
        // Replace Group Member Element Ids and Element Ids
        // Replace matching old FormulaElement ElementIds with the matching new Element Id
        length = es.length;
        for (idx = 0; idx < length; idx++) {
            elem = es.at(idx);
            var oldElemId = elem.get('Id');
            var newElemId = newIds.shift();
            // Replace Group Member Element Ids
            gm = gms.get(oldElemId);
            if (gm) {
                gm.set({
                    FormElementId: newElemId
                });
            }
            // Replace Element Ids in FormulaElements
            var fefsMatching = fefs.getByElementId(oldElemId);
            var fefsIdx = 0;
            var fefsLen = fefsMatching.length;
            for (fefsIdx; fefsIdx < fefsLen; fefsIdx++) {
                fefsMatching[fefsIdx].set('FormElementId', newElemId);
            }
            // Replace TargetIds in FormulaElements
            fefsMatching = fefs.getByTargetId(oldElemId);
            fefsLen = fefsMatching.length;
            for (fefsIdx = 0; fefsIdx < fefsLen; fefsIdx++) {
                fefsMatching[fefsIdx].set('TargetId', newElemId);
            }
            // Replace Form Element Id
            elem.set('Id', newElemId);
        }
        // Replace FormulaElement Ids and the corresponding Ids in FormElement Formulas
        length = fefs.length;
        for (idx = 0; idx < length; idx++) {
            var fef = fefs.at(idx);
            var oldFormulaElementId = fef.get('Id');
            var newFormulaElementId = newIds.shift();
            // Replace each instance of the old FormulaElement Id in each Form Element's Formula with the new FormulaElement Id
            es.replaceFormulaId(oldFormulaElementId, newFormulaElementId);
            fef.set('Id', newFormulaElementId);
        }
        // Replace Template Id
        var template = newModel.get('Template');
        template.set({
            Name: name,
            Id: templateId
        });
        newModel.unset('Id');
        var that = this;
        options = $.extend({}, options, {
            complete: function () {
                newModel.stopListening();
            }
        });
        this.listenToOnce(newModel, 'invalid', function (model, response, options) {
            options.isSaveAs = true;
            that.trigger('invalid', newModel, response, options);
        });
        newModel.save(null, options);
    },
    toJSON: function () {
        return this.toJSONComplex();
    },
    setGroupMembers: function (formElementGroupMembers) {
        var fegms = this.get('ElementGroupMembers');
        if (fegms instanceof Backbone.Collection) {
            fegms.add(formElementGroupMembers);
        }
        else {
            this.set('ElementGroupMembers', formElementGroupMembers);
        }
    },
    hasModifyPermissions: function () {
        var perms = this.getDotted('Template.EffectivePermissions');
        // If there are no Effective Permissions it is a new Form Template
        if (perms === undefined) {
            perms = Constants.sp.Full;  // User has full permissions to modify if they are creating a new form template
        }
        return Utility.hasFlag(perms, Constants.sp.Modify);
    },
    isInGroup: function (formElementId) {
        var selectedGroupMember = this.getDotted('ElementGroupMembers.' + formElementId);
        return !!selectedGroupMember;
    },
    getGroupMember: function (formElementId) {
        return this.getDotted('ElementGroupMembers.' + formElementId);
    },
    getGroupsElements: function (groupElementId) {
        var members = this.get('ElementGroupMembers');
        var formElements = this.get('Elements');
        var elems = [];
        var idx = 0;
        var length = members ? members.length : 0;
        for (idx; idx < length; idx++) {
            var member = members.at(idx);
            if (member.get('FormElementGroupId') === groupElementId) {
                elems.push(formElements.get(member.get('FormElementId')));
            }
        }
        return elems;
    },
    deleteFormElementsAndFormElementGroups: function (options) {
        options = options || {};
        var formulaElements = this.get('FormulaElements');
        var elementGroupMembers = this.get('ElementGroupMembers');
        var selected = this.get('Elements').getSelected();
        var idx = 0;
        var length = selected.length;
        var elementsToRemove = [];
        var elementGroupsToRemove = [];
        for (idx; idx < length; idx++) {
            var feId = selected[idx].get('Id');
            var groupMember = this.getGroupMember(feId);
            if (!!groupMember) {
                elementGroupsToRemove.push(groupMember.get('FormElementGroupId'));
                elementsToRemove = elementsToRemove.concat(this.get('ElementGroupMembers').getFormElementsInSameGroup(feId));
            }
            else {
                elementsToRemove.push(feId);
            }
        }
        length = elementsToRemove.length;
        var fes = this.get('Elements');
        var currIdx;
        var sf = function () {
            if (currIdx === length - 1) {
                Utility.executeCallback(options.success);
            }
        };
        for (idx = 0; idx < length; idx++) {
            var fe = fes.get(elementsToRemove[idx]);
            if (fe) {
                currIdx = idx;
                fe.destroy({
                    silent: options.silent,
                    success: sf
                });
                elementGroupMembers.remove(fe, { silent: options.silent });
                // Remove all formula elements that have the deleted form element as its target id
                formulaElements.remove(formulaElements.getByTargetId(fe.get('Id')));
            }
        }
        length = elementGroupsToRemove.length;
        var fegs = this.get('ElementGroups');
        for (idx = 0; idx < length; idx++) {
            var feg = fegs.get(elementGroupsToRemove[idx]);
            if (feg) {
                feg.destroy({ silent: options.silent });
            }
        }
    },
    removeFormPartItems: function (formPartId) {
        var elementGroupMembers = this.get('ElementGroupMembers');
        var idx = 0;
        var length = this.get('Elements').length;
        for (idx; idx < length; idx++) {
            var element = this.get('Elements').at(idx);
            if (element.get('FormPartId') === formPartId) {
                element.destroy();
                elementGroupMembers.remove(element);
                --idx;
                --length;
            }
        }
        idx = 0;
        length = this.get('ElementGroups').length;
        for (idx; idx < length; idx++) {
            var elementGroup = this.get('ElementGroups').at(idx);
            if (elementGroup.get('FormPartId') === formPartId) {
                elementGroup.destroy();
                --idx;
                --length;
            }
        }
    },
    getPartElements: function () {
        var elems = [];
        var currPart = this.get('Parts').getCurrent();
        var partId = currPart.get('Id');
        var idx = 0;
        var length = this.get('Elements').length;
        for (idx; idx < length; idx++) {
            var elem = this.get('Elements').at(idx);
            if (elem.get('FormPartId') === partId) {
                elems.push(elem);
            }
        }
        return elems;
    },
    //#region Formulas
    ///<summary>
    /// Obtain the formula for display purposes - using the custom field name in place of the FormulaElement Id
    ///<param name="feId">optional; if provided get the display value of the form element id specified, otherwise get the first selected element and use that
    ///</summary>
    getFormulaForDisplay: function (formElementId, includeElementLabel) {
        var selectedElem;
        if (formElementId) {
            selectedElem = this.get('Elements').get(formElementId);
        }
        else {
            var selectedElems = this.get('Elements').getSelected(true);
            selectedElem = selectedElems ? selectedElems[0] : null;
        }
        if (!selectedElem) {
            return '';
        }
        var formula = selectedElem.getFormula();
        formula = this.getFormulaPartForDisplay(formula, formElementId, includeElementLabel);
        return formula;
    },
    ///<summary>
    /// Translate part of a formula (possibly whole formula) for display
    /// Replace guids with Element Label's or backing store names if the element does not have a label
    ///</summary>
    getFormulaPartForDisplay: function (formulaPart, formElementId, includeElementLabel) {
        var selectedElem;
        if (formElementId) {
            selectedElem = this.get('Elements').get(formElementId);
        }
        else {
            var selectedElems = this.get('Elements').getSelected(true);
            selectedElem = selectedElems ? selectedElems[0] : null;
        }
        if (!selectedElem) {
            return '';
        }
        // Find all ids and replace with the corresponding custom field meta names
        var guids = formulaPart.match(this.guidRegEx);
        if (guids && guids.length) {
            var idx = 0;
            var length = guids.length;
            // May want to cache this lookup if performance is an issue
            for (idx; idx < length; idx++) {
                var name = Constants.c.notfound;
                // Find FormulaElement
                var ffeId = guids[idx];
                var ffe = this.get('FormulaElements').get(ffeId);
                if (ffe) {
                    var feId = ffe.get('FormElementId');
                    var fe = this.get('Elements').get(feId);
                    if (fe) {
                        if (fe.hasLabel()) {
                            name = fe.get('Label');
                        }
                        else {
                            name = fe.getBackingStoreName();
                        }
                    }
                }
                var regEx = new RegExp(ffeId, 'ig');
                formulaPart = formulaPart.replace(regEx, name);
            }
        }
        if (includeElementLabel) {
            var elemLabel = '';
            if (selectedElem.hasLabel()) {
                elemLabel = selectedElem.get('Label');
            }
            else {
                elemLabel = selectedElem.getBackingStoreName();
            }
            formulaPart = elemLabel + ' = ' + formulaPart;
        }
        // Replace any '*' in formula with 'x'
        formulaPart = formulaPart.replace(new RegExp('\\*', 'ig'), 'x');
        return formulaPart;
    },
    ///<summary>
    /// Determine elements that are being deleted and belong to a Formula
    ///</summary>
    deletedFormElementsInFormulas: function () {
        var elements = this.get('Elements');
        var selected = elements.getSelected();
        var idx = 0;
        var length = selected.length;
        var formulaElements = this.get('FormulaElements');
        var isInFormula = false;
        // Detect if any selected elements are in a formula
        for (idx = 0; idx < length; idx++) {
            var eg = this.getGroupMember(selected[idx].get('Id'));
            // Only validate form element deletion if the selected element isn't part of a group 
            // group validation is done in deletedElementsInGroupHavingFormulaElement
            if (!eg) {
                var elementFormulaElements = formulaElements.getByElementId(selected[idx].get('Id'));
                var efeIdx = 0;
                var efeLen = elementFormulaElements.length;
                if (!isInFormula) {
                    isInFormula = efeLen > 0;
                }
                for (efeIdx; efeIdx < efeLen; efeIdx++) {
                    var efe = elementFormulaElements[efeIdx];
                    var targetElem = elements.get(efe.get('TargetId'));
                    //If the targetElem is not selected, it is not due for deletion, so display an error for the element attempted to be deleted
                    if (targetElem && !targetElem.isSelected()) {
                        // Set both separately, due to the detection in the change event for FormElements in FormElementView
                        targetElem.set('error', efe.get('FormElementId'));
                        selected[idx].set('selected', false);  // Remove the element from being selected, so that other elements that are allowed to be deleted can be
                    }
                }
            }
        }
        return isInFormula;
    },
    ///<summary>
    /// Determine elements that are being deleted and belong to a group which has any element being used in a Formula
    ///</summary>
    deletedElementsInGroupHavingFormulaElement: function () {
        var that = this;
        var isInFormulaGroup = false;
        var elements = this.get('Elements');
        var selected = elements.getSelected();
        var formulaElements = this.get('FormulaElements');
        var groupMembers = [];
        // Obtain all formulaElements group membership
        var idx = 0;
        var length = formulaElements.length;
        for (idx; idx < length; idx++) {
            var gm = this.getGroupMember(formulaElements.at(idx).get('FormElementId'));
            if (gm) {
                groupMembers.push(gm);
            }
        }
        var groupHandled = {};
        // Determine if a selected element (element to be deleted) is in a group with another element that is part of a formula
        // If so highlight the 'target' element, which has the formula definition
        length = selected.length;
        for (idx = 0; idx < length; idx++) {
            var sel = selected[idx];
            var selId = sel.get('Id');
            var seg = this.getGroupMember(selId);
            var egl = groupMembers.length;
            var i = 0;
            if (seg) {
                for (i; i < egl; i++) {
                    var fegId = groupMembers[i].get('FormElementGroupId');
                    if (!groupHandled[fegId] && fegId === seg.get('FormElementGroupId')) {
                        groupHandled[fegId] = true;
                        var elementFormulaElements = formulaElements.getByElementId(groupMembers[i].get('FormElementId'));
                        var efeIdx = 0;
                        var efeLen = elementFormulaElements.length;
                        for (efeIdx; efeIdx < efeLen; efeIdx++) {
                            var efe = elementFormulaElements[efeIdx];
                            var targId = efe.get('TargetId');
                            var teg = this.getGroupMember(targId);
                            // If the targetElem is not a part of the same group as the item to be deleted, it is not due for deletion, so display an error for the element attempted to be deleted
                            if (!teg || (fegId !== teg.get('FormElementGroupId'))) {
                                isInFormulaGroup = true;
                                // Set both separately, due to the detection in the change event for FormElements in FormElementView
                                var targetElem = elements.get(targId);
                                targetElem.set('error', efe.get('FormElementId'));
                                selected[idx].set('selected', false);  // Remove the element from being selected, so that other elements that are allowed to be deleted can be
                            }
                        }
                    }
                }
            }
        }
        return isInFormulaGroup;
    },
    ///<summary>
    /// Store original form formula elements for the selected form element
    ///</summary>
    storeOriginalFormElementFormulaElements: function (formElementId) {
        var ffes = this.get('FormulaElements');
        var idx = 0;
        var length = ffes.length;
        var result = [];
        for (idx; idx < length; idx++) {
            var ffe = ffes.at(idx);
            if (ffe.get('TargetId') === formElementId) {
                result.push(ffe.toJSON());
            }
        }
        if (!this.originalFormulaElements) {
            this.originalFormulaElements = {};
        }
        this.originalFormulaElements[formElementId] = result;
    },
    ///<summary>
    /// Revert the stored original formula elements for the passed in form element
    ///<summary>
    revertFormElementFormulaElements: function (formElementId) {
        var originalFormulaElements = this.originalFormulaElements[formElementId];
        if (originalFormulaElements) {
            this.get('FormulaElements').add(originalFormulaElements);
            originalFormulaElements = undefined;    // clear previously stored values since they have been reverted to
        }
    }
    //#endregion Formulas
});