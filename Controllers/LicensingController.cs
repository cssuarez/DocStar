﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using Astria.Framework.Core.DataContracts;
using Astria.Framework.Hosting.OperationContracts;
using System.Text;
using Astria.UI.Web.Models;
using Astria.UI.Web.Utility;
using Astria.Framework.DataContracts.V2;

namespace Astria.UI.Web.Controllers
{
    public class LicensingController : ControllerBase
    {
        //
        // GET: /Licensing/

        /// <summary>
        /// Retrieves all licenses and tokens for the current company
        /// </summary>
        [HttpGet]
        public JsonResult GetAllLicenses()
        {
            var licClient = SvcBldr.LicenseV2();
            var sr = licClient.GetLicenseUsageStats();
            var pc = sr.Result.SafeAny() ? sr.Result.First().ProvisioningCode : "";
            var results = new { licStats = sr.Result, provisioningCode = pc };
            return Result(results, sr.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// loads the license iframe
        /// </summary>
        /// <returns></returns>
        public System.Web.Mvc.ActionResult LicensingFrame()
        {
            var model = new LicenseModel();
            return View(model);
        }

        /// <summary>
        /// Generates a request file suitable for delivering to the provisioning server
        /// </summary>
        /// <param name="provisioningCode"></param>
        /// <returns></returns>
        public System.Web.Mvc.ActionResult GenerateRequestFile(string provisioningCode)
        {
            var client = SvcBldr.LicenseV2();
            var sr = client.GenerateLicenseRequestFile(provisioningCode);
            if (sr.Error != null)
                throw new Exception(sr.Error.Message);

            return File(Encoding.UTF8.GetBytes(sr.Result), "text/plain", "RequestFile.txt");
        }
        
        /// <summary>
        /// Generates a request to the provisioning server and processes its response
        /// </summary>
        /// <param name="provisioningCode"></param>
        /// <returns></returns>
        [HttpPost]
        public JsonResult UpdateLicenses(string provisioningCode)
        {
            var client = SvcBldr.LicenseV2();
            var sr1 = client.UpdateFromProvisionCode(provisioningCode);
            if (sr1.Error != null)
            {
                return Result(null, sr1.Error);
            }
            var sr2 = client.GetLicenseUsageStats();
            return Result(new { newLics = sr1.Result, newLicStats = sr2.Result }, sr1.Error ?? sr2.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Sets the license for the current company from a response file, which has been generated by the provisioning server
        /// </summary>
        [HttpPost]
        public System.Web.Mvc.ActionResult SetLicenseFromFile(FormCollection form)
        {
            var model = new LicenseModel();
            ExceptionsML bizEx = null;
            try
            {
                SR<License[]> result = null;
                if (Context.Request.Files != null && Context.Request.Files.Count == 1)
                {
                    HttpPostedFileBase file = Context.Request.Files[0];
                    byte[] bytes = new byte[file.ContentLength];
                    file.InputStream.Read(bytes, 0, file.ContentLength);
                    string responseFile = Context.Request.ContentEncoding.GetString(bytes);
                    var client = SvcBldr.LicenseV2();
                    result = client.SetLicenses(responseFile);

                    if (bizEx == null)
                        model.Message = String.Format(Constants.i18n("licensesUpdated"), result.Result.SafeLength());
                    else
                        model.Error = bizEx;  

                }
            }
            catch (Exception ex)
            {
                model.Error = ExceptionsML.GetExceptionML(ex);
            }

            return View("LicensingFrame", model);
        }

    }
}