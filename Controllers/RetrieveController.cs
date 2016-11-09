using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts.V2;
using Astria.UI.Web.Models;
using System.IO;
using Astria.Framework.DataContracts;
using Astria.UI.ServiceInterop;
using Astria.Framework.Utility;
using System.Web.Script.Serialization;
using Astria.UI.Web.Utility;
using System.Dynamic;
using Newtonsoft.Json;


namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// class used for retrieving data for the retrieval page (will be broken up into multiple controllers based on logic for jsmvc framework)
    /// </summary>
    public class RetrieveController : ControllerBase
    {
        /// <summary>
        /// display the basic retrieval page
        /// </summary>
        /// <returns></returns>
        public ViewResult Index()
        {
            return View();
        }
        /// <summary>
        /// sets search results
        /// </summary>
        public JsonResult Search(String searchRequest, int page, int rows, bool jqGrid = false, string sidx = "title", string sord = "desc")
        {
            var client = SvcBldr.SearchV2();
            // jqgrid page 1-based (not 0)

            var searchRequestObj = new SearchRequest();

            if (searchRequest != null)
            {
                searchRequestObj = JsonConvert.DeserializeObject<SearchRequest>(searchRequest);
            }
            searchRequestObj.MaxRows = rows;
            searchRequestObj.Start = (page - 1) * rows;
            searchRequestObj.SortBy = sidx;
            searchRequestObj.SortOrder = sord;
            var sr1 = client.Search(searchRequestObj);
            if (sr1.Error != null)
            {
                return Result(null, sr1.Error);
            }
            if (!jqGrid)
            {
                return Result(sr1.Result, sr1.Error);
            }
            var sr2 = client.GetCustomFields();
            if (sr2.Error != null)
                return Result(null, sr2.Error);

            var length = sr2.Result.Length;
            var cf = new String[length];
            for (int i = 0; i < length; i++)
            {
                cf[i] = sr2.Result[i].DisplayName;
            }
            var jqGridData = ConvertToJQGrid(sr1.Result, page, rows, cf);
            var data = new { jqGridData = jqGridData, request = sr1.Result.Request };
            return Result(data, null, JsonRequestBehavior.AllowGet);

        }
        /// <summary>
        /// Get Documents by Id
        /// </summary>
        [HttpPost]
        public JsonResult GetInboxContents(string inboxId, int start, int count, string sortColumn)
        {
            var obj = GetInboxDocuments(inboxId, start, count, sortColumn);
            return Result(obj.Result, obj.BizEx);
        }
        /// <summary>
        /// Get Inbox by name
        /// </summary>
        [HttpGet]
        public JsonResult GetInboxContentsByName(string inboxPath, int start, int count, string sortColumn)
        {
            var result = GetInboxDocumentsByName(inboxPath, start, count, sortColumn);
            return Result(result.Result, result.BizEx);
        }
        /// <summary>
        /// Get Folder Contents by path
        /// </summary>
        [HttpGet]
        public JsonResult GetFolderContentsByPath(string folderPath, int start, int count, string sortColumn)
        {
            var result = GetFolderDocumentsByPath(folderPath, start, count, sortColumn);
            return Result(result.Result, result.BizEx, JsonRequestBehavior.AllowGet);
        }
        private ServiceReturn GetFolderDocumentsByPath(string folderPath, int start, int count, string sortColumn)
        {
            // Remove trailing / so only folder name is passed
            if (folderPath.LastIndexOf('/') == folderPath.Length - 1)
            {
                folderPath = folderPath.Remove(folderPath.LastIndexOf('/'));
            }
            ServiceReturn result = new ServiceReturn();
            ExceptionsML bizEx = null;
            if (count == 0)
            {
                count = 1000;
            }
            var folderClient = SvcBldr.FolderV2();
            // If the folder is the root, get all children
            if (folderPath == Constants.i18n("folders"))
            {
                // if the root, pass in an empty path (null works too)
                folderPath = string.Empty;
            }
            else
            {
                // If the folder is below the root remove the root from the path
                string[] foldBelowRoot = folderPath.Split('/');
                var len = foldBelowRoot.Length;
                folderPath = string.Join("/", foldBelowRoot, 1, len - 1);
            }
            var sr = folderClient.SearchByPath(new SearchByPathPackage { EntityPath = folderPath, Count = count, SortColumn = sortColumn, Start = start });
            if (sr.Error != null)
            {
                result.BizEx = bizEx;
                return result;
            }
            if (sr.Result == null)
            {
                result.BizEx = new ExceptionsML() { Message = Constants.i18n("folderDoesNotExist") };
                return result;
            }
            result.Result = sr.Result;
            return result;
        }
        private ServiceReturn GetInboxDocuments(string inboxId, int start, int count, string sortColumn)
        {
            if (count == 0)
                count = 1000;
            var sr = new SearchRequest
            {
                Start = start,
                MaxRows = count,
                InboxId = new Guid(inboxId),
                IncludeDocuments = true,
                SortBy = sortColumn
            };
            var client = SvcBldr.SearchV2();
            var sr1 = client.Search(sr);

            var result = new ServiceReturn();
            result.Result = sr1.Result;
            result.BizEx = sr1.Error;
            return result;
        }
        private ServiceReturn GetInboxDocumentsByName(string inboxPath, int start, int count, string sortColumn)
        {
            // Remove trailing / so only folder name is passed
            if (inboxPath.LastIndexOf('/') == inboxPath.Length - 1)
            {
                inboxPath = inboxPath.Remove(inboxPath.LastIndexOf('/'));
            }
            var client = SvcBldr.InboxV2();
            var sr = client.SearchByPath(new SearchByPathPackage { EntityPath = inboxPath, Count = count, Start = start, SortColumn = sortColumn });
            return new ServiceReturn { BizEx = sr.Error, Result = sr.Result };
        }
        private JQGridWFData ConvertToJQGrid(SearchResults<SearchableEntity> result, int page, int rows, String[] cf)
        {
            var curUser = AstriaCookie.GetUserId();
            var jqGridData = new JQGridWFData
                {
                    total = (int)Math.Ceiling((float)result.Total / rows),
                    page = page,
                    records = result.Results.Count,
                    rows = result.Results.Select(r => new JQGridRelatedRow(r, curUser, cf)).ToList()
                };
            if (result.ResultId != Guid.Empty)
            {
                jqGridData.ResultId = result.ResultId;
            }
            return jqGridData;
        }
    }

}
