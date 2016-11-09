var LicensesCC = Backbone.Collection.extend({
    model: License,
    url: Constants.Url_Base + "Licensing/GetAllLicenses",
    parse: function (response) {
        if (response.status === "ok") {
            var liststats = {};
            liststats.status = response.status;
            liststats.result = response.result.licStats;
            if (window.licStats) {
                window.licStats.reset(window.licStats.parse(liststats));
            }
            window.provisioningCode = response.result.provisioningCode;
        } else {
            ErrorHandler.addErrors(response.message);
        }
        return [];
    }
});