using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts.V2;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using Astria.UI.Web.Utility;
using Astria.UI.Web.Models;

namespace Astria.UI.Web.Controllers
{
    public class SystemNotificationsController : ControllerBase
    {
        //
        // GET: /SystemNotifications/

        public SystemNotificationsController() { }
        public SystemNotificationsController(ControllerContext contxt) : base(contxt) { }

        [HttpGet]
        public System.Web.Mvc.ActionResult GetSystemNotificationsEditor(Guid? selectedId, ExceptionsML ex)
        {
            var model = new SystemNotificationEditorModel();
            try
            {
                var dc = SvcBldr.CompanyV2();
                model.Exception = ex;
                model.Notifications = new List<SystemNotification>();
                model.Notifications.Add(new SystemNotification() { Title = Constants.i18n("newTitle"), Content = "", Id = Guid.Empty, StartDate = DateTime.Now, EndDate = DateTime.Now });
                var b = dc.GetAllSystemNotification();
                if (b.Error != null)
                {
                    return Result(null, b.Error, JsonRequestBehavior.AllowGet);
                }
                model.Notifications.AddRange(b.Result);
                if (selectedId.HasValue)
                {
                    var selected = model.Notifications.FirstOrDefault(r => r.Id == selectedId.Value);
                    if (selected != null)
                        model.SelectedNotification = selected;
                }
                else
                {
                    model.SelectedNotification = new SystemNotification() { Title = Constants.i18n("newTitle"), Content = "", Id = Guid.Empty, StartDate = DateTime.Now, EndDate = DateTime.Now };
                }

            }
            catch (Exception err)
            {
                model.Exception = ExceptionsML.GetExceptionML(err);
            }
            return View(model);

        }
        [HttpPost, ValidateInput(false)]
        public System.Web.Mvc.ActionResult GetSystemNotificationsEditor(SystemNotification notification)
        {            
            var client = SvcBldr.CompanyV2();
            string site = string.Empty;
            var model = new SystemNotificationEditorModel();
            if (notification.Title == null)
            {
                return GetSystemNotificationsEditor(Guid.Empty, new ExceptionsML { Message = Constants.i18n("titleEmptyWarning") });
            }
            else
            {
                notification.Title.Trim();
            }
            if (Context.Request.Form["Site"] != null)
                site = Context.Request.Form["Site"];
            if (site.IndexOf("All") >= 0)
            {
                site = "All";
            }
            else
            {
                notification.SiteID = site.Split(',').Select(s => Guid.Parse(s)).ToArray();
            }

            if (Context.Request.Form["StartDate"] != null)
                notification.StartDate = Convert.ToDateTime(Context.Request.Form["StartDate"]);
            if (Context.Request.Form["EndDate"] != null)
                notification.EndDate = Convert.ToDateTime(Context.Request.Form["EndDate"]);


            if (notification.Id == Guid.Empty)
            {
                notification.Id = Guid.NewGuid();
                client.CreateSystemNotification(notification);
            }
            else
            {
                client.UpdateSystemNotification(notification);
            }
            ExceptionsML ex = new ExceptionsML();
            return GetSystemNotificationsEditor(notification.Id, ex);

        }
        [HttpPost]
        public void DeleteSystemNotification(Guid Id)
        {
            var dc = SvcBldr.CompanyV2();
            dc.DeleteSystemNotification(Id);
        }

    }
}
