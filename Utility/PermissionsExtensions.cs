using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.Framework.DataContracts;

namespace Astria.UI.Web.Utility
{
    /// <summary>
    /// PermissionExtensions
    /// </summary>
    public static class PermissionsExtensions
    {
        /// <summary>
        /// CanManage is a permission to see the manage column in admin panel of software
        /// </summary>
        /// <param name="permissions"></param>
        /// <returns></returns>
        public static bool CanManage(this GatewayPermissions permissions)
        {
            return permissions.HasFlag(GatewayPermissions.Create_Edit_Groups) ||
                permissions.HasFlag(GatewayPermissions.Create_Edit_Users) ||
                permissions.HasFlag(GatewayPermissions.Delete_Groups) ||
                permissions.HasFlag(GatewayPermissions.Delete_Users) ||
                permissions.HasFlag(GatewayPermissions.Create_Security_Classes) ||
                permissions.HasFlag(GatewayPermissions.BuzzSpace) ||
                permissions.HasFlag(GatewayPermissions.Admin_Stamps);
        }
        /// <summary>
        /// CanProcess is the ability to see the Process column in the admin panel
        /// </summary>
        /// <param name="permissions"></param>
        /// <returns></returns>
        public static bool CanProcess(this GatewayPermissions permissions)
        {
            return permissions.HasFlag(GatewayPermissions.ContentType_Edit_Advanced) ||
                permissions.HasFlag(GatewayPermissions.Custom_Fields) ||
                permissions.HasFlag(GatewayPermissions.ManageCustomLists) ||
                permissions.HasFlag(GatewayPermissions.Admin_DataLink);
        }
        /// <summary>
        /// CanSettings is the ability to see the Settings column in the admin panel
        /// </summary>
        /// <param name="permissions"></param>
        /// <returns></returns>
        public static bool CanSettings(this GatewayPermissions permissions)
        {
            return permissions.HasFlag(GatewayPermissions.Company_Settings);
        }
        /// <summary>
        /// CanCompany is the ability to see the Company column in the admin panel
        /// </summary>
        /// <param name="permissions"></param>
        /// <returns></returns>
        public static bool CanCompany(this GatewayPermissions permissions)
        {
            return permissions.HasFlag(GatewayPermissions.ViewAudit)
                || permissions.HasFlag(GatewayPermissions.RecycleBin)
                || permissions.HasFlag(GatewayPermissions.LicenseView)
                || permissions.HasFlag(GatewayPermissions.View_DistributedQueues)
                || permissions.HasFlag(GatewayPermissions.Admin_DistributedQueues)
                || permissions.HasFlag(GatewayPermissions.Admin_LDAP)
                || permissions.HasFlag(GatewayPermissions.ImportJobs);
        }
        /// <summary>
        /// CanWorkflow is the ability to see the Workflow column in the admin panel
        /// </summary>
        /// <param name="permissions"></param>
        /// <returns></returns>
        public static bool CanWorkflow(this GatewayPermissions permissions)
        {
            return permissions.HasFlag(GatewayPermissions.Admin_Freezes)
                || permissions.HasFlag(GatewayPermissions.View_Freezes)
                || permissions.HasFlag(GatewayPermissions.Create_RecordCategories)
                || permissions.HasFlag(GatewayPermissions.WFAdmin);
        }

    }
}