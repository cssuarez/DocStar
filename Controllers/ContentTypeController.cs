using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts.V2;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using System.Collections.ObjectModel;
using Astria.UI.Web.Utility;
using Newtonsoft.Json;
using Astria.Framework.Datalink;
using Astria.Framework.DataContracts.V2Extensions;
namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// controller for making content types
    /// </summary>
    public class ContentTypeController : ControllerBase
    {
        /// <summary>
        /// Creates a content type with the given name and security class
        /// </summary>
        [HttpPost]
        public JsonResult SimpleCreate(string name, Guid securityClassId)
        {
            var client = SvcBldr.ContentTypeV2();
            var ct = client.Create(new ContentTypePackage
            {
                Id = Functions.NewSeq(),
                Name = name,
                SecurityClassId = securityClassId,
                DefaultSecurityClassId = securityClassId,
                UserPermissions = new EntityPermission[0],
                RolePermissions = new EntityPermission[0]
            });
            return Result(ct.Result, ct.Error);
        }

    }
}
