// Provide navigation for the Capture features
var CaptureRouter = Backbone.Router.extend({
    editView: null,
    // Routes for Capture
    routes: {
        'Capture': 'capturePanel',
        'Capture/:machineId': 'kioskCapture'
    },
    initialize: function () {
        this.editView = new CaptureEditView();
        $('#capture_tab_panel').html(this.editView.$el);
    },
    /*
    * show capture panel template
    */
    capturePanel: function () {
        this.onNavigate("capture");
        this.editView.render();
    },
    kioskCapture: function (machineId) {
        window.kioskMachineId = machineId;        
        this.capturePanel();
    }

});
