using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.Framework.DataContracts;
using System.Web.Mvc;
using System.Runtime.Serialization.Json;
using System.IO;
using System.Text;
using Astria.UI.ServiceInterop;
using Astria.Framework.Utility;
using Astria.Framework.DataContracts.V2;
using System.Runtime.Caching;
using Astria.Framework.Core.DataContracts;

namespace Astria.UI.Web.Models
{
    /// <summary>
    /// base for all models 
    /// </summary>
    public abstract class ModelBase
    {
        /// <summary>
        /// memory cache
        /// </summary>
        public static MemoryCache _baseCache = MemoryCache.Default;
        /// <summary>
        /// userCache name prefix
        /// </summary>
        public static string USERINFO = "userCache_";
        /// <summary>
        /// get/set the token
        /// </summary>
        public string Token { get; set; }
        /// <summary>
        /// validation messages
        /// </summary>
        private ThreadSafeDictionary<string, ExceptionsML> _validationMessages;
        /// <summary>
        /// get/set validation messages
        /// </summary>
        public ThreadSafeDictionary<string, ExceptionsML> ValidationMessages
        {
            get
            {
                if (_validationMessages == null)
                    _validationMessages = new ThreadSafeDictionary<string, ExceptionsML>();

                return _validationMessages;
            }
        }
        /// <summary>
        /// error handler for validation messages
        /// </summary>
        /// <param name="ex"></param>
        /// <param name="businessException"></param>
        /// <returns></returns>
        public bool ErrorHandler(Exception ex = null, ExceptionsML businessException = null)
        {
            var noError = true;
            if (businessException != null)
            {
                if (businessException.Type == typeof(LoginRequiredException).ToString())
                    throw LoginRequiredException.Create((LoginRequiredReason)Enum.Parse(typeof(LoginRequiredReason), businessException.Data));
                else
                {
                    if (ValidationMessages.ContainsKey("Exception"))
                        ValidationMessages["Exception"] = businessException;
                    else
                        ValidationMessages.Add("Exception", businessException);
                }
                noError = false;

            }
            if (ex != null)
            {
                if (ValidationMessages.ContainsKey("Exception"))
                    ValidationMessages["Exception"] = ExceptionsML.GetExceptionML(ex);
                else
                    ValidationMessages.Add("Exception", ExceptionsML.GetExceptionML(ex));

                noError = false;
            }

            return noError;
        }

        public static ServiceBuilder _sb;
        /// <summary>
        /// Gateway permissions of user
        /// </summary>
        public GatewayPermissions Permissions { get; set; }
        /// <summary>
        /// User is a Super admin
        /// </summary>
        public bool IsSuperAdmin { get; set; }
        /// <summary>
        /// User is an Instance admin
        /// </summary>
        public bool IsInstanceAdmin { get; set; }
        /// <summary>
        /// User has a password (not blank)
        /// </summary>
        public bool IsReadOnlyUser { get; set; }
        ///   
        public bool HasPassword { get; set; }
        /// <summary>
        /// Message received from bizEx
        /// </summary>
        public static string Message { get; set; }
        /// <summary>
        /// Server URI
        /// </summary>
        public string ServerURI { get; set; }
        /// <summary>
        /// Load User data for models
        /// </summary>
        public bool RequireNewPassword { get; set; }
        public bool PasswordExpired { get; set; }
        /// <returns></returns>
        public void LoadUserData()
        {
            var key = USERINFO + AstriaCookie.GetUserId().ToString();
            var cachedItem = _baseCache.Get(key) as Object[];
            User user = new User();
            GatewayPermissions gatewayPermissions = GatewayPermissions.NotSet;
            if (cachedItem != null && cachedItem.Length == 2)
            {
                user = cachedItem[0] as User;
                gatewayPermissions = (GatewayPermissions)cachedItem[1];
                HasPassword = user.HasPassword;
                IsSuperAdmin = ((UserFlags)user.Flags).HasFlag(UserFlags.SuperAdmin);
                IsInstanceAdmin = user.InstanceAdmin;
                IsReadOnlyUser = user.ReadOnlyUser;
                Permissions = gatewayPermissions;
                RequireNewPassword = user.RequireNewPassword;
                PasswordExpired = user.PasswordExpired;
            }
        }
        public bool IsLicensed(TokenKey key)
        {
            var licSvc = _sb.LicenseV2();
            var licSR = licSvc.IsLicensed(new LicenseRequest
            {
                Key = key
            });
            return licSR.Result;
        }

