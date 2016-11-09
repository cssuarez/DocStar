// A manager view for create and edit security class sub-views
// this view creates/fills a collection of security classes if one does not exist
var SecurityClassManagerView = Backbone.View.extend({

    editView: null,
    initialize: function (options) {

        var that = this;
        this.editView = new SecurityClassEditView();        
        if (window.securityClasses === undefined) {
            window.securityClasses = new SecurityClasses();
        }

        // Bind collection events
        window.securityClasses.on("reset", function () {
            that.updateViews();
        });
        window.securityClasses.on("add", function () {
            that.updateViews();
        });
        window.securityClasses.on("remove", function () {
            that.updateViews();
        });

        this.go();
    },

    go: function () {        
        var that = this;
        window.securityClasses.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminSecurityClassManager/gi)) {
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
