using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.UI.Web.Models;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using System.Collections.ObjectModel;
using Astria.UI.Web.Utility;
using System.Web.Script.Serialization;
using Astria.Framework.DataContracts.V2;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// Controller used to individually manipulating roles
    /// </summary>
    public class RoleController : ControllerBase
    {
        /// <summary>
        /// fetches all groups and users
        /// </summary>
        /// <returns></returns>
        public JsonResult GetAllRoleData()
        {
            var client = SvcBldr.SecurityV2();

            var srRoles = client.GetAllRoles();
            if (srRoles.Error != null)
                return Result(null, srRoles.Error);

            var ldapClient = SvcBldr.LDAPV2();
            var srldaps = ldapClient.GetSlim();
            if (srldaps.Error != null)
                return Result(null, srldaps.Error);
            return Result(new { r = srRoles.Result, l = srldaps.Result }, srldaps.Error, JsonRequestBehavior.AllowGet);
        }
    }
}
