using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.OperationContracts;
using Astria.Framework.Utility;
using Astria.UI.Web.Utility;
using System.Net;
using System.Web.Script.Serialization;
using System.Text;
namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// Controller for Importing and Exporting Entities from one E3 system/site to another
    /// </summary>
    public class ExportImportController : ControllerBase
    {
        /// <summary>
        /// Gets all data for the Import Export Page.
        /// </summary>
        [HttpGet]
        public JsonResult GetAllData()
        {
            var client = SvcBldr.BulkDataV2();
            var sr = client.GetExportData();
            if (sr.Error != null)
                return Result(null, sr.Error);
            var r = sr.Result;
            return Result(new
            {
                wfs = r.Workflows,
                rcs = r.RecordCategories,
                users = r.Users,
                ibxs = r.Inboxes,
                roles = r.Roles,
                cts = r.ContentTypes,
                scs = r.SecurityClasses,
                cfs = r.CustomFields,
                cls = r.CustomLists,
                dls = r.DatalinkQueries,
                wfActionLib = r.ActionLibrary,
                cfgs = r.CustomFieldGroups,
                rpts = r.Reports,
                forms = r.Forms,
                publicImages = r.PublicImages
            }, null, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Exports selected entities to a manifest.
        /// </summary>
        [HttpPost]
        public JsonResult ExportData(ExportRequest[] exportRequests)
        {
            var ieClient = SvcBldr.ImportExport();
            var sr = ieClient.ExportEntites(new ExportEntitiesPackage() { Requests = exportRequests });
            return Result(sr.Result, sr.Error); // TODO result is no longer just a file name
        }
        /// <summary>
        /// Exports Retreive grid to CSV.
        /// </summary>
        [HttpPost]
        public JsonResult ExportDataToCSV(SearchRequest searchRequest)
        {
            var ieClient = SvcBldr.ImportExport();
            var sr = ieClient.ExportToCSV(searchRequest);
            return Result(sr.Result, sr.Error); // TODO result is no longer just a file name
        }
        /// <summary>
        /// Accepts the post from the Import Frame
        /// Imports data exported from another system.
        /// </summary>
        [HttpPost]
        public System.Web.Mvc.ActionResult UploadFiles(FormCollection form)
        {
            var fileClient = SvcBldr.FileTransferV2();
            var ieClient = SvcBldr.ImportExport();
            var uploadFileName = Functions.NewSeq().ToString() + ".zip";
            foreach (string item in Context.Request.Files)
            {
                var file = Context.Request.Files.Get(item);

                byte[] fs = new byte[file.InputStream.Length];
                file.InputStream.Read(fs, 0, fs.Length);
                RemoteFileHandler.UploadFile(uploadFileName, fs, fileClient);

                break;
            }
            var pkg = new ImportEntitiesPackage
            {
                ZipFile = uploadFileName,
                OverwriteExisting = form["overwrite"] == "on",
                MachineId = Functions.GetMachineId(), // this will be the webServer's machineId; not some client machine
                MachineName = String.Empty       // Let's leave this empty to distinguish EntityExchange jobs from client-initiated jobs
            };
            var sr = ieClient.ImportEntities(pkg);
            // Progress Monitoring done in javascript via CheckImportStatus
            return View("ImportFrame", sr);
        }
        /// <summary>
        /// shows the import frame
        /// </summary>
        /// <returns></returns>
        public System.Web.Mvc.ActionResult ImportFrame()
        {
            ExceptionsML bizEx = null;
            return View(bizEx);
        }

        /// <summary>
        /// Check the status of an import via its Id
        /// </summary>
        /// <param name="importJobId"> id of import job</param>
        /// <returns>Import frame view with status of import</returns>
        public System.Web.Mvc.ActionResult CheckImportStatus(Guid importJobId)
        {
            var ieClient = SvcBldr.ImportExport();
            var sr = ieClient.CheckImportStatus(importJobId);
            return View("ImportStatus", sr);
        }
    }
}
