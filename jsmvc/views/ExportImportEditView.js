/// <reference path="../../Content/LibsInternal/DTO.js" />
/// <reference path="../../Content/LibsExternal/a_jquery.js" />
/// <reference path="../../Content/LibsInternal/ErrorHandler.js" />
var ExportImportEditView = Backbone.View.extend({
    viewData: {},
    events: {
        "click #beginExport": "exportEntities",
        "click #exportSelectFolder": "addToFolder",
        "click #exportRemoveFolder": "removeFolder"
    },
    unselectAll: function () {
        $('#exportImport_layout .exportSelection input[type="checkbox"][value="selectAll"]').removeAttr('checked');
    },
    closeDialog: function () {
        $('#exportImportProgress.ui-dialog-content').dialog('close');
        DialogsUtil.isDialogInstanceDestroyDialog($('#exportImportProgress.ui-dialog-content'));
        $('#beginExport').removeAttr('disabled');
    },
    exportEntities: function () {
        var that = this,
            exportRequests = [];
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        $('#exportImport_layout .exportSelection input:checked').each(function () {
            var entityType = $(this).val();
            var exportRequest = DTO.getDTO('#export' + entityType);
            exportRequests.push(exportRequest);
        });
        if (exportRequests.length === 0) {
            ErrorHandler.addErrors(Constants.c.noExportSelection, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'input', 'save_cl');
            return;
        }
        $('#beginExport').attr('disabled', 'disabled');
        $('#exportImportProgress').dialog();
        $('#exportImportProgress .exportInProgress').show();
        $('#exportImportProgress .exportComplete').hide();
        var tmp = [];
        $.map(exportRequests, function (o) {
            if (!$.isEmptyObject(o)) {
                tmp.push(o);
            }
        });
        var globalAntiBlur = true;
        $('#exportImportProgress a').hover(
            function () { globalAntiBlur = false; },
            function () { globalAntiBlur = true; }
        );
        $('#exportImportProgress.ui-dialog-content').parent().off().focus().on('blur', function () {
            if (globalAntiBlur) {
                setTimeout(function () {
                    that.closeDialog();
                }, 200);
            }
        });

        $('#exportImportProgress a').off('click').on('click', function () {
            that.closeDialog();
        });
        exportRequests = tmp;

        var totalIdsExported = 0;
        var i = 0;
        if (exportRequests) {
            for (i = 0; i < exportRequests.length; i++) {
                totalIdsExported += exportRequests[i].ItemIds.length;
            }
        }
        if (totalIdsExported === 0) {
            ErrorHandler.addErrors(Constants.c.noExportSelection, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'input', 'save_cl');
            that.closeDialog();
            return;
        }


        $.ajax({
            // TODO eliminate call to controller ; go straight to server
            url: Constants.Url_Base + "ExportImport/ExportData",
            data: JSON.stringify({ exportRequests: exportRequests }),
            type: "POST",
            contentType: "application/json",
            success: function (result) {
                $('#beginExport').removeAttr('disabled');
                if (result.status !== 'ok') {
                    that.closeDialog();
                    ErrorHandler.addErrors(result.message, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'input', 'save_cl');
                }
                else if (result.result.ErrorList === null) {

                    $('#exportImportProgress a').attr('href', Constants.Server_Url + '/GetFile.ashx?functionName=DownloadResult&exportResult=' + result.result.Filename);
                    $('#exportImportProgress .exportInProgress').hide();
                    $('#exportImportProgress .exportComplete').show();
                }
                else if (result.result.ErrorList.length > 0) {
                    var errorInHTML = that.createErrorMessage(result.result.ErrorList);
                    that.closeDialog();
                    ErrorHandler.addErrors(errorInHTML, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'input', 'save_cl');

                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                that.closeDialog();
                ErrorHandler.addErrors(errorThrown, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, 'input', 'save_cl');
            }
        });
    },
    removeFolder: function () {
        $('#export' + Constants.et.Folder + ' select[name="ItemIds"] option:selected').remove();
        //unselect the folders checkbox...this means nothing is selected.         
            $('#exportImport_layout .exportSelection input[value="' + Constants.et.Folder + '"]').removeAttr('checked');        
        this.unselectAll();
        this.updateAllFoldersMsg();
    },
    addToFolder: function () {
        DialogsUtil.folderSelection(false, false, '', this.openFolderCallback, this, { multi: true, removeClearBtn: true });
    },
    openFolderCallback: function (btnText, uiState, folders) {
        switch (btnText) {
            case Constants.c.ok:
                ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                // upon ok in dialog (before close check to see if user has add_to perms on that folder)
                var length = folders.length;
                var i = 0;
                var j = 0;
                var selector = '.exportSelection input[value="1024"]';
                $(selector).prop('checked', true);
                for (i = 0; i < length; i++) {
                    var fid = folders[i].id;
                    var fpath = folders[i].path;
                    var target = $('#export' + Constants.et.Folder + ' select[name="ItemIds"]');
                    var options = target.find('option');
                    var optLen = options.length;
                    var present = false;
                    for (j = 0; j < optLen; j++) {
                        var option = $(options[j]);
                        if (option.val() === fid) {
                            present = true;
                            break;
                        }
                    }
                    if (!present) {
                        target.append($('<option selected="selected"></option').val(fid).text(fpath));
                    }
                    uiState.handleOptClicks({ target: target.find('option[value="' + fid + '"]').get(0) });
                }
                uiState.updateAllFoldersMsg();
                break;
            default:
        }
    },
    initialize: function (options) {
        this.compiledTemplate = doT.template(Templates.get('exportimportlayout'));
        return this;
    },
    handleInputClicks: function (e) {
        var id = $(e.target).val(),
            isChecked = $(e.target).is(':checked'),
            checkbox = '#exportImport_layout .exportSelection input[type="checkbox"]';

        if (id === 'selectAll') {
            if (isChecked) {
                $.map($(checkbox), function (value) {
                    $(value).prop('checked', true);
                    e.data.that.selectOne(parseInt($(value).val(), 10));
                });
            } else {
                $.map($(checkbox), function (value) {
                    $(value).prop('checked',false);
                    e.data.that.unselectOne(parseInt($(value).val(), 10));
                });
            }
            return;
        }
        var selectAll = $(checkbox + '[value="selectAll"]');
        if (!isChecked && selectAll.length > 0) {
            e.data.that.unselectAll();
        }
        var id_int = parseInt(id, 10);
        if (isChecked) {
            e.data.that.selectOne(id_int);
        } else {
            e.data.that.unselectOne(id_int);
        }
    },
    handleOptClicks: function (e) {
        var target = $(e.target);
        var sibling_id = $(target).siblings('input').val();
        var toggle = false;
        var untoggle = false;
        if ($(target).children().is(':selected')) {
            toggle = true;
        } else {
            untoggle = true;
        }
        if ((untoggle || toggle) && sibling_id) {
            var selector = '.exportSelection input[value="' + sibling_id + '"]';
            if (toggle) {
                $(selector).prop('checked', true);
            } else if (untoggle) {
                $(selector).removeAttr('checked');
                e.data.that.unselectAll();
            }
        }
    },
    selectOne: function (id) {
        $('#export' + id + ' option').attr('selected', 'selected');
        $('#export' + id + ' input[type="checkbox"]').attr('checked', 'checked');
        this.updateAllFoldersMsg();
    },
    unselectOne: function (id) {
        $('#export' + id + ' option').removeAttr('selected');
        $('#export' + id + ' input[type="checkbox"]').removeAttr('checked');
        this.unselectAll();
        this.updateAllFoldersMsg();
    },
    render: function (importJobId) {
        var html_data = this.compiledTemplate(this.viewData);
        $(this.el).html(html_data);
        this.delegateEvents(this.events);
        $('#exportTabs').tabs();
        $('#exportImport_layout .exportSelection input[type="checkbox"]').on('click', { that: this }, this.handleInputClicks);
        $('#exportImport_layout #exportTabs select').on('change', { that: this }, this.handleOptClicks);
        $('#chkSubFolders').on('click', this.updateAllFoldersMsg);
        //Coming from a successful import job, get its details to be displayed to the user
        if (importJobId) {
            var that = this;
            var ijSvc = ImportExportServiceProxy();
            ijSvc.getImportJob(importJobId, function (importJob) {
                that.displayImportJobResultDetails(importJob);
            },
            function (jqXHR, textStatus, errorThrown) {
                ErrorHandler.addErrors(errorThrown);
            });
        }
        return this;
    },
    updateAllFoldersMsg: function () {
        if ($('#chkFolder').is(':checked') && $('#exportFolderList option').length === 0 && $('#chkSubFolders').is(':checked')) {
            $('#allfolders').show();
            $('#exportFolderList').hide();
        }
        else {
            $('#allfolders').hide();
            $('#exportFolderList').show();
        }
    },
    createErrorMessage: function (data) {
        var length = data.length;
        var retVal = '';
        var RowsHtml = "";
        if (length > 0) {
            for (i = 0; i < length ; i++) {
                var rowHtml = "<tr><td>" + data[i].EntityType + "</td>"
                              + "<td>" + data[i].EntityName + "</td>"
                              + "<td>" + data[i].ErrorMessage + "</td></tr>";
                RowsHtml = RowsHtml + rowHtml;
            }
            var table = "<table border=1><tr><th style='width:100px;'>" + Constants.c.entityType + "</th>" +
                        "<th style='width:100px;'>" + Constants.c.entityName + "</th>" +
                        "<th style='width:200px;'>" + Constants.c.error + "</th></tr>" + RowsHtml + "<table>";
            retVal = table;
        }
        return retVal;
    },
    displayImportJobResultDetails: function (importJob) {
        var results = JSON.parse(importJob.Results);
        var item;
        var container = $(this.el).find('#importResults');
        var list = container.find('table');
        container.show();
        if (results.Creates) {
            for (item in results.Creates) {
                if (results.Creates.hasOwnProperty(item)) {
                    list.append(this.createResultEntry(Constants.c["et_" + item] + " " + Constants.c.created, results.Creates[item]));
                }
            }
        }
        if (results.Updates) {
            for (item in results.Updates) {
                if (results.Updates.hasOwnProperty(item)) {
                    list.append(this.createResultEntry(Constants.c["et_" + item] + " " + Constants.c.updated, results.Updates[item]));
                }
            }
        }
        if (results.Warnings) {
            for (item in results.Warnings) {
                if (results.Warnings.hasOwnProperty(item)) {
                    var i = 0;
                    var length = results.Warnings[item].length;
                    for (i; i < length; i++) {
                        list.append(this.createResultEntry(Constants.c["et_" + item] + " " + Constants.c.warning, results.Warnings[item][i]));
                    }
                }
            }

        }
    },
    createResultEntry: function (labelVal, val) {
        var tr = document.createElement("tr");
        var ltd = document.createElement("td");
        var vtd = document.createElement("td");
        ltd.setAttribute('style', "width: 130px");
        ltd.innerHTML = labelVal;
        vtd.innerHTML = val;
        tr.appendChild(ltd);
        tr.appendChild(vtd);
        return tr;
    }
});