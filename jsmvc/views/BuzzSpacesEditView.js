var BuzzSpacesEditView = Backbone.View.extend({
    url: Constants.Url_Base + 'CustomList/GetBuzzSpaceEditor',
    initialize: function (options) {        
        return this;
    },
    render: function () {        
        var iframe = $('<iframe></iframe>').attr('src', this.url).attr('frameborder', 0).attr('id', 'buzzEditorIframe');
        $(this.el).html(iframe);
        this.$el.addClass('fullWidth fullHeight inlineblock');
        return this;
    }
});