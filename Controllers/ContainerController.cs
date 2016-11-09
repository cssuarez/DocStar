using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.Utility;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts;
using Astria.UI.Web.Utility;
using Astria.Framework.DataContracts.V2;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// used for displaying containers
    /// </summary>
    public class ContainerController : ControllerBase
    {
        /// <summary>
        /// root node for document
        /// </summary>
        public const string ROOTNODE = "Root";
        /// <summary>
        /// Gets All inboxes 
        /// The data returned is in JSTree JSON_DATA format.
        /// </summary>
        /// <param name="ParentId">Id of the parent inbox, currently not used.</param>
        /// <param name="Depth">Depth of the inbox hierarchy to traverse</param>
        [HttpGet]
        public JsonResult GetAllInboxes(String ParentId = "", Int32 Depth = 1)
        {
            var client = SvcBldr.InboxV2();
            if (!String.IsNullOrEmpty(ParentId)) //Return Empty array for now, if in the future we support subInboxes we will need to remove this.
            {
                return Result(new List<JSTreeData>(), null, JsonRequestBehavior.AllowGet);
            }

            var result = new JSTreeData("Inboxes");
            var sr = client.GetSlim();
            if (sr.Error != null)
            {
                return Result(null, sr.Error, JsonRequestBehavior.AllowGet);
            }
            result.children = JSTreeFormat.ConvertToJSTreeFormat(sr.Result);

            return Result(result, sr.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Gets All folders within a given parent id. 
        /// The data returned is in JSTree JSON_DATA format.
        /// </summary>
        /// <param name="ParentId">Id of the folder to get children of. Blank or Guid.Empty will result in getting the topmost folders.</param>
        /// <param name="Depth">Depth to recurs the hierarchy</param>
        /// <param name="includeParent">Obtain parent and children</param>
        [HttpGet]
        public JsonResult GetFolderChildren(String ParentId = "", Int32 Depth = 1, bool includeParent = false)
        {
            ////If we are requesting the root node then return an empty list. This should only happen on systems with 0 folders.
            if (ParentId == ROOTNODE)
            {
                return Result(new List<JSTreeData>(), null, JsonRequestBehavior.AllowGet);
            }
            Guid? rootNodeId = String.IsNullOrWhiteSpace(ParentId) ? null : new Guid?(new Guid(ParentId));
            var clientV2 = SvcBldr.FolderV2();
            var foldRecursionArgs = new FolderRecursionArgs
            {
                ParentId = rootNodeId,
                Depth = Depth
            };
            var srChildren = clientV2.GetChildren(foldRecursionArgs);
            if (srChildren.Error != null)
            {
                return Result(null, srChildren.Error);
            }
            var children = srChildren.Result;
            var subNodes = JSTreeFormat.ConvertToJSTreeFormat(children);
            if (rootNodeId == null) // Is the Root Folder
            {
                var rootNode = new JSTreeData("Folders");
                rootNode.children = subNodes;
                return Result(rootNode, srChildren.Error, JsonRequestBehavior.AllowGet);
            }
            else
            {
                if (includeParent)
                {
                    var srRoot = clientV2.Get(rootNodeId.Value);
                    if (srRoot.Error != null)
                    {
                        return Result(null, srRoot.Error, JsonRequestBehavior.AllowGet);
                    }
                    if (srRoot.Result != null)
                    {
                        var rootNode = new JSTreeData(srRoot.Result.Title);
                        rootNode.children = subNodes;
                        rootNode.attr.Id = rootNodeId.ToString();
                        return Result(rootNode, srChildren.Error, JsonRequestBehavior.AllowGet);
                    }
                    else
                    {
                        return Result(null, ExceptionsML.GetExceptionML(new Exception(Constants.i18n("parentFolderNotFound"))), JsonRequestBehavior.AllowGet);
                    }
                }
                else
                {
                    return Result(subNodes, srChildren.Error, JsonRequestBehavior.AllowGet);
                }
            }
        }

        [HttpGet]
        public JsonResult FolderIsEmpty(Guid folderId)
        {
            var clientV2 = SvcBldr.SearchV2();
            var result = clientV2.Search(new SearchRequest {FolderId = folderId, IncludeDocuments = true, IncludeFolders = true, IncludeInboxes = true, MaxRows = 1});
            if (result.Error != null)
            {
                return Result(null, result.Error, JsonRequestBehavior.AllowGet);
            }
            return Result(result.Result.Results.Count <= 0, null, JsonRequestBehavior.AllowGet);
        }

        [HttpGet]
        public JsonResult InboxIsEmpty(Guid inboxId)
        {
            var clientV2 = SvcBldr.SearchV2();
            var result = clientV2.Search(new SearchRequest { InboxId = inboxId, IncludeDocuments = true, IncludeFolders = true, IncludeInboxes = true, MaxRows = 1});
            if (result.Error != null)
            {
                return Result(null, result.Error, JsonRequestBehavior.AllowGet);
            }
            return Result(result.Result.Results.Count <= 0, null, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Gets all containers and OU's in the specified node
        /// </summary>
        /// <param name="idStr">A valid LDAP Connection Id</param>
        /// <param name="node">the distinguished name of a container or OU, or blank to query the LDAP root</param>
        /// <param name="subtree">if true, returns "node" itself plus all containers and OUs anywhere below 'node' in the tree; if false, returns only immediate children of "node"</param>
        /// <param name="username">username for ldap authentication; if blank, stored credentials (or default or anonymous) is used</param>
        /// <param name="password">password, if username is specified; ignored if username is blank</param>
        /// <returns></returns>
        [HttpGet]
        public JsonResult GetLDAPContainers(string idStr, string node, bool subtree, string username, string password)
        {
            var ldapSvc = SvcBldr.LDAPV2();
            var pkg = new LDAPGetQuery { ConnectionId = new Guid(idStr), Node = node, Subtree = subtree, Username = username, Password = password };
            var sr = ldapSvc.GetContainers(pkg);
            if (sr.Error != null)
            {
                return Result(null, sr.Error);
            }
            var treeData = JSTreeFormat.ConvertToJSTreeFormat(sr.Result.ToList());
            return Result(treeData, sr.Error);
        }
    }
}
