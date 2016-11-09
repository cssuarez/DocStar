var Audit = CustomGridItem.extend({
    dateTimeFields: { CreatedOn: true },
    idAttribute: 'Id',
    /// <summary>
    /// Returns JSON objects representing this model with translated values (ActionType, EntityType, and UserName)
    /// </summary>
    getDisplayValues: function (rat, ret) {
        var at = Constants.c['at_' + rat[this.get('ActionType')]];
        if (!at) {
            at = rat[this.get('ActionType')];
        }
        var et = Constants.c['et_' + ret[this.get('EntityType')]];
        if (!et) {
            et = ret[this.get('ActionType')];
        }
        var u = '';
        if (this.get('CreatedBy')) {
            var user = window.users.get(this.get('CreatedBy'));
            if (user) {
                u = user.get('Username');
            }
        }
        if (!u && this.get('UserInfo')) {
            u = $(this.get('UserInfo')).find('Username').text();
        }

        var r = {
            Id: this.get('Id'),
            RowClass: this.isSelected() ? 'customGridHighlight' : '',
            ActionType: at,
            EntityType: et,
            Date: this.get('CreatedOn'),
            Title: this.get('Title') || '',
            Description: this.get('Description') || '',
            Username: u,
            IsGuest: !!this.get('AuthorizedFor'),
            IPAddressStr: this.get('IPAddressStr') || ''
        };
        return r;
    }
});