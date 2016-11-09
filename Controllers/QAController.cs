using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Threading;
using System.IO;
using System.Net;
using Astria.UI.Web.Utility;
using Astria.UI.ServiceInterop;
using System.Text;
using System.Collections.Specialized;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// used to handle special QA requests like sleep or listings of JS files
    /// </summary>
    public class QAController : ControllerBase
    {
        public QAController() : base(true) { }

        // GET: /QA/
        /// <summary>
        /// sleeps for given amount of milliseconds
        /// </summary>
        /// <param name="milliseconds"></param>
        /// <returns></returns>
        [HttpPost]
        public ActionResult Sleep(int milliseconds)
        {
            Thread.Sleep(milliseconds);
            return Json("ok");
        }

        /// <summary>
        /// gets a relative path in a string array so you can join it with your own separator whenever you feel like doing so.
        /// </summary>
        /// <param name="dirname"></param>
        /// <param name="length"></param>
        /// <returns></returns>
        public String[] getRalativeFullPath(string dirname, int length)
        {
            string[] splitter = { "\\" };
            string[] parts = dirname.Split(splitter, StringSplitOptions.None);
            int len = parts.Length;
            string[] sub = parts.Skip(len - length).ToArray();
            return sub;
        }

        /// <summary>
        /// send emailed report (broken) 
        /// TODO [Idea] Testing thing?  IDK
        /// </summary>
        /// <returns></returns>
        [HttpPost]
        public ActionResult EmailReport()
        {
            try
            {
                WebRequest request = WebRequest.Create("http://tests/email.php");
                request.Method = "POST";
                request.ContentType = "application/x-www-form-urlencoded";
                var r = request.GetRequestStream();
                var currentStream = new byte[HttpContext.Request.InputStream.Length];
                HttpContext.Request.InputStream.Read(currentStream, 0, currentStream.Length);
                r.Write(currentStream, 0, currentStream.Length);
                StreamReader sr = new StreamReader(request.GetResponse().GetResponseStream());
                return Json(sr.ReadToEnd());
            }
            catch (Exception ex) { return Json(ex.Message); }
        }
    }
}
