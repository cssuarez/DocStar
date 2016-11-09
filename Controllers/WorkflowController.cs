using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.UI.Web.Utility;
using Components.Workflow;
using Astria.Framework.Utility;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// Used for workflow
    /// </summary>
    public class WorkflowController : ControllerBase
    {
        /// <summary>
        /// View for the Dashboard
        /// </summary>
        /// <returns></returns>
        public ViewResult Index()
        {
            return View();
        }
    }
}