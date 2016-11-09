// RecordCategory model
var RecordCategory = Backbone.Model.extend({
    dateTimeFields: {},
    idAttribute: 'Id',
    url: Constants.Url_Base + 'RecordsManagement/RecordCategory',
    validate: function (attrs) {
        //validate gets called when updating the model too.  
        var errors = {};
        if (attrs === undefined) {
            return;
        }
        if (attrs.Name === '') {
            errors.Name = Constants.t('nameEmptyWarning');
        }
        if (attrs.Name === Constants.c.newTitle) {
            errors.Name = String.format(Constants.c.newNameWarning, Constants.t('newTitle'));
        }
        if (attrs.dt === 'folder' && attrs.d_folder === '') {
            errors.d_folder = Constants.t('selectFolder');
        }
        if (!attrs.ClassId) {
            errors.ClassId = Constants.t('securityClassRequired');
        }
        if (attrs.Name.length > 64) {
            errors.Name = Constants.c.nameTooLong;
        }
        if (!$.isEmptyObject(errors)) {
            return errors;
        }
        return;
    }
});