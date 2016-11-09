using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.UI.Web.Models;
using Astria.UI.ServiceInterop;
using Astria.UI.Web.Utility;
using Astria.Framework.DataContracts.V2;
using dc = Astria.Framework.DataContracts;
using Astria.Framework.Utility;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// used for authentication
    /// </summary>
    public class AccountController : ControllerBase
    {
        /// <summary>
        /// constructor
        /// </summary>
        public AccountController() : base(true) { }

        /// <summary>
        /// show the login routine
        /// </summary>
        /// <returns></returns>
        public ActionResult Login()
        {
            var proxyUrl = Functions.GetAuthenticationProxyUrl();
            if (!String.IsNullOrEmpty(proxyUrl))
            {
                return Redirect(proxyUrl);
            }
            var message = "";
            if (Context.Request.QueryString.AllKeys.Contains("message"))
            {
                message = Context.Request.QueryString["message"];
            }
            // SignOutReason needs to be filled out in order to log out a user that currently has a cookie
            SignOutReason = String.IsNullOrEmpty(SignOutReason) ? message : SignOutReason;
            if (base.Authenticated())
                return RedirectToAction("Index", "Home");
            //Always add the auth message header so if we are not on the login page we will be redirected.
            Context.Response.Headers.Add("AuthMessage", String.IsNullOrEmpty(message) ? "login" : message);
            var model = new HomeModel(message);
            model.ServerURI = GetServerURI();
            Response.Cookies.Add(new HttpCookie("ds_cookie", Environment.MachineName));
            return View(model);
        }

        /// <summary>
        /// handle the login post
        /// </summary>
        /// <param name="form"></param>
        /// <returns></returns>
        [HttpPost]
        public JsonResult Login(FormCollection form)
        {
            bool rememberMe = false;
            if (form.AllKeys.Contains("remember_me"))
            {
                //when checkboxes are checked they return a value in the form
                //regardless of what it's value it ("on") this means it is true
                rememberMe = true;
            }
            if (form.AllKeys.Contains("remember_login"))
            {
                HttpCookie remember_login = new HttpCookie("remember_login");
                remember_login.Values.Add("username", form["username"]);
                remember_login.Expires = DateTime.Now.AddYears(1);
                Response.Cookies.Add(remember_login);
            }
            else
            {
                HttpCookie remember_login = new HttpCookie("remember_login");
                remember_login.Expires = DateTime.Now.AddDays(-1);
                Response.Cookies.Add(remember_login);
            }
            return APILogin(form["username"], form["password"], rememberMe, true);
        }

        /// <summary>
        /// Handle Login.
        /// </summary>
        [HttpPost]
        public JsonResult APILogin(string userName, string password, bool rememberMe, bool redirectOnFailure)
        {
            var client = SvcBldr.UserV2();
            var r = client.LogIn(new AuthenticationPackage { Username = userName, Password = password });

            if (r.Error != null)
            {
                return Result(null, r.Error, JsonRequestBehavior.DenyGet, redirectOnFailure);
            }
            if (String.IsNullOrEmpty(r.Result.Token))
            {
                return Result(null, new dc.ExceptionsML() { Message = "token is empty" }, JsonRequestBehavior.DenyGet, redirectOnFailure);
            }

            SignIn(r.Result.Token, r.Result.CurrentUser, rememberMe);
            return Result(r.Result, r.Error, JsonRequestBehavior.DenyGet, redirectOnFailure);
        }

        [HttpPost]
        public JsonResult AuthCookieFromLoginPackage(LogInPackage pkg)
        {
            if (pkg == null || String.IsNullOrWhiteSpace(pkg.Token))
                return Result(null, dc.ExceptionsML.GetExceptionML(new dc.LoginRequiredException("Null Token", dc.LoginRequiredReason.Invalid)));

            SignIn(pkg.Token, pkg.CurrentUser, false);
            return Result(null, null);
        }

        /// <summary>
        /// delete the cookie and redirect the to login page
        /// </summary>
        /// <returns></returns>
        public ActionResult Logout()
        {
            var client = SvcBldr.UserV2();
            client.LogOut();
            SignOut();

            return GetLoginRedirect();
        }
        public ActionResult PasswordExpired()
        {
            try
            {
                var model = new PasswordExpiredModel(SvcBldr);
                model.Token = BaseToken;
                model.ServerURI = GetServerURI();
                if (Context.Request.QueryString.AllKeys.Contains("message"))
                    model.LoginMessage = Context.Request.QueryString["message"];
                else
                    model.LoginMessage = Constants.i18n("loginRequiredReason_PasswordExpired");
                model.InitModel();
                return View(model);
            }
            catch (Exception ex) { return Result(null, Astria.Framework.DataContracts.ExceptionsML.GetExceptionML(ex), JsonRequestBehavior.AllowGet); }

        }

        [HttpPost]
        public JsonResult ResetPassword(string userName, string password, string oldPassword)
        {
            var client = SvcBldr.UserV2();
            var r = client.SetPasswordAndLogin(new PasswordResetPackage { UserName = userName, OldPassword = oldPassword, NewPassword = password });
            if (r.Error != null)
            {
                return Result(null, r.Error, JsonRequestBehavior.DenyGet, false);
            }
            if (String.IsNullOrEmpty(r.Result.Token))
            {
                return Result(null, new dc.ExceptionsML() { Message = "token is empty" }, JsonRequestBehavior.DenyGet, true);
            }
            SignIn(r.Result.Token, r.Result.CurrentUser, true);
            return Result(r.Result, r.Error, JsonRequestBehavior.DenyGet, true);
        }
    }
}
