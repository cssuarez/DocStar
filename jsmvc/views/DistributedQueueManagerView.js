var DistributedQueueManagerView = Backbone.View.extend({

    editView: null,

    initialize: function (options) {
        this.editView = new DistributedQueueView();
        if (window.distributedQueues === undefined) {
            window.distributedQueues = new DistributedQueues();
        }
        if (window.companies === undefined) {
            window.companies = new Companies();
        }
        if (window.dqProcessors === undefined) {
            window.dqProcessors = new DistributedQueueProcessors();
        }
        if (window.distributedQueueCC === undefined) {
            window.distributedQueueCC = new DistributedQueueCC();
        } 
        this.go();
    },

    go: function () {
        var that = this;
        window.distributedQueueCC.fetch({
            success: function () {
                if (window.location.hash.match(/#AdminDistributedQueueManager/gi)) {
                    that.render();
                    that.editView.render();
                    ShowHidePanel.toggleAdminScrollbar();
                }
            },
            reset: true
        });
    },

    render: function () {
        $(this.el).html("");
        if (this.editView !== null) {
            $(this.el).append(this.editView.el);
        }
        return this;
    }
});