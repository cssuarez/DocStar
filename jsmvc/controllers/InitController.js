// Provide navigation for the Admin features
var InitRouter = Backbone.Router.extend({
    /*
    * override default initialize to go to the correct panel
    */
    initialize: function (options) {
        //initialize all the backbone controllers here
        var routers = {};
        
        if (!window.isGuest) {
            routers.Home = new HomeRouter();
            routers.Capture = new CaptureRouter();
            routers.Workflow = new WorkflowRouter();
            routers.Reports = new ReportsRouter();
            routers.Forms = new FormsRouter();
            routers.Admin = new AdminRouter();
        }
        routers.Retrieve = new RetrieveRouter();

        Page.routers = routers; // Have a store for our routers
        //attach navigation binders
        var ctrlName;
        for (ctrlName in routers) {
            if (routers.hasOwnProperty(ctrlName)) {
                if (routers[ctrlName].routes !== undefined) {
                    var route;
                    for (route in routers[ctrlName].routes) {//this loop.
                        //bind to all dispatch route calls to show the correct panel.  
                        if (routers[ctrlName].routes.hasOwnProperty(route)) {
                            var func_call = 'show' + ctrlName + 'Panel';
                            var afterRoute = routers[ctrlName].afterRoute;
                            //the problem is that when func is called it evaluates to the last func_call that gets set in this loop.  
                            routers[ctrlName].bind('route:' + routers[ctrlName].routes[route], this.mapToFunc(func_call, afterRoute));
                        }
                    }
                }
            }
        }
        //start history
        Backbone.history.start();
    },

    mapToFunc: function (func_call, afterRoute) {
        return function () {
            Navigation[func_call]();
            Utility.executeCallback(afterRoute);
        };
    }
});
