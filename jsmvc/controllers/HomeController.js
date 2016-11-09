// Provide navigation for the Home features
var HomeRouter = Backbone.Router.extend({

    homeManagerView: null,

    /*
    * Routes for home
    */

    routes: {
        "Home": "homePanel",
        "Home/IntegrationException": "exceptionHomePanel"
    },

    /*
    * show homepage data
    */
    homePanel: function () {
        /* eventually show buzz space and homepage links */
        this.onNavigate("home");
        if (this.homeManagerView === null) {
            this.homeManagerView = new HomeManagerView({
                el: "#home_tab_panel"
            });
        }
    },
    companyInstances: function () {
        /* get the list of all company instances  */

    },
    exceptionHomePanel: function () {
        this.homePanel();
        $('#appIntegration_error').dialog({
            resizable: false,
            width: 'auto',
            maxWidth: $(window).width(),
            height: 100,
            maxHeight: $(window).height(),
            modal: true,
            buttons: [{
                text: Constants.c.close,
                click: function () {
                    $(this).dialog('close');
                }
            }]
        });
    }
});
