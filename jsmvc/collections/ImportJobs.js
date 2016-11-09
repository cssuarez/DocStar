var ImportJobs = CustomGridItems.extend({
    model: ImportJob,
    /// <summary>
    /// Shows the errors of the import job in a dialog
    /// </summary>
    showErrors: function (dialogFunc, id) {
        var model = this.get(id);
        var index = this.indexOf(model);
        if (!model) {
            return;
        }
        var that = this;
        dialogFunc({
            html: model.get('Exception') || Constants.c.noErrorImportJob,
            title: Constants.c.exception,
            viewNext: function () {
                index++;
                if (index >= that.length) { index = 0; }
                that.setSelected([that.at(index).get('Id')]);
                that.showErrors(dialogFunc, that.at(index).get('Id'));
            },
            viewPrevious: function () {
                index--;
                if (index < 0) { index = that.length - 1; }
                that.setSelected([that.at(index).get('Id')]);
                that.showErrors(dialogFunc, that.at(index).get('Id'));
            }
        });
    },
    /// <summary>
    /// Shows the details of the import job in a dialog
    /// </summary>
    showResults: function (dialogFunc, id) {
        var model = this.get(id);
        var index = this.indexOf(model);
        if (!model) {
            return;
        }
        var that = this;
        var results = this.parseToTable(model.get('Results'));
        dialogFunc({
            html: results,
            title: Constants.c.results,
            viewNext: function () {
                index++;
                if (index >= that.length) { index = 0; }
                that.setSelected([that.at(index).get('Id')]);
                that.showResults(dialogFunc, that.at(index).get('Id'));
            },
            viewPrevious: function () {
                index--;
                if (index < 0) { index = that.length - 1; }
                that.setSelected([that.at(index).get('Id')]);
                that.showResults(dialogFunc, that.at(index).get('Id'));
            }
        });

    },
    /// <summary>
    /// Parses the results JSON string into a HTML table for viewing in a dialog
    /// </summary>
    parseToTable: function (json) {
        //var text = '';
        if (json) {
            json = json.replace('&nbsp;', '');
        }
        var json_parsed = $.parseJSON(json);
        var u;
        var value = '<table>';
        for (u in json_parsed) {
            if (json_parsed.hasOwnProperty(u)) {
                value = value + '<tr><td valign="top"><b>' + u + '</b><td><td></td><br>';
                if (json_parsed.hasOwnProperty(u)) {
                    value = value + '<td></td><td>';
                    var v;
                    for (v in json_parsed[u]) {
                        if (json_parsed[u].hasOwnProperty(v)) {
                            value = value + ' ' + v + ':' + json_parsed[u][v] + '<br>';
                        }
                    }
                    value = value + '</td>';
                    //text = text + ' ' + u + ' : ' + json_parsed[u].Document + ' ' + Constants.c.documents + '<br>';
                }
            }
        }
        value = value + '</table>';
        return value;
    }
});