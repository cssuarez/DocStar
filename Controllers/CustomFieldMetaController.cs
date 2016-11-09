using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.Utility;
using Astria.UI.ServiceInterop;
using Astria.UI.Web.Utility;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// controller for custom fields
    /// </summary>
    public class CustomFieldMetaController : ControllerBase
    {
        [HttpGet]
        public JsonResult GetAllData()
        {
            var cfClient = SvcBldr.CustomFieldV2();
            var adClient = SvcBldr.AdministrationV2();
            var client = SvcBldr.SearchV2();

            var result = cfClient.GetCustomFields();
            if (result.Error != null)
            {
                return Result(null, result.Error, JsonRequestBehavior.AllowGet);
            }
            var lists = adClient.GetCustomListsSlim();
            if (lists.Error != null)
            {
                return Result(null, lists.Error, JsonRequestBehavior.AllowGet);
            }
            var sr = client.GetFieldNames();
            if (sr.Error != null)
            {
                return Result(null, sr.Error, JsonRequestBehavior.AllowGet);
            }
            var srGroups = cfClient.GetGroups();
            if (srGroups.Error != null)
            {
                return Result(null, srGroups.Error, JsonRequestBehavior.AllowGet);
            }
            var fieldsnames = sr.Result.Where(r => result.Result == null || result.Result.ToList().All(l => l.Name != r)).ToList();
            fieldsnames.AddRange(new List<string>
            {
                "id",
                Constants.CN_ENTITY_ID,
                Constants.DOCTYPE,
                Constants.DOCID,
                Constants.WFDOCID,
                Constants.APPID,
                Constants.SF_TYPE
            });
            return Result(new { cfs = result.Result, cls = lists.Result, cfg = srGroups.Result, spnms = fieldsnames }, null, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Get all custom fields
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetAllCustomFieldMetas()
        {
            var client = SvcBldr.CustomFieldV2();
            var result = client.GetCustomFieldsWithNew();
            return Result(result.Result, result.Error, JsonRequestBehavior.AllowGet);

        }
        /// <summary>
        /// Get custom field meta
        /// </summary>
        /// <param name="Id"></param>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetCustomFieldMeta(Guid Id)
        {
            var client = SvcBldr.CustomFieldV2();
            var result = client.GetCustomField(Id);
            return Result(result.Result, result.Error, JsonRequestBehavior.AllowGet);

        }
    }
}
