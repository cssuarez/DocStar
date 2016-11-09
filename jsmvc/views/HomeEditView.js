/// <reference path="../../Content/LibsExternal/a_jquery.js" />
// View for editing Home page
// Renders a compiled template using doU.js
var HomeEditView = Backbone.View.extend({
    viewData: {},
    events: {
    },
    url: Constants.Url_Base + 'CustomList/GetCurrentBuzzSpaces',
    initialize: function (options) {
        return this;
    },
    render: function () {
        if (!$('#buzzIframe').length) {
            var iframe = $('<iframe></iframe>').attr('src', this.url).attr('frameborder', 0).attr('id', 'buzzIframe');
            $(this.el).html(iframe);
        }
        return this;
    }
});
