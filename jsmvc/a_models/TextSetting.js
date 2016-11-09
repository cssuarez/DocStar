var TextSetting = Backbone.Model.extend({
    rgbRegex: new RegExp(Constants.UtilityConstants.RGB_REGEX, 'i'),
    dateTimeFields: {},
    defaults: {
        'font-family': 'Verdana',
        'font-size': '11px',
        'text-align': 'left',
        'font-style': 'normal',
        'font-weight': 'normal',
        'text-decoration': 'none',
        'color': '#000000'
    },
    // Perform client side validation for models here
    validate: function (attrs) {
        // This function executes when you call model.save()
        // It will return an object with each validation error that may have occurred
        var msg = {};
        // Add validation here for attrs
        // Any error msg should be added to the msg object with a key that matches the name attribute of an html element
        // eg. msg.Name = 'error message', where an html element has a name attribute of 'Name'
        if ($.isEmptyObject(msg) === false) {
            return msg;
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
    getColorAsHex: function () {
        var color = this.get('color');
        if (color.split('#').length > 1) {
            return color;
        }
        var rgb = color.match(this.rgbRegex);
        if (rgb.length > 3) {
            return '#' + parseInt(rgb[1], 10).toString(16) + parseInt(rgb[2], 10).toString(16) + parseInt(rgb[3], 10).toString(16);
        }
        return this.defaults.color;
    },
    getAttributeAsInt: function (attrKey) {
        return parseInt(this.get(attrKey), 10);
    }
});