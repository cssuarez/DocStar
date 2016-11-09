/// <reference path="_ServiceProxyCore.js" />
var DataLinkServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/DataLink.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getColumns: function (queryId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetColumns', 'POST', queryId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        executeQuery: function (queryId, documentId, paramsKVP, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { queryId: queryId, documentId: documentId, parameterValues: paramsKVP };
            spc.queueAjaxCall('ExecuteQuery', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        executeUpdate: function (queryId, documentId, paramsKVP, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { queryId: queryId, documentId: documentId, parameterValues: paramsKVP };
            spc.queueAjaxCall('ExecuteUpdate', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        executeQueryTest: function (queryId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ExecuteQueryTest', 'POST', queryId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        executeQueryTests: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ExecuteQueryTests', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        executeLiveQueryTest: function (connectionDTO, queryDTO, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { connection: connectionDTO, query: queryDTO };
            spc.queueAjaxCall('ExecuteLiveQueryTest', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        executeUpdateTest: function (queryId, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { queryId: queryId };
            spc.queueAjaxCall('ExecuteUpdateTest', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        executeUpdateTests: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ExecuteUpdateTests', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        executeLiveUpdateTest: function (connectionDTO, queryDTO, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { connection: connectionDTO, query: queryDTO };
            spc.queueAjaxCall('ExecuteLiveUpdateTest', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        executeAllTests: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ExecuteAllTests', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getDataLinkConnections: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetDataLinkConnections', 'GET', null, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getDataLinkConnection: function (connectionId, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { connectionId: connectionId };
            spc.queueAjaxCall('GetDataLinkConnection', 'GET', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        setDataLinkConnection: function (connectionDTO, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { connection: connectionDTO };
            spc.queueAjaxCall('SetDataLinkConnection', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteDataLinkConnection: function (connectionId, canDelete, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { connectionId: connectionId, canDelete: canDelete };
            spc.queueAjaxCall('DeleteDataLinkConnection', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getDataLinkQueries: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetDataLinkQueries', 'GET', null, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getDataLinkQuery: function (queryId, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { queryId: queryId };
            spc.queueAjaxCall('GetDataLinkQuery', 'GET', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        setDataLinkQuery: function (query, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { query: query };
            spc.queueAjaxCall('SetDataLinkQuery', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteDataLinkQuery: function (queryId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('DeleteDataLinkQuery', 'POST', queryId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getDSNNames: function (machineId, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { machineId: machineId };
            spc.queueAjaxCall('GetDSNNames', 'GET', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getDatalinkExecutables: function (machineId, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { machineId: machineId };
            spc.queueAjaxCall('GetDatalinkExecutables', 'GET', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getSQLServers: function (machineId, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { machineId: machineId };
            spc.queueAjaxCall('GetSQLServers', 'GET', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getSQLDatabases: function (machineId, server, userName, password, successFunc, failureFunc, completeFunc, cancellationToken) {
            var data = { machineId: machineId, server: server, userName: userName, password: password };
            spc.queueAjaxCall('GetSQLDatabases', 'POST', data, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getReportDataTypeAhead: function (getReportDataTypeAheadArgs, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetReportDataTypeAhead', 'POST', getReportDataTypeAheadArgs, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getAllArguments: function (c3piType, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAllArguments', 'POST', c3piType, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};