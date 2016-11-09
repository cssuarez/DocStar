using Astria.UI.Web.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace Astria.UI.Web.Controllers
{
    public class AdminController : ControllerBase
    {
        public System.Web.Mvc.ActionResult Index()
        {
            var model = new AdminModel(SvcBldr);
            return View(model);
        }


    }
}
