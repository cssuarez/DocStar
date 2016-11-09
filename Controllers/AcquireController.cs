using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.UI.Web.Models;
using Astria.UI.Web.Utility;
using Astria.Framework.Utility;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// used for displaying the acquire panel
    /// </summary>
    public class AcquireController : ControllerBase
    {
        /// <summary>
        /// used to display the acquire page
        /// </summary>
        /// <returns></returns>
        public ActionResult Index()
        {
            try
            {
                var model = new AcquireModel(SvcBldr);
                model.Token = BaseToken;
                model.ServerURI = GetServerURI();
                return View("Acquire", model);
            }
            catch (Exception ex) { return Result(null, Astria.Framework.DataContracts.ExceptionsML.GetExceptionML(ex), JsonRequestBehavior.AllowGet); }
        }
        /// <summary>
        /// shows the import frame
        /// </summary>
        /// <returns></returns>
        public ActionResult ImportFrame()
        {
            try
            {
                var model = new AcquireModel(SvcBldr);
                model.Token = BaseToken;
                model.InitModel();
                return View("UploadIFrame", model);
            }
            catch (Exception ex) { return Result(null, Astria.Framework.DataContracts.ExceptionsML.GetExceptionML(ex), JsonRequestBehavior.AllowGet); }
        }
        /// <summary>
        /// handles the file upload display
        /// </summary>
        /// <param name="form"></param>
        /// <returns></returns>
        [HttpPost, ValidateInput(false)]
        public ActionResult UploadFiles(FormCollection form)
        {
            try
            {
                var model = new AcquireModel(SvcBldr);
                model.Token = BaseToken;
                model.InitModel();
                model.Title = form["Title"];
                model.ContentType = form["ContentType"];
                model.Inbox = form["Inbox"];
                model.Workflow = form["Workflow"];
                model.Keywords = form["Keywords"];
                model.SecurityClass = form["SecurityClass"];
                model.Folders = form["Folders"];
                model.IsDraft = form["IsDraft"];
                List<HttpPostedFileBase> files = new List<HttpPostedFileBase>();
                foreach (string item in Context.Request.Files)
                {
                    var file = Context.Request.Files.Get(item);
                    // Throw error if contentlength is zero
                    if (file.ContentLength == 0)
                    {
                        model.Message = String.Format(Constants.i18n("fileNotUploaded"), file.ContentLength, file.FileName);
                        return View("UploadIFrame", model);
                    }
                    files.Add(file);
                }
                model.UploadFiles(files);
                return View("UploadIFrame", model);
            }
            catch (Exception ex) { return Result(null, Astria.Framework.DataContracts.ExceptionsML.GetExceptionML(ex), JsonRequestBehavior.AllowGet); }
        }
    }
}
