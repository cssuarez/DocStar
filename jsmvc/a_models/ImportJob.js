var ImportJob = CustomGridItem.extend({
    dateTimeFields: { StartedOn: true, EndedOn: true },
    idAttribute: 'Id',
    /// <summary>
    /// Returns a translated version of the status.
    /// </summary>
    getStatus: function () {
        if (!window.importJobStatusLookup) {
            window.importJobStatusLookup = {};

            var status;
            var IJS = Constants.ijs;
            for (status in IJS) {
                if (IJS.hasOwnProperty(status)) {
                    var text = Constants.c['ijs_' + status];
                    if (text) {
                        window.importJobStatusLookup[IJS[status]] = text;
                    }
                }
            }
        }

        return window.importJobStatusLookup[this.get('Status')];
    }
});