/// <reference path="../../Content/LibsInternal/ErrorHandler.js" />
var ExportImportManagerView = Backbone.View.extend({

    editView: null,
    initialize: function (options) {
        var that = this;
        this.editView = new ExportImportEditView();
        if (window.exporImportCC === undefined) {
            window.exportImportCC = new ExportImportCC();
        }

        if (window.slimCustomFields === undefined) {
            window.slimCustomFields = new SlimEntities();
        }
        if (window.slimCustomLists === undefined) {
            window.slimCustomLists = new SlimEntities();
        }
        if (window.slimActionLibrary === undefined) {
            window.slimActionLibrary = new SlimEntities();
        }
        if (window.slimDataLinks === undefined) {
            window.slimDataLinks = new SlimEntities();
        }
        if (window.slimCustomFieldGroups === undefined) {
            window.slimCustomFieldGroups = new SlimEntities();
        }
        if (window.slimReports === undefined) {
            window.slimReports = new SlimEntities();
        }
        if (window.slimForms === undefined) {
            window.slimForms = new SlimEntities();
        }
        if (window.slimPublicImages === undefined) {
            window.slimPublicImages = new SlimEntities();
        }

        // Bind collection events
        window.slimInboxes.on("reset", function (from) {
            if (from === 'exportImport') {
                that.updateViews();
            }
        });
        window.slimInboxes.on("add", function () { that.updateViewStay(); });
        window.slimInboxes.on("remove", function () { that.updateViews(); });
        window.exportImportCC.on("refreshAfterImport", function (args) {
            window.Page.refreshCollections(function () {
                that.updateViewStay(args.importJobId);
            });
        });

        this.go();
    },
    go: function () {
        var that = this;
        window.exportImportCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminExportImportManager/gi)) {
                    that.render(window.exportImportCC.errorMsg);
                    that.editView.render();                    
                    $("#admin_screen").scrollTop(0);
                }
            },
            reset: true
        });
    },
    updateViews: function () {
        this.editView.viewData.selected = undefined;
        this.editView.render();
    },
    updateViewStay: function (importJobId) {
        this.editView.render(importJobId);
    },
    render: function (errorMsg) {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        if (errorMsg) {
            ErrorHandler.addErrors(errorMsg);
        }
        return this;
    }
});