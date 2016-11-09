//This file is appended to the end of the constants file. It reads the base url from the dom to set Url_Base, Server_Url, Login_Url, and Url_Help
var baseUriEl = document.getElementById('BaseURI');
if (baseUriEl) {
    var baseUrl = baseUriEl.value;
    Constants.Url_Base = baseUrl;
    //HelpURI
    var HelpURIEl = document.getElementById('HelpURI');
    if (HelpURIEl) {
        Constants.Url_Help = HelpURIEl.value;
    }
    var loginURIEl = document.getElementById('LoginURI');
    if (loginURIEl) {
        Constants.Login_Url = loginURIEl.value;
    }
    if (!Constants.Login_Url) {
        Constants.Login_Url = baseUrl + 'Account/Login';
    }
    var svrVDEl = document.getElementById('ServerVD');
    if (svrVDEl) {
        var svrVD = svrVDEl.value;
        var url = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + '/';
        Constants.Server_Url = url + svrVD;
    }
}