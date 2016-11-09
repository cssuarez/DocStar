using Astria.Framework.DataContracts;
using Astria.Framework.DataContracts.V2;
using Astria.Framework.Utility;
using Astria.UI.Web.Models;
using Astria.UI.Web.Utility;
using Components.Workflow;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web.Mvc;
using Astria.Framework.DataContracts.V2Extensions;

namespace Astria.UI.Web.Controllers
{
    /// <summary>
    /// 
    /// </summary>
    public class WorkflowDesignerController : ControllerBase
    {
        /// <summary>
        /// Provides the Webpage for the Workflow Designer.
        /// </summary>
        public ViewResult Index()
        {
            var model = new HomeModel();
            model.ServerURI = GetServerURI();
            return View(model);
        }
        /// <summary>
        /// Retrieves all data required by the designer
        /// </summary>
        public JsonResult GetData()
        {
            var wfSvc = SvcBldr.WorkflowV2();
            var secSvc = SvcBldr.SecurityV2();
            var ibxSvc = SvcBldr.InboxV2();
            var companySvc = SvcBldr.Company();
            var adminSvc = SvcBldr.AdministrationV2();
            var userSvc = SvcBldr.UserV2();
            var dlSvc = SvcBldr.DataLinkV2();
            var ctSvc = SvcBldr.ContentTypeV2();
            var cfSvc = SvcBldr.CustomFieldV2();
            var licSvc = SvcBldr.LicenseV2();
            var docSVC = SvcBldr.DocumentV2();
            var searchSvc = SvcBldr.SearchV2();
            var tokens = licSvc.GetLicenseTokens();

            if (tokens.Error != null)
            {
                return Result(null, tokens.Error);
            }

            var dbFieldsSR = searchSvc.GetFields();
            if (dbFieldsSR.Error != null)
            {
                return Result(null, dbFieldsSR.Error);
            }
            var dbFields = dbFieldsSR.Result;
            var advancedWF = false;
            if (tokens.Result != null)
            {
                advancedWF = tokens.Result.HasTokenKey(TokenKey.AdvancedWorkflow);
            }
            var customLists = adminSvc.GetCustomListsSlim();
            if (customLists.Error != null)
                return Result(null, customLists.Error);

            var userPrefsSR = userSvc.GetPreferences();
            if (userPrefsSR.Error != null)
                return Result(null, userPrefsSR.Error);

            var userPrefsKVP = new Dictionary<String, String>();
            var upLen = userPrefsSR.Result.Length;
            for (int i = 0; i < upLen; i++)
            {
                if (userPrefsKVP.ContainsKey(userPrefsSR.Result[i].Key))
                    continue;
                userPrefsKVP.Add(userPrefsSR.Result[i].Key, userPrefsSR.Result[i].Value);
            }

            var allTasks = TaskDesignProperties.GetAll();
            var uiTasks = allTasks.Where(r => r.NeedsUserInput);
            var clientTasks = allTasks.Where(r => r.NeedsClientService);
            var autoTasks = allTasks.Where(r => !r.NeedsClientService && !r.NeedsUserInput).ToList();


            var actionLibrary = wfSvc.GetActionLibrarySlim();
            if (actionLibrary.Error != null)
                return Result(null, actionLibrary.Error);

            actionLibrary.Result.Append(new SlimActionLibraryItem()
            {
                Id = Guid.Empty,
                EffectivePermissions = (int)PermissionType.Full,
                Name = Constants.i18n("newTitle"),
                Type = (int)WFActionType.LibraryItem
            });

            var wfNames = wfSvc.GetSlim();
            if (wfNames.Error != null)
                return Result(null, wfNames.Error);
            var wfNamesWithNew = wfNames.Result.Prepend(new SlimEntity(Guid.Empty, Constants.i18n("newTitle"), PermissionType.Full));

            var inboxes = ibxSvc.GetSlim();
            if (inboxes.Error != null)
                return Result(null, inboxes.Error);

            var inboxNVP = inboxes.Result.ToDictionary(k => k.Id.ToString(), v => v.Name);
            var contentTypes = ctSvc.GetContentTypesSlim();
            if (contentTypes.Error != null)
                return Result(null, contentTypes.Error);

            var ctNVP = contentTypes.Result.ToDictionary(k => k.Id.ToString(), v => v.Name);


            var securityClasses = secSvc.GetAllSecurityClassesSlim();
            if (securityClasses.Error != null)
                return Result(null, securityClasses.Error);

            var scNVP = securityClasses.Result.ToDictionary(k => k.Id.ToString(), v => v.Name);

            var users = userSvc.GetAll();
            if (users.Error != null)
            {
                return Result(null, users.Error);
            }
            var slimUsers = users.Result.Select(r => new { Id = r.Id, Username = r.Username, Flags = r.Flags, SiteUser = r.SiteUser }).ToList();

            var roles = secSvc.GetAllRolesSlim();
            if (roles.Error != null)
                return Result(null, roles.Error);

            var rolesNVP = roles.Result.ToDictionary(k => k.Id.ToString(), v => v.Name);
            var customFields = cfSvc.GetCustomFields();
            if (customFields.Error != null)
                return Result(null, customFields.Error);

            var customFieldsNVP = customFields.Result.ToDictionary(k => k.Id.ToString(), v => v.Name);

            var cfGroupsSR = cfSvc.GetGroups();
            if (cfGroupsSR.Error != null)
                return Result(null, cfGroupsSR.Error);

            var docProps = WFDocMeta.GetProperties();
            var args = new Dictionary<string, WFMetaPropertyInfo>
                {
                    {
                        Constants.i18n("argSysCurrUser"),
                        new WFMetaPropertyInfo()
                            {
                                Name = Argument.SystemProperty(SystemArguments.CurrentUser),
                                ReadOnly = true,
                                PropertyType = CFTypeCode.Object,
                                SupportedActionType = WFActionType.SyncVerifyAction | WFActionType.AutoRun
                            }
                    },
                    {
                        Constants.i18n("argSysNow"),
                        new WFMetaPropertyInfo()
                            {
                                Name = Argument.SystemProperty(SystemArguments.Now),
                                ReadOnly = true,
                                PropertyType = CFTypeCode.DateTime,
                                SupportedActionType = WFActionType.SyncVerifyAction | WFActionType.AutoRun
                            }
                    },
                    {
                        Constants.i18n("argSysToday"),
                        new WFMetaPropertyInfo()
                            {
                                Name = Argument.SystemProperty(SystemArguments.Today),
                                ReadOnly = true,
                                PropertyType = CFTypeCode.DateTime,
                                SupportedActionType = WFActionType.SyncVerifyAction | WFActionType.AutoRun
                            }
                    },
                    {
                        Constants.i18n("argSysTomorrow"),
                        new WFMetaPropertyInfo()
                            {
                                Name = Argument.SystemProperty(SystemArguments.Tomorrow),
                                ReadOnly = true,
                                PropertyType = CFTypeCode.DateTime,
                                SupportedActionType = WFActionType.SyncVerifyAction | WFActionType.AutoRun
                            }
                    },
                    {
                        Constants.i18n("argDocFolder"),
                        new WFMetaPropertyInfo()
                            {
                                Name = Argument.DocProperty(Argument.FOLDERS),
                                ReadOnly = true,
                                PropertyType = CFTypeCode.Object,
                                SupportedActionType = WFActionType.SyncAutoRunAction
                            }
                    },
                    {
                        Constants.i18n("argDocText"),
                        new WFMetaPropertyInfo()
                            {
                                Name = Argument.DocProperty(Argument.TEXT),
                                ReadOnly = false,
                                PropertyType = CFTypeCode.String,
                                Indexable = true,
                                SupportedActionType = WFActionType.SyncVerifyAction | WFActionType.AutoRun
                            }
                    }
                };
            foreach (var docProp in docProps)
            {
                args.Add(Constants.i18n("argDoc" + docProp.Name), new WFMetaPropertyInfo() { Name = Argument.DocProperty(docProp.Name), ReadOnly = docProp.ReadOnly, PropertyType = docProp.PropertyType, SupportedActionType = docProp.SupportedActionType });
            }
            foreach (var cf in customFields.Result)
            {
                args.Add(String.Format(Constants.i18n("argDocCustomField"), cf.Name), new WFMetaPropertyInfo() { Name = Argument.DocCustomField(cf.Name), ReadOnly = false, PropertyType = cf.Type, SupportedActionType = WFActionType.SyncVerifyAction | WFActionType.AutoRun });
            }
            var orderedArgs = args.OrderBy(r => r.Key).ToDictionary(k => k.Key, v => v.Value);
            var datalinks = new SR<DataLinkQueryPackage[]>();
            if (!(tokens.Result != null && tokens.Result.HasTokenKey(TokenKey.DataLink)))
            {
                autoTasks.Remove(autoTasks.First(r => r.TaskClassName == "DatalinkTask"));
            }
            else
            {
                datalinks = dlSvc.GetDataLinkQueries();
                if (datalinks.Error != null)
                    return Result(null, datalinks.Error);
            }
            var recognitionOptions = docSVC.GetRecognitionOptions();
            if (recognitionOptions.Error != null)
                return Result(null, recognitionOptions.Error);

            var xml = this.GetHelpXML("en"); // TRANSLATE THIS FRIGGIN KEY ;)
            var retObj = new
            {
                HelpXMLString = xml,
                BuiltInArgs = orderedArgs,
                ActionLibrary = actionLibrary.Result,
                UITasks = uiTasks,
                ClientTasks = clientTasks,
                AutoTasks = autoTasks,
                Workflows = wfNamesWithNew,
                Inboxes = inboxNVP,
                ContentTypes = ctNVP,
                CustomFields = customFieldsNVP,
                SecurityClasses = scNVP,
                Users = slimUsers,
                Roles = rolesNVP,
                AdvancedWF = advancedWF,
                CustomLists = customLists.Result,
                Datalinks = datalinks.Result,
                UserPreferences = userPrefsKVP,
                CustomFieldGroups = cfGroupsSR.Result,
                RecognitionOptions = recognitionOptions.Result,
                DatabaseFields = dbFields
            };
            return Result(retObj, null);
        }
        /// <summary>
        /// Creates a new step XML based on a workflowId
        /// </summary>
        public JsonResult NewStep(Guid workflowId)
        {
            var content = String.Format("<root Status=\"ok\" Message=\"\">" +
                "<WFStepDTO xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.eclipse.docstar.com/ns/\">" +
                "<Actions></Actions>" +
                "<AssigneeMode>0</AssigneeMode>" +
                "<AssigneeRRNext>0</AssigneeRRNext>" +
                "<BranchMode>0</BranchMode>" +
                "<DefaultAssignee>00000000-0000-0000-0000-000000000000</DefaultAssignee>" +
                "<DesignerData></DesignerData>" +
                "<Id>{0}</Id>" +
                "<Name>-- New --</Name>" +
                "<WFBranches></WFBranches>" +
                "<WorkflowId>{1}</WorkflowId>" +
                "</WFStepDTO>" +
                "</root>",
                Functions.NewSeq(),
                workflowId);
            return Result(content, null);
        }
        /// <summary>
        /// Creates a new branch with a source and destination
        /// </summary>
        public JsonResult NewBranch(Guid sourceStep, Guid? destinationStep, int sequence = 1)
        {
            var content = String.Format("<root Status=\"ok\" Message=\"\"> " +
                "<WFBranchDTO xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://www.eclipse.docstar.com/ns/\">" +
                "<Condition></Condition>" +
                "<Description></Description>" +
                "<DesignerData></DesignerData>" +
                "<DestinationStepId>{3}</DestinationStepId>" +
                "<DestinationStepName></DestinationStepName>" +
                "<Enabled>true</Enabled>" +
                "<Id>{0}</Id>" +
                "<Label></Label>" +
                "<Sequence>{2}</Sequence>" +
                "<StepId>{1}</StepId>" +
                "</WFBranchDTO>" +
                "</root>",
                Functions.NewSeq(),
                sourceStep,
                sequence,
                destinationStep == null ? "" : destinationStep.ToString());
            return Result(content, null);
        }
        /// <summary>
        /// Returns a new Action for a given step
        /// </summary>
        public JsonResult NewAction(Guid stepId, int sequence)
        {
            var wfSvc = SvcBldr.WorkflowV2();
            var sr = wfSvc.GetNewActionXml(new WFActionGetArgs { StepId = stepId, Sequence = sequence });
            return Result(sr.Result, sr.Error);
        }
        /// <summary>
        /// Returns a new Task for a given action, with the task class and sequence filled out.
        /// </summary>
        public JsonResult NewTask(Guid actionId, string taskClass, int sequence)
        {
            var wfSvc = SvcBldr.WorkflowV2();
            var sr = wfSvc.GetNewTaskXml(new WFTaskGetArgs { ActionId = actionId, TaskClassName = taskClass, Sequence = sequence });
            return Result(sr.Result, sr.Error);
        }
        /// <summary>
        /// Creates a new Action based on a library item template.
        /// </summary>
        public JsonResult NewActionFromLibrary(Guid actionLibId, Guid stepId, int sequence)
        {
            return GetLibraryItem(actionLibId, stepId, sequence, true);
        }
        /// <summary>
        /// Editing or Adding a new library item
        /// </summary>
        /// <param name="actionLibId"></param>
        /// <param name="stepId"></param>
        /// <param name="sequence"></param>
        /// <returns></returns>
        public JsonResult EditActionFromLibrary(Guid actionLibId, Guid stepId, int sequence)
        {
            return GetLibraryItem(actionLibId, stepId, sequence, false);
        }