        protected Dictionary<string, string> GetCachedViews(string path)
        {
            Dictionary<string, string> views = new Dictionary<string, string>()
            {
#if (!DEBUG)
                {"retrievelayout_html4", ""},
                {"systempreferenceslayout_html4", ""},
                {"approvallayout_html4", ""},
                {"customfieldgroupitemslibrarylayout_html4", ""},
                {"customfieldgroupitemslayout_html4", ""},
                {"annotationlayout_html4", ""},
                {"bookmarkslayout_html4", ""},
                {"emailmenulayout_html4", ""},
                {"pageoptionsmenulayout_html4", ""},
                {"dropdownlayout_html4", ""},
                {"capturelayout_html4", ""},
                {"progressbarlayout_html4", ""},
                {"captureviewerlayout_html4", ""},
                {"systrayconnectionlayout_html4", ""},
                {"guidedhelp_capture_html4", ""},
                {"savedsearchlayout_html4", ""},
                {"watchlayout_html4", ""},
                {"watcheslayout_html4", ""},
                {"inlaycolor_html4", ""},
                {"wfexceptionlayout_html4",""},
                {"dashboardlayout_html4", ""},
                {"workflowlayout_html4", ""},
                {"reportlayout_html4",""},
                {"reportworkslayout_html4",""},
                {"categorylayout_html4",""},
                {"reportsdashboardlayout_html4",""},
                {"reportschedulinglayout_html4",""},
                {"schedulinglayout_html4",""},
                {"reportparameterslayout_html4", ""},
                {"reportparameterslibrarylayout_html4", ""},
                {"contenttypebuilderlayout_html4", ""},
                {"contenttypedefaultslayout_html4", ""},
                {"ctbfieldsettinglayout_html4", ""},
                {"ctbfieldsettingslayout_html4", ""},
                {"formslayout_html4", ""},
                {"formtemplateslayout_html4", ""},
                {"documentviewlayout_html4", ""},
                {"documentmetaviewlayout_html4", ""},
                {"documentmetaapprovalviewlayout_html4", ""},
                {"documentmetafieldsviewlayout_html4", ""},
                {"documentmetafieldviewlayout_html4", ""},
                {"documentmetahistoryviewlayout_html4", ""},
                {"documentmetarelateditemsviewlayout_html4", ""},
                {"documentmetaversioningviewlayout_html4", ""},
                {"documentmetaworkflowviewlayout_html4", ""},
                {"documentviewermenulayout_html4", ""},
                {"documentmetafieldgroupviewlayout_html4", ""},
                {"documentmetafolderviewlayout_html4", ""},
                {"searchviewlayout_html4", ""},
                {"searchcriteriaviewlayout_html4", ""},
                {"SearchResultsGridViewlayout_html4", ""},
                {"searchresultsmenulayout_html4", ""},
                {"fieldedsearchviewlayout_html4", ""},
                {"customfieldvaluelayout_html4", ""},
                {"workflowitemperassigneeviewlayout_html4", "" },
                {"workflowitemperassigneesubgridviewlayout_html4", "" },
                {"workflowitemperstepviewlayout_html4", "" },
                {"categorynavigationlayout_html4", "" },
                {"documentpreviewviewlayout_html4", "" },
                {"documentpagerlayout_html4", "" },
                {"capturegridviewlayout_html4", "" },
                {"captureprogressgridviewlayout_html4", "" },
                {"workflowitemslayout_html4", "" },
                {"approvalrequestitemslayout_html4", "" },
                {"workflowdashboardlayout_html4", "" },
                {"taborderlayout_html4", ""}
#endif
            };
            for (int i = 0; i < views.Count; i++)
            {
                var key = views.Keys.ElementAt(i);
                try
                {
                    views[key] = RenderView(path, String.Format("/Content/templates/{0}.cshtml", key));
                }
                catch (Exception ex)
                {
                    throw new Exception(String.Format("Failed to render view: {0} ({1})", key, ex.Message));
                }
            }
            return views;
        }
        private string RenderView(string path, string viewName)
        {
            string html = _baseCache.Get(viewName) as string;

            if (!String.IsNullOrEmpty(html))
                return html;

            System.Net.ServicePointManager.ServerCertificateValidationCallback = ((sender, certificate, chain, sslPolicyErrors) => true); //Ignore SSL errors.
            var request = System.Net.WebRequest.Create(path + viewName);
            var response = (System.Net.HttpWebResponse)request.GetResponse();
            var dataStream = response.GetResponseStream();
            var reader = new StreamReader(dataStream);
            html = reader.ReadToEnd();
            reader.Close();
            dataStream.Close();
            response.Close();

            _baseCache.AddOrGetExisting(viewName, html, new CacheItemPolicy() { AbsoluteExpiration = DateTimeOffset.Now.AddDays(1) });
            return html;
        }
    }
}