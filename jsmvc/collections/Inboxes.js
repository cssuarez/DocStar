var Inboxes = Backbone.Collection.extend({
    model: Inbox,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator
});