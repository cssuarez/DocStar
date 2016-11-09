using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Net;
using System.Collections.Specialized;
using System.Text;

namespace Astria.UI.Web
{
    /// <summary>
    /// Summary description for QAHandler
    /// </summary>
    public class QAHandler : IHttpHandler
    {
        public void ProcessRequest(HttpContext context)
        {
            string data = null;
            try
            {
                var html = HttpUtility.UrlDecode(context.Request.BinaryRead(context.Request.ContentLength), context.Request.ContentEncoding);
                string URLAuth = "http://validator.w3.org/check";
                WebClient webClient = new WebClient();

                NameValueCollection formData = new NameValueCollection();
                formData["fragment"] = html;

                byte[] responseBytes = webClient.UploadValues(URLAuth, "POST", formData);
                string result = Encoding.UTF8.GetString(responseBytes);
                webClient.Dispose();

                data = result;
            }
            catch (Exception ex) { data = ex.Message; }

            context.Response.ContentType = "text";
            context.Response.Write(data);
        }
        /// <summary>
        /// 
        /// </summary>
        public bool IsReusable
        {
            get
            {
                return false;
            }
        }
    }
}