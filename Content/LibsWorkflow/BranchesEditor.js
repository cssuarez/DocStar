/// <reference path="TaskEditor.js" />
/// <reference path="../Content/LibsExternal/a_jquery.js" />
/// <reference path="../Content/LibsInternal/ErrorHandler.js" />
/// <reference path="../Content/LibsInternal/Utility.js" />
var BranchesEditor = {
    newBranchesXML: [],
    mapBranches: function () {        
        ErrorHandler.removeErrorTags(css.warningErrorClassTag, css.inputErrorClass);
        // Map Branches
        $.map($('#step_branches li'), function (item) {
            var branchId = $(item).find('input[name="Id"]').val();
            var branchXML = $(Workflow.currentStepXMLClone).find('WFBranchDTO').filter(function () {
                var test_value = $(this).find(' > Id').text();
                return branchId === test_value;
            });
            // Map inputs to xml file
            var branchDesignerData = {};
            $.map($(item).find('input'), function (input) {
                if ($(input).attr('name') === "Condition") {
                    if ($(input).val()) {
                        var origCondition = $(input).val();
                        var condition = origCondition.replace(/!/g, "");

                        var arg = window.argumentLibrary[condition];
                        if (arg) {
                            if (origCondition === condition) {
                                $(branchXML).find($(input).attr('name')).text(arg.Name);
                            }
                            else {
                                $(branchXML).find($(input).attr('name')).text('!' + arg.Name);
                            }
                        }
                        else {
                            $(input).addClass(css.inputErrorClass);
                            ErrorHandler.addErrors(Constants.c.invalidBranchCondtion, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                            throw Constants.c.invalidBranchCondtion;
                        }
                    }
                    else { $(branchXML).find($(input).attr('name')).text(''); }
                }
                else {
                    var xElement = $(branchXML).find($(input).attr('name'));
                    if (!$.isEmptyObject(xElement) && xElement.length > 0) {
                        xElement.text($(input).val());
                    }
                    else {
                        branchDesignerData[$(input).attr('name')] = $(input).val();
                    }
                }
            });

            // Map selected options to xml file
            $.map($(item).find('select'), function (select) {
                var xElement = $(branchXML).find($(select).attr('name'));
                if (!$.isEmptyObject(xElement) && xElement.length > 0) {
                    xElement.text($(select).find('option:selected').val());
                }
                else {
                    branchDesignerData[$(select).attr('name')] = $(select).find('option:selected').val();
                }
            });
            // Write in designer data
            $(branchXML).find('DesignerData').text(JSON.stringify(branchDesignerData));
            // index is 0 based, sequence is 1 base
            var sequence = $(item).index() + 1;
            // Set Sequence based on list order
            $(branchXML).find('> Sequence').text(sequence);
            // Note: branches are not ordered by Sequence in the XML.  
        });
    },
    setupBranches: function (xml, empty) {        
        // Map Branches
        var branches = $(xml).find('WFBranchDTO');
        var errors = '';
        var argumentLibraryRM = Utility.reverseMapObject(window.argumentLibrary, 'Name');
        if (empty) {
            $('#step_branches').empty();
        }
        if (branches.length > 0) {
            var sortedBranches = Workflow.sortBySequence(branches);
            $(sortedBranches).map(function (key, item) {
                var branchName = $(item).find('> Label').text();
                var branchDesc = $(item).find('> Description').text();
                var branchId = $(item).find('> Id').text();
                var origCondition = $(item).find('> Condition').text();
                var designerData = {};
                var designerStr = $(item).find('> DesignerData').text();
                if (designerStr) {
                    designerData = JSON.parse(designerStr);
                }
                var condition = origCondition.replace(/!/g, "");
                var displayedCondition;

                if (argumentLibraryRM[condition]) {
                    displayedCondition = argumentLibraryRM[condition];
                    if (origCondition !== condition) {
                        displayedCondition = '!' + displayedCondition;
                    }
                }
                else if (origCondition) {
                    errors += Constants.c.invalidBranchCondtionDetected.replace('{0}', origCondition);
                }
                var branchDestId = $(item).find('> DestinationStepId').text();
                var branchDestStep = $(Workflow.xml).find('WFStepDTO').filter(function () {
                    var test_value = $(this).find(' >Id').text();
                    return test_value === branchDestId;
                });
                var sequence = $(item).find('> Sequence').text();
                var branchDestName = branchDestStep.find('> Name').text();
                // 2 items per div (div is a row)
                $('#step_branches')
                    .append($('<li></li')
                        .append($('<input type="hidden" />')
                            .attr('name', 'Sequence')
                            .val(sequence)
                        )
                        .append($('<div></div>')
                            .append($('<span></span>')
                                .text(Constants.c.label)
                            )
                            .append($('<input />')
                                .attr('name', 'Label')
                                .val(branchName)
                            )
                            .append($('<span></span>')
                                .text(Constants.c.wfDescription)
                            )
                            .append($('<input />')
                                .attr('name', 'Description')
                                .val(branchDesc)
                            )
                        )
                        .append($('<div></div>')
                            .append($('<span></span>')
                                .text(Constants.c.condition)
                            )
                            .append($('<input />')
                                .attr('name', 'Condition')
                                .val(displayedCondition)
                            )
                            .append($('<span></span')
                                .text(Constants.c.nextStep)
                            )
                            .append($('<select></select')
                                .attr('name', 'DestinationStepId')
                                .text(branchDestId)
                            )
                            .append($('<input type="hidden" />')
                                .attr('class', 'ignore')
                                .attr('name', 'Id')
                                .val(branchId)
                            )
                        )
                        .append($('<div></div>')
                            .append($('<span></span>')
                                .text(Constants.c.lineType)
                            )
                            .append($('<select></select>')
                                .attr('name', 'LineType')
                            )
                            .append($('<input type="hidden" />')
                                .attr('class', 'ignore')
                                .attr('name', 'LineTypeId')
                                .val(designerData.LineType)
                            )
                        )
                    );
                var destination = $('#dialog select[name="DestinationStepId"]').filter(function () {
                    var test_value = $(this).text();
                    return test_value === branchDestId;
                });
                StepEditor.fillNextSteps(destination, branchDestName, branchDestId);
                StepEditor.fillLineType($('select[name="LineType"]', $('#dialog #step_branches li').last()).last());
            });
            BranchesEditor.autoComplete('#step_branches input[name="Condition"]', window.argumentLibrary);
            if (errors.length > 0) {
                ErrorHandler.addErrors(errors);
            }
        }
    },
    getBranchConditions: function (tagObj) {
        var tagList = [];
        var tagText;
        for (tagText in tagObj) {
            if (tagObj.hasOwnProperty(tagText)) {
                if (tagObj[tagText].PropertyType === Constants.ty.Boolean ||
                        tagObj[tagText].PropertyType === Constants.ty.Decimal ||
                        tagObj[tagText].PropertyType === Constants.ty.Double ||
                        tagObj[tagText].PropertyType === Constants.ty.Int32 ||
                        tagObj[tagText].PropertyType === Constants.ty.Int64) {
                    tagList.push(tagText);
                }
            }
        }
        return tagList;
    },
    autoComplete: function (inputSelector, tagObj) {
        var tagList = BranchesEditor.getBranchConditions(tagObj);
        $(inputSelector).autocomplete({
            source: function (req, response) {
                var term = BranchesEditor.stripNonAlphaNumeric(req.term);
                var re = $.ui.autocomplete.escapeRegex(term);
                var matcher = new RegExp("^" + re, "i");
                response($.grep(tagList, function (item) { return matcher.test(BranchesEditor.stripNonAlphaNumeric(item)); }));
            },
            open: function (event, ui) {
                $('.ui-autocomplete').scrollTop(0);
            },
            select: function (event, ui) {
                var notOpp = $(this).data('ui-autocomplete').term.indexOf("!") === 0 ? "!" : "";
                $(this).val(notOpp + ui.item.label);
                return false;
            }
        });
    },
    conditionLibrary: function (ulSelector, tagObj) {        
        $(ulSelector).empty();
        var tagList = BranchesEditor.getBranchConditions(tagObj);
        var length = tagList.length;
        var i;
        for (i = 0; i < length; i++) {
            $(ulSelector).append($('<li></li>')
                    .attr('class', 'no_text_select')
                    .append($('<span></span>')
                        .text(tagList[i])));

        }
        $(ulSelector).find('li').draggable({
            helper: 'clone',
            revert: 'invalid',
            start: function (event, ui) {
                $(ui.helper).addClass('selected_item');
            },
            stop: function (event, ui) {
                $(ui.helper).removeClass('selected_item');
            }
        });
    },
    stripNonAlphaNumeric: function (string) {
        var r = string.toLowerCase();
        r = r.replace(new RegExp("[^A-z0-9 ]", 'g'), "");
        return r;
    },
    // Get branch changes   
    getXMLBranchIds: function () {
        // Get branch ids that are in the xml file
        var branchIds = [];
        var branches = $(Workflow.currentStepXMLClone).find('WFBranchDTO');
        $.map(branches, function (branch) {
            branchIds.push($(branch).find('Id').text());
        });
        return branchIds;
    },
    getCurrBranchIds: function () {
        // Get branch ids that are in the branch list
        var currBranchIds = [];
        $.map($('#step_branches li'), function (item) {
            currBranchIds.push($(item).find('input[name="Id"]').val());
        });
        return currBranchIds;
    },
    // Delete Branches
    getRemoveBranchIds: function () {        
        var xmlBranchIds = this.getXMLBranchIds();
        var currBranchIds = this.getCurrBranchIds();
        var delBranchIds = [];
        var del = false;
        // If there were no branches in the step to begin with there are none to delete
        if (xmlBranchIds.length <= 0) {
            return [];
        }
        // If there are no branches in the step being edited, delete every branch from the xml
        if (currBranchIds.length <= 0) {
            return xmlBranchIds;
        }
        var id;
        var currId;
        for (id in xmlBranchIds) {
            if (xmlBranchIds.hasOwnProperty(id)) {
                for (currId in currBranchIds) {
                    if (currBranchIds.hasOwnProperty(currId)) {
                        if (currBranchIds[currId] === xmlBranchIds[id]) {
                            del = false;
                            break;
                        }
                        else {
                            del = true;
                        }
                    }
                }
                if (del === true) {
                    delBranchIds.push(xmlBranchIds[id]);
                }
            }
        }
        return delBranchIds;
    },
    removeBranch: function (branch) {
        // Remove branch from ui   
        var confirmResult = confirm(Constants.c.deleteBranchConfirm);
        if (!confirmResult) {
            return;
        }
        var remId = branch.find('input[name="Id"]').val();
        BranchesEditor.newBranchesXML = $.grep(BranchesEditor.newBranchesXML, function (e) {
            return $(e).find('Id').text() !== remId;
        });
        $(branch).remove();
    },
    deleteBranch: function (branchIds) {        
        // Nothing to do if there are no branches to delete
        if (branchIds.length <= 0) {
            return;
        }
        // Remove branches from xml    
        $.map(branchIds, function (branchId) {
            var branchXML = $(Workflow.currentStepXMLClone).find('WFBranchDTO').filter(function () {
                var test_value = $(this).find('Id').text();
                return branchId === test_value;
            });
            $(branchXML).remove();
        });
    },
    addBranch: function () {
        if (!Workflow.advancedWf) {
            alert(Constants.c.advancedWorkflowRequired + Constants.c.branch);
            return;
        }
        // Fetch new branch        
        var newBranchXML = Workflow.fetchNewBranch(Workflow.currentStepId, Constants.c.emptyGuid);
        BranchesEditor.newBranchesXML.push(newBranchXML);
        // Add branch to ui        
        BranchesEditor.setupBranches(newBranchXML, false);
    },
    createBranches: function () {
        var length = 0;
        var currentStepXML = Workflow.currentStepXMLClone;
        if (BranchesEditor.newBranchesXML) {
            length = BranchesEditor.newBranchesXML.length;
            while (length > 0) {
                var currBranch = BranchesEditor.newBranchesXML.shift();
                $(currBranch).find('WFBranchDTO').appendTo($(currentStepXML).find('WFBranches'));
                length--;
            }
            BranchesEditor.newBranchesXML = [];
        }
    }
};