var CaptureProgressGridView = CustomGridView.extend({
    className: 'CaptureProgressGridView',
    collection: undefined, //SimpleDocuments
    ro: undefined,
    itemViews: undefined,
    resizeMe: true,
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('captureprogressgridviewlayout'));
        this.initializeGrid({});
        this.itemViews = [];
        this.listenTo(this.collection, 'remove', this.collectionRemovedFrom);
        this.listenTo(this.collection, 'add', this.collectionAddedTo);
        this.listenTo(this.collection, 'reset', this.render);
        return this;
    },
    render: function () {
        this.closeItemViews();
        this.ro = this.getRenderObject();
        this.$el.html(this.compiledTemplate(this.ro));
        this.renderGrid();
        this.renderItemViews();
        return this;
    },
    close: function () {
        this.closeItemViews();
        this.remove(); //Removes this from the DOM, and calls stopListening to remove any bound events that has been listenTo'd. 
    },
    closeItemViews: function() {
        var iv = this.itemViews ? this.itemViews.pop() : undefined;
        while (iv) {
            iv.close();
            iv = undefined;
            iv = this.itemViews.pop();
        }
    },
    getRenderObject: function () {
        var ro = {
            headers: []
        };
        ro.headers.push({ value: Constants.c.titleName, style: 'width: 35%;' });
        ro.headers.push({ value: Constants.c.fileSizeMB, style: 'width: 15%;' });
        var ppo = ClientService.preProcessingOptions;
        var captureMethod = Constants.capm;
        var hideMerge = true;
        var hideBlankSplit = true;
        var hideBarcodeSplit = true;
        if (ppo) {
            if (ppo.RemoveBlankPages) {
                hideMerge = false;
            }
            var method = parseInt(ppo.SplitMethod, 10);
            if (method === parseInt(captureMethod.BlankPageSeparator, 10)) {
                hideBlankSplit = false;
                hideMerge = false;
            }
            if (method === parseInt(captureMethod.AnyBarcodeSeparator, 10) ||
                method === parseInt(captureMethod.AnyBarcodeSeparatorAssignContentType, 10) ||
                method === parseInt(captureMethod.SpecificBarcodeSeparator, 10)) {
                hideBarcodeSplit = false;
                hideMerge = false;
            }
        }
        var width = 50;
        var divisor = 1;
        if (!hideMerge) {
            divisor++;
        }
        if (!hideBlankSplit) {
            divisor++;
        }
        if (!hideBarcodeSplit) {
            divisor++;
        }
        width = width / divisor;

        ro.headers.push({ value: Constants.c.renderingProgress, style: 'width: ' + width + '%;' });
        if (!hideMerge) {
            ro.headers.push({ value: Constants.c.mergingProgress, style: 'width: ' + width + '%;' });
        }
        if (!hideBlankSplit) {
            ro.headers.push({ value: Constants.c.blankPageSplitProgress, style: 'width: ' + width + '%;' });
        }
        if (!hideBarcodeSplit) {
            ro.headers.push({ value: Constants.c.barcodeSplitProgress, style: 'width: ' + width + '%;' });
        }

        return ro;
    },
    renderItemViews: function () {
        this.closeItemViews();
        var $container = this.$el.find('.customGridTable tbody');
        $container.empty(); //Remove any other rows left over after the item views are closed.
        var i = 0;
        var length = this.collection.length;
        for (i; i < length; i++) {
            var itemView = new CaptureProgressGridItemView({ model: this.collection.at(i), headers: this.ro.headers });
            $container.append(itemView.render().$el);
            this.itemViews.push(itemView);
        }
        //Append an empty row to the end of the list, this will be used to fill the remaining space.
        var tr = document.createElement('tr');
        tr.setAttribute('class', 'emptyGridRow');
        var td = document.createElement('td');
        td.setAttribute('colspan', this.ro.headers.length + 2);
        tr.appendChild(td);
        $container.append(tr);
    },


    collectionRemovedFrom: function (model, collection, options) {
        var i = 0;
        var length = this.itemViews.length;
        for (i; i < length; i++) {
            if (this.itemViews[i].model === model) {
                this.itemViews[i].close();
                this.itemViews.splice(i, 1);
                break;
            }
        }
    },
    collectionAddedTo: function (model, collection, options) {
        var $emptyRow = this.$el.find('.customGridTable tbody tr.emptyGridRow');
        var itemView = new CaptureProgressGridItemView({ model: model, headers: this.ro.headers });
        $emptyRow.before(itemView.render().$el);
        this.itemViews.push(itemView);
    }
});