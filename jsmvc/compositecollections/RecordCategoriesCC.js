var RecordCategoriesCC = Backbone.Collection.extend({
    model: RecordCategory,
    url: Constants.Url_Base + "RecordsManagement/GetAllData",
    parse: function (response) {
        if (response.status === "ok") {
            var listsc = {};
            listsc.status = response.status;
            listsc.result = response.result.sc;
            window.securityClasses.reset(window.securityClasses.parse(listsc), { silent: true });
            /* special case: subset of fields that are of type date */
            window.datefields = response.result.cf;
            var listrf = {};
            listrf.status = response.status;
            listrf.result = response.result.f;
            window.recordfreezes.reset(window.recordfreezes.parse(listrf), { silent: true });            
            var listrcs = {};
            listrcs.status = response.status;
            listrcs.result = response.result.rcs;
            window.recordcategories.reset(window.recordcategories.parse(listrcs));
        } else {
            ErrorHandler.addErrors(response.message);
        }
        return [];
    }
});