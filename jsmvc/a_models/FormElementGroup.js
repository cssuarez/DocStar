var FormElementGroup = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    defaults: {
        spacing: NaN, // Initially set to NaN, calculated when dimensions change. modify offset X and offset Y by this value
        RepeatDirection: Constants.rd.Vertically    // vertically or horizontally
    },
    initialize: function (options) {
        if (!this.getRepeatDirection()) {
            this.set('RepeatDirection', Constants.rd.Vertically);
        }
        this.listenTo(this, 'change:RepeatDirection', function (model, value, options) {
            this.updateOffsets();
        });
        this.listenTo(this, 'change:OffsetX', function (model, value, options) {
            this.set('OffsetY', 0, { silent: true });
        });
        this.listenTo(this, 'change:OffsetY', function (model, value, options) {
            this.set('OffsetX', 0, { silent: true });
        });
        this.listenTo(this, 'change:dimensions', function (model, value, options) {
            if (isNaN(this.get('spacing'))) {
                this.updateSpacing(model, value, options);
            }
            this.updateOffsets(model, value, options);
        });
        this.listenTo(this, 'change:spacing', this.updateOffsets);
    },
    proxy: FormsServiceProxy({ skipStringifyWcf: true }),
    // Perform client side validation for models here
    validate: function (attrs) {
        // This function executes when you call model.save()
        // It will return an object with each validation error that may have occurred
        var msgs = {};
        if (isNaN(parseInt(attrs.spacing, 10))) {
            msgs.spacing = Constants.t('invalidValue');
        }
        if (parseInt(attrs.spacing, 10) > parseInt(Constants.IntMax, 10) || parseInt(attrs.spacing, 10) < parseInt(Constants.IntMin, 10)) {
            msgs.spacing = String.format(Constants.c.notavalidnumber, attrs.spacing, Constants.t('spacing'));
        }
        if (isNaN(parseInt(attrs.OffsetX, 10))) {
            msgs.spacing = Constants.t('invalidValue');
        }
        if (parseInt(attrs.OffsetX, 10) > parseInt(Constants.IntMax, 10) || parseInt(attrs.OffsetX, 10) < parseInt(Constants.IntMin, 10)) {
            msgs.spacing = Constants.t('invalidValue');
        }
        if (isNaN(parseInt(attrs.OffsetY, 10))) {
            msgs.spacing = Constants.t('invalidValue');
        }
        if (parseInt(attrs.OffsetY, 10) > parseInt(Constants.IntMax, 10) || parseInt(attrs.OffsetY, 10) < parseInt(Constants.IntMin, 10)) {
            msgs.spacing = Constants.t('invalidValue');
        }
        if (isNaN(parseInt(attrs.MinCount, 10)) || parseInt(attrs.MinCount, 10) < 1) {
            msgs.MinCount = Constants.t('invalidValue');
        }
        if (parseInt(attrs.MinCount, 10) > parseInt(Constants.IntMax, 10) || parseInt(attrs.MinCount, 10) < parseInt(Constants.IntMin, 10)) {
            msgs.MinCount = String.format(Constants.c.notavalidnumber, attrs.MinCount, Constants.t('minCount'));
        }
        if (isNaN(parseInt(attrs.MaxPerPage, 10)) || parseInt(attrs.MaxPerPage, 10) < 1) {
            msgs.MaxPerPage = Constants.t('invalidValue');
        }
        if (parseInt(attrs.MaxPerPage, 10) > parseInt(Constants.IntMax, 10) || parseInt(attrs.MaxPerPage, 10) < parseInt(Constants.IntMin, 10)) {
            msgs.MaxPerPage = String.format(Constants.c.notavalidnumber, attrs.MaxPerPage, Constants.t('maxPerPage'));
        }
        var msg;
        for (msg in msgs) {
            if (msgs.hasOwnProperty(msg)) {
                if (msgs[msg] === Constants.t('invalidValue')) {
                    msgs[msg] = String.format(msgs[msg], msg);
                }
            }
        }
        if ($.isEmptyObject(msgs) === false) {
            return msgs;
        }
    },
    sync: function (method, model, options) {
        switch (method) {
            case 'create':
                // Add a create call
                break;
            case 'update':
                // Add an update call
                break;
            case 'delete':
                // Add a delete call
                break;
        }
    },
    ///<summary>
    /// Returns if the group is selected or not for editing purposes
    ///</summary>
    isSelected: function () {
        return !!this.get('selected');
    },
    ///<summary>
    /// Obtain the 'RepeatDirection' as an integer value
    ///</summary>
    getRepeatDirection: function () {
        return parseInt(this.get('RepeatDirection'), 10);
    },
    ///<summary>
    /// Update the models spacing based on RepeatDirection, offset, and dimensions
    ///</summary>
    updateSpacing: function (model, value, options) {
        var repeat = this.getRepeatDirection();
        var dims = this.get('dimensions');
        if (repeat === Constants.rd.Vertically) {
            this.set('spacing', Math.round(this.get('OffsetY') - dims.height));
        }
        else {
            this.set('spacing', Math.round(this.get('OffsetX') - dims.width));
        }
    },
    ///<summary>
    /// Update the OffsetX or OffsetY based on RepeatDirection, dimensions, and spacing
    ///</summary>
    updateOffsets: function (model, value, options) {
        var repeat = this.getRepeatDirection();
        var spacing = parseInt(this.get('spacing') || 0, 10);
        var dims = this.get('dimensions');
        if (repeat === Constants.rd.Vertically) {
            this.set('OffsetY', Math.round(parseInt(dims.height, 10) + spacing));
        }
        else {
            this.set('OffsetX', Math.round(parseInt(dims.width, 10) + spacing));
        }
    }
});