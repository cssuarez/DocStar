var FormsCC = Backbone.Collection.extend({
    errorMsg: null,
    proxy: BulkDataServiceProxy({ skipStringifyWcf: true }),
    parse: function (response, options) {
        // Response includes the following items as well as a FormTemplatePackage - which is handled in the fetch success in FormsView
        //cls data
        if (window.customLists === undefined) {
            window.customLists = new CustomLists();
        }
        window.customLists.reset(response.CustomListItems);
        //cfs data
        if (!window.customFieldMetas) {
            window.customFieldMetas = new CustomFieldMetas();
        }
        window.customFieldMetas.reset(response.CustomFields);
        //cfg data
        if (!window.customFieldMetaGroupPackages) {
            window.customFieldMetaGroupPackages = new CustomFieldMetaGroupPackages();
        }
        window.customFieldMetaGroupPackages.reset(response.CustomFieldGroupPackages);
        // public images
        if (!window.publicImages) {
            window.publicImages = new PublicImages();
        }
        window.publicImages.reset(response.PublicImages);
        return response;
    },
    sync: function (method, collection, options) {
        var ff = function (jqXHR, textStatus, error) {
            if (options && options.failure) {
                options.failure(jqXHR, textStatus, error);
            }
        };
        var complete = function () {
            if (options && options.complete) {
                options.complete();
            }
        };
        var sf = function (result) {
            if (options && options.success) {
                options.wait = false;
                options.success(result);
            }
        };
        switch (method) {
            case 'read':
                var formGetArgs = {
                    FormId: options.formId,
                    IncludeElementMarkup: options.includeElementMarkup
                };
                this.proxy.getBulkFormsData(formGetArgs, sf, ff, complete, null, options.headers);
                break;
        }
    }
});