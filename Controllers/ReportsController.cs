using Astria.Framework.DataContracts;
using Astria.Framework.OperationContracts;
using Astria.Framework.Utility;
using Astria.UI.Web.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Web;
using System.Web.Mvc;

namespace Astria.UI.Web.Controllers
{
    public class ReportsController : ControllerBase
    {
        public System.Web.Mvc.ActionResult Index()
        {
            return View();
        }
        [HttpPost]
        public JsonResult GetAxdId()
        {
            try
            {
                return Result(Session.SessionID, null);
            }
            catch (Exception ex) { return Result(null, ExceptionsML.GetExceptionML(ex)); }
        }
    }
}
