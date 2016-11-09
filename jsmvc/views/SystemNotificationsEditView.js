/// <reference path="TinyMCEJScripts/jquery.tinymce.js" />
var SystemNotificationsEditView = Backbone.View.extend({
    url: Constants.Url_Base + 'SystemNotifications/GetSystemNotificationsEditor',
    viewData: {},
    initialize: function (options) {
    
    },
    render: function () {
        var iframe = $('<iframe></iframe>').attr('src', this.url).attr('frameborder', 0).attr('id', 'buzzEditorIframe');
        $(this.el).html(iframe);
        this.$el.addClass('fullWidth fullHeight inlineblock');
        return this;
    }    
});
