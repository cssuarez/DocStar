var ReportViewer = function () {
    var intervalId;
    var intervalIds = [];  // Used for keeping track of report viewer timers
    var resizing = false;
    var reportParamsLibView;
    var clientConnected = true;
    var reportControlId;
    var customButtonTemplate;
    function initialize(options) {
        reportControlId = options.reportViewerClientId;
        customButtonTemplate = doT.template(Templates.get('reportcustombuttonslayout'));
        // Clear Intervals, that may still be executing
        var length = intervalIds.length;
        var idx;
        for (idx = 0; idx < length; idx++) {
            clearInterval(intervalIds[idx]);
        }
        createCustomToolbarItems();
    }
    function getRenderObject() {
        var ro = {};
        var reportParamData = $(document.getElementById('reportParameterData')).val();
        reportParamData = Utility.tryParseJSON(reportParamData, true);
        ro.parameters = reportParamData || [];
        return ro;
    }
    function render(options) {
        var viewData = getRenderObject();
        if (reportParamsLibView && reportParamsLibView.close) {
            reportParamsLibView.close();
        }
        reportParamsLibView = new ReportParameterLibraryView({
            parameters: viewData.parameters,
            displaySubmit: true
        });
        var $paramContainer = $(document.getElementById('parameterContainer'));
        $paramContainer.append(reportParamsLibView.render().$el);
        intervalId = setInterval(function () {
            resizeReportLayout();
        }, 1000);
        intervalIds.push(intervalId);
        $(window).resize(function (e) {
            if (resizing) {
                return;
            }
            resizing = true;
            var clearFlag = function () {
                resizing = false;
            };
            // Reason for the two set timeouts is: Resizing the report viewer doesn't work properly unless it is done after the resize event is 'completed'
            var resize = function () {
                resizeReportLayout();
                setTimeout(clearFlag, 5);
            };
            setTimeout(resize, 5);
        });
        var $form = $(document.getElementById('reportForm'));
        $form.submit(function () {
            $form.find('.ignore').prop('disabled', true);
        });
        $form.on('click', 'a[target="_top"]', function (ev) {
            var $targ = $(ev.currentTarget);
            var url = $targ.attr('href');
            var hash = url.substr(url.indexOf('#'));
            var fragments = $.url(url).fsegment();
            Utility.navigate(hash, window.parent.Page.routers[fragments[0]], true, false);
            ev.preventDefault();
        });
    }
    function resizeReportLayout() {
        var $reportViewerTable = $(document.getElementById('ReportViewer1_fixedTable'));
        if ($reportViewerTable && $reportViewerTable.length > 0) {
            var $reportViewerTableContents = $reportViewerTable.find('> tbody > tr:last > td:last');
            $reportViewerTableContents.css('max-height', 'none');
            var paramContainerHeight = $(document.getElementById('parameterContainer')).height() || 0;
            var reportDataHeight = $(document.getElementById('reportName')).outerHeight(true) || 0;
            var errorHeight = $(document.getElementById('Error')).height() || 0;
            var totalHeight = document.documentElement.clientHeight;
            var viewerHeight = totalHeight - paramContainerHeight - reportDataHeight - errorHeight - 55;
            $reportViewerTable.height(viewerHeight);
            $reportViewerTableContents.height(viewerHeight);
            $reportViewerTableContents.find('> div').css('max-height', viewerHeight + 'px');
            clearInterval(intervalId);
        }
    }
    function createCustomToolbarItems() {
        addInToolbarItems();
        bindToolbarEvents();
        pollForChange();
    }
    function addInToolbarItems() {
        if ($('#customPrintReport').length === 0) {
            var toolbarContainerId = '#' + reportControlId + '_ctl05:last-child';
            var tb = $(toolbarContainerId);
            var cbuttons = customButtonTemplate({});
            tb.children().append(cbuttons);
        }
    }
    function bindToolbarEvents() {
        $('#reportForm').off('click', '#customPrintReport').on('click', '#customPrintReport', printReport);
        $('#reportForm').off('click', '#customEmailReport').on('click', '#customEmailReport', emailReport);
    }
    function pollForChange() {
        var f = function () {
            //Refresh report destroys the report and in the process our custom buttons, this will detect and re-add.
            addInToolbarItems();

            var cc = false;
            if (window.parent && window.parent.ClientService) {
                cc = window.parent.ClientService.isSystrayConnected();
            }
            if (cc !== clientConnected) {
                if (!cc) {
                    $('.requiresClientConnection').hide();
                }
                else {
                    $('.requiresClientConnection').show();
                }
                clientConnected = cc;
            }

        };
        var id = setInterval(f, 500);
        intervalIds.push(id);
        f();
    }
    function printReport() {
        var $button = $('#customPrintReport span');
        if ($button.hasClass('throbber')) {
            return;
        }
        $button.removeClass();
        $button.addClass('throbber');

        var cf = function () {
            $button.removeClass();
            $button.addClass('sPngIB print_Icon');
        };
        exportToServer(function (axdId, exportUrlBase) {
            var ff = function (errorThrown) {
                cf();
                var msg = errorThrown && errorThrown.Exception ? errorThrown.Exception.Message : '';
                ErrorHandler.addErrors(msg);
            };
            var method = Constants.im.DownloadAndPrint;
            var iMP = window.parent.ClientService.setupInvokeMethod(method, [axdId, exportUrlBase], cf, ff);
            window.parent.window.CompanyInstanceHubProxy.invokeMethod(iMP);
        }, cf);
    }
    function emailReport() {
        var $button = $('#customEmailReport span');
        if ($button.hasClass('throbber')) {
            return;
        }
        $button.removeClass();
        $button.addClass('throbber');

        var cf = function () {
            $button.removeClass();
            $button.addClass('sPngIB email_Icon');
        };
        exportToServer(function (axdId, exportUrlBase) {
            var ff = function (errorThrown) {
                cf();
                var msg = errorThrown && errorThrown.Exception ? errorThrown.Exception.Message : '';
                ErrorHandler.addErrors(msg);
            };
            var method = Constants.im.DownloadAndEmail;
            var reportName = $('#reportName').text();
            var args = [];
            args.push(axdId);
            args.push(exportUrlBase);
            args.push(reportName);
            args.push(JSON.stringify({ Subject: reportName }));
            var iMP = window.parent.ClientService.setupInvokeMethod(method, args, cf, ff);
            window.parent.window.CompanyInstanceHubProxy.invokeMethod(iMP);
        }, cf);
    }
    function exportToServer(successFunc, failureFunction) {
        var reportCtrl = $find(reportControlId);
        if (reportCtrl) {
            var internalViewer = reportCtrl._getInternalViewer();
            var exportUrlBase = internalViewer.ExportUrlBase + "PDF";

            $.ajax({
                url: Constants.Url_Base + "Reports/GetAxdId",
                type: "POST",
                contentType: "application/json",
                success: function (result) {
                    if (result.status === 'ok') {
                        successFunc(result.result, exportUrlBase);
                    }
                    else {
                        failureFunction();
                        ErrorHandler.addErrors(result.message);
                    }
                },
                failure: function (xhr, textStatus) {
                    failureFunction();
                    ErrorHandler.addErrors(textStatus);
                }
            });
        }
    }

    return {
        getParameterLibraryView: function () {
            return reportParamsLibView;
        },
        initialize: function (options) {
            initialize(options);
        },
        render: function (options) {
            render(options);
        },
        resizeReportLayout: function () {
            resizeReportLayout();
        }
    };
};