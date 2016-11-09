var LDAPConnections = Backbone.Collection.extend({
    model: LDAPConnection,
    errorMsg: null,
    comparator: Backbone.Collection.prototype.defaultComparator,
    /// <summary>
    /// Gets the selected model
    /// </summary>
    getSelected: function () {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            if (this.at(i).get('selected')) {
                return this.at(i);
            }
        }
    },
    /// <summary>
    /// Sets the model of the id provided selected property true while setting all other models to false.
    /// </summary>
    setSelected: function (id) {
        var i = 0;
        var length = this.length;
        for (i; i < length; i++) {
            this.at(i).set('selected', this.at(i).get('Id') === id);
        }
    }
});