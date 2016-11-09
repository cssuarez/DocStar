using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web.Mvc;
using System.Web;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// used to not set output caching in browsers
    /// </summary>
    public class NoCacheAttribute : ActionFilterAttribute
    {
        /// <summary>
        /// sets attributes before output is completed to send the correct cache busting headers
        /// </summary>
        /// <param name="filterContext"></param>
        public override void OnResultExecuting(ResultExecutingContext filterContext)
        {
            filterContext.HttpContext.Response.Cache.SetExpires(DateTime.UtcNow.AddDays(-1));
            filterContext.HttpContext.Response.Cache.SetValidUntilExpires(false);
            filterContext.HttpContext.Response.Cache.SetRevalidation(HttpCacheRevalidation.AllCaches);
            filterContext.HttpContext.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            filterContext.HttpContext.Response.Cache.SetNoStore();
            base.OnResultExecuting(filterContext);
        }
    }
}
