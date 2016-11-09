var ImportJobsGridItemView = Backbone.View.extend({
    className: 'ImportJobsGridItemView',
    model: undefined, //ImportJob
    tagName: 'tr',
    events: {
    },
    initialize: function (options) {
        this.compiledTemplate = Templates.getCompiled('importjobsgriditemviewlayout');
        this.listenTo(this.model, 'change', this.render);
    },
    render: function () {
        this.ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.ro));
        this.$el.data('rowid', this.model.get('Id'));
        if (this.model.isSelected()) {
            this.$el.addClass('customGridHighlight');
        } else {
            this.$el.removeClass('customGridHighlight');
        }
        return this;
    },
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    getRenderObject: function () {
        var ro = {
            machineName: this.model.get('MachineName') || '',
            username: this.model.get('Username') || '',
            status: this.model.getStatus() || '',
            percentDone: this.model.get('PercentDone') || '',
            startedOn: this.model.get('StartedOn') || '',
            endedOn: this.model.get('EndedOn') || '',
            failures: this.model.get('Failures') || '',
            results: this.model.get('Results') || '',
            exception: this.model.get('Exception') || ''
        };
        return ro;
    }
});