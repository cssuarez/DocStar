/// Model for CompanyIPMask.cs
var IPMask = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    url: Constants.Url_Base + "IPMask/IPMask"
});