/// <reference path="../LibsExternal/a_jquery.js" />
/// <reference path="ClientService.js" />
var BrowserDetect = {
    init: function () {
        this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
        this.version = this.searchVersion(navigator.userAgent)
			|| this.searchVersion(navigator.appVersion)
			|| "an unknown version";
        this.OS = this.searchString(this.dataOS) || "an unknown OS";
    },
    searchString: function (data) {
        var i;
        var length = data.length;
        for (i = 0; i < length; i++) {
            var dataString = data[i].string;
            var dataProp = data[i].prop;
            this.versionSearchString = data[i].versionSearch || data[i].identity;
            if (dataString) {
                if (dataString.indexOf(data[i].subString) !== -1) {
                    return data[i].identity;
                }
            }
            else if (dataProp) {
                return data[i].identity;
            }
        }
    },
    searchVersion: function (dataString) {
        var index = dataString.indexOf(this.versionSearchString);
        if (index === -1) { return; }
        return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
    },
    dataBrowser: [
		{
		    string: navigator.userAgent,
		    subString: "Chrome",
		    identity: "Chrome"
		},
		{
		    string: navigator.userAgent,
		    subString: "OmniWeb",
		    versionSearch: "OmniWeb/",
		    identity: "OmniWeb"
		},
		{
		    string: navigator.vendor,
		    subString: "Apple",
		    identity: "Safari",
		    versionSearch: "Version"
		},
		{
		    prop: window.opera,
		    identity: "Opera"
		},
		{
		    string: navigator.vendor,
		    subString: "iCab",
		    identity: "iCab"
		},
		{
		    string: navigator.vendor,
		    subString: "KDE",
		    identity: "Konqueror"
		},
		{
		    string: navigator.userAgent,
		    subString: "Firefox",
		    identity: "Firefox"
		},
		{
		    string: navigator.vendor,
		    subString: "Camino",
		    identity: "Camino"
		},
		{
		    string: navigator.userAgent,
		    subString: "Netscape",
		    identity: "Netscape"
		},
		{
		    string: navigator.userAgent,
		    subString: "MSIE",
		    identity: "Explorer",
		    versionSearch: "MSIE"
		},
		{
		    string: navigator.userAgent,
		    subString: "Gecko",
		    identity: "Mozilla",
		    versionSearch: "rv"
		},
		{
		    string: navigator.userAgent,
		    subString: "Mozilla",
		    identity: "Netscape",
		    versionSearch: "Mozilla"
		}
    ],
    dataOS: [
		{
		    string: navigator.platform,
		    subString: "Win",
		    identity: "Windows"
		},
		{
		    string: navigator.platform,
		    subString: "Mac",
		    identity: "Mac"
		},
		{
		    string: navigator.userAgent,
		    subString: "iPhone",
		    identity: "iPhone/iPod"
		},
		{
		    string: navigator.platform,
		    subString: "Linux",
		    identity: "Linux"
		}
    ]

};
var Acquire = {
    ctIbxs: {},
    ctWfs: {},
    userChangedInbox: false,
    userChangedWorkflow: false,
    resultreceived: function (msg) {
        if (msg === "") { return; }

        var r = $("#result");
        if (msg === Constants.c.success) {
            $("#fid").val("");
            r.removeClass('error');
            r.css('color', '#000');
            r.text(Constants.c.fileUploaded);
            r.show();
            r.hide(3000);
            $('body').trigger('MassDocumentUpdated'); //Refresh search in case this item should now be in the results.
        }
        else {
            r.addClass('error');
            r.text(msg);
            r.show();
        }
    },
    initIframe: function (message) {
        $('input[name="IframeId"]').val('');
    },
    detectingFunc: function () {
        var detecting = $('#uploadiframe').contents().find('#detectingClient');
        if (detecting.length === 0) {
            setTimeout(Acquire.detectingFunc, 250);
        }
        else {
            detecting.show();
        }
    },
    installLinkFunc: function () {
        var installLink = $('#uploadiframe').contents().find('#clientInstallLink');
        if (installLink.length === 0) {
            setTimeout(Acquire.installLinkFunc, 250);
        }
        else {
            installLink.show();
            installLink.click(function () {
                installLink.addClass('disabled');
                $('#uploadiframe').contents().find('#restartBrowser').show();
            });
        }
    },
    init: function () {
        BrowserDetect.init();
    },
    installStateChanged: function (sender, args) {
        //$('#uploadiframe').contents().find('#detectingClient').hide();
        //$('#uploadiframe').contents().find('#navigatorPluginLink').hide();
        //$('#uploadiframe').contents().find('#clientInstallLink').hide();

        //$('#uploadiframe').contents().find('#navBypass').click(function () {
        //    ClientService.bypassNavigatorInstall = true;
        //});
        //var jsObj = JSON.parse(args.JSonString);
        //var navInst = ClientService.navigatorPluginInstalled();
        //if (jsObj && navInst) {
        //    Acquire.showSilverlight();
        //}
        //else {
        //    if (jsObj) {
        //        $('#uploadiframe').contents().find('#navigatorPluginLink').show();
        //        $('#uploadiframe').contents().find('#navigatorPluginLink').click(function () {
        //            $('#uploadiframe').contents().find('#navigatorPluginLink .custom_button').addClass('disabled');
        //            $('#uploadiframe').contents().find('#restartBrowser').show();
        //        });
        //        setInterval(function () {
        //            var that = this;
        //            if (ClientService.navigatorPluginInstalled()) {
        //                clearInterval(that);
        //                Acquire.installStateChanged(sender, args);
        //            }
        //        }, 1000);
        //    }
        //    else {
        //        $('#uploadiframe').contents().find('#clientInstallLink').show();
        //        $('#uploadiframe').contents().find('#clientInstallLink').click(function () {
        //            $('#uploadiframe').contents().find('#clientInstallLink').addClass('disabled');
        //            $('#uploadiframe').contents().find('#restartBrowser').show();
        //        });
        //        if (ClientService.clientServiceOutOfDate()) {
        //            $('#uploadiframe').contents().find('#clientOutOfDate').show();
        //        }
        //    }
        //    Acquire.hideSilverlight();
        //}
    },
    contentTypeChanged: function () {
        var ctid = $('select[name="ContentType"] option:selected').attr('id');
        if (!Acquire.userChangedInbox) {
            var ibid = Acquire.ctIbxs[ctid];
            if (ibid) {
                $('#' + ibid).attr('selected', 'selected');
            }
            else {
                $('select[name="Inbox"] option[id="' + Constants.c.emptyGuid + '"]').attr('selected', 'selected');
            }
        }
        if (!Acquire.userChangedWorkflow) {
            var wfid = Acquire.ctWfs[ctid];
            if (wfid) {
                $('#' + wfid).attr('selected', 'selected');
            }
            else {
                $('select[name="Workflow"] option[id="' + Constants.c.emptyGuid + '"]').attr('selected', 'selected');
            }
        }
    },
    inboxChanged: function () {
        Acquire.userChangedInbox = true;
    },
    workflowChanged: function () {
        Acquire.userChangedWorkflow = true;
    },
    browserSupportsFileAPI: function () {
        // Check for the various File API support.
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            // Great success! All the File APIs are supported.
            return true;
        }
        return false;
    }
};