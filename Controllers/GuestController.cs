using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.CustomExceptions;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.OperationContracts;
using Astria.Framework.Utility;
using Astria.UI.ServiceInterop;
using Astria.UI.Web.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using mvc = System.Web.Mvc;

namespace Astria.UI.Web.Controllers
{
    public class GuestController : ControllerBase
    {
        public GuestController() : base(true) { }
                
        public mvc.ActionResult Index()
        {
            try
            {
                var reqId = Guid.Empty;
                var instanceId = Guid.Empty;
                if (!Guid.TryParse(Request.QueryString[Constants.REQUESTID], out reqId) || 
                    !Guid.TryParse(Request.QueryString[Constants.INSTANCEID], out instanceId))
                    throw new Exception(Constants.i18n("incompleteProxyAuthRequestURL"));
                
                var gsc = GuestSessionCookie.Get(Request, reqId);
                if (gsc != null)
                {
                    var ar = RedirectToLastSession(gsc);
                    if (ar != null)
                        return ar;
                }

                var cm = GuestChallengeModel.GetOrValidate(reqId, instanceId, Request, SvcBldr);
                if (cm.ShowPassword || cm.ShowRecaptcha)
                    return View("Challenge", cm);

                switch (cm.ProxyRequest.RequestType)
                {
                    case ProxyAuthRequestType.DownloadFiles:
                        return View("DocumentDownload"); //TODO: Fix, this cannot get the Request
                    case ProxyAuthRequestType.AccessViewer:
                        var baseUri = Functions.CombineUri(CurrentDomain, HttpContext.Request.ApplicationPath);
                        var model = new GuestViewerModel(SvcBldr);
                        model.Load(baseUri, cm.ProxyRequest);
                        SignIn(model.EncryptedToken, model.User, false);
                        return View("GuestViewer", model);
                    case ProxyAuthRequestType.CreateForm:
                        return CreateForm(cm.ProxyRequest, instanceId);
                    default:
                        throw new NotImplementedException(cm.ProxyRequest.RequestType.ToString());
                }
            }
            catch(Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
        private mvc.ActionResult RedirectToLastSession(GuestSessionCookie fsc)
        {
            var client = SvcBldr.SecurityV2();
            var sr = client.GetProxyRequest(new GetProxyRequestArgs { Id = fsc.RequestId, InstanceId = fsc.InstanceId, DontGetToken = true });
            if (sr.Error != null)
            {
                if (sr.Error.Type == typeof(ProxyAuthRequestExpiredException).ToString())
                {
                    fsc.Delete(Request, Response);
                    return null;
                }
                ExceptionsML.Check(sr.Error);
            }
            return RedirectToAction("Index", fsc);
        }
        #region Create Form
        private mvc.ActionResult CreateForm(ProxyAuthRequestResult req, Guid instanceId)
        {
            var jArgs = (JObject)JsonConvert.DeserializeObject(req.Arguments);
            SvcBldr.Token = req.Token;
            return CreateDocumentAndRedirect(req, jArgs, instanceId);
        }
        private mvc.ActionResult CreateDocumentAndRedirect(ProxyAuthRequestResult req, JObject jArgs, Guid instanceId)
        {
            var fSvc = SvcBldr.FormsV2();
            var cdsr = fSvc.CreateDocument(new FormDocumentCreateArgs
            {
                IsTemporary = true,
                FormTemplateId = new Guid(jArgs["FormTemplateId"].Value<string>()) //Convert failure when .Value<Guid> is used.
            });
            ExceptionsML.Check(cdsr.Error);
            var vrId = Functions.NewSeq();
            jArgs["DocumentVersionId"] = cdsr.Result.Version.Id;
            jArgs["FormRequestId"] = req.Id;
            jArgs["ViewRequestId"] = vrId;
            jArgs["UseRecaptcha"] = false;
            ExceptionsML.Check(cdsr.Error);
            var secSvc = SvcBldr.SecurityV2();
            var viewerCPR = new ProxyAuthRequest
            {
                Id = vrId,
                ExpirationType = ExpirationMode.CustomCount,
                ExpirationValue = "1", //Expires as soon as the form is submitted.
                RequestType = ProxyAuthRequestType.AccessViewer,
                Token = req.Token,
                Parameters = JsonConvert.SerializeObject(jArgs)
            };
            var cprSR = secSvc.CreateProxyRequest(viewerCPR);
            ExceptionsML.Check(cprSR.Error);
            var fsc = GuestSessionCookie.Create(Response, cprSR.Result, instanceId, req.Id);
            return RedirectToAction("Index", fsc);
        }
        public mvc.ActionResult FormComplete(Guid id, bool embedded)
        {
            var fsc = GuestSessionCookie.Get(Request, id);
            if (fsc != null)
                fsc.Delete(Request, Response);

            return View(embedded);
        }
        #endregion
        #region File Download Action
        /// <summary>
        /// Processes the proxy request
        /// </summary>
        [mvc.HttpGet]
        public mvc.ActionResult ProcessDownloadRequest()
        {
            Guid id = new Guid(Request.QueryString["id"]);
            Guid instanceId = new Guid(Request.QueryString["instanceId"]);
            var password = Request.QueryString["password"];
            var connectionId = Request.QueryString["connectionId"];
            SR<ProxyAuthRequestResult> sr = null;
            try
            {
                var client = SvcBldr.SecurityV2();
                sr = client.GetProxyRequest(new GetProxyRequestArgs { Id = id, InstanceId = instanceId, Password = password });
                ExceptionsML.Check(sr.Error);
                return DownloadFiles(sr.Result, connectionId);
            }
            catch (LoginRequiredException lex)
            {
                if (lex.Reason == LoginRequiredReason.ProxyMoveInProgress)
                {
                    var proxyUrl = Functions.GetAuthenticationProxyUrl();
                    var domain = Functions.GetProxyCookieDomain();
                    var url = Functions.CombineUri(proxyUrl, "Guest");
                    url += String.Format("?{0}={1}&{2}={3}&{4}={5}", Constants.REQUESTID, id, Constants.INSTANCEID, instanceId, Constants.AUTO, String.IsNullOrEmpty(password));
                    return View("../Home/Oops", new ExceptionsML { Message = url, Type = LoginRequiredReason.ProxyMoveInProgress.ToString() });
                }
                return View("../Home/Oops", ExceptionsML.GetExceptionML(lex));
            }
            catch (RecordNotFoundException rex)
            {
                return View("../Home/Oops", new ExceptionsML { Message = Constants.i18n("invalidGuestDownloadRequest"), Type = rex.GetType().ToString() });
            }
            catch (Exception ex) { return View("../Home/Oops", ExceptionsML.GetExceptionML(ex)); }
        }
        /// <summary>
        /// Downloads the files related the proxy request (large files have signalR events to indicate completion).
        /// </summary>
        [mvc.HttpGet]
        public mvc.ActionResult ProcessDownloadRequestResult()
        {
            Guid id = new Guid(Request.QueryString["id"]);
            Guid instanceId = new Guid(Request.QueryString["instanceId"]);
            var password = Request.QueryString["password"];
            var fileId = Request.QueryString["fileId"];
            SR<ProxyAuthRequestResult> sr = null;
            try
            {
                var client = SvcBldr.SecurityV2();
                sr = client.GetProxyRequest(new GetProxyRequestArgs { Id = id, InstanceId = instanceId, Password = password });
                ExceptionsML.Check(sr.Error);

                BaseToken = sr.Result.Token;

                var ip = GetIP();
                var server = GetServerURI();
                var sb = new ServiceBuilder(server, BaseToken, ip);
                var fileName = Path.GetFileName(fileId);
                var mimeType = fileId.GetMIMEType();
                var ftSvc = sb.FileTransferV2();
                var bytes = RemoteFileHandler.DownloadFile(fileId, ftSvc);
                return File(bytes, mimeType, fileName);
            }
            catch (LoginRequiredException lex)
            {
                if (lex.Reason == LoginRequiredReason.ProxyMoveInProgress)
                {
                    var proxyUrl = Functions.GetAuthenticationProxyUrl();
                    var domain = Functions.GetProxyCookieDomain();
                    var url = Functions.CombineUri(proxyUrl, "Guest");
                    url += String.Format("?RequestId={0}&InstanceId={1}&auto={2}", id, instanceId, String.IsNullOrEmpty(password));
                    return View("../Home/Oops", new ExceptionsML { Message = url, Type = LoginRequiredReason.ProxyMoveInProgress.ToString() });
                }
                return View("../Home/Oops", ExceptionsML.GetExceptionML(lex));
            }
            catch (RecordNotFoundException rex)
            {
                return View("../Home/Oops", new ExceptionsML { Message = Constants.i18n("invalidGuestDownloadRequest"), Type = rex.GetType().ToString() });
            }
            catch (Exception ex) { return View("../Home/Oops", ExceptionsML.GetExceptionML(ex)); }
        }
        private mvc.ActionResult DownloadFiles(ProxyAuthRequestResult request, string connectionId)
        {
            try
            {
                BaseToken = request.Token;

                var ip = GetIP();
                var server = GetServerURI();
                var sb = new ServiceBuilder(server, request.Token, ip);
                sb.Options = ServiceRequestOptions.OverrideErrors;
                var docClient = sb.DocumentV2();
                var documentIds = new List<Guid>();
                SendOptions sendOptions = new SendOptions
                {
                    ActionType = ActionType.Downloaded,
                    ExportType = ExportDocumentType.Native,
                    IncludeAnnotations = true,
                    IncludeRedactions = true,
                    PageSelection = null,
                    Password = null
                };
                var parameters = new ProxySendOptions { DocumentIds = null, SendOptions = null };
                if (request.Arguments.StartsWith("{"))
                {
                    parameters = JsonConvert.DeserializeObject<ProxySendOptions>(request.Arguments);
                }
                else if (request.Arguments.StartsWith("<?xml version=\"1.0\" encoding=\"utf-16\"?><ProxySendOptions"))
                {
                    parameters = (ProxySendOptions)parameters.DeserializeObject(request.Arguments);
                }
                else
                {
                    documentIds = (List<Guid>)documentIds.DeserializeObject(request.Arguments);
                }
                documentIds = parameters.DocumentIds ?? documentIds;
                sendOptions = parameters.SendOptions ?? sendOptions;
                sendOptions.ConnectionId = connectionId;
                sendOptions.ActionType = ActionType.Downloaded; //Downloading here so the action type is always download.

                var sr = docClient.PrepForSend(new Framework.DataContracts.V2.PrepForSendPackage { DocumentIds = documentIds.ToArray(), SendOptions = sendOptions });
                if (sr.Error != null)
                    return View("../Home/Oops", sr.Error);

                if (sr.Result == Constants.GONE_OOP)
                {
                    return new mvc.EmptyResult();
                }
                else
                {
                    var fileName = Path.GetFileName(sr.Result);
                    var mimeType = sr.Result.GetMIMEType();
                    var ftSvc = sb.FileTransferV2();
                    var bytes = RemoteFileHandler.DownloadFile(sr.Result, ftSvc);
                    return File(bytes, mimeType, fileName);
                }
            }
            catch (Exception ex)
            {
                return Result(null, ExceptionsML.GetExceptionML(ex), mvc.JsonRequestBehavior.AllowGet);
            }
        }
        #endregion


        public System.Web.Mvc.ActionResult Kiosk()
        {
            try
            {
                var kioskId = Request.QueryString["Id"];
                var instanceId = Request.QueryString["IId"];
                var machineId = Request.QueryString["MId"];

                if (String.IsNullOrWhiteSpace(kioskId) || String.IsNullOrWhiteSpace(instanceId) || String.IsNullOrWhiteSpace(machineId))
                    throw new Exception(Constants.i18n("invalidRequest"));

                SvcBldr.Source = "GuestRequest";
                var userSvc = SvcBldr.UserV2();
                var sr = userSvc.LogInKiosk(new KioskLoginArgs { Id = kioskId, InstanceId = new Guid(instanceId) });
                ExceptionsML.Check(sr.Error);
                SignIn(sr.Result.Token, sr.Result.CurrentUser, false);

                var url = String.Format("{0}://{1}/{2}#Capture/{3}", Request.Url.Scheme, Request.Url.Host, Request.ApplicationPath, machineId);
                return Redirect(url);
            }
            catch (Exception ex)
            {
                return View("../Home/Oops", ExceptionsML.GetExceptionML(ex));
            }
        }
    }
}