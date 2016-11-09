using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.Framework.DataContracts;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.Utility;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using Astria.UI.Web.Utility;
using Astria.Framework.DataContracts.CustomExceptions;

namespace Astria.UI.Web.Models
{
    public class GuestChallengeModel
    {
        public bool ShowPassword { get; set; }
        public bool ShowRecaptcha { get; set; }
        public Guid RequestId { get; set; }
        public Guid InstanceId { get; set; }
        public string RequestOptions { get; set; }
        public List<string> ErrorMessages { get; set; }
        public ProxyAuthRequestResult ProxyRequest { get; set; }
        public string SubmitMessage { get; set; }

        public GuestChallengeModel()
        {
            ErrorMessages = new List<string>();
        }
        internal static GuestChallengeModel GetOrValidate(Guid reqId, Guid instanceId, HttpRequestBase request, ServiceBuilder svcBldr)
        {
            var model = new GuestChallengeModel();

            var client = svcBldr.SecurityV2();
            var sr = client.GetProxyRequest(new GetProxyRequestArgs { DontGetToken = true, Id = reqId, InstanceId = instanceId });
            ExceptionsML.Check(sr.Error);
            var par = sr.Result;

            model.SubmitMessage = GetSubmitMessage(par.RequestType);
            //Temporary: Bug 13104  - Update Guest Downloads so they follow the same model as Form Links and Guest viewer links
            if (par.RequestType == ProxyAuthRequestType.DownloadFiles)
            {
                model.ProxyRequest = par;
                return model;
            }

            ValidateRecaptcha(par, model, request);
            ValidatePasswordFillModelProxyRequest(par, model, request, svcBldr);
            return model;
        }
        private static string GetSubmitMessage(ProxyAuthRequestType requestType)
        {
            switch (requestType)
            {
                case ProxyAuthRequestType.DownloadFiles:
                    return Constants.i18n("DownloadFiles_Submit");
                case ProxyAuthRequestType.AccessViewer:
                    return Constants.i18n("AccessViewer_Submit");
                case ProxyAuthRequestType.CreateForm:
                    return Constants.i18n("CreateForm_Submit");
                default:
                    return Constants.i18n("pleaseWait");
            }
        }
        private static void ValidateRecaptcha(ProxyAuthRequestResult par, GuestChallengeModel model, HttpRequestBase request)
        {
            var recapResponse = request.Form["g-recaptcha-response"];
            JObject args = null;
            if (!String.IsNullOrEmpty(par.Arguments))
                args = (JObject)JsonConvert.DeserializeObject(par.Arguments);

            var useRecaptcha = false;
            if (args != null && args["UseRecaptcha"] != null && bool.TryParse(args["UseRecaptcha"].Value<string>(), out useRecaptcha) && useRecaptcha)
            {
                if (String.IsNullOrWhiteSpace(recapResponse))
                    model.ShowRecaptcha = GoogleReCaptcha.CanAccess();
                else
                {
                    var gr = new GoogleReCaptcha();
                    if (!gr.IsValid(recapResponse, request.UserHostAddress))
                    {
                        model.ErrorMessages.Add(Constants.i18n("invalidRecaptcha"));
                        model.ShowRecaptcha = GoogleReCaptcha.CanAccess();
                    }
                }
            }
        }
        private static void ValidatePasswordFillModelProxyRequest(ProxyAuthRequestResult par, GuestChallengeModel model, HttpRequestBase request, ServiceBuilder svcBldr)
        {
            var pass = request.Form["password"];
            var svc = svcBldr.SecurityV2();
            if (par.HasPassword && !String.IsNullOrWhiteSpace(pass)) //Has a password and one has been provided by the user
            {
                var pwSR = svc.GetProxyRequest(new GetProxyRequestArgs { Id = par.Id, InstanceId = par.InstanceId, Password = pass });
                if (pwSR.Error != null)
                {
                    model.ErrorMessages.Add(pwSR.Error.Message);
                    model.ShowPassword = true;
                }
                else
                {
                    model.ProxyRequest = pwSR.Result;
                }
            } 
            else if (!par.HasPassword && !model.ShowRecaptcha) //Does not have a password and is not showing the recaptcha, get the full ProxyAuthRequest (decrements counts, returns a restricted token).
            {
                var prSR = svc.GetProxyRequest(new GetProxyRequestArgs { Id = par.Id, InstanceId = par.InstanceId, Password = pass });
                if (prSR.Error != null)
                {
                    if (prSR.Error.Type == typeof(ProxyAuthRequestExpiredException).ToString())
                    {
                        switch (par.RequestType)
                        {
                            case ProxyAuthRequestType.DownloadFiles:
                                throw new Exception(Constants.i18n("downloadFilesProxyRequestExpired"));
                            case ProxyAuthRequestType.AccessViewer:
                                throw new Exception(Constants.i18n("accessViewerProxyRequestExpired"));
                            case ProxyAuthRequestType.CreateForm:
                                throw new Exception(Constants.i18n("createFormProxyRequestExpired"));
                            default:
                                ExceptionsML.Check(prSR.Error);
                                break;
                        }
                    }
                    ExceptionsML.Check(prSR.Error);
                }
                model.ProxyRequest = prSR.Result;
            }
            else //Has a password and it has not been filled out yet or is showing recaptcha
            {
                model.ProxyRequest = par;
                model.ShowPassword = par.HasPassword;
            }
        }
    }
}