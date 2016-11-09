using Astria.Framework.DataContracts;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;

namespace Astria.UI.Web.Models
{
    public class GuestSessionCookie
    {
        public Guid _formRequestId = Guid.Empty;
        public Guid RequestId { get; set; }
        public Guid InstanceId { get; set; }
        public static GuestSessionCookie Get(HttpRequestBase req, Guid formRequestId)
        {
            var cv = "";
            if (req != null && req.Cookies != null && req.Cookies[formRequestId.ToString()] != null)
                cv = req.Cookies[formRequestId.ToString()].Value;

            if (!String.IsNullOrWhiteSpace(cv))
            {
                var fsc = JsonConvert.DeserializeObject<GuestSessionCookie>(cv);
                fsc._formRequestId = formRequestId;
                return fsc;
            }
            return null;
        }
        internal void Delete(HttpRequestBase req, HttpResponseBase resp)
        {
            if (req != null && req.Cookies != null && req.Cookies[_formRequestId.ToString()] != null)
            {
                req.Cookies[_formRequestId.ToString()].Value = "";
            }
            resp.Cookies.Add(new HttpCookie(_formRequestId.ToString(), ""));
            resp.Cookies[_formRequestId.ToString()].Expires = DateTime.Now.AddDays(-2);
        }

        internal static GuestSessionCookie Create(HttpResponseBase response, Guid viewRequestId, Guid instanceId, Guid formRequestId)
        {
            var fsc = new GuestSessionCookie
            {
                RequestId = viewRequestId,
                InstanceId = instanceId
            };
            fsc._formRequestId = formRequestId;
            response.Cookies.Add(new HttpCookie(formRequestId.ToString(), JsonConvert.SerializeObject(fsc)));
            response.Cookies[formRequestId.ToString()].Expires = DateTime.Now.AddYears(1);
            return fsc;
        }
    }
}