/// <reference path="../LibsExternal/a_jquery.js" />
var CompanyManagement = function () {
    var _instanceIds = [],
   
    runReIndex = function () {
        var selectedCompanies = $('#companies input:checked');
        selectedCompanies.find('.status').html('');
        var length = selectedCompanies.length;
        if (length === 0) {
            alert('No Companies Selected');
            return;
        }
        var i;
        for (i = 0; i < length; i++) {
            _instanceIds.push(selectedCompanies[i].value);
        }

        $('#commands input').attr('disabled', 'disabled');

        reindexCompany();
    },
    reindexCompany = function () {
        if (_instanceIds.length === 0) {
            $('#commands input').removeAttr('disabled');
            alert('ReIndex Complete');
            return;
        }
        var instanceId = _instanceIds.pop();
        $('#' + instanceId).html('ReIndexing');
        $.ajax({
            url: Constants.Url_Base + "Index/ReIndexInstance",
            data: JSON.stringify({ instanceId: instanceId }),
            type: "POST",
            contentType: "application/json",
            success: function (result) {
                if (result.status === 'ok') {
                    checkIndexComplete(instanceId);
                }
                else {
                    $('#' + instanceId).html('Error: ' + result.message);
                    reindexCompany();
                }
            },
            failure: function (xhr, textStatus) {
                $('#' + instanceId).html('Error: ' + textStatus);
                reindexCompany();
            }
        });
    },
     init = function () {
         $(document).on('click', '#reindex', '', runReIndex);
     },
    checkIndexComplete = function (instanceId) {
        var text = $('#' + instanceId).html();
        $('#' + instanceId).html(text + '.');
        $.ajax({
            url: Constants.Url_Base + "Index/GetIndexInfo",
            type: "GET",
            success: function (result) {
                if (result.status === 'ok') {
                    if (result.result['IndexStats:ReIndexing'] === 'False') {
                        $('#' + instanceId).html('ReIndex Complete');
                        reindexCompany();
                    }
                    else {
                        setTimeout(function () { checkIndexComplete(instanceId); }, 4000);
                    }
                }
                else {
                    $('#' + instanceId).html('Error: ' + result.message);
                    reindexCompany();
                }
            },
            failure: function (xhr, textStatus) {
                $('#' + instanceId).html('Error: ' + textStatus);
                reindexCompany();
            }
        });
    };

    return {
        init: init
    };
};