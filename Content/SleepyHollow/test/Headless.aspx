<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Headless.aspx.cs" Inherits="Astria.UI.Web.Content.SleepyHollow.test.Headless" %>

<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Jasmine Spec Runner v2.0.0</title>
    
    <link rel="shortcut icon" type="image/png" href="lib/jasmine-2.0.0/jasmine_favicon.png">
    <link rel="stylesheet" type="text/css" href="lib/jasmine-2.0.0/jasmine.css">
    
</head>

<body>
    <input type="hidden" id="useSSL" value="<%{ Response.Write(Request.IsSecureConnection.ToString()); }%>" />
    <input type="hidden" id="BaseURI" value="<%{ Response.Write(System.Web.Mvc.UrlHelper.GenerateContentUrl("~", new HttpContextWrapper(HttpContext.Current))); }%>" />
    <input type="hidden" id="LoginURI" value="<%{ Response.Write(Astria.Framework.Utility.Functions.GetAuthenticationProxyUrl()); }%>" />
    <input type="hidden" id="ServerVD" value="<%{ Response.Write(Astria.Framework.Utility.Functions.GetSetting(Astria.Framework.Utility.Constants.SERVER_VD, "/FusionServer")); }%>" />
    
    <script src="https://dev.docstar.com/fusion//defaultjs"></script>
    <script src="lib/require.js"></script>

    <script type="text/javascript" src="lib/jasmine-2.0.0/jasmine.js"></script>
    <script type="text/javascript" src="lib/jasmine-2.0.0/jasmine-html.js"></script>
    <script type="text/javascript" src="lib/jasmine-2.0.0/boot.js"></script>
    <script type="text/javascript" src="spec/UserHelper.js"></script>

    <input type="button" id="jas-start" value="start" onclick="javascript:starter();"/>
    <script>
        var starter = function () {
            require(['spec/UserSpec.js?zz=' + Utility.getCacheBusterStr('test')], function (UserSpec) {
                var loginCreds = {
                    password: "EclipseWelcome123!",
                    rememberMe: false,
                    redirectOnFailure: false,
                    userName: "admin@docstar.com"
                }; 

                $.ajax({
                    url: Constants.Url_Base + "Account/APILogin",
                    type: "post",
                    data: loginCreds,
                    success: function (result, status, jqxhr) {
                        xResult = jqxhr;
                        jasmine.getEnv().execute();

                    },
                    error: function (xhr, status, e) {
                        console.error(xhr);
                    },

                    complete: function (xhr, status) {
                        var message = xhr.getResponseHeader('AuthMessage');
                    }

                });
            });
        }
    </script>
</body>
</html>