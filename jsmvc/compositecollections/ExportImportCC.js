var ExportImportCC = Backbone.Collection.extend({
    model: SlimEntity,
    url: Constants.Url_Base + "ExportImport/GetAllData",
    parse: function (response) {
        if (response.status === "ok") {
            var listcfs = {};
            listcfs.status = response.status;
            listcfs.result = response.result.cfs;
            window.slimCustomFields.reset(window.slimCustomFields.parse(listcfs), { silent: true });

            var listcfgs = {};
            listcfgs.status = response.status;
            listcfgs.result = response.result.cfgs;
            window.slimCustomFieldGroups.reset(window.slimCustomFieldGroups.parse(listcfgs), { silent: true });

            var listcls = {};
            listcls.status = response.status;
            listcls.result = response.result.cls;
            window.slimCustomLists.reset(window.slimCustomLists.parse(listcls), { silent: true });

            var listActionLibs = {};
            listActionLibs.status = response.status;
            listActionLibs.result = response.result.wfActionLib;
            window.slimActionLibrary.reset(window.slimInboxes.parse(listActionLibs), { silent: true });

            var listdls = {};
            listdls.status = response.status;
            listdls.result = response.result.dls;
            window.slimDataLinks.reset(window.slimInboxes.parse(listdls), { silent: true });

            var listrpts = {};
            listrpts.status = response.status;
            listrpts.result = response.result.rpts;
            window.slimReports.reset(window.slimReports.parse(listrpts), { silent: true });

            var listforms = {};
            listforms.status = response.status;
            listforms.result = response.result.forms;
            window.slimForms.reset(window.slimForms.parse(listforms), { silent: true });

            var listPI = {};
            listPI.status = response.status;
            listPI.result = response.result.publicImages;
            window.slimPublicImages.reset(window.slimPublicImages.parse(listPI), { silent: true });

            window.slimInboxes.trigger('reset', 'exportImport');
            
        } else {
            ErrorHandler.addErrors(response.message);
        }
        return [];
    }
});