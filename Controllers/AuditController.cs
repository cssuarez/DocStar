using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// handle searching the audit table
    /// </summary>
    public class AuditController : ControllerBase
    {
        /// <summary>
        /// Search the audit table with given search terms
        /// </summary>
        [HttpGet]
        public JsonResult Search(string userName, string title, string description, DateTime? startDate,
            DateTime? endDate, ActionType actionType = ActionType.Modified, EntityType entityType = EntityType.All,
            int page = 1, int maxRows = 100, string sidx = "CreatedOn", string sord = "asc")
        {
            var client = SvcBldr.AdministrationV2();

            var r = client.SearchAudit(new AuditSearchCriteria()
            {
                User = userName,
                Title = title,
                Description = description,
                Type = actionType,
                EntityType = entityType,
                StartDate = startDate,
                EndDate = endDate,
                Start = (page - 1) * maxRows,
                MaxRows = maxRows,
                SortBy = sidx,
                SortOrder = sord
            });
            return Result(r.Result, r.Error, JsonRequestBehavior.AllowGet);
        }
    }
}
