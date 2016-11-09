/// <reference path="_ServiceProxyCore.js" />
var LDAPServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/HostingV2/LDAP.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        get: function (connectionId, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Get', 'POST', connectionId, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        getAll: function (successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetAll', 'POST', undefined, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        create: function (ldapPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Create', 'POST', ldapPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        update: function (ldapPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Update', 'POST', ldapPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        deleteConnection: function (id, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('Delete', 'POST', id, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        /// <summary>
        /// Gets all groups in the specified node
        /// </summary>
        /// <param name=ldapGetQuery>Includes the following properties</param>
        /// ConnectionId - A valid LDAP Connection Id
        /// Node- the distinguished name of a container or OU, or blank to query the LDAP root
        /// Subtree-if true, returns groups in node and in all sub-items in the LDAP true; if false, performs a one level query, finding groups only directly under the node
        /// Username- username for ldap authentication; if blank, stored credentials (or default or anonymous) is used
        /// Password - password, if username is specified; ignored if username is blank
        /// <returns></returns>
        getGroups: function (ldapGetQuery, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetGroups', 'POST', ldapGetQuery, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        /// <summary>
        /// Gets all users in the specified node
        /// </summary>
        /// <param name=ldapGetQuery>Includes the following properties</param>
        /// ConnectionId - A valid LDAP Connection Id
        /// Node- the distinguished name of a container or OU, or blank to query the LDAP root
        /// Subtree-if true, returns groups in node and in all sub-items in the LDAP true; if false, performs a one level query, finding groups only directly under the node
        /// Username- username for ldap authentication; if blank, stored credentials (or default or anonymous) is used
        /// Password - password, if username is specified; ignored if username is blank
        /// <returns></returns>
        getUsers: function (ldapGetQuery, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetUsers', 'POST', ldapGetQuery, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        /// <summary>
        /// Gets all containers and OU's in the specified node
        /// </summary>
        /// <param name=ldapGetQuery>Includes the following properties</param>
        /// ConnectionId - A valid LDAP Connection Id
        /// Node- the distinguished name of a container or OU, or blank to query the LDAP root
        /// Subtree-if true, returns groups in node and in all sub-items in the LDAP true; if false, performs a one level query, finding groups only directly under the node
        /// Username- username for ldap authentication; if blank, stored credentials (or default or anonymous) is used
        /// Password - password, if username is specified; ignored if username is blank
        /// <returns></returns>
        getContainers: function (ldapGetQuery, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('GetContainers', 'POST', ldapGetQuery, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        /// <summary>
        /// Imports LDAP Users as E3 Users in the current instance, creating new ones or updating existing ones.
        /// </summary>
        /// <param name="importLDAPUsersPackage">Package containing the following properties</param
        /// ConnectionId - ConnectionId of the LDAP Connection which generated them
        /// Users - list of Users, including their Membership
        /// <returns></returns>
        importUsers: function (importLDAPUsersPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ImportUsers', 'POST', importLDAPUsersPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        },
        /// <summary>
        /// Imports LDAP Groups as E3 Roles, creating new ones or updating existing ones.
        /// </summary>
        /// <param name="importLDAPGroupsPackage">Package containing the following properties</param
        /// ConnectionId - ConnectionId of the LDAP Connection which generated them
        /// Groups - list of groups, including their Membership
        /// <returns></returns>
        importGroups: function (importLDAPGroupsPackage, successFunc, failureFunc, completeFunc, cancellationToken) {
            spc.queueAjaxCall('ImportGroups', 'POST', importLDAPGroupsPackage, successFunc, failureFunc, completeFunc, cancellationToken);
        }
    };
};