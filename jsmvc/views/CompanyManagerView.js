var CompanyManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {

        var that = this;
        this.editView = new CompanyEditView();


        if (window.companies === undefined) {
            window.companies = new Companies();
        }

        window.companies.on("add", function () { that.updateViews(); });
        window.companies.on("reset", function () { that.updateViews(); });

        this.go();
    },

    go: function () {
        var that = this;
        window.companies.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminCompanyManager/gi)) {
                    that.render();
                    that.editView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            reset: true
        });
    },

    updateViews: function () {
        this.editView.viewData.selected = undefined;
        this.editView.render();
    },

    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});