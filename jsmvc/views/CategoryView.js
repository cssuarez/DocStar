var CategoryView = Backbone.View.extend({
    className: '',
    viewData: {},
    events: {},
    initialize: function (options) {
        this.options = options;
        this.compiledTemplate = doT.template(Templates.get('categorylayout'));
        this.className = this.options.className || '';
    },
    getRenderObject: function () {
        // Set the view data for the view here, to be called from render
        var ro = {};
        ro.categoryItems = this.options.categoryItems || [];
        ro.categoryName = this.options.categoryName || '';
        return ro;
    },
    close: function () {
        this.unbind();
        this.remove();
    },
    render: function () {
        this.viewData = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.viewData));
        return this;
    },
    renderThumbnails: function (idx) {
        // Piggy back the loading of thumbnails, so too many requests aren't made at once.
        var $img = $(this.$el.find('img')[idx]);
        var image = new Image();
        var categoryItem = this.viewData.categoryItems[idx];
        if (!categoryItem || !$img.hasClass('throbber')) {
            return;
        }
        var that = this;
        image.onload = function () {
            $img.attr('src', this.src);
            $img.removeClass('throbber');
            that.renderThumbnails(++idx);
        };
        image.src = categoryItem.thumbnailSource;
    }
});