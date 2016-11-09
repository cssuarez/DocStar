var SlimFormTemplate = Backbone.Model.extend({
    defaults: {
        Name: Constants.t('blankFormTemplate'),
        Category: Constants.t('general'),
        FormTemplateId: Constants.t('emptyGuid')
    },
    dateTimeFields: {},
    sortAttribute: 'Name',  // Property of this model that should be used for sorting
    idAttribute: 'FormTemplateId',
    /// <summary>
    /// Creates a new document based on this form.
    /// </summary>
    /// <param name="dialogFunc">Should always be FormDialogs.createDocument, exception in unit tests where a UI will not be presented.</param>
    /// <param name="navigateTo">Once the document is created this controls if we will navigate to the document.</param>
    createFormDocument: function (dialogFunc, navigateTo) {
        var message = String.format(Constants.c.createDocumentFromFormMessage_T, this.get('Name'));
        var that = this;
        dialogFunc({
            message: message,
            callback: function (cleanup) {
                var proxy = FormsServiceProxy({ skipStringifyWcf: true });
                var sf = function (doc) {
                    if (navigateTo) {
                        $('body').trigger('ViewDocuments', { versionIds: [doc.Version.Id], inFormEdit: true });
                    }
                    that.trigger('documentCreated', doc);
                };
                var ff = function (xhr, status, err) {
                    ErrorHandler.popUpMessage(err);
                };
                var cf = function () {
                    cleanup();
                };
                proxy.createDocument({ FormTemplateId: that.get('FormTemplateId') }, sf, ff, cf);
            }
        });
    },
    ///<summary>
    /// Determine if this slim form template is in the specified category
    ///<param name="categoryName">The name of the category the slim form template is checked against</param>
    ///</summary>
    isInCategory: function (categoryName) {
        if (this.get('FormTemplateId') !== Constants.c.emptyGuid &&
           (categoryName === this.get('Category') || categoryName === Constants.c.categories)) {
            return true;
        }
        return false;
    }
});