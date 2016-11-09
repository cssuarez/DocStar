using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using System.Reflection;
using Astria.Framework.Utility;
using System.IO;
using System.Diagnostics;
using System.Runtime.Caching;
using System.Web.Script.Serialization;
using Newtonsoft.Json;
using System.Net.Mail;
using Astria.UI.Web.Utility;
using System.Text;
using Astria.Framework.OperationContracts;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.DataContracts.V2Extensions;
using Astria.UI.Web.Models;

namespace Astria.UI.Web.Controllers
{
    public class SystemMaintenanceController : ControllerBase
    {
        private static ObjectCache _cache = MemoryCache.Default;
        private const string RESOURCEINFOKEY = "ASTRIA_WEB_RESOURCE_INFO";
        /// <summary>
        /// Gets Resource information about Server and Web dlls.
        /// </summary>
        [HttpGet]
        public System.Web.Mvc.ActionResult GetResourceInfo()
        {
            try
            {
                ExceptionsML bizEx = null;
                List<ResourceInfo> results = GetResourceInfo(ref bizEx);
                return Result(results, bizEx, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
        public ViewResult MonitorHub()
        {
            try
            {
                var client = SvcBldr.UserV2();
                var sr = client.GetCurrent();
                ExceptionsML.Check(sr.Error);
                if (!sr.Result.Flags.HasFlag(UserFlags.SuperAdmin))
                    throw new Exception("Super Admin Permissions Required");
                var model = new ServerUriModel { ServerUri = GetServerURI() };
                return View(model);
            }
            catch (Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
        /// <summary>
        /// Get the path to the client installer
        /// </summary>
        [HttpGet]
        public JsonResult GetClientServiceInstallationPath()
        {
            var client = SvcBldr.SystemMaintenanceV2();
            var sr = client.GetDownloadURI();
            sr.Result += Constants.CLIENTBOOTSTRAPPER;
            return Result(sr.Result, sr.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Sends a message to a designated (web.config) email address with any attachments the user uploaded as well as a zip file of diagnostic information.
        /// </summary>
        [HttpPost]
        public System.Web.Mvc.ActionResult SendHelpMessage(string message, string clientData, string contextURI)
        {
            try
            {
                var adminClient = SvcBldr.AdministrationV2();
                if (!String.IsNullOrEmpty(clientData))
                {
                    var cd = JsonConvert.DeserializeObject(clientData);
                    clientData = JsonConvert.SerializeObject(cd, Formatting.Indented);
                }

                var requestData = new
                {
                    Request.AcceptTypes,
                    Request.ApplicationPath,
                    Browser = new
                    {
                        Request.Browser.Capabilities,
                        Request.Browser.Cookies,
                        Request.Browser.Crawler,
                        Request.Browser.Id,
                        Request.Browser.IsColor,
                        Request.Browser.IsMobileDevice,
                        Request.Browser.JavaApplets,
                        Request.Browser.JScriptVersion,
                        Request.Browser.MaximumHrefLength,
                        Request.Browser.MaximumRenderedPageSize,
                        Request.Browser.MaximumSoftkeyLabelLength,
                        Request.Browser.MobileDeviceManufacturer,
                        Request.Browser.MobileDeviceModel,
                        Request.Browser.Platform,
                        Request.Browser.SupportsXmlHttp,
                        Request.Browser.Version,
                        Request.Browser.W3CDomVersion,
                        Request.Browser.Win32
                    },
                    Request.ContentEncoding,
                    Request.Cookies,
                    Request.HttpMethod,
                    Request.IsAuthenticated,
                    Request.IsLocal,
                    Request.IsSecureConnection,
                    Request.Path,
                    Request.PathInfo,
                    Request.RawUrl,
                    Request.UrlReferrer,
                    Request.UserAgent,
                    Request.UserHostAddress,
                    Request.UserHostName,
                    Request.UserLanguages
                };
                var requestStr = JsonConvert.SerializeObject(requestData, Formatting.Indented);

                var bodyBuilder = new StringBuilder();
                bodyBuilder.AppendLine("<html>");
                bodyBuilder.Append(System.IO.File.ReadAllText(Server.MapPath(Url.Content("~/Content/templates/HelpEmailTemplate.htm"))));
                bodyBuilder.AppendLine("</html>");
                var sr = adminClient.HelpMessage(new HelpMessagePackage { BodyTemplate = bodyBuilder.ToString(), ClientData = clientData, ContextURI = contextURI, Message = message, RequestData = requestStr, WebResourceInfo = GetWebResources() });
                return Result(sr.Result, sr.Error);
            }
            catch (Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
        /// <summary>
        /// Sends a message to a designated (web.config) email address with any attachments the user uploaded as an idea
        /// </summary>
        [HttpPost]
        public System.Web.Mvc.ActionResult SendIdeaMessage(string message, string url)
        {
            try
            {
                var adminClient = SvcBldr.AdministrationV2();

                StringBuilder bodyBuilder = new StringBuilder();
                bodyBuilder.AppendLine("<html>");
                bodyBuilder.Append(System.IO.File.ReadAllText(Server.MapPath(Url.Content("~/Content/templates/IdeaEmailTemplate.htm"))));
                bodyBuilder.AppendLine("</html>");

                var sr = adminClient.IdeaMessage(new IdeaMessagePackage { BodyTemplate = bodyBuilder.ToString(), ContextURI = url, Message = message });
                return Result(sr.Result, sr.Error);
            }
            catch (Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
        /// <summary>
        /// Add Attachment Page.
        /// </summary>
        [HttpGet]
        public System.Web.Mvc.ActionResult AddAttachment()
        {
            try
            {
                var f = SvcBldr.FileTransferV2();
                var sr = f.GetFileInSubDirectory(AstriaCookie.GetUserId().ToString());
                ExceptionsML.Check(sr.Error);
                return View(sr.Result);
            }
            catch (Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
        /// <summary>
        /// Adds an attachment to be set when SendHelpMessage is called.
        /// </summary>
        [HttpPost]
        public System.Web.Mvc.ActionResult AddAttachment(FormCollection form)
        {
            try
            {
                var f = SvcBldr.FileTransferV2();
                foreach (string item in Context.Request.Files)
                {
                    var file = Context.Request.Files.Get(item);
                    if (String.IsNullOrEmpty(file.FileName))
                        continue;

                    f.UploadFile(String.Format(@"{0}\{1}", AstriaCookie.GetUserId(), Path.GetFileName(file.FileName)), file.InputStream);
                }

                var sr = f.GetFileInSubDirectory(AstriaCookie.GetUserId().ToString());
                ExceptionsML.Check(sr.Error);
                return View(sr.Result);
            }
            catch (Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
        /// <summary>
        /// Removes an attachment from a given page.
        /// </summary>
        [HttpPost]
        public System.Web.Mvc.ActionResult RemoveAttachment(string file)
        {
            try
            {
                var f = SvcBldr.FileTransferV2();
                f.DeleteTempFile(String.Format(@"{0}\{1}", AstriaCookie.GetUserId(), file));
                return Result(null, null);
            }
            catch (Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
        /// <summary>
        /// Launches Live Chat
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public System.Web.Mvc.ActionResult LiveChat()
        {
            try
            {
                var companyClient = SvcBldr.CompanyV2();
                var cd = companyClient.GetChatData();
                if (String.IsNullOrEmpty(cd.Result.Channel))
                    cd.Result.Channel = @Functions.GetSetting("ChatChannelId", "716209851");
                if (cd.Result.IsGuest)
                    cd.Result.UserName = "Guest as " + cd.Result.UserName;
                ExceptionsML.Check(cd.Error);
                return View(cd.Result);
            }
            catch (Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
        [HttpGet]
        public System.Web.Mvc.ContentResult WhereAmI()
        {
            var serverName = Environment.MachineName;
            return new ContentResult
            {
                Content = serverName,
                ContentEncoding = Encoding.UTF8,
                ContentType = "text/plain"
            };
        }
        public System.Web.Mvc.JsonResult NotifyProxyChange()
        {
            UpdateProxy();
            return Result(null, null);
        }
        private ResourceInfo GetWebResources()
        {
            if (_cache.Contains(RESOURCEINFOKEY))
                return _cache.Get(RESOURCEINFOKEY) as ResourceInfo;

            string physicalDir = Path.Combine(System.Web.Hosting.HostingEnvironment.ApplicationPhysicalPath, "bin");
            var result = new ResourceInfo();
            result.FillInfo(physicalDir, Assembly.GetExecutingAssembly().Location, Constants.i18n("web"));
            var timeout = Functions.GetSettingInt("versionInfoCacheTime", 24);
            _cache.Add(new CacheItem(RESOURCEINFOKEY, result), new CacheItemPolicy() { AbsoluteExpiration = DateTimeOffset.Now.AddHours(timeout) });

            return result;
        }
        private List<ResourceInfo> GetResourceInfo(ref ExceptionsML bizEx)
        {
            List<ResourceInfo> results = new List<ResourceInfo>();
            var client = SvcBldr.SystemMaintenanceV2();
            var sr = client.GetResourceInfo();
            if (sr.Error != null)
            {
                bizEx = sr.Error;
                return null;
            }
            results.AddRange(sr.Result);
            results.Add(GetWebResources());
            return results;
        }
    }
}
