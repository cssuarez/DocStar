using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.UI.Web.Models;
using Astria.UI.Web.Utility;
using Astria.UI.ServiceInterop;
using System.IO;
using Astria.Framework.Utility;
using Astria.Framework.DataContracts.V2;
using DC = Astria.Framework.DataContracts;
namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// used do display the home page (this is our default page that never changes)
    /// </summary>
    public class HomeController : ControllerBase
    {
        public HomeController() : base(true) { }

        /// <summary>
        /// display the home model
        /// </summary>
        /// <returns></returns>
        public ActionResult Index()
        {
            HomeModel model = null;
            try
            {
                model = new HomeModel(SvcBldr);
                model.IsLoggedIn = IsLoggedIn;
                model.SignOutReason = SignOutReason;
                model.ServerURI = GetServerURI();
                Response.Cookies.Add(new HttpCookie("ds_cookie", Environment.MachineName));
                if (IsLoggedIn)
                {
                    Framework.DataContracts.ExceptionsML bizEx = null;
                    var redirectURL = GetRedirectURL(out bizEx);
                    if (bizEx != null)
                    {
                        if (bizEx.Type == typeof(Astria.Framework.DataContracts.LoginRequiredException).ToString())
                        {
                            return View(model);
                        }
                        return View("Oops", bizEx);
                    }

                    if (String.IsNullOrEmpty(redirectURL))
                    {
                        model.Token = BaseToken;
                        model.LoadData(Functions.CombineUri(CurrentDomain, HttpContext.Request.ApplicationPath));
                    }
                    else
                        return Redirect(redirectURL);
                }

                return View(model);
            }
            catch (Astria.Framework.DataContracts.LoginRequiredException lex)
            {
                SignOut(lex.Reason.ToString());
                return GetLoginRedirect();
            }
            catch (Exception ex)
            {
                Functions.WriteToEventLog("Application", Constants.EVENTSOURCE_UI_WEB, ex.ToString());
                return View("Oops", Astria.Framework.DataContracts.ExceptionsML.GetExceptionML(ex));
            }
        }

        /// <summary>
        /// Switches the company context for the requestor.
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public JsonResult Instance(string id)
        {
            try
            {
                if (!IsLoggedIn)
                    throw Framework.DataContracts.LoginRequiredException.Create(Framework.DataContracts.LoginRequiredReason.Credentials);

                var client = SvcBldr.Hosting();
                Astria.Framework.DataContracts.ExceptionsML bizEx = null;
                var token = client.SwitchContext(id, out bizEx);
                if (bizEx == null)
                {
                    var authCookie = AstriaCookie.SetToken(token, Functions.GetProxyCookieDomain());
                    Response.Cookies.Add(authCookie);
                }
                return Result(null, bizEx, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex) { return Result(null, Astria.Framework.DataContracts.ExceptionsML.GetExceptionML(ex), JsonRequestBehavior.AllowGet); }
        }

        private string GetRedirectURL(out Astria.Framework.DataContracts.ExceptionsML bizEx)
        {
            bizEx = null;
            var redirectUrl = "";
            if (!String.IsNullOrEmpty(Request.QueryString[Constants.INSTANCEID]))
            {
                var hostingClient = SvcBldr.Hosting();
                var token = hostingClient.SwitchContext(Request.QueryString[Constants.INSTANCEID], out bizEx);
                if (bizEx == null)
                {
                    redirectUrl = Url.Content("~/");
                    var authCookie = AstriaCookie.SetToken(token, Functions.GetProxyCookieDomain());
                    Response.Cookies.Add(authCookie);
                    SvcBldr.Token = token;
                }
            }
            if (!String.IsNullOrEmpty(Request.QueryString[Constants.TYPE]) && bizEx == null)
            {
                if (String.IsNullOrEmpty(redirectUrl))
                    redirectUrl = Url.Content("~/");

                var type = (DC.EntityType)Enum.Parse(typeof(DC.EntityType), Request.QueryString[Constants.TYPE], true);
                string typeString = type.ToString();
                switch (type)
                {
                    case DC.EntityType.DocumentVersion:
                        typeString = "ver"; // this abbreviation used for DocumentVersion, the most common cache entity
                        goto case Astria.Framework.DataContracts.EntityType.Document;
                    case DC.EntityType.Document:
                        var searchClient = SvcBldr.SearchV2();
                        var data = new Dictionary<Guid, string>();
                        data.Add(new Guid(Request.QueryString[Constants.ENTITYID]), typeString);
                        if (Request.QueryString[Constants.WF_LINK_ACTION] == Constants.WF_UPDATE_DUEDATE)
                        {
                            var dueDate = Request.QueryString[Constants.DUEDATE];
                            DateTime tempDate;
                            if (!DateTime.TryParse(dueDate, out tempDate))
                                throw new Exception(Constants.i18n("invalidDueDate"));
                            UpdateDueDate(new Guid(Request.QueryString[Constants.ENTITYID]), Convert.ToDateTime(dueDate));
                        }
                        var sr = searchClient.SetCachedViewData(data);
                        if (sr.Error == null)
                        {
                            if (!String.IsNullOrEmpty(Request.QueryString[Constants.WF_LINK_ACTION]))
                            {
                                redirectUrl += String.Format("#Retrieve/view/{0}/index/1/page/1/query?{1}={2}", sr.Result, Constants.WF_LINK_ACTION, Request.QueryString[Constants.WF_LINK_ACTION]);
                            }
                            else
                            {
                                redirectUrl += String.Format("#Retrieve/view/{0}/index/1/page/1", sr.Result);
                            }
                        }
                        break;
                    case DC.EntityType.Workflow:
                        redirectUrl = String.Format("#Workflow/queues/1/25/DFWfId/asc/wfItems/{0}/{1}", Request.QueryString[Constants.ENTITYID], Request.QueryString[Constants.USERID]);
                        break;
                    // direct links to other entities are not currently supported
                    default:
                        break;
                }
            }

            return redirectUrl;
        }
        private void UpdateDueDate(Guid documentVersionId, DateTime dueDate)
        {
            var docClient = SvcBldr.DocumentV2();
            try
            {
                var doc = docClient.GetByVersion(documentVersionId);
                DC.ExceptionsML.Check(doc.Error);

                if (doc.Result.Version.DueDate == dueDate)
                {
                    var documentSlimUpdate = new DocumentSlimUpdate
                    {
                        DocumentId = doc.Result.Document.Id,
                        VersionId = doc.Result.Version.Id,
                        ModifiedTicks = doc.Result.ModifiedTicks,
                        DueDate = dueDate.AddHours(24).ToString()
                    };
                    var update = docClient.UpdateManySlim(new[] { documentSlimUpdate });
                    DC.ExceptionsML.Check(update.Error);
                    if (update.Result != null && update.Result.ResultByVerId.ContainsKey(documentVersionId))
                        DC.ExceptionsML.Check(update.Result.ResultByVerId[documentVersionId].Error);
                }
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }
        public ActionResult Oops()
        {
            return View();
        }

    }
}
