using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.Utility;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// Provides basic, non-confidential info to anonymous clients
    /// </summary>
    public class BasicInfoController : ControllerBase
    {
        public BasicInfoController() : base(true) { }

        /// <summary>
        /// ServerURI and other non-confidential info.  This info is available to unauthenticated clients!
        /// NOTE: this info is used by DSLicenseTool.DLL (SmartLink) so don't remove it or change its return format.
        /// </summary>
        /// <returns></returns>
        public JsonResult GetInfo()
        {
            var info = new
            {
                ServerURI = GetServerURI()
            };
            return Result(info, null, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// ServerURI and other non-confidential info.  This info is available to unauthenticated clients!
        /// There is a similar method like this in the Eclipse Proxy.
        /// </summary>
        public System.Web.Mvc.ActionResult GetWebServerData()
        {
            var data = new WebServerData { Proxy = false, MoveInProgress = false, UpdatedToken = null };
            try
            {
                var proxyUrl = Functions.GetAuthenticationProxyUrl();
                if (!String.IsNullOrWhiteSpace(proxyUrl) && !String.IsNullOrWhiteSpace(BaseToken))
                {
                    return Redirect(Functions.CombineUri(proxyUrl, "BasicInfo/GetWebServerData"));
                }
                else
                {
                    data.ZoneUrl = Request.Url.GetLeftPart(UriPartial.Authority) + Request.ApplicationPath;
                    data.ServerUrl = GetServerURI();
                }
            }
            catch(Exception ex)
            {
                data.Exception = ExceptionsML.GetExceptionML(ex);
            }

            return Json(data, JsonRequestBehavior.AllowGet);
        }

    }
}
