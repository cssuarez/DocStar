using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts;
using Astria.UI.Web.Utility;
using Astria.Framework.Utility;
using Astria.Framework.DataContracts.V2;
using Newtonsoft.Json;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// General Admin API 
    /// </summary>
    public class PreferencesController : ControllerBase
    {
        /// <summary>
        /// get system preferences
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetSystemPreferences()
        {
            var clientV2 = SvcBldr.CompanyV2();
            var settings = clientV2.GetMany();
            var sList = new List<CompanySetting>();
            if (settings.Result != null)
            {
                sList = settings.Result.ToList();
                sList.Add(new CompanySetting() { Id = Guid.Empty, Name = Constants.i18n("newTitle"), InstanceId = sList.First().InstanceId, Type = "String", Value = "" });
            }
            return Result(sList, settings.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// 
        /// </summary>
        /// <param name="setting"></param>
        /// <returns></returns>
        public JsonResult SetSystemPreferences(CompanySetting setting)
        {
            var client2 = SvcBldr.CompanyV2();  

            ExceptionsML bizEx = null;
            SR<CompanySetting> existingSetting = null;
            if (setting.Id != Guid.Empty)
            {
                existingSetting = client2.Get(setting.Id);
            }
            if (existingSetting != null && existingSetting.Error != null)
            {
                return Result(null, bizEx);
            }
            if (existingSetting == null)
            {
                setting.Id = Functions.NewSeq();
                existingSetting = client2.Create(setting);
            }
            else
            {
                existingSetting = client2.Update(setting);
            }
            return Result(existingSetting.Result, existingSetting.Error);
        }
        [HttpPost]
        public JsonResult GetImportJobsMachineName()
        {
            var client = SvcBldr.ImportExport();
            var sr = client.GetImportJobsMachineNames();
            if (sr.Error != null)
                return Result(null, sr.Error);

            return Result(sr.Result, sr.Error);

        }
    }
}
