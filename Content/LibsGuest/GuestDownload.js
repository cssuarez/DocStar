(function (GuestDownload, $) {
    var progressContSelector;
    var successTimeout;
    var loadTimeout;
    var receivedEvents = false;

    var loadedFunc = function () {
        clearTimeout(loadTimeout);
        successTimeout = setTimeout(function () {
            progressContSelector.hide();
            $('#link_downloading').hide();
            $('#link_submitted').hide();
            $('#link_successful').show();
        }, 3000); //Cannot figure out a better solution to this, no good indicator of an iframe downloading a file (load fires way before the file is actually downloaded).
    };
    var progressFunc = function (method, percent) {
        receivedEvents = true;
        if (progressContSelector && method === 'PrepForSend') {
            var progressData = {
                progressText: percent + '%',
                progressIndeterminate: '',
                progressValue: percent,
                progressVisible: 1
            };
            Utility.displayProgress(progressContSelector, progressData);
        }
    };
    var extResultFunc = function (result) {
        window.CompanyInstanceHubProxy.onSendProgress(progressFunc, true);
        window.CompanyInstanceHubProxy.onSendResult(extResultFunc, true);
        if (result.Succeeded) {
            var password = $('#link_pass').val();
            var requestId = getParameterByName("RequestId");
            var instanceId = getParameterByName("InstanceId");
            var zipHref = 'Guest/ProcessDownloadRequestResult?id=' + requestId + '&instanceId=' + instanceId + '&password=' + password + '&fileId=' + result.Result;

            Utility.displayProgress(progressContSelector, { progressIndeterminate: true });
            $('#link_downloading').css('display', 'inline-block');
            $('#link_submitted').hide();
            $('#download').attr('src', zipHref);
            document.getElementById('download').onload = loadedFunc;
            //The following is a workaround for an IE 11 bug: https://connect.microsoft.com/IE/feedback/details/809377/ie-11-load-event-doesnt-fired-for-pdf-in-iframe            
            loadTimeout = setTimeout(loadedFunc, 10000);
        }
        else {
            $('#errors').text(result.Message);
            progressContSelector.hide();
            $('#link_downloading').hide();
            $('#link_submitted').hide();
            $('#link_successful').hide();
            $('#link_pass_label').show();
            $('#link_pass').show();
            $('#link_submit').show();
            $('#download').css('visibility', 'visible');
            $('#download').css('height', '100%');
            $('#download').css('width', '100%');
        }
    };
    var init = function () {
        $('#browse').show();
        $('#main').show();
        progressContSelector = $('.progressCont');
        CompanyInstanceHubProxy.start();
        CompanyInstanceHubProxy.onSendProgress(progressFunc);
        CompanyInstanceHubProxy.onSendResult(extResultFunc);
    };
    var getParameterByName = function (name) {
        var match = new RegExp('[?&]' + name + '=([^&]*)')
                .exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    };
    var submitClick = function (ev, callCount) {
        receivedEvents = false;
        var connId;
        if (window.CompanyInstanceHubProxy && window.CompanyInstanceHubProxy.connection && window.CompanyInstanceHubProxy.connection.id) {
            connId = window.CompanyInstanceHubProxy.connection.id;
        }
        $('#errors').text("");
        var password = $('#link_pass').val();
        var requestId = getParameterByName("RequestId");
        var instanceId = getParameterByName("InstanceId");
        var id = requestId;
        var zipHref;
        if (!requestId || !instanceId) {
            $('#errors').text(Constants.c.invalidGuestDownloadRequest);
        } else if (callCount > 5) {
            //Signal R Just won't connect, make the call the old way:
            zipHref = 'Guest/ProcessDownloadRequest?id=' + id + '&instanceId=' + instanceId + '&password=' + password;
            $('#download').attr('src', zipHref);
            $('#link_pass_label').hide();
            $('#link_pass').hide();
            $('#link_submit').hide();
            $('#download').css('visibility', 'hidden');
            $('#download').css('height', '0');
            $('#download').css('width', '0');
            $('#link_submitted').css('display', 'inline-block');
            Utility.displayProgress(progressContSelector, { progressIndeterminate: true });
            pollForIFrameText(1);
            document.getElementById('download').onload = loadedFunc;
            //The following is a workaround for an IE 11 bug: https://connect.microsoft.com/IE/feedback/details/809377/ie-11-load-event-doesnt-fired-for-pdf-in-iframe            
            loadTimeout = setTimeout(loadedFunc, 10000);

        } else if (!connId) {
            $('#link_pass_label').hide();
            $('#link_pass').hide();
            $('#link_submit').hide();
            $('#link_submitted').css('display', 'inline-block');
            setTimeout(function () { submitClick(ev, callCount ? callCount + 1 : 1); }, 500);

        } else {
            zipHref = 'Guest/ProcessDownloadRequest?id=' + id + '&instanceId=' + instanceId + '&password=' + password + '&connectionId=' + connId;
            $('#download').attr('src', zipHref);
            $('#link_pass_label').hide();
            $('#link_pass').hide();
            $('#link_submit').hide();
            $('#download').css('visibility', 'hidden');
            $('#download').css('height', '0');
            $('#download').css('width', '0');
            $('#link_submitted').css('display', 'inline-block');
            Utility.displayProgress(progressContSelector, { progressIndeterminate: true });
            pollForIFrameText(1);
        }
    };
    var pollForIFrameText = function (timesCalled) {
        //Check the iframe for any reported errors (via the oops page).
        if (!$('#download').attr('src')) {
            return;
        }
        var iframeContent = $('#download').contents();
        if (!iframeContent || iframeContent.length === 0) {
            setTimeout(pollForIFrameText, 1000, timesCalled + 1);
            return;
        }
        var iframeText = iframeContent.find('body')[0].textContent;
        if (iframeText && iframeText.length > 0) {
            var type = iframeContent.find('body').find('#exType').val();
            var msg = iframeContent.find('body').find('#exMessage').val();
            if (type === "ProxyMoveInProgress") {
                $.cookie('destHref', msg, { expires: 1, path: '/', domain: Constants.ProxyCookieDomain });
                window.location.href = Constants.Login_Url;
                return;
            }
            if (successTimeout) {
                clearTimeout(successTimeout);
            }
            if (loadTimeout) {
                clearTimeout(loadTimeout);
            }
            progressContSelector.hide();
            $('#link_downloading').hide();
            $('#link_submitted').hide();
            $('#link_successful').hide();
            $('#link_pass_label').show();
            $('#link_pass').show();
            $('#link_submit').show();
            $('#download').css('visibility', 'visible');
            $('#download').css('height', '100%');
            $('#download').css('width', '100%');
        } else {
            if (!receivedEvents && timesCalled > 10) {
                loadedFunc(); //If we have not recieved events and we have been checking for > 10 seconds then assume we have loaded.
            } else {
                setTimeout(pollForIFrameText, 1000, timesCalled + 1);
            }
        }
    };
    $(document).ready(function () {
        init();
        $('#link_submit').click(submitClick);
        if (getParameterByName('auto') && getParameterByName('auto').toLowerCase() === 'true') {
            $('#link_submit').click();
        }
        $('body').keyup(function (event) {
            if (event.which === 13) {
                $('#link_submit').click();
            }
        });
    });

}(window.GuestDownload = window.GuestDownload || {}, jQuery));

//Dummy Classes required by CompanyInstanceHubProxy.
var Page = {
    authToken: ''
};
var ClientService = {
    connectionStatus: {},
    updateSystrayConnectionStatus: function () { }
};