using System;
using System.Configuration;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using System.Linq;
using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using Astria.UI.ServiceInterop;
using System.Web.Caching;
using System.Collections.Generic;
using Astria.UI.Web.Utility;
using System.Runtime.Caching;
using System.Net;
using System.IO;
using Astria.Framework.DataContracts.V2;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// base
    /// </summary>
    [NoCache]
    public abstract class ControllerBase : Controller
    {
        public static ObjectCache Cache = MemoryCache.Default;
        public ControllerBase() { }
        public ControllerBase(ControllerContext contxt)
        {
            base.ControllerContext = contxt;
        }
        public ControllerBase(bool allowAnonAccess)
        {
            _allowAnonymousAccess = allowAnonAccess;
        }
        bool _allowAnonymousAccess = false;
        HttpContextBase _context = null;
        ServiceBuilder _svcBldr;
        public ServiceBuilder SvcBldr
        {
            get
            {
                if (_svcBldr == null)
                {
                    var ip = GetIP();
                    var server = GetServerURI();
                    _svcBldr = new ServiceBuilder(server, BaseToken, ip, Constants.WEB_TIER_SOURCE);
                }
                return _svcBldr;
            }
        }

        public string SignOutReason { get; set; }
        public bool IsLoggedIn
        {
            get
            {
                if (!String.IsNullOrEmpty(SignOutReason))
                    return false;
                else
                    return !String.IsNullOrWhiteSpace(BaseToken);
            }
        }

        protected string CurrentDomain
        {
            get
            {
                return String.Format("{0}://{1}:{2}",
                    HttpContext.Request.IsSecureConnection ? "https" : "http",
                    HttpContext.Request.ServerVariables["SERVER_NAME"],
                    HttpContext.Request.ServerVariables["SERVER_PORT"]);
            }
        }

        /// <summary>
        /// http context
        /// </summary>
        public HttpContextBase Context
        {
            get
            {
                if (_context == null && ControllerContext != null)
                    _context = ControllerContext.HttpContext;

                return _context;
            }
            set
            {
                _context = value;
            }
        }
        /// <summary>
        /// base token for all controllers
        /// </summary>
        public String BaseToken
        {
            get
            {
                if (String.IsNullOrEmpty(_token))
                {
                    _token = AstriaCookie.GetToken();
                    if (String.IsNullOrWhiteSpace(_token))
                        _token = Request.Headers[Constants.TOKENHEADER];
                }
                return _token;
            }
            set
            {
                _svcBldr = null;
                _token = value;
            }

        }
        string _token = "";

        protected string GetIP()
        {
            if (Request != null)
                return Request.UserHostAddress;
            else
                return string.Empty;
        }

        protected override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            var redirectURL = "";
            AstriaCookie.SetSSLStateCookie(HttpContext.Request.IsSecureConnection);
            var url = filterContext.HttpContext.Request.Url;
            bool requireSSL = GetSSLRequirement();
            bool wasOriginalSSL = AstriaCookie.GetSSLStateValue();
            var baseUrl = Url.Content("~").ToLower();
            if ((requireSSL && !HttpContext.Request.IsSecureConnection))
            {
                redirectURL = url.ToString().ToLower().Replace("http:", "https:");
            }
            else if (!requireSSL && !wasOriginalSSL && HttpContext.Request.IsSecureConnection)
            {
                redirectURL = url.ToString().ToLower().Replace("https:", "http:");
            }
            if (!filterContext.HttpContext.Request.Url.AbsolutePath.StartsWith(baseUrl, StringComparison.CurrentCultureIgnoreCase))
            {
                if (String.IsNullOrEmpty(redirectURL)) redirectURL = url.ToString();

                redirectURL = redirectURL.ToLower().Replace(baseUrl.Substring(0, baseUrl.Length - 1), baseUrl);
            }

            if (!IsLoggedIn && !_allowAnonymousAccess)
                filterContext.Result = GetLoginRedirect(); //Accessing Controllers that do not allow anonymous access.
            if (String.IsNullOrEmpty(redirectURL))
                base.OnActionExecuting(filterContext);
            else
                filterContext.Result = Redirect(redirectURL);
        }

        private bool GetSSLRequirement()
        {
            //If the server doesn't support SSL then the requirement will always be false.
            if (!ServerSupportSSL())
            {
                return false;
            }
            if (IsLoggedIn)
            {
                var userId = AstriaCookie.GetUserId();
                var requireSSL = true;
                try
                {
                    if (userId != Guid.Empty && Cache[userId.ToString()] != null)
                    {
                        return (bool)Cache[userId.ToString()];
                    }
                    else
                    {
                        ExceptionsML bizEx = null;
                        var client = SvcBldr.Company();
                        var settings = client.GetSettingsByName(Constants.REQUIRESSL, out bizEx);
                        if (bizEx == null)
                        {
                            var setting = settings.First();
                            requireSSL = bool.Parse(setting.Value);
                        }
                        else if (bizEx.Type == typeof(LoginRequiredException).ToString())
                        {
                            SignOut(bizEx.Data);
                        }
                    }
                }
                catch { }
                Cache.AddOrGetExisting(userId.ToString(), requireSSL, new CacheItemPolicy() { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(1) });
                return requireSSL;
            }
            else
                return true;
        }

        private bool ServerSupportSSL()
        {
            var forceNonSSLSetting = Functions.GetSetting("ForceNonSSL", "false");
            var forceNonSSL = false;
            Boolean.TryParse(forceNonSSLSetting, out forceNonSSL);
            if (forceNonSSL)
                return false;

            var supportsSSL = Cache["ServerSupportsSSL"];
            if (supportsSSL != null)
                return (bool)supportsSSL;

            lock (Cache)
            {
                supportsSSL = Cache["ServerSupportsSSL"];
                if (supportsSSL != null)
                    return (bool)supportsSSL;

                //You got to ask yourself one question, do you support SSL... well do ya... punk
                try
                {
                    WebClient wc = new WebClient();
                    var url = String.Concat("https://", HttpContext.Request.ServerVariables["SERVER_NAME"], Url.Content("~/Content/Images/transparent.png"));
                    wc.DownloadData(url);
                    supportsSSL = true;
                }
                catch { supportsSSL = false; }
                Cache.AddOrGetExisting("ServerSupportsSSL", supportsSSL, new CacheItemPolicy() { AbsoluteExpiration = DateTimeOffset.Now.AddDays(7) });
            }

            return (bool)supportsSSL;
        }

        /// <summary>
        /// Checks to see if an authentication error has occurred, if so instead of the standard return the login page is displayed.
        /// </summary>
        protected override void OnActionExecuted(ActionExecutedContext filterContext)
        {
            if (String.IsNullOrEmpty(SignOutReason))
            {
                //p3p header to allow IE printing in IFrame (otherwise will not send cookies up with image requests)
                Response.AddHeader("p3p", "CP=\"IDC DSP COR ADM DEVi TAIi PSA PSD IVAi IVDi CONi HIS OUR IND CNT\"");
                base.OnActionExecuted(filterContext);
            }
            else
            {
                FormsAuthentication.SignOut();
                if (Request.RawUrl.IndexOf("Account/Login", StringComparison.CurrentCultureIgnoreCase) == -1)
                    filterContext.Result = GetLoginRedirect();
            }
        }
        /// <summary>
        /// Sign the user into the software and drop a cookie
        /// </summary>
        /// <param name="token"></param>
        /// <param name="user"></param>
        /// <param name="remember_me"></param>
        public void SignIn(string token, User user, bool remember_me)
        {
            var c = System.Web.HttpContext.Current.Cache;
            HttpCookie authCookie = AstriaCookie.GetAuthCookie(token, user.Id, user.Username, remember_me, Functions.GetProxyCookieDomain());
            if (remember_me)
            {
                int auth_t = Functions.GetSettingInt(Constants.SESSION_TIMEOUT_REMEMBER_ME, 8760);//if nothing can be parsed use 1 year in hours
                authCookie.Expires = DateTime.Now.AddHours(auth_t);
            }
            HttpCookie r_cookie = new HttpCookie("remember_me");
            r_cookie.Expires = DateTime.MaxValue;
            r_cookie.Value = remember_me ? "1" : "0";
            Response.Cookies.Add(r_cookie);
            Response.Cookies.Add(authCookie);
            if (c.Get(user.Id.ToString()) != null)
                c.Remove(user.Id.ToString()); //Invalidate an existing cached user login.
        }
        /// <summary>
        /// kill the users cookie
        /// </summary>
        public void SignOut(string signOutReason = "")
        {
            var cached = Cache[AstriaCookie.GetUserId().ToString()];
            if (cached != null)
                Cache.Remove(AstriaCookie.GetUserId().ToString());

            SignOutReason = signOutReason;
            var lrr = LoginRequiredReason.Credentials;
            Enum.TryParse<LoginRequiredReason>(SignOutReason, out lrr);

            if (lrr != LoginRequiredReason.ProxyMoveInProgress) //If a move is in progress do not detroy the login cookie, instead allow the request to be redirected to the auth proxy server where the user will wait until the move has completed.
            {
                FormsAuthentication.SignOut();
                if (Response.Cookies[Constants.AUTH_COOKIE_NAME] != null)
                {
                    Response.Cookies[Constants.AUTH_COOKIE_NAME].Expires = DateTime.Now.AddDays(-1);
                    //You MUST set the domain to update a cookie (even if it is to delete it), a null domain = current domain (ex dev.docstar.com)
                    //If it is not set it will not match the domain in the browser and therefor be ignored (8 hours on this).
                    var domain = Functions.GetProxyCookieDomain();
                    if (!String.IsNullOrEmpty(domain))
                        Response.Cookies[Constants.AUTH_COOKIE_NAME].Domain = domain;
                }
            }
        }
        /// <summary>
        /// get params from the request
        /// </summary>
        /// <param name="key"></param>
        /// <returns></returns>
        protected string GetParam(string key)
        {
            return (Request[key] == null ? string.Empty : Request[key].ToString());
        }
        /// <summary>
        /// Returns a standardized JSON string
        /// </summary>
        /// <param name="result">Any data item to be serialized to JSON</param>
        /// <param name="exception">Business exception (will check for null and return the correct status)</param>
        /// <param name="behavior">Override default JSON get behavior</param>
        /// <param name="redirectOnLoginFailure">redirect on login if there was a failure</param>
        /// <returns></returns>
        public JsonResult Result(object result, ExceptionsML exception, JsonRequestBehavior behavior = JsonRequestBehavior.DenyGet, bool redirectOnLoginFailure = true)
        {
            string status = "ok";
            string message = string.Empty;
            string exceptionType = string.Empty;
            if (exception != null)
            {
                var isLRE = exception.Type == typeof(LoginRequiredException).ToString();
                //Check for Logged out exceptions
                if (redirectOnLoginFailure && isLRE)
                {
                    SignOutReason = exception.Data;
                }
                status = "bad";
                message = exception.Message;
                if (!isLRE && exception.Data != null)
                {
                    if (exception.Data.StartsWith(message))
                        message = exception.Data;
                    else
                        message += Environment.NewLine + exception.Data;
                }
                exceptionType = exception.Type;
            }
            var retObj = new { result = result, status = status, message = message, exceptionType = exceptionType, fullEx = exception };
            return new JsonResultExtended() { Data = retObj };
        }
        /// <summary>
        /// fetch the company instance
        /// </summary>
        /// <returns></returns>
        public List<CompanyInstanceDTO> GetCompanyInstances(out ExceptionsML bizEx)
        {
            bizEx = null;
            if (IsLoggedIn)
            {
                var client = SvcBldr.Hosting();
                var result = client.GetCompaniesForUser(AstriaCookie.GetUserId().ToString(), out bizEx).ToList();
                return result;
            }
            else 
                return new List<CompanyInstanceDTO>();
        }

        internal bool Authenticated()
        {
            if (IsLoggedIn)
                return !String.IsNullOrWhiteSpace(AstriaCookie.GetToken());
            else
                return false;
        }

        protected Guid GetInstanceID()
        {
            var token = new AuthToken();
            var ts = Encryption.Decrypt(AstriaCookie.GetToken());
            token = (AuthToken)token.DeserializeObject(ts);
            return token.InstanceId;
        }

        protected string GetServerURI()
        {
            //The following will be an issue if we separate Server and Web Tiers. Pulling from the config just doesn't work well here since we are all on different hosts and "localhost" will not work under https.
            return Functions.CombineUri(CurrentDomain, Functions.GetSetting(Constants.SERVER_VD, "/FusionServer"));
        }

        protected System.Web.Mvc.ActionResult GetLoginRedirect()
        {
            var proxyUrl = Functions.GetAuthenticationProxyUrl();
            if (String.IsNullOrWhiteSpace(proxyUrl))
            {
                if (String.IsNullOrWhiteSpace(SignOutReason))
                    return RedirectToAction("Login", "Account");
                else
                    return RedirectToAction("Login", "Account", new { message = SignOutReason });
            }

            if (String.IsNullOrWhiteSpace(SignOutReason))
                return Redirect(proxyUrl);
            else
                return Redirect(String.Format("{0}?message={1}", proxyUrl, SignOutReason));
        }

        protected void UpdateProxy()
        {
            try
            {
                var host = Request.Url.Host;
                var proxyUrl = Functions.GetAuthenticationProxyUrl();
                if (!String.IsNullOrEmpty(proxyUrl))
                {
                    var updateUrl = Functions.CombineUri(proxyUrl, "Proxy/ZoneUpdated");
                    using (var wc = new WebClient())
                    {
                        var reqparm = new System.Collections.Specialized.NameValueCollection();
                        reqparm.Add("Host", host);
                        var responsebytes = wc.UploadValues(updateUrl, "POST", reqparm);
                        var responsebody = System.Text.Encoding.UTF8.GetString(responsebytes);
                        if (!String.IsNullOrWhiteSpace(responsebody))
                        {
                            throw new Exception(responsebody);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Functions.WriteToEventLog("Application", Constants.WEB_TIER_SOURCE, ex.ToString());
            }
        }

    }
}