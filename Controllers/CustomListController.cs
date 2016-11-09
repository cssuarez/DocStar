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
    /// <summary>
    /// used for manager buzz spaces
    /// </summary>
    public class CustomListController : ControllerBase
    {
        /// <summary>
        /// Constructor
        /// </summary>
        public CustomListController() { }
        /// <summary>
        /// Constructor from another controller
        /// </summary>
        /// <param name="contxt"></param>
        public CustomListController(ControllerContext contxt) : base(contxt) { }
        /// <summary>
        /// Retrieves the current (by schedule) buzz spaces for the system and for the user.
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public System.Web.Mvc.ActionResult GetCurrentBuzzSpaces()
        {
            var client = SvcBldr.AdministrationV2();
            List<BuzzSpace> buzzes = new List<BuzzSpace>();

            var userBS = client.GetCurrentBuzzSpace(false);
            if (userBS.Error != null)
                return Result(null, userBS.Error, JsonRequestBehavior.AllowGet);

            var sysBS = client.GetCurrentBuzzSpace(true);
            if (sysBS.Error!= null)
                return Result(null, sysBS.Error, JsonRequestBehavior.AllowGet);

            buzzes.Add(userBS.Result);
            buzzes.Add(sysBS.Result);

            return View(buzzes);
        }
        [HttpGet]
        public System.Web.Mvc.ActionResult GetBuzzSpaceEditor(Guid? selectedId, ExceptionsML ex)
        {
            var model = new BuzzEditorModel();
            try
            {
                var dc = SvcBldr.AdministrationV2();
                model.Exception = ex;
                model.BuzzSpaces = new List<BuzzSpace>();
                model.BuzzSpaces.Add(new BuzzSpace() { Title = Constants.i18n("newTitle"), Content = "", Id = Guid.Empty });
                var b = dc.GetAllBuzzSpace();
                if (b.Error != null)
                {
                    return Result(null, b.Error, JsonRequestBehavior.AllowGet);
                }
                model.BuzzSpaces.AddRange(b.Result);
                if (selectedId.HasValue)
                {
                    var selected = model.BuzzSpaces.FirstOrDefault(r => r.Id == selectedId.Value);
                    if (selected != null)
                        model.SelectedBuzz = selected;
                }
                else
                {
                    var userBS = dc.GetCurrentBuzzSpace(false);
                    if (userBS != null && userBS.Result!=null)
                        model.SelectedBuzz = model.BuzzSpaces.FirstOrDefault(r => r.Id == userBS.Result.Id);

                    if (model.SelectedBuzz == null)
                        model.SelectedBuzz = model.BuzzSpaces.First();
                }
            }
            catch (Exception err)
            {
                model.Exception = ExceptionsML.GetExceptionML(err);
            }
            return View(model);
        }
        [HttpPost, ValidateInput(false)]
        public System.Web.Mvc.ActionResult GetBuzzSpaceEditor(BuzzSpace buzz)
        {
            var client = SvcBldr.AdministrationV2();
            var model = new BuzzEditorModel();
            buzz.DefaultAd = Context.Request.Form["DefaultAd"] != null;
            if (buzz.Title == null)
            {
                return GetBuzzSpaceEditor(Guid.Empty, new ExceptionsML { Message = Constants.i18n("titleEmptyWarning") });
            }
            else
            {
                buzz.Title.Trim();
            }
            if (Context.Request.Form["MonthsOfYear"] != null)
                buzz.MonthsOfYear = (MonthsOfYear)Enum.Parse(typeof(MonthsOfYear), Context.Request.Form["MonthsOfYear"]);
            if (Context.Request.Form["DaysOfWeek"] != null)
                buzz.DaysOfWeek = (DaysOfWeek)Enum.Parse(typeof(DaysOfWeek), Context.Request.Form["DaysOfWeek"]);


            if (buzz.Id == Guid.Empty)
            {
                buzz.Id = Guid.NewGuid();
            }
            if (buzz.DaysOfMonth != null && buzz.DaysOfMonth.Count > 1)
            {
                if (buzz.DaysOfMonth.Any(r => r == 0))
                {
                    buzz.DaysOfMonth.Remove(0);
                }
            }

            var t = client.SetBuzzSpace(buzz);
            return GetBuzzSpaceEditor(buzz.Id, t.Error);

        }
        /// <summary>
        /// deletes buzz spaces
        /// </summary>
        [HttpPost]
        public JsonResult DeleteBuzzSpaces(Guid Id)
        {
            var dc = SvcBldr.AdministrationV2();
            BuzzSpace bs = new BuzzSpace {Id = Id};

            var ret_status = dc.DeleteBuzzSpace(bs);
            return Result(ret_status.Result, ret_status.Error);
        }
        /// <summary>
        /// Retrieves a custom list
        /// </summary>
        [HttpGet]
        public JsonResult GetCustomList(string listName)
        {
            var client = SvcBldr.AdministrationV2();
            var list = client.GetCustomList(listName);
            return Result(list.Result, list.Error, JsonRequestBehavior.AllowGet);

        }
        /// <summary>
        /// Retrieves all custom lists, Includes New.
        /// </summary>
        [HttpGet]
        public JsonResult GetAllCustomLists()
        {
            var client = SvcBldr.AdministrationV2();
            var cls = client.GetCustomListsItems();
            if (cls.Error != null)
            {
                return Result(null, cls.Error, JsonRequestBehavior.AllowGet);
            }
            cls.Result = cls.Result.Concat(new[] { new CustomListItem { Name = Constants.i18n("newTitle"), Items = new List<string>(), ReadOnly = true } }).ToArray();
            return Result(cls.Result, cls.Error, JsonRequestBehavior.AllowGet);
        }
    }
}
