// DataLinkQuery model
var DataLinkQuery = Backbone.Model.extend({
    dateTimeFields: { Created: true, Modified: true },
    idAttribute: 'Id',
    url: Constants.Url_Base + "DataLink/SetDataLinkQuery"
});