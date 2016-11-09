using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace Astria.UI.Web
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                name: "Guest", //RedirectToAction uses the first entry for the URL, if this is not here all RedirectToActions calls that goto the Guest controller will goto /Venom/{action}.
                url: "Guest/{action}",
                defaults: new { controller = "Guest", action = "Index" }
                );
            routes.MapRoute(
                name: "LegacyGuest",
                url: "Venom/{action}",
                defaults: new { controller = "Guest", action = "Index" }
                );
            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
