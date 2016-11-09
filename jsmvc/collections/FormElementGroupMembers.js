var FormElementGroupMembers = Backbone.Collection.extend({
    model: FormElementGroupMember,
    errorMsg: null,
    getFormElementsInSameGroup: function (formElementId) {
        var fegMember = this.get(formElementId);
        var fegId = fegMember.get('FormElementGroupId');
        var feIds = [];
        var idx = 0;
        var length = this.length;
        for (idx; idx < length; idx++) {
            var member = this.at(idx);
            if (member.get('FormElementGroupId') === fegId) {
                feIds.push(member.get('FormElementId'));
            }
        }
        return feIds;
    }
});