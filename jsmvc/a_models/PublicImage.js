var PublicImage = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    proxy: FileTransferServiceProxy({ skipStringifyWcf: true }),
    // Perform client side validation for models here
    validate: function (attrs) {
        // This function executes when you call model.save()
        // It will return an object with each validation error that may have occurred
        var msg = {};
        if (attrs.Name === Constants.t('newTitle')) {
            msg.Name = String.format(Constants.t('newNameWarning'), Constants.t('newTitle'));
        }
        if (this.isDuplicateName(attrs.Id, attrs.Name)) {
            msg.Name = Constants.t('duplicateNameError');
        }
        // Add validation here for attrs
        // Any error msg should be added to the msg object with a key that matches the name attribute of an html element
        // eg. msg.Name = 'error message', where an html element has a name attribute of 'Name'
        if ($.isEmptyObject(msg) === false) {
            return msg;
        }
    },
    ///<summary>
    /// Validate that the name does not already exist in the collection
    ///<param name="id">id of public image</param>
    ///<param name="name">name of public image</param>
    ///</summary>
    isDuplicateName: function (id, name) {
        var collection = this.collection || [];  // Use the collection of the model if it exists (should be window.publicImages)
        var idx = 0;
        var length = collection.length;
        for (idx; idx < length; idx++) {
            var pi = collection.at(idx);
            if (pi.get('Id') !== id && name.toLowerCase() === pi.get('Name').toLowerCase()) {
                return true;
            }
        }
        return false;
    },
    sync: function (method, model, options) {
        options = options || {};
        var ff = function (qXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(error && error.Message);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.success(result);
            }
        };
        //Create and some update methods are handled via a form post event.
        //Updates here have not file update.
        switch (method) {
            case 'read':
                this.proxy.getPublicImage(this.get('Id'), sf, ff, complete, null, options.headers);
                break;
            case 'update':
                this.proxy.updatePublicImage(this.toJSON(), sf, ff, complete, null, options.headers);
                break;
            case 'delete':
                if (this.get('Id') !== Constants.c.emptyGuid) {
                    this.proxy.deletePublicImage(this.get('Id'), sf, ff, complete, null, options.headers);
                }
                break;
        }
    },
    getRestrictions: function () {
        return {
            fileTypes: ['.png', '.jpg', 'jpeg'],
            fileSize: 5000000
        };
    }
});