// DataLink model (Actually DataLinkConnection model)
var DataLink = Backbone.Model.extend({
    dateTimeFields: { Created: true, Modified: true },
    idAttribute: 'Id',
    url: Constants.Url_Base + "DataLink/SetDataLinkConnection"
});