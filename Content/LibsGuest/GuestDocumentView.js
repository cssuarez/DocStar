var GuestDocumentView = DocumentView.extend({
    initialize: function (options) {
        //Hide browse elements that allow show / hide and resizing of the browse panel. This is not allowed in the guest viewer.
        $('#show_hide_panel').hide();
        $('#browse .ui-resizable-handle').hide();
        this.initView(options);
    },
    load: function (options) {
        //Note: Pascal case property changes cause dirty flags to be set, so only set the pascal case if they are a real member of the server side object.
        var mo = {
            Id: options.DocumentVersionId,
            inFormEdit: true,
            guestOptions: options
        };
        this.addRestrictions(mo);
        this.model.set(mo, { silent: true });
        this.model.fetch({ currentPage: options.page });
    },
    addRestrictions: function (mo) {
        mo.restricted = {};
        mo.restricted[Constants.et.Folder] = {};
        mo.restricted[Constants.et.Folder][Constants.sp.Add_To] = true;
        mo.restricted[Constants.et.Folder][Constants.sp.Remove_From] = true;

        mo.restricted[Constants.et.CustomFieldMeta] = {};
        mo.restricted[Constants.et.CustomFieldMeta][Constants.sp.View] = true;

        mo.restricted[Constants.et.ContentType] = {};
        mo.restricted[Constants.et.ContentType][Constants.sp.Modify] = true;

        mo.restricted.recordcategory = {};
        mo.restricted.recordcategory[Constants.sp.Modify] = true;

        mo.restricted.duedate = {};
        mo.restricted.duedate[Constants.sp.Modify] = true;

        mo.restricted.securityclass = {};
        mo.restricted.securityclass[Constants.sp.Modify] = true;

        mo.restricted.inbox = {};
        mo.restricted.inbox[Constants.sp.Modify] = true;

        mo.restricted.savebutton = {};
        mo.restricted.savebutton[Constants.sp.View] = true;

    }
});