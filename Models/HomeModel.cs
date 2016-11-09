using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Astria.UI.ServiceInterop;
using Astria.Framework.DataContracts;
using Astria.UI.Web.Controllers;
using System.Web.Script.Serialization;
using System.Web.Mvc;
using System.Runtime.Caching;
using System.IO;
using Astria.Framework.Utility;
using System.Reflection;
using System.Diagnostics;
using Astria.UI.Web.Utility;
using System.Data.SqlTypes;
using Astria.Framework.DataContracts.V2;
using System.Web.Configuration;
using System.Configuration;
using Newtonsoft.Json;

namespace Astria.UI.Web.Models
{
    /// <summary>
    /// gets the home model
    /// </summary>
    public class HomeModel : ModelBase
    {
        public string HelpURI { get; set; }
        public bool IsLoggedIn { get; set; }
        public string SignOutReason { get; set; }
        public string Version { get; set; }
        public String CurrentDBName { get; set; }
        public String DefaultDBName { get; set; }
        public Guid DefaultInstanceId { get; set; }
        public CompanyInstance[] Instances { get; set; }
        /// <summary>
        /// Message for redirecting to Login Page.
        /// </summary>
        public new string Message { get; set; }
        /// <summary>
        /// Debug mode
        /// </summary>
        public Boolean Debug { get; set; }
        /// <summary>
        /// Current User
        /// </summary>
        public string CurrentUser { get; set; }
        /// <summary>
        /// inbox data
        /// </summary>
        public string InboxData { get; set; }
        /// <summary>
        /// folder data
        /// </summary>
        public string FolderData { get; set; }
        /// <summary>
        /// Advanced Import Data
        /// </summary>
        public string ImportData { get; set; }
        /// <summary>
        /// Bulk Data - for initial load
        /// </summary>
        public string BulkData { get; set; }
        /// <summary>
        /// Host Bulk Data - for initial load of any host data
        /// </summary>
        public string HostBulkData { get; set; }
        /// <summary>
        /// Common JSMVC Templates
        /// </summary>
        public string CommonTemplates { get; set; }
        /// <summary>
        /// System Preferences
        /// </summary>
        public string SystemPreferences { get; set; }
        /// <summary>
        /// SystrayConnections
        /// </summary>
        public string SystrayConnections { get; set; }
        /// <summary>
        /// AutomationConnections
        /// </summary>
        public string AutomationConnections { get; set; }
        /// <summary>
        /// List of Licenses the instance has.
        /// </summary>
        public List<TokenKey> Licenses { get; set; }
        /// <summary>
        /// Count of approvals assigned to the current user since last viewing of approvals.
        /// </summary>
        public int NewApprovals { get; set; }
        /// <summary>
        /// Count of workflows assigned to the current user since last viewing of workflows.
        /// </summary>
        public int NewWorkflows { get; set; }
        public string UserMessages { get; set; }
        public bool Unlicensed { get; set; }
        public int MaxRequestLength { get; set; }
        public ContentTypePackage[] ContentTypes { get; set; }
        public HomeModel()
            : this("")
        {

        }
        public HomeModel(ServiceBuilder sb)
            : this("")
        {
            _sb = sb;
            Licenses = new List<TokenKey>();
        }
        /// <summary>
        /// home model
        /// </summary>
        public HomeModel(string message)
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            Version = FileVersionInfo.GetVersionInfo(asm.Location).FileVersion;
            Message = message;

            HelpURI = Functions.GetSetting(Constants.HELPURL, "http://www.docstar.com/help");
#if DEBUG
            Debug = true;
#endif
        }

