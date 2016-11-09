/*<div id="login">
<form id="login_form" action="#" method="post" onkeydown='if(event.keyCode == 13) { Login.DoIt("#login_form", "#authMessage") }'>
    <p id="login_error">
    <ol>
    <li>
        <input id="ssoButton" type="button" value="@Constants.i18n("ssoButton")" onclick="Login.runIntegratedAuthentication();" />
    <li>
        <label for="username">
            @Constants.i18n("username")
        <input type="text" name="username" id="userName" value="@loginvalue" />
    <li>
        <label for="password">
            @Constants.i18n("password")
        <input type="password" name="password" />
    <li>
        <input id="loginButton" type="button" value="@Constants.i18n("login")" onclick="Login.DoIt('#login_form', '#authMessage');" />                            
    <li id="rememberMe">
        <input type="checkbox" @rememberme name="remember_me" title="@Constants.i18n("rememberMe_tt")" />
        <span title="@Constants.i18n("rememberMe_tt")">@Constants.i18n("rememberMe")</span>
    <li id="rememberUsername">
        <input type="checkbox" @rememberlogin name="remember_login" title="@Constants.i18n("rememberUsername_tt")" />
        <span title="@Constants.i18n("rememberUsername_tt")">@Constants.i18n("rememberUsername")</span>
<p id="agreement">
    @Constants.i18n("loginEula") <a target="_blank" href="@Constants.i18n("loginEulaLink")">@Constants.i18n("loginEulaText")</a>
    @Constants.i18n("and") <a target="_blank" href="@Constants.i18n("loginEulaRulesOfUseLink")">@Constants.i18n("loginEulaRulesOfUseText")</a>
<div id="sso_indicator_container">
    <img id="req_throbber" alt="" src="@System.Web.Mvc.UrlHelper.GenerateContentUrl("~/Content/themes/default/throbber.gif", new HttpContextWrapper(HttpContext.Current))" />
    <span>@Constants.i18n("ssoLoginProgress")</span>
    <iframe id="integratedAuthentication" frameborder="0" height="1" width="1" src="about:blank"></iframe>
    */
jQuery(document).ready(function () {
    spyOn(Login, 'redirectAfterLogin').and.callFake(function () {
        $('#authMessage').html("Login was Successfull");
    });
});