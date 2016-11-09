var CaptureProgressGridItemView = Backbone.View.extend({
    className: 'CaptureProgressGridItemView',
    tagName: 'tr',
    model: undefined, //SimpleDocument
    headers: undefined,
    close: function () {
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    initialize: function (options) {
        this.compiledTemplate = Templates.getCompiled('captureprogressgriditemviewlayout');
        this.headers = options.headers;
        this.listenTo(this.model, 'change', this.modelChanged);
        return this;
    },
    render: function () {
        var ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(ro));

        return this;
    },
    getRenderObject: function () {
        var ro = {
            cells: []
        };
        var progressBarLayout = Templates.getCompiled('progressbarlayout');
        var pbro;
        var cp;
        var i = 0;
        var length = this.headers.length;
        for (i; i < length; i++) {
            var h = this.headers[i];
            switch (h.value) {
                case Constants.c.titleName:
                    ro.cells.push({ value: this.model.get('Title') });
                    break;
                case Constants.c.fileSizeMB:
                    ro.cells.push({ value: this.model.get('FileSize') });
                    break;
                case Constants.c.renderingProgress:
                    pbro = this.model.get('RenderingProgressData') || {};
                    pbro.showProgressCont = 'display: inline-block;';
                    ro.cells.push({ html: progressBarLayout(pbro) });
                    break;
                case Constants.c.mergingProgress:
                    pbro = this.model.get('MergeFilesProgressData') || {};
                    pbro.showProgressCont = 'display: inline-block;';
                    ro.cells.push({ html: progressBarLayout(pbro) });
                    break;
                case Constants.c.blankPageSplitProgress:
                    pbro = this.model.get('SplitOnBlanksProgressData') || {};
                    pbro.showProgressCont = 'display: inline-block;';
                    ro.cells.push({ html: progressBarLayout(pbro) });
                    break;
                case Constants.c.barcodeSplitProgress:
                    pbro = this.model.get('SplitOnBarcodeProgressData') || {};
                    pbro.showProgressCont = 'display: inline-block;';
                    ro.cells.push({ html: progressBarLayout(pbro) });
                    break;                    
            }
        }
        return ro;
    },
    modelChanged: function (m, o) {
        this.render();
    }
});