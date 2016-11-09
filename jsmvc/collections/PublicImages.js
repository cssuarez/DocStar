var PublicImages = Backbone.Collection.extend({
    model: PublicImage,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    proxy: FileTransferServiceProxy({ skipStringifyWcf: true }),
    sync: function (method, collection, options) {
        switch (method) {
            case 'read':
                // Add a getter
                break;
        }
    },
    getSelected: function () {
        var idx = 0;
        var length = this.length;
        var model;
        for (idx; idx < length; idx++) {
            if (this.at(idx).get('selected')) {
                model = this.at(idx);
                break;
            }
        }
        return model;
    },
    setSelected: function (modelId, options) {
        this.clearSelected();
        var model = this.get(modelId);
        if (model) {
            model.set('selected', true, options);
        }
    },
    clearSelected: function () {
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            this.at(idx).set('selected', false, { silent: true });
        }
    },
    addNewField: function () {
        this.getNewList(new PublicImage({ Id: Constants.c.emptyGuid, Name: Constants.c.newTitle, FilePath: '' }));
    }
});