        /// <summary>
        /// load data for the home model
        /// </summary>
        public void LoadData(string baseUri)
        {
            var bulkClient = _sb.BulkDataV2();
            var hostBulkData = bulkClient.GetHostData();
            ExceptionsML.Check(hostBulkData.Error);

            HostBulkData = JsonConvert.SerializeObject(hostBulkData);

            CurrentDBName = hostBulkData.Result.CurrentDB;
            DefaultDBName = hostBulkData.Result.DefaultDB;
            DefaultInstanceId = hostBulkData.Result.DefaultInstanceId;
            Instances = hostBulkData.Result.UserCompanyInstances;
            SystemPreferences = JsonConvert.SerializeObject(hostBulkData.Result.CompanySettings);
            SystrayConnections = JsonConvert.SerializeObject(hostBulkData.Result.SysTrayConnections);
            AutomationConnections = JsonConvert.SerializeObject(hostBulkData.Result.AutomationConnections);
            HttpRuntimeSection httpRuntimeSection = ConfigurationManager.GetSection("system.web/httpRuntime") as HttpRuntimeSection;
            MaxRequestLength = httpRuntimeSection.MaxRequestLength;
            DateTime? lastChecked = null;
            if (hostBulkData.Result.UserSettings.ContainsKey(Constants.WORKFLOW_LAST_CHECKED))
                lastChecked = DateTime.Parse(hostBulkData.Result.UserSettings[Constants.WORKFLOW_LAST_CHECKED]);

            var bulkData = bulkClient.Get(lastChecked);
            ExceptionsML.Check(bulkData.Error);
            BulkData = JsonConvert.SerializeObject(bulkData);
            var result = bulkData.Result;
            UserMessages = result.ExpiringMessage;
            var importData = new AdvancedImportData();
            var licenseTokens = result.LicenseTokens;
            if (licenseTokens != null)
            {
                Licenses.AddRange(licenseTokens);
            }
            if (!Licenses.Any(r => (TokenKey)r == TokenKey.View))
            {
                Unlicensed = true;
            }
            // Gateway permissions
            importData.GatewayPermissions = result.GatewayPermissions;
            var user = result.CurrentUser;
            _baseCache.Remove(USERINFO + user.Id.ToString());
            _baseCache.Add(USERINFO + user.Id.ToString(), new object[] { user, result.GatewayPermissions }, new CacheItemPolicy());
            LoadUserData();
            CurrentUser = JsonConvert.SerializeObject(new { Name = user.Username, Id = user.Id, HasPassword = HasPassword });
            importData.RootFolder = result.RootFolders;
            var rootNode = new JSTreeData(Constants.i18n("folders"));
            rootNode.children = JSTreeFormat.ConvertToJSTreeFormat(importData.RootFolder);
            FolderData = JsonConvert.SerializeObject(rootNode);

            // Inbox data
            var inboxes = new JSTreeData(Constants.i18n("inboxes"));
            importData.Inboxes = result.Inboxes.ToList();
            inboxes.children = JSTreeFormat.ConvertToJSTreeFormat(result.Inboxes);
            InboxData = JsonConvert.SerializeObject(inboxes);
            // Security Class Data
            importData.SecurityClasses = result.SecurityClasses.ToList();
            // Content Type Data
            ContentTypes = result.ContentTypes;
            importData.ContentTypes = new List<ContentTypeLight>();
            foreach (var ct in ContentTypes)
            {
                importData.ContentTypes.Add(new ContentTypeLight
                {
                    Id = ct.Id,
                    Name = ct.Name,
                    DefaultFolderName = "", //TODO: scain need to obtain the default folder Name
                    DefaultFolderId = ct.DefaultFolderId,
                    DefaultInboxId = ct.DefaultInboxId,
                    DefaultSecurityClassid = ct.DefaultSecurityClassId,
                    DefaultWorkflowId = ct.DefaultWorkflowId,
                    EffectivePermissions = ct.EffectivePermissions
                });
            }

            NewApprovals = result.NewApprovals;
            NewWorkflows = result.NewWorkflows;
            importData.Workflows = result.Workflows.ToList();
            ImportData = JsonConvert.SerializeObject(importData);
            var views = GetCachedViews(baseUri);
            CommonTemplates = JsonConvert.SerializeObject(views);
        }
    }
}