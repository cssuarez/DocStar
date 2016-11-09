using System;
using System.Linq;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.Utility;
using System.Collections.Generic;
using Astria.Framework.DataContracts.V2;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// Records retention features
    /// </summary>
    public class RecordsManagementController : ControllerBase
    {
        /// <summary>
        /// Retrieves Freezes
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetFreezes(bool includeNew = true)
        {
            var clientV2 = SvcBldr.AdministrationV2();
            ExceptionsML bizEx = null;
            var freezes = clientV2.GetAllFreezes();
            if (freezes != null && freezes.Error != null)
                return Result(null, bizEx, JsonRequestBehavior.AllowGet);
            var fList = freezes.Result.ToList();
            if (includeNew)
                fList.Insert(0, new Freeze() { Id = Guid.Empty, Name = Constants.i18n("newTitle"), Active = true });

            return Result(fList.Where(f => f.Active).OrderBy(f=>f.Name), freezes.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Retrieves other data needed for admin 
        /// Get only Active Freezes
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetAllData()
        {
            var clientV2 = SvcBldr.AdministrationV2();
            var freezes = clientV2.GetAllFreezes();
            if (freezes != null && freezes.Error != null)
                return Result(null, freezes.Error, JsonRequestBehavior.AllowGet);

            var fList = freezes.Result.ToList();
            fList.Insert(0, new Freeze() { Id = Guid.Empty, Name = Constants.i18n("newTitle"), Active = true });
            var srRecCats = clientV2.GetAllRecordCategories();
            if (srRecCats.Error != null)
                return Result(null, srRecCats.Error, JsonRequestBehavior.AllowGet);

            var rcats = srRecCats.Result.ToList();
            rcats.Insert(0, new RecordCategory() { Id = Guid.Empty, Name = Constants.i18n("newTitle") });

            var scRC = SvcBldr.SecurityV2().GetSecurityClassSlims();
            if (scRC.Error != null)
                return Result(null, scRC.Error, JsonRequestBehavior.AllowGet);

            var customFields = SvcBldr.CustomFieldV2().GetCustomFields();
            if (customFields.Error != null)
                return Result(null, customFields.Error, JsonRequestBehavior.AllowGet);

            var dateFields = customFields.Result.Where(c => c.Type == CFTypeCode.DateTime)
                .Select(f => new SlimEntity(f.Id, f.Name, PermissionType.NotSet)).ToList();
            dateFields.Insert(0, new SlimEntity(DateFieldConstants.Created, Constants.i18n("createdOn"), PermissionType.NotSet));
            dateFields.Insert(1, new SlimEntity(DateFieldConstants.Modified, Constants.i18n("modifiedOn"), PermissionType.NotSet));
            dateFields.Insert(2, new SlimEntity(DateFieldConstants.Accessed, Constants.i18n("accessedOn"), PermissionType.NotSet));

            return Result(new { f = fList.Where(f => f.Active), rcs = rcats, sc = scRC.Result, cf = dateFields }, null, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Sets (updates/creates) a record category.
        /// </summary>
        public JsonResult RecordCategory(RecordCategory recordCategory)
        {
            var clientV2 = SvcBldr.AdministrationV2();
            var srRecCat = new SR<RecordCategory>();
            if (recordCategory.Id == Guid.Empty)
            {
                recordCategory.Id = Functions.NewSeq();
                srRecCat = clientV2.CreateRecordCategory(recordCategory);
            }
            else
            {
                srRecCat = clientV2.UpdateRecordCategory(recordCategory);
            }
            return Result(srRecCat.Result, srRecCat.Error);
        }
        /// <summary>
        /// Deletes a record category
        /// </summary>
        public JsonResult DeleteRecordCategory(Guid id)
        {
            var clientV2 = SvcBldr.AdministrationV2();
            var srRecCat = clientV2.DeleteRecordCategory(id);
            return Result(null, srRecCat.Error);
        }
        /// <summary>
        /// Sets (updates/creates) a freeze.
        /// </summary>
        public JsonResult Freeze(Freeze freeze)
        {
            var clientV2 = SvcBldr.AdministrationV2();
            freeze.EffectiveDate = DateTime.Now;
            var updatedFreeze = new SR<Freeze>();
            if (freeze.Id == Guid.Empty)
            {
                freeze.Id = Functions.NewSeq();
                updatedFreeze = clientV2.CreateFreeze(freeze);
            }
            else
            {
                updatedFreeze = clientV2.UpdateFreeze(freeze);
            }
            return Result(updatedFreeze.Result, updatedFreeze.Error);
        }
    }
}
