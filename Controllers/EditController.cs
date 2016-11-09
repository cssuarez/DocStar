using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.UI.Web.Models;
using System.IO;
using Astria.Framework.DataContracts;
using Astria.UI.ServiceInterop;
using Astria.Framework.Utility;
using System.Web.Script.Serialization;
using Astria.UI.Web.Utility;
using System.Dynamic;
using Astria.Framework.Core.DataContracts;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Astria.Framework.DataContracts.V2;


namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// Class for editing / saving data
    /// </summary>
    public class EditController : ControllerBase
    {
        [HttpPost]
        public JsonResult MergeDocuments(Guid[] ids)
        {
            var client = SvcBldr.DocumentV2();
            var length = ids.Length;
            if (length > 1)
            {
                var sourceIds = new Guid[length - 1];
                for (int i = 1; i < length; i++)
                {
                    sourceIds[i - 1] = ids[i];
                }

                var r = client.MergeDocuments(new MergeDocumentsPackage { DestinationDocumentId = ids[0], SourceDocumentIds = sourceIds });
                return Result(r.Result, r.Error);
            }
            return Result(false, null);
        }

        [HttpPost]
        public JsonResult DeleteItems(Guid[] documentIds, Guid[] inboxIds, Guid[] folderIds, bool overrideErrors = false)
        {
            ExceptionsML bizEx = null;
            var options = SvcBldr.Options;
            if (overrideErrors)
                SvcBldr.Options = ServiceRequestOptions.OverrideErrors;


            if (inboxIds != null && inboxIds.Length != 0)
            {
                var inbox = SvcBldr.InboxV2();
                var r = inbox.Delete(new InboxDeletePackage { DeleteDocuments = true, InboxIds = inboxIds });

                if (r.Error != null)
                {
                    if (r.Error.Type == new OverridableException().GetType().ToString())
                    {
                        if (bizEx == null)
                            bizEx = r.Error;
                        else
                            bizEx.Message += r.Error.Message;
                    }
                    else
                        return Result(null, r.Error);
                }
            }

            if (folderIds != null && folderIds.Length != 0)
            {
                var folder = SvcBldr.FolderV2();
                var r = folder.Delete(new FolderDeletePackage { DeleteDocuments = true, FolderIds = folderIds });
                if (r.Error != null)
                {
                    if (r.Error.Type == new OverridableException().GetType().ToString())
                    {
                        if (bizEx == null)
                            bizEx = r.Error;
                        else
                            bizEx.Message += r.Error.Message;
                    }
                    else
                        return Result(null, r.Error);
                }
            }
            if (bizEx != null)
            {
                bizEx.Message += Environment.NewLine + Constants.i18n("continueYesNo");
                return Result(null, bizEx);
            }
            if (documentIds != null && documentIds.Length != 0)
            {
                var client = SvcBldr.DocumentV2();
                var r = client.SoftDelete(documentIds);
                if (r.Error != null)
                    return Result(null, r.Error);
            }
            SvcBldr.Options = ServiceRequestOptions.NotSet;
            return Result(null, null);
        }

        [HttpPost]
        public JsonResult DeleteItemsOverride(Guid[] documentIds)
        {
            ExceptionsML bizEx = null;

            if (documentIds != null)
            {
                SvcBldr.Options = ServiceRequestOptions.OverrideErrors;
                var client = SvcBldr.DocumentV2();
                SvcBldr.Options = ServiceRequestOptions.NotSet;
                var r = client.SoftDelete(documentIds);
                if (r.Error != null)
                    return Result(null, r.Error);
            }
            return Result(null, bizEx);
        }

        [HttpPost]
        public JsonResult RemoveItems(Guid[] inboxIds, Guid[] folderIds)
        {
            var srDelete = new SR<Boolean>();
            srDelete.Error = null;
            if (inboxIds != null && inboxIds.Length > 0)
            {
                var inbox = SvcBldr.InboxV2();
                srDelete = inbox.Delete(new InboxDeletePackage { DeleteDocuments = false, InboxIds = inboxIds });
            }
            if (srDelete.Error == null && folderIds != null && folderIds.Length > 0)
            {
                var folder = SvcBldr.FolderV2();
                srDelete = folder.Delete(new FolderDeletePackage { DeleteDocuments = false, FolderIds = folderIds });
            }
            return Result(null, srDelete.Error);
        }
    }
}