// View for editing BuzzSpaces
// Renders a compiled template using doU.js
/// <reference path="../../Content/LibsInternal/Utility.js" />
var WorkflowDesignerEditView = Backbone.View.extend({
    viewData: {},
    events: {
    },
    saveChanges: function () {
    },
    /*
    * isUnique check the new against the existing.  do not allow same titles on two buzzspaces
    * if there is an update to the contents and the guid is the same then it is considered unique...
    * @param attrs which contains the Id and Title
    * @return boolean
    */
    isUnique: function (attrs) {
        var unique = true;
        window.editableBuzzSpaces.each(function (item) {
            if (attrs.Title.toLowerCase() === item.get('Title').toLowerCase()) {
                if (attrs.Id !== item.get('Id')) {
                    unique = false;
                }
            }
        });
        return unique;
    },
    /*
    * handleErrors - function to handle dressing multiple errors at a time
    * @param model - actual model with data
    * @param error - object with input names and corresponding error messages. 
    */
    handleErrors: function (model, error) {
        ErrorHandler.addErrors(error, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
    },
    kill: function (e) {
        //clear errors first       
    },
    initialize: function (options) {
        //this.compiledTemplate = doT.template($("#buzz_spaces_edit_html4_en").html());
        this.compiledTemplate = doT.template(Templates.get('workflowdesignerlayout'));
        return this;
    },

    render: function () {
        // Refresh viewData.list               
        $(this.el).html(this.compiledTemplate(this.viewData));
        // The containing HTML may have been violated, so re-delegate the events
        this.delegateEvents(this.events);
        $(this.el).find('iframe').attr('src', window.location.protocol + '//' + window.location.host + Constants.Url_Base + 'WorkflowDesigner/' + Utility.getCacheBusterStr());
        return this;
    }
});