        /// <summary>
        /// Deletes an action library item.
        /// </summary>
        public JsonResult DeleteActionLibraryItem(Guid actionId)
        {
            var wfSvc = SvcBldr.WorkflowV2();
            var sr = wfSvc.DeleteWorkflowAction(actionId);
            return Result(sr.Result, sr.Error);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="workflowId"></param>
        /// <param name="replacementWorkflowId"></param>
        /// <returns></returns>
        public JsonResult Delete(Guid workflowId, Guid replacementWorkflowId)
        {
            var wfSvc = SvcBldr.WorkflowV2();
            var sr = wfSvc.DeleteReplaceWorkflow(new DeleteWorkflowPackage { WorkflowId = workflowId, ReplacementId = replacementWorkflowId });
            return Result(sr.Result, sr.Error);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <returns></returns>
        public String GetHelpXML(string locale)
        {
            var asm = typeof(Components.Workflow.TaskBase).Assembly;
            var name = asm.GetManifestResourceNames().Where(n => n.EndsWith("task-" + locale + ".xml")).FirstOrDefault();
            Stream strm = asm.GetManifestResourceStream(name);
            StreamReader sr = new StreamReader(strm);
            String xml = sr.ReadToEnd();
            strm.Close();
            sr.Close();
            return xml;
        }

        private JsonResult GetLibraryItem(Guid actionLibId, Guid stepId, int sequence, bool resetType)
        {
            if (actionLibId == Guid.Empty)
                return NewAction(stepId, sequence);
            var wfSvc = SvcBldr.WorkflowV2();
            var libItem = wfSvc.GetActionLibraryItemXml(new GetActionLibraryItemXmlPackage { ActionId = actionLibId, Stepid = stepId, RelabelIds = resetType });
            return Result(libItem.Result, libItem.Error);
        }
    }
}
