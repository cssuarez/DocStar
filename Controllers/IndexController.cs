using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.UI.ServiceInterop;
using Astria.UI.Web.Utility;
using Astria.Framework.Utility;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// Admin panel index controller
    /// </summary>
    public class IndexController : ControllerBase
    {
        //
        // GET: /Index/

        /// <summary>
        /// Retrieves Index Stats for the current context
        /// </summary>
        /// <returns>Dictionary</returns>
        [HttpGet]
        public JsonResult GetIndexInfo()
        {
            var client = SvcBldr.SearchV2();
            var sr = client.GetIndexInfo(false);
            return Result(sr.Result, sr.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Reindexes a particular instance.
        /// </summary>
        [HttpPost]
        public JsonResult ReIndexInstance(string instanceId)
        {
            ExceptionsML bizEx;
            var companyClient = SvcBldr.Company();
            var hostingClient = SvcBldr.Hosting();

            var token = hostingClient.SwitchContext(instanceId, out bizEx);
            if (bizEx != null)
            {
                return Result(null, bizEx, JsonRequestBehavior.AllowGet);
            }

            var authCookie = AstriaCookie.SetToken(token, Functions.GetProxyCookieDomain());
            Response.Cookies.Add(authCookie);

            SvcBldr.Token = token;
            var idxClient = SvcBldr.SearchV2();
            var sr = idxClient.DeleteReIndex();

            return Result(sr.Result, sr.Error, JsonRequestBehavior.AllowGet);
        }
    }
}
