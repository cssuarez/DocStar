using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.Datalink;
using Astria.Framework.Utility;
using Astria.Framework.Datalink.Interfaces;
using Newtonsoft.Json;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// controller for data links
    /// </summary>
    public class DataLinkController : ControllerBase
    {
        /// <summary>
        /// Get data pertaining to Data Link Connections
        /// </summary>
        /// <returns>Data Link Connections</returns>
        public JsonResult GetDataLinkConnections()
        {
            var client = SvcBldr.DataLinkV2();
            var dataLinks = client.GetDataLinkConnections();
            return Result(dataLinks.Result, dataLinks.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Get a specific Data Link Connection
        /// </summary>
        /// <param name="datalinkId">Data Link Connection id</param>
        /// <returns>Data Link Connection</returns>
        public JsonResult GetDataLinkConnection(Guid datalinkId)
        {
            var client = SvcBldr.DataLinkV2();
            var datalink = client.GetDataLinkConnection(datalinkId);
            return Result(datalink.Result, datalink.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Sets a Data Link Connection (Create and Edit)
        /// </summary>
        /// <param name="dataLink">Data Link Connection to be updated</param>
        /// <param name="originalPassword">Ignored; formerly used to detect whether a password had changed and thereby if it required encryption, but 3 bells prefix is used now</param>
        /// <returns>Updated Data Link Connection</returns>
        public JsonResult SetDataLinkConnection(DataLinkConnectionJS dataLink, string originalPassword)
        {
            var client = SvcBldr.DataLinkV2();
            var package = new DataLinkConnectionPackage();

            if (dataLink.Id == Guid.Empty)
            {
                dataLink.Id = Functions.NewSeq();
                package.DataLinkConnection = dataLink.ToDataLinkConnection();
                package.DataLinkQueries = dataLink.DataLinkQueries;
                var result = client.CreateDataLinkConnection(package);
                if (result.Error != null)
                    return Result(null, result.Error);
                var dataLinkJS = result.Result.ToPackageJS();
                return Result(dataLink = dataLinkJS, result.Error, JsonRequestBehavior.AllowGet);
            }
            else
            {
                package.DataLinkConnection = dataLink.ToDataLinkConnection();
                var result = client.UpdateDataLinkConnection(package);
                return Result(new { Id = dataLink.Id, successResult = result.Result }, result.Error, JsonRequestBehavior.AllowGet);
            }
        }
        /// <summary>
        /// Deletes a datalink connection and all associated queries.
        /// </summary>
        /// <param name="datalinkId"></param>
        /// <param name="canDelete"></param>
        /// <returns></returns>
        public JsonResult DeleteDataLinkConnection(Guid datalinkId, bool canDelete = false)
        {
            var client = SvcBldr.DataLinkV2();
            DataLinkConnectionDeletePackage package = new DataLinkConnectionDeletePackage
                {
                    connectionId = datalinkId
                };
            var result = client.DeleteDataLinkConnection(package);
            return Result(null, result.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Get data pertaining to Data Link Queries
        /// </summary>
        /// <returns>Data Link Queries</returns>
        public JsonResult GetDataLinkQueries()
        {
            var client = SvcBldr.DataLinkV2();
            var dataLinkQueriesSR = client.GetDataLinkQueries();
            var dataLinkQueries = dataLinkQueriesSR.Result != null ? dataLinkQueriesSR.Result.OrderBy(r=>r.Name) : null;
            return Result(dataLinkQueries, dataLinkQueriesSR.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Get a specific Data Link Query
        /// </summary>
        /// <param name="queryId">Data Link Query id</param>
        /// <returns>Data Link Query</returns>
        public JsonResult GetDataLinkQuery(Guid queryId)
        {
            var client = SvcBldr.DataLinkV2();
            var dataLinkQuery = client.GetDataLinkQuery(queryId);
            return Result(dataLinkQuery.Result, dataLinkQuery.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Sets a Data Link Query (Create and Edit)
        /// </summary>
        /// <param name="query">Data Link Query to be updated</param>
        /// <returns>Updated Data Link Query</returns>
        public JsonResult SetDataLinkQuery(DataLinkQueryPackage query)
        {
            var client = SvcBldr.DataLinkV2();
            if (query.Id == Guid.Empty)
            {
                query.Id = Functions.NewSeq();
                var result = client.CreateDataLinkQuery(query);
                return Result(result.Result, result.Error,
                              JsonRequestBehavior.AllowGet);
            }
            else
            {
                var result = client.UpdateDataLinkQuery(query);
                
                return Result(new {id = query.Id, successResult = result.Result}, result.Error, JsonRequestBehavior.AllowGet);
            }
        }
        /// <summary>
        /// Deletes a datalink query
        /// </summary>
        /// <param name="queryId"></param>
        /// <returns></returns>
        public JsonResult DeleteDataLinkQuery(Guid queryId)
        {
            var client = SvcBldr.DataLinkV2();

            var result = client.DeleteDataLinkQuery(queryId);
            return Result(null, result.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Tests all queries for the current site.
        /// Uses saved parameters.
        /// </summary>
        /// <returns></returns>
        public JsonResult TestDataLinkQueries()
        {
            var client = SvcBldr.DataLinkV2();
            var dlqs = client.ExecuteQueryTests();
            return Result(dlqs.Result, dlqs.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Tests all updates for the current site
        /// Uses saved parameters.
        /// </summary>
        /// <returns></returns>
        public JsonResult TestDataLinkUpdates()
        {
            var client = SvcBldr.DataLinkV2();
            var result = client.ExecuteUpdateTests();
            return Result(null, result.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Tests the given query using saved parameters
        /// </summary>
        /// <param name="queryId"></param>
        /// <returns></returns>
        public JsonResult TestDataLinkQuery(Guid queryId)
        {
            var client = SvcBldr.DataLinkV2();
            var result = client.ExecuteQueryTest(queryId);
            return Result(result.Result, result.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Tests the given update using saved parameters
        /// </summary>
        /// <param name="queryId"></param>
        /// <returns></returns>
        public JsonResult TestDataLinkUpdate(Guid queryId)
        {
            var client = SvcBldr.DataLinkV2();
            var result = client.ExecuteUpdateTest(queryId);
            return Result(result.Result, result.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Allows for testing a datalink prior to saving settings.
        /// </summary>
        /// <param name="connection"></param>
        /// <param name="query"></param>
        /// <returns></returns>
        [HttpPost]
        public JsonResult TestDataLinkQueryLive(DataLinkConnection connection, DataLinkQueryPackage query)
        {
            var client = SvcBldr.DataLinkV2();
            var package = new ExecuteLiveQueryTestPackage
                {
                    connection = connection,
                    query = query
                };
            var result = client.ExecuteLiveQueryTest(package);
            return Result(result.Result, result.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Runs a given query using the passed in parameters
        /// </summary>
        /// <param name="queryId"></param>
        /// <param name="parameters"></param>
        /// <returns></returns>
        public JsonResult RunDataLinkQuery(Guid queryId, Dictionary<string,string> parameters)
        {
            var client = SvcBldr.DataLinkV2();
            var package = new ExecuteDataLinkPackage
                {
                    parameterValues = parameters,
                    queryId = queryId
                };
            var result = client.ExecuteQuery(package);
            return Result(result.Result, result.Error, JsonRequestBehavior.AllowGet);
        }
        /// <summary>
        /// Runs a given update using the passed in parameters
        /// </summary>
        /// <param name="queryId"></param>
        /// <param name="parameters"></param>
        /// <returns></returns>
        public JsonResult RunDataLinkUpdate(Guid queryId, Guid documentId, Dictionary<string, string> parameters)
        {
            var client = SvcBldr.DataLinkV2();
            var package = new ExecuteDataLinkPackage
                {
                    queryId = queryId,
                    documentId = documentId,
                    parameterValues = parameters
                };
            var result = client.ExecuteUpdate(package);
            return Result(result.Result, result.Error, JsonRequestBehavior.AllowGet);
        }
    }
}
