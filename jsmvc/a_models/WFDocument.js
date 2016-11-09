var WFDocument = Backbone.Model.extend({
    dateTimeFields: { Started: true, Completed: true, AssignedOn: true },
    idAttribute: 'Id'
});