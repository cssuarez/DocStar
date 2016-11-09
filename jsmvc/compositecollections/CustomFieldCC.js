var CustomFieldCC = Backbone.Collection.extend({
    model: CustomFieldMeta,
    url: Constants.Url_Base + "CustomFieldMeta/GetAllData",
    parse: function (response) {
        if (response.status === "ok") {
            //cls data
            var listcls = {};
            listcls.status = response.status;
            listcls.result = response.result.cls;
            window.customLists.reset(window.customLists.parse(listcls));
            //cfs data
            var listcfs = {};
            listcfs.status = response.status;
            listcfs.result = response.result.cfs;
            window.customFieldMetas.reset(window.customFieldMetas.parse(listcfs), { silent: true });
            //cfg data
            var listcfg = {};
            listcfg.status = response.status;
            listcfg.result = response.result.cfg;
            window.customFieldMetaGroupPackages.reset(window.customFieldMetaGroupPackages.parse(listcfg), { silent: true });

            if (!window.specialNames) {
                var listspecnames = [];
                listspecnames.status = response.status;
                listspecnames.result = response.result.spnms;
                window.specialNames = listspecnames.result;
            }
        } else {
            ErrorHandler.addErrors(response.message);
        }
        return [];
    }
});