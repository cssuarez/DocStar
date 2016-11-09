using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Caching;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.Annotation;
using Astria.Framework.OperationContracts;
using Astria.Framework.Utility;
using Astria.UI.Web.Utility;
using Newtonsoft.Json;
using Astria.Framework.DataContracts.V2;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// Provides all Annotations Editing support
    /// </summary>
    public class AnnotationsController : ControllerBase, IImageStampProvider
    {
        private static ObjectCache _cache = MemoryCache.Default;
        private IAnnotationsProvider _annoEngine;
        private IAnnotationsProvider AnnoEngine
        {
            get
            {
                if (_annoEngine == null)
                {
                    string key = string.Concat(AstriaCookie.GetToken(), "AnnoEngine");
                    _annoEngine = _cache[key] as IAnnotationsProvider;
                    if (_annoEngine == null)
                    {
                        _annoEngine = Astria.Framework.Imaging.Factory.GetAnnotationsProvider();
                        _cache.Add(key, _annoEngine, new CacheItemPolicy() { SlidingExpiration = TimeSpan.FromMinutes(5) });
                    }
                }
                return _annoEngine;
            }
        }

        #region Annotations Placement Support
        /// <summary>
        /// Obtain xml for Annotations and/or Redactions
        /// </summary>
        /// <param name="jsAnnotations">stringified redactions object</param>
        /// <param name="jsRedactions">stringified annotations Mark[] object</param>
        /// <returns></returns>
        [HttpPost]
        public JsonResult GetXML(string jsAnnotations, string jsRedactions)
        {
            ExceptionsML bizEx = null;
            object marks = null;
            object redactions = null;
            if (!string.IsNullOrEmpty(jsAnnotations))
            {
                marks = SetMarks(jsAnnotations, ref bizEx);
            }
            if (bizEx == null && !string.IsNullOrEmpty(jsRedactions))
            {
                redactions = SetRedactions(jsRedactions, ref bizEx);
            }
            var result = new { marks, redactions };
            return Result(result, bizEx);
        }
        /// <summary>
        /// Returns RedactionsXML string and object collection for redactions.
        /// Somewhere herein, real values are rounded to integers as necessary.
        /// </summary>
        /// <param name="jsRedactions">stringified redaction objects</param>
        private object SetRedactions(string jsRedactions, ref ExceptionsML bizEx)
        {
            string redactionsXML = null;
            List<Redaction> redactions = new List<Redaction>();
            if (!string.IsNullOrEmpty(jsRedactions))
            {
                try
                {
                    redactions = Redaction.JsonDeserializeList(jsRedactions);
                    redactionsXML = XmlSerializerExtension.XmlSerialize<List<Redaction>>(redactions);
                }
                catch (Exception ex)
                {
                    bizEx = ExceptionsML.GetExceptionML(ex);
                }
            }
            var result = new { redactionsXML, redactions };
            return result;
        }
        /// <summary>
        /// Returns AnnotationsXML string and object collection for annotations.
        /// Somewhere herein, real values are rounded to integers as necessary.
        /// </summary>
        /// <param name="jsAnnotations">stringified annotation (mark) objects</param>
        /// <param name="bizEx"></param>
        private object SetMarks(string jsAnnotations, ref ExceptionsML bizEx)
        {
            string marksXML = null;
            List<Mark> marks = new List<Mark>();
            if (!string.IsNullOrEmpty(jsAnnotations))
            {
                try
                {
                    marks = Mark.JsonDeserializeList(jsAnnotations);
                    marksXML = XmlSerializerExtension.XmlSerialize<List<Mark>>(marks);
                }
                catch (Exception ex)
                {
                    bizEx = ExceptionsML.GetExceptionML(ex);
                }
            }
            var result = new { marksXML, marks };
            return result;
        }
        /// <summary>
        /// Returns a floating PNG rendering of a single annotation
        /// </summary>
        /// <param name="jsAnnotation">one stringified annotation (mark)</param>
        /// <param name="dpi">optional, specifies dpi of target image for font scaling</param>
        [HttpGet]
        public System.Web.Mvc.ActionResult GetAnnotationPng(string jsAnnotation, int? dpi)
        {
            byte[] png = null;
            try
            {
                Mark mark = Mark.JsonDeserialize(jsAnnotation);
                png = AnnoEngine.MarkToPng(mark, this, dpi);
            }
            catch (Exception ex)
            {
                string key = string.Concat(AstriaCookie.GetToken(), "AnnoEngine");
                _cache.Remove(key);
                png = StandardResult.CreateBitmapImage(ExceptionsML.GetExceptionML(ex).Message);
            }
            return File(png, "image/png");
        }
        /// <summary>
        /// Gets default new mark of any type
        /// </summary>
        /// <param name="type"></param>
        /// <returns>null if type doesn't exist or is not yet supported</returns>
        [HttpGet]
        public JsonResult NewMark(MarkType type) // TODO 12156 efficiency; this could be eliminated from this controller and, instead of called on each need, default values of all mark types could be included in initial page load
        {
            return Result(Mark.CreateNew(type), null);
        }
        /// <summary>
        /// Returns a Mark object the the markXML found in a text stamp
        /// </summary>
        /// <param name="markXML">markXML property of an AnnoStampDTO</param>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetMarkFromMarkXML(string markXML)
        {
            var decodedXML = Uri.UnescapeDataString(markXML);
            ExceptionsML bizEx = null;
            Mark mark = null;
            if (!string.IsNullOrEmpty(markXML))
            {
                try
                {
                    mark = XmlSerializerExtension.XmlDeserialize<Mark>(decodedXML);
                }
                catch (Exception ex)
                {
                    bizEx = ExceptionsML.GetExceptionML(ex);
                }
            }
            return Result(mark, bizEx);
        }

        /// <summary>
        /// Gets a single Png containing all thumbnails (icons) of all "text" stamps available to the current user
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public System.Web.Mvc.ActionResult GetStampsSprite(bool imageStamps)
        {
            var client = SvcBldr.StampsV2();
            byte[] png = null;
            try
            {
                var sr = client.GetAllForUser(new AnnoStampGetPackage { IncludeAdmin = true, IncludeImage = imageStamps, IncludeDeleted = false });
                ExceptionsML.Check(sr.Error);
                var iStamps = imageStamps ? sr.Result.ImageStamps.Cast<IStamp>() : sr.Result.TextStamps.Cast<IStamp>();
                png = AnnoEngine.GetSpriteSheet(iStamps.ToList());
            }
            catch (Exception ex)
            {
                string key = string.Concat(AstriaCookie.GetToken(), "AnnoEngine");
                _cache.Remove(key);
                png = StandardResult.CreateBitmapImage(ExceptionsML.GetExceptionML(ex).Message);
            }
            return File(png, "image/png");
        }
        /* no longer used
        /// <summary>
        /// Returns all stamps, text and image, available to this user, including admin-owned (public) ones
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetAllStamps()
        {
            ExceptionsML bizEx = null;
            var allStamps = GetStamps(true, true, true, true, out bizEx);
            return Result(allStamps, bizEx, JsonRequestBehavior.AllowGet);
        }
        */
        #endregion

        /// <summary>
        /// Get a new redaction
        /// </summary>
        /// <param name="Rectangle">optionally set the size of the redaction</param>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetNewRedaction(Rectangle Rectangle = null)
        {
            ExceptionsML bizEx = null;
            var redaction = new Redaction();
            if (Rectangle != null)
            {
                redaction = new Redaction(Rectangle);
            }
            return Result(redaction, bizEx, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Gets text and/or image stamps from admin or for current user
        /// </summary>
        /// <param name="forUser">if true, gets stamps visible to current user; otherwise gets stamps for admin</param>
        /// <param name="includeOther">if forUser is true, gets Admin (public) stamps too; if forUser is false, gets stamps for admin and ALL users</param>
        /// <param name="includeText">include text stamps</param>
        /// <param name="includeImage">include image stamps</param>
        /// <param name="bizEx"></param>
        /// <returns></returns>
        private StampsCollection GetStamps(bool forUser, bool includeOther, bool includeText, bool includeImage, out ExceptionsML bizEx)
        {
            var client = SvcBldr.StampsV2();
            bizEx = null;
            StampsCollection stamps = null;
            var pkg = new AnnoStampGetPackage { IncludeImage = includeImage, IncludeAdmin = includeOther };
            if (forUser)
            {
                var sr = client.GetAllForUser(pkg);
                bizEx = sr.Error;
                stamps = sr.Result;
            }
            else
            {
                var sr = client.GetAll(pkg);
                bizEx = sr.Error;
                stamps = sr.Result;
            }
            if (stamps == null)
                stamps = new StampsCollection { ImageStamps = new AnnoImageStamp[0], TextStamps = new AnnoStamp[0] }; // to avoid need for null check in caller
            return stamps;
        }

        #region Stamp Maintenance
        /* obsolete
        /// <summary>
        /// Returns user's text stamps (for editing)
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetUserTextStamps()
        {
            ExceptionsML bizEx = null;
            var allStamps = GetStamps(true, false, true, false, out bizEx);
            return Result(allStamps.TextStamps, bizEx, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Returns user's image stamps (for editing)
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetUserImageStamps()
        {
            ExceptionsML bizEx = null;
            var allStamps = GetStamps(true, false, false, true, out bizEx);
            return Result(allStamps.ImageStamps, bizEx, JsonRequestBehavior.AllowGet);
        }
        */
        /// <summary>
        /// Creates or Updates a Text (or other non-image) Stamp from XML or JSON mark data
        /// Note that all of the user's (or the admin's) stamps will be resequenced as 1, 2, 3, .... N
        /// </summary>
        /// <param name="stamp">stamp data, optionally including XML</param>
        /// <param name="jsAnnotation">if specified, defines mark details, overriding stamp.MarkXML</param>
        /// <returns></returns>
        [HttpPost]
        public JsonResult SetTextStamp(AnnoStamp stamp, string jsAnnotation)
        {
            try
            {
                var client = SvcBldr.StampsV2();
                if (jsAnnotation != null)
                {
                    Mark mark = Mark.JsonDeserialize(jsAnnotation);
                    stamp.MarkXML = XmlSerializerExtension.XmlSerialize<Mark>(mark);
                }
                if (stamp.Id == Guid.Empty)
                {
                    var r = client.CreateTextStamp(stamp);
                    return Result(r.Result, r.Error);
                }
                else
                {
                    var r = client.UpdateTextStamp(stamp);
                    return Result(stamp, r.Error);
                }
            }
            catch (Exception ex)
            {
                return Result(stamp, ExceptionsML.GetExceptionML(ex));
            }
            
        }
        /// <summary>
        /// If .Image is null (as it will be when called via web), updates only metadata for an existing image stamp.
        /// But if .Image is not null and the stamp exists, the original is soft deleted and a new stamp is created.
        /// Note that all of the user's (or the admin's) stamps will be resequenced as 1, 2, 3, .... N
        /// </summary>
        /// <param name="stamp"></param>
        /// <returns></returns>
        [HttpPost]
        public JsonResult SetImageStamp(AnnoImageStamp stamp)
        {
            var client = SvcBldr.StampsV2();
            if (stamp.Id == Guid.Empty)
            {
                return Result(null, ExceptionsML.GetExceptionML(new InvalidOperationException("Set Image Stamp not supported. Use UploadImageStamp")));
            }
            var r = client.UpdateImageStamp(stamp);
            return Result(stamp, r.Error);
        }
        /* no longer used
        /// <summary>
        /// Deletes stamp and resequences the remaining ones for its owner 
        /// </summary>
        [HttpPost]
        public JsonResult DeleteTextStamp(Guid id)
        {
            var client = SvcBldr.StampsV2();
            var sr = client.DeleteTextStamp(id);
            return Result(null, sr.Error);
        }
        /// <summary>
        /// "Soft" deletes stamp and resequences the remaining ones for its owner.  Stamp remains in DB in case there
        /// are any references to it.
        /// </summary>
        [HttpPost]
        public JsonResult DeleteImageStamp(Guid id)
        {
            var client = SvcBldr.StampsV2();
            var sr = client.DeleteImageStamp(id);
            return Result(null, sr.Error);
        }
        */
        #endregion

        #region Special PIA stuff for Image Stamp Editing
        /*
        /// <summary>
        /// Returns the image file for an Image Stamp
        /// </summary>
        [HttpGet]
        public System.Web.Mvc.ActionResult GetImageStampImage(String imgId)
        {
            byte[] result = null;
            string mimeType = "image/png";
            try
            {
                var client = SvcBldr.StampsV2();
                var sr = client.GetImageStamp(new Guid(imgId));
                ExceptionsML.Check(sr.Error);
                result = sr.Result.Image;
                switch (sr.Result.FileType)
                {
                    case ImageTypes.png: // we're good
                        break;
                    case ImageTypes.jpeg:
                        mimeType = "image/jpeg";
                        break;
                    default:
                        throw new Exception(Constants.i18n("annoNotFound_T", sr.Result.FileType));
                }
            }
            catch (Exception ex)
            {
                result = StandardResult.CreateBitmapImage(ex.Message);
            }

            return File(result, mimeType);
        }
        */
        public System.Web.Mvc.ActionResult ImageStampFrame()
        {
            try
            {
                return View();
            }
            catch (Exception ex) { return Result(null, Astria.Framework.DataContracts.ExceptionsML.GetExceptionML(ex), JsonRequestBehavior.AllowGet); }
        }
        [HttpPost, ValidateInput(false)]
        public System.Web.Mvc.ActionResult UploadImageStamp(FormCollection form)
        {
            try
            {
                ExceptionsML bizEx = null;
                if (Context.Request.Files != null && Context.Request.Files.Count > 0)
                {
                    HttpPostedFileBase file = Context.Request.Files[0];
                    var stamp = new AnnoImageStamp();
                    stamp.Image = new Byte[file.ContentLength];
                    file.InputStream.Read(stamp.Image, 0, file.ContentLength);
                    stamp.Name = form["Name"];
                    Guid id = Guid.Empty;
                    if (Guid.TryParse(form["Id"], out id))
                        stamp.Id = id;
                    int seq = 0;
                    if (int.TryParse(form["Sequence"], out seq))
                        stamp.Sequence = seq;
                    if (form["Admin"] != "true")
                        stamp.Owner = AstriaCookie.GetUserId();

                    var client = SvcBldr.StampsV2();
                    var result = client.CreateImageStamp(stamp);
                    bizEx = result.Error;
                }
                return View("ImageStampFrame", bizEx);
            }
            catch (Exception ex)
            {
                return View("ImageStampFrame", ExceptionsML.GetExceptionML(ex));
            }
        }
        #endregion

        #region IImageStampProvider
        private Dictionary<Guid, Approval> _approvalsCache;
        private Dictionary<Guid, Approval> ApprovalsCache
        {
            get
            {
                if (_approvalsCache == null)
                {
                    string key = string.Concat(AstriaCookie.GetToken(), "ApprovalsCache");
                    _approvalsCache = (Dictionary<Guid, Approval>)_cache[key];
                }
                return _approvalsCache;
            }
            set
            {
                _approvalsCache = value;
                string key = string.Concat(AstriaCookie.GetToken(), "ApprovalsCache");
                if (_approvalsCache == null)
                {
                    _cache.Remove(key); // Remove is safe if item is not there
                }
                else
                {
                    // Note: 5 minutes is plenty of time if cache is loaded immediately before rendering annotations (entering edit mode or approving)
                    // but is not necessarily enough time if it is loaded when the document is first loaded.  Therefore, always load just prior to anno edit or approval placement!
                    if (_cache.Contains(key))
                        _cache[key] = _approvalsCache;
                    else
                        _cache.Add(key, _approvalsCache, new CacheItemPolicy() { SlidingExpiration = TimeSpan.FromMinutes(5) });
                }
            }
        }
        public System.Data.SqlClient.SqlTransaction CurrentTransaction
        {
            get { return null; }
        }
        public AnnoImageStamp Get(Guid id, System.Data.SqlClient.SqlTransaction trans = null)
        {
            var client = SvcBldr.StampsV2();
            var r = client.GetImageStamp(id);
            if (r.Error != null)
                throw new Exception(r.Error.Message);

            return r.Result;
        }
        public IEnumerable<AnnoImageStamp> GetAll(System.Data.SqlClient.SqlTransaction trans = null)
        {
            var client = SvcBldr.StampsV2();
            var r = client.GetAll(new AnnoStampGetPackage { IncludeAdmin = true, IncludeDeleted = true, IncludeImage = true });
            if (r.Error != null)
                throw new Exception(r.Error.Message);

            return r.Result.ImageStamps;
        }
        public Approval GetApproval(Guid id, System.Data.SqlClient.SqlTransaction trans)
        {
            if (ApprovalsCache == null)
                throw new InvalidOperationException("Approval cache is null");
            Approval app = null;
            ApprovalsCache.TryGetValue(id, out app);
            return app;
        }
        /// <summary>
        /// This is not part of the interface, but it supports it.
        /// See note on ApprovalsCache set method (cache expiration time)
        /// </summary>
        /// <returns></returns>
        [HttpPost]
        public JsonResult SetApprovalsCache(Approval[] approvals)
        {
            try
            {
                ApprovalsCache = approvals == null ? null : approvals.ToDictionary(a => a.Id);
                return Result(null, null);
            }
            catch (Exception ex)
            {
                return Result(null, ExceptionsML.GetExceptionML(ex));
            }
        }
        #endregion
    }
}
